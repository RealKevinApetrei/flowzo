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

const RISK_BADGE: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-blue-500/15", text: "text-blue-500" },
  B: { bg: "bg-rose-400/15", text: "text-rose-400" },
  C: { bg: "bg-amber-500/15", text: "text-amber-500" },
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
      className="absolute z-20 glass-surface rounded-2xl p-3 shadow-xl min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 120, 8),
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-foreground">
            {fmt(trade.amount_pence)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
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
