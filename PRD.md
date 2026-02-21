# Flowzo -- Product Requirements Document

## Executive Summary

Flowzo is a Monzo-native fintech webapp that uses Open Banking data to power an AI-driven P2P micro-lending layer. Borrowers get predictive cash flow forecasts and "bill shift" recommendations when Flowzo forecasts a balance shortfall. Lenders deploy surplus cash through an interactive D3 bubble board. The platform turns raw transaction data into credit signals, predictions, and automated decisions -- positioning it for Susquehanna's "Best Use of Data" prize.

---

## 1. Product Vision

**Problem:** 5-20 million UK adults are "credit-invisible" -- they have bank accounts and income but can't access affordable short-term credit because traditional credit scoring (Experian/FICO) doesn't capture their real financial behaviour.

**Solution:** Flowzo ingests real-time Open Banking transaction data via TrueLayer, engineers credit features from raw transactions (income regularity, balance volatility, failed payment clustering), and generates:
1. 30-day cash flow forecasts with confidence bands
2. AI-powered "bill shift" proposals (move a bill payment to a safer date)
3. Risk scores (A/B/C grades) that drive dynamic fee pricing
4. A pooled lending marketplace where lenders fund shifts through an interactive bubble board

**Key Differentiator:** Every decision is data-driven and auditable. The agentic loop (forecast -> propose -> match -> settle) runs continuously with full event sourcing.

---

## 2. Architecture

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 16 App Router, TypeScript strict |
| Styling | Tailwind CSS v4 + shadcn/ui (Monzo design system) |
| DB/Auth/Functions | Supabase (Postgres + RLS + Edge Functions + Realtime) |
| Deployment | Vercel |
| Visualization | D3 force simulation (bubble board), SVG charts |
| AI | Claude API (Haiku 3.5) for explanations |
| Open Banking | TrueLayer (real sandbox) |
| Payments | Stubbed (Stripe, GoCardless, OB PIS) |

**Live URL:** https://flowzo.vercel.app
**Repo:** github.com/RealKevinApetrei/flowzo

---

## 3. Current Status -- Gap Analysis

### What Works (Green)
- Auth flow (signup/login/logout) via Supabase
- TrueLayer OAuth PKCE flow (redirect + consent screen)
- Full UI: borrower home, lender home, settings, onboarding
- 6 Supabase Edge Functions written (sync, forecast, proposals, match, settle, explain)
- D3 bubble board with force simulation
- Calendar heatmap with worst-case toggle
- Suggestion feed with accept/dismiss/customise
- Bid slider + probability curve
- Claude API integration for explanations
- 12 database migrations with RLS
- Shared package with types, constants, utilities
- Build passes with zero TypeScript errors
- Deployed to Vercel

### Critical Bugs to Fix (Red)

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | `/api/truelayer/callback` inserts `access_token`, `refresh_token`, `token_expires_at` as columns -- schema has `truelayer_token jsonb` | Bank connection fails silently | Store as `{ truelayer_token: { access_token, refresh_token, expires_at } }` |
| 2 | `createTrade` server action inserts `amount_pence`, `fee_pence`, `shifted_due_date` -- schema uses `amount` (decimal GBP), `fee`, `new_due_date` | Every trade creation fails | Convert pence to pounds, use correct column names |
| 3 | `/api/trades/[tradeId]/bid` route doesn't exist -- `trade-detail-client.tsx` calls it | Bid submission 404s | Create the API route |
| 4 | Lender page queries `trades` with `fee_pence`, `amount_pence`, `lender_id`, `shift_days` -- none exist in schema | Lender dashboard shows empty | Query `allocations` joined to `trades`, use correct column names |
| 5 | `SuggestionFeed` reads `payload.suggested_date` / `payload.amount` -- Edge Function writes `shifted_date` / `amount_pence` | Proposals display undefined values | Align payload key names |
| 6 | `updateLenderPreferences` uses `.upsert().eq()` -- invalid Supabase syntax | Preferences never save | Use proper upsert with `onConflict` |
| 7 | `handleFundTrade` is `console.log` stub | Fund button does nothing | Wire to a server action that creates an allocation |
| 8 | No `/api/trades/[tradeId]/bid` route exists | Custom bids fail | Create route handler |

### Missing Features (Amber)

| Feature | Status | Priority |
|---|---|---|
| Cron jobs (daily forecast, hourly settlement) | Not implemented | HIGH -- pipeline doesn't auto-run |
| Trade bid API route | Missing | HIGH -- custom bids broken |
| Auto-trigger match-trade after PENDING_MATCH | Missing | HIGH -- matching doesn't happen |
| Seed/demo data | Empty seed.sql | MEDIUM -- demo needs data |
| Compliance page content | Placeholder text | LOW |
| Tests (Vitest + Playwright) | Zero tests | MEDIUM |
| CI/CD (GitHub Actions) | No workflows | LOW |
| Payment provider wiring | Stubs exist, not connected | LOW for hackathon |

