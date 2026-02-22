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

interface InsightData {
  status: "healthy" | "caution" | "at_risk";
  headline: string;
  insights: { icon: string; text: string }[];
}

const STATUS_CONFIG = {
  healthy: { bg: "bg-success/5", border: "border-success/15", badge: "bg-success/15 text-success", label: "Healthy" },
  caution: { bg: "bg-warning/5", border: "border-warning/15", badge: "bg-warning/15 text-warning", label: "Caution" },
  at_risk: { bg: "bg-danger/5", border: "border-danger/15", badge: "bg-danger/15 text-danger", label: "At Risk" },
};

export function ClaudeInsights({
  riskGrade,
  creditScore,
  dangerDays,
  obligations,
  avgBalancePence,
  incomePattern,
}: ClaudeInsightsProps) {
  const [data, setData] = useState<InsightData | null>(null);
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
      .then((result) => {
        if (!cancelled && result && !result.error) {
          setData({
            status: result.status ?? "caution",
            headline: result.headline ?? "Cash flow analysis",
            insights: result.insights ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
          <div className="w-4 h-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-warm-grey/40 rounded w-32" />
          <div className="h-2.5 bg-warm-grey/30 rounded w-48" />
        </div>
      </div>
    );
  }

  if (!data || data.insights.length === 0) return null;

  const config = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.caution;

  return (
    <div className={`rounded-2xl ${config.bg} border ${config.border} shadow-sm p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-coral">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity={0.3} />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-coral uppercase tracking-wider">AI Insight</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Headline */}
      <p className="text-sm font-bold text-navy mb-2">{data.headline}</p>

      {/* Insight bullets */}
      <div className="space-y-1.5">
        {data.insights.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0 mt-0.5">{item.icon}</span>
            <p className="text-xs text-text-secondary leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
