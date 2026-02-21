"""
api/main.py — FastAPI application serving the Flowzo quant pipeline.

Run locally:
    uvicorn api.main:app --reload --port 8000

Endpoints
---------
POST /api/score            Credit score, PD, grade
POST /api/explain          SHAP explanation waterfall data
GET  /api/lenders          Simulated lender pool
GET  /api/backtest         Historical default rates by grade
POST /api/stress-test      Score delta under income shock
GET  /api/returns          Portfolio yield & Sharpe ratio
GET  /api/eda              EDA summary stats + correlation matrix
GET  /api/forecast-accuracy MAPE time-series mock
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Lazy imports populated at startup ─────────────────────────────────────────
import sys
import os

# Allow running from project root: `uvicorn api.main:app`
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

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
