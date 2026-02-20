export type TradeStatus =
  | "DRAFT"
  | "PENDING_MATCH"
  | "MATCHED"
  | "LIVE"
  | "REPAID"
  | "DEFAULTED"
  | "CANCELLED";

export type AllocationStatus = "RESERVED" | "ACTIVE" | "REPAID" | "DEFAULTED" | "RELEASED";

export type ProposalStatus = "PENDING" | "ACCEPTED" | "DISMISSED" | "EXPIRED";

export type RiskGrade = "A" | "B" | "C";

export interface Trade {
  id: string;
  borrower_id: string;
  obligation_id: string | null;
  amount: number;
  currency: string;
  original_due_date: string;
  new_due_date: string;
  shift_days: number;
  fee: number;
  fee_rate: number | null;
  risk_grade: RiskGrade;
  status: TradeStatus;
  max_fee: number | null;
  matched_at: string | null;
  live_at: string | null;
  repaid_at: string | null;
  defaulted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: string;
  trade_id: string;
  lender_id: string;
  amount_slice: number;
  fee_slice: number;
  status: AllocationStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentProposal {
  id: string;
  user_id: string;
  type: string;
  obligation_id: string | null;
  payload: ShiftProposalPayload;
  status: ProposalStatus;
  explanation_text: string | null;
  trade_id: string | null;
  expires_at: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ShiftProposalPayload {
  obligation_name: string;
  amount: number;
  original_date: string;
  suggested_date: string;
  shift_days: number;
  estimated_fee: number;
  annualized_rate: number | null;
  risk_grade: string;
  fill_probability: number;
  danger_balance: number | null;
}
