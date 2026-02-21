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
  weighted_yield: number;
  risk_free_rate: number;
  excess_return: number;
  total_capital: number;
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
  days: string[];
  actual: number[];
  forecasted: number[];
  mape_pct: number;
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
