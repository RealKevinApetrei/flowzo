/**
 * Server-side typed fetchers for the Quant API (Railway).
 * All GET endpoints use ISR caching (5 min). Returns null on error for graceful degradation.
 */

const QUANT_API_URL = process.env.QUANT_API_URL;

async function quantGet<T>(endpoint: string): Promise<T | null> {
  if (!QUANT_API_URL) return null;
  try {
    const res = await fetch(`${QUANT_API_URL}/api/${endpoint}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// --- Response types ---

export interface BacktestGrade {
  default_rate: number;
  n_borrowers: number;
}

export interface BacktestResponse {
  backtest: Record<string, BacktestGrade>;
}

export interface ReturnsResponse {
  sharpe_ratio: number;
  weighted_yield_pct: number;
  risk_free_rate_pct: number;
  excess_return_pct: number;
  total_capital_gbp: number;
}

export interface EdaFeatureStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
}

export interface EdaResponse {
  summary: Record<string, EdaFeatureStats>;
  correlation: Record<string, Record<string, number>>;
}

export interface ForecastAccuracyResponse {
  days: number[];
  actual: number[];
  forecasted: number[];
  mape_pct: number;
}

// --- Spending forecast types (used by Edge Function, not called from frontend directly) ---

export interface SpendingForecastRequest {
  user_id: string;
  transactions: {
    date: string;
    amount: number;
    category?: string;
  }[];
  horizon_days?: number;
}

export interface DailyForecast {
  date: string;
  expected_pence: number;
  confidence_low_pence: number;
  confidence_high_pence: number;
  model_tier: "gamma_dow" | "gamma_flat" | "fallback_flat";
}

export interface SpendingForecastResponse {
  user_id: string;
  forecasts: DailyForecast[];
  model_tier: string;
}

export interface LenderStats {
  lender_id: string;
  display_name: string;
  total_deployed: number;
  available: number;
  locked: number;
  realized_yield: number;
  trade_count: number;
  avg_apr_bps: number;
}

export interface LendersResponse {
  lenders: LenderStats[];
}

// --- Fetchers ---

export function fetchBacktest() {
  return quantGet<BacktestResponse>("backtest");
}

export function fetchReturns() {
  return quantGet<ReturnsResponse>("returns");
}

export function fetchEda() {
  return quantGet<EdaResponse>("eda");
}

export function fetchForecastAccuracy() {
  return quantGet<ForecastAccuracyResponse>("forecast-accuracy");
}

export function fetchLenders() {
  return quantGet<LendersResponse>("lenders");
}
