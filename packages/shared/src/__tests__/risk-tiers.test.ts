import { describe, it, expect } from "vitest";
import { RISK_TIERS } from "../constants/risk-tiers";

describe("RISK_TIERS", () => {
  it("defines all three grades", () => {
    expect(RISK_TIERS).toHaveProperty("A");
    expect(RISK_TIERS).toHaveProperty("B");
    expect(RISK_TIERS).toHaveProperty("C");
  });

  describe("Grade A (Low Risk)", () => {
    const tier = RISK_TIERS["A"];

    it("has correct grade", () => {
      expect(tier.grade).toBe("A");
    });

    it("has correct maxShiftedAmount", () => {
      expect(tier.maxShiftedAmount).toBe(50000);
    });

    it("has correct maxShiftDays", () => {
      expect(tier.maxShiftDays).toBe(14);
    });

    it("has correct maxActiveTrades", () => {
      expect(tier.maxActiveTrades).toBe(5);
    });
  });

  describe("Grade B (Medium Risk)", () => {
    const tier = RISK_TIERS["B"];

    it("has correct grade", () => {
      expect(tier.grade).toBe("B");
    });

    it("has correct maxShiftedAmount", () => {
      expect(tier.maxShiftedAmount).toBe(20000);
    });

    it("has correct maxShiftDays", () => {
      expect(tier.maxShiftDays).toBe(10);
    });

    it("has correct maxActiveTrades", () => {
      expect(tier.maxActiveTrades).toBe(3);
    });
  });

  describe("Grade C (Higher Risk)", () => {
    const tier = RISK_TIERS["C"];

    it("has correct grade", () => {
      expect(tier.grade).toBe("C");
    });

    it("has correct maxShiftedAmount", () => {
      expect(tier.maxShiftedAmount).toBe(7500);
    });

    it("has correct maxShiftDays", () => {
      expect(tier.maxShiftDays).toBe(7);
    });

    it("has correct maxActiveTrades", () => {
      expect(tier.maxActiveTrades).toBe(1);
    });
  });

  it("Grade A allows more than Grade B allows more than Grade C", () => {
    expect(RISK_TIERS["A"].maxShiftedAmount).toBeGreaterThan(RISK_TIERS["B"].maxShiftedAmount);
    expect(RISK_TIERS["B"].maxShiftedAmount).toBeGreaterThan(RISK_TIERS["C"].maxShiftedAmount);

    expect(RISK_TIERS["A"].maxShiftDays).toBeGreaterThan(RISK_TIERS["B"].maxShiftDays);
    expect(RISK_TIERS["B"].maxShiftDays).toBeGreaterThan(RISK_TIERS["C"].maxShiftDays);

    expect(RISK_TIERS["A"].maxActiveTrades).toBeGreaterThan(RISK_TIERS["B"].maxActiveTrades);
    expect(RISK_TIERS["B"].maxActiveTrades).toBeGreaterThan(RISK_TIERS["C"].maxActiveTrades);
  });
});
