"use server";

import { createClient } from "@/lib/supabase/server";
import { createTradeSchema } from "@/lib/validators";

export async function createTrade(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rawObligationId = formData.get("obligation_id");
  const input = createTradeSchema.parse({
    obligation_id: rawObligationId && rawObligationId !== "" ? rawObligationId : undefined,
    original_due_date: formData.get("original_due_date"),
    new_due_date: formData.get("new_due_date") ?? formData.get("shifted_due_date"),
    amount_pence: Number(formData.get("amount_pence")),
    fee_pence: Number(formData.get("fee_pence")),
  });

  // Use admin client to bypass RLS — auth verified above
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Credit eligibility pre-check (DB trigger also enforces, but this gives better UX)
  const { data: profile } = await admin
    .from("profiles")
    .select("eligible_to_borrow, max_trade_amount, max_active_trades, credit_score")
    .eq("id", user.id)
    .single();

  const amountGBP = input.amount_pence / 100;

  if (!profile?.eligible_to_borrow) {
    throw new Error(
      profile?.credit_score != null
        ? `Credit score ${profile.credit_score} is below the minimum threshold (500). Improve your financial health to become eligible.`
        : "You must be scored before creating a trade. Please connect your bank account first."
    );
  }

  if (amountGBP > (profile.max_trade_amount ?? 75)) {
    throw new Error(
      `Trade amount £${amountGBP.toFixed(2)} exceeds your credit limit of £${Number(profile.max_trade_amount).toFixed(2)}`
    );
  }

  // Verify obligation ownership if provided
  if (input.obligation_id) {
    const { data: obl, error: oblErr } = await admin
      .from("obligations")
      .select("user_id")
      .eq("id", input.obligation_id)
      .single();

    if (oblErr || !obl || obl.user_id !== user.id) {
      throw new Error("Obligation not found or does not belong to you");
    }
  }

  // DB stores GBP decimal, frontend sends pence — convert at boundary
  const { data, error } = await admin
    .from("trades")
    .insert({
      borrower_id: user.id,
      obligation_id: input.obligation_id ?? null,
      original_due_date: input.original_due_date,
      new_due_date: input.new_due_date,
      amount: input.amount_pence / 100,
      fee: input.fee_pence / 100,
      status: "DRAFT",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create trade: ${error.message}`);

  return data;
}

export async function submitTrade(tradeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("trades")
    .update({ status: "PENDING_MATCH" })
    .eq("id", tradeId)
    .eq("borrower_id", user.id)
    .eq("status", "DRAFT");

  if (error) throw new Error(`Failed to submit trade: ${error.message}`);

  // Auto-match: invoke match-trade Edge Function
  // If no eligible lenders, trade stays PENDING_MATCH on the bubble board
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error: matchError } = await admin.functions.invoke("match-trade", {
    body: { trade_id: tradeId },
  });
  if (matchError) {
    console.error("Auto-match failed (trade still PENDING_MATCH):", matchError);
  }
}

export async function cancelTrade(tradeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Verify ownership
  const { data: trade } = await admin
    .from("trades")
    .select("id, status, borrower_id")
    .eq("id", tradeId)
    .eq("borrower_id", user.id)
    .in("status", ["DRAFT", "PENDING_MATCH"])
    .single();

  if (!trade) throw new Error("Trade not found or cannot be cancelled");

  // Release any RESERVED allocations back to lenders
  const { releaseTradeAllocations } = await import("@/lib/allocations");
  const { released, errors } = await releaseTradeAllocations(
    admin,
    tradeId,
    "cancel-release",
  );

  if (errors.length > 0) {
    console.error(`cancelTrade ${tradeId}: allocation release errors:`, errors);
    throw new Error(
      `Failed to release allocations: ${errors[0]}`,
    );
  }

  // Cancel the trade with status guard to prevent race with match-trade
  const { error, count } = await admin
    .from("trades")
    .update({ status: "CANCELLED" })
    .eq("id", tradeId)
    .in("status", ["DRAFT", "PENDING_MATCH"])
    .select("id");

  if (error) throw new Error(`Failed to cancel trade: ${error.message}`);

  // If count is 0, the trade status changed between our check and update (race)
  if (count === 0) {
    console.warn(`cancelTrade ${tradeId}: trade status changed during cancel (possible race with match-trade)`);
  }

  // Log cancellation event AFTER trade is actually cancelled
  await admin.from("flowzo_events").insert({
    event_type: "trade.cancelled",
    entity_type: "trade",
    entity_id: tradeId,
    actor: user.id,
    payload: {
      cancelled_by: "borrower",
      allocations_released: released,
    },
  });
}
