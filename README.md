# Flowzo

**Your bills, shifted. Your money, safe.**

Flowzo is a Monzo-native fintech webapp that uses Open Banking data to power an AI-driven P2P micro-lending platform. It forecasts cash flow shortfalls using a day-of-week Gamma statistical model, proposes bill-date shifts with ML credit scoring, and matches borrowers with lenders through a real-time order book — all validated against 307K real Home Credit loans.

**Live:** https://flowzo-web.vercel.app | **Pitch:** https://flowzo-web.vercel.app/pitch

---

## What It Does

1. **Connect your bank** via TrueLayer Open Banking — pulls transactions, standing orders, direct debits, and verified identity
2. **30-day cash flow forecast** with Gamma confidence bands highlights danger days on a calendar heatmap
3. **Irregular spending model** — day-of-week Gamma distribution learns your real discretionary spend pattern
4. **AI proposes bill shifts** — Claude explains each recommendation in plain English
5. **ML credit scoring** (300–850) with eligibility gates, credit limits, and continuous score-adjusted pricing
6. **Two-sided order book** — lender supply meets borrower demand with real-time bid/ask spreads
7. **Automated matching** in < 10 seconds with composite scoring (APR + headroom + diversification)
8. **Settlement lifecycle** — atomic MATCHED → LIVE → REPAID/DEFAULTED with platform revenue tracking

The entire pipeline — sync, score, forecast, propose, match, settle — is event-sourced and auditable.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 15, TypeScript strict, App Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| DB / Auth | Supabase (Postgres + RLS + Edge Functions + Realtime) |
| ML / Analytics | XGBoost (Home Credit dataset, 307K loans) via FastAPI on Railway |
| Statistical Model | Gamma distribution — irregular spend forecast (per-weekday fit) |
| AI | Claude API (Haiku 4.5) — 7 consumer-facing features |
| Open Banking | TrueLayer (sandbox + production: accounts, transactions, standing orders, direct debits, identity) |
| Deployment | Vercel (frontend) + Railway (ML backend) |
| CI/CD | GitHub Actions (lint, typecheck, build on every PR) |
| Payments | Stubbed (Stripe, GoCardless, OB PIS ready to wire) |

---

## Key Features

### Borrower
- **Calendar heatmap** — 30-day grid coloured by risk (green/amber/red) with Gamma confidence bands
- **AI suggestion feed** — Monzo-style cards with Claude-generated explanations
- **Fee slider** — adjust fee with live match probability (powered by real order book data)
- **Bill Priority Ranker** — Claude ranks which bills to shift first for maximum impact
- **What-If Simulator** — select multiple bills, set shift days, Claude simulates cash flow impact
- **AI Financial Insight** — structured health status (Healthy/Caution/At Risk) with emoji bullet points
- **Credit profile card** — live credit score gauge (300–850), grade badge, eligibility status, borrowing limits
- **Credit eligibility gate** — score < 500 blocks trade creation with clear explanation

### Lender
- **D3 bubble board** — force simulation with Supabase Realtime, bubble size = amount, colour = risk grade
- **Lending pot** — available/locked/deployed/yield with utilisation display
- **AI Risk Advisor** — Claude analyses portfolio + market conditions, suggests parameter adjustments
- **Realtime updates** — subscribes to `lending_pots` + `allocations` changes via Supabase Realtime
- **Lender preferences** — auto-match toggle, target APR, risk appetite bands (A only / A+B / all grades), min/max shift days

### Data Analytics (8 tabs)
- **Overview** — pool stats, trade distribution, risk breakdown, AI anomaly detector
- **Order Book** — two-sided depth chart (bid/ask), market rate cards (bid/ask/spread/liquidity per grade), supply table
- **Performance** — match speed (median 7s), settlement stats, default rates by grade
- **Yield** — monthly yield trends from REPAID trades, cumulative fees chart
- **Credit Risk** — score distribution, eligibility breakdown, grade distribution bars, enforcement rules
- **Revenue** — monthly fee income + default losses (80/20 platform/lender split)
- **Lenders** — full leaderboard (255 lenders), HHI concentration, top lender analysis
- **ML / Quant** — backtest, portfolio returns, EDA, forecast accuracy, credit score explorer with SHAP, stress test, simulated liquidity pool

