-- Migration 023: Enforce default history in eligibility + credit risk analytics views

-- 1. Update eligibility trigger to check default history
CREATE OR REPLACE FUNCTION check_borrower_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  p RECORD;
  active_count integer;
  default_rate numeric;
  recent_defaults integer;
BEGIN
  SELECT credit_score, max_trade_amount, max_active_trades, eligible_to_borrow
    INTO p FROM profiles WHERE id = NEW.borrower_id;

  -- Must be eligible (scored and score >= 500)
  IF NOT COALESCE(p.eligible_to_borrow, false) THEN
    RAISE EXCEPTION 'Borrower not eligible: credit score below minimum threshold (500)';
  END IF;

  -- Check default history: >20% personal default rate → blocked
  SELECT
    COALESCE(
      count(*) FILTER (WHERE status = 'DEFAULTED')::numeric /
      NULLIF(count(*) FILTER (WHERE status IN ('REPAID', 'DEFAULTED')), 0),
      0
    ),
    COALESCE(count(*) FILTER (WHERE status = 'DEFAULTED' AND defaulted_at > now() - interval '30 days'), 0)
  INTO default_rate, recent_defaults
  FROM trades
  WHERE borrower_id = NEW.borrower_id AND status IN ('REPAID', 'DEFAULTED');

  IF default_rate > 0.20 THEN
    RAISE EXCEPTION 'Borrower blocked: personal default rate %.1f%% exceeds 20%% threshold', default_rate * 100;
  END IF;

  IF recent_defaults >= 2 THEN
    RAISE EXCEPTION 'Borrower blocked: % defaults in last 30 days (max 1 allowed)', recent_defaults;
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

-- 2. Credit risk analytics views for /data page

-- Score distribution by grade
CREATE OR REPLACE VIEW public.credit_score_distribution AS
SELECT
  risk_grade,
  count(*) AS borrower_count,
  ROUND(AVG(credit_score)::numeric) AS avg_score,
  MIN(credit_score) AS min_score,
  MAX(credit_score) AS max_score,
  count(*) FILTER (WHERE eligible_to_borrow) AS eligible_count,
  count(*) FILTER (WHERE NOT COALESCE(eligible_to_borrow, false)) AS ineligible_count,
  ROUND(AVG(max_trade_amount)::numeric, 2) AS avg_credit_limit
FROM profiles
WHERE credit_score IS NOT NULL
GROUP BY risk_grade
ORDER BY risk_grade;

GRANT SELECT ON public.credit_score_distribution TO authenticated;

-- Credit utilization: how much of their limit are borrowers using
CREATE OR REPLACE VIEW public.credit_utilization AS
SELECT
  p.risk_grade,
  p.credit_score,
  p.max_trade_amount AS credit_limit,
  COALESCE(active.total_amount, 0) AS amount_in_use,
  COALESCE(active.active_count, 0) AS active_trades,
  p.max_active_trades AS trade_limit,
  CASE WHEN p.max_trade_amount > 0
    THEN ROUND((COALESCE(active.total_amount, 0) / p.max_trade_amount * 100)::numeric, 1)
    ELSE 0
  END AS utilization_pct,
  bt.personal_default_rate,
  bt.repaid_count,
  bt.default_count
FROM profiles p
LEFT JOIN (
  SELECT borrower_id, SUM(amount) AS total_amount, count(*) AS active_count
  FROM trades WHERE status IN ('PENDING_MATCH', 'MATCHED', 'LIVE')
  GROUP BY borrower_id
) active ON active.borrower_id = p.id
LEFT JOIN borrower_track_record bt ON bt.borrower_id = p.id
WHERE p.credit_score IS NOT NULL
  AND (p.role_preference = 'BORROWER_ONLY' OR p.role_preference = 'BOTH');

GRANT SELECT ON public.credit_utilization TO authenticated;

-- Eligibility summary (single-row aggregate)
CREATE OR REPLACE VIEW public.eligibility_summary AS
SELECT
  count(*) AS total_borrowers,
  count(*) FILTER (WHERE eligible_to_borrow) AS eligible,
  count(*) FILTER (WHERE NOT COALESCE(eligible_to_borrow, false)) AS ineligible,
  ROUND(
    count(*) FILTER (WHERE eligible_to_borrow)::numeric / NULLIF(count(*), 0) * 100,
    1
  ) AS eligible_pct,
  ROUND(AVG(credit_score)::numeric) AS avg_score,
  MIN(credit_score) AS min_score,
  MAX(credit_score) AS max_score,
  count(*) FILTER (WHERE credit_score >= 700) AS grade_a_count,
  count(*) FILTER (WHERE credit_score >= 600 AND credit_score < 700) AS grade_b_count,
  count(*) FILTER (WHERE credit_score >= 500 AND credit_score < 600) AS grade_c_count,
  count(*) FILTER (WHERE credit_score < 500) AS ineligible_score_count
FROM profiles
WHERE credit_score IS NOT NULL;

GRANT SELECT ON public.eligibility_summary TO authenticated;
