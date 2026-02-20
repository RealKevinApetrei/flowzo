export type ObligationFrequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "IRREGULAR";

export interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  truelayer_token: Record<string, unknown>;
  consent_id: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  bank_connection_id: string;
  external_account_id: string;
  account_type: string;
  display_name: string | null;
  currency: string;
  balance_current: number;
  balance_available: number;
  balance_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  external_transaction_id: string;
  amount: number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  category: string | null;
  transaction_type: string | null;
  booked_at: string;
  created_at: string;
}

export interface Obligation {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  merchant_name: string | null;
  amount: number;
  currency: string;
  expected_day: number;
  frequency: ObligationFrequency;
  category: string | null;
  is_essential: boolean;
  confidence: number;
  last_paid_at: string | null;
  next_expected: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Forecast {
  id: string;
  user_id: string;
  forecast_date: string;
  projected_balance: number;
  confidence_low: number | null;
  confidence_high: number | null;
  danger_flag: boolean;
  income_expected: number;
  outgoings_expected: number;
  run_id: string | null;
  created_at: string;
}
