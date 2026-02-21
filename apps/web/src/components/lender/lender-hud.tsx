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
      <p className="text-[9px] uppercase tracking-widest text-blue-400/60 font-medium font-mono">
        {label}
      </p>
      <p className="text-sm font-bold text-blue-50 neon-value font-mono">{value}</p>
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
      <div className="absolute right-3 top-3 z-10 hud-panel hud-brackets p-3 space-y-3 min-w-[80px]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 status-dot" />
          <p className="text-[10px] font-bold text-blue-200 font-mono tracking-wider">LEND</p>
        </div>
        <StatItem label="AVAIL" value={fmt(available)} compact />
        <StatItem label="LOCKED" value={fmt(locked)} compact />
        <StatItem label="YIELD" value={fmt(yieldPence)} compact />
        <div className="border-t border-blue-500/20 pt-2 flex flex-col items-center gap-1.5">
          <span className="text-[9px] text-blue-400/60 font-mono tracking-wider">AUTO</span>
          <Switch
            checked={autoMatch}
            onCheckedChange={onAutoMatchToggle}
          />
        </div>
        {showTopUp && (
          <button className="w-full text-[10px] font-bold font-mono text-blue-200 border border-blue-500/30 rounded-md py-1.5 hover:bg-blue-500/10 transition-colors">
            TOP UP
          </button>
        )}
      </div>
    );
  }

  // Default: top position — cyberpunk HUD bar
  return (
    <div className="absolute top-3 left-3 right-3 z-10 hud-panel hud-brackets px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 status-dot" />
          <p className="text-[11px] font-bold text-blue-200 font-mono tracking-wider">LENDING</p>
        </div>

        <div className="flex items-center gap-5 flex-1 justify-center">
          <StatItem label="AVAILABLE" value={fmt(available)} />
          <div className="w-px h-6 bg-blue-500/20" />
          <StatItem label="LOCKED" value={fmt(locked)} />
          <div className="w-px h-6 bg-blue-500/20" />
          <StatItem label="YIELD" value={fmt(yieldPence)} />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {showTopUp && (
            <button className="text-[10px] font-bold font-mono text-blue-200 border border-blue-500/30 rounded-md px-2.5 py-1 hover:bg-blue-500/10 transition-colors">
              TOP UP
            </button>
          )}
          <div className="border-l border-blue-500/20 pl-2.5 flex items-center gap-1.5">
            <span className="text-[9px] text-blue-400/60 font-mono tracking-wider">AUTO</span>
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
