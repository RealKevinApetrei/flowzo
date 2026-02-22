# Flowzo — Judge Demo Script

**Live URL:** https://flowzo.vercel.app
**Pitch deck:** https://flowzo.vercel.app/pitch
**Total demo time:** ~5 minutes
**Password for all accounts:** `flowzo123`

---

## 2-Minute Pitch (Slides Only)

Use `/pitch` — arrow keys to advance. ~17s per slide. Practise with a timer.

### Slide 1 — The Problem (20s)
> "1 in 4 UK workers run out of money before payday. Not because they overspend — because their bills land at the wrong time. A timing mismatch that costs them £45 in overdraft fees every month."

### Slide 2 — The Cost (15s)
> "Banks charge 40% APR on overdrafts for what is fundamentally a cashflow timing problem, not a debt problem. There's no product that uses the data already sitting in people's bank accounts to fix this."

### Slide 3 — The Gap (15s)
> "Zero products use Open Banking data to predict and prevent overdrafts through P2P lending. That's the gap Flowzo fills."

### Slide 4 — Data Pipeline (25s)
> "We treat bank transactions like tick data. Connect via TrueLayer, engineer features — income regularity, balance volatility, payment clustering — then score and propose. Raw data in, actionable signal out, under 10 seconds. Same discipline as quant finance, different asset class."

### Slide 5 — Forecast (20s)
> "Flowzo runs a 30-day balance projection. When it detects a shortfall, Claude AI proposes the exact bill to move, the exact date, and the exact fee — in plain English. 85%+ forecast accuracy, auto-matched in under 30 seconds."

### Slide 6 — Engine (15s)
> "The full loop is automated. Forecast, propose, match, settle. Lenders fund borrowers directly from idle cash — no balance sheet. Every state transition is event-sourced and auditable."

### Slide 7 — Validation (10s)
> "Risk grades backtested on 2.2 million LendingClub loans. Average fee: £1.20 versus a £45 overdraft — 37 times cheaper. The pipeline is live at flowzo.vercel.app."

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

**Advance to Slide 2**

> "We treat raw bank transactions the same way a quant treats tick data. We engineer features — income regularity, balance volatility, failed payment clustering — and turn them into a credit signal."

---

## Act 2 — Borrower Flow (2 minutes)

**Navigate to https://flowzo.vercel.app**

> "Let me show you the product."

### Step 1 — Log in as the borrower

- Click **Log in**
- Email: `alex@flowzo.demo`
- Password: `flowzo123`

> "Alex is a Grade C borrower — irregular income, a few tight months. Exactly the kind of person a bank would reject."

---

### Step 2 — Show the calendar heatmap

> "The moment Alex logs in, Flowzo has already run a 30-day cash flow forecast. Red cells are danger days — days where the balance is predicted to go negative."

**Point to the red cells on Feb 25–27**

> "Feb 25th is a disaster. Three bills landing at once, balance forecast at minus £45."

---

### Step 3 — Show the suggestion feed

> "But Flowzo doesn't just warn Alex — it proposes a fix."

**Scroll to the suggestion feed**

> "The AI has identified that moving Netflix from the 15th to the 22nd saves Alex from that overdraft. The fee? £1.20. Compare that to a £45 overdraft charge."

---

### Step 4 — Accept the proposal

**Click Accept on a proposal**

> "Alex accepts. A trade is instantly created and sent to the lending pool, looking for a match."

---

## Act 3 — Lender Flow (1.5 minutes)

**Open a new tab — https://flowzo.vercel.app**

- Click **Log in**
- Email: `jordan@flowzo.demo`
- Password: `flowzo123`

> "Now I'm Jordan — a lender with £407 of idle cash sitting in their Flowzo pot."

---

### Step 5 — Show the bubble board

**Navigate to the Lender tab**

> "This is the bubble board. Every bubble is a live trade looking for funding. Size is the amount. Colour is risk grade — green is A, amber is B, red is C."

> "Jordan can see Alex's trade right there on the board."

---

### Step 6 — Fund the trade

**Click a bubble to open the trade detail**

> "Full transparency — borrower grade, amount, fee, term, expected return. Jordan can see exactly what they're funding and why."

**Click Fund**

> "Done. Alex's bill is covered. Jordan earns a micro-return. The trade moves from PENDING_MATCH to MATCHED to LIVE — automatically."

---

### Step 7 — Show yield stats

> "Jordan has already earned £0.12 from a previously repaid trade. Small numbers today — but at scale, this is a new asset class built on real financial behaviour data."

---

## Act 4 — The Data Angle (45 seconds)

**Switch back to the pitch deck — Slide 3 / 4**

> "What makes Flowzo different from a simple BNPL product is the data discipline."

> "The forecast runs a 30-day balance projection with confidence bands. MAPE target under 15%. The risk grades have been backtested against 2.2 million LendingClub loans — Grade A default rate is lower than Grade B, which is lower than Grade C. The signal is real."

**Advance to Slide 5**

> "We're targeting SIG's Best Use of Data prize because this pipeline is directly analogous to quant finance — raw data, feature engineering, signal extraction, execution. The difference is the data is someone's bank account, and the execution is a bill shift, not a trade."

---

## Closing Line

> "Flowzo turns 90 days of bank transactions into a credit signal that predicts cash flow 30 days out, prices risk dynamically, and matches supply with demand — all in under 10 seconds. That's the Best Use of Data."

---

## Fallback Paths

| If... | Then... |
|---|---|
| Login fails | Use `taylor@flowzo.demo` — same password |
| Bubble board is empty | Refresh — seed data should populate. If not, show demo bubble board mode |
| Proposal feed is empty | Log in as `sam@flowzo.demo` instead |
| Live demo crashes entirely | Switch to the backup demo video |
| Judge asks about real money | "All payments are stubbed — this is a sandbox demo. GoCardless and Stripe integrations exist but are not live." |
| Judge asks about FCA regulation | "As a hackathon prototype, Flowzo is not FCA regulated. A production version would require authorisation as a P2P lending platform under FCA COBS 18." |

---

## Key Numbers to Remember

| Metric | Value |
|---|---|
| Credit-invisible UK adults | 20 million |
| Average overdraft fee | £45 |
| Flowzo fee (example) | £1.20 |
| Forecast horizon | 30 days |
| Pipeline latency | < 10 seconds |
| Backtest dataset | 2.2M LendingClub loans |
| Auto-match target | > 80% within 30 seconds |
| Demo password | `flowzo123` |
