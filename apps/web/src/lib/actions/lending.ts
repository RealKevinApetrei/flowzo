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

export async function updateDurationPreference(maxShiftDays: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lender_preferences")
    .upsert(
      { user_id: user.id, max_shift_days: maxShiftDays },
      { onConflict: "user_id" },
    );

  if (error) throw new Error(`Failed to update duration preference: ${error.message}`);
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

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Get the trade to fund
  const { data: trade, error: tradeErr } = await admin
    .from("trades")
    .select("id, amount, fee, status, borrower_id")
    .eq("id", tradeId)
    .eq("status", "PENDING_MATCH")
    .single();

  if (tradeErr || !trade) {
    throw new Error("Trade not found or not available for funding");
  }

  // Prevent self-dealing
  if (trade.borrower_id === user.id) {
    throw new Error("Cannot fund your own trade");
  }

  // Guard: check for existing allocations (prevents double-funding + race with auto-match)
  const { data: existingAllocs } = await admin
    .from("allocations")
    .select("id")
    .eq("trade_id", tradeId)
    .in("status", ["RESERVED", "ACTIVE"])
    .limit(1);

  if (existingAllocs && existingAllocs.length > 0) {
    throw new Error("Trade already has funding — refresh to see updated status");
  }

  // Calculate 80/20 fee split (matches match-trade Edge Function logic)
  const { FEE_CONFIG } = await import("@flowzo/shared");
  const tradeFee = Number(trade.fee);
  const platformFee = Math.round(tradeFee * FEE_CONFIG.platformFeePercent * 100) / 100;
  const lenderFee = Math.round((tradeFee - platformFee) * 100) / 100;

  // Create allocation with lender's fee share only
  const { data: allocation, error: allocErr } = await admin
    .from("allocations")
    .insert({
      trade_id: tradeId,
      lender_id: user.id,
      amount_slice: trade.amount,
      fee_slice: lenderFee,
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
    // Rollback allocation if pot update fails
    await admin
      .from("allocations")
      .delete()
      .eq("id", allocation.id);

    throw new Error(`Insufficient funds or pot error: ${potErr.message}`);
  }

  // Update trade status to MATCHED with fee split
  const { error: updateErr } = await admin
    .from("trades")
    .update({
      status: "MATCHED",
      matched_at: new Date().toISOString(),
      platform_fee: platformFee,
      lender_fee: lenderFee,
    })
    .eq("id", tradeId)
    .eq("status", "PENDING_MATCH");

  if (updateErr) throw new Error(`Failed to update trade: ${updateErr.message}`);
}

export async function topUpPot(amountPence: number) {
  if (!amountPence || amountPence <= 0) throw new Error("Invalid amount");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch primary account balance to validate
  const { data: account } = await supabase
    .from("accounts")
    .select("id, balance_available, balance_current")
    .eq("user_id", user.id)
    .order("balance_updated_at", { ascending: false })
    .limit(1)
    .single();

  const amountGBP = amountPence / 100;
  const cardBalanceGBP = Number(account?.balance_available ?? 0);
  const cardCurrentGBP = Number(account?.balance_current ?? 0);

  if (amountGBP > cardBalanceGBP) {
    throw new Error(`Insufficient card balance: £${cardBalanceGBP.toFixed(2)} available`);
  }

  // Ensure lending pot exists
  await supabase.from("lending_pots").upsert(
    { user_id: user.id, available: 0, locked: 0, total_deployed: 0, realized_yield: 0 },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  // Deposit directly via RPC (no relative URL — works in server context)
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

  // Deduct from Monzo card balance (both current + available)
  if (account) {
    await supabase
      .from("accounts")
      .update({
        balance_available: cardBalanceGBP - amountGBP,
        balance_current: cardCurrentGBP - amountGBP,
      })
      .eq("id", account.id);
  }
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
    p_idempotency_key: `withdraw-${user.id}-${Date.now()}`,
  });

  if (error) throw new Error(`Withdrawal failed: ${error.message}`);

  // Add back to Monzo card balance (both current + available)
  const { data: account } = await supabase
    .from("accounts")
    .select("id, balance_available, balance_current")
    .eq("user_id", user.id)
    .order("balance_updated_at", { ascending: false })
    .limit(1)
    .single();

  if (account) {
    await supabase
      .from("accounts")
      .update({
        balance_available: Number(account.balance_available) + amountGBP,
        balance_current: Number(account.balance_current) + amountGBP,
      })
      .eq("id", account.id);
  }
}

export async function queueWithdrawal() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lending_pots")
    .update({ withdrawal_queued: true })
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to queue withdrawal: ${error.message}`);

  // If no locked funds, withdraw immediately instead of waiting for repayment
  const { data: pot } = await supabase
    .from("lending_pots")
    .select("available, locked")
    .eq("user_id", user.id)
    .single();

  if (pot && Number(pot.locked) === 0 && Number(pot.available) > 0) {
    const amountGBP = Number(pot.available);
    await supabase.rpc("update_lending_pot", {
      p_user_id: user.id,
      p_entry_type: "WITHDRAW",
      p_amount: amountGBP,
      p_trade_id: null,
      p_allocation_id: null,
      p_description: `Immediate withdrawal (no locked funds): £${amountGBP.toFixed(2)}`,
      p_idempotency_key: `imm-withdraw-${user.id}-${Date.now()}`,
    });

    // Return funds to Monzo card balance
    const { data: acct } = await supabase
      .from("accounts")
      .select("id, balance_available, balance_current")
      .eq("user_id", user.id)
      .order("balance_updated_at", { ascending: false })
      .limit(1)
      .single();

    if (acct) {
      await supabase
        .from("accounts")
        .update({
          balance_available: Number(acct.balance_available) + amountGBP,
          balance_current: Number(acct.balance_current) + amountGBP,
        })
        .eq("id", acct.id);
    }

    await supabase
      .from("lending_pots")
      .update({ withdrawal_queued: false })
      .eq("user_id", user.id);
  }
}

export async function cancelQueuedWithdrawal() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lending_pots")
    .update({ withdrawal_queued: false })
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to cancel withdrawal queue: ${error.message}`);
}

export async function withdrawAllAvailable() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: pot } = await supabase
    .from("lending_pots")
    .select("available, locked")
    .eq("user_id", user.id)
    .single();

  if (!pot || Number(pot.available) <= 0) {
    throw new Error("No available balance to withdraw");
  }

  const amountGBP = Number(pot.available);
  const { error } = await supabase.rpc("update_lending_pot", {
    p_user_id: user.id,
    p_entry_type: "WITHDRAW",
    p_amount: amountGBP,
    p_trade_id: null,
    p_allocation_id: null,
    p_description: `Withdraw all available: £${amountGBP.toFixed(2)}`,
    p_idempotency_key: `withdraw-all-${user.id}-${Date.now()}`,
  });

  if (error) throw new Error(`Withdrawal failed: ${error.message}`);

  // Add back to Monzo card balance (both current + available)
  const { data: account } = await supabase
    .from("accounts")
    .select("id, balance_available, balance_current")
    .eq("user_id", user.id)
    .order("balance_updated_at", { ascending: false })
    .limit(1)
    .single();

  if (account) {
    await supabase
      .from("accounts")
      .update({
        balance_available: Number(account.balance_available) + amountGBP,
        balance_current: Number(account.balance_current) + amountGBP,
      })
      .eq("id", account.id);
  }

  // Clear the withdrawal queue flag if locked is also zero
  if (Number(pot.locked) <= 0) {
    await supabase
      .from("lending_pots")
      .update({ withdrawal_queued: false })
      .eq("user_id", user.id);
  }
}
