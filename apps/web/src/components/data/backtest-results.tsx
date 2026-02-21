import type { BacktestResponse } from "@/lib/quant-api";

interface BacktestResultsProps {
  data: BacktestResponse | null;
}

const GRADE_COLORS: Record<string, string> = {
  A: "var(--success)",
  B: "var(--warning)",
  C: "var(--danger)",
};

export function BacktestResults({ data }: BacktestResultsProps) {
  if (!data?.backtest) {
    return (
      <section id="backtest" className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Backtest Results
        </h2>
        <p className="text-sm text-text-secondary">Data unavailable — Quant API offline.</p>
      </section>
    );
  }

  const grades = Object.entries(data.backtest);
  const maxRate = Math.max(...grades.map(([, v]) => v.default_rate), 0.01);
  const gridMax = Math.ceil(maxRate * 100 / 5) * 5; // round up to nearest 5%
  const gridLines = [];
  for (let i = 0; i <= gridMax; i += 5) gridLines.push(i);

  // SVG layout
  const W = 320;
  const H = 200;
  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barWidth = Math.min(50, chartW / (grades.length * 2));
  const gap = (chartW - barWidth * grades.length) / (grades.length + 1);

  return (
    <section id="backtest" className="card-monzo p-5 space-y-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Backtest Results
      </h2>
      <p className="text-xs text-text-secondary">
        Historical default rates by risk grade from model backtesting
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {gridLines.map((pct) => {
          const y = pad.top + chartH - (pct / gridMax) * chartH;
          return (
            <g key={pct}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + chartW}
                y2={y}
                stroke="var(--warm-grey)"
                strokeWidth={1}
              />
              <text
                x={pad.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={8}
                fill="var(--text-muted)"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {grades.map(([grade, stats], i) => {
          const x = pad.left + gap + i * (barWidth + gap);
          const barH = (stats.default_rate * 100 / gridMax) * chartH;
          const y = pad.top + chartH - barH;
          const color = GRADE_COLORS[grade] ?? "var(--coral)";

          return (
            <g key={grade}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill={color}
                opacity={0.85}
              />
              {/* Rate label above bar */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill={color}
              >
                {(stats.default_rate * 100).toFixed(1)}%
              </text>
              {/* Grade label below */}
              <text
                x={x + barWidth / 2}
                y={pad.top + chartH + 14}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill="var(--text-primary)"
              >
                Grade {grade}
              </text>
              {/* Borrower count */}
              <text
                x={x + barWidth / 2}
                y={pad.top + chartH + 26}
                textAnchor="middle"
                fontSize={8}
                fill="var(--text-muted)"
              >
                n={stats.n_borrowers}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={pad.left}
          y1={pad.top + chartH}
          x2={pad.left + chartW}
          y2={pad.top + chartH}
          stroke="var(--cool-grey)"
          strokeWidth={1}
        />
      </svg>

      {/* Insight */}
      <div className="bg-warm-grey/30 rounded-xl p-3">
        <p className="text-xs text-text-secondary">
          {grades.length > 0 && (
            <>
              Grade A borrowers have a{" "}
              <span className="font-bold text-success">
                {(data.backtest.A?.default_rate * 100).toFixed(1) ?? "—"}%
              </span>{" "}
              default rate, while Grade C reaches{" "}
              <span className="font-bold text-danger">
                {(data.backtest.C?.default_rate * 100).toFixed(1) ?? "—"}%
              </span>
              . The model&apos;s grading system effectively separates risk tiers.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
