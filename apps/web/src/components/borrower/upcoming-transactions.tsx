"use client";

import { useState } from "react";
import { formatCurrency } from "@flowzo/shared";

// Unified cashflow item — bills, income, and repayments all in one timeline
export interface CashflowItem {
  id: string;
  name: string;
  amount_pence: number;
  date: string;            // YYYY-MM-DD
  type: "bill" | "income" | "repayment";
  frequency?: string;      // for bills
  confidence?: number;     // for bills
  is_essential?: boolean;  // for bills
  category?: string | null;
  locked?: boolean;        // for repayments (can't reschedule)
}

interface UpcomingTransactionsProps {
  items: CashflowItem[];
}

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
    default: return freq;
  }
}

function typeIcon(type: CashflowItem["type"]) {
  if (type === "income") {
    return (
      <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-success">
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  if (type === "repayment") {
    return (
      <div className="w-7 h-7 rounded-full bg-coral/10 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-coral">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  // bill
  return (
    <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-warning">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75V15.388l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export function UpcomingTransactions({ items }: UpcomingTransactionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-navy">Cashflow Breakdown</h2>
          <span className="text-xs text-text-muted">
            {sorted.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Next 30 days</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {expanded && (
      <div className="space-y-0.5 mt-4">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-2.5 border-b border-warm-grey last:border-0"
          >
            {/* Date */}
            <div className="w-12 text-center shrink-0">
              <p className="text-xs font-bold text-navy leading-tight">
                {formatShortDate(item.date)}
              </p>
            </div>

            {/* Type icon */}
            {typeIcon(item.type)}

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy truncate">
                {item.name}
              </p>
              <p className="text-[10px] text-text-muted">
                {item.type === "income" && "Income"}
                {item.type === "repayment" && "Auto-repayment"}
                {item.type === "bill" && frequencyLabel(item.frequency ?? "MONTHLY")}
              </p>
            </div>

            {/* Amount */}
            <p className={`text-sm font-bold shrink-0 ${
              item.type === "income" ? "text-success" : item.type === "repayment" ? "text-coral" : "text-navy"
            }`}>
              {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount_pence)}
            </p>

            {/* Badge: confidence for bills, locked for repayments */}
            {item.type === "bill" && item.confidence != null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${confidenceColor(item.confidence)}`}>
                {Math.round(item.confidence * 100)}%
              </span>
            )}
            {item.type === "repayment" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-coral bg-coral/10">
                Locked
              </span>
            )}
            {item.type === "income" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-success bg-success/10">
                Salary
              </span>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
