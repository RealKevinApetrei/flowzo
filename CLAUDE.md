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
- Initial MVP pushed to `main`
- All subsequent features via PRs
- Commit messages: conventional commits style

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

## Pipeline Status (Member A — Updated 2026-02-21)

### P0 Complete
- [x] Migration 013 applied (RLS bubble board, obligations constraint, forecast_snapshots.completed_at)
- [x] All 6 Edge Functions deployed and ACTIVE
- [x] Pipeline orchestration route: `/api/pipeline/run` (sync → forecast → proposals)
- [x] TrueLayer callback fires pipeline async, redirects to `/borrower`
- [x] Auto-match wired in `submitTrade()` — invokes `match-trade` Edge Function
- [x] Cron routes: `/api/cron/forecast` (6am UTC), `/api/cron/settlement` (7am UTC)
- [x] Seed data: ~425 users, ~1,050 trades, ~500 proposals in DB
- [x] TrueLayer redirect URI fix: derive from request origin (works on localhost + Vercel)

### Known Issues / Tech Debt
- `fundTrade()` in `lib/actions/lending.ts` bypasses `update_lending_pot()` RPC — manipulates pot columns directly
- `ShiftProposalPayload` type mismatch between Edge Function fields and shared types
- `sonner` package missing from `apps/web` (Member C needs to install)

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
