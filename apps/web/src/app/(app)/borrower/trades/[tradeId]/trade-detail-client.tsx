"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface TradeDetailClientProps {
  trade: {
    id: string;
    fee_pence: number;
  };
  status: "DRAFT" | "PENDING_MATCH";
}

export function TradeDetailClient({ trade, status }: TradeDetailClientProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

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

  // PENDING_MATCH — show waiting state
  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5 text-center">
      <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-3">
        <div className="w-5 h-5 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
      <h3 className="text-base font-bold text-navy">Finding a lender...</h3>
      <p className="text-sm text-text-secondary mt-1">
        This usually takes less than a minute.
      </p>
    </div>
  );
}
