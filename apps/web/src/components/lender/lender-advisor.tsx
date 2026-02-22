"use client";

import { useState } from "react";

interface LenderAdvisorProps {
  currentPrefs: { min_apr: number; risk_bands: string[]; max_exposure: number; max_shift_days: number };
  portfolio: { grade_a_pct: number; grade_b_pct: number; grade_c_pct: number; total_deployed: number; realized_yield: number; default_count: number };
  marketRates: { grade: string; bid_apr: number; ask_apr: number; liquidity: number }[];
}

interface Recommendation {
  parameter: string;
  current: string;
  suggested: string;
  reason: string;
}

interface AdvisorResult {
  summary: string;
  recommendations: Recommendation[];
}

export function LenderAdvisor({ currentPrefs, portfolio, marketRates }: LenderAdvisorProps) {
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function getAdvice() {
    setLoading(true);
    try {
      const res = await fetch("/api/claude/lender-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrefs, portfolio, marketRates }),
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!result && !loading) {
    return (
      <button
        onClick={getAdvice}
        className="w-full rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-coral">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity={0.3} />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-navy">AI Risk Advisor</p>
            <p className="text-xs text-text-muted mt-0.5">Get personalised recommendations to optimise your lending strategy</p>
          </div>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
          <div className="w-4 h-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
        </div>
        <p className="text-xs text-text-muted">Analysing your portfolio...</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold text-coral uppercase tracking-wider">AI Risk Advisor</p>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>

      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="rounded-xl bg-soft-white p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-navy capitalize">
                  {rec.parameter.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-text-muted line-through">{rec.current}</span>
                  <span className="text-coral font-bold">{rec.suggested}</span>
                </div>
              </div>
              <p className="text-[10px] text-text-muted">{rec.reason}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={getAdvice}
        className="text-xs text-coral font-medium"
      >
        Refresh advice
      </button>
    </div>
  );
}
