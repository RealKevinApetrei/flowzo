-- 017: Security hardening for new views and RPC

-- Set security_invoker = true so views run with the caller's permissions
alter view public.order_book_depth set (security_invoker = true);
alter view public.trade_performance set (security_invoker = true);
alter view public.yield_curve set (security_invoker = true);
alter view public.lender_leaderboard set (security_invoker = true);
alter view public.platform_totals set (security_invoker = true);
alter view public.matching_efficiency set (security_invoker = true);
