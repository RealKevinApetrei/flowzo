import { TRUELAYER_CONFIG } from "./config";

interface TrueLayerAccount {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  provider: { display_name: string; provider_id: string };
}

interface TrueLayerBalance {
  currency: string;
  available: number;
  current: number;
  overdraft?: number;
}

interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
  running_balance?: { amount: number; currency: string };
}

async function truelayerFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${TRUELAYER_CONFIG.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`TrueLayer API error ${res.status}: ${error}`);
  }

  const data = await res.json();
  return data.results as T;
}

export async function getAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
  return truelayerFetch<TrueLayerAccount[]>("/data/v1/accounts", accessToken);
}

export async function getBalance(
  accessToken: string,
  accountId: string,
): Promise<TrueLayerBalance[]> {
  return truelayerFetch<TrueLayerBalance[]>(
    `/data/v1/accounts/${accountId}/balance`,
    accessToken,
  );
}

export async function getTransactions(
  accessToken: string,
  accountId: string,
  from: string,
  to: string,
): Promise<TrueLayerTransaction[]> {
  return truelayerFetch<TrueLayerTransaction[]>(
    `/data/v1/accounts/${accountId}/transactions?from=${from}&to=${to}`,
    accessToken,
  );
}

export type { TrueLayerAccount, TrueLayerBalance, TrueLayerTransaction };
