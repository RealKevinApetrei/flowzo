-- 018: Extended matching & settlement analytics
-- NOTE: DROP + CREATE because CREATE OR REPLACE cannot reorder/rename columns

-- Extend matching_efficiency with median, min, max hours
drop view if exists public.matching_efficiency cascade;
create view public.matching_efficiency as
select
  risk_grade,
  count(*) filter (where status in ('MATCHED', 'LIVE', 'REPAID')) as matched_count,
  count(*) filter (where status = 'PENDING_MATCH') as pending_count,
  round(
    count(*) filter (where status in ('MATCHED', 'LIVE', 'REPAID'))::numeric
    / nullif(count(*), 0),
    4
  ) as fill_rate,
  round(
    avg(
      extract(epoch from (matched_at - created_at)) / 3600
    ) filter (where matched_at is not null),
    1
  ) as avg_hours_to_match,
  round(
    percentile_cont(0.5) within group (
      order by extract(epoch from (matched_at - created_at)) / 3600
    ) filter (where matched_at is not null)::numeric,
    1
  ) as median_hours_to_match,
  round(
    min(
      extract(epoch from (matched_at - created_at)) / 3600
    ) filter (where matched_at is not null)::numeric,
    1
  ) as fastest_match_hours,
  round(
    max(
      extract(epoch from (matched_at - created_at)) / 3600
    ) filter (where matched_at is not null)::numeric,
    1
  ) as slowest_match_hours
from trades
group by risk_grade;

grant select on public.matching_efficiency to authenticated;
alter view public.matching_efficiency set (security_invoker = false);

-- Extend trade_performance with live_count, avg_days_to_repay, defaulted volume, total fees
drop view if exists public.trade_performance cascade;
create view public.trade_performance as
select
  risk_grade,
  count(*) filter (where status = 'REPAID') as repaid_count,
  count(*) filter (where status = 'DEFAULTED') as defaulted_count,
  count(*) filter (where status = 'LIVE') as live_count,
  count(*) filter (where status in ('REPAID', 'DEFAULTED')) as settled_count,
  round(
    count(*) filter (where status = 'DEFAULTED')::numeric
    / nullif(count(*) filter (where status in ('REPAID', 'DEFAULTED')), 0),
    4
  ) as default_rate,
  round(avg(amount) filter (where status in ('REPAID', 'DEFAULTED')), 2) as avg_amount,
  round(avg(fee) filter (where status = 'REPAID'), 2) as avg_fee_repaid,
  round(
    avg((fee / nullif(amount, 0)) * (365.0 / nullif(shift_days, 0)) * 100)
    filter (where status = 'REPAID' and amount > 0 and shift_days > 0),
    2
  ) as avg_apr_pct,
  round(
    avg(
      extract(epoch from (repaid_at - live_at)) / 86400
    ) filter (where status = 'REPAID' and repaid_at is not null and live_at is not null),
    1
  ) as avg_days_to_repay,
  round(
    sum(amount) filter (where status = 'DEFAULTED'),
    2
  ) as total_defaulted_volume,
  round(
    sum(fee) filter (where status = 'REPAID'),
    2
  ) as total_fees_earned
from trades
where status in ('REPAID', 'DEFAULTED', 'LIVE')
group by risk_grade;

grant select on public.trade_performance to authenticated;
alter view public.trade_performance set (security_invoker = false);

-- Extend platform_totals with matched/cancelled counts and total fees
drop view if exists public.platform_totals cascade;
create view public.platform_totals as
select
  count(*) filter (where status = 'LIVE') as live_trades,
  count(*) filter (where status = 'PENDING_MATCH') as pending_trades,
  count(*) filter (where status = 'REPAID') as repaid_trades,
  count(*) filter (where status = 'DEFAULTED') as defaulted_trades,
  count(*) filter (where status = 'MATCHED') as matched_trades,
  count(*) filter (where status = 'CANCELLED') as cancelled_trades,
  coalesce(sum(fee) filter (where status = 'REPAID'), 0) as total_fees_collected,
  count(*) as total_trades
from trades;

grant select on public.platform_totals to authenticated;
alter view public.platform_totals set (security_invoker = false);

-- Fix lender names: rename dual-role users showing as "Borrower" in leaderboard
update profiles
set display_name = 'Lender ' || substring(display_name from '[0-9]+$')
where display_name like 'Borrower %'
  and id in (select distinct user_id from lending_pots);
