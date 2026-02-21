"use client";

import { useState } from "react";
import { formatCurrency } from "@flowzo/shared";

interface UpcomingObligation {
  id: string;
  name: string;
  amount_pence: number;
  frequency: string;
  next_expected: string;
  confidence: number;
  is_essential: boolean;
  category: string | null;
}

interface UpcomingTransactionsProps {
  obligations: UpcomingObligation[];
}

const MAX_VISIBLE = 5;

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return "text-success bg-success/10";
  if (confidence >= 0.65) return "text-warning bg-warning/10";
  return "text-danger bg-danger/10";
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case "WEEKLY": return "Weekly";
    case "FORTNIGHTLY": return "Fortnightly";
    case "MONTHLY": return "Monthly";
    case "QUARTERLY": return "Quarterly";
    case "ANNUAL": return "Annual";
    default: return "Irregular";
  }
}

export function UpcomingTransactions({ obligations }: UpcomingTransactionsProps) {
  const [showAll, setShowAll] = useState(false);

  if (obligations.length === 0) return null;

  const visible = showAll ? obligations : obligations.slice(0, MAX_VISIBLE);
  const hasMore = obligations.length > MAX_VISIBLE;

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-navy">Upcoming</h2>
        <span className="text-xs text-text-muted">
          Next 14 days
        </span>
      </div>

      <div className="space-y-1">
        {visible.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 py-2.5 border-b border-warm-grey last:border-0"
          >
            {/* Date */}
            <div className="w-12 text-center shrink-0">
              <p className="text-xs font-bold text-navy leading-tight">
                {formatShortDate(o.next_expected)}
              </p>
            </div>

            {/* Name + frequency */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy truncate">
                {o.name}
              </p>
              <p className="text-[10px] text-text-muted">
                {frequencyLabel(o.frequency)}
              </p>
            </div>

            {/* Amount */}
            <p className="text-sm font-bold text-navy shrink-0">
              {formatCurrency(o.amount_pence)}
            </p>

            {/* Confidence badge */}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${confidenceColor(o.confidence)}`}>
              {Math.round(o.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-xs font-medium text-coral mt-3 py-1 hover:text-coral-dark transition-colors"
        >
          {showAll ? "Show less" : `See all ${obligations.length} transactions`}
        </button>
      )}
    </div>
  );
}
