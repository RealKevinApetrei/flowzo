"use client";

import { useState, useMemo, useCallback } from "react";
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

function getDayColor(balancePence: number, isDanger?: boolean): {
  bg: string;
  border: string;
  dot: string;
} {
  if (isDanger || balancePence < 0) {
    return {
      bg: "bg-danger/20",
      border: "border-danger",
      dot: "bg-danger",
    };
  }
  if (balancePence <= 50000) {
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

/** Format YYYY-MM-DD from a Date using local time */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  forecast: ForecastDay | null;
  isInRange: boolean; // within [today, today+180)
  isCurrentMonth: boolean;
}

export function CalendarHeatmap({
  forecasts,
  obligations = [],
  repayments = [],
}: CalendarHeatmapProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Forecast range boundaries
  const { todayStr, endStr } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 179);
    return { todayStr: toDateStr(now), endStr: toDateStr(end) };
  }, []);

  const forecastMap = useMemo(() => {
    const map = new Map<string, ForecastDay>();
    for (const f of forecasts) {
      map.set(f.forecast_date, f);
    }
    return map;
  }, [forecasts]);

  // Rolling 5-week view starting from Monday of the current week + weekOffset
  const { startDate, rangeLabel } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Find Monday of current week
    const dow = (now.getDay() + 6) % 7; // Mon=0
    const monday = new Date(now);
    monday.setDate(monday.getDate() - dow + weekOffset * 7);
    const end = new Date(monday);
    end.setDate(end.getDate() + 34); // 5 weeks = 35 days

    const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
    const label = `${fmt.format(monday)} – ${fmt.format(end)}`;
    return { startDate: monday, rangeLabel: label };
  }, [weekOffset]);

  // Can navigate? Don't go before current week, max ~24 weeks forward
  const canPrev = weekOffset > 0;
  const canNext = weekOffset < 24;

  // Build 35 calendar days (5 weeks, Mon-Sun)
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = toDateStr(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: d.getDate(),
        forecast: forecastMap.get(dateStr) ?? null,
        isInRange: dateStr >= todayStr && dateStr <= endStr,
        isCurrentMonth: true, // all days visible in rolling view
      });
    }
    return days;
  }, [startDate, forecastMap, todayStr, endStr]);

  // Selected day data
  const selectedDay = useMemo(() => {
    if (!selectedDateStr) return null;
    return calendarDays.find((d) => d.dateStr === selectedDateStr) ?? null;
  }, [selectedDateStr, calendarDays]);

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

  const selectedDayObligations = useMemo(() => {
    if (!selectedDay) return [];
    return obligationMap.get(selectedDay.dateStr) ?? [];
  }, [selectedDay, obligationMap]);

  const selectedDayRepayments = useMemo(() => {
    if (!selectedDay) return [];
    return repaymentMap.get(selectedDay.dateStr) ?? [];
  }, [selectedDay, repaymentMap]);

  const handleDayClick = useCallback(
    (dateStr: string) => {
      setSelectedDateStr((prev) => (prev === dateStr ? null : dateStr));
    },
    [],
  );

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Cash Calendar</h2>
          <p className="text-sm text-text-secondary">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            disabled={!canPrev}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-warm-grey active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous week"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-navy">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={!canNext}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-warm-grey active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next week"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-navy">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
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
        {calendarDays.map((day) => {
          const isDisabled = !day.isInRange || !day.isCurrentMonth;
          const balancePence = day.forecast
            ? day.forecast.projected_balance_pence
            : null;

          const colors =
            !isDisabled && balancePence !== null
              ? getDayColor(balancePence, day.forecast?.is_danger)
              : {
                  bg: "bg-warm-grey/50",
                  border: "border-transparent",
                  dot: "",
                };

          const isSelected = selectedDateStr === day.dateStr;
          const isToday = day.dateStr === todayStr;
          const isInflowDay =
            day.forecast && day.forecast.income_expected_pence > 0;
          const hasRepayment = repaymentMap.has(day.dateStr);
          const hasBills = obligationMap.has(day.dateStr);

          return (
            <button
              key={day.dateStr}
              onClick={() => !isDisabled && handleDayClick(day.dateStr)}
              disabled={isDisabled}
              className={`
                relative flex flex-col items-center justify-center
                aspect-square rounded-lg border-2 transition-all duration-150
                ${colors.bg} ${colors.border}
                ${isDisabled ? "opacity-30 cursor-default" : ""}
                ${isSelected ? "ring-2 ring-coral ring-offset-1 scale-110 z-10" : !isDisabled ? "hover:scale-105" : ""}
              `}
            >
              <span
                className={`text-xs font-semibold leading-none ${
                  isToday ? "text-coral" : isDisabled ? "text-text-muted" : "text-navy"
                }`}
              >
                {day.dayNumber}
              </span>
              {/* Danger indicator */}
              {!isDisabled && day.forecast?.is_danger && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger" />
              )}
              {/* Payday / inflow indicator */}
              {!isDisabled && isInflowDay && (
                <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-blue-500" />
              )}
              {/* Bill due indicator (only when no inflow dot) */}
              {!isDisabled && !isInflowDay && hasBills && (
                <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-warning" />
              )}
              {/* Repayment indicator */}
              {!isDisabled && hasRepayment && (
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
      {selectedDay && (selectedDay.forecast || selectedDayRepayments.length > 0 || selectedDayObligations.length > 0) && (
        <div className="mt-4 rounded-xl bg-soft-white p-4 border border-warm-grey animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-text-secondary">
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }).format(selectedDay.date)}
          </p>

          {selectedDay.forecast && (
            <>
              <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-bold text-navy">
                  {formatCurrency(selectedDay.forecast.projected_balance_pence)}
                </p>
                {selectedDay.forecast.is_danger && (
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
              {selectedDay.forecast.income_expected_pence > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-blue-600 font-medium">
                    Expected income:{" "}
                    {formatCurrency(
                      selectedDay.forecast.income_expected_pence,
                    )}
                  </span>
                </div>
              )}

              {/* Outgoings — split into bills + everyday spending */}
              {selectedDay.forecast.outgoings_expected_pence > 0 && (() => {
                const billsPence = selectedDayObligations.reduce((sum, o) => sum + o.amount_pence, 0);
                const irregularPence = Math.max(0, selectedDay.forecast.outgoings_expected_pence - billsPence);
                return (
                  <>
                    {billsPence > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-text-secondary">
                          Bills due: -{formatCurrency(billsPence)}
                        </span>
                      </div>
                    )}
                    {irregularPence > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-danger/50" />
                        <span className="text-text-secondary">
                          Everyday spending: -{formatCurrency(irregularPence)}
                        </span>
                      </div>
                    )}
                    {billsPence === 0 && irregularPence === 0 && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-danger/50" />
                        <span className="text-text-secondary">
                          Expected outgoings: -{formatCurrency(selectedDay.forecast.outgoings_expected_pence)}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Confidence band */}
              {selectedDay.forecast.confidence_low_pence !== selectedDay.forecast.confidence_high_pence && (
                <p className="mt-2 text-[10px] text-text-muted italic">
                  Balance could range {formatCurrency(selectedDay.forecast.confidence_low_pence)} – {formatCurrency(selectedDay.forecast.confidence_high_pence)}
                </p>
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
