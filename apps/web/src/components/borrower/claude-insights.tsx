"use client";

import { useState, useEffect } from "react";

interface ClaudeInsightsProps {
  riskGrade: string;
  creditScore: number | null;
  dangerDays: number;
  obligations: { name: string; amount_pence: number; expected_day: number }[];
  avgBalancePence: number;
  incomePattern: string;
}

export function ClaudeInsights({
  riskGrade,
  creditScore,
  dangerDays,
  obligations,
  avgBalancePence,
  incomePattern,
}: ClaudeInsightsProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/claude/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riskGrade,
        creditScore: creditScore ?? 650,
        dangerDays,
        obligations,
        avgBalance_pence: avgBalancePence,
        incomePattern,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.insight) {
          setInsight(data.insight);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [riskGrade, creditScore, dangerDays, obligations, avgBalancePence, incomePattern]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
          <div className="w-4 h-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
        </div>
        <p className="text-xs text-text-muted">Claude is analysing your finances...</p>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-coral">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity={0.3} />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-coral uppercase tracking-wider mb-1">
            AI Financial Insight
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}
