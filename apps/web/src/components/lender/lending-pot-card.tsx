"use client";

import { useState, useEffect, useMemo } from "react";
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

// Risk grade definitions for the match probability breakdown
const RISK_GRADES = [
  { grade: "A", label: "Grade A", description: "Low risk, reliable borrowers", baseApyRange: [3, 8] },
  { grade: "B", label: "Grade B", description: "Moderate risk, steady history", baseApyRange: [7, 15] },
  { grade: "C", label: "Grade C", description: "Higher risk, higher returns", baseApyRange: [12, 25] },
] as const;

/** Estimate match probability for a risk grade at a given target APY */
function estimateMatchProbability(targetApy: number, gradeMin: number, gradeMax: number): number {
  // If target APY is below the grade's range, very high probability (lender is offering cheap money)
  if (targetApy <= gradeMin) return 95;
  // If target APY is above the grade's range, very low probability (too expensive for this grade)
  if (targetApy > gradeMax + 3) return 2;
  // Within range: probability drops as APY gets higher within the grade's sweet spot
  const midpoint = (gradeMin + gradeMax) / 2;
  if (targetApy <= midpoint) {
    // Below midpoint: high probability, scales 95 -> 70
    const t = (targetApy - gradeMin) / (midpoint - gradeMin);
    return Math.round(95 - t * 25);
  }
  // Above midpoint: probability drops off, scales 70 -> 15
  const t = (targetApy - midpoint) / (gradeMax + 3 - midpoint);
  return Math.max(5, Math.round(70 - t * 55));
}

export function LendingPotCard({ pot, onPotUpdated }: LendingPotCardProps) {
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [preferredApy, setPreferredApy] = useState(8);
  const [showBreakdown, setShowBreakdown] = useState(false);

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

  // Compute match probabilities for each risk grade
  const gradeBreakdown = useMemo(
    () =>
      RISK_GRADES.map((g) => ({
        ...g,
        probability: estimateMatchProbability(preferredApy, g.baseApyRange[0], g.baseApyRange[1]),
      })),
    [preferredApy],
  );

  // Overall match probability (weighted average, A has more volume)
  const overallProbability = useMemo(() => {
    const weights = [0.5, 0.35, 0.15]; // A trades are more common
    return Math.round(
      gradeBreakdown.reduce((sum, g, i) => sum + g.probability * weights[i], 0),
    );
  }, [gradeBreakdown]);

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

        {/* Yield Preference — slider + collapsible breakdown */}
        <div className="rounded-xl bg-soft-white p-4 space-y-3">
          {/* Slider header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-navy">Target Yield</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-extrabold ${apyColor}`}>
                {preferredApy}%
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${apyColor}`}>
                {apyLabel}
              </span>
            </div>
          </div>

          {/* APY slider */}
          <RangeSlider
            value={[preferredApy]}
            onValueChange={handleApyChange}
            min={1}
            max={25}
            step={1}
            aria-label="Target yield APY"
          />

          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>1% — Lower risk</span>
            <span>25% — Higher risk</span>
          </div>

          {/* Overall match probability */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary">Match probability</p>
            <span className={`text-sm font-bold ${
              overallProbability >= 60
                ? "text-success"
                : overallProbability >= 30
                  ? "text-warning"
                  : "text-danger"
            }`}>
              {overallProbability}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-warm-grey overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                overallProbability >= 60
                  ? "bg-success"
                  : overallProbability >= 30
                    ? "bg-warning"
                    : "bg-danger"
              }`}
              style={{ width: `${overallProbability}%` }}
            />
          </div>

          {/* Collapsible breakdown by risk grade */}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1.5 text-xs font-medium text-coral hover:text-coral-dark transition-colors w-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform duration-200 ${showBreakdown ? "rotate-90" : ""}`}
            >
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Breakdown by risk grade
          </button>

          {showBreakdown && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {gradeBreakdown.map((g) => (
                <div key={g.grade} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                        g.grade === "A"
                          ? "bg-success"
                          : g.grade === "B"
                            ? "bg-warning"
                            : "bg-danger"
                      }`}>
                        {g.grade}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-navy">{g.label}</p>
                        <p className="text-[10px] text-text-muted">{g.description}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${
                      g.probability >= 60
                        ? "text-success"
                        : g.probability >= 30
                          ? "text-warning"
                          : "text-danger"
                    }`}>
                      {g.probability}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-warm-grey overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${
                        g.grade === "A"
                          ? "bg-success"
                          : g.grade === "B"
                            ? "bg-warning"
                            : "bg-danger"
                      }`}
                      style={{ width: `${g.probability}%` }}
                    />
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-text-muted leading-relaxed pt-1">
                Match probability is estimated based on current market demand.
                Lower APY targets match more Grade A borrowers.
              </p>
            </div>
          )}
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
