# Flowzo

**Your bills, shifted. Your money, safe.**

Flowzo is a Monzo-native fintech webapp that uses Open Banking data to power an AI-driven P2P micro-lending platform. It forecasts cash flow shortfalls, proposes bill-date shifts with ML credit scoring, and matches borrowers with lenders through a real-time order book — all validated against 303K real loans.

**Live:** https://flowzo-web.vercel.app | **Pitch:** https://flowzo-web.vercel.app/pitch

---

## What It Does

1. **Connect your bank** via TrueLayer Open Banking — pulls transactions, standing orders, direct debits, and verified identity
2. **30-day cash flow forecast** highlights danger days on a calendar heatmap
3. **AI proposes bill shifts** — Claude explains each recommendation in plain English
4. **ML credit scoring** (300-850) with eligibility gates, credit limits, and continuous score-adjusted pricing
5. **Two-sided order book** — lender supply meets borrower demand with real-time bid/ask spreads
6. **Automated matching** in < 10 seconds with composite scoring (APR + headroom + diversification)
7. **Settlement lifecycle** — atomic MATCHED → LIVE → REPAID/DEFAULTED with platform revenue tracking

The entire pipeline — sync, forecast, propose, score, match, settle — is event-sourced and auditable.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 15, TypeScript strict, App Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| DB / Auth | Supabase (Postgres + RLS + Edge Functions + Realtime) |
| ML | XGBoost (Home Credit dataset, 303K loans) via FastAPI on Railway |
| AI | Claude API (Haiku 4.5) — 7 consumer-facing features |
| Open Banking | TrueLayer (sandbox: accounts, transactions, standing orders, direct debits, identity) |
| Deployment | Vercel |
| Payments | Stubbed (Stripe, GoCardless, OB PIS) |

---

## Key Features

### Borrower
- **Calendar heatmap** — 30-day grid coloured by risk (green/amber/red)
- **AI suggestion feed** — Monzo-style cards with Claude-generated explanations
- **Fee slider** — adjust fee with live match probability (powered by real order book data)
- **Bill Priority Ranker** — Claude ranks which bills to shift first for maximum impact
- **What-If Simulator** — select multiple bills, set shift days, Claude simulates cash flow impact
- **AI Financial Insight** — structured health status (Healthy/Caution/At Risk) with emoji bullet points
- **Credit eligibility gate** — score < 500 blocks trade creation with clear explanation

### Lender
- **D3 bubble board** — force simulation with Supabase Realtime, bubble size = amount, colour = risk grade
- **Lending pot** — available/locked/deployed/yield with utilisation display
- **AI Risk Advisor** — Claude analyses portfolio + market conditions, suggests parameter adjustments
- **Realtime updates** — `LenderRealtimeWrapper` subscribes to lending_pots + allocations changes
- **Duration preferences** — APR from aggregated yield curve (volume-weighted across grades)

### Data Analytics (8 tabs)
- **Overview** — pool stats, trade distribution, risk breakdown, AI anomaly detector
- **Order Book** — two-sided depth chart (bid/ask), market rate cards (bid/ask/spread/liquidity per grade), supply table
- **Performance** — match speed (median 7s), settlement stats, default rates by grade
- **Yield** — monthly yield trends from REPAID trades, cumulative fees chart
- **Credit Risk** — score distribution, eligibility breakdown, grade distribution bars, enforcement rules
- **Revenue** — monthly fee income + default losses (80/20 platform/lender split)
- **Lenders** — full leaderboard (255 lenders), HHI concentration, top lender analysis
- **ML / Quant** — backtest, portfolio returns, EDA, forecast accuracy, credit score explorer with SHAP, stress test, liquidity pool

### Credit Risk System
- **ML credit scoring** — XGBoost (300-850 score range) with real-time re-scoring at match time
- **Eligibility gate** — score >= 500 required, enforced at database trigger level
- **Credit limits** — A: £500/5 trades, B: £200/3 trades, C: £75/1 trade
- **Continuous pricing** — `scoreAdjustedMultiplier()` interpolates within grade bands (~20% APR variation)
- **Term premium** — +15% per 14-day period (3d/7d/14d differentiated yields)
- **Income regularity scaling** — credit limits scaled by primary_bank_health_score (0.5-1.0x)
- **Default history enforcement** — >20% personal default rate OR 2+ defaults in 30 days → blocked

### Claude AI Integration (7 features)
| Feature | Location | Description |
|---------|----------|-------------|
| Bill Shift Explanation | Borrower → suggestion cards | Plain-English explanation of each proposal |
| Financial Insight | Borrower → above suggestions | Structured health status with actionable bullets |
| Bill Priority Ranker | Borrower → tap to rank | Ranks which bills to shift first |
| What-If Simulator | Borrower → interactive | Simulates cash flow impact of multiple shifts |
| Risk Score Explainer | Data → ML/Quant → Credit Score | SHAP-based narrative after scoring |
| Anomaly Detector | Data → Overview | Scans platform metrics for unusual patterns |
| Lender Risk Advisor | Lender → bottom of page | Portfolio optimisation recommendations |

All Claude calls are cached (10-min TTL) and rate-limited (20/min) to control costs.

---

## Data Pipeline

