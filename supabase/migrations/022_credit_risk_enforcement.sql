-- Migration 022: Production Credit Risk Enforcement
--
-- Adds credit scoring persistence, eligibility gates, and credit limits.
-- Borrowers with score < 500 are ineligible. Limits enforced via DB trigger.

-- 1. Add credit risk columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credit_score integer DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_trade_amount numeric(12,2) DEFAULT 75;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_active_trades integer DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eligible_to_borrow boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_scored_at timestamptz DEFAULT NULL;

-- 2. Borrower eligibility trigger — enforces limits at trade creation
CREATE OR REPLACE FUNCTION check_borrower_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  p RECORD;
  active_count integer;
BEGIN
  SELECT credit_score, max_trade_amount, max_active_trades, eligible_to_borrow
    INTO p FROM profiles WHERE id = NEW.borrower_id;

  -- Must be eligible (scored and score >= 500)
  IF NOT COALESCE(p.eligible_to_borrow, false) THEN
    RAISE EXCEPTION 'Borrower not eligible: credit score below minimum threshold (500)';
  END IF;

  -- Amount within credit limit
  IF NEW.amount > COALESCE(p.max_trade_amount, 75) THEN
    RAISE EXCEPTION 'Trade amount exceeds credit limit of %', p.max_trade_amount;
  END IF;

  -- Active trade count within limit
  SELECT count(*) INTO active_count FROM trades
    WHERE borrower_id = NEW.borrower_id
      AND status IN ('PENDING_MATCH', 'MATCHED', 'LIVE');
  IF active_count >= COALESCE(p.max_active_trades, 1) THEN
    RAISE EXCEPTION 'Active trade limit reached: % of % allowed', active_count, p.max_active_trades;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_check_borrower_eligibility ON trades;
CREATE TRIGGER trg_check_borrower_eligibility
  BEFORE INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION check_borrower_eligibility();

-- 3. Borrower repayment track record view
CREATE OR REPLACE VIEW public.borrower_track_record AS
SELECT
  borrower_id,
  count(*) FILTER (WHERE status = 'REPAID') AS repaid_count,
  count(*) FILTER (WHERE status = 'DEFAULTED') AS default_count,
  count(*) FILTER (WHERE status IN ('REPAID', 'DEFAULTED')) AS total_settled,
  ROUND(
    count(*) FILTER (WHERE status = 'DEFAULTED')::numeric /
    NULLIF(count(*) FILTER (WHERE status IN ('REPAID', 'DEFAULTED')), 0),
    4
  ) AS personal_default_rate,
  MAX(defaulted_at) AS last_default_at
FROM trades
WHERE status IN ('REPAID', 'DEFAULTED')
GROUP BY borrower_id;

GRANT SELECT ON public.borrower_track_record TO authenticated;

-- 4. Fix risk multiplier discrepancy: align SQL with Edge Functions (C = 2.0x)
CREATE OR REPLACE FUNCTION compute_risk_score(
  p_annual_inflow numeric,
  p_balance numeric,
  p_days_account integer,
  p_health_score numeric
) RETURNS TABLE(
  score integer,
  grade text,
  max_shifted_amount numeric,
  max_shift_days integer,
  max_active_trades integer
) AS $$
DECLARE
  s integer := 0;
BEGIN
  -- Income scoring (0-30)
  IF p_annual_inflow > 30000 THEN s := s + 30;
  ELSIF p_annual_inflow > 20000 THEN s := s + 20;
  ELSIF p_annual_inflow > 10000 THEN s := s + 10;
  END IF;

  -- Balance scoring (0-25)
  IF p_balance > 2000 THEN s := s + 25;
  ELSIF p_balance > 1000 THEN s := s + 15;
  ELSIF p_balance > 500 THEN s := s + 10;
  END IF;

  -- Account age scoring (0-20)
  IF p_days_account > 365 THEN s := s + 20;
  ELSIF p_days_account > 180 THEN s := s + 12;
  ELSIF p_days_account > 90 THEN s := s + 5;
  END IF;

  -- Health score (0-25)
  s := s + LEAST(ROUND(p_health_score * 25)::integer, 25);

  -- Grade assignment with credit limits
  IF s >= 70 THEN
    RETURN QUERY SELECT s, 'A'::text, 500.00::numeric, 14, 5;
  ELSIF s >= 40 THEN
    RETURN QUERY SELECT s, 'B'::text, 200.00::numeric, 10, 3;
  ELSIF s >= 20 THEN
    RETURN QUERY SELECT s, 'C'::text, 75.00::numeric, 7, 1;
  ELSE
    -- Ineligible: score too low
    RETURN QUERY SELECT s, 'C'::text, 0.00::numeric, 0, 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Index for fast active trade count check
CREATE INDEX IF NOT EXISTS idx_trades_borrower_active
  ON trades (borrower_id, status)
  WHERE status IN ('PENDING_MATCH', 'MATCHED', 'LIVE');
