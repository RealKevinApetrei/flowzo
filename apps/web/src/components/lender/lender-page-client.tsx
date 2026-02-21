"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { useBubbleBoard } from "@/lib/hooks/use-bubble-board";
import { useLenderSettings } from "@/lib/hooks/use-lender-settings";
import { toggleAutoMatch, fundTrade } from "@/lib/actions/lending";
import { BubbleBoard } from "./bubble-board";
import type { BubbleTrade } from "./bubble-board";
import { DemoBubbleBoard } from "./demo-bubble-board";
import { LenderHud } from "./lender-hud";
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
}: LenderPageClientProps) {
  const { trades, loading: tradesLoading } = useBubbleBoard();
  const { hudPosition, defaultFilterMode, bubbleColorMode, unifiedColorHex } = useLenderSettings();
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
    <div className="bubble-viewport">
      {/* z-0: High-tech grid background */}
      <div className="tech-grid z-0" />
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="scan-line" />
      </div>

      {/* z-1: Bubble board or demo */}
      <div className="absolute inset-0 z-[1]">
        {isDemo ? (
          <DemoBubbleBoard autoMatch={autoMatch} bubbleColorMode={bubbleColorMode} unifiedColorHex={unifiedColorHex} />
        ) : tradesLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300/60">
            <span className="text-3xl animate-pulse">🫧</span>
            <p className="text-sm font-medium mt-2 font-mono">Loading bubbles...</p>
          </div>
        ) : (
          <BubbleBoard
            trades={trades}
            onQuickTap={handleQuickTap}
            onLongPress={handleLongPress}
            filters={filters}
            hudPosition={hudPosition}
            bubbleColorMode={bubbleColorMode}
            unifiedColorHex={unifiedColorHex}
          />
        )}
      </div>

      {/* z-10: HUD */}
      <LenderHud
        pot={initialPot}
        autoMatch={autoMatch}
        onAutoMatchToggle={handleAutoMatchToggle}
        position={hudPosition}
      />

      {/* z-10: Filter bar */}
      {!isDemo && (
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          mode={filterMode}
          onModeChange={setFilterMode}
        />
      )}

      {/* z-10: Risk legend */}
      <RiskLegend />

      {/* z-20: Tooltip */}
      <BubbleTooltip
        trade={tooltipTrade}
        position={tooltipPos}
        onDismiss={handleDismissTooltip}
      />

      {/* z-50: Trade detail modal */}
      <TradeDetailModal
        trade={selectedTrade}
        open={selectedTradeId !== null}
        onClose={handleCloseModal}
        onFund={handleFundTrade}
      />
    </div>
  );
}