```
TrueLayer OAuth
  ↓
sync-banking-data (Edge Function)
  → accounts, transactions, standing orders, direct debits, identity
  → recurring obligation detection (confidence scoring)
  ↓
compute-borrower-features (Edge Function)
  → 6 engineered features: annual_inflow, avg_monthly_balance,
    days_since_account_open, primary_bank_health_score,
    secondary_bank_health_score, failed_payment_cluster_risk
  → ML credit score (300-850) via Quant API
  → Persists credit_score, limits, eligibility to profile
  ↓
run-forecast (Edge Function)
  → 30-day balance projection with Gamma confidence bands
  → Danger flag when balance < obligation amount
  ↓
generate-proposals (Edge Function)
  → Market-aware fee pricing (bid-ask midpoint when liquid)
  → Continuous score-adjusted multiplier
  → Term premium (+15% per 14-day period)
  ↓
match-trade (Edge Function)
  → Composite scoring: APR compat (40%) + headroom (30%) + diversification (30%)
  → Real-time ML re-scoring via Quant API
  → 50% single-lender diversification cap
  ↓
settle-trade (Edge Function)
  → Atomic: trade status only updates if ALL allocations processed
  → MATCHED → LIVE (disburse) → REPAID (repay + fee credit) or DEFAULTED
  → Platform revenue tracking (20% junior tranche)
```

---

## Database Schema

23 migrations, 20+ tables:

| Table | Purpose |
|---|---|
| `profiles` | User profiles, risk grades, credit_score, eligibility, limits |
| `bank_connections` | TrueLayer tokens, sync status |
| `accounts` | Synced bank accounts with balances |
| `transactions` | Normalised transaction history (90 days) |
| `obligations` | Recurring bills (inferred + standing orders + direct debits) |
| `forecasts` | 30-day daily balance projections with confidence bands |
| `trades` | Bill-shift requests with platform_fee/lender_fee split |
| `trade_state_transitions` | Event-sourced audit trail (trigger) |
| `allocations` | Trade funding split across lenders |
| `lending_pots` | Per-lender balances (available, locked, yield) |
| `pool_ledger` | Double-entry ledger with idempotency keys |
| `lender_preferences` | Auto-match settings, target_apr, risk appetite |
| `agent_proposals` | AI-generated shift suggestions with Claude explanations |
| `platform_revenue` | FEE_INCOME + DEFAULT_LOSS audit trail |
| `flowzo_events` | Event sourcing for all system actions |

**Key views:** yield_curve, yield_curve_agg, order_book_depth, order_book_supply, market_rates, matching_efficiency, trade_performance, credit_score_distribution, eligibility_summary, borrower_track_record, platform_revenue_summary, platform_revenue_monthly

**Trade lifecycle:** `DRAFT` → `PENDING_MATCH` → `MATCHED` → `LIVE` → `REPAID` / `DEFAULTED`

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Supabase project (with service role key)
- TrueLayer sandbox credentials
- Anthropic API key (Claude)

### Setup

```bash
git clone https://github.com/RealKevinApetrei/flowzo.git
cd flowzo
pnpm install
cp .env.example apps/web/.env.local
# Fill in Supabase, TrueLayer, Claude, and Quant API keys
pnpm dev
```

### Seed Data

```bash
source apps/web/.env.local && npx tsx scripts/seed.ts
```

Generates 12,000+ trades, 255 lenders, credit scores, platform revenue, realistic match times.

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| `alex@flowzo.demo` | `flowzo123` | Borrower (Grade C) |
| `jordan@flowzo.demo` | `flowzo123` | Lender |
| `sam@flowzo.demo` | `flowzo123` | Borrower (Grade B) |
| `taylor@flowzo.demo` | `flowzo123` | Borrower (Grade A) |

TrueLayer sandbox: username `john`, password `doe`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `TRUELAYER_CLIENT_ID` | Yes | TrueLayer app client ID |
| `TRUELAYER_CLIENT_SECRET` | Yes | TrueLayer app secret |
| `TRUELAYER_ENV` | Yes | `sandbox` or `production` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `CLAUDE_MODEL` | No | Default: `claude-haiku-4-5-20251001` |
| `QUANT_API_URL` | Yes | ML scoring backend URL |
| `NEXT_PUBLIC_APP_URL` | No | App URL for TrueLayer redirect |
| `CRON_SECRET` | No | Secures cron + admin endpoints |

---

## Admin Endpoints

```bash
# Manually trigger matching for a trade
curl -X POST /api/admin/match -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" -d '{"trade_id": "..."}'

# Manually trigger settlement
curl -X POST /api/admin/settle -H "Authorization: Bearer $CRON_SECRET"
```

---

## Key Metrics

| Metric | Value |
|---|---|
| Trades in database | 12,000+ |
| Median match time | 7 seconds |
| Credit score range | 300-850 (XGBoost) |
| Eligibility threshold | Score >= 500 |
| Forecast accuracy | MAPE ~4% |
| Backtest dataset | 303K Home Credit loans |
| Platform fee | 20% junior tranche |
| Analytics tabs | 8 |
| Edge Functions | 6 |
| Claude AI features | 7 |

---

## Team

Built for a hackathon by a team of 4, targeting the **Monzo** track and the following challenges: **Susquehanna "Best Use of Data"**, **"Best Use of Claude"**, and **"Best Team Under 22"**.

---

## License

MIT