### Credit Risk System
- **ML credit scoring** — XGBoost trained on 307,511 loans (300–850 score range) with real-time re-scoring at match time
- **Eligibility gate** — score ≥ 500 required, enforced at database trigger level
- **Credit limits** — A: £500/5 trades, B: £200/3 trades, C: £75/1 trade
- **Continuous pricing** — `scoreAdjustedMultiplier()` interpolates within grade bands (~20% APR variation)
- **Term premium** — +15% per 14-day period (3d/7d/14d differentiated yields)
- **Income regularity scaling** — credit limits scaled by `primary_bank_health_score` (0.5–1.0×)
- **Default history enforcement** — >20% personal default rate OR 2+ defaults in 30 days → blocked

### Irregular Spending Forecast (Gamma Model)
The `spending_forecast.py` module classifies every transaction as INCOME / RECURRING / IRREGULAR using coefficient-of-variation gap analysis, then fits a Gamma distribution per weekday:

- **Classification** — obligation merchant names + CV-based recurring detection (gap CV < 0.5 → recurring)
- **Per-weekday Gamma fits** — captures Mon vs Fri vs Sat spending patterns (minimum 4 samples per bucket)
- **Payday multiplier** — detects modal payday day-of-month, applies up to 2× spend multiplier on days 1–2 after
- **Outlier removal** — drops daily totals above μ + 3σ before fitting to prevent one-off purchases skewing the model
- **Model tiers** — `gamma_dow` (per-weekday, best) → `gamma_flat` (overall, moderate) → `fallback_flat` (sparse history)
- **Confidence bands** — p10/p90 from fitted Gamma distribution, replaces the old flat ±£3/day heuristic

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

## Project Structure

```
flowzo/
├── apps/
│   └── web/                     # Next.js 15 app (frontend + API routes)
│       └── src/
│           ├── app/
│           │   ├── (app)/       # Protected routes (borrower, lender, data, settings)
│           │   ├── (auth)/      # Login, signup, callback
│           │   ├── (marketing)/ # Landing page, terms, privacy, FCA disclaimer
│           │   └── api/         # API routes (TrueLayer, Claude, quant proxy, cron, admin)
│           ├── components/
│           │   ├── borrower/    # Calendar heatmap, suggestion feed, danger summary
│           │   ├── lender/      # Bubble board, lending pot, risk advisor
│           │   ├── data/        # Analytics charts, quant dashboard, risk explorer
│           │   ├── shared/      # Reusable UI fragments
│           │   └── ui/          # shadcn/ui components
│           └── lib/             # Supabase client, quant-api fetchers, utils
├── packages/
│   └── shared/                  # @flowzo/shared — types, constants, formatCurrency()
├── quant_analysis/              # Python ML/analytics backend (Railway)
│   ├── api/main.py              # FastAPI server (13 endpoints)
│   ├── src/
│   │   ├── model_trainer.py     # XGBoost classifier, auto-save on first train
│   │   ├── scorecard.py         # PD → 300–850 credit score + grade
│   │   ├── data_prep.py         # Feature engineering (307K rows)
│   │   ├── analytics.py         # Backtest, portfolio returns, EDA, stress test
│   │   ├── simulation.py        # Synthetic lender pool (1,000 lenders)
│   │   ├── spending_forecast.py # Gamma irregular spend classifier + forecaster
│   │   └── explainability.py   # SHAP waterfall explanations
│   ├── models/                  # Serialised model + sample data (joblib)
│   ├── scripts/
│   │   ├── pretrain.py          # One-time full training (307K rows → joblib)
│   │   ├── test_all.py          # 53-test suite (scorecard, analytics, model, API)
│   │   └── test_spending_forecast.py  # 34-test suite (Gamma model)
│   └── requirements.txt
├── supabase/
│   ├── functions/               # 7 Deno Edge Functions
│   └── migrations/              # 28 SQL migrations (28 files)
├── scripts/
│   └── seed.ts                  # Demo data generator
├── .github/workflows/           # CI/CD: lint, typecheck, build
├── CLAUDE.md                    # Codebase conventions + pipeline status
├── PRD.md                       # Product requirements (494 lines)
└── FRONTEND_HANDOFF.md          # API contracts for frontend integration
```

---

## Data Pipeline

