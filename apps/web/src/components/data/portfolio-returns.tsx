import type { ReturnsResponse } from "@/lib/quant-api";

interface PortfolioReturnsProps {
  data: ReturnsResponse | null;
}

export function PortfolioReturns({ data }: PortfolioReturnsProps) {
  if (!data) {
    return (
      <section id="returns" className="card-monzo p-5 space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Portfolio Returns
        </h2>
        <p className="text-sm text-text-secondary">Data unavailable — Quant API offline.</p>
      </section>
    );
  }

  const sharpeColor = data.sharpe_ratio >= 1.0 ? "text-success" : data.sharpe_ratio >= 0.5 ? "text-warning" : "text-danger";
  const sharpeLabel = data.sharpe_ratio >= 1.0 ? "Good" : data.sharpe_ratio >= 0.5 ? "Moderate" : "Low";

  // SVG horizontal bar chart
  const W = 320;
  const H = 80;
  const pad = { left: 80, right: 20, top: 10, bottom: 10 };
  const barH = 18;
  const chartW = W - pad.left - pad.right;
  const maxVal = Math.max(data.weighted_yield, data.risk_free_rate, 0.01);

  const portfolioW = (data.weighted_yield / maxVal) * chartW;
  const riskFreeW = (data.risk_free_rate / maxVal) * chartW;

  return (
    <section id="returns" className="card-monzo p-5 space-y-4">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Portfolio Returns
      </h2>

      {/* Hero Sharpe Ratio */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-text-muted">Sharpe Ratio</p>
          <p className={`text-4xl font-extrabold tracking-tight ${sharpeColor}`}>
            {data.sharpe_ratio.toFixed(2)}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          data.sharpe_ratio >= 1.0
            ? "bg-success/15 text-success"
            : data.sharpe_ratio >= 0.5
              ? "bg-warning/15 text-warning"
              : "bg-danger/15 text-danger"
        }`}>
          {sharpeLabel}
        </span>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-warm-grey/30 rounded-xl p-3">
          <p className="text-xs text-text-muted">Weighted Yield</p>
          <p className="text-lg font-bold text-navy mt-0.5">
            {(data.weighted_yield * 100).toFixed(2)}%
          </p>
        </div>
        <div className="bg-warm-grey/30 rounded-xl p-3">
          <p className="text-xs text-text-muted">Risk-Free Rate</p>
          <p className="text-lg font-bold text-navy mt-0.5">
            {(data.risk_free_rate * 100).toFixed(2)}%
          </p>
        </div>
        <div className="bg-warm-grey/30 rounded-xl p-3">
          <p className="text-xs text-text-muted">Excess Return</p>
          <p className={`text-lg font-bold mt-0.5 ${data.excess_return >= 0 ? "text-success" : "text-danger"}`}>
            {data.excess_return >= 0 ? "+" : ""}{(data.excess_return * 100).toFixed(2)}%
          </p>
        </div>
        <div className="bg-warm-grey/30 rounded-xl p-3">
          <p className="text-xs text-text-muted">Total Capital</p>
          <p className="text-lg font-bold text-navy mt-0.5">
            {"\u00A3"}{data.total_capital.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Comparison bar */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Portfolio bar */}
        <text x={pad.left - 6} y={pad.top + barH / 2 + 4} textAnchor="end" fontSize={9} fill="var(--text-secondary)">
          Portfolio
        </text>
        <rect x={pad.left} y={pad.top} width={Math.max(portfolioW, 2)} height={barH} rx={4} fill="var(--coral)" opacity={0.85} />
        <text x={pad.left + portfolioW + 6} y={pad.top + barH / 2 + 4} fontSize={9} fontWeight="bold" fill="var(--coral)">
          {(data.weighted_yield * 100).toFixed(1)}%
        </text>

        {/* Risk-free bar */}
        <text x={pad.left - 6} y={pad.top + barH + 16 + barH / 2 + 4} textAnchor="end" fontSize={9} fill="var(--text-secondary)">
          Risk-Free
        </text>
        <rect x={pad.left} y={pad.top + barH + 16} width={Math.max(riskFreeW, 2)} height={barH} rx={4} fill="var(--text-muted)" opacity={0.5} />
        <text x={pad.left + riskFreeW + 6} y={pad.top + barH + 16 + barH / 2 + 4} fontSize={9} fontWeight="bold" fill="var(--text-muted)">
          {(data.risk_free_rate * 100).toFixed(1)}%
        </text>
      </svg>

      {/* Insight */}
      <div className="bg-warm-grey/30 rounded-xl p-3">
        <p className="text-xs text-text-secondary">
          The portfolio earns{" "}
          <span className="font-bold text-success">
            {(data.excess_return * 100).toFixed(1)}%
          </span>{" "}
          above the risk-free rate, with a risk-adjusted Sharpe ratio of{" "}
          <span className={`font-bold ${sharpeColor}`}>{data.sharpe_ratio.toFixed(2)}</span>.
        </p>
      </div>
    </section>
  );
}
