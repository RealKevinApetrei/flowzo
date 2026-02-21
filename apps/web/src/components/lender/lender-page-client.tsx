"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@flowzo/shared";
import { useBubbleBoard } from "@/lib/hooks/use-bubble-board";
import { useLenderSettings } from "@/lib/hooks/use-lender-settings";
import {
  toggleAutoMatch,
  fundTrade,
  withdrawFromPot,
  queueWithdrawal,
  cancelQueuedWithdrawal,
} from "@/lib/actions/lending";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBoard } from "./bubble-board";
import { DemoBubbleBoard } from "./demo-bubble-board";
import { LendingPotCard } from "./lending-pot-card";
import { AutoPopToggle } from "./auto-pop-toggle";
import { YieldDashboard } from "./yield-dashboard";
import { FilterBar } from "./filter-bar";
import type { FilterState } from "./filter-bar";
import { RiskLegend } from "./risk-legend";
import { TradeDetailModal } from "./trade-detail-modal";

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
  const router = useRouter();
  const { trades, loading: tradesLoading } = useBubbleBoard();
  const { bubbleColorMode, unifiedColorHex, amountRange, termRange } = useLenderSettings();
  const [autoMatch, setAutoMatch] = useState(initialAutoMatch);
  const [withdrawalQueued, setWithdrawalQueued] = useState(
    initialWithdrawalQueued,
  );
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<FilterState>({
    riskGrades: new Set(["A", "B", "C"]),
    amountRange,
    termRange,
  });

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const selectedTrade = selectedTradeId
    ? trades.find((t) => t.id === selectedTradeId) ?? null
    : null;

  const isDemo = initialPot === null;

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

  const handleLongPress = useCallback((tradeId: string) => {
    startTransition(async () => {
      try {
        await fundTrade(tradeId);
        toast.success("Trade funded successfully!");
      } catch (err) {
        console.error("Failed to fund trade:", err);
        toast.error("Failed to fund trade. Please try again.");
      }
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedTradeId(null);
  }, []);

  const handleFundTrade = useCallback(async (tradeId: string) => {
    startTransition(async () => {
      try {
        await fundTrade(tradeId);
        setSelectedTradeId(null);
        toast.success("Trade funded successfully!");
      } catch (err) {
        console.error("Failed to fund trade:", err);
        toast.error("Failed to fund trade. Please try again.");
      }
    });
  }, []);

  const handleWithdraw = useCallback(
    async (amountPence: number) => {
      startTransition(async () => {
        try {
          await withdrawFromPot(amountPence);
          toast.success(`Withdrew ${formatCurrency(amountPence)}`);
          router.refresh();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Withdrawal failed",
          );
        }
      });
    },
    [router],
  );

  const handleQueueWithdrawal = useCallback(async () => {
    startTransition(async () => {
      try {
        await queueWithdrawal();
        setWithdrawalQueued(true);
        toast.success(
          "Withdrawal queued -- funds will auto-withdraw as trades settle",
        );
      } catch {
        toast.error("Failed to queue withdrawal");
      }
    });
  }, []);

  const handleCancelQueuedWithdrawal = useCallback(async () => {
    startTransition(async () => {
      try {
        await cancelQueuedWithdrawal();
        setWithdrawalQueued(false);
        toast("Withdrawal queue cancelled");
      } catch {
        toast.error("Failed to cancel withdrawal queue");
      }
    });
  }, []);

  return (
    <div>
      <TopBar title="Lending" />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Lending Pot Card */}
        <LendingPotCard
          pot={initialPot}
          withdrawalQueued={withdrawalQueued}
          onPotUpdated={() => router.refresh()}
          onWithdraw={handleWithdraw}
          onQueueWithdrawal={handleQueueWithdrawal}
          onCancelQueuedWithdrawal={handleCancelQueuedWithdrawal}
        />

        {/* Auto-Pop Toggle */}
        <AutoPopToggle
          enabled={autoMatch}
          onToggle={handleAutoMatchToggle}
          avgAprBps={initialYieldStats.avgAprBps}
          monthlyYieldPence={monthlyYieldPence}
        />

        {/* Trade Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filter bar (inline) */}
            {!isDemo && (
              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {/* Bubble board container */}
            <div
              style={{ height: "clamp(300px, 50vw, 400px)" }}
              className="rounded-xl overflow-hidden bg-warm-grey"
            >
              {isDemo ? (
                <DemoBubbleBoard
                  autoMatch={autoMatch}
                  bubbleColorMode={bubbleColorMode}
                  unifiedColorHex={unifiedColorHex}
                />
              ) : tradesLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8 animate-pulse text-text-muted"
                  >
                    <circle cx="12" cy="10" r="6" />
                    <circle cx="19" cy="16" r="3" />
                    <circle cx="6" cy="18" r="2" />
                  </svg>
                  <p className="text-sm font-medium mt-2">
                    Loading bubbles...
                  </p>
                </div>
              ) : (
                <BubbleBoard
                  trades={trades}
                  onLongPress={handleLongPress}
                  filters={filters}
                  bubbleColorMode={bubbleColorMode}
                  unifiedColorHex={unifiedColorHex}
                />
              )}
            </div>

            {/* Risk legend (inline) */}
            <RiskLegend />
          </CardContent>
        </Card>

        {/* Yield Dashboard */}
        <YieldDashboard
          stats={initialYieldStats}
          potAvailablePence={initialPot?.available_pence}
          potLockedPence={initialPot?.locked_pence}
          sparklineData={sparklineData}
        />
      </div>

      {/* Floating overlays */}
      <TradeDetailModal
        trade={selectedTrade}
        open={selectedTradeId !== null}
        onClose={handleCloseModal}
        onFund={handleFundTrade}
      />
    </div>
  );
}
