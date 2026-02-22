import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { amount_pence?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amountPence = body.amount_pence;
  if (!amountPence || typeof amountPence !== "number" || amountPence <= 0) {
    return NextResponse.json(
      { error: "amount_pence must be a positive number" },
      { status: 400 },
    );
  }

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
    return NextResponse.json(
      { error: `Insufficient card balance: £${cardBalanceGBP.toFixed(2)} available` },
      { status: 400 },
    );
  }

  // Ensure lending pot exists
  await supabase.from("lending_pots").upsert(
    { user_id: user.id, available: 0, locked: 0, total_deployed: 0, realized_yield: 0 },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  // Deposit via atomic RPC (row-level lock + ledger entry)
  const idempotencyKey = `deposit-${user.id}-${Date.now()}`;
  const { error } = await supabase.rpc("update_lending_pot", {
    p_user_id: user.id,
    p_entry_type: "DEPOSIT",
    p_amount: amountGBP,
    p_trade_id: null,
    p_allocation_id: null,
    p_description: `Top up £${amountGBP.toFixed(2)}`,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return NextResponse.json(
      { error: `Deposit failed: ${error.message}` },
      { status: 500 },
    );
  }

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

  // Fetch updated pot to return
  const { data: pot } = await supabase
    .from("lending_pots")
    .select("available, locked, total_deployed, realized_yield")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    success: true,
    pot: pot
      ? {
          available_pence: Math.round(Number(pot.available) * 100),
          locked_pence: Math.round(Number(pot.locked) * 100),
          total_deployed_pence: Math.round(Number(pot.total_deployed) * 100),
          realized_yield_pence: Math.round(Number(pot.realized_yield) * 100),
        }
      : null,
  });
}
