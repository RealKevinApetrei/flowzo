"""
api/main.py — FastAPI application serving the Flowzo quant pipeline.

Run locally:
    uvicorn api.main:app --reload --port 8000

Endpoints
---------
POST /api/score              Credit score, PD, grade
POST /api/explain            SHAP explanation waterfall data
GET  /api/lenders            Simulated lender pool
GET  /api/backtest           Historical default rates by grade
POST /api/stress-test        Score delta under income shock
GET  /api/returns            Portfolio yield & Sharpe ratio
GET  /api/eda                EDA summary stats + correlation matrix
GET  /api/forecast-accuracy  MAPE time-series mock
POST /api/transaction        Ingest one transaction, return updated score
POST /api/transaction/batch  Bootstrap from historical transactions, return score
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import statistics
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ── Lazy imports populated at startup ─────────────────────────────────────────
import sys
import os

# Allow running from project root: `uvicorn api.main:app`
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.spending_forecast import (
    TxnRecord,
    ObligationRecord,
    classify_transactions,
    _aggregate_daily_spend,
    forecast_irregular_spending,
)
from datetime import date as _Date

from src.analytics import (
    calculate_backtest_stats,
    calculate_mape_mock,
    calculate_portfolio_returns,
    generate_eda_stats,
    stress_test_borrower,
)
from src.data_prep import load_data
from src.explainability import get_shap_explanation
from src.model_trainer import get_model, get_pd
from src.scorecard import get_risk_grade, pd_to_score
from src.simulation import simulate_lender_pool

# ── Application state ─────────────────────────────────────────────────────────
_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm model and shared data on startup."""
    import time

    start = time.time()
    print("Loading dataset and model...")
    df = load_data()
    get_model()  # loads pre-trained or trains from CSV

    _state["df"] = df
    _state["lenders"] = simulate_lender_pool()
    _state["model_loaded"] = True

    elapsed = time.time() - start
    print(f"Model ready in {elapsed:.1f}s")
    yield
    _state.clear()


