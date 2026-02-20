create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  risk_grade      risk_grade default 'C',
  role_preference role_preference default 'BOTH',
  onboarding_completed boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.bank_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  provider        text not null,
  truelayer_token jsonb not null default '{}',
  consent_id      text,
  status          text not null default 'active',
  last_synced_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_bank_connections_user on public.bank_connections(user_id);
