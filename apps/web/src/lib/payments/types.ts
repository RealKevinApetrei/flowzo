/** Provider-agnostic payment interfaces. Stubs implement these. */

export interface PaymentProvider {
  name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

export interface CreatePaymentParams {
  amount_pence: number;
  currency: string;
  reference: string;
  idempotency_key: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  provider_payment_id: string;
  status: "pending" | "confirmed" | "failed";
  created_at: string;
}

export type PaymentStatus = "pending" | "confirmed" | "failed" | "cancelled";
