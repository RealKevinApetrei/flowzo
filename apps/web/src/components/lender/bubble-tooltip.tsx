"use client";

import { useEffect, useRef } from "react";
import { formatCurrency } from "@flowzo/shared";

interface TooltipTrade {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
}

interface BubbleTooltipProps {
  trade: TooltipTrade | null;
  position: { x: number; y: number } | null;
  onDismiss: () => void;
}

const RISK_BADGE: Record<string, string> = {
  A: "bg-success/10 text-success",
  B: "bg-warning/10 text-warning",
  C: "bg-danger/10 text-danger",
};

export function BubbleTooltip({ trade, position, onDismiss }: BubbleTooltipProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!trade) return;
    timerRef.current = setTimeout(onDismiss, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trade, onDismiss]);

  useEffect(() => {
    if (!trade) return;
    function handler() {
      onDismiss();
    }
    const id = setTimeout(() => {
      document.addEventListener("pointerdown", handler);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", handler);
    };
  }, [trade, onDismiss]);

  if (!trade || !position) return null;

  const badge = RISK_BADGE[trade.risk_grade] ?? RISK_BADGE.B;

  return (
    <div
      className="fixed z-20 bg-[var(--card-surface)] rounded-2xl shadow-lg border border-cool-grey p-3 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 120, 8),
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-navy">
            {formatCurrency(trade.amount_pence)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}
          >
            {trade.risk_grade}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <span>{trade.shift_days}d</span>
          <span className="text-cool-grey">/</span>
          <span>Fee {formatCurrency(trade.fee_pence)}</span>
        </div>
      </div>
    </div>
  );
}
