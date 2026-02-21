"use client";

import { SectionNav } from "@/components/data/section-nav";
import { PortfolioOverview } from "@/components/data/portfolio-overview";
import { BacktestResults } from "@/components/data/backtest-results";
import { PortfolioReturns } from "@/components/data/portfolio-returns";
import { RiskScoreExplorer } from "@/components/data/risk-score-explorer";
import { StressTesting } from "@/components/data/stress-testing";
import { EdaSummary } from "@/components/data/eda-summary";
import { ForecastAccuracy } from "@/components/data/forecast-accuracy";
import { GradeBadge } from "@/components/data/data-table";
import type {
  BacktestResponse,
  ReturnsResponse,
  EdaResponse,
  ForecastAccuracyResponse,
  LendersResponse,
} from "@/lib/quant-api";

interface PoolData {
  total_pool_size: number;
  total_available: number;
  total_locked: number;
  lender_count: number;
}

interface PoolHealth {
  total_lenders: number;
  total_pool_gbp: number;
  available_gbp: number;
  locked_gbp: number;
  utilization_pct: number;
  total_yield_gbp: number;
  pending_trades: number;
  live_trades: number;
  repaid_trades: number;
  defaulted_trades: number;
}

interface TradeAnalyticsRow {
  risk_grade: string;
  status: string;
  trade_count: number;
  total_volume: number;
  total_fees: number;
  avg_amount: number;
  avg_fee: number;
  default_rate: number | null;
}

interface RiskDistRow {
  risk_grade: string;
  user_count: number;
}

interface OrderBookRow {
  risk_grade: string;
  pending_count: number;
  total_amount: number;
  avg_amount: number;
  avg_fee: number;
  avg_shift_days: number;
  avg_implied_apr_pct: number;
  oldest_pending: string;
}

interface MatchSpeedRow {
  risk_grade: string;
  matched_count: number;
  avg_hours_to_match: number;
  median_hours_to_match: number;
  fastest_match_hours: number;
  slowest_match_hours: number;
}

interface SettlementRow {
  risk_grade: string;
  repaid_count: number;
  defaulted_count: number;
  live_count: number;
  default_rate_pct: number;
  avg_days_to_repay: number;
  total_fees_earned: number;
  total_defaulted_volume: number | null;
}

interface YieldTrendRow {
  month: string;
  trades_settled: number;
  total_fees: number;
  total_volume: number;
  yield_pct: number;
  avg_apr_pct: number;
}

interface LenderConcRow {
  display_name: string;
  total_capital: number;
  locked_capital: number;
  total_yield: number;
  active_allocations: number;
  total_allocations: number;
  utilization_pct: number;
}

interface PendingTrade {
  id: string;
  amount: number;
  fee: number;
  risk_grade: string;
  shift_days: number;
  created_at: string;
}

interface DataDashboardClientProps {
  pool: PoolData | null;
  tradeAnalytics: TradeAnalyticsRow[] | null;
  riskDist: RiskDistRow[] | null;
  poolHealth: PoolHealth | null;
  orderBook: OrderBookRow[];
  matchSpeed: MatchSpeedRow[];
  settlement: SettlementRow[];
  yieldTrends: YieldTrendRow[];
  lenderConcentration: LenderConcRow[];
  pendingTrades: PendingTrade[];
  backtest: BacktestResponse | null;
  returns: ReturnsResponse | null;
  eda: EdaResponse | null;
  forecastAccuracy: ForecastAccuracyResponse | null;
  lenders: LendersResponse | null;
}

