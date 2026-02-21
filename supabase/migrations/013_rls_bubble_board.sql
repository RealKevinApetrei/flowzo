-- 013_rls_bubble_board.sql
-- Fixes three issues blocking the data pipeline:
-- 1. RLS: let all authenticated users see PENDING_MATCH trades (bubble board)
-- 2. Missing unique constraint on obligations for sync upsert
-- 3. Missing completed_at column on forecast_snapshots

-- 1. Bubble board: any authenticated user can view PENDING_MATCH trades
create policy "Anyone can view pending trades"
  on public.trades for select
  using (status = 'PENDING_MATCH' and auth.uid() is not null);

-- 2. sync-banking-data uses onConflict: "user_id,merchant_name" but no
--    unique constraint exists on obligations for that pair
alter table public.obligations
  add constraint uq_obligations_user_merchant unique (user_id, merchant_name);

-- 3. run-forecast writes completed_at to forecast_snapshots (line 263)
--    but the column was never created
alter table public.forecast_snapshots
  add column if not exists completed_at timestamptz;
