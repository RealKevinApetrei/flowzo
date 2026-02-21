"use client";

import { useState } from "react";
import { StatCard } from "./stat-card";
import { DataTable, GradeBadge } from "./data-table";
import { QuantDashboard } from "./quant-dashboard";

// ── Types ────────────────────────────────────────────────────────────────────

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

interface RiskRow {
  risk_grade: string;
  user_count: number;
}

interface TradeAnalyticsRow {
  risk_grade: string;
  status: string;
  trade_count: number;
  avg_amount: number;
  avg_fee: number;
  avg_shift_days: number;
  total_volume: number;
  total_fees: number;
  default_rate: number | null;
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

interface DataPageClientProps {
  poolHealth: PoolHealth | null;
  riskDist: RiskRow[];
  tradeAnalytics: TradeAnalyticsRow[];
  orderBook: OrderBookRow[];
  matchSpeed: MatchSpeedRow[];
  settlement: SettlementRow[];
  yieldTrends: YieldTrendRow[];
  lenderConcentration: LenderConcRow[];
  pendingTrades: PendingTrade[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (gbp: number) => "£" + Number(gbp).toFixed(2);
const fmtK = (gbp: number) => {
  const n = Number(gbp);
  return n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n.toFixed(2)}`;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "orderbook", label: "Order Book" },
  { id: "performance", label: "Performance" },
  { id: "yield", label: "Yield" },
  { id: "lenders", label: "Lenders" },
  { id: "quant", label: "ML / Quant" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Main Component ───────────────────────────────────────────────────────────

export function DataPageClient({
  poolHealth,
  riskDist,
  tradeAnalytics,
  orderBook,
  matchSpeed,
  settlement,
  yieldTrends,
  lenderConcentration,
  pendingTrades,
}: DataPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-coral text-white"
                : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          pool={poolHealth}
          riskDist={riskDist}
          tradeAnalytics={tradeAnalytics}
        />
      )}
      {activeTab === "orderbook" && (
        <OrderBookTab orderBook={orderBook} pendingTrades={pendingTrades} />
      )}
      {activeTab === "performance" && (
        <PerformanceTab matchSpeed={matchSpeed} settlement={settlement} />
      )}
      {activeTab === "yield" && <YieldTab yieldTrends={yieldTrends} />}
      {activeTab === "lenders" && (
        <LendersTab
          lenders={lenderConcentration}
          totalPool={Number(poolHealth?.total_pool_gbp ?? 0)}
        />
      )}
      {activeTab === "quant" && <QuantTab />}
    </div>
  );
}

// ── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({
  pool,
  riskDist,
  tradeAnalytics,
}: {
  pool: PoolHealth | null;
  riskDist: RiskRow[];
  tradeAnalytics: TradeAnalyticsRow[];
}) {
  const p = pool;
  const totalTrades =
    (p?.pending_trades ?? 0) +
    (p?.live_trades ?? 0) +
    (p?.repaid_trades ?? 0) +
    (p?.defaulted_trades ?? 0);
  const totalVolume = tradeAnalytics.reduce(
    (s, r) => s + Number(r.total_volume ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Pool"
          value={fmtK(p?.total_pool_gbp ?? 0)}
          subtitle={`${p?.total_lenders ?? 0} lenders`}
        />
        <StatCard
          label="Utilization"
          value={`${p?.utilization_pct ?? 0}%`}
          subtitle={`${fmtK(p?.locked_gbp ?? 0)} locked`}
          variant={
            Number(p?.utilization_pct ?? 0) > 50
              ? "warning"
              : Number(p?.utilization_pct ?? 0) > 0
                ? "success"
                : "default"
          }
        />
        <StatCard
          label="Total Yield"
          value={fmt(p?.total_yield_gbp ?? 0)}
          variant="success"
        />
        <StatCard
          label="Total Volume"
          value={fmtK(totalVolume)}
          subtitle={`${totalTrades} trades`}
        />
      </div>

      {/* Trade Pipeline */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Trade Pipeline
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            {
              label: "Pending",
              count: p?.pending_trades ?? 0,
              color: "bg-warning/15 text-warning",
            },
            {
              label: "Live",
              count: p?.live_trades ?? 0,
              color: "bg-coral/15 text-coral",
            },
            {
              label: "Repaid",
              count: p?.repaid_trades ?? 0,
              color: "bg-success/15 text-success",
            },
            {
              label: "Defaulted",
              count: p?.defaulted_trades ?? 0,
              color: "bg-danger/15 text-danger",
            },
          ].map((stage) => (
            <div
              key={stage.label}
              className={`flex-1 text-center py-3 rounded-xl ${stage.color}`}
            >
              <p className="text-xl font-bold">{stage.count}</p>
              <p className="text-[10px] mt-0.5">{stage.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Risk Distribution */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Risk Distribution
        </h2>
        {riskDist.length > 0 ? (
          <div className="flex gap-3">
            {riskDist.map((row) => (
              <div
                key={row.risk_grade}
                className={`flex-1 text-center py-3 rounded-xl ${
                  row.risk_grade === "A"
                    ? "bg-success/10"
                    : row.risk_grade === "B"
                      ? "bg-warning/10"
                      : "bg-danger/10"
                }`}
              >
                <p
                  className={`text-2xl font-bold ${
                    row.risk_grade === "A"
                      ? "text-success"
                      : row.risk_grade === "B"
                        ? "text-warning"
                        : "text-danger"
                  }`}
                >
                  {row.user_count}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Grade {row.risk_grade}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No risk data yet.</p>
        )}
      </section>

      {/* Trade Analytics by Grade */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Trade Analytics by Grade
        </h2>
        <DataTable
          columns={[
            {
              key: "grade",
              header: "Grade",
              render: (r: TradeAnalyticsRow) => (
                <GradeBadge grade={r.risk_grade} />
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r: TradeAnalyticsRow) => (
                <span className="text-navy">{r.status}</span>
              ),
            },
            {
              key: "count",
              header: "Count",
              align: "right",
              render: (r: TradeAnalyticsRow) => (
                <span className="font-medium">{r.trade_count}</span>
              ),
            },
            {
              key: "avg_amount",
              header: "Avg Amt",
              align: "right",
              render: (r: TradeAnalyticsRow) => fmt(Number(r.avg_amount)),
            },
            {
              key: "avg_fee",
              header: "Avg Fee",
              align: "right",
              render: (r: TradeAnalyticsRow) => fmt(Number(r.avg_fee)),
            },
            {
              key: "default_rate",
              header: "Default %",
              align: "right",
              render: (r: TradeAnalyticsRow) =>
                r.default_rate != null
                  ? `${(Number(r.default_rate) * 100).toFixed(1)}%`
                  : "—",
            },
          ]}
          data={tradeAnalytics}
          emptyMessage="No trade data yet."
        />
      </section>
    </div>
  );
}

// ── Tab 2: Order Book ────────────────────────────────────────────────────────

function OrderBookTab({
  orderBook,
  pendingTrades,
}: {
  orderBook: OrderBookRow[];
  pendingTrades: PendingTrade[];
}) {
  function hoursAgo(dateStr: string): string {
    const h = Math.round(
      (Date.now() - new Date(dateStr).getTime()) / 3600000,
    );
    return h < 1 ? "<1h" : `${h}h`;
  }

  return (
    <div className="space-y-4">
      {/* Summary by Grade */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Pending by Grade
        </h2>
        <DataTable
          columns={[
            {
              key: "grade",
              header: "Grade",
              render: (r: OrderBookRow) => (
                <GradeBadge grade={r.risk_grade} />
              ),
            },
            {
              key: "count",
              header: "Count",
              align: "right",
              render: (r: OrderBookRow) => (
                <span className="font-medium">{r.pending_count}</span>
              ),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              render: (r: OrderBookRow) => fmtK(Number(r.total_amount)),
            },
            {
              key: "apr",
              header: "Avg APR",
              align: "right",
              render: (r: OrderBookRow) => (
                <span className="font-bold text-success">
                  {Number(r.avg_implied_apr_pct).toFixed(1)}%
                </span>
              ),
            },
            {
              key: "oldest",
              header: "Oldest",
              align: "right",
              render: (r: OrderBookRow) => (
                <span className="text-text-secondary">
                  {hoursAgo(r.oldest_pending)}
                </span>
              ),
            },
          ]}
          data={orderBook}
          emptyMessage="No pending trades."
        />
      </section>

      {/* Full Order List */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          All Pending Trades ({pendingTrades.length})
        </h2>
        <DataTable
          columns={[
            {
              key: "grade",
              header: "Grade",
              render: (r: PendingTrade) => (
                <GradeBadge grade={r.risk_grade} />
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (r: PendingTrade) => fmt(Number(r.amount)),
            },
            {
              key: "fee",
              header: "Fee",
              align: "right",
              render: (r: PendingTrade) => fmt(Number(r.fee)),
            },
            {
              key: "apr",
              header: "APR",
              align: "right",
              render: (r: PendingTrade) => {
                const apr =
                  (Number(r.fee) / Number(r.amount)) *
                  (365 / r.shift_days) *
                  100;
                return (
                  <span className="font-bold text-success">
                    {apr.toFixed(1)}%
                  </span>
                );
              },
            },
            {
              key: "shift",
              header: "Days",
              align: "right",
              render: (r: PendingTrade) => `${r.shift_days}d`,
            },
            {
              key: "waiting",
              header: "Wait",
              align: "right",
              render: (r: PendingTrade) => (
                <span className="text-text-secondary">
                  {hoursAgo(r.created_at)}
                </span>
              ),
            },
          ]}
          data={pendingTrades}
          emptyMessage="No pending trades in the order book."
        />
      </section>
    </div>
  );
}

// ── Tab 3: Performance ───────────────────────────────────────────────────────

function PerformanceTab({
  matchSpeed,
  settlement,
}: {
  matchSpeed: MatchSpeedRow[];
  settlement: SettlementRow[];
}) {
  const totalFees = settlement.reduce(
    (s, r) => s + Number(r.total_fees_earned ?? 0),
    0,
  );
  const totalDefaultedVol = settlement.reduce(
    (s, r) => s + Number(r.total_defaulted_volume ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Match Speed */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Match Speed
        </h2>
        <DataTable
          columns={[
            {
              key: "grade",
              header: "Grade",
              render: (r: MatchSpeedRow) => (
                <GradeBadge grade={r.risk_grade} />
              ),
            },
            {
              key: "count",
              header: "Matched",
              align: "right",
              render: (r: MatchSpeedRow) => (
                <span className="font-medium">{r.matched_count}</span>
              ),
            },
            {
              key: "avg",
              header: "Avg (hrs)",
              align: "right",
              render: (r: MatchSpeedRow) =>
                `${Number(r.avg_hours_to_match).toFixed(1)}h`,
            },
            {
              key: "median",
              header: "Median",
              align: "right",
              render: (r: MatchSpeedRow) =>
                `${Number(r.median_hours_to_match).toFixed(1)}h`,
            },
            {
              key: "range",
              header: "Range",
              align: "right",
              render: (r: MatchSpeedRow) =>
                `${Number(r.fastest_match_hours).toFixed(0)}–${Number(r.slowest_match_hours).toFixed(0)}h`,
            },
          ]}
          data={matchSpeed}
          emptyMessage="No match data yet."
        />
      </section>

      {/* Settlement Stats */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Settlement Performance
        </h2>
        <DataTable
          columns={[
            {
              key: "grade",
              header: "Grade",
              render: (r: SettlementRow) => (
                <GradeBadge grade={r.risk_grade} />
              ),
            },
            {
              key: "repaid",
              header: "Repaid",
              align: "right",
              render: (r: SettlementRow) => (
                <span className="text-success font-medium">
                  {r.repaid_count}
                </span>
              ),
            },
            {
              key: "defaulted",
              header: "Defaulted",
              align: "right",
              render: (r: SettlementRow) => (
                <span
                  className={
                    r.defaulted_count > 0
                      ? "text-danger font-bold"
                      : "text-text-secondary"
                  }
                >
                  {r.defaulted_count}
                </span>
              ),
            },
            {
              key: "rate",
              header: "Default %",
              align: "right",
              render: (r: SettlementRow) => (
                <span
                  className={
                    Number(r.default_rate_pct) > 5
                      ? "text-danger font-bold"
                      : "text-navy"
                  }
                >
                  {Number(r.default_rate_pct).toFixed(1)}%
                </span>
              ),
            },
            {
              key: "days",
              header: "Avg Days",
              align: "right",
              render: (r: SettlementRow) =>
                r.avg_days_to_repay
                  ? `${Number(r.avg_days_to_repay).toFixed(1)}d`
                  : "—",
            },
            {
              key: "fees",
              header: "Fees",
              align: "right",
              render: (r: SettlementRow) => fmt(Number(r.total_fees_earned)),
            },
          ]}
          data={settlement}
          emptyMessage="No settlement data yet."
        />
      </section>

      {/* Default Rate Bars */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Repaid vs Defaulted
        </h2>
        {settlement.map((row) => {
          const total = row.repaid_count + row.defaulted_count;
          const repaidPct = total > 0 ? (row.repaid_count / total) * 100 : 100;
          return (
            <div key={row.risk_grade} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-navy">
                  Grade {row.risk_grade}
                </span>
                <span className="text-text-muted">{total} settled</span>
              </div>
              <div className="h-3 rounded-full bg-danger/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${repaidPct}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-xs text-text-muted pt-2 border-t border-warm-grey">
          <span>Total fees earned: {fmt(totalFees)}</span>
          <span>Total defaulted: {fmt(totalDefaultedVol)}</span>
        </div>
      </section>
    </div>
  );
}

// ── Tab 4: Yield ─────────────────────────────────────────────────────────────

function YieldTab({ yieldTrends }: { yieldTrends: YieldTrendRow[] }) {
  // Compute cumulative yield
  let cumulative = 0;
  const withCumulative = yieldTrends.map((row) => {
    cumulative += Number(row.total_fees);
    return { ...row, cumulative_fees: cumulative };
  });

  // Sparkline for yield %
  const yieldValues = yieldTrends.map((r) => Number(r.yield_pct));
  const maxYield = Math.max(...yieldValues, 0.001);

  return (
    <div className="space-y-4">
      {/* Yield Trend Chart */}
      {yieldTrends.length >= 2 && (
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Yield Trend
          </h2>
          <svg
            viewBox="0 0 300 60"
            className="w-full h-16"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={yieldValues
                .map(
                  (v, i) =>
                    `${(i / (yieldValues.length - 1)) * 300},${55 - (v / maxYield) * 48}`,
                )
                .join(" ")}
            />
          </svg>
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>{yieldTrends[0]?.month}</span>
            <span>{yieldTrends[yieldTrends.length - 1]?.month}</span>
          </div>
        </section>
      )}

      {/* Monthly Table */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Monthly Yield
        </h2>
        <DataTable
          columns={[
            {
              key: "month",
              header: "Month",
              render: (r: (typeof withCumulative)[0]) => (
                <span className="text-navy font-medium">{r.month}</span>
              ),
            },
            {
              key: "settled",
              header: "Settled",
              align: "right",
              render: (r: (typeof withCumulative)[0]) => r.trades_settled,
            },
            {
              key: "fees",
              header: "Fees",
              align: "right",
              render: (r: (typeof withCumulative)[0]) => (
                <span className="text-success">
                  {fmt(Number(r.total_fees))}
                </span>
              ),
            },
            {
              key: "volume",
              header: "Volume",
              align: "right",
              render: (r: (typeof withCumulative)[0]) =>
                fmtK(Number(r.total_volume)),
            },
            {
              key: "apr",
              header: "Avg APR",
              align: "right",
              render: (r: (typeof withCumulative)[0]) =>
                `${Number(r.avg_apr_pct).toFixed(1)}%`,
            },
            {
              key: "cumulative",
              header: "Cumul.",
              align: "right",
              render: (r: (typeof withCumulative)[0]) => (
                <span className="font-bold text-navy">
                  {fmt(r.cumulative_fees)}
                </span>
              ),
            },
          ]}
          data={withCumulative}
          emptyMessage="No yield data yet."
        />
      </section>
    </div>
  );
}

// ── Tab 5: Lenders ───────────────────────────────────────────────────────────

function LendersTab({
  lenders,
  totalPool,
}: {
  lenders: LenderConcRow[];
  totalPool: number;
}) {
  // Sort by total capital descending
  const sorted = [...lenders].sort(
    (a, b) => Number(b.total_capital) - Number(a.total_capital),
  );

  // HHI = sum of (market_share%)^2
  const hhi =
    totalPool > 0
      ? sorted.reduce((sum, l) => {
          const share = (Number(l.total_capital) / totalPool) * 100;
          return sum + share * share;
        }, 0)
      : 0;

  // Concentration warning
  const topLender = sorted[0];
  const topShare =
    totalPool > 0
      ? (Number(topLender?.total_capital ?? 0) / totalPool) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Lenders" value={String(lenders.length)} />
        <StatCard
          label="HHI"
          value={hhi.toFixed(0)}
          subtitle={hhi < 1500 ? "Diversified" : hhi < 2500 ? "Moderate" : "Concentrated"}
          variant={hhi > 2500 ? "danger" : hhi > 1500 ? "warning" : "success"}
        />
        <StatCard
          label="Top Lender"
          value={`${topShare.toFixed(1)}%`}
          subtitle={topLender?.display_name ?? "—"}
          variant={topShare > 30 ? "warning" : "default"}
        />
      </div>

      {topShare > 30 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs text-warning">
          Concentration warning: {topLender?.display_name} holds{" "}
          {topShare.toFixed(1)}% of total pool capital.
        </div>
      )}

      {/* Lender Table */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Lender Breakdown ({lenders.length})
        </h2>
        <DataTable
          columns={[
            {
              key: "name",
              header: "Lender",
              render: (r: LenderConcRow) => (
                <span className="text-navy font-medium text-xs">
                  {r.display_name}
                </span>
              ),
            },
            {
              key: "capital",
              header: "Capital",
              align: "right",
              render: (r: LenderConcRow) => fmt(Number(r.total_capital)),
            },
            {
              key: "locked",
              header: "Locked",
              align: "right",
              render: (r: LenderConcRow) => fmt(Number(r.locked_capital)),
            },
            {
              key: "yield",
              header: "Yield",
              align: "right",
              render: (r: LenderConcRow) => (
                <span className="text-success">
                  {fmt(Number(r.total_yield))}
                </span>
              ),
            },
            {
              key: "util",
              header: "Util %",
              align: "right",
              render: (r: LenderConcRow) =>
                `${Number(r.utilization_pct).toFixed(0)}%`,
            },
          ]}
          data={sorted.slice(0, 25)}
          emptyMessage="No lender data."
        />
        {sorted.length > 25 && (
          <p className="text-xs text-text-muted text-center">
            Showing top 25 of {sorted.length} lenders
          </p>
        )}
      </section>
    </div>
  );
}

// ── Tab 6: ML / Quant ────────────────────────────────────────────────────────

function QuantTab() {
  return (
    <section className="card-monzo p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-coral uppercase tracking-wider">
          ML Credit Scoring (Quant API)
        </h2>
      </div>
      <QuantDashboard />
    </section>
  );
}
