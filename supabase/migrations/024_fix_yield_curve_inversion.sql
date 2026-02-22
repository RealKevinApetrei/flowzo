-- Fix inverted yield curve: only use REPAID trades (realized yields)
-- Previously included LIVE and MATCHED trades which mix unrealized projections
-- with actual settled returns, distorting APR calculations.
create or replace view public.yield_curve as
select
  risk_grade,
  case
    when shift_days <= 7 then '0-7d'
    when shift_days <= 14 then '8-14d'
    when shift_days <= 30 then '15-30d'
    else '30d+'
  end as term_bucket,
  count(*) as trade_count,
  round(
    avg((fee / nullif(amount, 0)) * (365.0 / nullif(shift_days, 0)) * 100),
    2
  ) as avg_apr_pct,
  round(avg(fee), 2) as avg_fee
from trades
where status = 'REPAID'
  and amount > 0
  and shift_days > 0
group by risk_grade, term_bucket;

-- Keep permissions
grant select on public.yield_curve to authenticated;

-- Restore security_invoker = false (matches migration 019)
alter view public.yield_curve set (security_invoker = false);
