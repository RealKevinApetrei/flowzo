-- Migration 021: Data Quality Fixes + Order Book Supply Side
--
-- Sprint 1: Fix yield_curve (REPAID-only), matching_efficiency (use matched_at), yield_curve_agg
-- Sprint 2: Add target_apr, order_book_supply, market_rates views

-- =====================================================================
-- SPRINT 1: DATA QUALITY FIXES
-- =====================================================================

-- 1a. Fix yield_curve: only include REPAID trades (was mixing LIVE/MATCHED)
CREATE OR REPLACE VIEW public.yield_curve AS
SELECT
  risk_grade,
  CASE
    WHEN shift_days <= 7 THEN '0-7d'
    WHEN shift_days <= 14 THEN '8-14d'
    WHEN shift_days <= 30 THEN '15-30d'
    ELSE '30d+'
  END AS term_bucket,
  count(*) AS trade_count,
  ROUND(
    AVG((fee / NULLIF(amount, 0)) * (365.0 / NULLIF(shift_days, 0)) * 100),
    2
  ) AS avg_apr_pct,
  ROUND(AVG(fee), 2) AS avg_fee
FROM trades
WHERE status = 'REPAID'
  AND amount > 0
  AND shift_days > 0
GROUP BY risk_grade, term_bucket;

GRANT SELECT ON public.yield_curve TO authenticated;

-- 1b. Aggregated yield curve: volume-weighted APR across all grades per term bucket
CREATE OR REPLACE VIEW public.yield_curve_agg AS
SELECT
  term_bucket,
  SUM(trade_count) AS trade_count,
  ROUND(SUM(avg_apr_pct * trade_count) / NULLIF(SUM(trade_count), 0), 2) AS avg_apr_pct,
  ROUND(SUM(avg_fee * trade_count) / NULLIF(SUM(trade_count), 0), 2) AS avg_fee
FROM yield_curve
GROUP BY term_bucket;

GRANT SELECT ON public.yield_curve_agg TO authenticated;

-- 1c. Fix matching_efficiency: use matched_at instead of updated_at for accurate match speed
CREATE OR REPLACE VIEW public.matching_efficiency AS
SELECT
  risk_grade,
  count(*) FILTER (WHERE status IN ('MATCHED', 'LIVE', 'REPAID')) AS matched_count,
  count(*) FILTER (WHERE status = 'PENDING_MATCH') AS pending_count,
  ROUND(
    count(*) FILTER (WHERE status IN ('MATCHED', 'LIVE', 'REPAID'))::numeric
    / NULLIF(count(*), 0),
    4
  ) AS fill_rate,
  ROUND((
    AVG(
      EXTRACT(EPOCH FROM (matched_at - created_at)) / 3600
    ) FILTER (WHERE status IN ('MATCHED', 'LIVE', 'REPAID') AND matched_at IS NOT NULL)
  )::numeric, 4) AS avg_hours_to_match,
  ROUND((
    PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (matched_at - created_at)) / 3600
    ) FILTER (WHERE status IN ('MATCHED', 'LIVE', 'REPAID') AND matched_at IS NOT NULL)
  )::numeric, 4) AS median_hours_to_match,
  ROUND((
    MIN(
      EXTRACT(EPOCH FROM (matched_at - created_at)) / 3600
    ) FILTER (WHERE status IN ('MATCHED', 'LIVE', 'REPAID') AND matched_at IS NOT NULL)
  )::numeric, 4) AS fastest_match_hours,
  ROUND((
    MAX(
      EXTRACT(EPOCH FROM (matched_at - created_at)) / 3600
    ) FILTER (WHERE status IN ('MATCHED', 'LIVE', 'REPAID') AND matched_at IS NOT NULL)
  )::numeric, 4) AS slowest_match_hours
FROM trades
GROUP BY risk_grade;

GRANT SELECT ON public.matching_efficiency TO authenticated;

-- =====================================================================
-- SPRINT 2: ORDER BOOK SUPPLY SIDE
-- =====================================================================

-- 2a. Add target_apr to lender_preferences (the rate lenders WANT to earn)
ALTER TABLE public.lender_preferences
  ADD COLUMN IF NOT EXISTS target_apr numeric(6,2) DEFAULT NULL;