```
TrueLayer OAuth
  ↓
sync-banking-data (Edge Function)
  → accounts, transactions (90 days), standing orders, direct debits, identity
  → recurring obligation detection (gap-CV confidence scoring)
  ↓
compute-borrower-features (Edge Function)
  → 6 engineered features: annual_inflow, avg_monthly_balance,
    days_since_account_open, primary_bank_health_score,
    secondary_bank_health_score, failed_payment_cluster_risk
  → XGBoost ML credit score (300–850) via Quant API
  → persists credit_score, risk_grade, limits, eligibility to profile
  ↓
run-forecast (Edge Function)
  → POST /api/forecast/spending → Quant API (per-day Gamma irregular spend)
  → 30-day balance projection with data-driven p10/p90 confidence bands
  → danger_flag when balance < £100 overdraft buffer
  ↓
generate-proposals (Edge Function)
  → market-aware fee pricing (bid-ask midpoint when liquid)
  → continuous score-adjusted multiplier (±20% within grade)
  → term premium (+15% per 14-day period)
  ↓
match-trade (Edge Function)
  → composite scoring: APR compat (40%) + headroom (30%) + diversification (30%)
  → real-time ML re-scoring via Quant API (graceful degradation)
  → 50% single-lender diversification cap
  ↓
settle-trade (Edge Function)
  → atomic: trade status only updates if ALL allocations processed
  → MATCHED → LIVE (disburse) → REPAID (repay + fee credit) or DEFAULTED
  → platform revenue tracking (20% junior tranche)
```

---

## Database Schema

28 migrations, 20+ tables, 15+ views, 3 RPCs.

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles — risk_grade, credit_score, max_trade_amount, eligibility, limits |
| `bank_connections` | TrueLayer tokens, sync status, last_synced_at |
| `accounts` | Synced bank accounts with live balances |
| `transactions` | Normalised 90-day transaction history |
| `standing_orders` | Recurring scheduled payments |
| `direct_debits` | Direct debit mandates |
| `obligations` | Recurring bills — inferred + standing orders + direct debits with confidence scores |
| `forecasts` | 30-day daily balance projections with Gamma confidence bands and danger flags |
| `trades` | Bill-shift requests — amount, fee, shift_days, status lifecycle, platform/lender fee split |
| `trade_state_transitions` | Event-sourced audit trail of every status change (trigger) |
| `allocations` | Trade funding split across lenders with per-allocation status |
| `lending_pots` | Per-lender balances — available, locked, total_deployed, realized_yield |
| `pool_ledger` | Double-entry ledger (DEPOSIT, WITHDRAW, RESERVE, RELEASE, DISBURSE, REPAY, FEE_CREDIT) |
| `lender_preferences` | Auto-match settings, target_apr, risk appetite bands, shift day limits |
| `agent_proposals` | AI-generated bill shift suggestions with Claude explanation text |
| `platform_revenue` | FEE_INCOME + DEFAULT_LOSS audit trail |
| `flowzo_events` | Event sourcing for all system actions |

**Trade lifecycle:** `DRAFT` → `PENDING_MATCH` → `MATCHED` → `LIVE` → `REPAID` / `DEFAULTED`

### Key Views

| View | Purpose |
|---|---|
| `order_book_depth` | PENDING_MATCH trades grouped by grade — count, total, avg amount, implied APR |
| `order_book_supply` | Lender-side: available capital by risk appetite and grade |
| `market_rates` | Bid/ask APR spread + liquidity ratio per grade (drives proposal pricing) |
| `yield_curve` | Average APR by term bucket (3d/7d/14d) and grade |
| `yield_curve_agg` | Volume-weighted blended APR across all grades |
| `trade_analytics` | Trades grouped by grade/status — count, avg amount, avg fee, default rate |
| `trade_performance` | Repaid/defaulted counts, settlement rate, avg APR |
| `matching_efficiency` | Median match time, % matched within 1min/1hr |
| `lender_leaderboard` | Top lenders ranked by capital deployed, locked, yield |
| `credit_score_distribution` | Score histogram across 50-point buckets |
| `eligibility_summary` | Eligible vs ineligible user breakdown |
| `borrower_track_record` | Per-borrower personal default rate + recent defaults |
| `platform_revenue_summary` | Total fee income, total default losses, net revenue |
| `platform_revenue_monthly` | Monthly revenue breakdown |
| `pool_overview` | Total pool size, available, locked, lender count |

### Key RPCs

