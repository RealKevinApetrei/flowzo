import type { PaymentProvider, CreatePaymentParams, PaymentResult, PaymentStatus } from "./types";

/** In-memory Stripe stub. Instant confirm. */
const payments = new Map<string, { status: PaymentStatus; created_at: string }>();

export const stripeStub: PaymentProvider = {
  name: "stripe-stub",

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const id = `pi_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const created_at = new Date().toISOString();

    payments.set(id, { status: "confirmed", created_at });

    return {
      provider_payment_id: id,
      status: "confirmed",
      created_at,
    };
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return payments.get(paymentId)?.status ?? "failed";
  },
};
