"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@flowzo/shared";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";

interface MarketContext {
  liquidity_ratio: number;
  supply_count: number;
  demand_count: number;
  bid_apr: number;
  ask_apr: number;
}

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
  marketContext?: MarketContext;
  onAccept: (id: string, adjustedFeePence: number) => void | Promise<void>;
  onDismiss: (id: string) => void | Promise<void>;
}

export function SuggestionCard({
  proposal,
  marketContext,
  onAccept,
  onDismiss,
}: SuggestionCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [editingFee, setEditingFee] = useState(false);

  const { payload } = proposal;

  // Fee slider: allow lowering fee from suggested down to 50%, starts at max (100%)
  const suggestedFee = payload.fee_pence;
  const feeRange = useMemo(() => {
    const min = Math.max(1, Math.round(suggestedFee * 0.5));
    const max = Math.max(suggestedFee, min);
    return { min, max };
  }, [suggestedFee]);
  const [adjustedFee, setAdjustedFee] = useState(suggestedFee);

  // Match probability — fee position is the primary driver
  // At max fee (position=1) → ~92%, at min fee (position=0) → ~15%
  // Market liquidity nudges the curve up/down by ±10%
  const matchProbability = useMemo(() => {
    const range = feeRange.max - feeRange.min;
    if (range <= 0) return 95;
    const position = (adjustedFee - feeRange.min) / range; // 0..1

    // Base curve: 15% at min → 92% at max (smooth ease-in)
    const baseProbability = 15 + Math.pow(position, 0.7) * 77;

    // Market liquidity nudge (±10%)
    if (marketContext && marketContext.supply_count > 0) {
      const liquidityNudge = (Math.min(marketContext.liquidity_ratio, 2) / 2 - 0.5) * 20;
      return Math.round(Math.min(99, Math.max(5, baseProbability + liquidityNudge)));
    }

    return Math.round(Math.min(99, Math.max(5, baseProbability)));
  }, [adjustedFee, feeRange, marketContext]);

  // Dynamic color based on match probability
  const feeColor = useMemo(() => {
    if (matchProbability >= 75) return { range: "bg-success", thumb: "border-success focus-visible:ring-success/50", text: "text-success", label: "High" };
    if (matchProbability >= 45) return { range: "bg-warning", thumb: "border-warning focus-visible:ring-warning/50", text: "text-warning", label: "Medium" };
    return { range: "bg-danger", thumb: "border-danger focus-visible:ring-danger/50", text: "text-danger", label: "Low" };
  }, [matchProbability]);
  // Build a specific explanation fallback
  const explanation =
    proposal.explanation_text ??
    `Your balance drops near ${formatDate(payload.original_date)}. Shifting to ${formatDate(payload.shifted_date)} keeps you in the green.`;

  async function handleAccept() {
    setIsAccepting(true);
    try {
      await onAccept(proposal.id, adjustedFee);
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
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm overflow-hidden">
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-3">
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
                <span className="inline-flex items-center text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Recommended
                </span>
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
          <div className="mt-3 rounded-xl bg-soft-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">Fee</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-navy">{formatCurrency(adjustedFee)}</span>
                <button
                  type="button"
                  onClick={() => setEditingFee(!editingFee)}
                  className="text-[10px] font-medium text-coral"
                >
                  {editingFee ? "Done" : "Edit fee"}
                </button>
              </div>
            </div>
            {editingFee && (
              <div className="mt-3">
                {/* Match probability indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-muted">Match likelihood</span>
                  <span className={`text-xs font-bold ${feeColor.text}`}>
                    {matchProbability}% -- {feeColor.label}
                  </span>
                </div>
                <RangeSlider
                  value={[adjustedFee]}
                  min={feeRange.min}
                  max={feeRange.max}
                  step={1}
                  onValueChange={([v]) => setAdjustedFee(v)}
                  rangeClassName={feeColor.range}
                  thumbClassName={feeColor.thumb}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-text-muted">{formatCurrency(feeRange.min)}</span>
                  {adjustedFee !== suggestedFee && (
                    <button
                      type="button"
                      onClick={() => setAdjustedFee(suggestedFee)}
                      className="text-[10px] text-coral font-medium"
                    >
                      Reset
                    </button>
                  )}
                  <span className="text-[10px] text-text-muted">{formatCurrency(feeRange.max)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Explanation -- always visible */}
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex-1"
            size="sm"
          >
            {isAccepting ? "Shifting..." : "Shift it"}
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={isDismissing}
            variant="ghost"
            size="sm"
            className="text-text-secondary"
          >
            {isDismissing ? "..." : "Not now"}
          </Button>
        </div>
    </div>
  );
}
