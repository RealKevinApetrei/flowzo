"use client";

import { CalendarHeatmap } from "./calendar-heatmap";

interface ForecastDay {
  forecast_date: string;
  projected_balance_pence: number;
  is_danger: boolean;
  confidence_low_pence: number;
  confidence_high_pence: number;
  income_expected_pence: number;
  outgoings_expected_pence: number;
}

interface Repayment {
  id: string;
  obligation_name: string;
  amount_pence: number;
  new_due_date: string;
}

interface DangerSummaryProps {
  dangerCount: number;
  forecasts: ForecastDay[];
  repayments?: Repayment[];
}

export function DangerSummary({ dangerCount, forecasts, repayments = [] }: DangerSummaryProps) {
  return (
    <div className="space-y-3">
      {/* Status banner */}
      {dangerCount === 0 ? (
        <div className="rounded-2xl bg-success/10 border border-success/30 p-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm font-semibold text-navy">
            No danger days ahead
          </span>
        </div>
      ) : (
        <div className="rounded-2xl bg-danger/10 border border-danger/30 p-4 flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
          </span>
          <span className="text-sm font-semibold text-navy">
            {dangerCount} danger {dangerCount === 1 ? "day" : "days"} ahead
          </span>
        </div>
      )}

      {/* Calendar always visible */}
      <CalendarHeatmap forecasts={forecasts} repayments={repayments} />
    </div>
  );
}
