"use client";

export interface FilterState {
  riskGrades: Set<"A" | "B" | "C">;
  amountRange: [number, number];
  termRange: [number, number];
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const RISK_GRADES = ["A", "B", "C"] as const;

const GRADE_STYLES: Record<string, { dot: string; activeBg: string; activeBorder: string; activeText: string }> = {
  A: { dot: "bg-success", activeBg: "bg-success/10", activeBorder: "border-success/40", activeText: "text-success" },
  B: { dot: "bg-warning", activeBg: "bg-warning/10", activeBorder: "border-warning/40", activeText: "text-warning" },
  C: { dot: "bg-danger", activeBg: "bg-danger/10", activeBorder: "border-danger/40", activeText: "text-danger" },
};

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
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
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
  );
}
