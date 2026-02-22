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

> "Hi, we are Flowzo and this is our pitch. The truth is, your bills don't care when you get paid. Let's take Alex for example. He makes £40,000 a year, pays rent on time, but has zero credit cards. To Experian, Alex doesn't exist. So when Alex’s £150 Council Tax bill hits tomorrow a day before payday, traditional banks will hit him with a £35 overdraft fee." 

> "Alex is of course not the only one with this problem, 20 million UK adults are credit-invisible. We built Flowzo to fix this, using the data that is already there."



> "The moment Alex logs in and connects his account using the truthlayer open banking API, Flowzo has already run a 30-day cash flow forecast based on his previous transactions. Red cells are danger days, where the balance is predicted to go negative."

> "March 3rd is a disaster. A bill of £150 is due on that day so the balance forecast is in overdraft by £20."

---

### Step 3 — Show the suggestion feed

> "But Flowzo doesn't just warn Alex about this, it proposes a fix: Alex can shift the electricity bill from 25 Feb to 3 March by taking a short-term microloan."

**Scroll to the suggestion feed**

> "With only a £1.25 fee, compared to the much higher overdraft fee. Alex also has access to several AI suggestions and interpretations."

---

### Step 4 — Accept the proposal

**Click Accept on a proposal**

> "If Alex accepts the shift, a trade is instantly created and sent to the lending pool, looking for a match."

---

## Act 3 — Lender Flow (1.5 minutes)

**Open a new tab — https://flowzo.vercel.app**

- Click **Log in**
- Email: `jordan@flowzo.demo`
- Password: `flowzo123`

> "Now this is Jordan, a retail lender with £100 of idle cash sitting in his Flowzo pot."

---

### Step 5 — Show the lending tab

**Navigate to the Lender tab**

> "Jordan is systematically allocated to borrowers based on his APR compatibility and lending duration requirement."

> "Show how matching agent works. Jordan is also provided risk advice by an AI agent."

---

### Step 6 — Show yield stats

---

## Act 4 — Credit Risk & Order Book (1.5 minutes)

**Navigate to `/data` → Credit Risk tab**



- **Show**: Eligibility summary (eligible vs ineligible), grade distribution bars, score ranges
- **Show**: Eligibility rules (score threshold, default history, credit limits)


**Switch to Order Book tab**
---

## Act 5 — ML/Quant Analytics (1 minute)

**Navigate to `/data` → ML / Quant tab**

> "To make sure risk is accurately calculated, we validate everything against 300,000 historical loans."

"

- **Show**: Backtest (Grade A < B < C default rates)
- **Show**: Portfolio Returns (Sharpe ratio, yield, excess return)
- **Show**: Credit Score explorer (score a borrower, see SHAP feature importance)
- **Show**: Stress Test (0.5x income shock → score delta)
- **Show**: Forecast accuracy (MAPE ~4%)



---

## Act 6 — Revenue & Yield (30 seconds)

**Navigate to `/data` → Revenue tab**

> "Our platform takes a 20% junior tranche, absorbing first loss to protect lender capital."

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
