"use client";

import { useState } from "react";

interface ScoreResult {
  credit_score: number;
  risk_grade: string;
  probability_of_default: number;
}

interface ShapFeature {
  feature: string;
  value: number;
}

interface ExplainResult {
  base_value: number;
  positive: { feature: string; shap_value: number }[];
  negative: { feature: string; shap_value: number }[];
}

const FEATURE_NAMES: Record<string, string> = {
  annual_inflow: "Annual Inflow",
  avg_monthly_balance: "Avg Monthly Balance",
  days_since_account_open: "Days Since Open",
  primary_bank_health_score: "Primary Bank Health",
  secondary_bank_health_score: "Secondary Bank Health",
  failed_payment_cluster_risk: "Failed Payment Risk",
};

function humanName(key: string): string {
  return FEATURE_NAMES[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEFAULTS = {
  annual_inflow: 35000,
  avg_monthly_balance: 2500,
  days_since_account_open: 365,
  primary_bank_health_score: 0.75,
  secondary_bank_health_score: 0.6,
  failed_payment_cluster_risk: 1,
};

export function RiskScoreExplorer() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [explain, setExplain] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: keyof typeof DEFAULTS, val: number) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleScore() {
    setLoading(true);
    setError(null);
    setScore(null);
    setExplain(null);

    try {
      // Backend expects flat fields, not wrapped in "features"
      const body = JSON.stringify(form);
      const [scoreRes, explainRes] = await Promise.all([
        fetch("/api/quant/score", { method: "POST", headers: { "Content-Type": "application/json" }, body }),
        fetch("/api/quant/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body }),
      ]);

      if (scoreRes.ok) {
        const data = await scoreRes.json();
        setScore({
          credit_score: data.credit_score,
          risk_grade: data.risk_grade,
          probability_of_default: data.probability_of_default,
        });
      }
      if (explainRes.ok) {
        const data = await explainRes.json();
        setExplain(data);
      }
      if (!scoreRes.ok && !explainRes.ok) {
        setError("Could not reach scoring API.");
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  const gradeColor = (g: string) =>
    g === "A" ? "text-success" : g === "B" ? "text-warning" : "text-danger";
  const gradeBg = (g: string) =>
    g === "A" ? "bg-success/15" : g === "B" ? "bg-warning/15" : "bg-danger/15";

  // SHAP waterfall — combine positive and negative into unified list
  const shapValues: ShapFeature[] = [
    ...(explain?.positive ?? []).map((s) => ({ feature: s.feature, value: s.shap_value })),
    ...(explain?.negative ?? []).map((s) => ({ feature: s.feature, value: s.shap_value })),
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const maxAbsShap = Math.max(...shapValues.map((s) => Math.abs(s.value)), 0.1);
  const barMaxW = 120;

  return (
    <section id="risk-score" className="card-monzo p-5 space-y-4">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Risk Score Explorer
      </h2>
      <p className="text-xs text-text-secondary">
        Enter borrower features to get an ML credit score with SHAP explanations
      </p>

      {/* Input form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-text-muted block mb-1">Annual Inflow ({"\u00A3"})</label>
          <input
            type="number"
            value={form.annual_inflow}
            onChange={(e) => updateField("annual_inflow", Number(e.target.value))}
            className="w-full h-10 px-3 rounded-xl border-2 border-cool-grey bg-[var(--card-surface)] text-sm font-medium text-navy focus:border-coral focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted block mb-1">Avg Monthly Balance ({"\u00A3"})</label>
          <input
            type="number"
            value={form.avg_monthly_balance}
            onChange={(e) => updateField("avg_monthly_balance", Number(e.target.value))}
            className="w-full h-10 px-3 rounded-xl border-2 border-cool-grey bg-[var(--card-surface)] text-sm font-medium text-navy focus:border-coral focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted block mb-1">Days Since Account Open</label>
          <input
            type="number"
            value={form.days_since_account_open}
            onChange={(e) => updateField("days_since_account_open", Number(e.target.value))}
            className="w-full h-10 px-3 rounded-xl border-2 border-cool-grey bg-[var(--card-surface)] text-sm font-medium text-navy focus:border-coral focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted block mb-1">Failed Payment Cluster (1-3)</label>
          <input
            type="number"
            min={1}
            max={3}
            value={form.failed_payment_cluster_risk}
            onChange={(e) => updateField("failed_payment_cluster_risk", Number(e.target.value))}
            className="w-full h-10 px-3 rounded-xl border-2 border-cool-grey bg-[var(--card-surface)] text-sm font-medium text-navy focus:border-coral focus:outline-none transition-colors"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-text-muted block mb-1">
            Primary Bank Health: {form.primary_bank_health_score.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={form.primary_bank_health_score}
            onChange={(e) => updateField("primary_bank_health_score", Number(e.target.value))}
            className="w-full accent-coral"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-text-muted block mb-1">
            Secondary Bank Health: {form.secondary_bank_health_score.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={form.secondary_bank_health_score}
            onChange={(e) => updateField("secondary_bank_health_score", Number(e.target.value))}
            className="w-full accent-coral"
          />
        </div>
      </div>

      {/* Score button */}
      <button
        onClick={handleScore}
        disabled={loading}
        className="w-full h-11 rounded-full bg-coral text-white font-semibold text-sm hover:bg-coral-dark transition-colors disabled:opacity-50"
      >
        {loading ? "Scoring..." : "Score This Borrower"}
      </button>

      {error && (
        <p className="text-xs text-danger text-center">{error}</p>
      )}

      {/* Results */}
      {score && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Credit Score</p>
              <p className="text-4xl font-extrabold text-navy tracking-tight">
                {Math.round(score.credit_score)}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${gradeBg(score.risk_grade)} ${gradeColor(score.risk_grade)}`}>
                {score.risk_grade}
              </span>
              <p className="text-xs text-text-muted mt-1">
                PD: {(score.probability_of_default * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* SHAP Waterfall */}
          {shapValues.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">Feature Impact (SHAP)</p>
              <div className="space-y-1.5">
                {shapValues.map((s) => {
                  const w = (Math.abs(s.value) / maxAbsShap) * barMaxW;
                  const isPositive = s.value >= 0;
                  return (
                    <div key={s.feature} className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-24 truncate text-right flex-shrink-0">
                        {humanName(s.feature)}
                      </span>
                      <div className="flex-1 flex items-center" style={{ minHeight: 16 }}>
                        <svg viewBox={`0 0 ${barMaxW * 2} 16`} className="w-full h-4">
                          {/* Center line */}
                          <line x1={barMaxW} y1={0} x2={barMaxW} y2={16} stroke="var(--cool-grey)" strokeWidth={1} />
                          {/* Bar */}
                          <rect
                            x={isPositive ? barMaxW : barMaxW - w}
                            y={3}
                            width={Math.max(w, 2)}
                            height={10}
                            rx={3}
                            fill={isPositive ? "var(--success)" : "var(--danger)"}
                            opacity={0.75}
                          />
                        </svg>
                      </div>
                      <span className={`text-[10px] font-medium w-10 text-right ${isPositive ? "text-success" : "text-danger"}`}>
                        {isPositive ? "+" : ""}{s.value.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {explain?.base_value != null && (
                <p className="text-[10px] text-text-muted mt-2 text-center">
                  Base value: {explain.base_value.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
