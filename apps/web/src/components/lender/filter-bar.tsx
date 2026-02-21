"use client";

import { useState } from "react";
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

const GRADE_STYLES: Record<string, { dot: string; activeBg: string; activeBorder: string; activeText: string }> = {
  A: { dot: "bg-success", activeBg: "bg-success/10", activeBorder: "border-success/40", activeText: "text-success" },
  B: { dot: "bg-warning", activeBg: "bg-warning/10", activeBorder: "border-warning/40", activeText: "text-warning" },
  C: { dot: "bg-danger", activeBg: "bg-danger/10", activeBorder: "border-danger/40", activeText: "text-danger" },
};

export function FilterBar({
  filters,
  onFiltersChange,
  mode,
  onModeChange,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    <div className="space-y-3">
      {/* Risk grade pill chips — horizontal scrollable */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 bg-warm-grey p-0.5 rounded-full shrink-0">
          {(["simple", "advanced"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                onModeChange(m);
                if (m === "advanced") setShowAdvanced(true);
                else setShowAdvanced(false);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                mode === m
                  ? "bg-[var(--card-surface)] text-navy shadow-sm"
                  : "text-text-secondary hover:text-navy"
              }`}
            >
              {m === "simple" ? "Simple" : "Advanced"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-cool-grey shrink-0" />

        {/* All chip */}
        <button
          onClick={setAll}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border shrink-0 ${
            filters.riskGrades.size === 3
              ? "bg-coral/10 border-coral/40 text-coral"
              : "bg-warm-grey border-transparent text-text-secondary hover:text-navy"
          }`}
        >
          All
        </button>

        {/* Grade chips */}
        {RISK_GRADES.map((g) => {
          const style = GRADE_STYLES[g];
          const active = filters.riskGrades.has(g);
          return (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 border shrink-0 ${
                active
                  ? `${style.activeBg} ${style.activeBorder} ${style.activeText}`
                  : "bg-warm-grey border-transparent text-text-secondary hover:text-navy"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              {g}
            </button>
          );
        })}
      </div>

      {/* Advanced sliders */}
      {mode === "advanced" && (
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-text-secondary">Amount</p>
              <p className="text-xs text-text-muted">
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
              <p className="text-xs font-medium text-text-secondary">
                Term (days)
              </p>
              <p className="text-xs text-text-muted">
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
        </div>
      )}
    </div>
  );
}
