"use client";

import { useState } from "react";
import { formatCurrency } from "@flowzo/shared";

interface BillPriorityProps {
  obligations: { name: string; amount_pence: number; expected_day: number; category: string }[];
  dangerDays: { day: number; deficit_pence: number }[];
  avgBalancePence: number;
}

interface PriorityItem {
  name: string;
  priority: number;
  reason: string;
}

export function BillPriority({ obligations, dangerDays, avgBalancePence }: BillPriorityProps) {
  const [priorities, setPriorities] = useState<PriorityItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyse() {
    setLoading(true);
    try {
      const res = await fetch("/api/claude/bill-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obligations, dangerDays, avgBalancePence }),
      });
      if (res.ok) {
        const data = await res.json();
        setPriorities(data.priorities ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!priorities && !loading) {
    return (
      <button
        onClick={analyse}
        className="w-full rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-coral">
              <path d="M3 6h18M3 12h12M3 18h6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-coral uppercase tracking-wider">AI Bill Ranker</p>
            <p className="text-xs text-text-muted mt-0.5">Tap to rank which bills to shift first</p>
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
        <p className="text-xs text-text-muted">Analysing your bills...</p>
      </div>
    );
  }

  if (!priorities || priorities.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4">
        <p className="text-xs text-text-muted">No bills need shifting right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold text-coral uppercase tracking-wider">AI Bill Priority</p>
        <span className="text-[10px] text-text-muted">Shift these first</span>
      </div>
      <div className="space-y-2">
        {priorities.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i === 0 ? "bg-coral text-white" : i === 1 ? "bg-warning/20 text-warning" : "bg-warm-grey/50 text-text-muted"
            }`}>
              {item.priority}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy">{item.name}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{item.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