---

## 4. API Keys Status

### Have
| Service | Key | Status |
|---|---|---|
| Supabase URL | `https://loxoforoxmustkqqyidh.supabase.co` | Set |
| Supabase Anon Key | `sb_publishable_...` | Set (Production only) |
| TrueLayer Client ID | `sandbox-flowzo-25e780` | Set |
| TrueLayer Client Secret | `a7850a1d-...` | Set |
| Claude API Key | `sk-ant-api03-...` | Set |
| GoCardless Access Token | `sandbox_ZvRPUAS2...` | Set |

### Need
| Service | Why | Action |
|---|---|---|
| **Supabase Service Role Key** | Edge Functions need it to bypass RLS; currently missing from .env.local and Vercel | Get from Supabase Dashboard > Settings > API > service_role key |
| **CRON_SECRET** | Secure the cron Edge Function endpoints | Generate a random string, add to Supabase secrets and Vercel |
| **Vercel Preview/Dev env vars** | GitHub CI deploys to Preview which has zero env vars | Copy all Production env vars to Preview in Vercel Dashboard |

### Optional (for production, not hackathon)
| Service | Why |
|---|---|
| Stripe Secret Key | Real pot top-ups |
| GoCardless (already have sandbox token) | Real direct debit collection |
| Sentry DSN | Error monitoring |
| Posthog/Mixpanel key | Analytics |

---

## 5. Hackathon Strategy: SIG "Best Use of Data"

### Why Flowzo Wins This Category

SIG is a quantitative trading firm. They value: **signal extraction from noisy data, model validation/backtesting, decision under uncertainty, and non-obvious data sources generating edge.**

Flowzo's open banking pipeline is directly analogous to building trading signals from market microstructure data:
- Raw transactions = tick data (noise)
- Engineered features (income regularity, balance volatility, failed payment clustering) = alpha factors
- Risk score (A/B/C) = trading signal
- Dynamic fee pricing = execution strategy
- Pool utilization adjustment = market-making spread

### The Winning Narrative (5 slides)

1. **The Data Problem:** Credit-invisible borrowers have data in their bank accounts that traditional scoring ignores
2. **Feature Engineering:** Raw transactions -> income classification, payment pattern analysis, volatility metrics (show SHAP feature importance)
3. **Prediction:** 30-day cash flow forecast with confidence bands + backtested accuracy metrics
4. **Decision Engine:** Risk grades -> dynamic pricing -> automated matching (the "alpha to execution" pipeline)
5. **Validation:** Backtest against LendingClub data showing Flowzo grades predict defaults better than FICO alone

### Data Features to Add for the Prize

| Feature | SIG Appeal | Effort |
|---|---|---|
| **Backtest risk model on LendingClub data** | Their #1 value: validation discipline | 4h |
| **SHAP feature importance chart** | Explainable AI, shows feature engineering depth | 3h |
| **Forecast accuracy metrics (MAPE)** | Quantified prediction quality | 2h |
| **EDA dashboard page** (distributions, correlations) | Shows data was interrogated, not just piped | 3h |
| **Stress testing** (what if income drops 20%) | Risk management sophistication | 2h |
| **Lender return analytics** (Sharpe-ratio style) | Speaks SIG's native language | 2h |

### Supplementary Datasets

| Dataset | Use |
|---|---|
| LendingClub (Kaggle, 2.2M loans) | Backtest risk scoring model |
| Home Credit Default Risk (Kaggle, 307K apps) | Feature benchmarking |
| ONS UK economic data | Macro enrichment for stress testing |
| Bank of England rates | Justify dynamic pricing model |
| World Bank Global Findex | Impact quantification (financial inclusion stats) |

---

## 6. MECE Team Split (3 members)

### Member A: Data Pipeline & Backend (the "Quant")
**Focus:** Make the data pipeline work end-to-end and build the hackathon-winning data features.

