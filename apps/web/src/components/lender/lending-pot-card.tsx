"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";
import { formatCurrency } from "@flowzo/shared";
import { toast } from "sonner";

interface LendingPotCardProps {
  pot: {
    available_pence: number;
    locked_pence: number;
    total_deployed_pence: number;
    realized_yield_pence: number;
  } | null;
  onPotUpdated?: () => void;
}

const TOP_UP_AMOUNTS = [1000, 5000, 10000, 50000]; // pence
const APY_STORAGE_KEY = "flowzo-preferred-apy";

export function LendingPotCard({ pot, onPotUpdated }: LendingPotCardProps) {
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [preferredApy, setPreferredApy] = useState(8);

  // Load saved APY preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(APY_STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 25) {
        setPreferredApy(parsed);
      }
    }
  }, []);

  function handleApyChange(value: number[]) {
    const apy = value[0];
    setPreferredApy(apy);
    localStorage.setItem(APY_STORAGE_KEY, String(apy));
  }

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

  // APY risk label
  const apyLabel =
    preferredApy <= 6
      ? "Conservative"
      : preferredApy <= 12
        ? "Balanced"
        : preferredApy <= 18
          ? "Growth"
          : "Aggressive";

  const apyColor =
    preferredApy <= 6
      ? "text-success"
      : preferredApy <= 12
        ? "text-navy"
        : preferredApy <= 18
          ? "text-warning"
          : "text-danger";

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

        {/* APY Preference Slider */}
        <div className="rounded-xl bg-soft-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-navy">Preferred APY</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-extrabold ${apyColor}`}>
                {preferredApy}%
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${apyColor}`}>
                {apyLabel}
              </span>
            </div>
          </div>

          <RangeSlider
            value={[preferredApy]}
            onValueChange={handleApyChange}
            min={1}
            max={25}
            step={1}
            aria-label="Preferred APY"
          />

          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>1% -- Lower risk</span>
            <span>25% -- Higher risk</span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Trades matching your target APY will be auto-funded when auto-match is on.
            Higher APY = higher risk borrowers.
          </p>
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
