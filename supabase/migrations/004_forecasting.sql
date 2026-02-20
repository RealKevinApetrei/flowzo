create table public.forecasts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  forecast_date     date not null,
  projected_balance numeric(12,2) not null,
  confidence_low    numeric(12,2),
  confidence_high   numeric(12,2),
  danger_flag       boolean default false,
  income_expected   numeric(12,2) default 0,
  outgoings_expected numeric(12,2) default 0,
  run_id            uuid,
  created_at        timestamptz default now(),
  unique(user_id, forecast_date, run_id)
);
create index idx_forecasts_user_date on public.forecasts(user_id, forecast_date);
create index idx_forecasts_danger on public.forecasts(user_id) where danger_flag = true;

create table public.forecast_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  starting_balance numeric(12,2) not null,
  obligations_count int default 0,
  danger_days_count int default 0,
  model_version   text default 'v1_heuristic',
  run_at          timestamptz default now()
);
create index idx_forecast_snapshots_user on public.forecast_snapshots(user_id, run_at desc);