| Function | Purpose |
|---|---|
| `update_lending_pot()` | Atomic ledger update with idempotency key — safe for concurrent calls |
| `get_lender_current_apy()` | Capital-weighted APY calculation for a lender |
| `exec_sql()` | Admin SQL execution for seed script cleanup |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- Supabase project (with service role key)
- TrueLayer sandbox credentials
- Anthropic API key (Claude)
- Python 3.11+ with conda (for Quant ML service)

### Setup (Frontend)

```bash
git clone https://github.com/RealKevinApetrei/flowzo.git
cd flowzo
pnpm install
cp .env.example apps/web/.env.local
# Fill in Supabase, TrueLayer, Claude, and Quant API keys
pnpm dev
```

### Setup (Quant ML Service)

The FastAPI ML backend must be running for credit scoring, stress testing, and spending forecasts.

```bash
cd quant_analysis

# First-time setup: create conda environment
conda create -n hackeurope python=3.11
conda activate hackeurope
pip install -r requirements.txt

# First-time training: trains XGBoost on 307K rows, saves model (takes ~30s)
python scripts/pretrain.py

# Start the API server
uvicorn api.main:app --reload --port 8000
```

After the first `pretrain.py` run, subsequent API startups load from `models/xgboost_model.joblib` in ~1 second — no retraining.

**Verify the service:**
```bash
curl http://localhost:8000/health
# → {"status": "ok", "model_loaded": true}
```

Set `QUANT_API_URL=http://localhost:8000` in your `.env.local` for local development.

### Running Tests (Quant)

```bash
cd quant_analysis
conda run -n hackeurope python scripts/test_all.py              # 53 tests
conda run -n hackeurope python scripts/test_spending_forecast.py # 34 tests
```

All 87 tests should pass green.

### Seed Data

```bash
source apps/web/.env.local && npx tsx scripts/seed.ts
```

Generates 12,000+ trades, 255 lenders, credit scores, platform revenue, and realistic match times across all trade statuses (DRAFT → DEFAULTED).

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| `alex@flowzo.demo` | `flowzo123` | Borrower (Grade C) |
| `jordan@flowzo.demo` | `flowzo123` | Lender |
| `sam@flowzo.demo` | `flowzo123` | Borrower (Grade B) |
| `taylor@flowzo.demo` | `flowzo123` | Borrower (Grade A) |

**TrueLayer sandbox bank:** username `john`, password `doe` (any other credentials will hang — this is expected TrueLayer behaviour).

---

## Environment Variables

### Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `TRUELAYER_CLIENT_ID` | Yes | TrueLayer app client ID |
| `TRUELAYER_CLIENT_SECRET` | Yes | TrueLayer app secret |
| `TRUELAYER_ENV` | Yes | `sandbox` or `production` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `CLAUDE_MODEL` | No | Default: `claude-haiku-4-5-20251001` |
| `QUANT_API_URL` | Yes | ML scoring backend URL (Railway prod / localhost:8000 dev) |
| `NEXT_PUBLIC_APP_URL` | No | App URL for TrueLayer redirect |
| `CRON_SECRET` | No | Secures cron + admin endpoints |

### Supabase Edge Functions

```bash
supabase secrets set TRUELAYER_ENV=sandbox
supabase secrets set TRUELAYER_CLIENT_ID=...
supabase secrets set TRUELAYER_CLIENT_SECRET=...
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set QUANT_API_URL=https://<your-railway-domain>.up.railway.app
```

---

## Edge Functions (7)

| Function | Trigger | Purpose |
|---|---|---|
| `sync-banking-data` | OAuth callback / manual | Fetch TrueLayer data, infer obligations |
| `compute-borrower-features` | After sync | Engineer 6 ML features, compute credit score |
| `run-forecast` | After feature compute / daily cron | 30-day Gamma cash flow forecast |
| `generate-proposals` | After forecast | Market-priced bill shift suggestions |
| `match-trade` | `submitTrade()` / retry cron | Composite-score lender matching |
| `settle-trade` | Daily cron | MATCHED→LIVE→REPAID/DEFAULTED lifecycle |
| `explain-proposal` | On-demand | Claude plain-English explanation for a proposal |

---

## Cron Jobs

| Schedule | Route | Action |
|---|---|---|
| 06:00 UTC daily | `POST /api/cron/forecast` | Re-forecast all connected borrowers |
| 07:00 UTC daily | `POST /api/cron/settlement` | Settle matured MATCHED + LIVE trades |
| 08:00 UTC daily | `POST /api/cron/retry-match` | Retry matching for unmatched PENDING_MATCH trades |
| 12:00 UTC daily | `POST /api/cron/expire-pending` | Cancel stale PENDING_MATCH trades (> 24 hours) |

