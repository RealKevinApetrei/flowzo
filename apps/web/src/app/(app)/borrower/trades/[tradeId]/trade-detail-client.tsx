"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/lib/hooks/use-realtime";

interface TradeDetailClientProps {
  trade: {
    id: string;
    fee_pence: number;
    created_at?: string;
  };
  status: "DRAFT" | "PENDING_MATCH";
}

export function TradeDetailClient({ trade, status }: TradeDetailClientProps) {
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const router = useRouter();

  // Realtime: listen for status changes on this trade
  const onTradeUpdate = useCallback(
    (record: { status?: string }) => {
      if (!record.status) return;
      if (record.status === "MATCHED") {
        toast.success("Matched! A lender has been found.");
        router.refresh();
      } else if (record.status === "LIVE") {
        toast.success("Your shift is now live.");
        router.refresh();
      } else if (record.status === "CANCELLED") {
        toast.error("Trade was cancelled.");
        router.refresh();
      }
    },
    [router],
  );

  useRealtime("trades", {
    filter: `id=eq.${trade.id}`,
    onUpdate: onTradeUpdate,
  });

  // Elapsed time counter for PENDING_MATCH
  useEffect(() => {
    if (status !== "PENDING_MATCH") return;

    // Calculate initial elapsed from created_at
    if (trade.created_at) {
      const diff = Math.floor(
        (Date.now() - new Date(trade.created_at).getTime()) / 1000,
      );
      setElapsed(Math.max(0, diff));
    }

    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, trade.created_at]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/trades/${trade.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee_pence: trade.fee_pence }),
      });

      if (!response.ok) {
        throw new Error("Failed to confirm shift");
      }

      toast.success("Shift confirmed! Finding a lender...");
      router.refresh();
    } catch (err) {
      console.error("Failed to confirm shift:", err);
      toast.error("Failed to confirm. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "DRAFT") {
    return (
      <Button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? "Confirming..." : "Confirm this shift"}
      </Button>
    );
  }

  // PENDING_MATCH — show waiting state with elapsed timer
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const isSlow = elapsed >= 300; // 5 minutes

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5 text-center">
      <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-3">
        <div className="w-5 h-5 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
      <h3 className="text-base font-bold text-navy">Finding a lender...</h3>
      <p className="text-sm text-text-secondary mt-1">
        {isSlow
          ? "Taking longer than usual. We'll notify you when matched."
          : "This usually takes less than a minute."}
      </p>
      <p className="text-xs text-text-muted mt-2 tabular-nums">
        {minutes > 0 ? `${minutes}m ` : ""}{String(seconds).padStart(2, "0")}s
      </p>
      {isSlow && (
        <div className="mt-3 rounded-xl bg-warning/10 border border-warning/20 p-3">
          <p className="text-xs text-warning font-medium">
            Market liquidity may be low. Your trade will remain active for up to 48 hours.
          </p>
        </div>
      )}
    </div>
  );
}
