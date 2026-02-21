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
  });

  if (potErr) {
    // Rollback allocation if pot update fails
    await supabase.from("allocations").delete().eq("id", allocation.id);
    throw new Error(`Insufficient funds or pot error: ${potErr.message}`);
  }

  // Update trade status to MATCHED
  const { error: updateErr } = await supabase
    .from("trades")
    .update({ status: "MATCHED", matched_at: new Date().toISOString() })
    .eq("id", tradeId);

  if (updateErr) throw new Error(`Failed to update trade: ${updateErr.message}`);
}
