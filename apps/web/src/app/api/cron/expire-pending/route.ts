import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseTradeAllocations } from "@/lib/allocations";

export const maxDuration = 60;

const EXPIRY_HOURS = 48;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET env var is not set");
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
    .lt("created_at", cutoff)
    .limit(100); // batch limit to avoid timeout

  if (fetchErr) {
    console.error("Failed to query expired trades:", fetchErr.message);
    return NextResponse.json(
      { error: "Failed to query expired trades", detail: fetchErr.message },
      { status: 502 },
    );
  }

  if (!expiredTrades || expiredTrades.length === 0) {
    return NextResponse.json({ success: true, expired: 0, errors: [] });
  }

  let expiredCount = 0;
  const tradeErrors: { trade_id: string; error: string }[] = [];

  for (const trade of expiredTrades) {
    // Release any RESERVED allocations
    const { released, errors } = await releaseTradeAllocations(
      admin,
      trade.id,
      "expire-release",
    );

    if (errors.length > 0) {
      console.error(`expire-pending: trade ${trade.id} release errors:`, errors);
      tradeErrors.push({ trade_id: trade.id, error: errors[0] });
      continue; // skip this trade, don't cancel if allocations weren't fully released
    }

    // Cancel the trade with status guard
    const { error: cancelErr } = await admin
      .from("trades")
      .update({ status: "CANCELLED" })
      .eq("id", trade.id)
      .eq("status", "PENDING_MATCH"); // guard: only cancel if still PENDING_MATCH

    if (cancelErr) {
      console.error(`expire-pending: trade ${trade.id} cancel error:`, cancelErr.message);
      tradeErrors.push({ trade_id: trade.id, error: cancelErr.message });
      continue;
    }

    // Log expiry event AFTER trade is actually cancelled
    await admin.from("flowzo_events").insert({
      event_type: "trade.expired",
      entity_type: "trade",
      entity_id: trade.id,
      actor: "system",
      payload: {
        reason: "pending_match_timeout",
        expiry_hours: EXPIRY_HOURS,
        allocations_released: released,
      },
    });

    expiredCount++;
  }

  return NextResponse.json({
    success: tradeErrors.length === 0,
    expired: expiredCount,
    attempted: expiredTrades.length,
    errors: tradeErrors,
  });
}
