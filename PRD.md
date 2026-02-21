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

### Critical Bugs (All Fixed)

All 8 critical bugs have been resolved in commit `ffec26b`:

| # | Bug | Status |
|---|---|---|
| 1 | TrueLayer callback token storage (jsonb) | FIXED |
| 2 | `createTrade` schema mismatch (column names + pence->GBP) | FIXED |
| 3 | Missing `/api/trades/[tradeId]/bid` route | FIXED |
| 4 | Lender page wrong column names + missing allocations join | FIXED |
| 5 | `SuggestionFeed` payload key mismatch | FIXED |
| 6 | `updateLenderPreferences` invalid upsert syntax | FIXED |
| 7 | `handleFundTrade` console.log stub | FIXED |
| 8 | `use-bubble-board` hook wrong column names | FIXED |

### Remaining Work (Amber)

| Feature | Status | Priority |
|---|---|---|
| Apply DB migrations to Supabase | `combined_migrations.sql` ready | P0 -- nothing works without this |
| Get & configure Supabase service role key | Missing from env | P0 -- Edge Functions need it |
| Deploy Edge Functions to Supabase | Written, not deployed | P0 -- pipeline doesn't run |
| Cron jobs (daily forecast, hourly settlement) | Not implemented | HIGH -- pipeline doesn't auto-run |
| Auto-trigger match-trade after PENDING_MATCH | Missing | HIGH -- matching doesn't happen |
| Seed/demo data | Empty seed.sql | HIGH -- demo needs data |
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

## 6. MECE Team Split (4 members)

> **Workflow:** `main` is protected. All new work goes on feature branches via **pull requests**. Each member creates PRs from their feature branch, gets a quick review, then merges.

### Member A: Data Pipeline & Integrations (the "Plumber")
**Focus:** Make the live data pipeline work end-to-end. Own everything from TrueLayer bank connection through to trade matching and settlement.

**Branch prefix:** `feat/pipeline-*`

| Task | Priority | Est. |
|---|---|---|
| Apply DB migrations to Supabase (run `combined_migrations.sql` in SQL Editor) | P0 | 15m |
| Get & configure Supabase service role key (Dashboard > Settings > API) | P0 | 10m |
| Deploy all 6 Edge Functions to Supabase (`supabase functions deploy`) | P0 | 30m |
| Register TrueLayer redirect URIs (production + localhost) | P0 | 10m |
| Test TrueLayer sandbox flow end-to-end (john/doe -> sync -> see data) | P0 | 30m |
| Wire auto-trigger: after trade status -> PENDING_MATCH, call match-trade Edge Function | P1 | 1h |
| Implement cron-daily-forecast Edge Function (pg_cron or Vercel cron) | P1 | 1h |
| Implement cron-hourly-settlements Edge Function | P1 | 1h |
| Create seed data for demo (realistic borrower + lender profiles, transactions, forecasts, proposals) | P0 | 2h |
| Test full pipeline: bank connect -> sync -> forecast -> proposals -> trade -> match -> settle | P0 | 1h |
| Verify RLS policies don't block lender bubble board (PENDING_MATCH trades visible) | P1 | 30m |
| Verify Supabase Realtime is working (trades table changes propagate) | P1 | 15m |

**Deliverable:** Fully working live pipeline from bank connection through to settlement. Someone can sign up, connect a bank, see forecasts, accept a proposal, and have it matched + settled. Seed data makes the demo rich from minute one.

### Member B: Data Science & Analytics (the "Quant")
**Focus:** Build the hackathon-winning data features that target SIG's "Best Use of Data" prize. This is what separates us from every other fintech demo.

**Branch prefix:** `feat/data-*`

