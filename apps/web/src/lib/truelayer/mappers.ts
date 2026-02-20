import type { TrueLayerAccount, TrueLayerBalance, TrueLayerTransaction } from "./client";

/**
 * Map TrueLayer account to our DB format.
 * All monetary values stored in pence (integer).
 */
export function mapAccount(
  tlAccount: TrueLayerAccount,
  connectionId: string,
  balance?: TrueLayerBalance,
) {
  return {
    connection_id: connectionId,
    external_id: tlAccount.account_id,
    name: tlAccount.display_name,
    type: tlAccount.account_type,
    currency: tlAccount.currency,
    balance_pence: balance ? Math.round(balance.current * 100) : 0,
    available_pence: balance ? Math.round(balance.available * 100) : null,
    overdraft_pence: balance?.overdraft ? Math.round(balance.overdraft * 100) : null,
    provider_name: tlAccount.provider.display_name,
  };
}

export function mapTransaction(tlTxn: TrueLayerTransaction, accountId: string) {
  return {
    account_id: accountId,
    external_id: tlTxn.transaction_id,
    timestamp: tlTxn.timestamp,
    description: tlTxn.description,
    amount_pence: Math.round(tlTxn.amount * 100),
    currency: tlTxn.currency,
    category: tlTxn.transaction_category,
    merchant_name: tlTxn.merchant_name ?? null,
    running_balance_pence: tlTxn.running_balance
      ? Math.round(tlTxn.running_balance.amount * 100)
      : null,
  };
}
