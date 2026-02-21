import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const BATCH_LIMIT = 50;

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

  // Find non-expired PENDING_MATCH trades (created within last 48h)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: pendingTrades, error: fetchErr } = await admin
    .from("trades")
    .select("id")
    .eq("status", "PENDING_MATCH")
    .gte("created_at", cutoff)
    .limit(BATCH_LIMIT);

  if (fetchErr) {
    console.error("Failed to query pending trades:", fetchErr.message);
    return NextResponse.json(
      { error: "Failed to query pending trades", detail: fetchErr.message },
      { status: 502 },
    );
  }

  if (!pendingTrades || pendingTrades.length === 0) {
    return NextResponse.json({ success: true, attempted: 0, retried: 0, skipped: 0, results: [] });
  }

  const results: { trade_id: string; status: string }[] = [];
  let retriedCount = 0;
  let skippedCount = 0;

  for (const trade of pendingTrades) {
    // Skip trades that already have allocations — the Edge Function will
    // early-return for these anyway, so we save the invocation cost
    const { data: existingAllocs } = await admin
      .from("allocations")
      .select("id")
      .eq("trade_id", trade.id)
      .in("status", ["RESERVED", "ACTIVE"])
      .limit(1);

    if (existingAllocs && existingAllocs.length > 0) {
      results.push({ trade_id: trade.id, status: "skipped_has_allocations" });
      skippedCount++;
      continue;
    }

    const { error: matchError } = await admin.functions.invoke("match-trade", {
      body: { trade_id: trade.id },
    });

    if (matchError) {
      console.error(`retry-match: trade ${trade.id} error:`, matchError.message);
      results.push({
        trade_id: trade.id,
        status: `error: ${matchError.message}`,
      });
    } else {
      results.push({ trade_id: trade.id, status: "retried" });
      retriedCount++;

      // Log retry event for audit trail
      await admin.from("flowzo_events").insert({
        event_type: "trade.retry_match",
        entity_type: "trade",
        entity_id: trade.id,
        actor: "system",
        payload: { source: "cron" },
      });
    }
  }

  return NextResponse.json({
    success: true,
    attempted: pendingTrades.length,
    retried: retriedCount,
    skipped: skippedCount,
    results,
  });
}
