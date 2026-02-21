import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { DataDashboardClient } from "./data-dashboard-client";
import {
  fetchBacktest,
  fetchReturns,
  fetchEda,
  fetchForecastAccuracy,
  fetchLenders,
} from "@/lib/quant-api";

export default async function DataPage() {
  const supabase = await createClient();

  // Parallel SSR fetches: Supabase views + Quant API
  const [
    { data: tradeAnalytics },
    { data: riskDist },
    { data: poolOverview },
    { data: poolHealth },
    { data: orderBook },
    { data: matchSpeed },
    { data: settlement },
    { data: yieldTrends },
    { data: lenderConc },
    { data: pendingTrades },
    backtest,
    returns,
    eda,
    forecastAccuracy,
    lenders,
  ] = await Promise.all([
    supabase.from("trade_analytics").select("*"),
    supabase.from("risk_distribution").select("*"),
    supabase.from("pool_overview").select("*").single(),
    supabase.from("pool_health").select("*").single(),
    supabase.from("order_book_summary").select("*"),
    supabase.from("match_speed_analytics").select("*"),
    supabase.from("settlement_performance").select("*"),
    supabase.from("yield_trends").select("*"),
    supabase.from("lender_concentration").select("*"),
    supabase
      .from("trades")
      .select("id, amount, fee, risk_grade, shift_days, created_at")
      .eq("status", "PENDING_MATCH")
      .order("created_at", { ascending: true }),
    fetchBacktest(),
    fetchReturns(),
    fetchEda(),
    fetchForecastAccuracy(),
    fetchLenders(),
  ]);

  const pool = poolOverview
    ? {
        total_pool_size: Number(poolOverview.total_pool_size ?? 0),
        total_available: Number(poolOverview.total_available ?? 0),
        total_locked: Number(poolOverview.total_locked ?? 0),
        lender_count: Number(poolOverview.lender_count ?? 0),
      }
    : null;

  return (
    <div>
      <TopBar title="Data & Analytics" showBack />
      <DataDashboardClient
        pool={pool}
        tradeAnalytics={tradeAnalytics}
        riskDist={riskDist}
        poolHealth={poolHealth}
        orderBook={orderBook ?? []}
        matchSpeed={matchSpeed ?? []}
        settlement={settlement ?? []}
        yieldTrends={yieldTrends ?? []}
        lenderConcentration={lenderConc ?? []}
        pendingTrades={pendingTrades ?? []}
        backtest={backtest}
        returns={returns}
        eda={eda}
        forecastAccuracy={forecastAccuracy}
        lenders={lenders}
      />
    </div>
  );
}
