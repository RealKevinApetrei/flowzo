# Quant API — Production Handoff for Member B (Tomas)

**Author:** Kevin (Member A — Pipeline & Integrations)
**Date:** 2026-02-21
**Status:** All infrastructure LIVE and DEPLOYED

---

## TL;DR

The FastAPI Quant API is **live on Railway** with 11 endpoints, a pre-trained XGBoost model, and real-time transaction scoring. The Next.js app already consumes all endpoints via a proxy route and renders them on the `/data` analytics dashboard. Below is everything you need to extend, debug, or redeploy it.

---

## 1. What's Deployed Right Now

| Component | URL / Location | Status |
|-----------|---------------|--------|
| **Quant API** | `https://flowzo-quant-api-production.up.railway.app` | LIVE |
| **Health check** | `GET /health` → `{"status":"ok","model_loaded":true}` | OK |
| **Next.js proxy** | `/api/quant/[...path]` → forwards to Railway | LIVE |
| **Data dashboard** | `/data` route with 11 sections | LIVE |
| **Supabase views** | 6 analytics views (order book, match speed, etc.) | LIVE |
| **Cron jobs** | expire-pending (48h), retry-match, forecast, settlement | LIVE |

### Current Endpoint Responses (verified just now)

```bash
# Health
curl https://flowzo-quant-api-production.up.railway.app/health
# → {"status":"ok","model_loaded":true}

# Backtest
curl https://flowzo-quant-api-production.up.railway.app/api/backtest
# → {"backtest":{"A":{"default_rate":0.0,"n_borrowers":0},"B":{"default_rate":0.0,"n_borrowers":0},"C":{"default_rate":0.0788,"n_borrowers":5000}}}
```

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Next.js Web App                      │
│                                                       │
│  Server Components (SSR):                             │
│  ├── lib/quant-api.ts (typed fetchers, 5min ISR)     │
│  └── app/(app)/data/page.tsx (Promise.all fetch)     │
│                                                       │
│  Client Components (interactive):                     │
│  ├── risk-score-explorer.tsx (POST /score + /explain) │
│  └── stress-testing.tsx (POST /stress-test)           │
│                                                       │
│  Proxy: /api/quant/[...path]/route.ts                │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────┐
│        FastAPI on Railway (Python 3.11)               │
│                                                       │
│  Startup: Load XGBoost model + 5K sample (~1s)       │
│                                                       │
│  Endpoints:                                           │
│  ├── POST /api/score          → ML credit score       │
│  ├── POST /api/explain        → SHAP waterfall        │
│  ├── POST /api/transaction    → ingest 1 txn          │
│  ├── POST /api/transaction/batch → bootstrap history  │
│  ├── POST /api/stress-test    → income shock sim      │
│  ├── GET  /api/backtest       → default rates/grade   │
│  ├── GET  /api/returns        → Sharpe + yield        │
│  ├── GET  /api/eda            → stats + correlations  │
│  ├── GET  /api/forecast-accuracy → 30d MAPE           │
│  ├── GET  /api/lenders        → simulated 1K pool     │
│  └── GET  /health             → status check          │
│                                                       │
│  Modules:                                             │
│  ├── src/model_trainer.py     → XGBoost inference     │
│  ├── src/scorecard.py         → PD → Score (300-850)  │
│  ├── src/explainability.py    → SHAP TreeExplainer    │
│  ├── src/analytics.py         → backtest, Sharpe, EDA │
│  ├── src/data_prep.py         → feature mapping       │
│  └── src/simulation.py        → lender pool synthesis │
│                                                       │
│  Models:                                              │
│  ├── xgboost_model.joblib     (83 KB)                │
│  ├── sample_data.joblib       (87 KB)                │
│  └── metadata.json                                    │
└──────────────────────────────────────────────────────┘
```

---

## 3. File Map

### Quant API (`quant_analysis/`)

| File | Purpose |
|------|---------|
| `api/main.py` | FastAPI app — all 11 endpoints, CORS, lifespan, in-memory state |
| `src/model_trainer.py` | XGBoost classifier — `get_pd(features) → float` |
| `src/scorecard.py` | `pd_to_score(pd) → int` (300–850), `get_risk_grade(score) → A/B/C` |
| `src/explainability.py` | SHAP TreeExplainer — top 3 positive/negative features |
| `src/analytics.py` | `calculate_backtest_stats`, `calculate_portfolio_returns`, `stress_test_borrower`, `generate_eda_stats`, `calculate_mape_mock` |
| `src/data_prep.py` | CSV loader, feature mapping from Home Credit dataset |
| `src/simulation.py` | `simulate_lender_pool(n=1000)` — synthetic lender generation |
| `scripts/pretrain.py` | Generates model artifacts (run offline, artifacts committed) |
| `models/xgboost_model.joblib` | Pre-trained model (committed to git, 83 KB) |
| `models/sample_data.joblib` | 5K-row sample for analytics (committed, 87 KB) |
| `models/metadata.json` | Training metadata |
| `data/application_train.csv` | 166MB Home Credit CSV (**not in Docker**, `.dockerignore`d) |
| `Dockerfile` | `python:3.11-slim`, installs deps, runs uvicorn |
| `requirements.txt` | pandas, numpy, scikit-learn, xgboost, shap, fastapi, uvicorn, pydantic, joblib |

### Next.js Integration (`apps/web/src/`)

| File | Purpose |
|------|---------|
| `lib/quant-api.ts` | Typed server-side fetchers (`fetchBacktest`, `fetchReturns`, etc.) with 5min ISR + 10s timeout |
| `app/api/quant/[...path]/route.ts` | Proxy: `/api/quant/*` → `QUANT_API_URL/api/*` (GET + POST) |
| `app/(app)/data/page.tsx` | SSR page — `Promise.all` fetches Supabase views + Quant API |
| `app/(app)/data/data-dashboard-client.tsx` | Client shell — renders all 11 dashboard sections |
| `components/data/section-nav.tsx` | Sticky pill nav with IntersectionObserver |
| `components/data/portfolio-overview.tsx` | Pool stats, utilization ring, risk distribution |
| `components/data/backtest-results.tsx` | SVG bar chart for default rates by grade |
| `components/data/portfolio-returns.tsx` | Sharpe ratio, yield comparison bars |
| `components/data/risk-score-explorer.tsx` | Interactive 6-field form → `/api/score` + `/api/explain` |
| `components/data/stress-testing.tsx` | Income shock slider → `/api/stress-test` |
| `components/data/eda-summary.tsx` | Feature stats toggle + correlation heatmap |
| `components/data/forecast-accuracy.tsx` | Dual-line chart (actual vs forecast) + MAPE |

---

## 4. ML Model Details

### XGBoost Binary Classifier

- **Task:** Predict probability of loan default (binary: good vs. bad)
- **Training data:** Home Credit `application_train.csv` (50K rows sampled)
- **Hyperparams:** `n_estimators=200, max_depth=4, learning_rate=0.05, subsample=0.8`
- **Output:** `P(default)` in [0, 1]

### 6 Input Features

| # | Feature | Source | Range | Description |
|---|---------|--------|-------|-------------|
| 1 | `annual_inflow` | `AMT_INCOME_TOTAL` | 0–500K+ | Annual income proxy (GBP) |
| 2 | `avg_monthly_balance` | `AMT_CREDIT` | 0–1M+ | Average balance (GBP) |
| 3 | `days_since_account_open` | `DAYS_EMPLOYED` | 0–50K | Account age (days) |
| 4 | `primary_bank_health_score` | `EXT_SOURCE_2` | 0.0–1.0 | Income regularity (1 - CV of monthly inflows) |
| 5 | `secondary_bank_health_score` | `EXT_SOURCE_3` | 0.0–1.0 | Balance stability (1 - volatility*0.3) |
| 6 | `failed_payment_cluster_risk` | `REGION_RATING_CLIENT` | 1, 2, 3 | Failed payment bucket |

### PD → Credit Score Conversion

```
Scorecard anchors: θ=600, Ω=50, PDO=20
Factor = PDO / ln(2) ≈ 28.86
Score  = Offset + Factor × ln((1-PD)/PD)
Range: 300–850
```

### Risk Grades

| Grade | Score Range | Risk |
|-------|------------|------|
| **A** | ≥ 720 | Low risk (PD < ~3.5%) |
| **B** | 620–719 | Medium risk |
| **C** | < 620 | High risk |

---

## 5. Transaction Scoring Pipeline (Your PR #38)

Your `POST /api/transaction` and `POST /api/transaction/batch` endpoints are **merged and deployed**. Here's how they connect to the rest of the system:

### Integration Flow

```
TrueLayer sync → Edge Function (sync-banking-data)
                      │
                      ▼
              Supabase `transactions` table
                      │
                      ▼
    Edge Function (compute-borrower-features)
    ├── Extracts 6 features from raw transactions
    ├── Calls Quant API POST /api/score
    ├── Updates profiles.risk_grade
    └── Logs to flowzo_events (borrower.scored)
                      │
                      ▼
    Edge Function (match-trade)
    ├── Re-scores borrower via POST /api/score (real-time)
    ├── Filters lenders by risk_grade compatibility
    └── Creates allocations + reserves funds
```

### Your In-Memory State

The `USER_STATE` dict in `main.py` tracks per-user financial metrics:

```python
{
    "total_inflow": 0.0,
    "total_outflow": 0.0,
    "txn_count": 0,
    "earliest_date": datetime | None,
    "monthly_inflows": {"YYYY-MM": float},
    "balance_snapshots": [float],  # max 500
    "running_net": 0.0,
    "failed_flags": 0,
}
```

**Important:** This state lives in-memory and resets on Railway restart. For the hackathon this is fine. For production you'd want Redis or a Supabase table.

### Feature Alignment

Your feature computation in `_compute_features()` is aligned with the Edge Function `compute-borrower-features/index.ts`. Both use:

- `annual_inflow = (total_inflow / days) * 365`
- `primary_bank_health = 1 - CV(monthly_inflows)`
- `secondary_bank_health = 1 - (volatility * 0.3)`
- `failed_payment_cluster = {0→1, 1-2→2, 3+→3}`

Failed payment keywords (union of both):
```python
["failed", "rejected", "bounced", "returned", "unpaid", "nsf", "insufficient", "overdraft"]
```

---

## 6. Supabase Analytics Views

These 6 views were created in migration 017 and are consumed by the `/data` page:

| View | Purpose | Key Columns |
|------|---------|-------------|
| `trade_analytics` | All trade stats | amount, fee, risk_grade, status, dates |
| `risk_distribution` | Trade count by grade | risk_grade, count, total_amount |
| `pool_overview` | Aggregate pool metrics | total_pool_size, total_available, total_locked, lender_count |
| `pool_health` | Utilization ratio | utilization_pct, avg_pot_size, active_lenders |
| `order_book_summary` | Pending trades by grade | risk_grade, count, total_amount, avg_shift_days |
| `match_speed_analytics` | Time-to-match metrics | avg_match_hours, median_match_hours, by grade |
| `settlement_performance` | Repayment tracking | on_time_pct, avg_settlement_days, by grade |
| `yield_trends` | Monthly yield data | month, avg_yield, total_volume |
| `lender_concentration` | HHI + exposure per lender | lender_id, exposure, hhi |

---

## 7. Cron Jobs

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/expire-pending` | Every 6h (or Vercel cron) | Auto-cancel PENDING_MATCH trades after 48h, release RESERVED allocations |
| `/api/cron/retry-match` | Every 1h | Retry matching for partially-matched trades |
| `/api/cron/forecast` | 6am UTC | Run balance forecast Edge Function |
| `/api/cron/settlement` | 7am UTC | Process due settlements |

---

## 8. How to Run / Test Locally

### Quant API

```bash
cd quant_analysis
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
# Swagger UI at http://localhost:8000/docs
```

### Test Scoring

```bash
curl -X POST http://localhost:8000/api/score \
  -H "Content-Type: application/json" \
  -d '{"annual_inflow":50000,"avg_monthly_balance":5000,"days_since_account_open":730,"primary_bank_health_score":0.8,"secondary_bank_health_score":0.75,"failed_payment_cluster_risk":1}'
```

### Test Transaction Ingestion

```bash
curl -X POST http://localhost:8000/api/transaction \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-123","amount":2500.50,"transaction_type":"CREDIT","description":"Salary deposit","booked_at":"2026-02-21T14:30:00Z"}'
```

### Re-train Model (if CSV exists)

```bash
cd quant_analysis
python scripts/pretrain.py
# → Generates models/xgboost_model.joblib, sample_data.joblib, metadata.json
```

### Deploy to Railway

Railway auto-detects the Dockerfile and builds on push. The service is configured to use `PORT` env var (injected by Railway).

---

## 9. Environment Variables

### Next.js (`apps/web/.env.local`)

```
QUANT_API_URL=https://flowzo-quant-api-production.up.railway.app
```

### Quant API (Railway)

```
PORT=8000  # auto-injected by Railway
# No other secrets needed — API is self-contained
```

---

## 10. Known Issues & Tech Debt

| Priority | Issue | Impact |
|----------|-------|--------|
| **Low** | CORS wildcard (`*`) on FastAPI | Should restrict to app domain for production |
| **Low** | `USER_STATE` in-memory (transaction endpoints) | Resets on Railway restart — fine for hackathon |
| **Low** | No request logging on Quant API | Add structured logging for Railway monitoring |
| **Low** | SHAP computation ~200ms | Could cache per user or move to async worker |
| **Medium** | Backtest shows 0 borrowers for grades A/B | Sample data only has grade C defaults — could enhance with synthetic A/B data |
| **Low** | No API auth on Quant API | Publicly accessible — add API key if going to production |

---

## 11. What You Can Do Next

### Extend Endpoints

Add new endpoints in `api/main.py` — follow the existing pattern:

```python
@app.get("/api/your-new-endpoint")
def your_endpoint():
    df = _state["sample"]
    # your logic
    return {"result": ...}
```

### Add to Dashboard

1. Add a fetcher in `lib/quant-api.ts`
2. Create a component in `components/data/`
3. Add the section to `data-dashboard-client.tsx`
4. Add the section ID to `section-nav.tsx` SECTIONS array

### Retrain Model

If you modify the training pipeline:
1. Edit `src/model_trainer.py` or `src/data_prep.py`
2. Run `python scripts/pretrain.py`
3. Commit the new `.joblib` files
4. Push → Railway auto-deploys

---

## 12. PR History (Relevant to Quant)

| PR | Branch | Status | Description |
|----|--------|--------|-------------|
| #10 | `tomas_branch` | MERGED | Initial ML pipeline + FastAPI for credit scoring |
| #34 | `fix/scorecard-grade-thresholds` | MERGED | Grade thresholds: A≥720, B≥620 |
| #38 | `active_scoring` | MERGED | Real-time transaction scoring pipeline (your endpoints) |
| — | `4fd6db3` (direct) | ON MAIN | /data analytics dashboard, 6 SQL views, proxy route |

### Branches to Clean Up

- `origin/active_scoring` — has 1 divergent commit (`355f6d5`) that's a duplicate of what was merged in #38. Can be deleted.
- `origin/tomas_branch` — fully merged via #10. Can be deleted.

---

## 13. Quick Contacts

- **Pipeline / Edge Functions / Supabase:** Kevin (Member A)
- **UI / Frontend:** Member C (all UI work DONE)
- **CI/CD / Tests:** Member D
- **Railway deployment:** Kevin manages, Tomas has access

---

*Last verified: 2026-02-21 ~22:00 GMT — API healthy, model loaded, all endpoints responding.*
