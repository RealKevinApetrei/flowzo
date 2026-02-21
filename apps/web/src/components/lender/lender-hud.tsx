"use client";

import type { HudPosition } from "@/lib/hooks/use-lender-settings";
import { Switch } from "@/components/ui/switch";

interface LendingPot {
  available_pence: number;
  locked_pence: number;
  total_deployed_pence: number;
  realized_yield_pence: number;
}

interface LenderHudProps {
  pot: LendingPot | null;
  autoMatch: boolean;
  onAutoMatchToggle: (enabled: boolean) => void;
  position: HudPosition;
}

const fmt = (pence: number) =>
  "\u00A3" + (pence / 100).toFixed(2);

function StatItem({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "text-center" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
        {label}
      </p>
      <p className="text-sm font-bold text-navy">{value}</p>
    </div>
  );
}

export function LenderHud({
  pot,
  autoMatch,
  onAutoMatchToggle,
  position,
}: LenderHudProps) {
  if (position === "hidden") return null;

  const available = pot?.available_pence ?? 0;
  const locked = pot?.locked_pence ?? 0;
  const yieldPence = pot?.realized_yield_pence ?? 0;
  const showTopUp = available < 500;

  if (position === "side") {
    return (
      <div className="absolute right-3 top-3 z-10 glass-surface rounded-2xl p-3 space-y-4 shadow-lg min-w-[80px]">
        <p className="text-xs font-bold text-navy">Lending</p>
        <StatItem label="Avail" value={fmt(available)} compact />
        <StatItem label="Locked" value={fmt(locked)} compact />
        <StatItem label="Yield" value={fmt(yieldPence)} compact />
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-text-muted">Auto</span>
          <Switch
            checked={autoMatch}
            onCheckedChange={onAutoMatchToggle}
          />
        </div>
        {showTopUp && (
          <button className="btn-pill bg-coral text-white text-[10px] px-2 py-1 w-full">
            Top Up
          </button>
        )}
      </div>
    );
  }

  // Default: top position
  return (
    <div className="absolute top-3 left-3 right-3 z-10 glass-surface rounded-2xl px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-navy shrink-0">Lending</p>
        <div className="flex items-center gap-4 flex-1 justify-center">
          <StatItem label="Available" value={fmt(available)} />
          <StatItem label="Locked" value={fmt(locked)} />
          <StatItem label="Yield" value={fmt(yieldPence)} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showTopUp && (
            <button className="btn-pill bg-coral text-white text-xs px-3 py-1">
              Top Up
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted">Auto</span>
            <Switch
              checked={autoMatch}
              onCheckedChange={onAutoMatchToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
