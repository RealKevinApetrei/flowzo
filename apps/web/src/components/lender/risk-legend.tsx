"use client";

import { useState } from "react";

const RISK_INFO = [
  {
    grade: "A",
    label: "Low Risk",
    color: "#3B82F6",
    highlight: "#BFDBFE",
    description:
      "Strong repayment history, low default probability. Typically shorter terms with reliable borrowers.",
  },
  {
    grade: "B",
    label: "Medium Risk",
    color: "#FB7185",
    highlight: "#FECDD3",
    description:
      "Moderate risk profile. Balanced return potential with some uncertainty. Most common trade grade.",
  },
  {
    grade: "C",
    label: "Higher Risk",
    color: "#F59E0B",
    highlight: "#FDE68A",
    description:
      "Higher yield potential but increased default risk. Longer terms or newer borrowers.",
  },
];

export function RiskLegend() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-10">
      {/* Info icon button */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="glass-surface rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-text-secondary hover:text-foreground transition-colors"
        aria-label="Risk grade information"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {/* Legend popover */}
      {showInfo && (
        <div className="absolute bottom-full right-0 mb-2 glass-surface rounded-2xl p-4 shadow-xl min-w-[240px] space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Risk Grades
          </p>
          {RISK_INFO.map((r) => (
            <div key={r.grade} className="flex items-start gap-3">
              <div
                className="w-4 h-4 rounded-full shrink-0 mt-0.5 shadow-sm"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${r.highlight}, ${r.color})`,
                }}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Grade {r.grade}{" "}
                  <span className="font-normal text-text-secondary">
                    — {r.label}
                  </span>
                </p>
                <p className="text-xs text-text-muted leading-relaxed">
                  {r.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
