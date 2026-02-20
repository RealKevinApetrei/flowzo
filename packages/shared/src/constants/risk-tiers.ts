import type { RiskGrade } from "../types/trades";

export interface RiskTierConfig {
  grade: RiskGrade;
  label: string;
  color: string;
  bgColor: string;
  maxShiftedAmount: number;
  maxShiftDays: number;
  maxActiveTrades: number;
}

export const RISK_TIERS: Record<RiskGrade, RiskTierConfig> = {
  A: {
    grade: "A",
    label: "Low Risk",
    color: "text-green-600",
    bgColor: "bg-green-100",
    maxShiftedAmount: 50000,
    maxShiftDays: 14,
    maxActiveTrades: 5,
  },
  B: {
    grade: "B",
    label: "Medium Risk",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    maxShiftedAmount: 20000,
    maxShiftDays: 10,
    maxActiveTrades: 3,
  },
  C: {
    grade: "C",
    label: "Higher Risk",
    color: "text-red-600",
    bgColor: "bg-red-100",
    maxShiftedAmount: 7500,
    maxShiftDays: 7,
    maxActiveTrades: 1,
  },
};
