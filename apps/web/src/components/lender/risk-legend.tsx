"use client";

const RISK_INFO = [
  { grade: "A", label: "Low Risk", color: "#10B981" },
  { grade: "B", label: "Medium", color: "#F59E0B" },
  { grade: "C", label: "Higher", color: "#EF4444" },
];

export function RiskLegend() {
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {RISK_INFO.map((r) => (
        <div key={r.grade} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: r.color }}
          />
          <span className="text-xs text-text-secondary">
            {r.grade} – {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}
