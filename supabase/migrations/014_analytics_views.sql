-- 014: Analytics views for data dashboard and Member B's quant integrations

-- Trade analytics: aggregated by risk_grade and status
create or replace view public.trade_analytics as
select
  risk_grade,
  status,
  count(*) as trade_count,
  round(avg(amount), 2) as avg_amount,
  round(avg(fee), 2) as avg_fee,
  round(avg(shift_days)::numeric, 1) as avg_shift_days,
  round(sum(amount), 2) as total_volume,
  round(sum(fee), 2) as total_fees,
  count(*) filter (where status = 'DEFAULTED')::float
    / nullif(count(*) filter (where status in ('REPAID', 'DEFAULTED')), 0) as default_rate
from public.trades
group by risk_grade, status;

grant select on public.trade_analytics to authenticated;

-- Risk distribution: user count per risk grade
create or replace view public.risk_distribution as
select
  risk_grade,
  count(*) as user_count
from public.profiles
where risk_grade is not null
group by risk_grade;

grant select on public.risk_distribution to authenticated;

-- Pool overview: aggregate lending pot stats
create or replace view public.pool_overview as
select
  count(*) as lender_count,
  round(sum(available), 2) as total_available,
  round(sum(locked), 2) as total_locked,
  round(sum(available + locked), 2) as total_pool_size
from public.lending_pots;

grant select on public.pool_overview to authenticated;
