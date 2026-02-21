"use client";

import { useState } from "react";
import type { EdaResponse } from "@/lib/quant-api";

interface EdaSummaryProps {
  data: EdaResponse | null;
}

const FEATURE_NAMES: Record<string, string> = {
  annual_inflow: "Annual Inflow",
  avg_monthly_balance: "Avg Monthly Balance",
  days_since_open: "Days Since Account Open",
  primary_bank_health: "Primary Bank Health",
  secondary_bank_health: "Secondary Bank Health",
  failed_payment_cluster: "Failed Payment Cluster",
  credit_score: "Credit Score",
  default_rate: "Default Rate",
  total_income: "Total Income",
  total_expense: "Total Expenses",
  savings_ratio: "Savings Ratio",
  transaction_count: "Transaction Count",
};

function humanName(key: string): string {
  return FEATURE_NAMES[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Color interpolation for correlation: -1 = red, 0 = white, +1 = green
function corrColor(val: number): string {
  if (val >= 0) {
    const g = Math.round(180 + (1 - val) * 75);
    const rb = Math.round(255 - val * 130);
    return `rgb(${rb}, ${g}, ${rb})`;
  } else {
    const r = Math.round(180 + (1 + val) * 75);
    const gb = Math.round(255 + val * 130);
    return `rgb(${r}, ${gb}, ${gb})`;
  }
}

export function EdaSummary({ data }: EdaSummaryProps) {
  const [view, setView] = useState<"stats" | "correlation">("stats");

  if (!data) {
    return (
      <section id="eda" className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Exploratory Data Analysis
        </h2>
        <p className="text-sm text-text-secondary">Data unavailable — Quant API offline.</p>
      </section>
    );
  }

  const features = Object.entries(data.summary);
  const corrKeys = Object.keys(data.correlation);
  const corrSize = corrKeys.length;

  // Heatmap SVG
  const cellSize = corrSize > 0 ? Math.min(30, 240 / corrSize) : 20;
  const labelSpace = 70;
  const hmW = labelSpace + corrSize * cellSize + 10;
  const hmH = labelSpace + corrSize * cellSize + 10;

  return (
    <section id="eda" className="card-monzo p-5 space-y-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Exploratory Data Analysis
      </h2>

      {/* Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setView("stats")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            view === "stats" ? "bg-coral text-white" : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
          }`}
        >
          Feature Stats
        </button>
        <button
          onClick={() => setView("correlation")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            view === "correlation" ? "bg-coral text-white" : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
          }`}
        >
          Correlations
        </button>
      </div>

      {view === "stats" ? (
        <div className="grid grid-cols-2 gap-3">
          {features.map(([key, stats]) => (
            <div key={key} className="bg-warm-grey/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-navy truncate">{humanName(key)}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-text-muted">Mean</span>
                  <span className="text-navy font-medium">{stats.mean.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-text-muted">Median</span>
                  <span className="text-navy font-medium">{stats.median.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-text-muted">Std Dev</span>
                  <span className="text-navy font-medium">{stats.std.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {corrSize > 0 ? (
            <svg viewBox={`0 0 ${hmW} ${hmH}`} className="w-full h-auto min-w-[300px]" preserveAspectRatio="xMidYMid meet">
              {/* Column labels */}
              {corrKeys.map((key, i) => (
                <text
                  key={`col-${key}`}
                  x={labelSpace + i * cellSize + cellSize / 2}
                  y={labelSpace - 4}
                  textAnchor="end"
                  fontSize={7}
                  fill="var(--text-muted)"
                  transform={`rotate(-45, ${labelSpace + i * cellSize + cellSize / 2}, ${labelSpace - 4})`}
                >
                  {humanName(key).slice(0, 12)}
                </text>
              ))}

              {/* Row labels + cells */}
              {corrKeys.map((rowKey, ri) => (
                <g key={rowKey}>
                  <text
                    x={labelSpace - 4}
                    y={labelSpace + ri * cellSize + cellSize / 2 + 3}
                    textAnchor="end"
                    fontSize={7}
                    fill="var(--text-muted)"
                  >
                    {humanName(rowKey).slice(0, 12)}
                  </text>
                  {corrKeys.map((colKey, ci) => {
                    const val = data.correlation[rowKey]?.[colKey] ?? 0;
                    return (
                      <g key={colKey}>
                        <rect
                          x={labelSpace + ci * cellSize}
                          y={labelSpace + ri * cellSize}
                          width={cellSize - 1}
                          height={cellSize - 1}
                          rx={2}
                          fill={corrColor(val)}
                        />
                        {cellSize >= 20 && (
                          <text
                            x={labelSpace + ci * cellSize + (cellSize - 1) / 2}
                            y={labelSpace + ri * cellSize + (cellSize - 1) / 2 + 3}
                            textAnchor="middle"
                            fontSize={6}
                            fill={Math.abs(val) > 0.5 ? "white" : "var(--text-secondary)"}
                          >
                            {val.toFixed(1)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
          ) : (
            <p className="text-sm text-text-secondary">No correlation data available.</p>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-text-muted">
            <span className="w-3 h-3 rounded" style={{ background: corrColor(-1) }} />
            <span>-1</span>
            <span className="w-3 h-3 rounded" style={{ background: corrColor(0) }} />
            <span>0</span>
            <span className="w-3 h-3 rounded" style={{ background: corrColor(1) }} />
            <span>+1</span>
          </div>
        </div>
      )}
    </section>
  );
}
