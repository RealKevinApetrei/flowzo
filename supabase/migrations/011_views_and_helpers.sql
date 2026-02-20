create or replace function public.get_pool_utilization()
returns numeric language sql stable as $$
  select coalesce(sum(locked) / nullif(sum(available + locked), 0), 0) from public.lending_pots;
$$;

create or replace function public.update_lending_pot(
  p_user_id uuid, p_entry_type ledger_entry_type, p_amount numeric,
  p_trade_id uuid default null, p_allocation_id uuid default null,
  p_description text default null, p_idempotency_key text default null
) returns uuid language plpgsql security definer as $$
declare v_pot public.lending_pots%rowtype; v_balance_after numeric; v_ledger_id uuid;
begin
  select * into v_pot from public.lending_pots where user_id = p_user_id for update;
  if not found then raise exception 'Lending pot not found for user %', p_user_id; end if;
  case p_entry_type
    when 'DEPOSIT' then v_pot.available := v_pot.available + p_amount;
    when 'WITHDRAW' then
      if v_pot.available < p_amount then raise exception 'Insufficient available balance'; end if;
      v_pot.available := v_pot.available - p_amount;
    when 'RESERVE' then
      if v_pot.available < p_amount then raise exception 'Insufficient available balance for reserve'; end if;
      v_pot.available := v_pot.available - p_amount; v_pot.locked := v_pot.locked + p_amount;
    when 'RELEASE' then v_pot.locked := v_pot.locked - p_amount; v_pot.available := v_pot.available + p_amount;
    when 'DISBURSE' then v_pot.locked := v_pot.locked - p_amount; v_pot.total_deployed := v_pot.total_deployed + p_amount;
    when 'REPAY' then v_pot.available := v_pot.available + p_amount;
    when 'FEE_CREDIT' then v_pot.available := v_pot.available + p_amount; v_pot.realized_yield := v_pot.realized_yield + p_amount;
  end case;
  v_balance_after := v_pot.available;
  update public.lending_pots set available = v_pot.available, locked = v_pot.locked,
    total_deployed = v_pot.total_deployed, realized_yield = v_pot.realized_yield, updated_at = now()
  where user_id = p_user_id;
  insert into public.pool_ledger (user_id, entry_type, amount, balance_after, trade_id, allocation_id, description, idempotency_key)
  values (p_user_id, p_entry_type, p_amount, v_balance_after, p_trade_id, p_allocation_id, p_description, p_idempotency_key)
  returning id into v_ledger_id;
  return v_ledger_id;
end;
$$;

create or replace view public.pool_summary as
select count(*) as total_lenders, sum(available) as total_available, sum(locked) as total_locked,
  sum(available + locked) as total_pool_size,
  case when sum(available + locked) > 0 then round(sum(locked) / sum(available + locked), 4) else 0 end as utilization_ratio,
  sum(realized_yield) as total_yield
from public.lending_pots;
