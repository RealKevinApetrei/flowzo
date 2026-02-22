"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@flowzo/shared";

interface ForecastDay {
  forecast_date: string;
  projected_balance_pence: number;
  is_danger: boolean;
  confidence_low_pence: number;
  confidence_high_pence: number;
  income_expected_pence: number;
  outgoings_expected_pence: number;
}

interface Obligation {
  id: string;
  name: string;
  amount_pence: number;
  next_expected: string;
  is_essential?: boolean;
  category?: string | null;
}

interface Repayment {
  id: string;
  obligation_name: string;
  amount_pence: number;
  new_due_date: string;
}

interface CalendarHeatmapProps {
  forecasts: ForecastDay[];
  obligations?: Obligation[];
  repayments?: Repayment[];
}

function getDayColor(balancePence: number): {
  bg: string;
  border: string;
  dot: string;
} {
  if (balancePence < 0) {
    return {
      bg: "bg-danger/20",
      border: "border-danger",
      dot: "bg-danger",
    };
  }
  if (balancePence <= 10000) {
    return {
      bg: "bg-warning/20",
      border: "border-warning",
      dot: "bg-warning",
    };
  }
  return {
    bg: "bg-success/20",
    border: "border-success",
    dot: "bg-success",
  };
}

function getMonthName(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function CalendarHeatmap({
  forecasts,
  obligations = [],
  repayments = [],
}: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const forecastMap = useMemo(() => {
    const map = new Map<string, ForecastDay>();
    for (const f of forecasts) {
      map.set(f.forecast_date, f);
    }
    return map;
  }, [forecasts]);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      forecast: ForecastDay | null;
    }> = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date,
        dateStr,
        dayNumber: date.getDate(),
        forecast: forecastMap.get(dateStr) ?? null,
      });
    }
    return result;
  }, [forecastMap]);

  const monthLabel = useMemo(() => {
    if (days.length === 0) return "";
    const firstMonth = getMonthName(days[0].dateStr);
    const lastMonth = getMonthName(days[days.length - 1].dateStr);
    return firstMonth === lastMonth
      ? firstMonth
      : `${firstMonth} - ${lastMonth}`;
  }, [days]);

  const selectedForecast = selectedDay !== null ? days[selectedDay] : null;

  // Build repayment map by date string
  const repaymentMap = useMemo(() => {
    const map = new Map<string, Repayment[]>();
    for (const r of repayments) {
      const existing = map.get(r.new_due_date) ?? [];
      existing.push(r);
      map.set(r.new_due_date, existing);
    }
    return map;
  }, [repayments]);

  // Build obligation map by date string
  const obligationMap = useMemo(() => {
    const map = new Map<string, Obligation[]>();
    for (const o of obligations) {
      if (!o.next_expected) continue;
      const existing = map.get(o.next_expected) ?? [];
      existing.push(o);
      map.set(o.next_expected, existing);
    }
    return map;
  }, [obligations]);

  // Find obligations due on the selected day
  const selectedDayObligations = useMemo(() => {
    if (!selectedForecast) return [];
    return obligationMap.get(selectedForecast.dateStr) ?? [];
  }, [selectedForecast, obligationMap]);

  // Find repayments due on the selected day
  const selectedDayRepayments = useMemo(() => {
    if (!selectedForecast) return [];
    return repaymentMap.get(selectedForecast.dateStr) ?? [];
  }, [selectedForecast, repaymentMap]);

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Cash Calendar</h2>
          <p className="text-sm text-text-secondary">{monthLabel}</p>
        </div>
        <span className="text-xs text-text-muted">Next 30 days</span>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-text-muted"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Offset for start day of week (Monday = 0) */}
        {(() => {
          const firstDayOfWeek = (days[0]?.date.getDay() + 6) % 7;
          return Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ));
        })()}

        {days.map((day, index) => {
          const balancePence = day.forecast
            ? day.forecast.projected_balance_pence
            : null;

          const colors =
            balancePence !== null
              ? getDayColor(balancePence)
              : {
                  bg: "bg-warm-grey",
                  border: "border-transparent",
                  dot: "",
                };

          const isSelected = selectedDay === index;
          const isToday = index === 0;
          const isInflowDay =
            day.forecast && day.forecast.income_expected_pence > 0;
          const hasRepayment = repaymentMap.has(day.dateStr);
          const hasBills = obligationMap.has(day.dateStr);

          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDay(isSelected ? null : index)}
              className={`
                relative flex flex-col items-center justify-center
                aspect-square rounded-lg border-2 transition-all duration-150
                ${colors.bg} ${colors.border}
                ${isSelected ? "ring-2 ring-coral ring-offset-1 scale-110 z-10" : "hover:scale-105"}
              `}
            >
              <span
                className={`text-xs font-semibold leading-none ${
                  isToday ? "text-coral" : "text-navy"
                }`}
              >
                {day.dayNumber}
              </span>
              {/* Danger indicator */}
              {day.forecast?.is_danger && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger" />
              )}
              {/* Payday / inflow indicator */}
              {isInflowDay && (
                <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-blue-500" />
              )}
              {/* Bill due indicator (only when no inflow dot) */}
              {!isInflowDay && hasBills && (
                <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-warning" />
              )}
              {/* Repayment indicator */}
              {hasRepayment && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-coral" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-text-secondary flex-wrap">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success" />
          <span>Safe</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-warning/30 border border-warning" />
          <span>Tight</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-danger/30 border border-danger" />
          <span>Danger</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Payday</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span>Bills</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-coral" />
          <span>Repayment</span>
        </div>
      </div>

      {/* Selected day tooltip */}
      {selectedForecast && (selectedForecast.forecast || selectedDayRepayments.length > 0 || selectedDayObligations.length > 0) && (
        <div className="mt-4 rounded-xl bg-soft-white p-4 border border-warm-grey animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-text-secondary">
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }).format(selectedForecast.date)}
          </p>

          {selectedForecast.forecast && (
            <>
              <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-bold text-navy">
                  {formatCurrency(selectedForecast.forecast.projected_balance_pence)}
                </p>
                {selectedForecast.forecast.is_danger && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2.5 py-1 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Risk
                  </span>
                )}
              </div>

              {/* Income indicator */}
              {selectedForecast.forecast.income_expected_pence > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-blue-600 font-medium">
                    Expected income:{" "}
                    {formatCurrency(
                      selectedForecast.forecast.income_expected_pence,
                    )}
                  </span>
                </div>
              )}

              {/* Outgoings */}
              {selectedForecast.forecast.outgoings_expected_pence > 0 && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-danger/50" />
                  <span className="text-text-secondary">
                    Expected outgoings:{" "}
                    {formatCurrency(
                      selectedForecast.forecast.outgoings_expected_pence,
                    )}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Obligations due on this day */}
          {selectedDayObligations.length > 0 && (
            <div className="mt-3 pt-2 border-t border-warm-grey space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Bills due
              </p>
              {selectedDayObligations.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-navy font-medium">{o.name}</span>
                  <span className="text-text-secondary font-semibold">
                    {formatCurrency(o.amount_pence)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Repayments due on this day */}
          {selectedDayRepayments.length > 0 && (
            <div className="mt-3 pt-2 border-t border-warm-grey space-y-1.5">
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-coral">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                <p className="text-[10px] uppercase tracking-wider text-coral font-semibold">
                  Auto-repayment (locked)
                </p>
              </div>
              {selectedDayRepayments.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-navy font-medium">{r.obligation_name}</span>
                  <span className="text-coral font-semibold">
                    -{formatCurrency(r.amount_pence)}
                  </span>
                </div>
              ))}
              <p className="text-[9px] text-text-muted">
                This amount will be automatically withdrawn. Cannot be rescheduled.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
