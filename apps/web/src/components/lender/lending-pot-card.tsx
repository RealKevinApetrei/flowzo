"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@flowzo/shared";
import { toast } from "sonner";
import { withdrawFromPot, queueWithdrawal, cancelQueuedWithdrawal } from "@/lib/actions/lending";

interface LendingPotCardProps {
  pot: {
    available_pence: number;
    locked_pence: number;
    total_deployed_pence: number;
    realized_yield_pence: number;
  } | null;
  currentApyBps: number;
  withdrawalQueued?: boolean;
  onPotUpdated?: () => void;
}

const TOP_UP_AMOUNTS = [1000, 5000, 10000, 50000]; // pence

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function LendingPotCard({ pot, currentApyBps, withdrawalQueued = false, onPotUpdated }: LendingPotCardProps) {
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawPence, setWithdrawPence] = useState(0);

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
      onPotUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top-up failed");
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
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-warm-grey"
                strokeWidth={strokeWidth}
              />
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

        {/* Current APY */}
        <div className="rounded-xl bg-soft-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Current APY</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Implied from active trades
              </p>
            </div>
            <span className="text-2xl font-extrabold text-success">
              {currentApyBps > 0 ? bpsToPercent(currentApyBps) : "--"}
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

        {/* Top Up -- always visible */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-navy">Top up your pot</p>
          <div className="grid grid-cols-4 gap-2">
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
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium">
                £
              </span>
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full h-11 pl-7 pr-3 rounded-full border-2 border-cool-grey bg-[var(--card-surface)] text-sm font-medium text-navy placeholder:text-text-muted focus:border-coral focus:outline-none transition-colors"
              />
            </div>
            <Button
              disabled={loading || !customAmount || Number(customAmount) <= 0}
              size="lg"
              onClick={() => {
                const pence = Math.round(Number(customAmount) * 100);
                if (pence > 0) {
                  handleTopUp(pence);
                  setCustomAmount("");
                }
              }}
            >
              Top Up
            </Button>
          </div>
        </div>

        {/* Withdraw + Stop Lending */}
        {pot && (
          <div className="space-y-3 pt-3 border-t border-warm-grey">
            {/* Withdraw */}
            {available > 0 && !showWithdraw && (
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => { setWithdrawPence(available); setShowWithdraw(true); }}
              >
                Withdraw
              </Button>
            )}

            {showWithdraw && available > 0 && (
              <div className="rounded-xl bg-soft-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-navy">Withdraw amount</p>
                  <button onClick={() => setShowWithdraw(false)} className="text-xs text-text-muted hover:text-navy">Cancel</button>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={100}
                  max={available}
                  step={100}
                  value={withdrawPence}
                  onChange={(e) => setWithdrawPence(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-coral bg-warm-grey"
                />

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium">£</span>
                    <input
                      type="number"
                      min={1}
                      max={available / 100}
                      step={1}
                      value={(withdrawPence / 100).toFixed(0)}
                      onChange={(e) => {
                        const pence = Math.round(Number(e.target.value) * 100);
                        setWithdrawPence(Math.max(100, Math.min(pence, available)));
                      }}
                      className="w-full h-10 pl-7 pr-3 rounded-full border-2 border-cool-grey bg-[var(--card-surface)] text-sm font-medium text-navy focus:border-coral focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => setWithdrawPence(available)}
                    className="text-xs font-semibold text-coral hover:underline whitespace-nowrap"
                  >
                    Max
                  </button>
                </div>

                <Button
                  className="w-full"
                  disabled={loading || withdrawPence <= 0}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await withdrawFromPot(withdrawPence);
                      toast.success(`Withdrew ${formatCurrency(withdrawPence)}`);
                      setShowWithdraw(false);
                      onPotUpdated?.();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Confirm Withdraw {formatCurrency(withdrawPence)}
                </Button>
              </div>
            )}

            {/* Stop lending / resume lending */}
            {withdrawalQueued ? (
              <Button
                variant="outline"
                className="w-full text-success border-success/30 hover:bg-success/5"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await cancelQueuedWithdrawal();
                    toast.success("Resumed lending");
                    onPotUpdated?.();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to resume");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Resume Lending
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full text-danger border-danger/30 hover:bg-danger/5"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await queueWithdrawal();
                    toast.success("Lending stopped. Funds will be returned as trades settle.");
                    onPotUpdated?.();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to stop lending");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Stop Lending
              </Button>
            )}

            {withdrawalQueued && (
              <p className="text-[10px] text-text-muted text-center">
                Lending is paused. Locked funds will be returned as active trades settle.
              </p>
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
