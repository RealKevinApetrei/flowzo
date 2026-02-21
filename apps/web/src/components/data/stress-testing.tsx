"use client";

import { useState } from "react";

interface StressResult {
  before: { credit_score: number; grade: string; pd: number };
  after: { credit_score: number; grade: string; pd: number };
}

const PRESETS = [
  {
    label: "Grade A",
    features: {
      annual_inflow: 50000,
      avg_monthly_balance: 4000,
      days_since_open: 730,
      primary_bank_health: 0.9,
      secondary_bank_health: 0.85,
      failed_payment_cluster: 1,
    },
  },
  {
    label: "Grade B",
    features: {
      annual_inflow: 28000,
      avg_monthly_balance: 1500,
      days_since_open: 365,
      primary_bank_health: 0.65,
      secondary_bank_health: 0.5,
      failed_payment_cluster: 2,
    },
  },
  {
    label: "Grade C",
    features: {
      annual_inflow: 15000,
      avg_monthly_balance: 500,
      days_since_open: 180,
      primary_bank_health: 0.35,
      secondary_bank_health: 0.3,
      failed_payment_cluster: 3,
    },
  },
];

function gradeColor(g: string) {
  return g === "A" ? "text-success" : g === "B" ? "text-warning" : "text-danger";
}

function gradeBg(g: string) {
  return g === "A" ? "bg-success/15" : g === "B" ? "bg-warning/15" : "bg-danger/15";
}

export function StressTesting() {
  const [preset, setPreset] = useState(0);
  const [shock, setShock] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StressResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/quant/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: PRESETS[preset].features,
          income_shock_pct: shock,
        }),
      });

      if (!res.ok) {
        setError("Stress test API unavailable.");
        return;
      }

      setResult(await res.json());
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  // Semi-circle gauge
  function Gauge({
    beforeScore,
    afterScore,
  }: {
    beforeScore: number;
    afterScore: number;
  }) {
    const maxScore = 850;
    const cx = 100;
    const cy = 90;
    const r = 70;
    const startAngle = Math.PI;
    const endAngle = 0;

    function scoreToAngle(score: number) {
      const ratio = Math.min(score / maxScore, 1);
      return startAngle + (endAngle - startAngle) * ratio;
    }

    function polarToCart(angle: number, radius: number) {
      return {
        x: cx + radius * Math.cos(angle),
        y: cy - radius * Math.sin(angle),
      };
    }

    const beforeAngle = scoreToAngle(beforeScore);
    const afterAngle = scoreToAngle(afterScore);

    // Arc path
    function arcPath(fromAngle: number, toAngle: number, radius: number) {
      const start = polarToCart(fromAngle, radius);
      const end = polarToCart(toAngle, radius);
      const large = Math.abs(toAngle - fromAngle) > Math.PI ? 1 : 0;
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 0 ${end.x} ${end.y}`;
    }

    const beforeEnd = polarToCart(beforeAngle, r);
    const afterEnd = polarToCart(afterAngle, r);

    return (
      <svg viewBox="0 0 200 110" className="w-full h-auto max-w-[280px] mx-auto" preserveAspectRatio="xMidYMid meet">
        {/* Background arc */}
        <path
          d={arcPath(startAngle, endAngle, r)}
          fill="none"
          stroke="var(--warm-grey)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* Before arc (navy) */}
        <path
          d={arcPath(startAngle, beforeAngle, r)}
          fill="none"
          stroke="var(--navy)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* After arc (danger) */}
        <path
          d={arcPath(startAngle, afterAngle, r + 0.1)}
          fill="none"
          stroke="var(--danger)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="4 3"
        />
        {/* Before dot */}
        <circle cx={beforeEnd.x} cy={beforeEnd.y} r={5} fill="var(--navy)" stroke="white" strokeWidth={2} />
        {/* After dot */}
        <circle cx={afterEnd.x} cy={afterEnd.y} r={5} fill="var(--danger)" stroke="white" strokeWidth={2} />
        {/* Labels */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
          Score
        </text>
        <text x={30} y={cy + 8} textAnchor="middle" fontSize={8} fill="var(--text-muted)">0</text>
        <text x={170} y={cy + 8} textAnchor="middle" fontSize={8} fill="var(--text-muted)">850</text>
      </svg>
    );
  }

  return (
    <section id="stress-test" className="card-monzo p-5 space-y-4">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Stress Testing
      </h2>
      <p className="text-xs text-text-secondary">
        Simulate income shocks to see how borrower scores change
      </p>

      {/* Preset pills */}
      <div className="flex gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setPreset(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              preset === i ? "bg-coral text-white" : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Shock slider */}
      <div>
        <label className="text-[10px] text-text-muted block mb-1">
          Income Shock: <span className="font-bold text-navy">{shock}%</span> reduction
        </label>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={shock}
          onChange={(e) => setShock(Number(e.target.value))}
          className="w-full accent-coral"
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleTest}
        disabled={loading}
        className="w-full h-11 rounded-full bg-coral text-white font-semibold text-sm hover:bg-coral-dark transition-colors disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Stress Test"}
      </button>

      {error && <p className="text-xs text-danger text-center">{error}</p>}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Before / After cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-warm-grey/30 rounded-xl p-3 text-center">
              <p className="text-[10px] text-text-muted">Before</p>
              <p className="text-2xl font-extrabold text-navy">{result.before.credit_score}</p>
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-1 ${gradeBg(result.before.grade)} ${gradeColor(result.before.grade)}`}>
                {result.before.grade}
              </span>
              <p className="text-[10px] text-text-muted mt-1">
                PD: {(result.before.pd * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-warm-grey/30 rounded-xl p-3 text-center">
              <p className="text-[10px] text-text-muted">After ({shock}% shock)</p>
              <p className="text-2xl font-extrabold text-navy">{result.after.credit_score}</p>
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-1 ${gradeBg(result.after.grade)} ${gradeColor(result.after.grade)}`}>
                {result.after.grade}
              </span>
              <p className="text-[10px] text-text-muted mt-1">
                PD: {(result.after.pd * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Delta */}
          {result.before.grade !== result.after.grade && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className={`font-bold ${gradeColor(result.before.grade)}`}>
                {result.before.grade}
              </span>
              <span className="text-danger font-bold">{"\u2192"}</span>
              <span className={`font-bold ${gradeColor(result.after.grade)}`}>
                {result.after.grade}
              </span>
              <span className="text-xs text-danger font-semibold ml-1">Downgrade</span>
            </div>
          )}

          {/* Gauge */}
          <Gauge beforeScore={result.before.credit_score} afterScore={result.after.credit_score} />

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-navy rounded-full" />
              <span className="text-text-muted">Before</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-danger" />
              <span className="text-text-muted">After</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
