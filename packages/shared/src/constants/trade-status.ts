import type { TradeStatus } from "../types/trades";

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  DRAFT: "Draft",
  PENDING_MATCH: "Finding lender",
  MATCHED: "Matched",
  LIVE: "Active",
  REPAID: "Repaid",
  DEFAULTED: "Defaulted",
  CANCELLED: "Cancelled",
};

export const TRADE_STATUS_COLORS: Record<TradeStatus, string> = {
  DRAFT: "text-gray-500",
  PENDING_MATCH: "text-amber-500",
  MATCHED: "text-blue-500",
  LIVE: "text-coral",
  REPAID: "text-green-500",
  DEFAULTED: "text-red-500",
  CANCELLED: "text-gray-400",
};
