# Flowzo - Claude Code Conventions

## Project Overview
Flowzo is a Monzo-native "Bills + Pots" fintech webapp with a pooled P2P micro-lending layer. Built for a hackathon.

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 15 App Router, TypeScript strict, Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Edge Functions, Realtime)
- **Deployment**: Vercel
- **Integrations**: TrueLayer (real sandbox), Claude API, Stripe/GoCardless/PIS (stubbed)

## Structure
- `apps/web/` — Next.js app
- `packages/shared/` — @flowzo/shared types, constants, utils
- `supabase/` — migrations, Edge Functions

## Key Conventions

### Code Style
- TypeScript strict mode everywhere
- All monetary values in **pence** (integers), convert to pounds only at display layer
- Use `formatCurrency()` from `@flowzo/shared` for display
- Prefer server components; use `"use client"` only when needed
- Use server actions for mutations, API routes for OAuth/streaming/webhooks

### Naming
- Database: snake_case (Postgres convention)
- TypeScript: camelCase for variables/functions, PascalCase for types/components
- Files: kebab-case for components/routes, camelCase for lib/utils

### Components
- Feature-grouped: `components/borrower/`, `components/lender/`, `components/shared/`
- shadcn/ui components in `components/ui/`
- Mobile-first responsive, Monzo design language

### Design System
- Primary: Hot coral `#FF5A5F`
- Nav: Dark navy `#1B1B3A`
- Background: Off-white `#FAFAFA`
- Cards: White with 16px border-radius
- Buttons: Pill style (border-radius: 9999px)
- Font: Inter

### Database
- All tables have RLS enabled
- Edge Functions use service_role to bypass RLS
- Trade status lifecycle: DRAFT → PENDING_MATCH → MATCHED → LIVE → REPAID/DEFAULTED
- Pool mutations go through `update_lending_pot()` function (atomic + idempotent)

### Git Workflow
- **Never push directly to `main`** — always use feature branches + PRs
- Multiple Claude Code instances run in parallel — **always use worktrees** (`/worktree` or `EnterWorktree`) to avoid conflicts
- **Worktree convention**: Use `EnterWorktree` at the start of every task. This creates an isolated copy under `.claude/worktrees/<name>` on a new branch. On session exit, you'll be prompted to keep or remove it. Worktrees prevent merge conflicts between parallel Claude Code sessions and keep the main working tree clean.
- Commit messages: conventional commits style
- Claude code review runs automatically on PRs via `anthropics/claude-code-action@v1`

### Testing
- Vitest for unit tests (business logic: risk scoring, fee calc, recurring detection)
- Playwright for E2E (banking data integration)

## Environment Variables
See `.env.example` for all required variables.

## Team Split (from PRD §6)

This is a 4-person hackathon team. Each member works on feature branches via PRs.

### You are Member A: Data Pipeline & Integrations (the "Plumber")
**Owner: Kevin** — This Claude Code instance focuses primarily on Member A work.
**Branch prefix:** `feat/pipeline-*`

**Member A is the critical path — unblocks everyone else.**

Priority tasks (see PRD for full list):
- P0: Apply DB migrations, configure Supabase service role key, deploy Edge Functions
- P0: Register TrueLayer redirect URIs (production + localhost), test sandbox flow e2e
- P0: Create seed data for demo
- P1: Wire auto-trigger (PENDING_MATCH → match-trade), cron jobs (forecast, settlement)
- P1: Verify RLS policies, Supabase Realtime

### Other Members (coordinate with, can implement on if needed)
- **Member B (Data Science / "Quant"):** Backtest page, EDA dashboard, SHAP charts, stress testing — `feat/data-*`
- **Member C (Frontend / "Designer-Dev"):** UI polish, landing page, loading/error states, animations — `feat/ui-*`
- **Member D (Infra / "PM-DevOps"):** CI/CD, tests, pitch deck, demo script — `feat/infra-*` or `feat/pitch-*`

### Dependency Map
```
Member A (Pipeline) ──► Member B (needs real data for backtest + EDA)
                    ──► Member C (needs working API + data in DB)
                    ──► Member D (needs working demo for script + video)
```

## Pipeline Status (Member A — Updated 2026-02-22 02:00)

