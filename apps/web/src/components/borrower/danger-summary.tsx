"use client";

import { useState } from "react";
import { CalendarHeatmap } from "./calendar-heatmap";

interface ForecastDay {
  forecast_date: string;
  projected_balance_pence: number;
  is_danger: boolean;
  confidence_low_pence: number;
}

interface DangerSummaryProps {
  dangerCount: number;
  forecasts: ForecastDay[];
}

export function DangerSummary({ dangerCount, forecasts }: DangerSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (dangerCount === 0) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-2xl bg-success/10 border border-success/30 p-4 flex items-center justify-between transition-colors hover:bg-success/15"
      >
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm font-semibold text-navy">
            No danger days ahead
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-2xl bg-danger/10 border border-danger/30 p-4 flex items-center justify-between transition-colors hover:bg-danger/15"
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
          </span>
          <span className="text-sm font-semibold text-navy">
            {dangerCount} danger {dangerCount === 1 ? "day" : "days"} ahead
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CalendarHeatmap forecasts={forecasts} />
        </div>
      )}
    </div>
  );
}
