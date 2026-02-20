"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BidSlider } from "@/components/borrower/bid-slider";
import { ProbabilityCurve } from "@/components/borrower/probability-curve";

interface TradeDetailClientProps {
  trade: {
    id: string;
    amount_pence: number;
    fee_pence: number;
    shift_days: number;
    risk_grade: string;
  };
}

export function TradeDetailClient({ trade }: TradeDetailClientProps) {
  const [currentFeePence, setCurrentFeePence] = useState(trade.fee_pence);
  const router = useRouter();

  const handleSliderChange = useCallback((feePence: number) => {
    setCurrentFeePence(feePence);
  }, []);

  const handleSubmit = useCallback(
    async (feePence: number) => {
      try {
        // Update the trade fee and submit it
        const response = await fetch(`/api/trades/${trade.id}/bid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fee_pence: feePence }),
        });

        if (!response.ok) {
          throw new Error("Failed to place bid");
        }

        router.refresh();
      } catch (err) {
        console.error("Failed to place bid:", err);
      }
    },
    [trade.id, router],
  );

  return (
    <div className="space-y-6">
      <BidSlider
        trade={{
          amount_pence: trade.amount_pence,
          fee_pence: trade.fee_pence,
          shift_days: trade.shift_days,
          risk_grade: trade.risk_grade,
        }}
        onChange={handleSliderChange}
        onSubmit={(feePence) => {
          setCurrentFeePence(feePence);
          handleSubmit(feePence);
        }}
      />

      <ProbabilityCurve
        currentFeePence={currentFeePence}
        agentFeePence={trade.fee_pence}
        amountPence={trade.amount_pence}
        riskGrade={trade.risk_grade}
      />
    </div>
  );
}