app = FastAPI(
    title="Flowzo Quant API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Shared Pydantic models ────────────────────────────────────────────────────

class BorrowerFeatures(BaseModel):
    annual_inflow: float = Field(..., description="Annual inflow (£)")
    avg_monthly_balance: float = Field(..., description="Average monthly balance (£)")
    days_since_account_open: float = Field(..., description="Days since account open (positive)")
    primary_bank_health_score: float = Field(..., ge=0.0, le=1.0)
    secondary_bank_health_score: float = Field(..., ge=0.0, le=1.0)
    failed_payment_cluster_risk: float = Field(..., description="Region risk rating (1-3)")

    def to_list(self) -> list[float]:
        return [
            self.annual_inflow,
            self.avg_monthly_balance,
            self.days_since_account_open,
            self.primary_bank_health_score,
            self.secondary_bank_health_score,
            self.failed_payment_cluster_risk,
        ]


# ── In-memory per-user transaction state ─────────────────────────────────────
# Aligned with compute-borrower-features Edge Function feature semantics.

USER_STATE: dict[str, dict] = {}

# Keywords from Edge Function + user requirements (union)
FAILED_KEYWORDS = frozenset([
    "failed", "rejected", "bounced", "returned",
    "unpaid", "nsf", "insufficient", "overdraft",
])

_MAX_BALANCE_SNAPSHOTS = 500


def _default_user_state() -> dict:
    return {
        "total_inflow": 0.0,       # sum of credits (GBP)
        "total_outflow": 0.0,      # abs sum of debits (GBP)
        "txn_count": 0,
        "earliest_date": None,     # datetime | None — account-age proxy
        "monthly_inflows": {},     # "YYYY-MM" -> float — for income regularity CV
        "balance_snapshots": [],   # list[float] — running net history, capped at 500
        "running_net": 0.0,        # current credits - debits
        "failed_flags": 0,         # count of transactions matching FAILED_KEYWORDS
    }


def _get_or_create_state(user_id: str) -> dict:
    if user_id not in USER_STATE:
        USER_STATE[user_id] = _default_user_state()
    return USER_STATE[user_id]


class Transaction(BaseModel):
    user_id: str
    amount: float = Field(..., description="Positive = credit, negative = debit (GBP)")
    transaction_type: str = Field(..., description="CREDIT or DEBIT")
    description: Optional[str] = Field(None, description="Merchant/payment narrative")
    merchant_name: Optional[str] = Field(None, description="Merchant name (if available)")
    booked_at: datetime = Field(..., description="ISO 8601 booking timestamp")

    @field_validator("booked_at", mode="before")
    @classmethod
    def parse_booked_at(cls, v: object) -> datetime:
        """Handle 'Z' suffix that Supabase emits (Python 3.10 fromisoformat rejects it)."""
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_validator("transaction_type", mode="before")
    @classmethod
    def normalise_type(cls, v: object) -> str:
        return v.upper().strip() if isinstance(v, str) else v


class TransactionBatch(BaseModel):
    transactions: list[Transaction] = Field(
        ..., min_length=1, max_length=5000,
        description="List of transactions — send oldest-first for correct date tracking.",
    )


class ObligationIn(BaseModel):
    merchant_name: str = Field(..., description="Merchant name (lowercase) from obligations table")


class SpendingForecastRequest(BaseModel):
    transactions: list[Transaction] = Field(
        ..., min_length=1, max_length=5000,
        description="Historical transactions (all types). Send oldest-first.",
    )
    obligations: list[ObligationIn] = Field(
        default_factory=list,
        description="Active recurring obligations — used to exclude known bills from irregular spend.",
    )
    forecast_start: Optional[str] = Field(
        None,
        description="ISO date string (YYYY-MM-DD) for day 1 of forecast. Defaults to today (UTC).",
    )
    horizon_days: int = Field(30, ge=1, le=90, description="Number of forecast days")


def _update_state(state: dict, txn: Transaction) -> None:
    """Mutate user state in-place with one transaction."""
    is_credit = txn.amount > 0 and txn.transaction_type == "CREDIT"
    is_debit  = txn.amount < 0 or  txn.transaction_type == "DEBIT"

    if is_credit:
        state["total_inflow"] += txn.amount
        month_key = txn.booked_at.strftime("%Y-%m")
        state["monthly_inflows"][month_key] = (
            state["monthly_inflows"].get(month_key, 0.0) + txn.amount
        )
    elif is_debit:
        state["total_outflow"] += abs(txn.amount)

    state["txn_count"] += 1
    state["running_net"] += txn.amount
    state["balance_snapshots"].append(state["running_net"])
    if len(state["balance_snapshots"]) > _MAX_BALANCE_SNAPSHOTS:
        state["balance_snapshots"] = state["balance_snapshots"][-_MAX_BALANCE_SNAPSHOTS:]

    txn_dt = txn.booked_at
    if not txn_dt.tzinfo:
        txn_dt = txn_dt.replace(tzinfo=timezone.utc)
    if state["earliest_date"] is None or txn_dt < state["earliest_date"]:
        state["earliest_date"] = txn_dt

    desc = (txn.description or "").lower()
    if any(kw in desc for kw in FAILED_KEYWORDS):
        state["failed_flags"] += 1


def _compute_features(state: dict) -> BorrowerFeatures:
    """Recalculate all 6 ML features from current in-memory state."""
    now = datetime.now(tz=timezone.utc)
    earliest = state["earliest_date"]
    days_elapsed   = max(1, (now - earliest).days) if earliest else 1
    months_elapsed = max(1, days_elapsed // 30)

    # annual_inflow: time-aware annualization (matches Edge Function intent)
    annual_inflow = (state["total_inflow"] / days_elapsed) * 365

    # avg_monthly_balance: running net / months
    avg_monthly_balance = state["running_net"] / months_elapsed

    # days_since_account_open
    days_since_open = float(days_elapsed)

    # primary_bank_health_score: 1 - CV(monthly inflows) — income regularity
    mv = list(state["monthly_inflows"].values())
    if len(mv) >= 2 and statistics.mean(mv) > 0:
        cv = statistics.stdev(mv) / statistics.mean(mv)
        primary = float(max(0.0, min(1.0, 1.0 - cv)))
    else:
        primary = 0.5  # neutral: not enough monthly history yet

    # secondary_bank_health_score: 1 - (balance_volatility × 0.3) — balance stability
    snaps = state["balance_snapshots"]
    if len(snaps) >= 2:
        mean_s = statistics.mean(snaps)
        vol = statistics.stdev(snaps) / abs(mean_s) if abs(mean_s) > 1e-9 else 1.0
        secondary = float(max(0.1, min(1.0, 1.0 - vol * 0.3)))
    else:
        secondary = 0.5

    # failed_payment_cluster_risk: exact 3-bucket from Edge Function
    fc = state["failed_flags"]
    if fc == 0:
        failed_risk = 1.0
    elif fc <= 2:
        failed_risk = 2.0
    else:
        failed_risk = 3.0

    return BorrowerFeatures(
        annual_inflow=round(annual_inflow, 2),
        avg_monthly_balance=round(avg_monthly_balance, 2),
        days_since_account_open=days_since_open,
        primary_bank_health_score=round(primary, 4),
        secondary_bank_health_score=round(secondary, 4),
        failed_payment_cluster_risk=failed_risk,
    )


def _score_response(user_id: str, state: dict, batch_size: int | None = None) -> dict:
    """Compute score from current state and return standard response shape."""
    features     = _compute_features(state)
    pd_value     = get_pd(features.to_list())
    credit_score = pd_to_score(pd_value)
    grade        = get_risk_grade(credit_score)

    out: dict = {
        "user_id": user_id,
        "credit_score": round(credit_score, 2),
        "probability_of_default": round(pd_value, 6),
        "risk_grade": grade,
        "updated_features": features.model_dump(),
        "metadata": {
            "txn_count": state["txn_count"],
            "failed_flags": state["failed_flags"],
            "monthly_income_buckets": len(state["monthly_inflows"]),
        },
    }
    if batch_size is not None:
        out["metadata"]["batch_size"] = batch_size
    return out


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check for Railway / load balancers."""
    return {
        "status": "ok",
        "model_loaded": _state.get("model_loaded", False),
    }


@app.post("/api/score")
def score_borrower(body: BorrowerFeatures):
    """Return Credit Score, Probability of Default, and Risk Grade."""
    pd_value = get_pd(body.to_list())
    credit_score = pd_to_score(pd_value)
    grade = get_risk_grade(credit_score)
    return {
        "credit_score": round(credit_score, 2),
        "probability_of_default": round(pd_value, 6),
        "risk_grade": grade,
    }


@app.post("/api/explain")
def explain_borrower(body: BorrowerFeatures):
    """Return top-3 positive and top-3 negative SHAP contributors."""
    try:
        explanation = get_shap_explanation(body.to_list())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return explanation


@app.get("/api/lenders")
def get_lenders():
    """Return the full simulated lender pool (1 000 lenders)."""
    return {"lenders": _state["lenders"], "count": len(_state["lenders"])}


@app.get("/api/backtest")
def backtest():
    """Return historical default rates by Risk Grade (A / B / C)."""
    df = _state["df"]
    # Sample for speed — backtest on 5 000 rows
    sample = df.sample(n=min(5_000, len(df)), random_state=1).reset_index(drop=True)
    stats = calculate_backtest_stats(sample)
    return {"backtest": stats}


class StressTestRequest(BaseModel):
    features: BorrowerFeatures
    income_multiplier: float = Field(..., gt=0.0, description="Multiplier applied to annual_inflow")


@app.post("/api/stress-test")
def stress_test(body: StressTestRequest):
    """Return credit-score delta after applying an income-shock multiplier."""
    result = stress_test_borrower(body.features.to_list(), body.income_multiplier)
    return result


@app.post("/api/transaction")
def ingest_transaction(txn: Transaction):
    """
    Ingest one Open Banking transaction for a user.
    Updates in-memory financial state, recomputes all 6 ML features,
    and returns a fresh credit score instantly.
    """
    state = _get_or_create_state(txn.user_id)
    _update_state(state, txn)
    return _score_response(txn.user_id, state)


@app.post("/api/transaction/batch")
def ingest_transaction_batch(body: TransactionBatch):
    """
    Bootstrap a user's state from a list of historical transactions.
    Send oldest-first for correct account-age tracking.
    All transactions must share the same user_id.
    """
    user_ids = {t.user_id for t in body.transactions}
    if len(user_ids) > 1:
        raise HTTPException(
            status_code=400,
            detail="All transactions in a batch must share the same user_id.",
        )
    user_id = user_ids.pop()
    state = _get_or_create_state(user_id)
    for txn in body.transactions:
        _update_state(state, txn)
    return _score_response(user_id, state, batch_size=len(body.transactions))


@app.get("/api/returns")
def portfolio_returns():
    """Return portfolio yield metrics and Sharpe ratio."""
    df = _state["df"]
    sample = df.sample(n=min(2_000, len(df)), random_state=2).reset_index(drop=True)
    backtest_stats = calculate_backtest_stats(sample)
    returns = calculate_portfolio_returns(_state["lenders"], backtest_stats)
    return returns


@app.get("/api/eda")
def eda():
    """Return EDA summary statistics and correlation matrix."""
    df = _state["df"]
    stats = generate_eda_stats(df)
    return stats


@app.get("/api/forecast-accuracy")
def forecast_accuracy():
    """Return 30-day mock cash-flow time series and MAPE score."""
    return calculate_mape_mock()


@app.post("/api/forecast/spending")
def spending_forecast(body: SpendingForecastRequest):
    """
    Classify historical transactions as RECURRING vs IRREGULAR, fit per-weekday
    Gamma distributions to irregular spend, and return a probabilistic daily forecast.

    Classification rules (first match wins):
    - amount >= 0              → INCOME (excluded from irregular)
    - merchant_name / first-30-chars of description matches an obligation → RECURRING (excluded)
    - description appears ≥2× with gap CV < 0.5 → RECURRING (excluded)
    - everything else          → IRREGULAR (modelled)

    Model tiers (reported in response.model):
    - gamma_dow   : per-weekday Gamma fits (best — needs ≥4 samples per weekday)
    - gamma_flat  : single overall Gamma fit (moderate history)
    - fallback_flat: flat mean ± percentile factors (very sparse history)
    """
    import numpy as np

    txn_records = [
        TxnRecord(
            amount=t.amount,
            booked_at=t.booked_at.date(),
            merchant_name=t.merchant_name,
            description=t.description,
        )
        for t in body.transactions
    ]
    obl_records = [
        ObligationRecord(merchant_name=o.merchant_name)
        for o in body.obligations
    ]

    start = (
        _Date.fromisoformat(body.forecast_start)
        if body.forecast_start
        else _Date.today()
    )

    forecasts = forecast_irregular_spending(
        transactions=txn_records,
        obligations=obl_records,
        forecast_start=start,
        horizon_days=body.horizon_days,
    )

    # Determine which model tier was used (for observability)
    irregular = classify_transactions(txn_records, obl_records)
    daily = _aggregate_daily_spend(irregular)
    dow_buckets: dict[int, list] = {}
    for d, spend in daily.items():
        dow_buckets.setdefault(d.weekday(), []).append(spend)
    has_dow_fit = any(len(v) >= 4 for v in dow_buckets.values())
    model_tier = (
        "gamma_dow" if has_dow_fit
        else "gamma_flat" if len(daily) >= 2
        else "fallback_flat"
    )

    return {
        "model": model_tier,
        "irregular_txn_count": len(irregular),
        "total_days_history": len(daily),
        "daily_forecasts": [
            {
                "forecast_date": f.forecast_date,
                "mean_spend": f.mean_spend,
                "p10": f.p10,
                "p90": f.p90,
            }
            for f in forecasts
        ],
    }
