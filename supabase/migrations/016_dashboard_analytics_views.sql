-- 016: Expanded analytics dashboard views

-- Order book depth: PENDING_MATCH trades by risk grade
create or replace view public.order_book_depth as
select
  risk_grade,
  count(*) as trade_count,
  round(sum(amount), 2) as total_amount,
  round(avg(amount), 2) as avg_amount,
  round(avg(fee), 2) as avg_fee,
  round(avg(shift_days)::numeric, 0) as avg_term_days
from trades
where status = 'PENDING_MATCH'
group by risk_grade;

grant select on public.order_book_depth to authenticated;

-- Trade performance: repaid/defaulted stats by grade
create or replace view public.trade_performance as
select
  risk_grade,
  count(*) filter (where status = 'REPAID') as repaid_count,
  count(*) filter (where status = 'DEFAULTED') as defaulted_count,
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
  ) as avg_apr_pct
from trades
where status in ('REPAID', 'DEFAULTED')
group by risk_grade;

grant select on public.trade_performance to authenticated;

-- Yield curve: implied APR by term bucket and grade
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
where status in ('REPAID', 'LIVE', 'MATCHED')
  and amount > 0
  and shift_days > 0
group by risk_grade, term_bucket;

grant select on public.yield_curve to authenticated;

-- Lender leaderboard: top lenders by deployed capital
create or replace view public.lender_leaderboard as
select
  lp.user_id,
  coalesce(p.display_name, 'Anon') as display_name,
  round(lp.available + lp.locked, 2) as total_capital,
  round(lp.locked, 2) as locked,
  round(lp.realized_yield, 2) as realized_yield,
  count(distinct a.trade_id) as trade_count
from lending_pots lp
left join profiles p on p.id = lp.user_id
left join allocations a on a.lender_id = lp.user_id and a.status = 'RESERVED'
group by lp.user_id, p.display_name, lp.available, lp.locked, lp.realized_yield
order by total_capital desc;

grant select on public.lender_leaderboard to authenticated;

-- Platform totals: single-row operational metrics
create or replace view public.platform_totals as
select
  count(*) as total_trades,
  count(*) filter (where status = 'LIVE') as live_trades,
  count(*) filter (where status = 'PENDING_MATCH') as pending_trades,
  count(*) filter (where status = 'REPAID') as repaid_trades,
  count(*) filter (where status = 'DEFAULTED') as defaulted_trades,
  round(sum(amount) filter (where status in ('LIVE', 'REPAID')), 2) as total_volume,
  round(sum(fee) filter (where status = 'REPAID'), 2) as total_fees_collected,
  count(distinct borrower_id) as unique_borrowers
from trades;

grant select on public.platform_totals to authenticated;

-- Matching efficiency: fill rate and avg time-to-match
create or replace view public.matching_efficiency as
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
      extract(epoch from (updated_at - created_at)) / 3600
    ) filter (where status in ('MATCHED', 'LIVE', 'REPAID')),
    1
  ) as avg_hours_to_match
from trades
group by risk_grade;

grant select on public.matching_efficiency to authenticated;

-- Indexes to support the views
create index if not exists idx_trades_status_risk on trades (status, risk_grade);
create index if not exists idx_trades_pending_match on trades (status) where status = 'PENDING_MATCH';
create index if not exists idx_trades_settled on trades (status) where status in ('REPAID', 'DEFAULTED');
create index if not exists idx_allocations_lender_status on allocations (lender_id, status);
create index if not exists idx_trades_shift_days on trades (shift_days) where shift_days > 0;