### P0 Complete — All Critical Path DONE
- [x] Migration 013 applied (RLS bubble board, obligations constraint, forecast_snapshots.completed_at)
- [x] All 6 Edge Functions deployed and ACTIVE (sync, forecast, proposals, match, settle, explain)
- [x] Pipeline orchestration: `/api/pipeline/run` chains sync → forecast → proposals
- [x] TrueLayer sandbox working: `uk-cs-mock` provider, dynamic redirect URI from request origin
- [x] TrueLayer callback fires pipeline async, redirects to `/borrower`
- [x] Auto-match wired in `submitTrade()` — invokes `match-trade` Edge Function
- [x] Cron routes: `/api/cron/forecast` (6am UTC), `/api/cron/settlement` (7am UTC)
- [x] Seed data: ~425 users, ~1,050 trades, ~500 proposals, ~1,400 obligations, 600 forecasts
- [x] Edge Function secrets: TRUELAYER_ENV, CLIENT_ID, CLIENT_SECRET set
- [x] Token refresh: sync-banking-data retries with refreshed token on 401
- [x] Build: Fixed missing `@radix-ui/react-slider` dependency

### Bills Page Pipeline (PR #58, closes #54)
- [x] Seed obligations: 20 UK bill templates, 3-8 per borrower, `next_expected` dates across 30 days
- [x] Seed bank accounts: 250 borrowers with risk-grade-based balances
- [x] Seed forecasts: 30-day pre-generated for first 20 demo borrowers with payday income pattern
- [x] Link obligations to trades (~50% of MATCHED/LIVE) and proposals (real merchant names/IDs)
- [x] Forecast Edge Function: trade repayment outflows on `new_due_date`
- [x] Forecast Edge Function: payday pattern detection (replaces flat daily income average)
- [x] `exec_sql` RPC created for seed script cleanup

### TrueLayer Sandbox Notes
- Sandbox Mock bank only accepts credentials: **john** / **doe**
- Random credentials will hang on "connecting..." — this is TrueLayer's expected behavior
- Vercel redirect URI must be registered in TrueLayer Console: `https://<domain>/api/truelayer/callback`
- Production: set `TRUELAYER_ENV=production` to switch to real banks (uk-ob-all uk-oauth-all)

### Edge Function Deployment (2026-02-22)
All 3 updated Edge Functions deployed: generate-proposals (market pricing + eligibility), compute-borrower-features (credit persistence), settle-trade (atomicity).

### Credit Risk System (Production-Level)
- **Eligibility gate**: score >= 500 required (DB trigger `check_borrower_eligibility`)
- **Credit limits enforced at DB level**: A=£500/5 trades, B=£200/3 trades, C=£75/1 trade
- **Default history enforcement**: >20% default rate OR 2+ defaults in 30 days → blocked
- **Continuous pricing**: `scoreAdjustedMultiplier()` interpolates within grade bands (A: 0.8-1.2x, B: 1.2-1.8x, C: 1.8-2.5x)
- **Term premium**: +15% per 14-day period (3d/7d/14d differentiated)
- **Income regularity scaling**: credit limits scaled by primary_bank_health_score (0.5-1.0x)
- **Credit Risk tab** on /data page: score distribution, eligibility breakdown, rules display
- **Profile columns**: credit_score, max_trade_amount, max_active_trades, eligible_to_borrow, last_scored_at

### Known Issues / Tech Debt
- settle-trade processes allocations in a loop (not atomic) — if a step fails mid-loop, ledger/allocation mismatch possible
- N+1 query pattern in match-trade lender scoring (fetches each lender's exposure individually)
- CORS wildcard (`*`) on Edge Functions — should restrict to app domain in production

### Team Unblock Status
- **Member B (Data Science):** UNBLOCKED — seed data in DB (obligations, forecasts, trades with obligation links), see issue #60
- **Member C (Frontend):** Bills page data pipeline ready — verify UI displays seeded data, see issue #59
- **Member D (Infra/Pitch):** UNBLOCKED — working demo exists, can write demo script + pitch deck

### Handoff Reminders
**Always** create/update handoff docs when completing pipeline work:
- Update this section with what's done and what's unblocked
- Update `FRONTEND_HANDOFF.md` if API contracts change
- Create GitHub Issues for dependencies other members need

## Quick Start
```bash
pnpm install
pnpm dev
```

## Seed Data
```bash
source apps/web/.env.local && npx tsx scripts/seed.ts
```
Demo user credentials: `borrower-001@flowzo-demo.test` / `FlowzoDemo2026!`
