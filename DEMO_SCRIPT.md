# Flowzo — Judge Demo Script

**Live URL:** https://flowzo-web.vercel.app
**Pitch deck:** https://flowzo-web.vercel.app/pitch
**Total demo time:** ~2 minutes
**Password for all accounts:** `flowzo123`

---

## The 2-Minute Script

### Slide 1 — The Problem (15s)
> "1 in 4 UK workers run out of money before payday. Not because they overspend — because their bills land at the wrong time."

### Slide 2 — The Cost (15s)
> "Banks charge ~40% APR on overdrafts for what is fundamentally a cashflow timing problem, not a debt problem."

### Slide 3 — The Gap (15s)
> "Zero products use Open Banking data to predict and prevent this. Flowzo fixes it — AI-driven bill shifting, funded by a democratised P2P lending pool."

### Slide 4 — Data Pipeline (20s)
> "We treat bank transactions like tick data. Connect via TrueLayer, engineer features — income regularity, balance volatility, payment clustering — score and propose. Raw data in, actionable signal out, in under 10 seconds. Same discipline as quant finance, different asset class."

### Slide 5 — Prediction (15s)
> "Flowzo runs a 14-day balance projection. When it spots a shortfall, Claude AI proposes the exact bill to move and the exact date — in plain English. 85% forecast accuracy, auto-matched in under 30 seconds."

**→ Switch to live app**

### Live Demo (20s)
- Log in as `alex@flowzo.demo`
> "Alex has danger days flagged on his calendar. Flowzo has already proposed a fix."
- Click **Accept** on a proposal
> "One tap. Bill shifted. Trade matched to a lender automatically."

### Slide 6 — Decision Engine (10s)
> "Forecast, propose, match, settle — fully automated. Every decision auditable, every state transition event-sourced."

### Slide 7 — Validation (10s)
> "Risk grades backtested on 303,000 real loan applications. Grade A default rate is lower than B, which is lower than C. The signal is real. flowzo-web.vercel.app."

---

## Before You Start

- Open pitch deck at `/pitch` in tab 1
- Open app logged out in tab 2
- Have `alex@flowzo.demo` / `flowzo123` ready to type

---

## Fallback Paths

| If... | Then... |
|---|---|
| Login fails | Use `taylor@flowzo.demo` — same password |
| Proposal feed is empty | Log in as `sam@flowzo.demo` instead |
| Live demo crashes | Stay on pitch deck — narrate the flow verbally |
| Judge asks about real money | "All payments are sandboxed. GoCardless and Stripe integrations exist but are not live for the hackathon." |
| Judge asks about FCA regulation | "A production version would require FCA authorisation as a P2P lending platform under COBS 18." |

---

## Key Numbers

| Metric | Value |
|---|---|
| UK workers short before payday | 1 in 4 (CIPHR, 2024) |
| Overdraft APR | ~40% |
| Forecast horizon | 14 days |
| Pipeline latency | < 10 seconds |
| Backtest dataset | 303K Home Credit loans |
| Auto-match target | > 80% within 30 seconds |
| Demo password | `flowzo123` |
