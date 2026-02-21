# Flowzo

**Your bills, shifted. Your money, safe.**

Flowzo is a Monzo-native fintech webapp that uses Open Banking data to power an AI-driven P2P micro-lending layer. It forecasts cash flow shortfalls, proposes bill-date shifts, and matches borrowers with lenders through a real-time bubble board.

**Live:** https://flowzo-web.vercel.app

---

## What It Does

1. **Connect your bank** via TrueLayer Open Banking (sandbox)
2. **30-day cash flow forecast** highlights danger days on a calendar heatmap
3. **AI proposes bill shifts** -- "Move Netflix from the 15th to the 22nd to avoid a -£45 overdraft. Fee: £1.20"
4. **Lenders fund shifts** through an interactive D3 bubble board
5. **Automated matching & settlement** via Supabase Edge Functions

The entire pipeline -- forecast, propose, match, settle -- is event-sourced and auditable.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 16, TypeScript strict, App Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| DB / Auth | Supabase (Postgres + RLS + Edge Functions + Realtime) |
| Deployment | Vercel |
| Visualisation | D3.js force simulation (bubble board), SVG heatmap |
| AI | Claude API (Haiku 3.5) for plain-English explanations |
| Open Banking | TrueLayer (real sandbox -- OAuth PKCE, AIS) |
| Payments | Stubbed (Stripe, GoCardless, OB PIS) |

---

## Project Structure

```
flowzo/
├── apps/web/                    # Next.js 16 App Router
│   └── src/
│       ├── app/
│       │   ├── (app)/           # Authenticated routes
│       │   │   ├── borrower/    # Heatmap, suggestions, trade detail
│       │   │   ├── lender/      # Bubble board, lending pot, yield
│       │   │   ├── onboarding/  # TrueLayer bank connection
│       │   │   └── settings/
│       │   ├── (auth)/          # Login, signup, OAuth callback
│       │   ├── (marketing)/     # Terms, privacy, FCA disclaimer
│       │   └── api/
│       │       ├── truelayer/   # OAuth auth + callback
│       │       ├── trades/      # Bid submission
│       │       ├── claude/      # AI explanations
│       │       └── webhooks/
│       ├── components/
│       │   ├── borrower/        # Calendar heatmap, suggestion feed,
│       │   │                    # bid slider, probability curve
│       │   ├── lender/          # Bubble board, lending pot, auto-pop,
│       │   │                    # yield dashboard, trade modal
│       │   ├── layout/          # Top bar, bottom nav
│       │   ├── auth/            # Login/signup forms
│       │   ├── shared/          # Amount display, badges
│       │   └── ui/              # shadcn/ui primitives
│       └── lib/
│           ├── supabase/        # Client, server, middleware, admin
│           ├── truelayer/       # OAuth, API wrapper, recurring detection
│           ├── actions/         # Server actions (trades, lending)
│           ├── hooks/           # useRealtime, useBubbleBoard, etc.
│           └── validators.ts    # Zod schemas
├── packages/shared/             # @flowzo/shared
│   └── src/
│       ├── types/               # Database, trade, user, lending types
│       ├── constants/           # Trade status, risk tiers, fee config
│       └── utils/               # Currency, dates, math
└── supabase/
    ├── migrations/              # 12 migrations (schema, RLS, realtime)
    ├── functions/               # 6 Edge Functions
    │   ├── sync-banking-data/   # TrueLayer -> DB sync
    │   ├── run-forecast/        # 30-day balance projection
    │   ├── generate-proposals/  # AI bill-shift proposals
    │   ├── match-trade/         # Lender matching engine
    │   ├── settle-trade/        # Disbursement + repayment
    │   └── explain-proposal/    # Claude plain-English explanation
    └── seed.sql
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Supabase project (with service role key)
- TrueLayer sandbox credentials

### Setup

```bash
# Clone
git clone https://github.com/RealKevinApetrei/flowzo.git
cd flowzo

# Install
pnpm install

# Environment
cp .env.example apps/web/.env.local
# Fill in your Supabase, TrueLayer, and Claude API keys

# Dev
pnpm dev
```

Open http://localhost:3000.

### Database

Apply migrations to your Supabase project:

```bash
supabase db push
```

Or run them manually via Supabase Dashboard > SQL Editor.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (Edge Functions) |
| `TRUELAYER_CLIENT_ID` | Yes | TrueLayer app client ID |
| `TRUELAYER_CLIENT_SECRET` | Yes | TrueLayer app secret |
| `TRUELAYER_ENV` | Yes | `sandbox` or `live` |
| `NEXT_PUBLIC_TRUELAYER_AUTH_URL` | Yes | TrueLayer auth URL |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `CLAUDE_MODEL` | Yes | Claude model ID |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (localhost or production) |
| `CRON_SECRET` | No | Secures cron Edge Function endpoints |
| `GOCARDLESS_ACCESS_TOKEN` | No | GoCardless sandbox token |

---

## Database Schema

18 tables across 12 migrations:

| Table | Purpose |
|---|---|
| `profiles` | User profiles, risk grades, onboarding state |
| `bank_connections` | TrueLayer tokens (jsonb), sync status |
| `accounts` | Synced bank accounts |
| `transactions` | Normalised transaction history |
| `obligations` | Detected recurring bills |
| `forecasts` | 30-day daily balance projections |
| `trades` | Bill-shift requests with full lifecycle |
| `trade_state_transitions` | Event-sourced audit trail (trigger) |
| `allocations` | Trade funding split across lenders |
| `lending_pots` | Per-lender balances (available, locked, yield) |
| `pool_ledger` | Double-entry ledger with idempotency |
| `lender_preferences` | Auto-match settings, risk appetite |
| `agent_proposals` | AI-generated shift suggestions |
| `agent_runs` | Agent execution audit log |

**Trade lifecycle:** `DRAFT` -> `PENDING_MATCH` -> `MATCHED` -> `LIVE` -> `REPAID` / `DEFAULTED`

All monetary values stored as `numeric(12,2)` in GBP.

---

## Key Features

### Borrower
- **Calendar heatmap** -- 30-day grid, cells coloured by risk (green/amber/red)
- **Suggestion feed** -- Monzo-style cards with Accept/Dismiss/Customise
- **Bid slider** -- Adjust fee with live probability curve
- **Comparison card** -- "With Flowzo" vs "Without Flowzo" cost breakdown

### Lender
- **D3 bubble board** -- Force simulation, bubble size = amount, colour = risk grade
- **Auto-pop toggle** -- Automatic matching with pop animations
- **Lending pot** -- Available/locked/deployed/yield with utilisation ring
- **Yield dashboard** -- APR, term, trade count, sparkline

### Data Pipeline
- **Feature engineering** -- Income regularity, balance volatility, failed payment clustering
- **Risk scoring** -- A/B/C grades with dynamic fee pricing
- **Forecasting** -- 30-day projections with confidence bands
- **Event sourcing** -- Full audit trail on every state transition

---

## Demo Flow

1. Sign up with email/password
2. Connect bank (TrueLayer sandbox: username `john`, password `doe`)
3. View calendar heatmap with danger days
4. Accept AI bill-shift suggestion
5. Switch to Lending tab -- see bubbles, fund a trade
6. Watch the full lifecycle: DRAFT -> MATCHED -> LIVE -> REPAID

---

## Team

Built for a hackathon by a team of 3, targeting the **Monzo** track and **Susquehanna "Best Use of Data"** prize.

---

## License

MIT
