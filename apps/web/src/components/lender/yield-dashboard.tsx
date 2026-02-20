"use client";

import { Card, CardContent } from "@/components/ui/card";

interface YieldDashboardProps {
  stats: {
    totalYieldPence: number;
    avgTermDays: number;
    avgAprBps: number;
    tradeCount: number;
    activeTrades: number;
  };
}

const formatPounds = (pence: number) => "\u00A3" + (pence / 100).toFixed(2);

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function YieldDashboard({ stats }: YieldDashboardProps) {
  const sparklinePoints = generateSparkline();

  return (
    <section>
      <h2 className="text-lg font-bold text-navy mb-3">Performance</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Total yield */}
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-extrabold text-success tracking-tight">
              {formatPounds(stats.totalYieldPence)}
            </p>
            <p className="text-xs text-text-secondary mt-1">Total yield</p>
            {/* Mini sparkline */}
            <svg
              viewBox="0 0 100 30"
              className="w-full h-6 mt-2"
              preserveAspectRatio="none"
            >
              <path
                d={sparklinePoints}
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
            <p className="text-xs text-text-secondary mt-1">Avg. APR</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/**
 * Generate a simple decorative sparkline path.
 * In production this would use real yield-over-time data.
 */
function generateSparkline(): string {
  const points = [5, 8, 6, 12, 10, 18, 15, 22, 19, 25];
  const width = 100;
  const height = 30;
  const maxVal = Math.max(...points);
  const step = width / (points.length - 1);

  return points
    .map((val, i) => {
      const x = i * step;
      const y = height - (val / maxVal) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
