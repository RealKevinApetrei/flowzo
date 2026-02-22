-- Migration 020: Platform Fee Model (Senior/Junior Tranche) + withdrawal_queued fix
--
-- Senior tranche: Lenders (paid first, 80% of fee, principal protected on default)
-- Junior tranche: Platform/Flowzo (20% spread, absorbs first loss on default)

-- 1. Fix missing column referenced in settle-trade Edge Function
ALTER TABLE public.lending_pots ADD COLUMN IF NOT EXISTS withdrawal_queued boolean DEFAULT false;

-- 2. Platform fee tracking on each trade
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2) DEFAULT 0;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS lender_fee numeric(12,2) DEFAULT 0;
-- Invariant: platform_fee + lender_fee = fee

-- 3. New ledger entry type for platform fee
ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'PLATFORM_FEE';

-- 4. Platform revenue table (audit trail for Flowzo's revenue)
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN ('FEE_INCOME', 'DEFAULT_LOSS', 'ADJUSTMENT')),
  amount numeric(12,2) NOT NULL,
  trade_id uuid REFERENCES public.trades(id),
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON public.platform_revenue(entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_trade ON public.platform_revenue(trade_id);

-- 5. Platform revenue summary view (single-row aggregate)
CREATE OR REPLACE VIEW public.platform_revenue_summary AS
SELECT
  COALESCE(SUM(CASE WHEN entry_type = 'FEE_INCOME' THEN amount ELSE 0 END), 0) AS total_fee_income,
  COALESCE(SUM(CASE WHEN entry_type = 'DEFAULT_LOSS' THEN amount ELSE 0 END), 0) AS total_default_losses,
  COALESCE(SUM(amount), 0) AS net_revenue,
  COUNT(*) FILTER (WHERE entry_type = 'FEE_INCOME') AS fee_transactions,
  COUNT(*) FILTER (WHERE entry_type = 'DEFAULT_LOSS') AS default_events
FROM public.platform_revenue;

-- 6. Monthly revenue breakdown view (for charts)
CREATE OR REPLACE VIEW public.platform_revenue_monthly AS
SELECT
  date_trunc('month', created_at)::date AS month,
  SUM(CASE WHEN entry_type = 'FEE_INCOME' THEN amount ELSE 0 END) AS fee_income,
  SUM(CASE WHEN entry_type = 'DEFAULT_LOSS' THEN amount ELSE 0 END) AS default_losses,
  SUM(amount) AS net_revenue,
  COUNT(*) FILTER (WHERE entry_type = 'FEE_INCOME') AS trade_count
FROM public.platform_revenue
GROUP BY date_trunc('month', created_at)
ORDER BY month;

-- 7. Grants
GRANT SELECT ON public.platform_revenue TO authenticated;
GRANT SELECT ON public.platform_revenue_summary TO authenticated;
GRANT SELECT ON public.platform_revenue_monthly TO authenticated;
GRANT ALL ON public.platform_revenue TO service_role;

-- 8. RLS on platform_revenue
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view platform revenue"
  ON public.platform_revenue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can insert platform revenue"
  ON public.platform_revenue FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can manage platform revenue"
  ON public.platform_revenue FOR ALL TO service_role USING (true) WITH CHECK (true);
