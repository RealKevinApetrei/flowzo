"use client";

import { useState } from "react";
import { StatCard } from "./stat-card";
import { DataTable, GradeBadge } from "./data-table";
import { QuantDashboard } from "./quant-dashboard";
import { DepthChart } from "./depth-chart";
import { AnomalyDetector } from "./anomaly-detector";

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

interface SupplyOrder {
  risk_grade: string;
  apr_bucket: number;
  lender_count: number;
  available_volume: number;
  avg_apr: number;
  best_apr: number;
  max_term_days: number;
}

interface MarketRate {
  risk_grade: string;
  ask_apr: number;
  best_bid_apr: number;
  weighted_avg_bid_apr: number;
  spread: number;
  demand_count: number;
  demand_volume: number;
  supply_count: number;
  supply_volume: number;
  liquidity_ratio: number | null;
}

interface CreditScoreDistRow {
  risk_grade: string;
  borrower_count: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  eligible_count: number;
  ineligible_count: number;
  avg_credit_limit: number;
}

interface EligibilitySummary {
  total_borrowers: number;
  eligible: number;
  ineligible: number;
  eligible_pct: number;
  avg_score: number;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  ineligible_score_count: number;
}

interface CreditRiskData {
  scoreDist: CreditScoreDistRow[];
  summary: EligibilitySummary | null;
}

interface RevenueSummary {
  total_fee_income: number;
  total_default_losses: number;
  net_revenue: number;
  fee_transactions: number;
  default_events: number;
}

