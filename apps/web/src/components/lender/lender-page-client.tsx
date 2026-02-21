"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { toggleAutoMatch } from "@/lib/actions/lending";
import { TopBar } from "@/components/layout/top-bar";
import { LendingPotCard } from "./lending-pot-card";
import { AutoPopToggle } from "./auto-pop-toggle";
import { YieldDashboard } from "./yield-dashboard";
import { FirstVisitBanner } from "@/components/shared/first-visit-banner";

interface LendingPot {
  available_pence: number;
  locked_pence: number;
  total_deployed_pence: number;
  realized_yield_pence: number;
}

interface YieldStats {
  totalYieldPence: number;
  avgTermDays: number;
  avgAprBps: number;
  tradeCount: number;
  activeTrades: number;
}

interface LenderPageClientProps {
  initialPot: LendingPot | null;
  initialAutoMatch: boolean;
  initialYieldStats: YieldStats;
  initialWithdrawalQueued: boolean;
  sparklineData: number[];
}

export function LenderPageClient({
  initialPot,
  initialAutoMatch,
  initialYieldStats,
  initialWithdrawalQueued,
  sparklineData,
}: LenderPageClientProps) {
  const [autoMatch, setAutoMatch] = useState(initialAutoMatch);
  const [, startTransition] = useTransition();

  // Compute projected yield for passive income display
  const totalPotPence =
    (initialPot?.available_pence ?? 0) + (initialPot?.locked_pence ?? 0);
  const aprDecimal = initialYieldStats.avgAprBps / 10000;
  const monthlyYieldPence = Math.round((totalPotPence * aprDecimal) / 12);

  const handleAutoMatchToggle = useCallback(
    (enabled: boolean) => {
      setAutoMatch(enabled);
      startTransition(async () => {
        try {
          await toggleAutoMatch(enabled);
          toast.success(
            enabled ? "Auto-match enabled" : "Auto-match disabled",
          );
        } catch {
          setAutoMatch(!enabled);
          toast.error("Failed to update auto-match setting");
        }
      });
    },
    [],
  );

  return (
    <div>
      <TopBar title="Lending" />
      <div className="max-w-lg sm:max-w-2xl mx-auto px-4 py-6 space-y-6">
        <FirstVisitBanner
          storageKey="flowzo-lending-intro-seen"
          message="Lend spare cash and earn returns on idle money."
        />

        {/* Lending Pot Card -- with APY preference slider */}
        <LendingPotCard pot={initialPot} />

        {/* Auto-Match Toggle */}
        <AutoPopToggle enabled={autoMatch} onToggle={handleAutoMatchToggle} />

        {/* Yield Dashboard */}
        <YieldDashboard
          stats={initialYieldStats}
          potAvailablePence={initialPot?.available_pence}
          potLockedPence={initialPot?.locked_pence}
          sparklineData={sparklineData}
        />
      </div>
    </div>
  );
}
