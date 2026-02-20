import type { RiskGrade } from "./trades";

export type LedgerEntryType = "DEPOSIT" | "WITHDRAW" | "RESERVE" | "RELEASE" | "DISBURSE" | "REPAY" | "FEE_CREDIT";

export interface LendingPot {
  id: string;
  user_id: string;
  available: number;
  locked: number;
  total_deployed: number;
  realized_yield: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface LenderPreferences {
  id: string;
  user_id: string;
  min_apr: number;
  max_shift_days: number;
  max_exposure: number;
  max_total_exposure: number;
  risk_bands: RiskGrade[];
  auto_match_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoolLedgerEntry {
  id: string;
  user_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  balance_after: number | null;
  trade_id: string | null;
  allocation_id: string | null;
  description: string | null;
  idempotency_key: string | null;
  created_at: string;
}
