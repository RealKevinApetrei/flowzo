"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@flowzo/shared";

interface YieldDashboardProps {
  stats: {
    totalYieldPence: number;
    avgTermDays: number;
    avgAprBps: number;
    tradeCount: number;
    activeTrades: number;
  };
  potAvailablePence?: number;
  potLockedPence?: number;
  sparklineData: number[];
  usingMarketAvg?: boolean;
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

function buildSparklinePath(data: number[]): string {
  if (data.length < 2) return "";
  const width = 100;
  const height = 30;
  const maxVal = Math.max(...data);
  if (maxVal === 0) return "";
  const step = width / (data.length - 1);

  return data
    .map((val, i) => {
      const x = i * step;
      const y = height - (val / maxVal) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function YieldDashboard({
  stats,
  potAvailablePence,
  potLockedPence,
  sparklineData,
  usingMarketAvg,
}: YieldDashboardProps) {
  const sparklinePath =
    sparklineData.length >= 2
      ? buildSparklinePath(sparklineData)
      : buildSparklinePath([5, 8, 6, 12, 10, 18, 15, 22, 19, 25]); // decorative fallback

  // Projected earnings
  const totalPotPence = (potAvailablePence ?? 0) + (potLockedPence ?? 0);
  const aprDecimal = stats.avgAprBps / 10000;
  const monthlyYieldPence = Math.round((totalPotPence * aprDecimal) / 12);
  const annualYieldPence = Math.round(totalPotPence * aprDecimal);

  return (
    <section>
      <h2 className="text-lg font-bold text-navy mb-3">Performance</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Total yield */}
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-extrabold text-success tracking-tight">
              {formatCurrency(stats.totalYieldPence)}
            </p>
            <p className="text-xs text-text-secondary mt-1">Total yield</p>
            {/* Mini sparkline */}
            <svg
              viewBox="0 0 100 30"
              className="w-full h-6 mt-2"
              preserveAspectRatio="none"
            >
              <path
                d={sparklinePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-60"
              />
            </svg>
          </CardContent>
        </Card>

        {/* Active trades */}
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-extrabold text-coral tracking-tight">
              {stats.activeTrades}
            </p>
            <p className="text-xs text-text-secondary mt-1">Active trades</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted">of</span>
              <span className="text-xs font-semibold text-navy">
                {stats.tradeCount}
              </span>
              <span className="text-xs text-muted">total</span>
            </div>
          </CardContent>
        </Card>

        {/* Average term */}
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-extrabold text-navy tracking-tight">
              {stats.avgTermDays}
              <span className="text-sm font-semibold text-text-secondary ml-1">
                days
              </span>
            </p>
            <p className="text-xs text-text-secondary mt-1">Avg. term</p>
          </CardContent>
        </Card>

        {/* Average APR */}
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-extrabold text-navy tracking-tight">
              {bpsToPercent(stats.avgAprBps)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {usingMarketAvg ? "Avg. APR (Market)" : "Avg. APR"}
            </p>
            {usingMarketAvg && (
              <p className="text-[10px] text-coral mt-0.5">Based on platform trades</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projected Earnings */}
      {totalPotPence > 0 && stats.avgAprBps > 0 && (
        <Card className="mt-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-success"
              >
                <path
                  fillRule="evenodd"
                  d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.06l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042.815a.75.75 0 01-.53-.919z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-sm font-bold text-navy">
                Projected Earnings
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl font-extrabold text-success tracking-tight">
                  {formatCurrency(monthlyYieldPence)}
                </p>
                <p className="text-xs text-text-secondary">Est. monthly</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-navy tracking-tight">
                  {formatCurrency(annualYieldPence)}
                </p>
                <p className="text-xs text-text-secondary">Est. annual</p>
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </section>
  );
}
