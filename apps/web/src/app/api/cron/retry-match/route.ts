import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

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

  // Find non-expired PENDING_MATCH trades (created within last 48h)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: pendingTrades, error: fetchErr } = await admin
    .from("trades")
    .select("id")
    .eq("status", "PENDING_MATCH")
    .gte("created_at", cutoff);

  if (fetchErr) {
    return NextResponse.json(
      { error: "Failed to query pending trades", detail: fetchErr.message },
      { status: 502 },
    );
  }

  if (!pendingTrades || pendingTrades.length === 0) {
    return NextResponse.json({ success: true, retried: 0, results: [] });
  }

  const results: { trade_id: string; status: string }[] = [];

  for (const trade of pendingTrades) {
    const { error: matchError } = await admin.functions.invoke("match-trade", {
      body: { trade_id: trade.id },
    });

    results.push({
      trade_id: trade.id,
      status: matchError ? `error: ${matchError.message}` : "retried",
    });
  }

  return NextResponse.json({
    success: true,
    retried: pendingTrades.length,
    results,
  });
}
