import { describe, it, expect } from "vitest";
import { calculateFee, calculateFillProbability, calculateImpliedAPR } from "../utils/math";

describe("calculateFee", () => {
  it("applies Grade A risk multiplier (1.0)", () => {
    const { fee } = calculateFee(10000, 7, "A");
    // 0.0005 * 10000 * 7 * 1.0 * 1.0 = 35 pence
    expect(fee).toBe(35);
  });

  it("applies Grade B risk multiplier (1.5)", () => {
    const { fee } = calculateFee(10000, 7, "B");
    // 0.0005 * 10000 * 7 * 1.5 * 1.0 = 52.5 → rounded = 53
    expect(fee).toBe(53);
  });

  it("applies Grade C risk multiplier (2.5)", () => {
    const { fee } = calculateFee(10000, 7, "C");
    // 0.0005 * 10000 * 7 * 2.5 * 1.0 = 87.5 → rounded = 88
    expect(fee).toBe(88);
  });

  it("enforces minimum fee of 1 pence", () => {
    const { fee } = calculateFee(1, 1, "A");
    expect(fee).toBeGreaterThanOrEqual(1);
  });

  it("caps fee at 5% of amount", () => {
    const amount = 100000;
    const { fee } = calculateFee(amount, 365, "C");
    expect(fee).toBeLessThanOrEqual(amount * 0.05);
  });

  it("caps fee at absolute maximum of 1000 pence", () => {
    const { fee } = calculateFee(10_000_000, 365, "C");
    expect(fee).toBeLessThanOrEqual(1000);
  });

  it("returns a positive annualizedRate", () => {
    const { annualizedRate } = calculateFee(10000, 7, "A");
    expect(annualizedRate).toBeGreaterThan(0);
  });

  it("Grade C charges more than Grade A for same loan", () => {
    const { fee: feeA } = calculateFee(10000, 7, "A");
    const { fee: feeC } = calculateFee(10000, 7, "C");
    expect(feeC).toBeGreaterThan(feeA);
  });
});

describe("calculateFillProbability", () => {
  it("returns ~0.95 when offered fee equals market fee", () => {
    expect(calculateFillProbability(100, 100, "A")).toBe(0.95);
  });

  it("returns ~0.95 when offered fee exceeds market fee", () => {
    expect(calculateFillProbability(120, 100, "A")).toBe(0.95);
  });

  it("returns lower probability when offered fee is below market", () => {
    const prob = calculateFillProbability(50, 100, "A");
    expect(prob).toBeLessThan(0.95);
    expect(prob).toBeGreaterThanOrEqual(0.05);
  });

  it("Grade C has lower fill probability than Grade A at same fee ratio", () => {
    const probA = calculateFillProbability(80, 100, "A");
    const probC = calculateFillProbability(80, 100, "C");
    expect(probC).toBeLessThan(probA);
  });

  it("never returns below 0.05 or above 0.95", () => {
    const veryLow = calculateFillProbability(1, 100, "C");
    const veryHigh = calculateFillProbability(999, 100, "A");
    expect(veryLow).toBeGreaterThanOrEqual(0.05);
    expect(veryHigh).toBeLessThanOrEqual(0.95);
  });
});

describe("calculateImpliedAPR", () => {
  it("calculates APR correctly for a known case", () => {
    // £1 fee on £100 over 7 days → (1/100) * (365/7) * 100 ≈ 52.14%
    const apr = calculateImpliedAPR(100, 10000, 7);
    expect(apr).toBeCloseTo(52.14, 1);
  });

  it("returns 0 when amount is 0", () => {
    expect(calculateImpliedAPR(100, 0, 7)).toBe(0);
  });

  it("returns 0 when shiftDays is 0", () => {
    expect(calculateImpliedAPR(100, 10000, 0)).toBe(0);
  });

  it("longer shift days produce lower APR for same fee", () => {
    const apr7 = calculateImpliedAPR(100, 10000, 7);
    const apr14 = calculateImpliedAPR(100, 10000, 14);
    expect(apr14).toBeLessThan(apr7);
  });
});
