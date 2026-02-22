import { NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANOMALY_DETECTOR_SYSTEM, buildAnomalyPrompt } from "@/lib/claude/prompts";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch platform metrics
    const [{ data: performance }, { data: matchEff }, { data: marketRates }] = await Promise.all([
      supabase.from("trade_performance").select("*"),
      supabase.from("matching_efficiency").select("*"),
      supabase.from("market_rates").select("*"),
    ]);

    // Recent defaults (last 7 days)
    const { count: recentDefaults } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("status", "DEFAULTED")
      .gte("defaulted_at", new Date(Date.now() - 7 * 86400000).toISOString());

    const { count: totalActive } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .in("status", ["PENDING_MATCH", "MATCHED", "LIVE"]);

    const defaultRateByGrade = (performance ?? []).map((p) => ({
      grade: p.risk_grade as string,
      rate: Number(p.default_rate ?? 0),
      count: Number(p.settled_count ?? p.repaid_count ?? 0),
    }));

    const matchSpeedByGrade = (matchEff ?? []).map((m) => ({
      grade: m.risk_grade as string,
      avgHours: Number(m.avg_hours_to_match ?? 0),
      medianHours: Number(m.median_hours_to_match ?? 0),
    }));

    const avgLiquidity = (marketRates ?? []).reduce(
      (s, r) => s + Number(r.liquidity_ratio ?? 0), 0
    ) / Math.max((marketRates ?? []).length, 1);

    const prompt = buildAnomalyPrompt({
      defaultRateByGrade,
      matchSpeedByGrade,
      recentDefaults: recentDefaults ?? 0,
      totalActive: totalActive ?? 0,
      liquidityRatio: avgLiquidity,
      weekOverWeekVolume: 0, // Simplified — would need historical comparison
    });

    const raw = await callClaude(ANOMALY_DETECTOR_SYSTEM, [{ role: "user", content: prompt }], 500);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const anomalies = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ anomalies });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json({ anomalies: [] });
  }
}
