-- Migration 026: Account balance audit log
-- Tracks every card balance change for full auditability.

CREATE TABLE public.account_balance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL,
  entry_type TEXT NOT NULL,  -- 'TOPUP_DEBIT', 'WITHDRAW_CREDIT', 'AUTO_WITHDRAW_CREDIT', 'SYNC'
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_account_balance_log_user ON public.account_balance_log(user_id, created_at DESC);

-- RLS
ALTER TABLE public.account_balance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance log"
  ON public.account_balance_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (server actions + edge functions)
CREATE POLICY "Service can insert balance log"
  ON public.account_balance_log FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.account_balance_log TO authenticated;
GRANT SELECT, INSERT ON public.account_balance_log TO service_role;
