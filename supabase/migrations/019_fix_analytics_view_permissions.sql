-- 019: Fix analytics view permissions
-- Remove security_invoker=true from all analytics views.
-- These are aggregate platform-level views that should show ALL data
-- to any authenticated user, not be filtered by RLS on underlying tables.

alter view public.lender_concentration set (security_invoker = false);
alter view public.lender_leaderboard set (security_invoker = false);
alter view public.match_speed_analytics set (security_invoker = false);
alter view public.matching_efficiency set (security_invoker = false);
alter view public.order_book_depth set (security_invoker = false);
alter view public.order_book_summary set (security_invoker = false);
alter view public.pool_health set (security_invoker = false);
alter view public.pool_overview set (security_invoker = false);
alter view public.pool_summary set (security_invoker = false);
alter view public.risk_distribution set (security_invoker = false);
alter view public.settlement_performance set (security_invoker = false);
alter view public.trade_analytics set (security_invoker = false);
alter view public.trade_performance set (security_invoker = false);
alter view public.yield_curve set (security_invoker = false);
alter view public.yield_trends set (security_invoker = false);
