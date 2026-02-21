"use client";

import { useEffect, useRef } from "react";

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

const fmt = (pence: number) => "\u00A3" + (pence / 100).toFixed(2);

const RISK_COLORS: Record<string, string> = {
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

  // Dismiss on tap away
  useEffect(() => {
    if (!trade) return;
    function handler() {
      onDismiss();
    }
    // Delay listener to avoid immediate self-dismiss
    const id = setTimeout(() => {
      document.addEventListener("pointerdown", handler);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", handler);
    };
  }, [trade, onDismiss]);

  if (!trade || !position) return null;

  const badge = RISK_COLORS[trade.risk_grade] ?? RISK_COLORS.B;

  return (
    <div
      className="absolute z-20 glass-surface rounded-2xl p-3 shadow-xl min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 120, 8),
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-navy">
            {fmt(trade.amount_pence)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}
          >
            Grade {trade.risk_grade}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span>{trade.shift_days} days</span>
          <span>&middot;</span>
          <span>Fee {fmt(trade.fee_pence)}</span>
        </div>
      </div>
    </div>
  );
}
