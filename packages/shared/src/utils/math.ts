import { FEE_CONFIG } from "../constants/fees";
import type { RiskGrade } from "../types/trades";

export function calculateFee(
  amountPence: number,
  shiftDays: number,
  riskGrade: RiskGrade,
  poolUtilization = 0.5,
): { fee: number; annualizedRate: number } {
  const riskMultiplier = FEE_CONFIG.riskMultipliers[riskGrade];
  const utilizationMultiplier = 1.0 + Math.max(poolUtilization - 0.5, 0) * 2.0;
  const rawFee = FEE_CONFIG.baseRatePerDay * amountPence * shiftDays * riskMultiplier * utilizationMultiplier;
  const cappedFee = Math.max(
    FEE_CONFIG.minFee,
    Math.round(Math.min(rawFee, amountPence * FEE_CONFIG.maxFeePercent, FEE_CONFIG.maxFeeAbsolute)),
  );
  const annualizedRate = amountPence > 0 ? (cappedFee / amountPence) * (365 / shiftDays) * 100 : 0;
  return { fee: cappedFee, annualizedRate: Math.round(annualizedRate * 100) / 100 };
}

export function calculateFillProbability(offeredFee: number, marketFee: number, riskGrade: RiskGrade): number {
  if (offeredFee >= marketFee) return 0.95;
  const ratio = offeredFee / marketFee;
  const riskPenalty = riskGrade === "A" ? 0 : riskGrade === "B" ? 0.05 : 0.15;
  return Math.max(0.05, Math.min(0.95, ratio * 0.9 - riskPenalty));
}

export function calculateImpliedAPR(feePence: number, amountPence: number, shiftDays: number): number {
  if (amountPence <= 0 || shiftDays <= 0) return 0;
  return (feePence / amountPence) * (365 / shiftDays) * 100;
}
