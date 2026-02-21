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

  // DB stores GBP decimal, frontend sends pence — convert at boundary
  const { data, error } = await supabase
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

  const { error } = await supabase
    .from("trades")
    .update({ status: "CANCELLED" })
    .eq("id", tradeId)
    .eq("borrower_id", user.id)
    .in("status", ["DRAFT", "PENDING_MATCH"]);

  if (error) throw new Error(`Failed to cancel trade: ${error.message}`);
}
