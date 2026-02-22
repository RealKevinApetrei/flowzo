-- Migration 028: Fix get_lender_current_apy status filter + tighten balance_log RLS

-- Fix: APY function was filtering allocations by 'RESERVED' but LIVE trades
-- have allocations in 'ACTIVE' status (RESERVED -> ACTIVE happens during disburse)
CREATE OR REPLACE FUNCTION public.get_lender_current_apy(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT round(
        sum(a.amount_slice * (t.fee / nullif(t.amount, 0)) * (365.0 / nullif(t.shift_days, 0))) * 10000
        / nullif(total.weight, 0)
      )
      FROM allocations a
      JOIN trades t ON t.id = a.trade_id
      CROSS JOIN LATERAL (
        SELECT sum(a2.amount_slice) AS weight
        FROM allocations a2
        JOIN trades t2 ON t2.id = a2.trade_id
        WHERE a2.lender_id = p_user_id
          AND t2.status = 'LIVE'
          AND a2.status = 'ACTIVE'
      ) total
      WHERE a.lender_id = p_user_id
        AND t.status = 'LIVE'
        AND a.status = 'ACTIVE'
        AND t.amount > 0
        AND t.shift_days > 0
    ),
    0
  );
$$;

-- Tighten account_balance_log INSERT policy: only own entries
DROP POLICY IF EXISTS "Service can insert balance log" ON public.account_balance_log;
CREATE POLICY "Users can insert own balance log"
  ON public.account_balance_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
