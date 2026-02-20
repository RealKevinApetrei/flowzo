create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  bank_connection_id  uuid not null references public.bank_connections(id) on delete cascade,
  external_account_id text not null,
  account_type        text not null,
  display_name        text,
  currency            text not null default 'GBP',
  balance_current     numeric(12,2) default 0,
  balance_available   numeric(12,2) default 0,
  balance_updated_at  timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique(bank_connection_id, external_account_id)
);
create index idx_accounts_user on public.accounts(user_id);

create table public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  account_id              uuid not null references public.accounts(id) on delete cascade,
  external_transaction_id text not null,
  amount                  numeric(12,2) not null,
  currency                text not null default 'GBP',
  description             text,
  merchant_name           text,
  category                text,
  transaction_type        text,
  booked_at               timestamptz not null,
  created_at              timestamptz default now(),
  unique(account_id, external_transaction_id)
);
create index idx_transactions_user_date on public.transactions(user_id, booked_at desc);
create index idx_transactions_merchant on public.transactions(merchant_name, user_id);

create table public.obligations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  account_id      uuid references public.accounts(id) on delete set null,
  name            text not null,
  merchant_name   text,
  amount          numeric(12,2) not null,
  currency        text not null default 'GBP',
  expected_day    smallint not null,
  frequency       obligation_frequency not null default 'MONTHLY',
  category        text,
  is_essential    boolean default true,
  confidence      numeric(3,2) default 0.8,
  last_paid_at    timestamptz,
  next_expected   date,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_obligations_user on public.obligations(user_id, active);
create index idx_obligations_next on public.obligations(next_expected) where active = true;
