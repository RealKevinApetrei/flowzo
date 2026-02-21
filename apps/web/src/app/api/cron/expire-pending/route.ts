import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const EXPIRY_HOURS = 48;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET not set" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find trades stuck in PENDING_MATCH for > 48 hours
  const cutoff = new Date(
    Date.now() - EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: expiredTrades, error: fetchErr } = await admin
    .from("trades")
    .select("id")
    .eq("status", "PENDING_MATCH")
    .lt("created_at", cutoff);

  if (fetchErr) {
    return NextResponse.json(
      { error: "Failed to query expired trades", detail: fetchErr.message },
      { status: 502 },
    );
  }

  if (!expiredTrades || expiredTrades.length === 0) {
    return NextResponse.json({ success: true, expired: 0 });
  }

  let expiredCount = 0;

  for (const trade of expiredTrades) {
    // Release any RESERVED allocations
    const { data: allocs } = await admin
      .from("allocations")
      .select("id, lender_id, amount_slice")
      .eq("trade_id", trade.id)
      .eq("status", "RESERVED");

    if (allocs && allocs.length > 0) {
      for (const alloc of allocs) {
        await admin.rpc("update_lending_pot", {
          p_user_id: alloc.lender_id,
          p_entry_type: "RELEASE",
          p_amount: Number(alloc.amount_slice),
          p_trade_id: trade.id,
          p_allocation_id: alloc.id,
          p_description: `Release funds — trade ${trade.id} expired`,
          p_idempotency_key: `expire-release-${trade.id}-${alloc.id}`,
        });

        await admin
          .from("allocations")
          .update({ status: "RELEASED" })
          .eq("id", alloc.id);
      }
    }

    // Cancel the trade
    await admin
      .from("trades")
      .update({ status: "CANCELLED" })
      .eq("id", trade.id);

    // Log expiry event
    await admin.from("flowzo_events").insert({
      event_type: "trade.expired",
      entity_type: "trade",
      entity_id: trade.id,
      actor: "system",
      payload: {
        reason: "pending_match_timeout",
        expiry_hours: EXPIRY_HOURS,
        allocations_released: allocs?.length ?? 0,
      },
    });

    expiredCount++;
  }

  return NextResponse.json({ success: true, expired: expiredCount });
}
