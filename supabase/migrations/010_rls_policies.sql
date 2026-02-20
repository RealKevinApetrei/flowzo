alter table public.profiles enable row level security;
alter table public.bank_connections enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.obligations enable row level security;
alter table public.forecasts enable row level security;
alter table public.forecast_snapshots enable row level security;
alter table public.trades enable row level security;
alter table public.trade_state_transitions enable row level security;
alter table public.allocations enable row level security;
alter table public.lending_pots enable row level security;
alter table public.pool_ledger enable row level security;
alter table public.lender_preferences enable row level security;
alter table public.agent_proposals enable row level security;
alter table public.agent_runs enable row level security;
alter table public.flowzo_events enable row level security;
alter table public.payment_orders enable row level security;
alter table public.webhook_events enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can view own bank connections" on public.bank_connections for select using (auth.uid() = user_id);
create policy "Users can insert own bank connections" on public.bank_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own bank connections" on public.bank_connections for update using (auth.uid() = user_id);
create policy "Users can view own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can view own obligations" on public.obligations for select using (auth.uid() = user_id);
create policy "Users can update own obligations" on public.obligations for update using (auth.uid() = user_id);
create policy "Users can view own forecasts" on public.forecasts for select using (auth.uid() = user_id);
create policy "Users can view own forecast snapshots" on public.forecast_snapshots for select using (auth.uid() = user_id);
create policy "Borrowers can view own trades" on public.trades for select using (auth.uid() = borrower_id);
create policy "Lenders can view allocated trades" on public.trades for select using (
  exists (select 1 from public.allocations where allocations.trade_id = trades.id and allocations.lender_id = auth.uid()));
create policy "Borrowers can create trades" on public.trades for insert with check (auth.uid() = borrower_id and status = 'DRAFT');
create policy "Borrowers can update own trades" on public.trades for update using (auth.uid() = borrower_id);
create policy "Borrowers can view own trade transitions" on public.trade_state_transitions for select using (
  exists (select 1 from public.trades where trades.id = trade_state_transitions.trade_id and trades.borrower_id = auth.uid()));
create policy "Lenders can view own allocations" on public.allocations for select using (auth.uid() = lender_id);
create policy "Borrowers can view allocations on own trades" on public.allocations for select using (
  exists (select 1 from public.trades where trades.id = allocations.trade_id and trades.borrower_id = auth.uid()));
create policy "Users can view own lending pot" on public.lending_pots for select using (auth.uid() = user_id);
create policy "Users can insert own lending pot" on public.lending_pots for insert with check (auth.uid() = user_id);
create policy "Users can update own lending pot" on public.lending_pots for update using (auth.uid() = user_id);
create policy "Users can view own ledger entries" on public.pool_ledger for select using (auth.uid() = user_id);
create policy "Users can view own lender preferences" on public.lender_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own lender preferences" on public.lender_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own lender preferences" on public.lender_preferences for update using (auth.uid() = user_id);
create policy "Users can view own proposals" on public.agent_proposals for select using (auth.uid() = user_id);
create policy "Users can update own proposals" on public.agent_proposals for update using (auth.uid() = user_id);
create policy "Users can view own agent runs" on public.agent_runs for select using (auth.uid() = user_id);
create policy "Users can view related events" on public.flowzo_events for select using (true);
create policy "Users can view payment orders for their trades" on public.payment_orders for select using (
  exists (select 1 from public.trades where trades.id = payment_orders.trade_id
    and (trades.borrower_id = auth.uid() or exists (
      select 1 from public.allocations where allocations.trade_id = trades.id and allocations.lender_id = auth.uid()))));
