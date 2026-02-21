-- 015: Real-time capital-weighted APY for lenders from LIVE trades

create or replace function public.get_lender_current_apy(p_user_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select round(
        sum(a.amount_slice * (t.fee / nullif(t.amount, 0)) * (365.0 / nullif(t.shift_days, 0))) * 10000
        / nullif(total.weight, 0)
      )
      from allocations a
      join trades t on t.id = a.trade_id
      cross join lateral (
        select sum(a2.amount_slice) as weight
        from allocations a2
        join trades t2 on t2.id = a2.trade_id
        where a2.lender_id = p_user_id
          and t2.status = 'LIVE'
          and a2.status = 'RESERVED'
      ) total
      where a.lender_id = p_user_id
        and t.status = 'LIVE'
        and a.status = 'RESERVED'
        and t.amount > 0
        and t.shift_days > 0
    ),
    0
  );
$$;

grant execute on function public.get_lender_current_apy(uuid) to authenticated;
