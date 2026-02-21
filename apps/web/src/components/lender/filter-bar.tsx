"use client";

import { useState, useRef, useEffect } from "react";
import type { FilterMode } from "@/lib/hooks/use-lender-settings";
import { RangeSlider } from "@/components/ui/range-slider";

export interface FilterState {
  riskGrades: Set<"A" | "B" | "C">;
  amountRange: [number, number];
  termRange: [number, number];
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
}

const RISK_GRADES = ["A", "B", "C"] as const;

const GRADE_STYLES: Record<string, { dot: string; active: string }> = {
  A: { dot: "bg-blue-400", active: "border-blue-400/50 text-blue-200" },
  B: { dot: "bg-rose-400", active: "border-rose-400/50 text-rose-200" },
  C: { dot: "bg-amber-400", active: "border-amber-400/50 text-amber-200" },
};

function summarize(filters: FilterState): string {
  const grades = filters.riskGrades;
  if (grades.size === 3 || grades.size === 0) return "ALL GRADES";
  return [...grades].map((g) => `Grade ${g}`).join(", ");
}

export function FilterBar({
  filters,
  onFiltersChange,
  mode,
  onModeChange,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const toggleGrade = (grade: "A" | "B" | "C") => {
    const next = new Set(filters.riskGrades);
    if (next.has(grade)) {
      next.delete(grade);
    } else {
      next.add(grade);
    }
    onFiltersChange({ ...filters, riskGrades: next });
  };

  const setAll = () => {
    onFiltersChange({
      ...filters,
      riskGrades: new Set(["A", "B", "C"]),
    });
  };

  return (
    <div ref={ref} className="absolute bottom-4 left-3 z-10">
      {/* Collapsed chip */}
      <button
        onClick={() => setOpen(!open)}
        className="neon-chip rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-mono font-medium"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        <span>{summarize(filters)}</span>
      </button>

      {/* Expanded popover */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 hud-panel rounded-xl p-4 shadow-xl w-[calc(100vw-1.5rem)] max-w-[280px] space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-blue-950/50 p-0.5 rounded-lg border border-blue-500/15">
            {(["simple", "advanced"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all ${
                  mode === m
                    ? "bg-blue-500/20 text-blue-200 shadow-sm border border-blue-500/30"
                    : "text-blue-400/50 hover:text-blue-300/70 border border-transparent"
                }`}
              >
                {m === "simple" ? "SIMPLE" : "ADVANCED"}
              </button>
            ))}
          </div>

          {/* Risk grade chips */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-blue-400/50 font-mono font-medium mb-2">
              Risk Grade
            </p>
            <div className="flex gap-2">
              <button
                onClick={setAll}
                className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border ${
                  filters.riskGrades.size === 3
                    ? "neon-chip-active"
                    : "neon-chip"
                }`}
              >
                ALL
              </button>
              {RISK_GRADES.map((g) => {
                const style = GRADE_STYLES[g];
                const active = filters.riskGrades.has(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGrade(g)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 border ${
                      active ? style.active + " bg-blue-500/10" : "neon-chip"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced sliders */}
          {mode === "advanced" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] uppercase tracking-widest text-blue-400/50 font-mono font-medium">
                    Amount
                  </p>
                  <p className="text-[10px] text-blue-300/70 font-mono">
                    {"\u00A3"}
                    {(filters.amountRange[0] / 100).toFixed(0)} – {"\u00A3"}
                    {(filters.amountRange[1] / 100).toFixed(0)}
                  </p>
                </div>
                <RangeSlider
                  min={0}
                  max={100000}
                  step={500}
                  value={filters.amountRange}
                  onValueChange={([min, max]) =>
                    onFiltersChange({
                      ...filters,
                      amountRange: [min, max],
                    })
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] uppercase tracking-widest text-blue-400/50 font-mono font-medium">
                    Term (days)
                  </p>
                  <p className="text-[10px] text-blue-300/70 font-mono">
                    {filters.termRange[0]}d – {filters.termRange[1]}d
                  </p>
                </div>
                <RangeSlider
                  min={1}
                  max={90}
                  step={1}
                  value={filters.termRange}
                  onValueChange={([min, max]) =>
                    onFiltersChange({
                      ...filters,
                      termRange: [min, max],
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
