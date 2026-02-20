import type { PaymentProvider, CreatePaymentParams, PaymentResult, PaymentStatus } from "./types";

/** Open Banking Payment Initiation Service stub. Auto-settling. */
const payments = new Map<string, { status: PaymentStatus; created_at: string }>();

export const pisStub: PaymentProvider = {
  name: "ob-pis-stub",

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const id = `pis_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const created_at = new Date().toISOString();

    // OB PIS is near-instant; auto-confirm
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
