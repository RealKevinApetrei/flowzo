"use client";

import { useState, useTransition, useCallback } from "react";
import { useBubbleBoard } from "@/lib/hooks/use-bubble-board";
import { toggleAutoMatch, fundTrade } from "@/lib/actions/lending";
import { AutoPopToggle } from "./auto-pop-toggle";
import { LendingPotCard } from "./lending-pot-card";
import { BubbleBoard } from "./bubble-board";
import { YieldDashboard } from "./yield-dashboard";
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
  const [autoMatch, setAutoMatch] = useState(initialAutoMatch);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTrade = selectedTradeId
    ? trades.find((t) => t.id === selectedTradeId) ?? null
    : null;

  const handleAutoMatchToggle = useCallback(
    (enabled: boolean) => {
      setAutoMatch(enabled);
      startTransition(async () => {
        try {
          await toggleAutoMatch(enabled);
        } catch {
          // Revert on failure
          setAutoMatch(!enabled);
        }
      });
    },
    [],
  );

  const handleBubbleClick = useCallback((tradeId: string) => {
    setSelectedTradeId(tradeId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedTradeId(null);
  }, []);

  const handleFundTrade = useCallback(
    async (tradeId: string) => {
      startTransition(async () => {
        try {
          await fundTrade(tradeId);
          setSelectedTradeId(null);
        } catch (err) {
          console.error("Failed to fund trade:", err);
        }
      });
    },
    [],
  );

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
      {/* Auto-Pop Toggle */}
      <AutoPopToggle
        enabled={autoMatch}
        onToggle={handleAutoMatchToggle}
      />

      {/* Lending Pot */}
      <LendingPotCard pot={initialPot} />

      {/* Bubble Board */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Bubble Board</h2>
        {tradesLoading ? (
          <div className="bg-warm-grey rounded-2xl min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-text-secondary">
              <span className="text-3xl animate-pulse">🫧</span>
              <p className="text-sm font-medium">Loading bubbles...</p>
            </div>
          </div>
        ) : (
          <BubbleBoard
            trades={trades}
            onBubbleClick={handleBubbleClick}
          />
        )}
      </section>

      {/* Yield Dashboard */}
      <YieldDashboard stats={initialYieldStats} />

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        open={selectedTradeId !== null}
        onClose={handleCloseModal}
        onFund={handleFundTrade}
      />
    </div>
  );
}
