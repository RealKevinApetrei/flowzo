"use client";

import { useState, useEffect } from "react";
import { StatCard } from "./stat-card";
import { DataTable, GradeBadge } from "./data-table";

interface BacktestRow {
  grade: string;
  total: number;
  defaulted: number;
  default_rate: number;
  avg_score: number;
}

interface PortfolioReturns {
  expected_annual_yield_pct: number;
  sharpe_ratio: number;
  avg_fee_gbp: number;
  weighted_default_rate: number;
}

interface EdaStats {
  summary: Record<string, { mean: number; std: number; min: number; max: number }>;
  correlations: Record<string, Record<string, number>>;
}

interface ForecastAccuracy {
  mape_pct: number;
  days: string[];
  actual: number[];
  forecasted: number[];
}

type QuantSection = "backtest" | "returns" | "eda" | "forecast" | "stress";

export function QuantDashboard() {
  const [activeSection, setActiveSection] = useState<QuantSection>("backtest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data caches
  const [backtest, setBacktest] = useState<BacktestRow[] | null>(null);
  const [returns, setReturns] = useState<PortfolioReturns | null>(null);
  const [eda, setEda] = useState<EdaStats | null>(null);
  const [forecast, setForecast] = useState<ForecastAccuracy | null>(null);
  const [stressResult, setStressResult] = useState<{
    base_score: number;
    stressed_score: number;
    delta: number;
  } | null>(null);
  const [stressMultiplier, setStressMultiplier] = useState(0.7);

  async function fetchSection(section: QuantSection) {
    setLoading(true);
    setError(null);

    try {
      switch (section) {
        case "backtest": {
          if (backtest) break;
          const res = await fetch("/api/quant/backtest");
          if (!res.ok) throw new Error("Failed to fetch backtest");
          const data = await res.json();
          setBacktest(data.backtest ?? []);
          break;
        }
        case "returns": {
          if (returns) break;
          const res = await fetch("/api/quant/returns");
          if (!res.ok) throw new Error("Failed to fetch returns");
          const data = await res.json();
          setReturns(data);
          break;
        }
        case "eda": {
          if (eda) break;
          const res = await fetch("/api/quant/eda");
          if (!res.ok) throw new Error("Failed to fetch EDA");
          const data = await res.json();
          setEda(data);
          break;
        }
        case "forecast": {
          if (forecast) break;
          const res = await fetch("/api/quant/forecast-accuracy");
          if (!res.ok) throw new Error("Failed to fetch forecast");
          const data = await res.json();
          setForecast(data);
          break;
        }
        case "stress": {
          const res = await fetch("/api/quant/stress-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              features: {
                annual_inflow: 35000,
                avg_monthly_balance: 2500,
                days_since_account_open: 730,
                primary_bank_health_score: 0.75,
                secondary_bank_health_score: 0.6,
                failed_payment_cluster_risk: 1.5,
              },
              income_multiplier: stressMultiplier,
            }),
          });
          if (!res.ok) throw new Error("Failed to run stress test");
          const data = await res.json();
          setStressResult(data);
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSection(activeSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const sections: { id: QuantSection; label: string }[] = [
    { id: "backtest", label: "Backtest" },
    { id: "returns", label: "Portfolio" },
    { id: "eda", label: "EDA" },
    { id: "forecast", label: "Forecast" },
    { id: "stress", label: "Stress Test" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeSection === s.id
                ? "bg-coral text-white"
                : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
          <div className="w-4 h-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
          Loading...
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {activeSection === "backtest" && backtest && (
            <BacktestSection data={backtest} />
          )}
          {activeSection === "returns" && returns && (
            <ReturnsSection data={returns} />
          )}
          {activeSection === "eda" && eda && <EdaSection data={eda} />}
          {activeSection === "forecast" && forecast && (
            <ForecastSection data={forecast} />
          )}
          {activeSection === "stress" && (
            <StressSection
              result={stressResult}
              multiplier={stressMultiplier}
              onMultiplierChange={(m) => {
                setStressMultiplier(m);
                setStressResult(null);
              }}
              onRun={() => fetchSection("stress")}
            />
          )}
        </>
      )}
    </div>
  );
}

function BacktestSection({ data }: { data: BacktestRow[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-navy">
        Historical Default Rates by Grade
      </h3>
      <DataTable
        columns={[
          {
            key: "grade",
            header: "Grade",
            render: (r: BacktestRow) => <GradeBadge grade={r.grade} />,
          },
          {
            key: "total",
            header: "Sample",
            align: "right",
            render: (r: BacktestRow) => (
              <span className="font-medium">{r.total}</span>
            ),
          },
          {
            key: "defaulted",
            header: "Defaults",
            align: "right",
            render: (r: BacktestRow) => r.defaulted,
          },
          {
            key: "rate",
            header: "Default %",
            align: "right",
            render: (r: BacktestRow) => (
              <span
                className={
                  r.default_rate > 10 ? "text-danger font-bold" : "text-navy"
                }
              >
                {(r.default_rate * 100).toFixed(1)}%
              </span>
            ),
          },
          {
            key: "score",
            header: "Avg Score",
            align: "right",
            render: (r: BacktestRow) => r.avg_score?.toFixed(0) ?? "—",
          },
        ]}
        data={data}
      />
    </div>
  );
}

function ReturnsSection({ data }: { data: PortfolioReturns }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-navy">Portfolio Returns</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Expected Yield"
          value={`${data.expected_annual_yield_pct?.toFixed(2) ?? "—"}%`}
          variant="success"
        />
        <StatCard
          label="Sharpe Ratio"
          value={data.sharpe_ratio?.toFixed(2) ?? "—"}
        />
        <StatCard
          label="Avg Fee"
          value={`£${data.avg_fee_gbp?.toFixed(2) ?? "—"}`}
        />
        <StatCard
          label="Wtd Default Rate"
          value={`${((data.weighted_default_rate ?? 0) * 100).toFixed(1)}%`}
          variant={data.weighted_default_rate > 0.1 ? "danger" : "default"}
        />
      </div>
    </div>
  );
}

function EdaSection({ data }: { data: EdaStats }) {
  const features = Object.entries(data.summary ?? {});
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-navy">Feature Distributions</h3>
      <DataTable
        columns={[
          {
            key: "feature",
            header: "Feature",
            render: (r: [string, { mean: number; std: number; min: number; max: number }]) => (
              <span className="text-xs">{r[0].replace(/_/g, " ")}</span>
            ),
          },
          {
            key: "mean",
            header: "Mean",
            align: "right",
            render: (r: [string, { mean: number }]) => r[1].mean?.toFixed(2),
          },
          {
            key: "std",
            header: "Std",
            align: "right",
            render: (r: [string, { std: number }]) => r[1].std?.toFixed(2),
          },
          {
            key: "range",
            header: "Range",
            align: "right",
            render: (r: [string, { min: number; max: number }]) =>
              `${r[1].min?.toFixed(1)} – ${r[1].max?.toFixed(1)}`,
          },
        ]}
        data={features}
      />

      {data.correlations && (
        <>
          <h3 className="text-sm font-bold text-navy mt-4">
            Correlation Matrix
          </h3>
          <CorrelationHeatmap correlations={data.correlations} />
        </>
      )}
    </div>
  );
}

