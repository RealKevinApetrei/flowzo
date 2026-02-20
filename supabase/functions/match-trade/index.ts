import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { trade_id } = await req.json();
    if (!trade_id) {
      return new Response(
        JSON.stringify({ error: "trade_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the trade ------------------------------------------------
    const { data: trade, error: tradeErr } = await supabase
      .from("trades")
      .select("*")
      .eq("id", trade_id)
      .single();

    if (tradeErr || !trade) {
      return new Response(
        JSON.stringify({
          error: "Trade not found",
          detail: tradeErr?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Verify status is PENDING_MATCH ---------------------------------
    if (trade.status !== "PENDING_MATCH") {
      return new Response(
        JSON.stringify({
          error: `Trade status is ${trade.status}, expected PENDING_MATCH`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tradeAmount = Number(trade.amount);
    const tradeRiskGrade = trade.risk_grade as string;
    const tradeShiftDays = Number(trade.shift_days);

    // 3. Fetch eligible lenders -----------------------------------------
    // Lender preferences where:
    //   - auto_match_enabled = true
    //   - risk_bands contains the trade's risk_grade
    //   - max_shift_days >= trade shift_days
    //   - lender is not the borrower
    const { data: lenderPrefs, error: lpErr } = await supabase
      .from("lender_preferences")
      .select("*")
      .eq("auto_match_enabled", true)
      .gte("max_shift_days", tradeShiftDays)
      .contains("risk_bands", [tradeRiskGrade])
      .neq("user_id", trade.borrower_id);

    if (lpErr) {
      throw new Error(
        `Failed to fetch lender preferences: ${lpErr.message}`,
      );
    }

    if (!lenderPrefs || lenderPrefs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No eligible lenders found",
          trade_id,
          allocations: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Check each lender's available funds ----------------------------
    let remainingAmount = tradeAmount;
    const allocations: Record<string, unknown>[] = [];

    for (const pref of lenderPrefs) {
      if (remainingAmount <= 0) break;

      const lenderId = pref.user_id as string;

      // Fetch lending pot
      const { data: pot, error: potErr } = await supabase
        .from("lending_pots")
        .select("*")
        .eq("user_id", lenderId)
        .single();

      if (potErr || !pot) continue;

      const available = Number(pot.available);
      if (available <= 0) continue;

      // Check per-trade exposure limit
      const maxExposure = Number(pref.max_exposure ?? 100);
      const allocatable = Math.min(available, maxExposure, remainingAmount);

      if (allocatable <= 0) continue;

      // Calculate fee slice proportional to allocation
      const feeSlice =
        Math.round(
          (allocatable / tradeAmount) * Number(trade.fee) * 100,
        ) / 100;

      // 5. Create allocation --------------------------------------------
      const { data: allocation, error: allocErr } = await supabase
        .from("allocations")
        .insert({
          trade_id,
          lender_id: lenderId,
          amount_slice: allocatable,
          fee_slice: feeSlice,
          status: "RESERVED",
        })
        .select("id")
        .single();

      if (allocErr || !allocation) {
        console.error(
          `Allocation insert failed for lender ${lenderId}:`,
          allocErr,
        );
        continue;
      }

      // 6. Reserve funds via the update_lending_pot DB function ----------
      const { error: reserveErr } = await supabase.rpc(
        "update_lending_pot",
        {
          p_user_id: lenderId,
          p_entry_type: "RESERVE",
          p_amount: allocatable,
          p_trade_id: trade_id,
          p_allocation_id: allocation.id,
          p_description: `Reserve for trade ${trade_id}`,
          p_idempotency_key: `reserve-${trade_id}-${lenderId}`,
        },
      );

      if (reserveErr) {
        console.error(
          `Reserve failed for lender ${lenderId}:`,
          reserveErr,
        );
        // Roll back the allocation
        await supabase
          .from("allocations")
          .delete()
          .eq("id", allocation.id);
        continue;
      }

      allocations.push({
        id: allocation.id,
        lender_id: lenderId,
        amount_slice: allocatable,
        fee_slice: feeSlice,
        status: "RESERVED",
      });

      remainingAmount =
        Math.round((remainingAmount - allocatable) * 100) / 100;
    }

    // 7. If fully matched, update trade status --------------------------
    const fullyMatched = remainingAmount <= 0;

    if (fullyMatched) {
      const { error: statusErr } = await supabase
        .from("trades")
        .update({ status: "MATCHED" })
        .eq("id", trade_id);

      if (statusErr) {
        console.error("Trade status update error:", statusErr);
      }
    }

    // 8. Log event ------------------------------------------------------
    await supabase.from("flowzo_events").insert({
      event_type: fullyMatched ? "trade.matched" : "trade.partially_matched",
      entity_type: "trade",
      entity_id: trade_id,
      actor: "system",
      payload: {
        allocations_count: allocations.length,
        total_allocated:
          Math.round(
            (tradeAmount - remainingAmount) * 100,
          ) / 100,
        remaining: Math.round(remainingAmount * 100) / 100,
        fully_matched: fullyMatched,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        trade_id,
        fully_matched: fullyMatched,
        allocations_count: allocations.length,
        total_allocated:
          Math.round((tradeAmount - remainingAmount) * 100) / 100,
        remaining_amount: Math.round(remainingAmount * 100) / 100,
        allocations,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("match-trade error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
