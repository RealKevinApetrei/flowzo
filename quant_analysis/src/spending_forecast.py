"""
spending_forecast.py — Classify transactions as RECURRING or IRREGULAR,
then forecast irregular daily spending with a day-of-week Gamma model.

Pipeline
--------
1. classify_transactions()  — separates INCOME / RECURRING / IRREGULAR
2. forecast_irregular_spending()  — day-of-week Gamma model → 30-day predictions

The Gamma distribution is canonical for modelling non-negative right-skewed
spend data. Per-weekday fits capture the Monday-vs-Saturday spending pattern;
a payday multiplier handles the spending spike that follows salary receipt.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

import numpy as np
from scipy import stats


# ── Data contracts ─────────────────────────────────────────────────────────────

@dataclass
class TxnRecord:
    """
    One transaction.
    amount: positive = income, negative = spend (GBP, NOT pence).
    """
    amount: float
    booked_at: date
    merchant_name: Optional[str]
    description: Optional[str]


@dataclass
class ObligationRecord:
    """Active obligation — only merchant_name is needed for classification."""
    merchant_name: str  # should be lower-cased by the caller


@dataclass
class DailyForecast:
    forecast_date: str   # ISO "YYYY-MM-DD"
    mean_spend: float    # GBP point estimate
    p10: float           # 10th-percentile (optimistic scenario)
    p90: float           # 90th-percentile (pessimistic scenario)


# ── Constants ─────────────────────────────────────────────────────────────────

_MIN_RECURRING_MATCHES = 2   # description must appear ≥2× with CV<0.5 to be recurring
_MIN_SAMPLES_PER_DOW = 4     # minimum data points to fit a per-weekday Gamma
_PAYDAY_INCOME_THRESHOLD = 500.0   # GBP — credits above this are "payday-scale"
_PAYDAY_MAX_MULT = 2.0       # cap on the payday spending multiplier
_OUTLIER_SIGMA = 3.0         # drop daily totals above mean + N*std before fitting


# ── Classification ────────────────────────────────────────────────────────────

def _desc_key(txn: TxnRecord) -> str:
    """Normalised lookup key — merchant_name preferred, else first 30 chars of description."""
    if txn.merchant_name:
        return txn.merchant_name.lower().strip()
    return (txn.description or "").lower().strip()[:30]


def classify_transactions(
    transactions: list[TxnRecord],
    obligations: list[ObligationRecord],
) -> list[TxnRecord]:
    """
    Return only IRREGULAR outgoing transactions.

    Classification order (first match wins):
    1. amount >= 0              → INCOME   (excluded)
    2. desc_key in obligations  → RECURRING (excluded)
    3. desc_key appears ≥2×
       with gap CV < 0.5        → RECURRING (excluded — no-merchant subscription)
    4. everything else          → IRREGULAR (returned)
    """
    obl_keys = {o.merchant_name.lower().strip() for o in obligations if o.merchant_name}

    # Build gap-CV recurring set for transactions with no obligation match
    desc_dates: dict[str, list[date]] = {}
    for t in transactions:
        if t.amount >= 0:
            continue
        key = _desc_key(t)
        if key:
            desc_dates.setdefault(key, []).append(t.booked_at)

    desc_is_recurring: set[str] = set()
    for key, dates in desc_dates.items():
        if len(dates) < _MIN_RECURRING_MATCHES:
            continue
        dates_sorted = sorted(dates)
        gaps = [
            (dates_sorted[i] - dates_sorted[i - 1]).days
            for i in range(1, len(dates_sorted))
        ]
        if not gaps:
            continue
        mean_gap = float(np.mean(gaps))
        cv = float(np.std(gaps) / mean_gap) if mean_gap > 0 else float("inf")
        if cv < 0.5:
            desc_is_recurring.add(key)

    return [
        t for t in transactions
        if t.amount < 0
        and _desc_key(t) not in obl_keys
        and _desc_key(t) not in desc_is_recurring
    ]


# ── Daily aggregation ─────────────────────────────────────────────────────────

def _aggregate_daily_spend(irregular: list[TxnRecord]) -> dict[date, float]:
    """Sum absolute irregular outflows per calendar day."""
    daily: dict[date, float] = {}
    for t in irregular:
        daily[t.booked_at] = daily.get(t.booked_at, 0.0) + abs(t.amount)
    return daily


# ── Gamma fitting ─────────────────────────────────────────────────────────────

def _fit_gamma(values: np.ndarray) -> tuple[float, float, float] | None:
    """
    Fit Gamma(k, loc=0, scale=θ) after removing outliers.
    Returns (k, loc, theta) or None if fitting fails.
    """
    if len(values) < 2:
        return None
    m, s = float(np.mean(values)), float(np.std(values))
    clean = values[values <= m + _OUTLIER_SIGMA * s]
    if len(clean) < 2:
        clean = values
    try:
        k, loc, theta = stats.gamma.fit(clean, floc=0)
        if k <= 0 or theta <= 0:
            return None
        return float(k), float(loc), float(theta)
    except Exception:
        return None


def _gamma_stats(
    params: tuple[float, float, float],
) -> tuple[float, float, float]:
    """Return (mean, p10, p90) from fitted Gamma parameters."""
    dist = stats.gamma(*params)
    return float(dist.mean()), float(dist.ppf(0.10)), float(dist.ppf(0.90))


# ── Payday multiplier ─────────────────────────────────────────────────────────

def _compute_payday_multiplier(
    transactions: list[TxnRecord],
    daily_irregular: dict[date, float],
    overall_mean: float,
) -> tuple[int | None, float]:
    """
    Detect the modal payday day-of-month and compute a spending multiplier
    for the 1–2 days following it (capped at _PAYDAY_MAX_MULT).

    Returns (payday_dom, multiplier).  payday_dom=None if no paydays detected.
    """
    income_days = [
        t.booked_at.day for t in transactions
        if t.amount >= _PAYDAY_INCOME_THRESHOLD
    ]
    if not income_days:
        return None, 1.0

    payday_dom = Counter(income_days).most_common(1)[0][0]

    payday_dates = {t.booked_at for t in transactions if t.amount >= _PAYDAY_INCOME_THRESHOLD}
    post_payday_spend = [
        daily_irregular[pd + timedelta(days=off)]
        for pd in payday_dates
        for off in (1, 2)
        if pd + timedelta(days=off) in daily_irregular
    ]

    if len(post_payday_spend) < 3 or overall_mean <= 0:
        return payday_dom, 1.0

    multiplier = min(_PAYDAY_MAX_MULT, float(np.mean(post_payday_spend)) / overall_mean)
    return payday_dom, multiplier


# ── Main forecast function ────────────────────────────────────────────────────

def forecast_irregular_spending(
    transactions: list[TxnRecord],
    obligations: list[ObligationRecord],
    forecast_start: date,
    horizon_days: int = 30,
) -> list[DailyForecast]:
    """
    Full pipeline: classify → aggregate → fit per-weekday Gamma → predict.

    Parameters
    ----------
    transactions   : Full transaction history (income + spend, at least 30 days)
    obligations    : Active recurring obligations used to exclude RECURRING txns
    forecast_start : First date of the output forecast (inclusive)
    horizon_days   : Number of forecast days (default 30)

    Returns
    -------
    List of DailyForecast, one per day starting from forecast_start.
    Falls back gracefully to flat estimates when data is sparse.
    """
    irregular = classify_transactions(transactions, obligations)
    daily_spend = _aggregate_daily_spend(irregular)

    # ── Zero-history fallback ──────────────────────────────────────────────
    if not daily_spend:
        return [
            DailyForecast(
                forecast_date=(forecast_start + timedelta(days=i)).isoformat(),
                mean_spend=0.0,
                p10=0.0,
                p90=0.0,
            )
            for i in range(horizon_days)
        ]

    # ── Per-weekday Gamma fits ─────────────────────────────────────────────
    dow_buckets: dict[int, list[float]] = {i: [] for i in range(7)}
    for d, spend in daily_spend.items():
        dow_buckets[d.weekday()].append(spend)

    all_values = np.array(list(daily_spend.values()), dtype=float)
    overall_params = _fit_gamma(all_values)
    overall_mean = float(np.mean(all_values))

    dow_params: dict[int, tuple[float, float, float] | None] = {}
    for dow, vals in dow_buckets.items():
        arr = np.array(vals, dtype=float)
        dow_params[dow] = _fit_gamma(arr) if len(arr) >= _MIN_SAMPLES_PER_DOW else None

    # ── Payday effect ──────────────────────────────────────────────────────
    payday_dom, payday_mult = _compute_payday_multiplier(
        transactions, daily_spend, overall_mean
    )

    # ── Build day-by-day predictions ──────────────────────────────────────
    results: list[DailyForecast] = []
    for i in range(horizon_days):
        fdate = forecast_start + timedelta(days=i)
        dow = fdate.weekday()

        params = dow_params.get(dow) or overall_params

        if params is not None:
            mean_s, p10, p90 = _gamma_stats(params)
        else:
            # Full fallback: no Gamma could be fitted
            mean_s = overall_mean
            p10 = overall_mean * 0.4
            p90 = overall_mean * 2.0

        # Apply payday multiplier on days 1–2 after the expected payday
        if payday_dom is not None:
            try:
                this_payday = date(fdate.year, fdate.month, payday_dom)
                delta = (fdate - this_payday).days
                if delta == 1:
                    mean_s, p10, p90 = mean_s * payday_mult, p10 * payday_mult, p90 * payday_mult
                elif delta == 2:
                    f = payday_mult * 0.8
                    mean_s, p10, p90 = mean_s * f, p10 * f, p90 * f
            except ValueError:
                pass  # month doesn't have that day (e.g., Feb 30)

        results.append(DailyForecast(
            forecast_date=fdate.isoformat(),
            mean_spend=round(mean_s, 2),
            p10=round(max(0.0, p10), 2),
            p90=round(p90, 2),
        ))

    return results
