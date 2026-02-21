"use client";

import { useState, useRef } from "react";
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
}

const SWIPE_THRESHOLD = 80;

export function SuggestionCard({
  proposal,
  dangerDayBalance,
  onAccept,
  onDismiss,
}: SuggestionCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const { payload } = proposal;

  // Build a specific explanation fallback
  const explanation =
    proposal.explanation_text ??
    `Your balance drops near ${formatDate(payload.original_date)}. Shifting to ${formatDate(payload.shifted_date)} keeps you in the green.`;

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

  // Swipe handlers
  function onPointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    setSwiping(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!swiping) return;
    const delta = e.clientX - startXRef.current;
    setSwipeX(delta);
  }

  function onPointerUp() {
    if (!swiping) return;
    setSwiping(false);

    if (swipeX > SWIPE_THRESHOLD) {
      handleAccept();
    } else if (swipeX < -SWIPE_THRESHOLD) {
      handleDismiss();
    }
    setSwipeX(0);
  }

  const swipeOpacity = Math.max(0, 1 - Math.abs(swipeX) / 200);
  const swipeHint =
    swipeX > 40
      ? "text-success"
      : swipeX < -40
        ? "text-danger"
        : "text-transparent";

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe background hints */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        <span className={`text-sm font-bold ${swipeX < -40 ? "text-danger" : "text-transparent"} transition-colors`}>
          Not now
        </span>
        <span className={`text-sm font-bold ${swipeHint} transition-colors`}>
          {swipeX > 40 ? "Shift it" : ""}
        </span>
      </div>

      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: swiping ? `translateX(${swipeX}px)` : undefined,
          opacity: swiping ? swipeOpacity : 1,
          transition: swiping ? "none" : "transform 0.2s ease, opacity 0.2s ease",
        }}
        className="rounded-2xl bg-[var(--card-surface)] shadow-sm overflow-hidden touch-pan-y"
      >
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
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-text-muted">
                {payload.shift_days} day shift
              </p>
              <p className="text-xs text-text-muted">
                Fee: <span className="font-semibold text-navy">{formatCurrency(payload.fee_pence)}</span>
              </p>
            </div>
          </div>

          {/* Explanation -- always visible */}
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Action buttons -- 2 only */}
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
    </div>
  );
}
