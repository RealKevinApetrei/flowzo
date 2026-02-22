"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { formatCurrency } from "@flowzo/shared";

// Simulated data matching the real match-trade Edge Function logic
const DEMO_TRADE = {
  id: "trade-demo-001",
  borrower: "Alice M.",
  obligation: "Council Tax",
  amount_pence: 14800,
  fee_pence: 125,
  shift_days: 6,
  risk_grade: "B",
  apr_bps: 1240,
};

const DEMO_LENDERS = [
  { id: "L1", name: "Lender A", available_pence: 50000, risk_bands: ["A", "B"], max_shift_days: 14, min_apr_bps: 800, exposure_pence: 12000 },
  { id: "L2", name: "Lender B", available_pence: 30000, risk_bands: ["B", "C"], max_shift_days: 7, min_apr_bps: 1000, exposure_pence: 5000 },
  { id: "L3", name: "Lender C", available_pence: 20000, risk_bands: ["A"], max_shift_days: 10, min_apr_bps: 600, exposure_pence: 40000 },
  { id: "L4", name: "Lender D", available_pence: 8000, risk_bands: ["A", "B", "C"], max_shift_days: 5, min_apr_bps: 1200, exposure_pence: 2000 },
];

interface ScoredLender {
  id: string;
  name: string;
  eligible: boolean;
  reason?: string;
  aprScore: number;
  headroomScore: number;
  diversificationScore: number;
  totalScore: number;
  allocation_pence: number;
  fee_slice_pence: number;
}

const MAX_SINGLE_LENDER_PCT = 0.5;
const PLATFORM_FEE_PCT = 0.20;

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS = [
  "Trade Submitted",
  "ML Risk Scoring",
  "Filter Eligible Lenders",
  "Score & Rank Lenders",
  "Allocate Funds",
  "Fee Split (Tranche)",
  "Match Complete",
];

