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

## Quick Start
```bash
pnpm install
pnpm dev
```
