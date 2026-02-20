create table public.flowzo_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,
  entity_type text not null,
  entity_id   uuid not null,
  actor       text default 'system',
  payload     jsonb default '{}',
  created_at  timestamptz default now()
);
create index idx_events_entity on public.flowzo_events(entity_type, entity_id, created_at desc);
create index idx_events_type on public.flowzo_events(event_type, created_at desc);

create table public.payment_orders (
  id              uuid primary key default gen_random_uuid(),
  trade_id        uuid not null references public.trades(id),
  direction       payment_direction not null,
  amount          numeric(12,2) not null,
  currency        text not null default 'GBP',
  provider        text not null default 'mock',
  idempotency_key text not null unique,
  status          payment_status not null default 'PENDING',
  external_ref    text,
  submitted_at    timestamptz,
  completed_at    timestamptz,
  error_detail    text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_payment_orders_trade on public.payment_orders(trade_id);

create table public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  external_id   text not null,
  event_type    text,
  payload       jsonb not null default '{}',
  processed     boolean default false,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz default now(),
  unique(provider, external_id)
);
create index idx_webhook_unprocessed on public.webhook_events(processed, created_at) where processed = false;
