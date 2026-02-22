"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { LendingPotCard } from "./lending-pot-card";
import { DurationSelector } from "./duration-selector";
import { YieldDashboard } from "./yield-dashboard";
import { ImpactCard } from "./impact-card";
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

interface DurationOption {
  days: number;
  aprPct: number;
  gainPence: number;
}

interface ImpactStats {
  peopleHelped: number;
  tradesFunded: number;
  totalLentPence: number;
  essentialBills: number;
}

interface LenderPageClientProps {
  initialPot: LendingPot | null;
  initialYieldStats: YieldStats;
  currentApyBps: number;
  sparklineData: number[];
  durationOptions: DurationOption[];
  initialMaxShiftDays: number;
  impactStats: ImpactStats;
  withdrawalQueued: boolean;
}

export function LenderPageClient({
  initialPot,
  initialYieldStats,
  currentApyBps,
  sparklineData,
  durationOptions,
  initialMaxShiftDays,
  impactStats,
  withdrawalQueued,
}: LenderPageClientProps) {
  const router = useRouter();

  return (
    <div>
      <TopBar title="Lending" />
      <div className="max-w-lg sm:max-w-2xl mx-auto px-4 py-6 space-y-6">
        <FirstVisitBanner
          storageKey="flowzo-lending-intro-seen"
          message="Lend spare cash and earn returns on idle money."
        />

        {/* Lending Pot Card */}
        <LendingPotCard pot={initialPot} currentApyBps={currentApyBps} withdrawalQueued={withdrawalQueued} onPotUpdated={() => router.refresh()} />

        {/* Duration Preference */}
        <DurationSelector options={durationOptions} initialMaxShiftDays={initialMaxShiftDays} />

        {/* Yield Dashboard */}
        <YieldDashboard
          stats={initialYieldStats}
          potAvailablePence={initialPot?.available_pence}
          potLockedPence={initialPot?.locked_pence}
          sparklineData={sparklineData}
        />

        {/* Impact Card */}
        {impactStats.peopleHelped > 0 && <ImpactCard stats={impactStats} />}
      </div>
    </div>
  );
}
