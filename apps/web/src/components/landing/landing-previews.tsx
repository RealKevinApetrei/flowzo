"use client";

import { DemoBubbleBoard } from "@/components/lender/demo-bubble-board";

/** Static demo data for the mini heatmap — no server fetch needed */
const DEMO_DAYS = [
  1, 1, 1, 0, 1, 1, 1, // week 1: mostly safe
  1, 1, 2, 2, 1, 1, 0, // week 2: some tight days
  1, -1, -1, 1, 1, 1, 1, // week 3: two danger days
  1, 1, 1, 0, 1, 1, 1, // week 4: mostly safe
  1, 1,                  // remaining
] as const;

function getDemoColor(val: number) {
  if (val < 0) return "bg-danger/20 border-danger";
  if (val === 0) return "bg-warning/20 border-warning";
  return "bg-success/20 border-success";
}

export function LandingPreviews() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Borrower preview — mini heatmap */}
      <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-coral uppercase tracking-wider">Borrower</span>
        </div>
        <h3 className="text-base font-bold text-navy mb-3">Cash Calendar</h3>
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-medium text-text-muted">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DEMO_DAYS.map((val, i) => (
            <div
              key={i}
              className={`aspect-square rounded-md border-2 ${getDemoColor(val)} flex items-center justify-center`}
            >
              <span className="text-[10px] font-semibold text-navy/70">{i + 1}</span>
              {val < 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-danger" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 text-[9px] text-text-secondary">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success/30 border border-success" />Safe</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning/30 border border-warning" />Tight</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger/30 border border-danger" />Danger</span>
        </div>
      </div>

      {/* Lender preview — live bubble board */}
      <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-coral uppercase tracking-wider">Lender</span>
        </div>
        <h3 className="text-base font-bold text-navy mb-3">Live Trade Pool</h3>
        <div className="h-[220px] sm:h-[260px] rounded-2xl overflow-hidden bg-soft-white">
          <DemoBubbleBoard
            autoMatch={true}
            bubbleColorMode="by-grade"
            unifiedColorHex="#FF5A5F"
          />
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 text-[9px] text-text-secondary">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Low risk</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" />Higher</span>
        </div>
      </div>
    </div>
  );
}
