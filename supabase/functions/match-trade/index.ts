import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/** Maximum fraction of a trade any single lender can fund. */
const MAX_SINGLE_LENDER_PCT = 0.5;

/** Quant API URL for ML-powered scoring (optional, graceful degradation). */
const QUANT_API_URL = Deno.env.get("QUANT_API_URL") ?? "";

interface ScoredLender {
  pref: Record<string, unknown>;
  score: number;
  available: number;
}

/**
 * Score a lender for a given trade.
 * Higher score = better match.
 *
 * Composite score (0–1):
 *   - APR compatibility (40%): how well the trade's implied APR meets the lender's min_apr
 *   - Available headroom (30%): larger available pots score higher (up to 10x trade amount)
 *   - Diversification bonus (30%): lenders with less total exposure score higher
 */
function scoreLender(
  available: number,
  tradeAmount: number,
  impliedAPR: number,
  minAPR: number,
  currentExposure: number,
  maxTotalExposure: number,
): number {
  // APR compatibility: 1.0 if implied >= 2x min, 0 if implied < min
  const aprRatio = minAPR > 0 ? impliedAPR / minAPR : 2.0;
  const aprScore = Math.min(Math.max(aprRatio - 1, 0), 1.0);

  // Available headroom: normalized against 10x trade amount
  const headroomScore = Math.min(available / (tradeAmount * 10), 1.0);

  // Diversification: lower exposure ratio = higher score
  const exposureRatio = maxTotalExposure > 0
    ? currentExposure / maxTotalExposure
    : 0;
  const diversificationScore = Math.max(1 - exposureRatio, 0);

  return aprScore * 0.4 + headroomScore * 0.3 + diversificationScore * 0.3;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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

    // Guard: prevent double-matching if trade already has allocations
    const { data: existingAllocs } = await supabase
      .from("allocations")
      .select("id, lender_id, amount_slice, fee_slice, status")
      .eq("trade_id", trade_id)
      .in("status", ["RESERVED", "ACTIVE"]);

    if (existingAllocs && existingAllocs.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          trade_id,
          message: "Trade already has allocations — skipping re-match",
          allocations: existingAllocs,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tradeAmount = Number(trade.amount);
    const tradeFee = Number(trade.fee);
    let tradeRiskGrade = trade.risk_grade as string;
    const tradeShiftDays = Number(trade.shift_days);

    // Real-time ML scoring: re-score borrower via Quant API if available
    if (QUANT_API_URL) {
      try {
        // Fetch pre-computed features (from compute-borrower-features)
        const { data: latestScoring } = await supabase
          .from("flowzo_events")
          .select("payload")
          .eq("entity_id", trade.borrower_id)
          .eq("event_type", "borrower.scored")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestScoring?.payload?.features) {
          const scoreRes = await fetch(`${QUANT_API_URL}/api/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(latestScoring.payload.features),
          });

          if (scoreRes.ok) {
            const mlResult = await scoreRes.json();
            if (mlResult.risk_grade && mlResult.risk_grade !== tradeRiskGrade) {
              console.log(
                `ML re-scored borrower ${trade.borrower_id}: ${tradeRiskGrade} → ${mlResult.risk_grade} (score: ${mlResult.credit_score})`,
              );
              tradeRiskGrade = mlResult.risk_grade;

              // Update the trade with the ML-derived risk grade
              await supabase
                .from("trades")
                .update({ risk_grade: mlResult.risk_grade })
                .eq("id", trade_id);
            }
          }
        }
      } catch (err) {
        console.warn("Quant API scoring failed, using existing risk_grade:", err);
      }
    }

    if (tradeAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Trade amount must be positive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Compute implied APR for min_apr filtering
    const impliedAPR = tradeShiftDays > 0
      ? (tradeFee / tradeAmount) * (365 / tradeShiftDays) * 100
      : 0;

    // 3. Fetch eligible lenders -----------------------------------------
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
      // Log no-match event
      await supabase.from("flowzo_events").insert({
        event_type: "trade.no_match",
        entity_type: "trade",
        entity_id: trade_id,
        actor: "system",
        payload: {
          reason: "no_eligible_lenders",
          risk_grade: tradeRiskGrade,
          shift_days: tradeShiftDays,
          implied_apr: Math.round(impliedAPR * 100) / 100,
        },
      });

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

    // 4. Score and rank lenders ------------------------------------------
    // Batch-fetch lending pots and exposures to avoid N+1 queries
    const lenderIds = lenderPrefs.map((p) => p.user_id as string);

    const { data: allPots } = await supabase
      .from("lending_pots")
      .select("user_id, available, withdrawal_queued")
      .in("user_id", lenderIds);

    const potMap = new Map<string, number>();
    const withdrawalQueuedSet = new Set<string>();
    for (const pot of allPots ?? []) {
      potMap.set(pot.user_id as string, Number(pot.available));
      if (pot.withdrawal_queued) {
        withdrawalQueuedSet.add(pot.user_id as string);
      }
    }

    // Batch-fetch all lender exposures in one query
    const { data: allExposures } = await supabase
      .from("allocations")
      .select("lender_id, amount_slice")
      .in("lender_id", lenderIds)
      .in("status", ["RESERVED", "ACTIVE"]);

    const exposureMap = new Map<string, number>();
    for (const alloc of allExposures ?? []) {
      const lid = alloc.lender_id as string;
      exposureMap.set(lid, (exposureMap.get(lid) ?? 0) + Number(alloc.amount_slice));
    }

    const scoredLenders: ScoredLender[] = [];

    for (const pref of lenderPrefs) {
      const lenderId = pref.user_id as string;
      const minAPR = Number(pref.min_apr ?? 0);

      // Skip lenders who have queued a withdrawal
      if (withdrawalQueuedSet.has(lenderId)) continue;

      // Enforce min_apr: skip lenders whose minimum exceeds the trade's implied APR
      if (minAPR > 0 && impliedAPR < minAPR) continue;

      const available = potMap.get(lenderId) ?? 0;
      if (available <= 0) continue;

      // Check total exposure against max_total_exposure
      const maxTotalExposure = Number(pref.max_total_exposure ?? 10000);
      const currentExposure = exposureMap.get(lenderId) ?? 0;

      // Skip if already at max total exposure
      if (currentExposure >= maxTotalExposure) continue;

      const score = scoreLender(
        available,
        tradeAmount,
        impliedAPR,
        minAPR,
        currentExposure,
        maxTotalExposure,
      );

      scoredLenders.push({ pref, score, available });
    }

    // Sort by score descending (best matches first)
    scoredLenders.sort((a, b) => b.score - a.score);

    // 5. Allocate funds from ranked lenders -----------------------------
    let remainingAmount = tradeAmount;
    const allocations: Record<string, unknown>[] = [];

    // Track newly allocated amounts during this run
    const newAllocAmounts = new Map<string, number>();

    for (const { pref, available } of scoredLenders) {
      if (remainingAmount <= 0) break;

      const lenderId = pref.user_id as string;
      const maxExposure = Number(pref.max_exposure ?? 100);
      const maxTotalExposure = Number(pref.max_total_exposure ?? 10000);

      // Diversification cap: max % of single trade
      const diversificationCap = tradeAmount * MAX_SINGLE_LENDER_PCT;

      // Use pre-fetched exposure + any new allocations in this run
      const currentExposure = (exposureMap.get(lenderId) ?? 0) +
        (newAllocAmounts.get(lenderId) ?? 0);

      const exposureHeadroom = Math.max(maxTotalExposure - currentExposure, 0);

      const allocatable = Math.min(
        available,
        maxExposure,
        diversificationCap,
        exposureHeadroom,
        remainingAmount,
      );

      if (allocatable <= 0) continue;

      // Calculate fee slice proportional to allocation
      const feeSlice =
        Math.round(
          (allocatable / tradeAmount) * tradeFee * 100,
        ) / 100;

      // Create allocation
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

      // Reserve funds via the update_lending_pot DB function
      const { error: reserveErr } = await supabase.rpc(
        "update_lending_pot",
        {
          p_user_id: lenderId,
          p_entry_type: "RESERVE",
          p_amount: allocatable,
          p_trade_id: trade_id,
          p_allocation_id: allocation.id,
          p_description: `Reserve for trade ${trade_id}`,
          p_idempotency_key: `reserve-${trade_id}-${allocation.id}`,
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

      // Track allocation for exposure calculation within this run
      newAllocAmounts.set(lenderId, (newAllocAmounts.get(lenderId) ?? 0) + allocatable);

      allocations.push({
        id: allocation.id,
        lender_id: lenderId,
        amount_slice: allocatable,
        fee_slice: feeSlice,
        score: scoredLenders.find((s) => s.pref.user_id === lenderId)?.score ?? 0,
        status: "RESERVED",
      });

      remainingAmount =
        Math.round((remainingAmount - allocatable) * 100) / 100;
    }

    // 6. If fully matched, update trade status --------------------------
    const fullyMatched = remainingAmount <= 0;

    if (fullyMatched) {
      const { error: statusErr } = await supabase
        .from("trades")
        .update({ status: "MATCHED", matched_at: new Date().toISOString() })
        .eq("id", trade_id);

      if (statusErr) {
        console.error("Trade status update error:", statusErr);
      }
    }

    // 7. Log matching event ---------------------------------------------
    const eventType = fullyMatched
      ? "trade.matched"
      : allocations.length > 0
        ? "trade.partially_matched"
        : "trade.no_match";

    await supabase.from("flowzo_events").insert({
      event_type: eventType,
      entity_type: "trade",
      entity_id: trade_id,
      actor: "system",
      payload: {
        algorithm: "scored_v2",
        lenders_considered: scoredLenders.length,
        lenders_eligible: lenderPrefs.length,
        allocations_count: allocations.length,
        total_allocated:
          Math.round(
            (tradeAmount - remainingAmount) * 100,
          ) / 100,
        remaining: Math.round(remainingAmount * 100) / 100,
        implied_apr: Math.round(impliedAPR * 100) / 100,
        fully_matched: fullyMatched,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        trade_id,
        fully_matched: fullyMatched,
        algorithm: "scored_v2",
        lenders_considered: scoredLenders.length,
        allocations_count: allocations.length,
        total_allocated:
          Math.round((tradeAmount - remainingAmount) * 100) / 100,
        remaining_amount: Math.round(remainingAmount * 100) / 100,
        implied_apr: Math.round(impliedAPR * 100) / 100,
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
