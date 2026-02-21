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

const GRADE_COLORS: Record<string, string> = {
  A: "bg-[#14B8A6]",
  B: "bg-coral",
  C: "bg-[#8B5CF6]",
};

function summarize(filters: FilterState): string {
  const grades = filters.riskGrades;
  if (grades.size === 3 || grades.size === 0) return "All grades";
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
    <div ref={ref} className="absolute bottom-3 left-3 z-10">
      {/* Collapsed chip */}
      <button
        onClick={() => setOpen(!open)}
        className="glass-surface rounded-full px-3 py-2 flex items-center gap-2 shadow-lg text-sm font-medium text-foreground hover:shadow-xl transition-shadow"
      >
        <svg
          width="14"
          height="14"
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
        <div className="absolute bottom-full left-0 mb-2 glass-surface rounded-2xl p-4 shadow-xl min-w-[260px] space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-1.5 bg-warm-grey p-0.5 rounded-full">
            {(["simple", "advanced"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
                  mode === m
                    ? "bg-coral text-white shadow-sm"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                {m === "simple" ? "Simple" : "Advanced"}
              </button>
            ))}
          </div>

          {/* Risk grade chips — colored dots to match bubble colors */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
              Risk Grade
            </p>
            <div className="flex gap-2">
              <button
                onClick={setAll}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filters.riskGrades.size === 3
                    ? "bg-coral text-white"
                    : "bg-warm-grey text-text-secondary"
                }`}
              >
                All
              </button>
              {RISK_GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGrade(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    filters.riskGrades.has(g)
                      ? "bg-foreground/10 text-foreground"
                      : "bg-warm-grey text-text-secondary"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${GRADE_COLORS[g]}`} />
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced sliders */}
          {mode === "advanced" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                    Amount
                  </p>
                  <p className="text-xs text-text-secondary">
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
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                    Term (days)
                  </p>
                  <p className="text-xs text-text-secondary">
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