export function MatchingDemo() {
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Compute scored lenders based on demo data
  const scoredLenders = useMemo(() => {
    const trade = DEMO_TRADE;
    const results: ScoredLender[] = DEMO_LENDERS.map((lender) => {
      // Eligibility check
      const riskMatch = lender.risk_bands.includes(trade.risk_grade);
      const daysMatch = lender.max_shift_days >= trade.shift_days;
      const eligible = riskMatch && daysMatch;
      const reason = !riskMatch
        ? `Risk band ${trade.risk_grade} not in [${lender.risk_bands.join(", ")}]`
        : !daysMatch
          ? `Max ${lender.max_shift_days}d < ${trade.shift_days}d shift`
          : undefined;

      // Score (only meaningful if eligible)
      // APR compatibility (40%): how close trade APR is to lender min
      const aprDiff = Math.abs(trade.apr_bps - lender.min_apr_bps);
      const aprScore = eligible ? Math.max(0, 1 - aprDiff / 2000) * 40 : 0;

      // Headroom (30%): available funds relative to trade amount
      const headroom = lender.available_pence / trade.amount_pence;
      const headroomScore = eligible ? Math.min(1, headroom / 2) * 30 : 0;

      // Diversification (30%): lower existing exposure = better
      const diversification = 1 / (1 + lender.exposure_pence / 10000);
      const diversificationScore = eligible ? diversification * 30 : 0;

      const totalScore = Math.round((aprScore + headroomScore + diversificationScore) * 10) / 10;

      return {
        id: lender.id,
        name: lender.name,
        eligible,
        reason,
        aprScore: Math.round(aprScore * 10) / 10,
        headroomScore: Math.round(headroomScore * 10) / 10,
        diversificationScore: Math.round(diversificationScore * 10) / 10,
        totalScore,
        allocation_pence: 0,
        fee_slice_pence: 0,
      };
    });

    // Allocate funds from ranked eligible lenders
    const eligible = results.filter((l) => l.eligible).sort((a, b) => b.totalScore - a.totalScore);
    let remaining = trade.amount_pence;
    const maxPerLender = Math.round(trade.amount_pence * MAX_SINGLE_LENDER_PCT);

    for (const lender of eligible) {
      if (remaining <= 0) break;
      const source = DEMO_LENDERS.find((l) => l.id === lender.id)!;
      const canAllocate = Math.min(remaining, source.available_pence, maxPerLender);
      lender.allocation_pence = canAllocate;
      // Senior tranche: lender gets 80% of proportional fee
      const proportion = canAllocate / trade.amount_pence;
      lender.fee_slice_pence = Math.round(trade.fee_pence * proportion * (1 - PLATFORM_FEE_PCT));
      remaining -= canAllocate;
    }

    return results;
  }, []);

  // Auto-scroll to latest step
  useEffect(() => {
    if (currentStep > 0) {
      const id = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
      return () => clearTimeout(id);
    }
  }, [currentStep]);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= 6) {
      const stop = setTimeout(() => setIsPlaying(false), 0);
      return () => clearTimeout(stop);
    }
    const timer = setTimeout(() => {
      setCurrentStep((s) => Math.min(6, s + 1) as Step);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const play = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  const eligibleLenders = scoredLenders.filter((l) => l.eligible);
  const allocatedLenders = eligibleLenders.filter((l) => l.allocation_pence > 0);
  const totalAllocated = allocatedLenders.reduce((s, l) => s + l.allocation_pence, 0);
  const isFullyMatched = totalAllocated >= DEMO_TRADE.amount_pence;
  const platformFee = Math.round(DEMO_TRADE.fee_pence * PLATFORM_FEE_PCT);
  const lenderFeeTotal = DEMO_TRADE.fee_pence - platformFee;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-navy">Matching Engine</h2>
          <span className="text-[10px] font-bold text-white bg-navy/70 px-2 py-0.5 rounded-full">
            DEV
          </span>
        </div>
        <button
          onClick={play}
          className="flex items-center gap-1.5 text-xs font-semibold text-coral hover:text-coral/80 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
          </svg>
          {isPlaying ? "Playing..." : "Run Demo"}
        </button>
      </div>

      {/* Step progress */}
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                    i < currentStep
                      ? "bg-success text-white"
                      : i === currentStep
                        ? "bg-coral text-white scale-110"
                        : "bg-warm-grey text-text-muted"
                  }`}
                >
                  {i < currentStep ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-[8px] mt-1 text-center leading-tight ${
                  i === currentStep ? "text-coral font-bold" : "text-text-muted"
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full bg-warm-grey overflow-hidden">
            <div
              className="h-full rounded-full bg-coral transition-all duration-500"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="px-4 pb-4">
          {/* Step 0: Trade submitted */}
          {currentStep >= 0 && (
            <div className={`rounded-xl bg-soft-white p-3 mt-2 transition-opacity duration-300 ${currentStep === 0 ? "ring-2 ring-coral/30" : ""}`}>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">Incoming Trade</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-navy">{DEMO_TRADE.obligation} -- {DEMO_TRADE.borrower}</p>
                  <p className="text-xs text-text-secondary">
                    {DEMO_TRADE.shift_days}d shift | Grade {DEMO_TRADE.risk_grade} | {(DEMO_TRADE.apr_bps / 100).toFixed(1)}% APR
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy">{formatCurrency(DEMO_TRADE.amount_pence)}</p>
                  <p className="text-[10px] text-coral">fee {formatCurrency(DEMO_TRADE.fee_pence)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: ML scoring */}
          {currentStep >= 1 && (
            <div className={`rounded-xl bg-soft-white p-3 mt-2 transition-opacity duration-300 ${currentStep === 1 ? "ring-2 ring-coral/30" : ""}`}>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">ML Re-scoring</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-600">
                    <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-navy">Quant API risk assessment</p>
                  <p className="text-[10px] text-text-secondary">PD: 2.1% | LGD: 45% | EL: 0.95% | Grade: {DEMO_TRADE.risk_grade}</p>
                </div>
                <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">Passed</span>
              </div>
            </div>
          )}

          {/* Step 2: Filter eligible */}
          {currentStep >= 2 && (
            <div className={`rounded-xl bg-soft-white p-3 mt-2 transition-opacity duration-300 ${currentStep === 2 ? "ring-2 ring-coral/30" : ""}`}>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">
                Eligibility Filter ({eligibleLenders.length}/{scoredLenders.length} pass)
              </p>
              <div className="space-y-1.5">
                {scoredLenders.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${l.eligible ? "text-navy" : "text-text-muted line-through"}`}>
                      {l.name}
                    </span>
                    {l.eligible ? (
                      <span className="text-[10px] text-success font-semibold">Eligible</span>
                    ) : (
                      <span className="text-[10px] text-danger font-medium">{l.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Score & Rank */}
          {currentStep >= 3 && (
            <div className={`rounded-xl bg-soft-white p-3 mt-2 transition-opacity duration-300 ${currentStep === 3 ? "ring-2 ring-coral/30" : ""}`}>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">
                Lender Scoring (scored_v2)
              </p>
              <div className="text-[9px] text-text-muted flex gap-4 mb-2">
                <span>APR compat: 40%</span>
                <span>Headroom: 30%</span>
                <span>Diversification: 30%</span>
              </div>
              <div className="space-y-2">
                {eligibleLenders
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((l, rank) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-coral w-4">#{rank + 1}</span>
                      <span className="text-xs font-medium text-navy w-16">{l.name}</span>
                      <div className="flex-1 flex items-center gap-1">
                        {/* Stacked score bar */}
                        <div className="flex-1 h-3 rounded-full bg-warm-grey overflow-hidden flex">
                          <div
                            className="h-full bg-blue-400 transition-all duration-500"
                            style={{ width: `${(l.aprScore / 100) * 100}%` }}
                            title={`APR: ${l.aprScore}`}
                          />
                          <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${(l.headroomScore / 100) * 100}%` }}
                            title={`Headroom: ${l.headroomScore}`}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${(l.diversificationScore / 100) * 100}%` }}
                            title={`Diversification: ${l.diversificationScore}`}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-navy w-8 text-right">{l.totalScore}</span>
                    </div>
                  ))}
              </div>
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-[9px] text-text-muted">APR</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-text-muted">Headroom</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[9px] text-text-muted">Diversification</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Allocate */}
          {currentStep >= 4 && (
            <div className={`rounded-xl bg-soft-white p-3 mt-2 transition-opacity duration-300 ${currentStep === 4 ? "ring-2 ring-coral/30" : ""}`}>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">
                Fund Allocation (max {MAX_SINGLE_LENDER_PCT * 100}% per lender)
              </p>
              {/* Allocation bar */}
              <div className="h-6 rounded-full bg-warm-grey overflow-hidden flex mb-2">
                {allocatedLenders.map((l, i) => {
                  const pct = (l.allocation_pence / DEMO_TRADE.amount_pence) * 100;
                  const colors = ["bg-coral", "bg-blue-500", "bg-emerald-500", "bg-amber-500"];
                  return (
                    <div
                      key={l.id}
                      className={`h-full ${colors[i % colors.length]} transition-all duration-500 flex items-center justify-center`}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[8px] font-bold text-white">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
                {!isFullyMatched && (
                  <div className="h-full flex-1 flex items-center justify-center">
                    <span className="text-[8px] text-text-muted">Unfunded</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {allocatedLenders.map((l, i) => {
                  const colors = ["text-coral", "text-blue-500", "text-emerald-500", "text-amber-500"];
                  return (
                    <div key={l.id} className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${colors[i % colors.length]}`}>{l.name}</span>
                      <span className="text-navy font-semibold">{formatCurrency(l.allocation_pence)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-warm-grey flex items-center justify-between text-xs">
                <span className="text-text-muted">Total allocated</span>
                <span className="font-bold text-navy">
                  {formatCurrency(totalAllocated)} / {formatCurrency(DEMO_TRADE.amount_pence)}
                </span>
              </div>
            </div>
          )}

          {/* Step 5: Fee tranche */}
          {currentStep >= 5 && (
            <div className={`rounded-xl bg-soft-white p-3 mt-2 transition-opacity duration-300 ${currentStep === 5 ? "ring-2 ring-coral/30" : ""}`}>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">
                Fee Split (Senior / Junior Tranche)
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg bg-success/10 p-2.5 text-center">
                  <p className="text-[10px] text-success font-bold">Lender Pool (80%)</p>
                  <p className="text-sm font-bold text-navy">{formatCurrency(lenderFeeTotal)}</p>
                </div>
                <div className="flex-1 rounded-lg bg-coral/10 p-2.5 text-center">
                  <p className="text-[10px] text-coral font-bold">Platform (20%)</p>
                  <p className="text-sm font-bold text-navy">{formatCurrency(platformFee)}</p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {allocatedLenders.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{l.name} yield</span>
                    <span className="font-semibold text-success">+{formatCurrency(l.fee_slice_pence)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Complete */}
          {currentStep >= 6 && (
            <div className={`rounded-xl p-3 mt-2 transition-opacity duration-300 ${
              isFullyMatched ? "bg-success/10 ring-2 ring-success/30" : "bg-warning/10 ring-2 ring-warning/30"
            }`}>
              <div className="flex items-center gap-2">
                {isFullyMatched ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-success">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-success">Fully Matched</p>
                      <p className="text-[10px] text-text-secondary">
                        Status: PENDING_MATCH → MATCHED | {allocatedLenders.length} lender{allocatedLenders.length !== 1 ? "s" : ""} allocated
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warning">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-warning">Partial Match</p>
                      <p className="text-[10px] text-text-secondary">
                        {formatCurrency(totalAllocated)} of {formatCurrency(DEMO_TRADE.amount_pence)} funded -- waiting for more lenders
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </section>
  );
}
