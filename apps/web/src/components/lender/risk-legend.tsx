"use client";

import { useState } from "react";

const RISK_INFO = [
  {
    grade: "A",
    label: "Low Risk",
    color: "#60A5FA",
    description:
      "Strong repayment history, low default probability. Typically shorter terms with reliable borrowers.",
  },
  {
    grade: "B",
    label: "Medium Risk",
    color: "#FDA4AF",
    description:
      "Moderate risk profile. Balanced return potential with some uncertainty. Most common trade grade.",
  },
  {
    grade: "C",
    label: "Higher Risk",
    color: "#FCD34D",
    description:
      "Higher yield potential but increased default risk. Longer terms or newer borrowers.",
  },
];

export function RiskLegend() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="absolute bottom-4 right-3 z-10">
      {/* Info icon */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="neon-chip rounded-lg w-11 h-11 flex items-center justify-center"
        aria-label="Risk grade information"
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {/* Legend popover */}
      {showInfo && (
        <div className="absolute bottom-full right-0 mb-2 hud-panel rounded-xl p-4 shadow-xl min-w-[230px] space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
          <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest font-mono">
            Risk Grades
          </p>
          {RISK_INFO.map((r) => (
            <div key={r.grade} className="flex items-start gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                style={{ background: r.color, boxShadow: `0 0 6px ${r.color}40` }}
              />
              <div>
                <p className="text-xs font-bold text-blue-100 font-mono">
                  Grade {r.grade}{" "}
                  <span className="font-normal text-blue-300/60">
                    — {r.label}
                  </span>
                </p>
                <p className="text-[10px] text-blue-400/50 leading-relaxed">
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
