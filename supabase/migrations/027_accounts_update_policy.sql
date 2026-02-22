-- Migration 027: Allow authenticated users to update their own account balances
-- Fixes: card balance not updating on lending pot top-up / withdrawal
-- Root cause: only SELECT policy existed, so all .update() calls silently failed

CREATE POLICY "Users can update own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
