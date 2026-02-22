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
        className="w-full rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-navy">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-navy uppercase tracking-wider">What-If Simulator</p>
            <p className="text-xs text-text-muted mt-0.5">Tap to simulate shifting multiple bills</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-navy uppercase tracking-wider">What-If Simulator</p>
        <button onClick={() => setExpanded(false)} className="text-[10px] text-text-muted">Close</button>
      </div>

      {/* Bill selector */}
      <div className="space-y-1.5">
        <p className="text-xs text-text-muted">Select bills to shift:</p>
        {obligations.slice(0, 6).map((o) => (
          <button
            key={o.name}
            onClick={() => toggleBill(o.name)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
              selectedBills.has(o.name)
                ? "bg-coral/10 border border-coral/30 text-navy font-semibold"
                : "bg-soft-white text-text-secondary hover:bg-warm-grey/30"
            }`}
          >
            <span>{o.name}</span>
            <span>{formatCurrency(o.amount_pence)} (day {o.expected_day})</span>
          </button>
        ))}
      </div>

      {/* Shift days slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">Shift by:</span>
        <input
          type="range"
          min={3}
          max={14}
          value={shiftDays}
          onChange={(e) => { setShiftDays(Number(e.target.value)); setResult(null); }}
          className="flex-1 accent-coral"
        />
        <span className="text-sm font-bold text-navy w-10 text-right">{shiftDays}d</span>
      </div>

      {/* Simulate button */}
      <button
        onClick={simulate}
        disabled={loading || selectedBills.size === 0}
        className="w-full h-10 rounded-full bg-coral text-white font-semibold text-xs hover:bg-coral/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Simulating..." : `Simulate ${selectedBills.size} shift${selectedBills.size !== 1 ? "s" : ""}`}
      </button>

      {/* Result */}
      {result && (
        <div className="rounded-xl bg-success/5 border border-success/10 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] text-text-muted">Danger Days</p>
              <p className="text-lg font-bold">
                <span className="text-danger">{result.danger_days_before}</span>
                <span className="text-text-muted mx-1">→</span>
                <span className="text-success">{result.danger_days_after}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Lowest Balance</p>
              <p className="text-lg font-bold">
                <span className="text-danger">{formatCurrency(result.lowest_balance_before_pence)}</span>
                <span className="text-text-muted mx-1">→</span>
                <span className="text-success">{formatCurrency(result.lowest_balance_after_pence)}</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
