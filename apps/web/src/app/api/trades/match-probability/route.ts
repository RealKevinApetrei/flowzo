import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/trades/match-probability?fee_pence=X&amount_pence=Y&shift_days=Z&risk_grade=B
 *
 * Returns estimated match probability (0-99%) based on:
 * 1. Fee position relative to market rates for the grade
 * 2. Supply-side liquidity (eligible lenders with available funds)
 * 3. Current demand pressure (pending trades competing)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const feePence = Number(searchParams.get("fee_pence") ?? 0);
  const amountPence = Number(searchParams.get("amount_pence") ?? 0);
  const shiftDays = Number(searchParams.get("shift_days") ?? 0);
  const riskGrade = searchParams.get("risk_grade") ?? "C";

  if (amountPence <= 0 || shiftDays <= 0) {
    return NextResponse.json({ probability: 0, reason: "Invalid parameters" }, { status: 400 });
  }

  const impliedAPR = (feePence / amountPence) * (365 / shiftDays) * 100;

  // Fetch market rates for this grade
  const { data: marketRate } = await supabase
    .from("market_rates")
    .select("best_bid_apr, weighted_avg_bid_apr, supply_count, supply_volume, demand_count, demand_volume, liquidity_ratio")
    .eq("risk_grade", riskGrade)
    .single();

  // Fetch eligible lender count (auto_match on, accepting this grade + term)
  const { count: eligibleLenders } = await supabase
    .from("lender_preferences")
    .select("user_id", { count: "exact", head: true })
    .eq("auto_match_enabled", true)
    .gte("max_shift_days", shiftDays)
    .contains("risk_bands", [riskGrade]);

  // Base probability from APR competitiveness
  // If implied APR >= best bid from lenders, high chance of match
  const bestBid = Number(marketRate?.best_bid_apr ?? 0);
  const avgBid = Number(marketRate?.weighted_avg_bid_apr ?? 0);

  let aprScore: number;
  if (bestBid <= 0) {
    // No market data — use fee position heuristic
    const maxFee = amountPence * 0.05; // 5% cap
    const position = Math.min(feePence / Math.max(maxFee, 1), 1);
    aprScore = 15 + Math.pow(position, 0.7) * 77;
  } else if (impliedAPR >= bestBid) {
    // Offering more than the best bid — very attractive
    aprScore = 85 + Math.min((impliedAPR - bestBid) / bestBid, 1) * 10;
  } else if (impliedAPR >= avgBid) {
    // Between avg and best — decent chance
    const range = bestBid - avgBid;
    const position = range > 0 ? (impliedAPR - avgBid) / range : 0.5;
    aprScore = 55 + position * 30;
  } else if (avgBid > 0) {
    // Below average bid — lower probability
    const ratio = impliedAPR / avgBid;
    aprScore = Math.max(5, ratio * 55);
  } else {
    aprScore = 50;
  }

  // Liquidity adjustment (±15%)
  const liquidityRatio = Number(marketRate?.liquidity_ratio ?? 1);
  const liquidityNudge = (Math.min(liquidityRatio, 2) / 2 - 0.5) * 30;

  // Supply depth adjustment (more lenders = higher chance)
  const supplyNudge = Math.min((eligibleLenders ?? 0) / 20, 1) * 10 - 5;

  const probability = Math.round(
    Math.min(99, Math.max(5, aprScore + liquidityNudge + supplyNudge))
  );

  return NextResponse.json({
    probability,
    implied_apr: Math.round(impliedAPR * 10) / 10,
    market: {
      best_bid_apr: bestBid,
      avg_bid_apr: avgBid,
      eligible_lenders: eligibleLenders ?? 0,
      liquidity_ratio: liquidityRatio,
      supply_count: Number(marketRate?.supply_count ?? 0),
      demand_count: Number(marketRate?.demand_count ?? 0),
    },
  });
}
