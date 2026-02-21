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

const RISK_BADGE: Record<string, { border: string; text: string; glow: string }> = {
  A: { border: "border-blue-400/40", text: "text-blue-300", glow: "shadow-[0_0_6px_rgba(96,165,250,0.3)]" },
  B: { border: "border-rose-400/40", text: "text-rose-300", glow: "shadow-[0_0_6px_rgba(253,164,175,0.3)]" },
  C: { border: "border-amber-400/40", text: "text-amber-300", glow: "shadow-[0_0_6px_rgba(252,211,77,0.3)]" },
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
      className="absolute z-20 hud-panel hud-brackets rounded-xl p-3 shadow-xl min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 120, 8),
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-blue-50 neon-value font-mono">
            {fmt(trade.amount_pence)}
          </span>
          <span
            className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${badge.border} ${badge.text} ${badge.glow}`}
          >
            {trade.risk_grade}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-blue-400/60 font-mono">
          <span>{trade.shift_days}d</span>
          <span className="text-blue-500/30">/</span>
          <span>Fee {fmt(trade.fee_pence)}</span>
        </div>
      </div>
    </div>
  );
}
