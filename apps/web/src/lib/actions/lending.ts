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

  // Check lender has sufficient funds in their pot
  const { data: pot } = await supabase
    .from("lending_pots")
    .select("available")
    .eq("user_id", user.id)
    .single();

  const available = Number(pot?.available ?? 0);
  const tradeAmount = Number(trade.amount);

  if (available < tradeAmount) {
    throw new Error("Insufficient funds in lending pot");
  }

  // Create allocation
  const { error: allocErr } = await supabase.from("allocations").insert({
    trade_id: tradeId,
    lender_id: user.id,
    amount_slice: trade.amount,
    fee_slice: trade.fee,
    status: "RESERVED",
  });

  if (allocErr) throw new Error(`Failed to create allocation: ${allocErr.message}`);

  // Update trade status to MATCHED
  const { error: updateErr } = await supabase
    .from("trades")
    .update({ status: "MATCHED" })
    .eq("id", tradeId);

  if (updateErr) throw new Error(`Failed to update trade: ${updateErr.message}`);

  // Update lending pot: move funds from available to locked
  const { error: potErr } = await supabase
    .from("lending_pots")
    .update({
      available: available - tradeAmount,
      locked: Number(pot?.available ?? 0) > 0 ? tradeAmount : 0,
    })
    .eq("user_id", user.id);

  if (potErr) {
    console.error("Failed to update lending pot:", potErr);
  }
}
