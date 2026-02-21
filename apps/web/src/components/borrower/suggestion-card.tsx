"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@flowzo/shared";
import { Button } from "@/components/ui/button";

interface SuggestionCardProps {
  proposal: {
    id: string;
    type: string;
    status: string;
    payload: {
      obligation_name: string;
      original_date: string;
      shifted_date: string;
      amount_pence: number;
      fee_pence: number;
      shift_days: number;
    };
    explanation_text: string | null;
  };
  dangerDayBalance?: number;
  onAccept: (id: string) => void | Promise<void>;
  onDismiss: (id: string) => void | Promise<void>;
  onCustomise: (id: string) => void | Promise<void>;
}

export function SuggestionCard({
  proposal,
  dangerDayBalance,
  onAccept,
  onDismiss,
  onCustomise,
}: SuggestionCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const { payload } = proposal;
  const isAgentPick = proposal.type === "SHIFT_BILL";

  async function handleAccept() {
    setIsAccepting(true);
    try {
      await onAccept(proposal.id);
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleDismiss() {
    setIsDismissing(true);
    try {
      await onDismiss(proposal.id);
    } finally {
      setIsDismissing(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Calendar shift icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-coral"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14l2 2 4-4" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-navy truncate">
                {payload.obligation_name}
              </h3>
              {isAgentPick && (
                <span className="inline-flex items-center text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Agent pick
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-navy mt-0.5">
              {formatCurrency(payload.amount_pence)}
            </p>
          </div>
        </div>

        {/* Shift details */}
        <div className="mt-4 rounded-xl bg-soft-white p-3.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Move from</span>
            <span className="font-semibold text-navy">{formatDate(payload.original_date)}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-coral flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-navy">{formatDate(payload.shifted_date)}</span>
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            {payload.shift_days} day shift
          </p>
        </div>

        {/* Fee */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-text-secondary">Flowzo fee</span>
          <span className="font-semibold text-navy">{formatCurrency(payload.fee_pence)}</span>
        </div>

        {/* Data-driven brief summary */}
        {dangerDayBalance !== undefined && (
          <p className="mt-3 text-xs text-text-secondary leading-relaxed bg-warning/5 border border-warning/15 rounded-lg px-3 py-2">
            Your balance {dangerDayBalance < 0 ? "drops to " : "is only "}
            <span className="font-semibold text-navy">
              {formatCurrency(dangerDayBalance)}
            </span>{" "}
            on {formatDate(payload.original_date)} — shifting this bill avoids
            a potential shortfall.
          </p>
        )}

        {/* Why button and explanation */}
        <div className="mt-3">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-sm font-medium text-coral hover:text-coral-dark transition-colors"
          >
            {showExplanation ? "Hide explanation" : "Why?"}
          </button>

          {showExplanation && (
            <div className="mt-2 text-sm text-text-secondary bg-soft-white rounded-lg p-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {proposal.explanation_text ?? (
                <span className="text-text-muted italic">
                  Our agent recommends shifting this bill to avoid a low balance around{" "}
                  {formatDate(payload.original_date)}.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-5 pb-5">
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="flex-1"
          size="sm"
        >
          {isAccepting ? "Accepting..." : "Accept"}
        </Button>
        <Button
          onClick={() => onCustomise(proposal.id)}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Customise
        </Button>
        <Button
          onClick={handleDismiss}
          disabled={isDismissing}
          variant="ghost"
          size="sm"
          className="text-text-secondary"
        >
          {isDismissing ? "..." : "Dismiss"}
        </Button>
      </div>
    </div>
  );
}
