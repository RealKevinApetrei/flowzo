"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { LendingPotCard } from "./lending-pot-card";
import { DurationSelector } from "./duration-selector";
import { YieldDashboard } from "./yield-dashboard";
import { ImpactCard } from "./impact-card";
import { FirstVisitBanner } from "@/components/shared/first-visit-banner";
import { formatCurrency } from "@flowzo/shared";
import { Card, CardContent } from "@/components/ui/card";

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

interface UpcomingRepayment {
  trade_id: string;
  obligation_name: string;
  amount_pence: number;
  fee_pence: number;
  new_due_date: string;
  status: string;
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
  upcomingRepayments: UpcomingRepayment[];
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
  upcomingRepayments,
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

        {/* Upcoming Repayments */}
        {upcomingRepayments.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-3">Upcoming Repayments</h2>
            <div className="space-y-2">
              {upcomingRepayments.map((r) => {
                const repayDate = new Date(r.new_due_date);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const daysLeft = Math.max(0, Math.ceil((repayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(repayDate);
                const isLive = r.status === "LIVE";

                return (
                  <Card key={r.trade_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-success">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-navy">{r.obligation_name}</p>
                            <p className="text-xs text-text-secondary">
                              Repays {dateLabel}{" "}
                              <span className="text-text-muted">
                                ({daysLeft === 0 ? "today" : `${daysLeft}d`})
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-navy">{formatCurrency(r.amount_pence)}</p>
                          <p className="text-[10px] text-success font-semibold">+{formatCurrency(r.fee_pence)} fee</p>
                        </div>
                      </div>
                      {isLive && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          <span className="text-[10px] text-success font-medium">Active</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Impact Card */}
        {impactStats.peopleHelped > 0 && <ImpactCard stats={impactStats} />}
      </div>
    </div>
  );
}
