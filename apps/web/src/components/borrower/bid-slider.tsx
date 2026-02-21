"use client";

import { useState, useMemo } from "react";
import { formatCurrency, calculateImpliedAPR } from "@flowzo/shared";
import { Button } from "@/components/ui/button";

interface BidSliderProps {
  trade: {
    amount_pence: number;
    fee_pence: number;
    shift_days: number;
    risk_grade: string;
  };
  onSubmit: (feePence: number) => void;
  onChange?: (feePence: number) => void;
}

export function BidSlider({ trade, onSubmit, onChange }: BidSliderProps) {
  const maxFee = Math.round(trade.fee_pence * 1.5);
  const agentFee = trade.fee_pence;

  const [feePence, setFeePence] = useState(agentFee);
  const [submitting, setSubmitting] = useState(false);

  const isAgentPick = feePence === agentFee;
  const apr = useMemo(
    () => calculateImpliedAPR(feePence, trade.amount_pence, trade.shift_days),
    [feePence, trade.amount_pence, trade.shift_days],
  );

  // Calculate slider percentage for the agent pick marker position
  const agentPickPercent = maxFee > 0 ? (agentFee / maxFee) * 100 : 0;
  const currentPercent = maxFee > 0 ? (feePence / maxFee) * 100 : 0;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      onSubmit(feePence);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      <h2 className="text-lg font-bold text-navy mb-1">Set Your Fee</h2>
      <p className="text-sm text-text-secondary mb-5">
        Choose how much you&apos;re willing to pay a lender
      </p>

      {/* Current fee display */}
      <div className="text-center mb-6">
        <p className="text-3xl font-extrabold text-navy">{formatCurrency(feePence)}</p>
        <p className="text-sm text-text-muted mt-1">
          {apr.toFixed(1)}% APR equivalent
        </p>
      </div>

      {/* Slider */}
      <div className="relative px-1">
        {/* Agent pick marker */}
        <div
          className="absolute -top-6 flex flex-col items-center transition-all duration-150"
          style={{ left: `calc(${agentPickPercent}% - 1px)` }}
        >
          <span className="text-[9px] font-bold text-coral whitespace-nowrap bg-coral/10 px-1.5 py-0.5 rounded">
            Agent pick
          </span>
          <div className="w-0.5 h-2 bg-coral rounded-full" />
        </div>

        {/* Track background */}
        <div className="relative h-2 bg-warm-grey rounded-full">
          {/* Filled portion */}
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-danger via-warning to-success transition-all duration-150"
            style={{ width: `${currentPercent}%` }}
          />
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={maxFee}
          step={1}
          value={feePence}
          onChange={(e) => {
            const val = Number(e.target.value);
            setFeePence(val);
            onChange?.(val);
          }}
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
          style={{ top: "0" }}
        />

        {/* Custom thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-3 border-coral shadow-md transition-all duration-150 pointer-events-none"
          style={{ left: `calc(${currentPercent}% - 12px)`, marginTop: "0px" }}
        />
      </div>

      {/* Range labels */}
      <div className="flex items-center justify-between mt-3 text-[10px] text-text-muted">
        <span>{formatCurrency(0)}</span>
        <span>{formatCurrency(maxFee)}</span>
      </div>

      {/* Agent pick indicator */}
      {isAgentPick && (
        <div className="mt-4 flex items-center gap-2 bg-coral/5 rounded-xl px-3.5 py-2.5 border border-coral/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-coral flex-shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs font-medium text-coral">
            Agent pick = instant fill
          </span>
        </div>
      )}

      {/* Trade info summary */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="bg-soft-white rounded-lg py-2.5">
          <p className="text-[10px] text-text-muted">Amount</p>
          <p className="text-sm font-bold text-navy">{formatCurrency(trade.amount_pence)}</p>
        </div>
        <div className="bg-soft-white rounded-lg py-2.5">
          <p className="text-[10px] text-text-muted">Shift</p>
          <p className="text-sm font-bold text-navy">{trade.shift_days}d</p>
        </div>
        <div className="bg-soft-white rounded-lg py-2.5">
          <p className="text-[10px] text-text-muted">Risk</p>
          <p className="text-sm font-bold text-navy">{trade.risk_grade}</p>
        </div>
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || feePence === 0}
        className="w-full mt-5"
        size="lg"
      >
        {submitting
          ? "Placing bid..."
          : isAgentPick
            ? "Use Agent Pick"
            : "Place Bid"}
      </Button>
    </div>
  );
}
