"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@flowzo/shared";
import { toast } from "sonner";

interface LendingPotCardProps {
  pot: {
    available_pence: number;
    locked_pence: number;
    total_deployed_pence: number;
    realized_yield_pence: number;
  } | null;
  withdrawalQueued: boolean;
  onPotUpdated?: () => void;
  onWithdraw: (amountPence: number) => Promise<void>;
  onQueueWithdrawal: () => Promise<void>;
  onCancelQueuedWithdrawal: () => Promise<void>;
}

const TOP_UP_AMOUNTS = [1000, 5000, 10000, 50000]; // pence

export function LendingPotCard({
  pot,
  withdrawalQueued,
  onPotUpdated,
  onWithdraw,
  onQueueWithdrawal,
  onCancelQueuedWithdrawal,
}: LendingPotCardProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const available = pot?.available_pence ?? 0;
  const locked = pot?.locked_pence ?? 0;
  const totalDeployed = pot?.total_deployed_pence ?? 0;
  const yieldEarned = pot?.realized_yield_pence ?? 0;

  const total = locked + available;
  const utilization = total > 0 ? locked / total : 0;
  const utilizationPct = Math.round(utilization * 100);

  // SVG ring dimensions
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - utilization);

  async function handleTopUp(amountPence: number) {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_pence: amountPence }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Top-up failed");
      }

      toast.success(`Topped up ${formatCurrency(amountPence)}`);
      setShowTopUp(false);
      setCustomAmount("");
      onPotUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomTopUp() {
    const pounds = parseFloat(customAmount);
    if (isNaN(pounds) || pounds <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const pence = Math.round(pounds * 100);
    handleTopUp(pence);
  }

  async function handleWithdraw() {
    if (available <= 0) return;
    setLoading(true);
    try {
      await onWithdraw(available);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-coral/10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-coral" aria-label="Lending pot">
              <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" />
              <path d="M2 9.5a2.5 2.5 0 010-5" />
            </svg>
          </div>
          <CardTitle>Lending Pot</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Main balance + utilization ring */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">Available to lend</p>
            <p className="text-4xl font-extrabold text-navy tracking-tight">
              {formatCurrency(available)}
            </p>
          </div>

          {/* Utilization ring */}
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90"
            >
              {/* Background track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-warm-grey"
                strokeWidth={strokeWidth}
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-warning transition-all duration-700 ease-out"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <span className="absolute text-xs font-bold text-navy">
              {utilizationPct}%
            </span>
          </div>
        </div>

        {/* Stat rows */}
        <div className="space-y-3">
          <StatRow
            label="Locked"
            sublabel="In active trades"
            value={formatCurrency(locked)}
            dotColor="bg-warning"
          />
          <StatRow
            label="Total deployed"
            sublabel="All time"
            value={formatCurrency(totalDeployed)}
            dotColor="bg-text-secondary"
          />
          <StatRow
            label="Yield earned"
            sublabel="Realised profit"
            value={formatCurrency(yieldEarned)}
            dotColor="bg-success"
            valueColor="text-success"
          />
        </div>

        {/* Withdrawal queue banner */}
        {withdrawalQueued && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-3.5">
            <div className="flex items-start gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warning shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">Withdrawal queued</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {formatCurrency(locked)} will auto-withdraw as trades settle
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-text-secondary"
              onClick={onCancelQueuedWithdrawal}
              disabled={loading}
            >
              Cancel queue
            </Button>
          </div>
        )}

        {/* Top Up section */}
        {showTopUp ? (
          <div className="space-y-3">
            {/* Current balance context */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Current pot balance</span>
              <span className="font-bold text-navy">{formatCurrency(total)}</span>
            </div>

            <p className="text-sm font-medium text-navy">Select amount</p>
            <div className="grid grid-cols-2 gap-2">
              {TOP_UP_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleTopUp(amount)}
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary font-medium">
                  £
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-warm-grey bg-soft-white text-navy placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                  disabled={loading}
                />
              </div>
              <Button
                size="sm"
                disabled={loading || !customAmount}
                onClick={handleCustomTopUp}
              >
                Top Up
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setShowTopUp(false);
                setCustomAmount("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setShowTopUp(true)}
            >
              Top Up Pot
            </Button>

            {/* Withdraw available */}
            {available > 0 && (
              <Button
                variant="ghost"
                className="w-full text-text-secondary"
                size="sm"
                onClick={handleWithdraw}
                disabled={loading}
              >
                Withdraw {formatCurrency(available)}
              </Button>
            )}

            {/* Queue withdrawal for locked funds */}
            {locked > 0 && !withdrawalQueued && (
              <button
                className="w-full text-center text-xs text-text-muted hover:text-coral transition-colors py-1"
                onClick={onQueueWithdrawal}
                disabled={loading}
              >
                Want to withdraw locked funds? Queue withdrawal
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({
  label,
  sublabel,
  value,
  dotColor,
  valueColor = "text-navy",
}: {
  label: string;
  sublabel: string;
  value: string;
  dotColor: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-warm-grey last:border-0">
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <div>
          <p className="text-sm font-medium text-navy">{label}</p>
          <p className="text-xs text-text-secondary">{sublabel}</p>
        </div>
      </div>
      <p className={`text-sm font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