| Task | Priority | Est. |
|---|---|---|
| Download and prepare LendingClub dataset (Kaggle, 2.2M loans) | P0 | 30m |
| Build **backtest page** (`/data/backtest`) -- load LendingClub CSV, run Flowzo risk scoring, show grade-vs-default-rate chart | P0 (hackathon) | 4h |
| Build **EDA dashboard** (`/data/eda`) -- transaction distributions, income pattern analysis, feature correlations | P0 (hackathon) | 3h |
| Build **SHAP feature importance visualization** -- waterfall chart showing which features drive risk grades | P0 (hackathon) | 3h |
| Add forecast accuracy reporting -- MAPE calculation on held-out window, display on data page | P1 (hackathon) | 2h |
| Add **stress testing** toggle -- "What if income drops 20%?" scenario on forecast/heatmap | P1 (hackathon) | 2h |
| Build **lender return analytics** card -- Sharpe-ratio style metrics, expected yield by grade | P1 (hackathon) | 2h |
| Prepare supplementary datasets (Home Credit, ONS, BoE rates) for enrichment narratives | P2 | 1h |
| Write data methodology section for pitch deck (feature engineering, model validation) | P0 | 1h |

**Deliverable:** A `/data` section of the app with backtest results, EDA visualisations, SHAP charts, and stress testing that makes SIG judges say "this team thinks like quants." Provides the quantitative evidence for the pitch.

### Member C: Frontend & UX (the "Designer-Dev")
**Focus:** Polish every pixel of the user experience. Make the demo flow flawless and the UI feel like a real Monzo feature.

**Branch prefix:** `feat/ui-*`

| Task | Priority | Est. | Status |
|---|---|---|---|
| Polish landing page -- hero section, value proposition, demo CTA, screenshots | P0 | 2h | DONE |
| Add loading states, error boundaries, and empty states across all pages | P0 | 2h | DONE |
| Write real compliance page content (Terms of Service, Privacy Policy, FCA disclaimer) | P1 | 1.5h | DONE |
| Mobile responsiveness polish (all pages, bottom nav, modals) | P1 | 1.5h | DONE |
| Improve onboarding flow -- progress stepper, success animation after bank connect | P1 | 1.5h | DONE |
| Add toast notifications for actions (trade created, bid placed, trade funded) | P1 | 1h | DONE |
| Animate bubble board pop effect when auto-match triggers | P1 | 1h | DONE |
| Add "Why?" tap target on suggestion cards -> Claude explanation modal | P1 | 1h | DONE |
| Dark mode support (Monzo has dark mode) | P2 | 2h | DONE |
| Add settings page content -- notification preferences, connected accounts management | P2 | 1h | DONE |
| Micro-interactions -- button press feedback, card swipe dismiss, transition animations | P2 | 1.5h | DONE |
| Auth-aware landing page header (Dashboard when logged in) | P0 | 30m | DONE |
| Add sonner toast library + Toaster to root layout | P0 | 15m | DONE |
| Add ThemeProvider with system/light/dark toggle | P1 | 1h | DONE |
| Dark mode CSS variables for all design tokens | P1 | 30m | DONE |
| Dark mode toggle in settings (segmented Light/System/Dark control) | P1 | 30m | DONE |
| Fix hardcoded bg-white for dark mode compat (cards, modals, skeletons) | P1 | 30m | DONE |
| Card entrance animations (fade-in + slide-up with stagger) | P2 | 30m | DONE |
| Mobile touch targets (44px minimum) + touch UX improvements | P1 | 30m | DONE |
| 3-step onboarding progress stepper with animated checkmark on success | P1 | 1h | DONE |
| Notification toggle switches in settings (trade updates, forecast alerts, email digest) | P2 | 30m | DONE |
| Add app preview stats section to landing page (30-day forecast, <10s pipeline, risk grades) | P0 | 30m | DONE |
| Add active:scale-95 press feedback to all buttons | P2 | 15m | DONE |
| End-to-end visual QA pass for dark mode across all pages | P1 | 1h | IN-PROGRESS |
| Fix dark mode: separate navy-bg from navy text, improve contrast, fix hardcoded bg-white | P0 | 30m | DONE |
| Segmented theme toggle UI (pill container with emoji labels) | P1 | 15m | DONE |
| Fix Card UI component bg-white → card-surface for dark mode compat | P0 | 15m | DONE |
| Theme-aware bottom nav (nav-bg variable, dark in light mode, elevated surface in dark mode) | P0 | 15m | DONE |
| Fix lending pot dot color for dark mode (bg-navy → bg-text-secondary) | P1 | 5m | DONE |
| Add page transition animations between routes (ViewTransitions API or framer-motion) | P2 | 2h | SUGGESTED |
| A/B landing page variants for demo vs investor pitch | P2 | 2h | SUGGESTED |
| Accessibility audit (ARIA labels, keyboard nav, contrast ratios) | P1 | 2h | SUGGESTED |
| PWA manifest + install prompt for mobile | P2 | 1h | SUGGESTED |

