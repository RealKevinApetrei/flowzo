export const FEE_CONFIG = {
  // BoE base rate ~4.5% + 2% platform margin = 6.5% base APR
  baseAprPct: 6.5,
  baseRatePerDay: 6.5 / 365 / 100,
  riskMultipliers: { A: 1.0, B: 1.8, C: 2.8 } as const,
  // Term premium: longer shifts carry more risk
  termPremiumPerDay: 0.15,
  maxFeePercent: 0.08,
  maxFeeAbsolute: 2000, // 2000 pence = £20
  minFee: 1, // 1 penny
  /** Platform takes 20% of borrower fee (junior tranche); lenders get 80% (senior tranche) */
  platformFeePercent: 0.20,
} as const;
