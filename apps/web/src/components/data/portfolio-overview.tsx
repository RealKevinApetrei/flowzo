import { StatCard } from "./stat-card";
import { DataTable, GradeBadge } from "./data-table";
import type { LendersResponse } from "@/lib/quant-api";

interface PoolData {
  total_pool_size: number;
  total_available: number;
  total_locked: number;
  lender_count: number;
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

interface PortfolioOverviewProps {
  pool: PoolData | null;
  tradeAnalytics: TradeAnalyticsRow[] | null;
  riskDist: RiskDistRow[] | null;
  lenders: LendersResponse | null;
}

const fmt = (v: number) => "\u00A3" + v.toFixed(2);

export function PortfolioOverview({
  pool,
  tradeAnalytics,
  riskDist,
  lenders,
}: PortfolioOverviewProps) {
  const poolSize = Number(pool?.total_pool_size ?? 0);
  const poolAvailable = Number(pool?.total_available ?? 0);
  const poolLocked = Number(pool?.total_locked ?? 0);
  const lenderCount = Number(pool?.lender_count ?? 0);

  const totalTrades = tradeAnalytics?.reduce((s, r) => s + Number(r.trade_count), 0) ?? 0;
  const totalVolume = tradeAnalytics?.reduce((s, r) => s + Number(r.total_volume ?? 0), 0) ?? 0;
  const totalFees = tradeAnalytics?.reduce((s, r) => s + Number(r.total_fees ?? 0), 0) ?? 0;

  const utilization = poolSize > 0 ? poolLocked / poolSize : 0;
  const utilizationPct = Math.round(utilization * 100);

  // Ring SVG
  const size = 72;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - utilization);

  return (
    <section id="overview" className="card-monzo p-5 space-y-5">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Portfolio Overview
      </h2>

      {/* Pool stats + utilization ring */}
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <StatCard label="Pool Size" value={fmt(poolSize)} />
          <StatCard label="Available" value={fmt(poolAvailable)} variant="success" />
          <StatCard label="Locked" value={fmt(poolLocked)} variant="warning" />
          <StatCard label="Lenders" value={String(lenderCount)} />
        </div>
        <div className="relative flex items-center justify-center ml-4 flex-shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--warm-grey)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--warning)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xs font-bold text-navy">{utilizationPct}%</span>
            <span className="text-[8px] text-text-muted">util.</span>
          </div>
        </div>
      </div>

      {/* Trade summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Trades" value={String(totalTrades)} />
        <StatCard label="Volume" value={fmt(totalVolume)} />
        <StatCard label="Fees" value={fmt(totalFees)} />
      </div>

      {/* Risk Distribution badges */}
      {riskDist && riskDist.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">Risk Distribution</p>
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
                <p className="text-xs text-text-muted mt-1">Grade {row.risk_grade}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lender landscape */}
      {lenders && lenders.lenders.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">Top Lenders</p>
          <DataTable
            columns={[
              {
                key: "name",
                header: "Lender",
                render: (r: (typeof lenders.lenders)[0]) => (
                  <span className="text-navy font-medium">{r.display_name}</span>
                ),
              },
              {
                key: "deployed",
                header: "Deployed",
                align: "right",
                render: (r) => fmt(r.total_deployed),
              },
              {
                key: "yield",
                header: "Yield",
                align: "right",
                render: (r) => (
                  <span className="text-success font-medium">{fmt(r.realized_yield)}</span>
                ),
              },
              {
                key: "trades",
                header: "Trades",
                align: "right",
                render: (r) => String(r.trade_count),
              },
            ]}
            data={lenders.lenders.slice(0, 5)}
          />
        </div>
      )}

      {/* Trade analytics table */}
      {tradeAnalytics && tradeAnalytics.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">Trade Analytics by Grade</p>
          <DataTable
            columns={[
              {
                key: "grade",
                header: "Grade",
                render: (r: TradeAnalyticsRow) => <GradeBadge grade={r.risk_grade} />,
              },
              { key: "status", header: "Status", render: (r) => r.status },
              {
                key: "count",
                header: "Count",
                align: "right",
                render: (r) => String(r.trade_count),
              },
              {
                key: "avg",
                header: "Avg Amt",
                align: "right",
                render: (r) => fmt(Number(r.avg_amount)),
              },
              {
                key: "default",
                header: "Default",
                align: "right",
                render: (r) =>
                  r.default_rate != null
                    ? `${(Number(r.default_rate) * 100).toFixed(1)}%`
                    : "\u2014",
              },
            ]}
            data={tradeAnalytics}
          />
        </div>
      )}
    </section>
  );
}