**Deliverable:** A demo-ready, pixel-polished UI with Monzo-feel UX, smooth animations, proper loading/error/empty states, and a landing page that sells the product at first glance.

### Member D: Infrastructure, Demo & Pitch (the "PM/DevOps")
**Focus:** Make everything deployable, testable, and presentable. Own the demo script, pitch deck, and submission narrative.

**Branch prefix:** `feat/infra-*` or `feat/pitch-*`

| Task | Priority | Est. | Status |
|---|---|---|---|
| Connect GitHub repo to Vercel for auto-deploys | P0 | 15m | DONE |
| Set up Vercel env vars for Preview + Development environments | P0 | 15m | DONE |
| Set up GitHub Actions CI (lint + typecheck + build on every PR) | P0 | 1h | DONE |
| Configure branch protection on `main` (require PR, require CI pass) | P0 | 15m | TODO |
| Write Vitest unit tests for: risk scoring, fee calculation, recurring detection, pool accounting | P1 | 2.5h | TODO |
| Write Playwright E2E test for: signup -> bank connect -> see forecast -> accept proposal | P2 | 2h | TODO |
| Create detailed demo script (step-by-step walkthrough for judges, with fallback paths) | P0 | 1.5h | DONE |
| Build pitch deck (5 slides: Problem, Data Pipeline, Prediction, Decision Engine, Validation) | P0 | 3h | DONE |
| Write the "Best Use of Data" submission narrative (SIG-focused, quantitative language) | P0 | 2h | TODO |
| Prepare demo data: verify sandbox has realistic TrueLayer test accounts, pre-populate states | P1 | 1h | TODO |
| Record backup demo video (in case live demo fails on the day) | P1 | 1h | TODO |
| Set up error monitoring (Sentry free tier) if time permits | P2 | 30m | TODO |

**Deliverable:** Working CI/CD, branch protection, test coverage on critical business logic, a compelling pitch deck, polished demo script, and the winning "Best Use of Data" narrative.

---

### Workflow Rules

1. **All new work on feature branches** -- never commit directly to `main`
2. **Pull requests required** -- create PR, get a quick review from one teammate, merge
3. **Branch naming:** `feat/<area>-<short-description>` (e.g. `feat/pipeline-seed-data`, `feat/data-backtest-page`, `feat/ui-landing-polish`)
4. **CI must pass** before merging (lint + typecheck + build)
5. **Keep PRs small** -- one feature or fix per PR, easier to review and less conflict risk
6. **Communicate blockers** -- if you're blocked on another member's work, say so immediately

### Dependency Map

```
Member A (Pipeline)  ──────►  Member B (Data Science)
   │ Seed data, working         │ Needs real data for
   │ Edge Functions              │ backtest + EDA
   │
   ├──────────────────►  Member C (Frontend)
   │ Working API +               │ Needs endpoints
   │ data in DB                  │ returning real data
   │
   └──────────────────►  Member D (Infra/Pitch)
                                 │ Needs working demo
                                 │ for script + video
```

**Member A unblocks everyone else.** Pipeline + seed data is the critical path.

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