function CorrelationHeatmap({
  correlations,
}: {
  correlations: Record<string, Record<string, number>>;
}) {
  const keys = Object.keys(correlations);
  if (keys.length === 0) return null;

  function getColor(val: number): string {
    if (val > 0.5) return "bg-success/40";
    if (val > 0.2) return "bg-success/20";
    if (val < -0.5) return "bg-danger/40";
    if (val < -0.2) return "bg-danger/20";
    return "bg-warm-grey/30";
  }

  return (
    <div className="overflow-x-auto text-[10px]">
      <table>
        <thead>
          <tr>
            <th />
            {keys.map((k) => (
              <th key={k} className="px-1 py-1 text-text-muted font-normal truncate max-w-[60px]">
                {k.slice(0, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((row) => (
            <tr key={row}>
              <td className="pr-1 text-text-muted font-normal truncate max-w-[60px]">
                {row.slice(0, 8)}
              </td>
              {keys.map((col) => (
                <td
                  key={col}
                  className={`w-8 h-8 text-center rounded ${getColor(correlations[row]?.[col] ?? 0)}`}
                >
                  {(correlations[row]?.[col] ?? 0).toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ForecastSection({ data }: { data: ForecastAccuracy }) {
  if (!data.days?.length || !data.actual?.length || !data.forecasted?.length) {
    return <p className="text-sm text-text-secondary">No forecast data available.</p>;
  }

  const len = data.days.length;
  const maxVal = Math.max(...data.actual, ...data.forecasted, 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-navy">Cash Flow Forecast</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="MAPE"
          value={`${data.mape_pct.toFixed(1)}%`}
          subtitle="Mean Abs % Error"
          variant={data.mape_pct > 15 ? "warning" : "success"}
        />
        <StatCard
          label="Forecast Days"
          value={String(len)}
        />
      </div>
      {len > 1 && (
        <div className="mt-2">
          <svg viewBox="0 0 300 80" className="w-full h-20" preserveAspectRatio="none">
            {/* Actual line */}
            <polyline
              fill="none"
              stroke="#1B1B3A"
              strokeWidth="1.5"
              points={data.actual
                .map(
                  (v, i) =>
                    `${(i / (len - 1)) * 300},${80 - (v / maxVal) * 70 - 5}`,
                )
                .join(" ")}
            />
            {/* Predicted line */}
            <polyline
              fill="none"
              stroke="#FF5A5F"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              points={data.forecasted
                .map(
                  (v, i) =>
                    `${(i / (len - 1)) * 300},${80 - (v / maxVal) * 70 - 5}`,
                )
                .join(" ")}
            />
          </svg>
          <div className="flex gap-4 text-[10px] text-text-muted mt-1">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-navy inline-block" /> Actual
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-coral inline-block border-dashed" />{" "}
              Predicted
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StressSection({
  result,
  multiplier,
  onMultiplierChange,
  onRun,
}: {
  result: { base_score: number; stressed_score: number; delta: number } | null;
  multiplier: number;
  onMultiplierChange: (m: number) => void;
  onRun: () => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-navy">Income Shock Stress Test</h3>
      <p className="text-xs text-text-secondary">
        Simulate the impact of an income reduction on a median borrower&apos;s
        credit score.
      </p>

      <div className="flex items-center gap-3">
        <label className="text-xs text-text-muted whitespace-nowrap">
          Income multiplier
        </label>
        <input
          type="range"
          min="0.1"
          max="1.5"
          step="0.05"
          value={multiplier}
          onChange={(e) => onMultiplierChange(Number(e.target.value))}
          className="flex-1 accent-coral"
        />
        <span className="text-sm font-bold text-navy w-10 text-right">
          {multiplier.toFixed(2)}x
        </span>
      </div>

      <button
        onClick={onRun}
        className="px-4 py-2 rounded-full bg-coral text-white text-xs font-semibold hover:bg-coral/90 transition-colors"
      >
        Run Stress Test
      </button>

      {result && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          <StatCard label="Base Score" value={result.base_score?.toFixed(0) ?? "—"} />
          <StatCard
            label="Stressed Score"
            value={result.stressed_score?.toFixed(0) ?? "—"}
            variant={
              result.stressed_score < 500
                ? "danger"
                : result.stressed_score < 650
                  ? "warning"
                  : "default"
            }
          />
          <StatCard
            label="Delta"
            value={`${result.delta > 0 ? "+" : ""}${result.delta?.toFixed(0) ?? "—"}`}
            variant={result.delta < -50 ? "danger" : "default"}
          />
        </div>
      )}
    </div>
  );
}
