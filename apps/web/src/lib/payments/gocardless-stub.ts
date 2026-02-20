import type { PaymentProvider, CreatePaymentParams, PaymentResult, PaymentStatus } from "./types";

/** In-memory GoCardless stub. Simulates mandate + delayed payment. */
const payments = new Map<string, { status: PaymentStatus; created_at: string }>();

export const goCardlessStub: PaymentProvider = {
  name: "gocardless-stub",

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const id = `gc_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const created_at = new Date().toISOString();

    // GoCardless payments take ~3 business days; stub starts as pending
    payments.set(id, { status: "pending", created_at });

    // Simulate async confirmation after 2 seconds
    setTimeout(() => {
      const p = payments.get(id);
      if (p && p.status === "pending") {
        p.status = "confirmed";
      }
    }, 2000);

    return {
      provider_payment_id: id,
      status: "pending",
      created_at,
    };
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return payments.get(paymentId)?.status ?? "failed";
  },
};