COMMENT ON COLUMN public.lender_preferences.target_apr IS
  'Lender desired APR (offer rate). If null, uses min_apr. Posted on supply side of order book.';

-- 2b. Supply-side order book: lender standing orders aggregated by grade + APR bucket
CREATE OR REPLACE VIEW public.order_book_supply AS
SELECT
  rb::text AS risk_grade,
  (FLOOR(COALESCE(lp_pref.target_apr, lp_pref.min_apr) / 0.5) * 0.5) AS apr_bucket,
  COUNT(*) AS lender_count,
  ROUND(SUM(
    LEAST(
      pot.available,
      lp_pref.max_exposure,
      GREATEST(lp_pref.max_total_exposure - COALESCE(exposure.current_exposure, 0), 0)
    )
  ), 2) AS available_volume,
  ROUND(AVG(COALESCE(lp_pref.target_apr, lp_pref.min_apr)), 2) AS avg_apr,
  ROUND(MIN(COALESCE(lp_pref.target_apr, lp_pref.min_apr)), 2) AS best_apr,
  MAX(lp_pref.max_shift_days) AS max_term_days
FROM public.lender_preferences lp_pref
CROSS JOIN LATERAL UNNEST(lp_pref.risk_bands) AS t(rb)
JOIN public.lending_pots pot ON pot.user_id = lp_pref.user_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(a.amount_slice), 0) AS current_exposure
  FROM public.allocations a
  WHERE a.lender_id = lp_pref.user_id
    AND a.status IN ('RESERVED', 'ACTIVE')
) exposure ON TRUE
WHERE lp_pref.auto_match_enabled = true
  AND pot.available > 0
  AND NOT COALESCE(pot.withdrawal_queued, false)
GROUP BY rb, (FLOOR(COALESCE(lp_pref.target_apr, lp_pref.min_apr) / 0.5) * 0.5)
ORDER BY rb, apr_bucket;

GRANT SELECT ON public.order_book_supply TO authenticated;

-- 2c. Market rates: per-grade bid/ask spread + liquidity ratio
CREATE OR REPLACE VIEW public.market_rates AS
SELECT
  d.risk_grade::text AS risk_grade,
  -- Ask: use pre-computed implied APR from order_book_depth
  COALESCE(d.avg_implied_apr_pct, 0)::numeric AS ask_apr,
  -- Bid: best (lowest) and weighted avg APR from supply
  COALESCE(s.best_bid_apr, 0) AS best_bid_apr,
  COALESCE(s.weighted_avg_bid_apr, 0) AS weighted_avg_bid_apr,
  -- Spread
  ROUND((COALESCE(d.avg_implied_apr_pct, 0) - COALESCE(s.best_bid_apr, 0))::numeric, 2) AS spread,
  d.trade_count AS demand_count,
  d.total_amount AS demand_volume,
  COALESCE(s.lender_count, 0)::bigint AS supply_count,
  COALESCE(s.supply_volume, 0) AS supply_volume,
  -- Liquidity ratio: supply / demand (>1 = liquid)
  CASE WHEN d.total_amount > 0
    THEN ROUND(COALESCE(s.supply_volume, 0) / d.total_amount, 2)
    ELSE NULL
  END AS liquidity_ratio
FROM public.order_book_depth d
LEFT JOIN (
  SELECT
    risk_grade,
    MIN(avg_apr) AS best_bid_apr,
    ROUND(SUM(avg_apr * available_volume) / NULLIF(SUM(available_volume), 0), 2) AS weighted_avg_bid_apr,
    SUM(lender_count) AS lender_count,
    SUM(available_volume) AS supply_volume
  FROM public.order_book_supply
  GROUP BY risk_grade
) s ON s.risk_grade = d.risk_grade::text;

GRANT SELECT ON public.market_rates TO authenticated;

-- 2d. Indexes for order book performance
CREATE INDEX IF NOT EXISTS idx_lender_prefs_auto_match
  ON public.lender_preferences (auto_match_enabled)
  WHERE auto_match_enabled = true;

CREATE INDEX IF NOT EXISTS idx_lending_pots_available
  ON public.lending_pots (user_id, available)
  WHERE available > 0;
