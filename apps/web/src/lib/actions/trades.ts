"use server";

import { createClient } from "@/lib/supabase/server";
import { createTradeSchema } from "@/lib/validators";

export async function createTrade(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const input = createTradeSchema.parse({
    obligation_id: formData.get("obligation_id"),
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
      obligation_id: input.obligation_id,
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