interface RevenueMonthlyRow {
  month: string;
  fee_income: number;
  default_losses: number;
  net_revenue: number;
  trade_count: number;
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
  supplyOrders: SupplyOrder[];
  marketRates: MarketRate[];
  creditRisk: CreditRiskData;
  revenueSummary: RevenueSummary | null;
  revenueMonthly: RevenueMonthlyRow[];
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
  { id: "credit", label: "Credit Risk" },
  { id: "revenue", label: "Revenue" },
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
  supplyOrders,
  marketRates,
  creditRisk,
  revenueSummary,
  revenueMonthly,
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
        <OrderBookTab
          orderBook={orderBook}
          pendingTrades={pendingTrades}
          supplyOrders={supplyOrders}
          marketRates={marketRates}
        />
      )}
      {activeTab === "performance" && (
        <PerformanceTab matchSpeed={matchSpeed} settlement={settlement} />
      )}
      {activeTab === "yield" && <YieldTab yieldTrends={yieldTrends} />}
      {activeTab === "credit" && <CreditRiskTab data={creditRisk} />}
      {activeTab === "revenue" && (
        <RevenueTab summary={revenueSummary} monthly={revenueMonthly} />
      )}
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
      {/* AI Anomaly Detection */}
      <AnomalyDetector />

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
  supplyOrders,
  marketRates,
}: {
  orderBook: OrderBookRow[];
  pendingTrades: PendingTrade[];
  supplyOrders: SupplyOrder[];
  marketRates: MarketRate[];
}) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(pendingTrades.length / PAGE_SIZE);
  const paginatedTrades = pendingTrades.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  function hoursAgo(dateStr: string): string {
    const h = Math.round(
      (Date.now() - new Date(dateStr).getTime()) / 3600000,
    );
    return h < 1 ? "<1h" : `${h}h`;
  }

  // Aggregate supply by grade for summary
  const supplyByGrade = new Map<string, { lenders: number; volume: number; bestApr: number; avgApr: number }>();
  for (const s of supplyOrders) {
    const existing = supplyByGrade.get(s.risk_grade);
    if (existing) {
      existing.lenders += s.lender_count;
      existing.volume += s.available_volume;
      existing.bestApr = Math.min(existing.bestApr, s.best_apr);
    } else {
      supplyByGrade.set(s.risk_grade, {
        lenders: s.lender_count,
        volume: s.available_volume,
        bestApr: s.best_apr,
        avgApr: s.avg_apr,
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Market Rate Cards */}
      {marketRates.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {["A", "B", "C"].map((grade) => {
            const mr = marketRates.find((r) => r.risk_grade === grade);
            if (!mr) return null;
            const liquidityColor =
              mr.liquidity_ratio != null && mr.liquidity_ratio >= 1
                ? "success"
                : mr.liquidity_ratio != null && mr.liquidity_ratio >= 0.5
                  ? "warning"
                  : "danger";
            return (
              <div key={grade} className="card-monzo p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <GradeBadge grade={grade} />
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    liquidityColor === "success"
                      ? "bg-success/10 text-success"
                      : liquidityColor === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-danger/10 text-danger"
                  }`}>
                    {mr.liquidity_ratio != null ? `${mr.liquidity_ratio.toFixed(1)}x` : "—"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <span className="text-text-muted">Bid</span>
                    <p className="font-bold text-success">{mr.best_bid_apr.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Ask</span>
                    <p className="font-bold text-coral">{mr.ask_apr.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-[9px] text-text-muted">
                  Spread: {mr.spread.toFixed(1)}% | {mr.supply_count} lenders
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Two-Sided Depth Chart */}
      <section className="card-monzo p-5 space-y-3">
        <DepthChart pendingTrades={pendingTrades} supplyOrders={supplyOrders} />
      </section>

      {/* Supply Summary (Lender Standing Orders) */}
      {supplyOrders.length > 0 && (
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Supply (Lender Orders)
          </h2>
          <DataTable
            columns={[
              {
                key: "grade",
                header: "Grade",
                render: (r: { grade: string; lenders: number; volume: number; bestApr: number }) => (
                  <GradeBadge grade={r.grade} />
                ),
              },
              {
                key: "lenders",
                header: "Lenders",
                align: "right",
                render: (r: { grade: string; lenders: number; volume: number; bestApr: number }) => (
                  <span className="font-medium">{r.lenders}</span>
                ),
              },
              {
                key: "volume",
                header: "Available",
                align: "right",
                render: (r: { grade: string; lenders: number; volume: number; bestApr: number }) =>
                  fmtK(r.volume),
              },
              {
                key: "apr",
                header: "Best APR",
                align: "right",
                render: (r: { grade: string; lenders: number; volume: number; bestApr: number }) => (
                  <span className="font-bold text-success">
                    {r.bestApr.toFixed(1)}%
                  </span>
                ),
              },
            ]}
            data={["A", "B", "C"]
              .map((g) => {
                const s = supplyByGrade.get(g);
                return s ? { grade: g, ...s } : null;
              })
              .filter(Boolean) as { grade: string; lenders: number; volume: number; bestApr: number }[]}
            emptyMessage="No lender supply data."
          />
        </section>
      )}

      {/* Demand Summary (Pending Trades by Grade) */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Demand (Pending Trades)
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
                <span className="font-bold text-coral">
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

      {/* Pending Trades (paginated) */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Pending Trades ({pendingTrades.length})
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
                  r.amount > 0 && r.shift_days > 0
                    ? (Number(r.fee) / Number(r.amount)) *
                      (365 / r.shift_days) *
                      100
                    : 0;
                return (
                  <span className="font-bold text-coral">
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
          data={paginatedTrades}
          emptyMessage="No pending trades in the order book."
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-warm-grey/50 text-text-secondary hover:bg-warm-grey disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-warm-grey/50 text-text-secondary hover:bg-warm-grey disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
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
  const withCumulative = yieldTrends.reduce<(YieldTrendRow & { cumulative_fees: number })[]>((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumulative_fees : 0;
    acc.push({ ...row, cumulative_fees: prev + Number(row.total_fees) });
    return acc;
  }, []);

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
  const [showAll, setShowAll] = useState(false);

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
        <StatCard label="Lenders" value={String(totalPool > 0 ? lenders.length : 0)} />
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
          data={showAll ? sorted : sorted.slice(0, 25)}
          emptyMessage="No lender data."
        />
        {sorted.length > 25 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-center text-xs font-semibold text-coral py-2 hover:underline"
          >
            Show all {sorted.length} lenders
          </button>
        )}
        {showAll && sorted.length > 25 && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-center text-xs font-semibold text-text-muted py-2 hover:underline"
          >
            Show top 25 only
          </button>
        )}
      </section>
    </div>
  );
}

// ── Tab: Credit Risk ────────────────────────────────────────────────────────

function CreditRiskTab({ data }: { data: CreditRiskData }) {
  const { scoreDist, summary } = data;

  const gradeColors: Record<string, string> = {
    A: "text-success",
    B: "text-warning",
    C: "text-danger",
  };

  return (
    <div className="space-y-4">
      {/* Eligibility Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Eligible"
            value={String(summary.eligible)}
            subtitle={`${summary.eligible_pct}% of borrowers`}
            variant="success"
          />
          <StatCard
            label="Ineligible"
            value={String(summary.ineligible)}
            subtitle="Score < 500"
            variant={summary.ineligible > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Avg Score"
            value={String(summary.avg_score)}
            subtitle="300-850 scale"
          />
        </div>
      )}

      {/* Grade Distribution */}
      {summary && (
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Grade Distribution
          </h2>
          <div className="flex gap-2">
            {[
              { grade: "A", count: summary.grade_a_count, color: "bg-success" },
              { grade: "B", count: summary.grade_b_count, color: "bg-warning" },
              { grade: "C", count: summary.grade_c_count, color: "bg-danger" },
            ].map(({ grade, count, color }) => {
              const pct = summary.total_borrowers > 0 ? (count / summary.total_borrowers) * 100 : 0;
              return (
                <div key={grade} className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">Grade {grade}</span>
                    <span className="text-[10px] text-text-muted">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-warm-grey/30 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Score Distribution by Grade */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Credit Score Distribution
        </h2>
        <DataTable
          columns={[
            {
              key: "grade",
              header: "Grade",
              render: (r: CreditScoreDistRow) => <GradeBadge grade={r.risk_grade} />,
            },
            {
              key: "count",
              header: "Borrowers",
              align: "right",
              render: (r: CreditScoreDistRow) => <span className="font-medium">{r.borrower_count}</span>,
            },
            {
              key: "score",
              header: "Score Range",
              align: "right",
              render: (r: CreditScoreDistRow) => (
                <span className={gradeColors[r.risk_grade] ?? ""}>
                  {r.min_score}–{r.max_score}
                </span>
              ),
            },
            {
              key: "avg",
              header: "Avg Score",
              align: "right",
              render: (r: CreditScoreDistRow) => <span className="font-bold">{r.avg_score}</span>,
            },
            {
              key: "limit",
              header: "Avg Limit",
              align: "right",
              render: (r: CreditScoreDistRow) => `£${Number(r.avg_credit_limit).toFixed(0)}`,
            },
            {
              key: "eligible",
              header: "Eligible",
              align: "right",
              render: (r: CreditScoreDistRow) => (
                <span className="text-success font-medium">{r.eligible_count}</span>
              ),
            },
          ]}
          data={scoreDist}
          emptyMessage="No credit score data."
        />
      </section>

      {/* Eligibility Rules */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Eligibility Rules
        </h2>
        <div className="space-y-2 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>Score &lt; 500: <strong className="text-danger">Blocked</strong> — cannot create trades</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>Default rate &gt; 20%: <strong className="text-danger">Blocked</strong> — too many defaults</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>2+ defaults in 30 days: <strong className="text-danger">Blocked</strong> — recent default pattern</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Amount exceeds credit limit: <strong className="text-warning">Rejected</strong> — A: £500, B: £200, C: £75</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Active trade limit exceeded: <strong className="text-warning">Rejected</strong> — A: 5, B: 3, C: 1</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Tab 6: Revenue ──────────────────────────────────────────────────────────

function RevenueTab({
  summary,
  monthly,
}: {
  summary: RevenueSummary | null;
  monthly: RevenueMonthlyRow[];
}) {
  const feeIncome = summary?.total_fee_income ?? 0;
  const defaultLosses = Math.abs(summary?.total_default_losses ?? 0);
  const netRevenue = summary?.net_revenue ?? 0;
  const lossRatio = feeIncome > 0 ? (defaultLosses / feeIncome) * 100 : 0;

  // Chart dimensions
  const chartW = 360;
  const chartH = 140;
  const padL = 50;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // Compute chart scales
  const maxIncome = Math.max(...monthly.map((m) => m.fee_income), 0.01);
  const maxLoss = Math.max(...monthly.map((m) => Math.abs(m.default_losses)), 0.01);
  const maxVal = Math.max(maxIncome, maxLoss);
  const barW = monthly.length > 0 ? Math.min(plotW / monthly.length - 2, 24) : 20;

  return (
    <div className="space-y-4">
      {/* Hero Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Fee Income"
          value={fmtK(feeIncome)}
          subtitle={`${summary?.fee_transactions ?? 0} trades`}
          variant="success"
        />
        <StatCard
          label="Default Losses"
          value={fmtK(defaultLosses)}
          subtitle={`${summary?.default_events ?? 0} defaults`}
          variant="danger"
        />
        <StatCard
          label="Net Revenue"
          value={fmtK(netRevenue)}
          subtitle="Fee income - losses"
          variant={netRevenue >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Loss Ratio"
          value={`${lossRatio.toFixed(1)}%`}
          subtitle="Losses / Income"
          variant={lossRatio > 20 ? "danger" : lossRatio > 10 ? "warning" : "success"}
        />
      </div>

      {/* Fee Split Waterfall */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Fee Structure (Senior / Junior Tranche)
        </h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-24 text-text-secondary">Borrower Fee</span>
            <div className="flex-1 h-6 rounded-full bg-warm-grey/30 overflow-hidden flex">
              <div
                className="h-full bg-success/60 flex items-center justify-center text-[10px] font-semibold text-success"
                style={{ width: "80%" }}
              >
                80% Lender
              </div>
              <div
                className="h-full bg-coral/60 flex items-center justify-center text-[10px] font-semibold text-coral"
                style={{ width: "20%" }}
              >
                20% Platform
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-[10px] text-text-muted">
            <span>Lenders = Senior Secured (paid first, protected on default)</span>
          </div>
          <div className="flex gap-4 text-[10px] text-text-muted">
            <span>Platform = Junior Unsecured (takes spread, absorbs first loss)</span>
          </div>
        </div>
      </section>

      {/* Monthly Revenue Chart */}
      {monthly.length > 0 && (
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Monthly Revenue
          </h2>
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padT + plotH * (1 - pct);
              return (
                <g key={pct}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    style={{ stroke: "var(--warm-grey)" }}
                    strokeWidth="0.5"
                    strokeDasharray={pct === 0 ? "none" : "2,2"}
                  />
                  <text
                    x={padL - 4}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[8px]"
                    fill="var(--text-muted)"
                  >
                    {fmtK(maxVal * pct)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {monthly.map((m, i) => {
              const x =
                padL +
                (i / monthly.length) * plotW +
                (plotW / monthly.length - barW) / 2;
              const incomeH = (m.fee_income / maxVal) * plotH;
              const lossH = (Math.abs(m.default_losses) / maxVal) * plotH;

              return (
                <g key={m.month}>
                  {/* Income bar (green, up from baseline) */}
                  <rect
                    x={x}
                    y={padT + plotH - incomeH}
                    width={barW / 2 - 1}
                    height={incomeH}
                    fill="#10B981"
                    rx={2}
                    opacity={0.8}
                  />
                  {/* Loss bar (red, up from baseline) */}
                  <rect
                    x={x + barW / 2}
                    y={padT + plotH - lossH}
                    width={barW / 2 - 1}
                    height={lossH}
                    fill="#EF4444"
                    rx={2}
                    opacity={0.8}
                  />
                  {/* Month label */}
                  <text
                    x={x + barW / 2}
                    y={chartH - 4}
                    textAnchor="middle"
                    className="text-[7px]"
                    fill="var(--text-muted)"
                  >
                    {m.month.slice(5)}
                  </text>
                </g>
              );
            })}

            {/* Net revenue line */}
            {monthly.length >= 2 && (
              <polyline
                fill="none"
                style={{ stroke: "var(--navy)" }}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={monthly
                  .map((m, i) => {
                    const x =
                      padL +
                      (i / monthly.length) * plotW +
                      plotW / monthly.length / 2;
                    const netH =
                      (Math.max(m.net_revenue, 0) / maxVal) * plotH;
                    return `${x},${padT + plotH - netH}`;
                  })
                  .join(" ")}
              />
            )}
          </svg>
          <div className="flex gap-4 text-[10px] text-text-muted justify-center">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-success" /> Fee Income
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-danger" /> Default Losses
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-navy" /> Net Revenue
            </span>
          </div>
        </section>
      )}

      {/* Monthly Revenue Table */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Monthly Breakdown
        </h2>
        <DataTable
          columns={[
            {
              key: "month",
              header: "Month",
              render: (r: RevenueMonthlyRow) => (
                <span className="text-navy font-medium">{r.month}</span>
              ),
            },
            {
              key: "income",
              header: "Income",
              align: "right" as const,
              render: (r: RevenueMonthlyRow) => (
                <span className="text-success">{fmt(r.fee_income)}</span>
              ),
            },
            {
              key: "losses",
              header: "Losses",
              align: "right" as const,
              render: (r: RevenueMonthlyRow) => (
                <span className="text-danger">
                  {fmt(Math.abs(r.default_losses))}
                </span>
              ),
            },
            {
              key: "net",
              header: "Net",
              align: "right" as const,
              render: (r: RevenueMonthlyRow) => (
                <span className={r.net_revenue >= 0 ? "text-success font-bold" : "text-danger font-bold"}>
                  {fmt(r.net_revenue)}
                </span>
              ),
            },
            {
              key: "trades",
              header: "Trades",
              align: "right" as const,
              render: (r: RevenueMonthlyRow) => r.trade_count,
            },
          ]}
          data={monthly}
          emptyMessage="No revenue data yet."
        />
      </section>
    </div>
  );
}

// ── Tab 7: ML / Quant ────────────────────────────────────────────────────────

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
