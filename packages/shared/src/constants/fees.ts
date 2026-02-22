export const FEE_CONFIG = {
  baseRatePerDay: 0.0005,
  riskMultipliers: { A: 1.0, B: 1.5, C: 2.5 } as const,
  maxFeePercent: 0.05,
  maxFeeAbsolute: 1000,
  minFee: 1,
  /** Platform takes 20% of borrower fee (junior tranche); lenders get 80% (senior tranche) */
  platformFeePercent: 0.20,
} as const;
