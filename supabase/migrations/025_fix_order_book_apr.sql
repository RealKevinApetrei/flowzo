-- Migration 022: Fix order_book_depth missing avg_implied_apr_pct column
--
-- Root cause: Migration 016 created order_book_depth WITHOUT avg_implied_apr_pct.
-- Migration 021's market_rates view references d.avg_implied_apr_pct → returns NULL/0,
-- causing 0.0% APR, 0.0x liquidity ratio, and 0% best APR across the entire dashboard.
--
-- Fix: Drop dependent views, recreate order_book_depth WITH avg_implied_apr_pct,
-- then recreate dependent views.

-- Drop dependent views first (market_rates depends on order_book_depth)
DROP VIEW IF EXISTS public.market_rates;
DROP VIEW IF EXISTS public.order_book_depth;

-- Recreate order_book_depth WITH avg_implied_apr_pct
CREATE VIEW public.order_book_depth AS
SELECT
  risk_grade,
  count(*) AS trade_count,
  round(sum(amount), 2) AS total_amount,
  round(avg(amount), 2) AS avg_amount,
  round(avg(fee), 2) AS avg_fee,
  round(avg(shift_days)::numeric, 0) AS avg_term_days,
  round(
    avg((fee / nullif(amount, 0)) * (365.0 / nullif(shift_days, 0)) * 100),
    2
  ) AS avg_implied_apr_pct
FROM trades
WHERE status = 'PENDING_MATCH'
  AND amount > 0
  AND shift_days > 0
GROUP BY risk_grade;

GRANT SELECT ON public.order_book_depth TO authenticated;

-- Recreate market_rates (from migration 021, unchanged)
CREATE VIEW public.market_rates AS
SELECT
  d.risk_grade::text AS risk_grade,
  COALESCE(d.avg_implied_apr_pct, 0)::numeric AS ask_apr,
  COALESCE(s.best_bid_apr, 0) AS best_bid_apr,
  COALESCE(s.weighted_avg_bid_apr, 0) AS weighted_avg_bid_apr,
  ROUND((COALESCE(d.avg_implied_apr_pct, 0) - COALESCE(s.best_bid_apr, 0))::numeric, 2) AS spread,
  d.trade_count AS demand_count,
  d.total_amount AS demand_volume,
  COALESCE(s.lender_count, 0)::bigint AS supply_count,
  COALESCE(s.supply_volume, 0) AS supply_volume,
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
