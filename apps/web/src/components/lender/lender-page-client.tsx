"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { useBubbleBoard } from "@/lib/hooks/use-bubble-board";
import { useLenderSettings } from "@/lib/hooks/use-lender-settings";
import { toggleAutoMatch, fundTrade } from "@/lib/actions/lending";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBoard } from "./bubble-board";
import type { BubbleTrade } from "./bubble-board";
import { DemoBubbleBoard } from "./demo-bubble-board";
import { LendingPotCard } from "./lending-pot-card";
import { AutoPopToggle } from "./auto-pop-toggle";
import { YieldDashboard } from "./yield-dashboard";
import { FilterBar } from "./filter-bar";
import type { FilterState } from "./filter-bar";
import { BubbleTooltip } from "./bubble-tooltip";
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
}

export function LenderPageClient({
  initialPot,
  initialAutoMatch,
  initialYieldStats,
}: LenderPageClientProps) {
  const { trades, loading: tradesLoading } = useBubbleBoard();
  const { defaultFilterMode, bubbleColorMode, unifiedColorHex } = useLenderSettings();
  const [autoMatch, setAutoMatch] = useState(initialAutoMatch);
  const [isPending, startTransition] = useTransition();
  const [filterMode, setFilterMode] = useState(defaultFilterMode);

  const [filters, setFilters] = useState<FilterState>({
    riskGrades: new Set(["A", "B", "C"]),
    amountRange: [0, 100000],
    termRange: [1, 90],
  });

  const [tooltipTrade, setTooltipTrade] = useState<BubbleTrade | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const selectedTrade = selectedTradeId
    ? trades.find((t) => t.id === selectedTradeId) ?? null
    : null;

  const isDemo = initialPot === null;

  const handleAutoMatchToggle = useCallback(
    (enabled: boolean) => {
      setAutoMatch(enabled);
      startTransition(async () => {
        try {
          await toggleAutoMatch(enabled);
          toast.success(enabled ? "Auto-match enabled" : "Auto-match disabled");
        } catch {
          setAutoMatch(!enabled);
          toast.error("Failed to update auto-match setting");
        }
      });
    },
    [],
  );

  const handleQuickTap = useCallback(
    (trade: BubbleTrade, position: { x: number; y: number }) => {
      setTooltipTrade(trade);
      setTooltipPos(position);
    },
    [],
  );

  const handleDismissTooltip = useCallback(() => {
    setTooltipTrade(null);
    setTooltipPos(null);
  }, []);

  const handleLongPress = useCallback(
    (tradeId: string) => {
      startTransition(async () => {
        try {
          await fundTrade(tradeId);
          toast.success("Trade funded successfully!");
        } catch (err) {
          console.error("Failed to fund trade:", err);
          toast.error("Failed to fund trade. Please try again.");
        }
      });
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedTradeId(null);
  }, []);

  const handleFundTrade = useCallback(
    async (tradeId: string) => {
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
    },
    [],
  );

  return (
    <div>
      <TopBar title="Lending" />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Lending Pot Card */}
        <LendingPotCard pot={initialPot} />

        {/* Auto-Pop Toggle */}
        <AutoPopToggle enabled={autoMatch} onToggle={handleAutoMatchToggle} />

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
                mode={filterMode}
                onModeChange={setFilterMode}
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
                  <span className="text-3xl animate-pulse">🫧</span>
                  <p className="text-sm font-medium mt-2">Loading bubbles...</p>
                </div>
              ) : (
                <BubbleBoard
                  trades={trades}
                  onQuickTap={handleQuickTap}
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
        <YieldDashboard stats={initialYieldStats} />
      </div>

      {/* Floating overlays */}
      <BubbleTooltip
        trade={tooltipTrade}
        position={tooltipPos}
        onDismiss={handleDismissTooltip}
      />
      <TradeDetailModal
        trade={selectedTrade}
        open={selectedTradeId !== null}
        onClose={handleCloseModal}
        onFund={handleFundTrade}
      />
    </div>
  );
}
