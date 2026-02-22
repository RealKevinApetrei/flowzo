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

## Act 4 — The Data Angle (45 seconds)

**Switch back to the pitch deck — Slide 3 / 4**

> "The forecast runs a 30-day balance projection with confidence bands. MAPE target under 15%. The risk grades have been backtested against 303k Home Credit Default Risk loans — Grade A default rate is lower than Grade B, which is lower than Grade C. The signal is real."

**Go through rest of slides**

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
| Forecast horizon | 30 days |
| Pipeline latency | < 10 seconds |
| Backtest dataset | 303k Home Credit Default Risk loans |
| Auto-match target | > 80% within 30 seconds |
| Demo password | `flowzo123` |
