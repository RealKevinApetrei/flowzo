create table public.lending_pots (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade unique,
  available        numeric(12,2) not null default 0,
  locked           numeric(12,2) not null default 0,
  total_deployed   numeric(12,2) not null default 0,
  realized_yield   numeric(12,2) not null default 0,
  currency         text not null default 'GBP',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  constraint chk_non_negative_available check (available >= 0),
  constraint chk_non_negative_locked check (locked >= 0)
);

create table public.pool_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id),
  entry_type      ledger_entry_type not null,
  amount          numeric(12,2) not null,
  balance_after   numeric(12,2),
  trade_id        uuid references public.trades(id),
  allocation_id   uuid references public.allocations(id),
  description     text,
  idempotency_key text unique,
  created_at      timestamptz default now()
);
create index idx_pool_ledger_user on public.pool_ledger(user_id, created_at desc);
create index idx_pool_ledger_trade on public.pool_ledger(trade_id);

create table public.lender_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade unique,
  min_apr           numeric(6,2) default 0,
  max_shift_days    int default 14,
  max_exposure      numeric(12,2) default 100,
  max_total_exposure numeric(12,2) default 1000,
  risk_bands        risk_grade[] default '{A,B}',
  auto_match_enabled boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
