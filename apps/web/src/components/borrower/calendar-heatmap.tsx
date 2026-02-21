"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@flowzo/shared";
import { Switch } from "@/components/ui/switch";

interface ForecastDay {
  forecast_date: string;
  projected_balance_pence: number;
  is_danger: boolean;
  confidence_low_pence: number;
}

interface CalendarHeatmapProps {
  forecasts: ForecastDay[];
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
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(dateStr),
  );
}

export function CalendarHeatmap({ forecasts }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showWorstCase, setShowWorstCase] = useState(false);

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
    return firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`;
  }, [days]);

  const selectedForecast = selectedDay !== null ? days[selectedDay] : null;

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Cash Calendar</h2>
          <p className="text-sm text-text-secondary">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Worst case</span>
          <Switch checked={showWorstCase} onCheckedChange={setShowWorstCase} />
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-text-muted">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Offset for start day of week (Monday = 0) */}
        {(() => {
          const firstDayOfWeek = (days[0]?.date.getDay() + 6) % 7; // Monday = 0
          return Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ));
        })()}

        {days.map((day, index) => {
          const balancePence = day.forecast
            ? showWorstCase
              ? day.forecast.confidence_low_pence
              : day.forecast.projected_balance_pence
            : null;

          const colors =
            balancePence !== null
              ? getDayColor(balancePence)
              : { bg: "bg-warm-grey", border: "border-transparent", dot: "" };

          const isSelected = selectedDay === index;
          const isToday = index === 0;

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
              {day.forecast?.is_danger && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-text-secondary">
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
      </div>

      {/* Selected day tooltip */}
      {selectedForecast && selectedForecast.forecast && (
        <div className="mt-4 rounded-xl bg-soft-white p-4 border border-warm-grey animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }).format(selectedForecast.date)}
              </p>
              <p className="text-lg font-bold text-navy mt-0.5">
                {formatCurrency(
                  showWorstCase
                    ? selectedForecast.forecast.confidence_low_pence
                    : selectedForecast.forecast.projected_balance_pence,
                )}
              </p>
              {showWorstCase && (
                <p className="text-xs text-text-muted mt-0.5">Worst-case balance</p>
              )}
            </div>
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
        </div>
      )}
    </div>
  );
}
