"""
analytics.py — Backtest aggregation, stress testing, Sharpe ratio, EDA, and MAPE.
"""

import math

import numpy as np
import pandas as pd

from .data_prep import FEATURE_NAMES
from .model_trainer import get_model, get_pd
from .scorecard import get_risk_grade, pd_to_score

# ── Risk-free rate used for Sharpe ratio (UK base rate proxy) ─────────────────
_RISK_FREE_RATE = 0.052  # 5.2 % annual


# ─────────────────────────────────────────────────────────────────────────────
# 1. Backtest stats
# ─────────────────────────────────────────────────────────────────────────────

def calculate_backtest_stats(df: pd.DataFrame) -> dict[str, dict]:
    """
    Group the dataset by Risk Grade (A / B / C) and return the historical
    default rate for each grade.

    Parameters
    ----------
    df : cleaned DataFrame from ``data_prep.load_data()``
        Must contain FEATURE_NAMES columns and a ``TARGET`` column.

    Returns
    -------
    {
        "A": {"default_rate": float, "n_borrowers": int},
        "B": {...},
        "C": {...},
    }
    """
    records = df[FEATURE_NAMES + ["TARGET"]].copy()
    # Vectorised batch prediction — ~50× faster than row-by-row apply
    model = get_model()
    X = records[FEATURE_NAMES].values
    pds = model.predict_proba(X)[:, 1]
    records["pd"] = pds
    records["score"] = records["pd"].apply(pd_to_score)
    records["grade"] = records["score"].apply(get_risk_grade)

    result: dict[str, dict] = {}
    for grade in ["A", "B", "C"]:
        subset = records[records["grade"] == grade]
        n = len(subset)
        default_rate = float(subset["TARGET"].mean()) if n > 0 else 0.0
        result[grade] = {"default_rate": round(default_rate, 4), "n_borrowers": n}

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2. Portfolio returns (mock Sharpe ratio)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_portfolio_returns(
    pool: list[dict],
    default_rates: dict[str, dict],
) -> dict:
    """
    Mock Sharpe-ratio calculation comparing expected yield against risk-free rate.

    Parameters
    ----------
    pool         : lender pool from ``simulation.simulate_lender_pool()``
    default_rates: output of ``calculate_backtest_stats()``

    Returns
    -------
    {
        "weighted_yield_pct": float,
        "risk_free_rate_pct": float,
        "excess_return_pct":  float,
        "sharpe_ratio":       float,
        "total_capital_gbp":  float,
    }
    """
    # Grade → expected gross yield proxy (UK-benchmarked APR targets)
    grade_yield = {
        "A": 0.085,   # 8.5% — low risk, above savings rate
        "B": 0.145,   # 14.5% — medium risk, above default rate (~4.2%)
        "C": 0.22,    # 22.0% — high risk, compensates for ~13% defaults
    }

    yields: list[float] = []
    weights: list[float] = []

    for lender in pool:
        appetite = lender["risk_appetite"]
        grade = {"Conservative": "A", "Balanced": "B", "Aggressive": "C"}[appetite]
        dr = default_rates.get(grade, {}).get("default_rate", 0.05)
        net_yield = grade_yield[grade] - dr
        yields.append(net_yield)
        weights.append(lender["pot_size_gbp"])

    total_capital = sum(weights)
    weighted_yield = sum(y * w for y, w in zip(yields, weights)) / total_capital

    excess = weighted_yield - _RISK_FREE_RATE
    std_dev = float(np.std(yields))
    sharpe = excess / std_dev if std_dev > 0 else 0.0

    return {
        "weighted_yield_pct": round(weighted_yield * 100, 3),
        "risk_free_rate_pct": round(_RISK_FREE_RATE * 100, 3),
        "excess_return_pct": round(excess * 100, 3),
        "sharpe_ratio": round(sharpe, 4),
        "total_capital_gbp": round(total_capital, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Stress test
# ─────────────────────────────────────────────────────────────────────────────

def stress_test_borrower(
    features: list[float],
    income_multiplier: float,
) -> dict:
    """
    Apply ``income_multiplier`` to the annual_inflow feature and return the
    delta in credit score.

    Parameters
    ----------
    features          : list of 6 feature values (same ordering as FEATURE_NAMES)
    income_multiplier : e.g. 0.5 to simulate 50 % income shock

    Returns
    -------
    {
        "original_score":  float,
        "stressed_score":  float,
        "score_delta":     float,
        "original_grade":  str,
        "stressed_grade":  str,
    }
    """
    features = list(features)

    original_pd = get_pd(features)
    original_score = pd_to_score(original_pd)
    original_grade = get_risk_grade(original_score)

    stressed = features.copy()
    stressed[0] = stressed[0] * income_multiplier  # annual_inflow is index 0

    stressed_pd = get_pd(stressed)
    stressed_score = pd_to_score(stressed_pd)
    stressed_grade = get_risk_grade(stressed_score)

    return {
        "original_score": round(original_score, 2),
        "stressed_score": round(stressed_score, 2),
        "score_delta": round(stressed_score - original_score, 2),
        "original_grade": original_grade,
        "stressed_grade": stressed_grade,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. EDA summary statistics
# ─────────────────────────────────────────────────────────────────────────────

_TOP_EDA_FEATURES = FEATURE_NAMES[:5]  # exclude failed_payment_cluster_risk


def generate_eda_stats(df: pd.DataFrame) -> dict:
    """
    Return summary statistics (mean, median, std) and a correlation matrix
    for the top 5 Open Banking proxy features.

    Returns
    -------
    {
        "summary": {
            "<feature>": {"mean": float, "median": float, "std": float},
            ...
        },
        "correlation": {
            "<feature>": {"<feature>": float, ...},
            ...
        },
    }
    """
    sub = df[_TOP_EDA_FEATURES]

    summary: dict[str, dict] = {}
    for col in _TOP_EDA_FEATURES:
        summary[col] = {
            "mean": round(float(sub[col].mean()), 4),
            "median": round(float(sub[col].median()), 4),
            "std": round(float(sub[col].std()), 4),
        }

    corr = sub.corr().round(4)
    correlation = corr.to_dict()

    return {"summary": summary, "correlation": correlation}


# ─────────────────────────────────────────────────────────────────────────────
# 5. Cash-flow forecast accuracy (MAPE)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_mape_mock(n_days: int = 30, seed: int = 42) -> dict:
    """
    Generate a mock 30-day array of Actual vs Forecasted cash flows and
    calculate MAPE.

    MAPE = (1/n) × Σ |Actual - Forecast| / |Actual| × 100

    Returns
    -------
    {
        "days": [int, ...],
        "actual":    [float, ...],
        "forecasted": [float, ...],
        "mape_pct":  float,
    }
    """
    rng = np.random.default_rng(seed)

    base = 2_000.0  # £ baseline daily cash flow
    actual = base + rng.normal(0, 200, n_days)
    actual = np.maximum(actual, 1.0)  # prevent divide-by-zero

    noise = rng.normal(0, 120, n_days)
    forecasted = actual + noise

    mape = float(np.mean(np.abs(actual - forecasted) / np.abs(actual)) * 100)

    return {
        "days": list(range(1, n_days + 1)),
        "actual": [round(v, 2) for v in actual.tolist()],
        "forecasted": [round(v, 2) for v in forecasted.tolist()],
        "mape_pct": round(mape, 4),
    }