| Task | Priority | Est. |
|---|---|---|
| Fix TrueLayer callback token storage (bug #1) | P0 | 30m |
| Fix `createTrade` schema mismatch (bug #2) | P0 | 30m |
| Fix `SuggestionFeed` payload key mismatch (bug #5) | P0 | 15m |
| Fix `updateLenderPreferences` upsert syntax (bug #6) | P0 | 15m |
| Get & configure Supabase service role key | P0 | 10m |
| Apply migrations to Supabase (run them on the actual project) | P0 | 30m |
| Create seed data for demo (realistic borrower + lender profiles, transactions, forecasts) | P0 | 2h |
| Wire auto-trigger: after PENDING_MATCH -> call match-trade Edge Function | P1 | 1h |
| Add cron-daily-forecast and cron-hourly-settlements Edge Functions | P1 | 1.5h |
| Build **backtest page** -- load LendingClub CSV, run risk scoring, show grade-vs-default-rate chart | P1 (hackathon) | 4h |
| Build **EDA dashboard** -- transaction distributions, income pattern analysis, feature correlations | P1 (hackathon) | 3h |
| Add forecast accuracy reporting (MAPE calculation on held-out window) | P2 | 2h |

**Deliverable:** End-to-end working pipeline from bank connect -> sync -> forecast -> proposals -> trade -> match -> settle, plus a data analysis page that wows SIG judges.

### Member B: Frontend & UX (the "Designer-Dev")
**Focus:** Fix all UI bugs, polish the experience, and make the demo flow flawless.

| Task | Priority | Est. |
|---|---|---|
| Fix lender page queries (bug #4 -- wrong column names) | P0 | 1h |
| Create `/api/trades/[tradeId]/bid` route (bug #3/#8) | P0 | 45m |
| Wire `handleFundTrade` to a real server action (bug #7) | P0 | 1h |
| Add Vercel env vars for Preview/Development | P0 | 15m |
| Polish landing page (hero, value prop, demo CTA) | P1 | 2h |
| Write real compliance page content (Terms, Privacy, FCA disclaimer) | P1 | 1.5h |
| Add loading states, error boundaries, empty states across all pages | P1 | 2h |
| Build **SHAP feature importance visualization** (waterfall chart component) | P1 (hackathon) | 3h |
| Build **lender return analytics** card (Sharpe ratio, expected yield by grade) | P2 (hackathon) | 2h |
| Add stress test toggle to calendar heatmap ("What if income drops 20%?") | P2 (hackathon) | 1.5h |
| Mobile responsiveness polish | P2 | 1h |

**Deliverable:** A demo-ready, bug-free UI with polished Monzo-feel UX and data visualization components that make the hackathon judges say "wow."

### Member C: Infrastructure, Demo & Pitch (the "PM/DevOps")
**Focus:** Make everything deployable, testable, and presentable. Own the demo script and pitch deck.

| Task | Priority | Est. |
|---|---|---|
| Set up Vercel Preview env vars (copy all from Production) | P0 | 15m |
| Connect GitHub repo to Vercel for auto-deploys | P0 | 15m |
| Set up GitHub Actions CI (lint + typecheck + build) | P1 | 1h |
| Write Vitest tests for: risk scoring, fee calculation, recurring detection | P1 | 2h |
| Write Playwright E2E for: signup -> bank connect -> see forecast | P2 | 2h |
| Create demo script (step-by-step walkthrough for judges) | P0 | 1.5h |
| Build pitch deck (5 slides: Problem, Data Pipeline, Prediction, Decision, Validation) | P0 | 3h |
| Download and prepare LendingClub dataset for backtest | P1 | 30m |
| Write the "Best Use of Data" submission narrative | P0 | 2h |
| Prepare demo data: ensure sandbox has realistic TrueLayer test accounts | P1 | 1h |
| Record backup demo video (in case live demo fails) | P1 | 1h |

**Deliverable:** Working CI, test coverage on critical paths, pitch deck, demo script, and a compelling "Best Use of Data" narrative that speaks SIG's quantitative language.

---

## 7. Demo Flow (Happy Path)

1. **Landing page** -- "Your bills, shifted. Your money, safe."
2. **Sign up** -- Email/password, 3 seconds
3. **Connect bank** -- TrueLayer sandbox (john/doe), see accounts sync
4. **Borrower home** -- Calendar heatmap lights up with danger days (red cells)
5. **Suggestion feed** -- AI proposes shifting a bill: "Move your Netflix from the 15th to the 22nd, saving you from a -GBP45 overdraft. Fee: GBP1.20"
6. **Accept** -- Trade created, matched with a lender automatically
7. **Switch to Lending tab** -- Bubble board shows live trades floating. Tap one to see details.
8. **Enable Auto-Pop** -- Watch bubbles pop as they're automatically funded
9. **Data Analysis page** (NEW) -- Show EDA, feature importance, backtest results
10. **Pitch:** "We turned 90 days of bank transactions into a credit signal that predicts cash flow 30 days out, prices risk dynamically, and matches supply with demand -- all validated against 2.2M historical loans."

---

## 8. Success Metrics

| Metric | Target | How |
|---|---|---|
| Forecast accuracy | MAPE < 15% on sandbox data | Rolling backtest window |
| Risk grade separation | A default rate < B < C on LendingClub backtest | Grade-vs-default chart |
| Pipeline latency | Sync -> forecast -> proposals < 10 seconds | Edge Function timing |
| Match rate | > 80% of trades auto-matched within 30 seconds | Match-trade Edge Function |
| Judge impression | "Best Use of Data" top 3 | Pitch narrative + live demo |
