"use client";

import { useMemo, useState } from "react";

interface SupplyOrder {
  risk_grade: string;
  apr_bucket: number;
  lender_count: number;
  available_volume: number;
  avg_apr: number;
  best_apr: number;
  max_term_days: number;
}

interface DepthChartProps {
  pendingTrades: {
    amount: number;
    fee: number;
    risk_grade: string;
    shift_days: number;
  }[];
  supplyOrders?: SupplyOrder[];
}

const GRADE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  A: { fill: "rgba(16, 185, 129, 0.35)", stroke: "#10B981", label: "Grade A" },
  B: { fill: "rgba(245, 158, 11, 0.35)", stroke: "#F59E0B", label: "Grade B" },
  C: { fill: "rgba(239, 68, 68, 0.35)", stroke: "#EF4444", label: "Grade C" },
};

const BID_COLOR = { fill: "rgba(59, 130, 246, 0.2)", stroke: "#3B82F6" };

const BUCKET_WIDTH = 2; // 2% APR buckets for high-resolution depth

export function DepthChart({ pendingTrades, supplyOrders = [] }: DepthChartProps) {
  const [hoveredBucket, setHoveredBucket] = useState<{
    apr: number;
    side: "bid" | "ask";
    x: number;
    y: number;
    breakdown: { grade: string; volume: number; count: number }[];
    cumVolume: number;
  } | null>(null);

  const { stackedAsk, bidCumulative, maxCumVolume, aprBounds, crossingApr } = useMemo(() => {
    const grades = ["A", "B", "C"];

    // === ASK SIDE: stacked aggregate by APR bucket ===
    const askBuckets = new Map<number, Record<string, { volume: number; count: number }>>();

    for (const trade of pendingTrades) {
      if (!trade.amount || !trade.shift_days || trade.shift_days === 0 || trade.fee == null) continue;
      const apr = (trade.fee / trade.amount) * (365 / trade.shift_days) * 100;
      if (!isFinite(apr) || apr <= 0) continue;
      const bucket = Math.floor(apr / BUCKET_WIDTH) * BUCKET_WIDTH;

      if (!askBuckets.has(bucket)) {
        askBuckets.set(bucket, { A: { volume: 0, count: 0 }, B: { volume: 0, count: 0 }, C: { volume: 0, count: 0 } });
      }
      const gradeData = askBuckets.get(bucket)![trade.risk_grade];
      if (gradeData) {
        gradeData.volume += trade.amount;
        gradeData.count += 1;
      }
    }

    // Sort buckets ascending by APR and build cumulative stacked data
    const sortedBuckets = Array.from(askBuckets.entries()).sort(([a], [b]) => a - b);

    const cumVolByGrade: Record<string, number> = { A: 0, B: 0, C: 0 };
    const stackedAskData: {
      apr: number;
      cumByGrade: Record<string, number>;
      totalCum: number;
      breakdown: { grade: string; volume: number; count: number }[];
    }[] = [];

    for (const [apr, gradeMap] of sortedBuckets) {
      const breakdown: { grade: string; volume: number; count: number }[] = [];
      for (const g of grades) {
        cumVolByGrade[g] += gradeMap[g]?.volume ?? 0;
        if (gradeMap[g]?.count) {
          breakdown.push({ grade: g, volume: gradeMap[g].volume, count: gradeMap[g].count });
        }
      }
      stackedAskData.push({
        apr,
        cumByGrade: { ...cumVolByGrade },
        totalCum: grades.reduce((s, g) => s + cumVolByGrade[g], 0),
        breakdown,
      });
    }

    // === BID SIDE: aggregate supply across grades per APR bucket ===
    const bidBucketMap = new Map<number, { volume: number; count: number }>();
    for (const order of supplyOrders) {
      const bucket = Math.floor(order.apr_bucket / BUCKET_WIDTH) * BUCKET_WIDTH;
      const existing = bidBucketMap.get(bucket);
      if (existing) {
        existing.volume += order.available_volume;
        existing.count += order.lender_count;
      } else {
        bidBucketMap.set(bucket, { volume: order.available_volume, count: order.lender_count });
      }
    }

    // Build cumulative bid (descending — at high APR, all lenders participate)
    const bidBuckets = Array.from(bidBucketMap.entries())
      .sort(([a], [b]) => b - a);
    let bidCum = 0;
    const bidCumulativeDesc = bidBuckets.map(([apr, data]) => {
      bidCum += data.volume;
      return { apr, cumVolume: bidCum, volume: data.volume, count: data.count };
    });
    const bidCumAsc = [...bidCumulativeDesc].reverse();

    // === Auto-zoom: compute actual data range ===
    const askAprs = stackedAskData.map((d) => d.apr);
    const bidAprs = bidCumAsc.map((d) => d.apr);
    const allAprs = [...askAprs, ...bidAprs];

    const dataMinApr = allAprs.length > 0 ? Math.min(...allAprs) : 0;
    const dataMaxApr = allAprs.length > 0 ? Math.max(...allAprs) + BUCKET_WIDTH : 30;
    const aprPadding = Math.max((dataMaxApr - dataMinApr) * 0.1, BUCKET_WIDTH);
    const minApr = Math.max(0, dataMinApr - aprPadding);
    const maxApr = dataMaxApr + aprPadding;

    // Max cumulative volume
    const askMaxCum = stackedAskData.length > 0 ? stackedAskData[stackedAskData.length - 1].totalCum : 0;
    const bidMaxCum = bidCumAsc.length > 0 ? bidCumAsc[0]?.cumVolume ?? 0 : 0;
    const maxCum = Math.max(askMaxCum, bidMaxCum, 1);

    // Find crossing point
    let crossing: number | null = null;
    if (bidCumAsc.length > 0 && stackedAskData.length > 0) {
      for (const askPoint of stackedAskData) {
        const bidPoint = bidCumAsc.find((b) => b.apr <= askPoint.apr + BUCKET_WIDTH);
        if (bidPoint && bidPoint.cumVolume >= askPoint.totalCum) {
          crossing = askPoint.apr;
          break;
        }
      }
    }

    return {
      stackedAsk: stackedAskData,
      bidCumulative: bidCumAsc,
      maxCumVolume: maxCum,
      aprBounds: { min: minApr, max: maxApr },
      crossingApr: crossing,
    };
  }, [pendingTrades, supplyOrders]);

  if (pendingTrades.length === 0 && supplyOrders.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-text-secondary">
        No order book data to display.
      </div>
    );
  }

  // SVG dimensions
  const W = 400;
  const H = 200;
  const PAD = { top: 10, right: 20, bottom: 38, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xScale = (apr: number) =>
    PAD.left + ((apr - aprBounds.min) / (aprBounds.max - aprBounds.min)) * plotW;
  const yScale = (vol: number) =>
    PAD.top + plotH - (vol / maxCumVolume) * plotH;

  const grades = ["A", "B", "C"];

  // Build stacked area paths (bottom to top: A, then B on top of A, then C on top of B)
  function buildStackedPath(gradeIndex: number): string {
    if (stackedAsk.length === 0) return "";
    const gradesUpTo = grades.slice(0, gradeIndex + 1);

    const parts: string[] = [];
    const firstX = xScale(stackedAsk[0].apr);
    parts.push(`M ${firstX} ${yScale(0)}`);

    // Top edge
    for (let i = 0; i < stackedAsk.length; i++) {
      const x1 = xScale(stackedAsk[i].apr);
      const x2 = xScale(stackedAsk[i].apr + BUCKET_WIDTH);
      const cumTop = gradesUpTo.reduce((s, g) => s + (stackedAsk[i].cumByGrade[g] ?? 0), 0);
      const y = yScale(cumTop);
      parts.push(`L ${x1} ${y}`);
      parts.push(`L ${x2} ${y}`);
    }

    // Bottom edge
    if (gradeIndex === 0) {
      const lastX = xScale(stackedAsk[stackedAsk.length - 1].apr + BUCKET_WIDTH);
      parts.push(`L ${lastX} ${yScale(0)}`);
    } else {
      const gradesBelow = grades.slice(0, gradeIndex);
      for (let i = stackedAsk.length - 1; i >= 0; i--) {
        const x2 = xScale(stackedAsk[i].apr + BUCKET_WIDTH);
        const x1 = xScale(stackedAsk[i].apr);
        const cumBottom = gradesBelow.reduce((s, g) => s + (stackedAsk[i].cumByGrade[g] ?? 0), 0);
        const y = yScale(cumBottom);
        parts.push(`L ${x2} ${y}`);
        parts.push(`L ${x1} ${y}`);
      }
    }

    parts.push("Z");
    return parts.join(" ");
  }

  // Bid side stepped path
  function buildBidPath(): string {
    if (bidCumulative.length === 0) return "";
    const parts: string[] = [];
    const firstX = xScale(bidCumulative[0].apr);
    parts.push(`M ${firstX} ${yScale(0)}`);

    for (let i = 0; i < bidCumulative.length; i++) {
      const x1 = xScale(bidCumulative[i].apr);
      const x2 = xScale(bidCumulative[i].apr + BUCKET_WIDTH);
      const y = yScale(bidCumulative[i].cumVolume);
      parts.push(`L ${x1} ${y}`);
      parts.push(`L ${x2} ${y}`);
    }

    const lastX = xScale(bidCumulative[bidCumulative.length - 1].apr + BUCKET_WIDTH);
    parts.push(`L ${lastX} ${yScale(0)}`);
    parts.push("Z");
    return parts.join(" ");
  }

  // Y-axis tick values
  const yTicks = [0, maxCumVolume * 0.25, maxCumVolume * 0.5, maxCumVolume * 0.75, maxCumVolume];
  const fmtK = (v: number) => (v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v.toFixed(0)}`);

  // X-axis tick values
  const xTicks: number[] = [];
  const aprSpan = aprBounds.max - aprBounds.min;
  const rawStep = aprSpan / 6;
  const niceStep = Math.max(BUCKET_WIDTH, Math.ceil(rawStep / BUCKET_WIDTH) * BUCKET_WIDTH);
  for (let apr = Math.ceil(aprBounds.min / niceStep) * niceStep; apr <= aprBounds.max; apr += niceStep) {
    xTicks.push(apr);
  }

  const hasBidData = bidCumulative.length > 0;

  // Compute per-grade totals for summary
  const gradeTotals = grades.map((g) => {
    let volume = 0;
    let count = 0;
    for (const bucket of stackedAsk) {
      for (const bd of bucket.breakdown) {
        if (bd.grade === g) {
          volume += bd.volume;
          count += bd.count;
        }
      }
    }
    return { grade: g, volume, count };
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Market Depth {hasBidData ? "(Bid / Ask)" : ""}
        </h3>
        <div className="flex gap-3">
          {hasBidData && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BID_COLOR.stroke }} />
              <span className="text-[10px] text-text-muted">Supply</span>
            </div>
          )}
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
                style={{ stroke: "var(--warm-grey)" }}
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

          {/* Bid side fill */}
          {hasBidData && (
            <path
              d={buildBidPath()}
              fill={BID_COLOR.fill}
              stroke={BID_COLOR.stroke}
              strokeWidth="1.5"
            />
          )}

          {/* Stacked ask area — render C first (back), then B, then A (front) */}
          {[...grades].reverse().map((_, revIdx) => {
            const gradeIdx = grades.length - 1 - revIdx;
            const grade = grades[gradeIdx];
            const path = buildStackedPath(gradeIdx);
            if (!path) return null;
            return (
              <path
                key={`stack-${grade}`}
                d={path}
                fill={GRADE_COLORS[grade].fill}
                stroke={GRADE_COLORS[grade].stroke}
                strokeWidth="1"
              />
            );
          })}

          {/* Crossing point */}
          {crossingApr != null && (
            <>
              <line
                x1={xScale(crossingApr + BUCKET_WIDTH / 2)}
                y1={PAD.top}
                x2={xScale(crossingApr + BUCKET_WIDTH / 2)}
                y2={PAD.top + plotH}
                stroke="#8B5CF6"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
              <text
                x={xScale(crossingApr + BUCKET_WIDTH / 2) + 3}
                y={PAD.top + 10}
                fontSize="7"
                fill="#8B5CF6"
                fontWeight="bold"
              >
                Clear {crossingApr}%
              </text>
            </>
          )}

          {/* Interactive hover zones — ask side */}
          {stackedAsk.map((point, i) => {
            const x1 = xScale(point.apr);
            const x2 = xScale(point.apr + BUCKET_WIDTH);
            return (
              <rect
                key={`hover-ask-${i}`}
                x={x1}
                y={PAD.top}
                width={Math.max(x2 - x1, 1)}
                height={plotH}
                fill="transparent"
                onMouseEnter={(e) => {
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  setHoveredBucket({
                    apr: point.apr,
                    side: "ask",
                    x: svgRect ? ((x1 + x2) / 2 / W) * svgRect.width : 0,
                    y: svgRect ? (yScale(point.totalCum) / H) * svgRect.height : 0,
                    breakdown: point.breakdown,
                    cumVolume: point.totalCum,
                  });
                }}
              />
            );
          })}

          {/* Interactive hover zones — bid side */}
          {bidCumulative.map((point, i) => {
            const x1 = xScale(point.apr);
            const x2 = xScale(point.apr + BUCKET_WIDTH);
            return (
              <rect
                key={`hover-bid-${i}`}
                x={x1}
                y={PAD.top}
                width={Math.max(x2 - x1, 1)}
                height={plotH}
                fill="transparent"
                onMouseEnter={(e) => {
                  const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  setHoveredBucket({
                    apr: point.apr,
                    side: "bid",
                    x: svgRect ? ((x1 + x2) / 2 / W) * svgRect.width : 0,
                    y: svgRect ? (yScale(point.cumVolume) / H) * svgRect.height : 0,
                    breakdown: [{ grade: "ALL", volume: point.volume, count: point.count }],
                    cumVolume: point.cumVolume,
                  });
                }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredBucket && (
          <div
            className="absolute pointer-events-none bg-navy-bg text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg z-10"
            style={{
              left: `${hoveredBucket.x}px`,
              top: `${hoveredBucket.y - 10}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-bold">
              {hoveredBucket.apr}–{hoveredBucket.apr + BUCKET_WIDTH}% APR
            </div>
            {hoveredBucket.side === "bid" ? (
              <div>Supply: {hoveredBucket.breakdown[0]?.count ?? 0} lenders</div>
            ) : (
              hoveredBucket.breakdown.map((bd) => (
                <div key={bd.grade}>
                  Grade {bd.grade}: {bd.count} trades (£{bd.volume.toFixed(0)})
                </div>
              ))
            )}
            <div>Cumulative: £{hoveredBucket.cumVolume.toFixed(0)}</div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 text-center">
        {hasBidData && (
          <div
            className="flex-1 rounded-lg py-2"
            style={{ backgroundColor: BID_COLOR.fill }}
          >
            <p className="text-sm font-bold" style={{ color: BID_COLOR.stroke }}>
              £{(bidCumulative[0]?.cumVolume ?? 0).toFixed(0)}
            </p>
            <p className="text-[10px] text-text-muted">
              {bidCumulative.reduce((s, b) => s + b.count, 0)} Supply
            </p>
          </div>
        )}
        {gradeTotals.map(({ grade, volume, count }) => (
          <div
            key={grade}
            className="flex-1 rounded-lg py-2"
            style={{ backgroundColor: GRADE_COLORS[grade].fill }}
          >
            <p
              className="text-sm font-bold"
              style={{ color: GRADE_COLORS[grade].stroke }}
            >
              £{volume.toFixed(0)}
            </p>
            <p className="text-[10px] text-text-muted">
              {count} Grade {grade}
            </p>
          </div>
        ))}
      </div>

      {/* Crossing point callout */}
      {crossingApr != null && (
        <div className="text-center text-[10px] text-purple-500 font-bold">
          Market Clearing Rate: {crossingApr}% APR
        </div>
      )}
    </div>
  );
}
