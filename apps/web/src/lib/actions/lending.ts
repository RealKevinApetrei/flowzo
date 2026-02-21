"use server";

import { createClient } from "@/lib/supabase/server";
import { lenderPreferencesSchema } from "@/lib/validators";

export async function updateLenderPreferences(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const input = lenderPreferencesSchema.parse({
    min_apr: Number(formData.get("min_apr")),
    max_shift_days: Number(formData.get("max_shift_days")),
    risk_bands: formData.getAll("risk_bands"),
    auto_match_enabled: formData.get("auto_match_enabled") === "true",
  });

  const { error } = await supabase
    .from("lender_preferences")
    .upsert(
      { user_id: user.id, ...input },
      { onConflict: "user_id" },
    );

  if (error) throw new Error(`Failed to update preferences: ${error.message}`);
}

export async function toggleAutoMatch(enabled: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lender_preferences")
    .upsert(
      { user_id: user.id, auto_match_enabled: enabled },
      { onConflict: "user_id" },
    );

  if (error) throw new Error(`Failed to toggle auto-match: ${error.message}`);
}

export async function fundTrade(tradeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get the trade to fund
  const { data: trade, error: tradeErr } = await supabase
    .from("trades")
    .select("id, amount, fee, status")
    .eq("id", tradeId)
    .eq("status", "PENDING_MATCH")
    .single();

  if (tradeErr || !trade) {
    throw new Error("Trade not found or not available for funding");
  }

  // Create allocation
  const { data: allocation, error: allocErr } = await supabase
    .from("allocations")
    .insert({
      trade_id: tradeId,
      lender_id: user.id,
      amount_slice: trade.amount,
      fee_slice: trade.fee,
      status: "RESERVED",
    })
    .select("id")
    .single();

  if (allocErr || !allocation) {
    throw new Error(`Failed to create allocation: ${allocErr?.message}`);
  }

  // Reserve funds atomically via RPC (row-level lock + ledger entry)
  const { error: potErr } = await supabase.rpc("update_lending_pot", {
    p_user_id: user.id,
    p_entry_type: "RESERVE",
    p_amount: Number(trade.amount),
    p_trade_id: tradeId,
    p_allocation_id: allocation.id,
    p_description: `Fund trade ${tradeId}`,
    p_idempotency_key: `fund-${tradeId}-${allocation.id}`,
  });

  if (potErr) {
    // Rollback allocation if pot update fails — retry to prevent orphans
    let rollbackSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: deleteErr } = await supabase
        .from("allocations")
        .delete()
        .eq("id", allocation.id);

      if (!deleteErr) {
        rollbackSuccess = true;
        break;
      }
      // Brief delay before retry
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
    }

    if (!rollbackSuccess) {
      // Flag as orphan via status so it can be cleaned up
      await supabase
        .from("allocations")
        .update({ status: "RELEASED" })
        .eq("id", allocation.id);

      // Log to events for audit trail
      await supabase.from("flowzo_events").insert({
        event_type: "allocation.orphaned",
        entity_type: "allocation",
        entity_id: allocation.id,
        actor: user.id,
        payload: {
          trade_id: tradeId,
          reason: "rollback_delete_failed",
          pot_error: potErr.message,
        },
      });
    }

    throw new Error(`Insufficient funds or pot error: ${potErr.message}`);
  }

  // Update trade status to MATCHED
  const { error: updateErr } = await supabase
    .from("trades")
    .update({ status: "MATCHED", matched_at: new Date().toISOString() })
    .eq("id", tradeId);

  if (updateErr) throw new Error(`Failed to update trade: ${updateErr.message}`);
}

export async function topUpPot(amountPence: number) {
  if (!amountPence || amountPence <= 0) throw new Error("Invalid amount");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Ensure lending pot exists
  await supabase.from("lending_pots").upsert(
    { user_id: user.id, available: 0, locked: 0, total_deployed: 0, realized_yield: 0 },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  // Deposit directly via RPC (no relative URL — works in server context)
  const amountGBP = amountPence / 100;
  const { error } = await supabase.rpc("update_lending_pot", {
    p_user_id: user.id,
    p_entry_type: "DEPOSIT",
    p_amount: amountGBP,
    p_trade_id: null,
    p_allocation_id: null,
    p_description: `Top up £${amountGBP.toFixed(2)}`,
    p_idempotency_key: `deposit-${user.id}-${Date.now()}`,
  });

  if (error) throw new Error(`Top-up failed: ${error.message}`);
}

export async function withdrawFromPot(amountPence: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!amountPence || amountPence <= 0) throw new Error("Invalid amount");

  const amountGBP = amountPence / 100;
  const { error } = await supabase.rpc("update_lending_pot", {
    p_user_id: user.id,
    p_entry_type: "WITHDRAW",
    p_amount: amountGBP,
    p_trade_id: null,
    p_allocation_id: null,
    p_description: `Withdraw £${amountGBP.toFixed(2)}`,
  });

  if (error) throw new Error(`Withdrawal failed: ${error.message}`);
}