All cron routes require `Authorization: Bearer $CRON_SECRET`.

---

## Admin Endpoints

```bash
# Manually trigger matching for a specific trade
curl -X POST /api/admin/match \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"trade_id": "<uuid>"}'

# Manually trigger settlement pass
curl -X POST /api/admin/settle \
  -H "Authorization: Bearer $CRON_SECRET"

# Chain sync → forecast → proposals for one user
curl -X POST /api/pipeline/run \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<uuid>"}'
```

---

## Quant API Reference

The FastAPI service is proxied through `/api/quant/*` in the Next.js app. All endpoints are documented below.

### GET Endpoints (ISR-cached, 5 min)

| Endpoint | Response |
|---|---|
| `GET /health` | `{ status, model_loaded }` |
| `GET /api/backtest` | `{ backtest: { A/B/C: { default_rate, n_borrowers } } }` |
| `GET /api/returns` | `{ sharpe_ratio, weighted_yield_pct, risk_free_rate_pct, excess_return_pct, total_capital_gbp }` |
| `GET /api/eda` | `{ summary: { <feature>: { mean, median, std } }, correlation: { ... } }` |
| `GET /api/forecast-accuracy` | `{ days: number[], actual: number[], forecasted: number[], mape_pct }` |
| `GET /api/lenders` | `{ lenders: [{ lender_id, risk_appetite, pot_size_gbp, target_yield_pct }], count }` |

### POST Endpoints

**Score a borrower** (`POST /api/score`):
```json
{
  "annual_inflow": 42000,
  "avg_monthly_balance": 2000,
  "days_since_account_open": 730,
  "primary_bank_health_score": 0.72,
  "secondary_bank_health_score": 0.68,
  "failed_payment_cluster_risk": 1.0
}
```
→ `{ credit_score, probability_of_default, risk_grade }`

**SHAP explanations** (`POST /api/explain`) — same request body as `/score`
→ `{ base_score, final_score, top_positive: [{ feature, impact, value }], top_negative: [...] }`

**Stress test** (`POST /api/stress-test`):
→ `{ original_score, stressed_score, score_delta, original_grade, stressed_grade }`

**Irregular spend forecast** (`POST /api/forecast/spending`):
→ `{ model: "gamma_dow"|"gamma_flat"|"fallback_flat", irregular_txn_count, total_days_history, daily_forecasts: [{ forecast_date, mean_spend, p10, p90 }] }`

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

| Workflow | Checks |
|---|---|
| **lint** | ESLint across all packages |
| **typecheck** | `tsc --noEmit` with strict mode |
| **build** | `pnpm build` — ensures no build regressions |

Claude Code review runs automatically on every PR via `anthropics/claude-code-action@v1`.

---

## Key Metrics

| Metric | Value |
|---|---|
| Trades in database | 12,000+ |
| Median match time | 7 seconds |
| Credit score range | 300–850 (XGBoost) |
| Eligibility threshold | Score ≥ 500 |
| Forecast accuracy (MAPE) | ~4% |
| ML training dataset | 307,511 Home Credit loans |
| XGBoost features | 6 engineered Open Banking proxies |
| Gamma model tests | 87/87 passing (53 general + 34 spending forecast) |
| Platform fee | 20% junior tranche |
| Analytics tabs | 8 |
| Edge Functions | 7 |
| Database migrations | 28 |
| Database views | 15+ |
| Claude AI features | 7 |
| Seed trades | 12,000+ |
| Seed lenders | 255 |

---

## Design System

Following the Monzo design language:

| Token | Value |
|---|---|
| Primary (coral) | `#FF5A5F` |
| Navy | `#1B1B3A` |
| Background | `#FAFAFA` |
| Card radius | 16px |
| Button style | Pill (border-radius: 9999px) |
| Font | Inter |

---

## Team

Built for **HackEurope 2026** by a team of 4, targeting the **Monzo** track and the following prize challenges:

- **Susquehanna "Best Use of Data"** — 307K-loan XGBoost model, 8-tab analytics dashboard, Gamma spend forecasting
- **"Best Use of Claude"** — 7 consumer-facing Claude features, all cached + rate-limited
- **"Best Team Under 22"**

---

## License

MIT
