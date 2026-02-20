create table public.agent_proposals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  type              text not null,
  obligation_id     uuid references public.obligations(id),
  payload           jsonb not null default '{}',
  status            proposal_status not null default 'PENDING',
  explanation_text  text,
  trade_id          uuid references public.trades(id),
  expires_at        timestamptz,
  created_at        timestamptz default now(),
  responded_at      timestamptz
);
create index idx_proposals_user on public.agent_proposals(user_id, status);
create index idx_proposals_pending on public.agent_proposals(status, expires_at) where status = 'PENDING';

create table public.agent_runs (
  id              uuid primary key default gen_random_uuid(),
  agent_type      text not null,
  user_id         uuid references public.profiles(id),
  input_summary   jsonb default '{}',
  result_summary  jsonb default '{}',
  proposals_count int default 0,
  error           text,
  started_at      timestamptz default now(),
  completed_at    timestamptz
);
create index idx_agent_runs_user on public.agent_runs(user_id, started_at desc);
