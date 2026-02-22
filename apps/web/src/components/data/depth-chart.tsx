"use client";

import { useMemo, useState } from "react";

interface DepthBucket {
  aprBucket: number;
  riskGrade: string;
  tradeCount: number;
  totalVolume: number;
}

interface DepthChartProps {
  pendingTrades: {
    amount: number;
    fee: number;
    risk_grade: string;
    shift_days: number;
  }[];
}

const GRADE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  A: { fill: "rgba(16, 185, 129, 0.3)", stroke: "#10B981", label: "Grade A" },
  B: { fill: "rgba(245, 158, 11, 0.3)", stroke: "#F59E0B", label: "Grade B" },
  C: { fill: "rgba(239, 68, 68, 0.3)", stroke: "#EF4444", label: "Grade C" },
};

const BUCKET_WIDTH = 50; // 50% APR buckets

export function DepthChart({ pendingTrades }: DepthChartProps) {
  const [hoveredBucket, setHoveredBucket] = useState<{
    apr: number;
    grade: string;
    x: number;
    y: number;
    count: number;
    volume: number;
    cumVolume: number;
  } | null>(null);

  const { buckets, cumulativeByGrade, maxCumVolume, aprRange, aprStats } = useMemo(() => {
    // Group trades into APR buckets by grade
    const bucketMap = new Map<string, DepthBucket>();

    for (const trade of pendingTrades) {
      if (!trade.amount || !trade.shift_days || trade.shift_days === 0) continue;
      const apr = (trade.fee / trade.amount) * (365 / trade.shift_days) * 100;
      const bucket = Math.floor(apr / BUCKET_WIDTH) * BUCKET_WIDTH;
      const key = `${bucket}-${trade.risk_grade}`;

      const existing = bucketMap.get(key) ?? {
        aprBucket: bucket,
        riskGrade: trade.risk_grade,
        tradeCount: 0,
        totalVolume: 0,
      };
      existing.tradeCount += 1;
      existing.totalVolume += trade.amount;
      bucketMap.set(key, existing);
    }

    const allBuckets = Array.from(bucketMap.values()).sort(
      (a, b) => a.aprBucket - b.aprBucket,
    );

    // Get APR range
    const aprValues = allBuckets.map((b) => b.aprBucket);
    const minApr = Math.min(...aprValues, 0);
    const maxApr = Math.max(...aprValues, 500) + BUCKET_WIDTH;

    // Build cumulative volume per grade (ask side — sorted ascending by APR)
    const grades = ["A", "B", "C"];
    const cumByGrade: Record<string, { apr: number; cumVolume: number; volume: number; count: number }[]> = {};

    for (const grade of grades) {
      const gradeBuckets = allBuckets
        .filter((b) => b.riskGrade === grade)
        .sort((a, b) => a.aprBucket - b.aprBucket);

      let cumVol = 0;
      cumByGrade[grade] = gradeBuckets.map((b) => {
        cumVol += b.totalVolume;
        return {
          apr: b.aprBucket,
          cumVolume: cumVol,
          volume: b.totalVolume,
          count: b.tradeCount,
        };
      });
    }

    // Max cumulative volume across all grades (for Y-axis scaling)
    let maxCum = 0;
    for (const grade of grades) {
      const last = cumByGrade[grade]?.[cumByGrade[grade].length - 1];
      if (last && last.cumVolume > maxCum) maxCum = last.cumVolume;
    }

    // Compute APR statistics from individual trades
    const allAprs: number[] = [];
    for (const trade of pendingTrades) {
      if (!trade.amount || !trade.shift_days || trade.shift_days === 0) continue;
      allAprs.push((trade.fee / trade.amount) * (365 / trade.shift_days) * 100);
    }
    allAprs.sort((a, b) => a - b);

    const aprStats = allAprs.length > 0
      ? {
          median: allAprs[Math.floor(allAprs.length / 2)],
          q1: allAprs[Math.floor(allAprs.length * 0.25)],
          q3: allAprs[Math.floor(allAprs.length * 0.75)],
          mean: allAprs.reduce((s, v) => s + v, 0) / allAprs.length,
        }
      : null;

    return {
      buckets: allBuckets,
      cumulativeByGrade: cumByGrade,
      maxCumVolume: maxCum || 1,
      aprRange: { min: minApr, max: maxApr },
      aprStats,
    };
  }, [pendingTrades]);

  if (pendingTrades.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-text-secondary">
        No pending trades to display.
      </div>
    );
  }

  // SVG dimensions
  const W = 400;
  const H = 180;
  const PAD = { top: 10, right: 20, bottom: 38, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Scales
  const xScale = (apr: number) =>
    PAD.left + ((apr - aprRange.min) / (aprRange.max - aprRange.min)) * plotW;
  const yScale = (vol: number) =>
    PAD.top + plotH - (vol / maxCumVolume) * plotH;

  // Build stepped area paths per grade
  const grades = ["A", "B", "C"];

  function buildSteppedPath(
    points: { apr: number; cumVolume: number }[],
  ): string {
    if (points.length === 0) return "";
    const parts: string[] = [];

    // Start at baseline
    const firstX = xScale(points[0].apr);
    parts.push(`M ${firstX} ${yScale(0)}`);

    for (let i = 0; i < points.length; i++) {
      const x1 = xScale(points[i].apr);
      const x2 = xScale(points[i].apr + BUCKET_WIDTH);
      const y = yScale(points[i].cumVolume);

      // Step up
      parts.push(`L ${x1} ${y}`);
      // Horizontal across bucket
      parts.push(`L ${x2} ${y}`);
    }

    // Close back to baseline
    const lastX = xScale(points[points.length - 1].apr + BUCKET_WIDTH);
    parts.push(`L ${lastX} ${yScale(0)}`);
    parts.push("Z");

    return parts.join(" ");
  }

  // Y-axis tick values
  const yTicks = [0, maxCumVolume * 0.25, maxCumVolume * 0.5, maxCumVolume * 0.75, maxCumVolume];
  const fmtK = (v: number) => (v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v.toFixed(0)}`);

  // X-axis tick values (dynamically spaced, max ~6 labels)
  const xTicks: number[] = [];
  const maxTickCount = 6;
  const aprSpan = aprRange.max - aprRange.min;
  const rawStep = aprSpan / maxTickCount;
  const niceStep = Math.max(BUCKET_WIDTH, Math.ceil(rawStep / BUCKET_WIDTH) * BUCKET_WIDTH);
  for (let apr = aprRange.min; apr <= aprRange.max; apr += niceStep) {
    xTicks.push(apr);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Market Depth
        </h3>
        <div className="flex gap-3">
          {grades.map((g) => (
            <div key={g} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: GRADE_COLORS[g].stroke }}
              />
              <span className="text-[10px] text-text-muted">{GRADE_COLORS[g].label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHoveredBucket(null)}
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={yScale(tick)}
                x2={W - PAD.right}
                y2={yScale(tick)}
                stroke="#E5E7EB"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              <text
                x={PAD.left - 4}
                y={yScale(tick) + 3}
                textAnchor="end"
                className="fill-text-muted"
                fontSize="8"
              >
                {fmtK(tick)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={xScale(tick)}
              y={H - 10}
              textAnchor="end"
              className="fill-text-muted"
              fontSize="8"
              transform={`rotate(-45 ${xScale(tick)} ${H - 10})`}
            >
              {tick}%
            </text>
          ))}

          {/* X-axis label */}
          <text
            x={W / 2}
            y={H}
            textAnchor="middle"
            className="fill-text-muted"
            fontSize="7"
          >
            Implied APR
          </text>

          {/* Q1-Q3 shaded band */}
          {aprStats && (
            <rect
              x={xScale(aprStats.q1)}
              y={PAD.top}
              width={Math.max(0, xScale(aprStats.q3) - xScale(aprStats.q1))}
              height={plotH}
              fill="rgba(27, 27, 58, 0.06)"
              rx="2"
            />
          )}

          {/* Median APR line */}
          {aprStats && (
            <>
              <line
                x1={xScale(aprStats.median)}
                y1={PAD.top}
                x2={xScale(aprStats.median)}
                y2={PAD.top + plotH}
                stroke="#1B1B3A"
                strokeWidth="1"
                strokeDasharray="4,3"
              />
              <text
                x={xScale(aprStats.median) + 3}
                y={PAD.top + 10}
                fontSize="7"
                className="fill-navy"
              >
                Median {aprStats.median.toFixed(0)}%
              </text>
            </>
          )}

          {/* Area fills (render C first so A is on top) */}
          {[...grades].reverse().map((grade) => {
            const points = cumulativeByGrade[grade] ?? [];
            if (points.length === 0) return null;
            return (
              <path
                key={`fill-${grade}`}
                d={buildSteppedPath(points)}
                fill={GRADE_COLORS[grade].fill}
                stroke={GRADE_COLORS[grade].stroke}
                strokeWidth="1.5"
              />
            );
          })}

          {/* Interactive hover zones */}
          {grades.map((grade) =>
            (cumulativeByGrade[grade] ?? []).map((point, i) => {
              const x1 = xScale(point.apr);
              const x2 = xScale(point.apr + BUCKET_WIDTH);
              return (
                <rect
                  key={`hover-${grade}-${i}`}
                  x={x1}
                  y={PAD.top}
                  width={x2 - x1}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={(e) => {
                    const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    setHoveredBucket({
                      apr: point.apr,
                      grade,
                      x: svgRect ? ((x1 + x2) / 2 / W) * svgRect.width : 0,
                      y: svgRect ? (yScale(point.cumVolume) / H) * svgRect.height : 0,
                      count: point.count,
                      volume: point.volume,
                      cumVolume: point.cumVolume,
                    });
                  }}
                />
              );
            }),
          )}
        </svg>

        {/* Tooltip */}
        {hoveredBucket && (
          <div
            className="absolute pointer-events-none bg-navy text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg z-10"
            style={{
              left: `${hoveredBucket.x}px`,
              top: `${hoveredBucket.y - 10}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-bold">
              {hoveredBucket.apr}–{hoveredBucket.apr + BUCKET_WIDTH}% APR
            </div>
            <div>
              Grade {hoveredBucket.grade}: {hoveredBucket.count} trades
            </div>
            <div>Volume: £{hoveredBucket.volume.toFixed(0)}</div>
            <div>Cumulative: £{hoveredBucket.cumVolume.toFixed(0)}</div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 text-center">
        {grades.map((grade) => {
          const data = cumulativeByGrade[grade] ?? [];
          const totalVol = data[data.length - 1]?.cumVolume ?? 0;
          const totalCount = data.reduce((s, d) => s + d.count, 0);
          return (
            <div
              key={grade}
              className="flex-1 rounded-lg py-2"
              style={{ backgroundColor: GRADE_COLORS[grade].fill }}
            >
              <p
                className="text-sm font-bold"
                style={{ color: GRADE_COLORS[grade].stroke }}
              >
                £{totalVol.toFixed(0)}
              </p>
              <p className="text-[10px] text-text-muted">
                {totalCount} Grade {grade}
              </p>
            </div>
          );
        })}
      </div>

      {/* APR statistics */}
      {aprStats && (
        <div className="flex gap-4 text-[10px] text-text-muted justify-center">
          <span>Q1: {aprStats.q1.toFixed(0)}%</span>
          <span>Median: {aprStats.median.toFixed(0)}%</span>
          <span>Q3: {aprStats.q3.toFixed(0)}%</span>
          <span>Mean: {aprStats.mean.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
