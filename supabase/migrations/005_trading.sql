create table public.trades (
  id                uuid primary key default gen_random_uuid(),
  borrower_id       uuid not null references public.profiles(id),
  obligation_id     uuid references public.obligations(id) on delete set null,
  amount            numeric(12,2) not null,
  currency          text not null default 'GBP',
  original_due_date date not null,
  new_due_date      date not null,
  shift_days        int generated always as (new_due_date - original_due_date) stored,
  fee               numeric(12,2) not null default 0,
  fee_rate          numeric(6,4),
  risk_grade        risk_grade not null default 'C',
  status            trade_status not null default 'DRAFT',
  max_fee           numeric(12,2),
  matched_at        timestamptz,
  live_at           timestamptz,
  repaid_at         timestamptz,
  defaulted_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  constraint chk_dates check (new_due_date > original_due_date),
  constraint chk_shift_days check ((new_due_date - original_due_date) between 1 and 14),
  constraint chk_positive_amount check (amount > 0),
  constraint chk_positive_fee check (fee >= 0)
);
create index idx_trades_borrower on public.trades(borrower_id, status);
create index idx_trades_status on public.trades(status, original_due_date);
create index idx_trades_pending on public.trades(status, created_at) where status = 'PENDING_MATCH';

create table public.trade_state_transitions (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references public.trades(id) on delete cascade,
  from_status trade_status,
  to_status   trade_status not null,
  actor       text not null default 'system',
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);
create index idx_transitions_trade on public.trade_state_transitions(trade_id, created_at);

create table public.allocations (
  id            uuid primary key default gen_random_uuid(),
  trade_id      uuid not null references public.trades(id) on delete cascade,
  lender_id     uuid not null references public.profiles(id),
  amount_slice  numeric(12,2) not null,
  fee_slice     numeric(12,2) not null default 0,
  status        allocation_status not null default 'RESERVED',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  constraint chk_positive_slice check (amount_slice > 0)
);
create index idx_allocations_trade on public.allocations(trade_id);
create index idx_allocations_lender on public.allocations(lender_id, status);

create or replace function public.record_trade_transition()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.trade_state_transitions (trade_id, from_status, to_status, actor)
    values (new.id, old.status, new.status, coalesce(current_setting('app.actor', true), 'system'));
    if new.status = 'MATCHED' then new.matched_at = now();
    elsif new.status = 'LIVE' then new.live_at = now();
    elsif new.status = 'REPAID' then new.repaid_at = now();
    elsif new.status = 'DEFAULTED' then new.defaulted_at = now();
    end if;
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_trade_status_change before update on public.trades
  for each row execute function public.record_trade_transition();
