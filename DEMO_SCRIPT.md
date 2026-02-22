# Flowzo — Judge Demo Script

**Live URL:** https://flowzo.vercel.app
**Pitch deck:** https://flowzo.vercel.app/pitch
**Total demo time:** 2 minutes
**Password for all accounts:** `flowzo123`

---

## Before You Start

- Open the app in a browser, logged out
- Have a second tab ready for the lender view
- Dark mode looks great for demos — toggle it in Settings > Appearance
- Slides open in a third tab at `/pitch`

---

## Act 1 — The Problem (30 seconds)

**Open the pitch deck at `/pitch`**

> "20 million UK adults are credit-invisible. They have bank accounts, regular income, years of payment history — but Experian can't see any of it. So when a bill clashes with a low balance, their only options are an expensive overdraft or a payday loan."

> "Flowzo fixes this using the data that's already there — Open Banking transactions."

**Advance to Slide 2 and 3**

> "Explanation of slides"

---

## Act 2 — Borrower Flow (2 minutes)

**Navigate to https://flowzo.vercel.app**

> "Let me show you the product."

### Step 1 — Log in as the borrower

- Click **Log in**
- Email: `alex@flowzo.demo`
- Password: `flowzo123`

> "Alex is a Grade C borrower — irregular income, the calendar shows days that are tighter or in overdraft."

> "When Alex connected their bank, we didn't just read transactions — we pulled their actual standing orders and direct debit mandates directly from the bank via Open Banking. These are real bills, not inferred patterns."

---

### Step 2 — Show the calendar heatmap

> "The moment Alex logs in, Flowzo has already run a 30-day cash flow forecast. Red cells are danger days — days where the balance is predicted to go negative."

> "March 1st is a disaster. Rent of £750 is due on that day so the balance forecast is in overdraft by £735.50."

---

### Step 3 — Show the suggestion feed

> "But Flowzo doesn't just warn Alex — it proposes a fix by shifting the electricity bill from 25 Feb to 3 March."

**Scroll to the suggestion feed**

> "With only a £0.55 fee, this can avoid much higher overdraft charges simply by moving the payment date."

---

### Step 4 — Accept the proposal

**Click Accept on a proposal**

> "Alex can choose to accept the shift. A trade is instantly created and sent to the lending pool, looking for a match."

---

## Act 3 — Lender Flow (1.5 minutes)

**Open a new tab — https://flowzo.vercel.app**

- Click **Log in**
- Email: `jordan@flowzo.demo`
- Password: `flowzo123`

> "Now I'm Jordan — a lender with A grade credit score and £239.02 of idle cash sitting in their Flowzo pot."

---

### Step 5 — Show the lending tab

**Navigate to the Lender tab**

> "This is the lender tab. Lenders are systematically allocated to lenders based on APR compatibility, available headroom and diversification, ranked by highest score from 0 to 1. "

---

### Step 6 — Show yield stats

> "Jordan has already earned £0.12 from a previously repaid trade."

---

## Act 4 — Credit Risk & Order Book (1.5 minutes)

**Navigate to `/data` → Credit Risk tab**

> "Flowzo doesn't just classify risk — it enforces it. Borrowers below a 500 credit score are automatically blocked at the database level."

- **Show**: Eligibility summary (eligible vs ineligible), grade distribution bars, score ranges
- **Show**: Eligibility rules (score threshold, default history, credit limits)

> "Credit limits scale with income regularity. Erratic income means lower limits, even within the same grade."

**Switch to Order Book tab**

> "This is a real two-sided market. The blue curve is lender supply — standing orders at different APR levels. The coloured curves are borrower demand."

- **Show**: Market rate cards (bid/ask/spread per grade, liquidity ratios)
- **Show**: Two-sided depth chart with market clearing point

---

## Act 5 — ML/Quant Analytics (1 minute)

**Navigate to `/data` → ML / Quant tab**

> "We validate everything against 303K real loans."

- **Show**: Backtest (Grade A < B < C default rates)
- **Show**: Portfolio Returns (Sharpe ratio, yield, excess return)
- **Show**: Credit Score explorer (score a borrower, see SHAP feature importance)
- **Show**: Stress Test (0.5x income shock → score delta)
- **Show**: Forecast accuracy (MAPE ~4%)

> "Signal extraction from noisy transaction data. Same discipline as quant finance."

---

## Act 6 — Revenue & Yield (30 seconds)

**Navigate to `/data` → Revenue tab**

> "Platform takes a 20% junior tranche — absorbing first loss to protect lender capital."

- **Show**: Monthly fee income + default losses chart

**Switch to Yield tab**

- **Show**: Monthly yield trends, cumulative fees

---

## Closing Line

> "Flowzo turns 90 days of bank transactions into a credit signal that predicts cash flow 30 days out, prices risk continuously based on exact credit score, enforces eligibility gates, and matches supply with demand in under 10 seconds — all validated against 303K real loans. That's the Best Use of Data."

---

## Fallback Paths

| If... | Then... |
|---|---|
| Login fails | Use `taylor@flowzo.demo` — same password |
| Bubble board is empty | Refresh — seed data should populate. If not, show demo bubble board mode |
| Proposal feed is empty | Log in as `sam@flowzo.demo` instead |
| Trade stuck PENDING_MATCH | Use admin endpoint: `curl -X POST /api/admin/match -H "Authorization: Bearer $CRON_SECRET" -d '{"trade_id":"..."}'` |
| Need to advance settlement | Use admin endpoint: `curl -X POST /api/admin/settle -H "Authorization: Bearer $CRON_SECRET"` |
| ML/Quant tab empty | Check QUANT_API_URL is set in Vercel env vars |
| Live demo crashes entirely | Switch to the backup demo video |
| Judge asks about real money | "All payments are stubbed — this is a sandbox demo. GoCardless and Stripe integrations exist but are not live." |
| Judge asks about FCA regulation | "As a hackathon prototype, Flowzo is not FCA regulated. A production version would require authorisation as a P2P lending platform under FCA COBS 18." |
| Judge asks about credit scoring | "XGBoost model trained on Home Credit dataset. 300-850 score range. Continuous pricing within grades — not just A/B/C buckets." |

---

## Key Numbers to Remember

| Metric | Value |
|---|---|
| Trades in database | 12,000+ |
| Median match time | 7 seconds |
| Credit score range | 300-850 (XGBoost) |
| Eligibility threshold | Score >= 500 |
| Forecast horizon | 30 days |
| Forecast accuracy | MAPE ~4% |
| Pipeline latency | < 10 seconds |
| Backtest dataset | 303K Home Credit Default Risk loans |
| Platform fee | 20% junior tranche (first loss) |
| Analytics tabs | 8 (Overview, Order Book, Performance, Yield, Credit Risk, Revenue, Lenders, ML/Quant) |
| Edge Functions | 6 (sync, forecast, proposals, match, settle, explain) |
| Demo password | `flowzo123` |

---

## Pre-Demo Seed Command

```bash
# Re-seed fresh data (~3 min)
source apps/web/.env.local && npx tsx scripts/seed.ts

# Verify Quant API is healthy
curl -s https://flowzo-quant-api-production.up.railway.app/health
```
