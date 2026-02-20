"use client";

import { useMemo } from "react";
import { formatCurrency } from "@flowzo/shared";

interface ProbabilityCurveProps {
  currentFeePence: number;
  agentFeePence: number;
  amountPence: number;
  riskGrade: string;
}

function calculateProbability(currentFee: number, agentFee: number): number {
  if (agentFee <= 0) return 0;
  if (currentFee >= agentFee) return 0.95;
  const ratio = currentFee / agentFee;
  return Math.min(0.95, Math.max(0.02, ratio * ratio * 0.95));
}

export function ProbabilityCurve({
  currentFeePence,
  agentFeePence,
  amountPence,
  riskGrade,
}: ProbabilityCurveProps) {
  const probability = useMemo(
    () => calculateProbability(currentFeePence, agentFeePence),
    [currentFeePence, agentFeePence],
  );

  const probabilityPercent = Math.round(probability * 100);

  // SVG dimensions
  const width = 320;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate bell curve points
  const maxFee = Math.round(agentFeePence * 1.5);
  const points = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const fee = (i / steps) * maxFee;
      const prob = calculateProbability(fee, agentFeePence);
      const x = padding.left + (i / steps) * chartWidth;
      const y = padding.top + chartHeight - prob * chartHeight;
      pts.push({ x, y });
    }
    return pts;
  }, [agentFeePence, maxFee, chartWidth, chartHeight, padding.left, padding.top]);

  // Build SVG path for the curve
  const curvePath = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  // Build filled area path
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const baseline = padding.top + chartHeight;
    return `${curvePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  }, [curvePath, points, padding.top, chartHeight]);

  // Current fee position on x-axis
  const currentX =
    padding.left + Math.min(currentFeePence / maxFee, 1) * chartWidth;
  const currentY =
    padding.top + chartHeight - probability * chartHeight;

  // Agent fee position on x-axis
  const agentX =
    padding.left + Math.min(agentFeePence / maxFee, 1) * chartWidth;

  // Probability color
  const probColor =
    probabilityPercent >= 70
      ? "text-success"
      : probabilityPercent >= 40
        ? "text-warning"
        : "text-danger";

  return (
    <div className="rounded-2xl bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-navy">Fill Probability</h2>
        <div className={`text-2xl font-extrabold ${probColor}`}>
          {probabilityPercent}%
        </div>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        Chance your bid gets matched by a lender
      </p>

      {/* SVG Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient fill for the area */}
            <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.15} />
            </linearGradient>
            <linearGradient id="curveStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padding.top + chartHeight - (pct / 100) * chartHeight;
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#F0F0F0"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px]"
                  fill="#9CA3AF"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#curveGradient)" />

          {/* Curve line */}
          <path
            d={curvePath}
            fill="none"
            stroke="url(#curveStroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Agent fee dashed line */}
          <line
            x1={agentX}
            y1={padding.top}
            x2={agentX}
            y2={padding.top + chartHeight}
            stroke="#FF5A5F"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
          />
          <text
            x={agentX}
            y={padding.top - 5}
            textAnchor="middle"
            className="text-[8px] font-semibold"
            fill="#FF5A5F"
          >
            Instant fill
          </text>

          {/* Current bid vertical line */}
          <line
            x1={currentX}
            y1={currentY}
            x2={currentX}
            y2={padding.top + chartHeight}
            stroke="#1B1B3A"
            strokeWidth={2}
            opacity={0.8}
          />

          {/* Current bid dot */}
          <circle
            cx={currentX}
            cy={currentY}
            r={5}
            fill="#1B1B3A"
            stroke="white"
            strokeWidth={2}
          />

          {/* X-axis labels */}
          <text
            x={padding.left}
            y={padding.top + chartHeight + 16}
            textAnchor="start"
            className="text-[8px]"
            fill="#9CA3AF"
          >
            {formatCurrency(0)}
          </text>
          <text
            x={padding.left + chartWidth}
            y={padding.top + chartHeight + 16}
            textAnchor="end"
            className="text-[8px]"
            fill="#9CA3AF"
          >
            {formatCurrency(maxFee)}
          </text>

          {/* X-axis line */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#E5E5E5"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-navy rounded-full" />
            <span className="text-text-muted">Your bid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-coral" />
            <span className="text-text-muted">Agent pick</span>
          </div>
        </div>
        <span className="text-text-secondary font-medium">
          Grade {riskGrade}
        </span>
      </div>
    </div>
  );
}