const fmt = (gbp: number) => "£" + Number(gbp).toFixed(2);
const fmtK = (gbp: number) => {
  const n = Number(gbp);
  return n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n.toFixed(2)}`;
};

function hoursAgo(dateStr: string): string {
  const h = Math.round((Date.now() - new Date(dateStr).getTime()) / 3600000);
  return h < 1 ? "<1h" : `${h}h`;
}

export function DataDashboardClient({
  pool,
  tradeAnalytics,
  riskDist,
  poolHealth,
  orderBook,
  matchSpeed,
  settlement,
  yieldTrends,
  lenderConcentration,
  pendingTrades,
  backtest,
  returns,
  eda,
  forecastAccuracy,
  lenders,
}: DataDashboardClientProps) {
  return (
    <>
      <SectionNav />
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* ─── Member B: Portfolio Overview ─── */}
        <PortfolioOverview
          pool={pool}
          tradeAnalytics={tradeAnalytics}
          riskDist={riskDist}
          lenders={lenders}
        />

        {/* ─── Operational Analytics: Order Book ─── */}
        <OrderBookSection orderBook={orderBook} pendingTrades={pendingTrades} />

        {/* ─── Operational Analytics: Performance ─── */}
        <PerformanceSection
          matchSpeed={matchSpeed}
          settlement={settlement}
          poolHealth={poolHealth}
        />

        {/* ─── Operational Analytics: Yield ─── */}
        <YieldSection yieldTrends={yieldTrends} />

        {/* ─── Operational Analytics: Lenders ─── */}
        <LendersSection
          lenders={lenderConcentration}
          totalPool={Number(poolHealth?.total_pool_gbp ?? pool?.total_pool_size ?? 0)}
        />

        {/* ─── Member B: ML / Quant Sections ─── */}
        <BacktestResults data={backtest} />
        <PortfolioReturns data={returns} />
        <RiskScoreExplorer />
        <StressTesting />
        <EdaSummary data={eda} />
        <ForecastAccuracy data={forecastAccuracy} />
      </div>
    </>
  );
}

// ── Order Book Section ───────────────────────────────────────────────────────

function OrderBookSection({
  orderBook,
  pendingTrades,
}: {
  orderBook: OrderBookRow[];
  pendingTrades: PendingTrade[];
}) {
  return (
    <section id="order-book" className="space-y-4">
      <div className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Order Book — Pending by Grade
        </h2>
        {orderBook.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                  <th className="py-2 pr-3">Grade</th>
                  <th className="py-2 pr-3 text-right">Count</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">Avg APR</th>
                  <th className="py-2 text-right">Oldest</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.map((r) => (
                  <tr key={r.risk_grade} className="border-b border-warm-grey/50 last:border-0">
                    <td className="py-2 pr-3"><GradeBadge grade={r.risk_grade} /></td>
                    <td className="py-2 pr-3 text-right font-medium">{r.pending_count}</td>
                    <td className="py-2 pr-3 text-right">{fmtK(Number(r.total_amount))}</td>
                    <td className="py-2 pr-3 text-right font-bold text-success">{Number(r.avg_implied_apr_pct).toFixed(1)}%</td>
                    <td className="py-2 text-right text-text-secondary">{hoursAgo(r.oldest_pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No pending trades.</p>
        )}
      </div>

      {pendingTrades.length > 0 && (
        <div className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            All Pending Trades ({pendingTrades.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                  <th className="py-2 pr-3">Grade</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3 text-right">Fee</th>
                  <th className="py-2 pr-3 text-right">APR</th>
                  <th className="py-2 pr-3 text-right">Days</th>
                  <th className="py-2 text-right">Wait</th>
                </tr>
              </thead>
              <tbody>
                {pendingTrades.map((t) => {
                  const apr = (Number(t.fee) / Number(t.amount)) * (365 / t.shift_days) * 100;
                  return (
                    <tr key={t.id} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3"><GradeBadge grade={t.risk_grade} /></td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(t.amount))}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(t.fee))}</td>
                      <td className="py-2 pr-3 text-right font-bold text-success">{apr.toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-right">{t.shift_days}d</td>
                      <td className="py-2 text-right text-text-secondary">{hoursAgo(t.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Performance Section ──────────────────────────────────────────────────────

function PerformanceSection({
  matchSpeed,
  settlement,
  poolHealth,
}: {
  matchSpeed: MatchSpeedRow[];
  settlement: SettlementRow[];
  poolHealth: PoolHealth | null;
}) {
  const totalFees = settlement.reduce((s, r) => s + Number(r.total_fees_earned ?? 0), 0);

  return (
    <section id="performance" className="space-y-4">
      {/* Trade Pipeline */}
      {poolHealth && (
        <div className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Trade Pipeline
          </h2>
          <div className="flex items-center gap-2">
            {[
              { label: "Pending", count: poolHealth.pending_trades, color: "bg-warning/15 text-warning" },
              { label: "Live", count: poolHealth.live_trades, color: "bg-coral/15 text-coral" },
              { label: "Repaid", count: poolHealth.repaid_trades, color: "bg-success/15 text-success" },
              { label: "Defaulted", count: poolHealth.defaulted_trades, color: "bg-danger/15 text-danger" },
            ].map((s) => (
              <div key={s.label} className={`flex-1 text-center py-3 rounded-xl ${s.color}`}>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Speed */}
      <div className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Match Speed
        </h2>
        {matchSpeed.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                  <th className="py-2 pr-3">Grade</th>
                  <th className="py-2 pr-3 text-right">Matched</th>
                  <th className="py-2 pr-3 text-right">Avg</th>
                  <th className="py-2 pr-3 text-right">Median</th>
                  <th className="py-2 text-right">Range</th>
                </tr>
              </thead>
              <tbody>
                {matchSpeed.map((r) => (
                  <tr key={r.risk_grade} className="border-b border-warm-grey/50 last:border-0">
                    <td className="py-2 pr-3"><GradeBadge grade={r.risk_grade} /></td>
                    <td className="py-2 pr-3 text-right font-medium">{r.matched_count}</td>
                    <td className="py-2 pr-3 text-right">{Number(r.avg_hours_to_match).toFixed(1)}h</td>
                    <td className="py-2 pr-3 text-right">{Number(r.median_hours_to_match).toFixed(1)}h</td>
                    <td className="py-2 text-right text-text-secondary">{Number(r.fastest_match_hours).toFixed(0)}–{Number(r.slowest_match_hours).toFixed(0)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No match data yet.</p>
        )}
      </div>

      {/* Settlement + Default Rate Bars */}
      <div className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Settlement Performance
        </h2>
        {settlement.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3 text-right">Repaid</th>
                    <th className="py-2 pr-3 text-right">Default</th>
                    <th className="py-2 pr-3 text-right">Rate</th>
                    <th className="py-2 pr-3 text-right">Avg Days</th>
                    <th className="py-2 text-right">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.map((r) => (
                    <tr key={r.risk_grade} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3"><GradeBadge grade={r.risk_grade} /></td>
                      <td className="py-2 pr-3 text-right text-success font-medium">{r.repaid_count}</td>
                      <td className="py-2 pr-3 text-right">{r.defaulted_count > 0 ? <span className="text-danger font-bold">{r.defaulted_count}</span> : <span className="text-text-secondary">0</span>}</td>
                      <td className="py-2 pr-3 text-right">{Number(r.default_rate_pct).toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-right">{r.avg_days_to_repay ? `${Number(r.avg_days_to_repay).toFixed(1)}d` : "—"}</td>
                      <td className="py-2 text-right">{fmt(Number(r.total_fees_earned))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual bars */}
            <div className="space-y-2 pt-2 border-t border-warm-grey">
              {settlement.map((r) => {
                const total = r.repaid_count + r.defaulted_count;
                const pct = total > 0 ? (r.repaid_count / total) * 100 : 100;
                return (
                  <div key={r.risk_grade} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-navy">Grade {r.risk_grade}</span>
                      <span className="text-text-muted">{total} settled</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-danger/20 overflow-hidden">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-text-muted pt-1">Total fees earned: {fmt(totalFees)}</p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">No settlement data yet.</p>
        )}
      </div>
    </section>
  );
}

// ── Yield Section ────────────────────────────────────────────────────────────

function YieldSection({ yieldTrends }: { yieldTrends: YieldTrendRow[] }) {
  let cumulative = 0;
  const withCum = yieldTrends.map((r) => {
    cumulative += Number(r.total_fees);
    return { ...r, cum: cumulative };
  });

  const yieldVals = yieldTrends.map((r) => Number(r.yield_pct));
  const maxY = Math.max(...yieldVals, 0.001);

  return (
    <section id="yield" className="space-y-4">
      {/* Sparkline */}
      {yieldTrends.length >= 2 && (
        <div className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Yield Trend
          </h2>
          <svg viewBox="0 0 300 60" className="w-full h-16" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={yieldVals
                .map((v, i) => `${(i / (yieldVals.length - 1)) * 300},${55 - (v / maxY) * 48}`)
                .join(" ")}
            />
          </svg>
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>{yieldTrends[0]?.month}</span>
            <span>{yieldTrends[yieldTrends.length - 1]?.month}</span>
          </div>
        </div>
      )}

      {/* Monthly Table */}
      <div className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Monthly Yield
        </h2>
        {withCum.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3 text-right">Settled</th>
                  <th className="py-2 pr-3 text-right">Fees</th>
                  <th className="py-2 pr-3 text-right">Volume</th>
                  <th className="py-2 pr-3 text-right">APR</th>
                  <th className="py-2 text-right">Cumul.</th>
                </tr>
              </thead>
              <tbody>
                {withCum.map((r) => (
                  <tr key={r.month} className="border-b border-warm-grey/50 last:border-0">
                    <td className="py-2 pr-3 font-medium text-navy">{r.month}</td>
                    <td className="py-2 pr-3 text-right">{r.trades_settled}</td>
                    <td className="py-2 pr-3 text-right text-success">{fmt(Number(r.total_fees))}</td>
                    <td className="py-2 pr-3 text-right">{fmtK(Number(r.total_volume))}</td>
                    <td className="py-2 pr-3 text-right">{Number(r.avg_apr_pct).toFixed(1)}%</td>
                    <td className="py-2 text-right font-bold text-navy">{fmt(r.cum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No yield data yet.</p>
        )}
      </div>
    </section>
  );
}

// ── Lenders Section ──────────────────────────────────────────────────────────

function LendersSection({
  lenders,
  totalPool,
}: {
  lenders: LenderConcRow[];
  totalPool: number;
}) {
  const sorted = [...lenders].sort((a, b) => Number(b.total_capital) - Number(a.total_capital));

  // HHI = sum of (market_share%)^2
  const hhi = totalPool > 0
    ? sorted.reduce((s, l) => {
        const share = (Number(l.total_capital) / totalPool) * 100;
        return s + share * share;
      }, 0)
    : 0;

  const topLender = sorted[0];
  const topShare = totalPool > 0 ? (Number(topLender?.total_capital ?? 0) / totalPool) * 100 : 0;

  return (
    <section id="lenders" className="space-y-4">
      <div className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Lender Concentration
        </h2>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-warm-grey/30 rounded-xl p-3">
            <p className="text-xs text-text-muted">Lenders</p>
            <p className="text-lg font-bold text-navy mt-0.5">{lenders.length}</p>
          </div>
          <div className="bg-warm-grey/30 rounded-xl p-3">
            <p className="text-xs text-text-muted">HHI</p>
            <p className={`text-lg font-bold mt-0.5 ${hhi > 2500 ? "text-danger" : hhi > 1500 ? "text-warning" : "text-success"}`}>
              {hhi.toFixed(0)}
            </p>
            <p className="text-[10px] text-text-muted">{hhi < 1500 ? "Diversified" : hhi < 2500 ? "Moderate" : "Concentrated"}</p>
          </div>
          <div className="bg-warm-grey/30 rounded-xl p-3">
            <p className="text-xs text-text-muted">Top Lender</p>
            <p className={`text-lg font-bold mt-0.5 ${topShare > 30 ? "text-warning" : "text-navy"}`}>
              {topShare.toFixed(1)}%
            </p>
          </div>
        </div>

        {topShare > 30 && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs text-warning">
            Concentration warning: {topLender?.display_name} holds {topShare.toFixed(1)}% of pool.
          </div>
        )}

        {/* Lender Table (top 20) */}
        {sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                  <th className="py-2 pr-3">Lender</th>
                  <th className="py-2 pr-3 text-right">Capital</th>
                  <th className="py-2 pr-3 text-right">Locked</th>
                  <th className="py-2 pr-3 text-right">Yield</th>
                  <th className="py-2 text-right">Util</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 20).map((l) => (
                  <tr key={l.display_name} className="border-b border-warm-grey/50 last:border-0">
                    <td className="py-2 pr-3 text-xs font-medium text-navy">{l.display_name}</td>
                    <td className="py-2 pr-3 text-right">{fmt(Number(l.total_capital))}</td>
                    <td className="py-2 pr-3 text-right">{fmt(Number(l.locked_capital))}</td>
                    <td className="py-2 pr-3 text-right text-success">{fmt(Number(l.total_yield))}</td>
                    <td className="py-2 text-right">{Number(l.utilization_pct).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length > 20 && (
              <p className="text-xs text-text-muted text-center mt-2">
                Showing top 20 of {sorted.length} lenders
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
