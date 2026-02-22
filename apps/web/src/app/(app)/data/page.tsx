import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { DataPageClient } from "@/components/data/data-page-client";

export default async function DataPage() {
  const supabase = await createClient();

  // Fetch all analytics views in parallel
  const [
    { data: tradeAnalytics },
    { data: riskDist },
    { data: poolOverview },
    { data: orderBookRaw },
    { data: performance },
    { data: leaderboard },
    { data: platformTotals },
    { data: matchEfficiency },
    { data: pendingTradesRaw },
    { data: repaidTrades },
    { data: revenueSummary },
    { data: revenueMonthly },
    { data: supplyRaw },
    { data: marketRatesRaw },
  ] = await Promise.all([
    supabase.from("trade_analytics").select("*"),
    supabase.from("risk_distribution").select("*"),
    supabase.from("pool_overview").select("*").single(),
    supabase.from("order_book_depth").select("*"),
    supabase.from("trade_performance").select("*"),
    supabase.from("lender_leaderboard").select("*"),
    supabase.from("platform_totals").select("*").single(),
    supabase.from("matching_efficiency").select("*"),
    supabase
      .from("trades")
      .select("id, amount, fee, risk_grade, shift_days, created_at")
      .eq("status", "PENDING_MATCH")
      .order("created_at", { ascending: false })
      .limit(50),
    // Fetch repaid trades for yield trends (monthly aggregation)
    supabase
      .from("trades")
      .select("amount, fee, shift_days, repaid_at")
      .eq("status", "REPAID")
      .not("repaid_at", "is", null)
      .order("repaid_at", { ascending: true }),
    // Platform revenue views
    supabase.from("platform_revenue_summary").select("*").single(),
    supabase
      .from("platform_revenue_monthly")
      .select("*")
      .order("month", { ascending: true }),
    // Order book supply + market rates (may not exist yet — data will be null on error)
    supabase.from("order_book_supply").select("*"),
    supabase.from("market_rates").select("*"),
  ]);

  // ── Compose poolHealth from pool_overview + platform_totals ─────────────
  const poolSize = Number(poolOverview?.total_pool_size ?? 0);
  const poolLocked = Number(poolOverview?.total_locked ?? 0);

  const poolHealth = {
    total_lenders: Number(poolOverview?.lender_count ?? 0),
    total_pool_gbp: poolSize,
    available_gbp: Number(poolOverview?.total_available ?? 0),
    locked_gbp: poolLocked,
    utilization_pct: poolSize > 0 ? Math.round((poolLocked / poolSize) * 100) : 0,
    total_yield_gbp: Number(platformTotals?.total_fees_collected ?? 0),
    pending_trades: Number(platformTotals?.pending_trades ?? 0),
    live_trades: Number(platformTotals?.live_trades ?? 0),
    repaid_trades: Number(platformTotals?.repaid_trades ?? 0),
    defaulted_trades: Number(platformTotals?.defaulted_trades ?? 0),
  };

  // ── Map order_book_depth → OrderBookRow ─────────────────────────────────
  // Compute oldest pending trade per grade from raw pending trades
  const oldestByGrade = new Map<string, string>();
  for (const t of pendingTradesRaw ?? []) {
    const grade = t.risk_grade as string;
    const created = t.created_at as string;
    const existing = oldestByGrade.get(grade);
    if (!existing || created < existing) oldestByGrade.set(grade, created);
  }

  const orderBook = (orderBookRaw ?? []).map((row) => {
    const avgAmount = Number(row.avg_amount ?? 0);
    const avgFee = Number(row.avg_fee ?? 0);
    const avgTermDays = Number(row.avg_term_days ?? 1);
    const grade = row.risk_grade as string;
    return {
      risk_grade: grade,
      pending_count: Number(row.trade_count ?? 0),
      total_amount: Number(row.total_amount ?? 0),
      avg_amount: avgAmount,
      avg_fee: avgFee,
      avg_shift_days: avgTermDays,
      avg_implied_apr_pct:
        avgAmount > 0 && avgTermDays > 0
          ? Number(((avgFee / avgAmount) * (365 / avgTermDays) * 100).toFixed(1))
          : 0,
      oldest_pending: oldestByGrade.get(grade) ?? new Date().toISOString(),
    };
  });

  // ── Map matching_efficiency → MatchSpeedRow ─────────────────────────────
  const matchSpeed = (matchEfficiency ?? []).map((row) => ({
    risk_grade: row.risk_grade as string,
    matched_count: Number(row.matched_count ?? 0),
    avg_hours_to_match: Number(row.avg_hours_to_match ?? 0),
    median_hours_to_match: Number(row.median_hours_to_match ?? row.avg_hours_to_match ?? 0),
    fastest_match_hours: Number(row.fastest_match_hours ?? 0),
    slowest_match_hours: Number(row.slowest_match_hours ?? 0),
  }));

  // ── Map trade_performance → SettlementRow ───────────────────────────────
  const settlement = (performance ?? []).map((row) => ({
    risk_grade: row.risk_grade as string,
    repaid_count: Number(row.repaid_count ?? 0),
    defaulted_count: Number(row.defaulted_count ?? 0),
    live_count: Number(row.live_count ?? 0),
    default_rate_pct: Number(row.default_rate ?? 0) * 100,
    avg_days_to_repay: Number(row.avg_days_to_repay ?? 0),
    total_fees_earned: Number(row.total_fees_earned ?? 0),
    total_defaulted_volume: row.total_defaulted_volume != null
      ? Number(row.total_defaulted_volume)
      : null,
  }));

  // ── Compute yield trends from repaid trades ─────────────────────────────
  const monthlyMap = new Map<
    string,
    { count: number; fees: number; volume: number; aprSum: number }
  >();

  for (const t of repaidTrades ?? []) {
    const month = (t.repaid_at as string).slice(0, 7); // "YYYY-MM"
    const amount = Number(t.amount ?? 0);
    const fee = Number(t.fee ?? 0);
    const days = Number(t.shift_days ?? 0);
    const apr =
      amount > 0 && days > 0 ? (fee / amount) * (365 / days) * 100 : 0;

    const existing = monthlyMap.get(month) ?? {
      count: 0,
      fees: 0,
      volume: 0,
      aprSum: 0,
    };
    existing.count += 1;
    existing.fees += fee;
    existing.volume += amount;
    existing.aprSum += apr;
    monthlyMap.set(month, existing);
  }

  const yieldTrends = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      trades_settled: data.count,
      total_fees: Number(data.fees.toFixed(2)),
      total_volume: Number(data.volume.toFixed(2)),
      yield_pct:
        data.volume > 0
          ? Number(((data.fees / data.volume) * 100).toFixed(2))
          : 0,
      avg_apr_pct:
        data.count > 0
          ? Number((data.aprSum / data.count).toFixed(1))
          : 0,
    }));

  // ── Map lender_leaderboard → LenderConcRow ──────────────────────────────
  const lenderConcentration = (leaderboard ?? []).map((row) => {
    const totalCapital = Number(row.total_capital ?? 0);
    const locked = Number(row.locked ?? 0);
    return {
      display_name: (row.display_name ?? "Anon") as string,
      total_capital: totalCapital,
      locked_capital: locked,
      total_yield: Number(row.realized_yield ?? 0),
      active_allocations: Number(row.trade_count ?? 0),
      total_allocations: Number(row.trade_count ?? 0),
      utilization_pct:
        totalCapital > 0 ? Number(((locked / totalCapital) * 100).toFixed(0)) : 0,
    };
  });

  // ── Map pending trades ──────────────────────────────────────────────────
  const pendingTrades = (pendingTradesRaw ?? []).map((row) => ({
    id: row.id as string,
    amount: Number(row.amount ?? 0),
    fee: Number(row.fee ?? 0),
    risk_grade: row.risk_grade as string,
    shift_days: Number(row.shift_days ?? 0),
    created_at: row.created_at as string,
  }));

  // ── Map supply orders ─────────────────────────────────────────────────
  const supplyOrders = (supplyRaw ?? []).map((row) => ({
    risk_grade: (row.risk_grade ?? "A") as string,
    apr_bucket: Number(row.apr_bucket ?? row.target_apr ?? 0),
    lender_count: Number(row.lender_count ?? row.count ?? 0),
    available_volume: Number(row.available_volume ?? row.total_available ?? 0),
  }));

  // ── Map market rates ──────────────────────────────────────────────────
  const marketRates = (marketRatesRaw ?? []).map((row) => ({
    risk_grade: (row.risk_grade ?? "A") as string,
    bid_apr: Number(row.bid_apr ?? 0),
    ask_apr: Number(row.ask_apr ?? 0),
    spread: Number(row.spread ?? 0),
    liquidity_ratio: Number(row.liquidity_ratio ?? 0),
    supply_count: Number(row.supply_count ?? 0),
    demand_count: Number(row.demand_count ?? 0),
  }));

  return (
    <div>
      <TopBar title="Data & Analytics" />
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <DataPageClient
          poolHealth={poolHealth}
          riskDist={(riskDist ?? []) as { risk_grade: string; user_count: number }[]}
          tradeAnalytics={
            (tradeAnalytics ?? []) as {
              risk_grade: string;
              status: string;
              trade_count: number;
              avg_amount: number;
              avg_fee: number;
              avg_shift_days: number;
              total_volume: number;
              total_fees: number;
              default_rate: number | null;
            }[]
          }
          orderBook={orderBook}
          matchSpeed={matchSpeed}
          settlement={settlement}
          yieldTrends={yieldTrends}
          lenderConcentration={lenderConcentration}
          pendingTrades={pendingTrades}
          supplyOrders={supplyOrders}
          marketRates={marketRates}
          revenueSummary={
            revenueSummary
              ? {
                  total_fee_income: Number(revenueSummary.total_fee_income ?? 0),
                  total_default_losses: Number(revenueSummary.total_default_losses ?? 0),
                  net_revenue: Number(revenueSummary.net_revenue ?? 0),
                  fee_transactions: Number(revenueSummary.fee_transactions ?? 0),
                  default_events: Number(revenueSummary.default_events ?? 0),
                }
              : null
          }
          revenueMonthly={(revenueMonthly ?? []).map((r) => ({
            month: r.month as string,
            fee_income: Number(r.fee_income ?? 0),
            default_losses: Number(r.default_losses ?? 0),
            net_revenue: Number(r.net_revenue ?? 0),
            trade_count: Number(r.trade_count ?? 0),
          }))}
        />
      </div>
    </div>
  );
}
