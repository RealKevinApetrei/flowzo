"use client";

import { useState } from "react";
import { formatCurrency } from "@flowzo/shared";

interface WhatIfProps {
  obligations: { name: string; amount_pence: number; expected_day: number }[];
  forecasts: { day: number; balance_pence: number; is_danger: boolean }[];
}

interface SimResult {
  danger_days_before: number;
  danger_days_after: number;
  lowest_balance_before_pence: number;
  lowest_balance_after_pence: number;
  summary: string;
}

export function WhatIfSimulator({ obligations, forecasts }: WhatIfProps) {
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [shiftDays, setShiftDays] = useState(7);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function toggleBill(name: string) {
    setSelectedBills((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setResult(null);
  }

  async function simulate() {
    if (selectedBills.size === 0) return;
    setLoading(true);
    try {
      const shifts = obligations
        .filter((o) => selectedBills.has(o.name))
        .map((o) => ({
          name: o.name,
          amount_pence: o.amount_pence,
          from_day: o.expected_day,
          to_day: ((o.expected_day + shiftDays - 1) % 30) + 1,
        }));

      const res = await fetch("/api/claude/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts, forecasts, obligations }),
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

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 text-left hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 group-hover:bg-navy/20 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-navy">
              <path d="M4 4v16h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              <path d="M4 16l4-4 4 2 4-6 4 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-navy">What-If Simulator</p>
            <p className="text-[10px] text-text-muted mt-0.5">Simulate shifting multiple bills</p>
          </div>
        </div>
      </button>
    );
  }

  const totalSelected = obligations
    .filter((o) => selectedBills.has(o.name))
    .reduce((s, o) => s + o.amount_pence, 0);

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-navy">
              <path d="M4 4v16h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              <path d="M4 16l4-4 4 2 4-6 4 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-navy uppercase tracking-wider">What-If Simulator</span>
        </div>
        <button
          onClick={() => { setExpanded(false); setResult(null); setSelectedBills(new Set()); }}
          className="text-[10px] text-text-muted hover:text-navy transition-colors"
        >
          Close
        </button>
      </div>

      {/* Bill selector */}
      <div className="px-4 pb-3 space-y-1">
        {obligations.slice(0, 6).map((o) => {
          const selected = selectedBills.has(o.name);
          return (
            <button
              key={o.name}
              onClick={() => toggleBill(o.name)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                selected
                  ? "bg-coral/10 border border-coral/30 text-navy font-semibold shadow-sm"
                  : "bg-soft-white text-text-secondary hover:bg-warm-grey/30 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selected ? "bg-coral border-coral" : "border-cool-grey"
                }`}>
                  {selected && (
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span>{o.name}</span>
              </div>
              <span className="text-text-muted">{formatCurrency(o.amount_pence)}</span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      {selectedBills.size > 0 && (
        <div className="px-4 pb-4 space-y-3">
          {/* Summary of selected */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">
              {selectedBills.size} bill{selectedBills.size !== 1 ? "s" : ""} selected
            </span>
            <span className="font-semibold text-navy">{formatCurrency(totalSelected)}</span>
          </div>

          {/* Shift days */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted w-12">Shift by</span>
            <div className="flex-1 flex items-center gap-2">
              {[3, 5, 7, 10, 14].map((d) => (
                <button
                  key={d}
                  onClick={() => { setShiftDays(d); setResult(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                    shiftDays === d
                      ? "bg-coral text-white"
                      : "bg-soft-white text-text-muted hover:bg-warm-grey/40"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Simulate button */}
          <button
            onClick={simulate}
            disabled={loading}
            className="w-full h-10 rounded-full bg-coral text-white font-semibold text-xs hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Simulating...
              </>
            ) : (
              "Simulate Impact"
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="border-t border-warm-grey/30 bg-success/3 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--card-surface)] p-3 text-center">
              <p className="text-[10px] text-text-muted mb-1">Danger Days</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xl font-bold text-danger">{result.danger_days_before}</span>
                <svg viewBox="0 0 16 16" className="w-4 h-4 text-success">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xl font-bold text-success">{result.danger_days_after}</span>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--card-surface)] p-3 text-center">
              <p className="text-[10px] text-text-muted mb-1">Lowest Balance</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-sm font-bold text-danger">{formatCurrency(result.lowest_balance_before_pence)}</span>
                <svg viewBox="0 0 16 16" className="w-3 h-3 text-success flex-shrink-0">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm font-bold text-success">{formatCurrency(result.lowest_balance_after_pence)}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
