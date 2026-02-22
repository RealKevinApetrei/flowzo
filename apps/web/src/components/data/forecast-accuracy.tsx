import type { ForecastAccuracyResponse } from "@/lib/quant-api";

interface ForecastAccuracyProps {
  data: ForecastAccuracyResponse | null;
}

export function ForecastAccuracy({ data }: ForecastAccuracyProps) {
  if (!data) {
    return (
      <section id="forecast" className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Forecast Accuracy
        </h2>
        <p className="text-sm text-text-secondary">Data unavailable — Quant API offline.</p>
      </section>
    );
  }

  const mape = data.mape_pct;
  const quality = mape < 5 ? "Excellent" : mape < 10 ? "Good" : "Needs Improvement";
  const qualityColor = mape < 5 ? "text-success" : mape < 10 ? "text-warning" : "text-danger";
  const qualityBg = mape < 5 ? "bg-success/15" : mape < 10 ? "bg-warning/15" : "bg-danger/15";

  // SVG dual-line chart
  const W = 320;
  const H = 180;
  const pad = { top: 15, right: 15, bottom: 30, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const allVals = [...data.actual, ...data.forecasted];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;
  const n = data.days.length;

  function toX(i: number) {
    return pad.left + (i / Math.max(n - 1, 1)) * chartW;
  }

  function toY(v: number) {
    return pad.top + chartH - ((v - minVal) / range) * chartH;
  }

  function buildPath(values: number[]) {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .join(" ");
  }

  // Shaded area between actual and forecast
  function buildShadedArea() {
    if (n === 0 || !data) return "";
    const forward = data.actual
      .map((v, i) => `${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .join(" L ");
    const backward = [...data.forecasted]
      .map((v, i) => `${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .reverse()
      .join(" L ");
    return `M ${forward} L ${backward} Z`;
  }

  const actualPath = buildPath(data.actual);
  const forecastPath = buildPath(data.forecasted);
  const shadedPath = buildShadedArea();

  // Y-axis ticks
  const yTicks = 5;
  const yStep = range / yTicks;

  // X-axis labels (show ~5 evenly spaced)
  const xLabelCount = Math.min(5, n);
  const xIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / Math.max(xLabelCount - 1, 1)) * (n - 1)),
  );

  return (
    <section id="forecast" className="card-monzo p-5 space-y-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Forecast Accuracy
      </h2>

      {/* MAPE stat */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-text-muted">MAPE</p>
          <p className={`text-3xl font-extrabold tracking-tight ${qualityColor}`}>
            {mape.toFixed(1)}%
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${qualityBg} ${qualityColor}`}>
          {quality}
        </span>
      </div>

      {/* Dual-line chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis grid */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = minVal + i * yStep;
          const y = toY(val);
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="var(--warm-grey)" strokeWidth={1} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize={8} fill="var(--text-muted)">
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Shaded area */}
        <path d={shadedPath} fill="var(--coral)" opacity={0.08} />

        {/* Actual line (navy solid) */}
        <path d={actualPath} fill="none" stroke="var(--navy)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Forecast line (coral dashed) */}
        <path d={forecastPath} fill="none" stroke="var(--coral)" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />

        {/* X-axis labels */}
        {xIndices.map((idx) => (
          <text
            key={idx}
            x={toX(idx)}
            y={pad.top + chartH + 16}
            textAnchor="middle"
            fontSize={7}
            fill="var(--text-muted)"
          >
            Day {data.days[idx] ?? ""}
          </text>
        ))}

        {/* X-axis */}
        <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH} stroke="var(--cool-grey)" strokeWidth={1} />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-navy rounded-full" />
          <span className="text-text-muted">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b-2 border-dashed border-coral" />
          <span className="text-text-muted">Forecast</span>
        </div>
      </div>
    </section>
  );
}
