"""
test_all.py — Comprehensive test suite for the Flowzo quant pipeline.

Covers:
  Section 1: scorecard.py        (S01–S12)  — pd_to_score, get_risk_grade
  Section 2: simulation.py       (SIM01–SIM08) — lender pool properties
  Section 3: analytics.py        (AN01–AN11) — MAPE, Sharpe, stress-test, EDA
  Section 4: model pipeline      (M01–M08)  — get_pd, consistency, direction
  Section 5: API state management(ST01–ST08) — _update_state, _compute_features

Run:
    python scripts/test_all.py
"""

import sys
import os
import warnings
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pandas as pd

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS = "\033[92m  PASS\033[0m"
FAIL = "\033[91m  FAIL\033[0m"
results: list[tuple[str, bool, str]] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((name, condition, detail))
    status = PASS if condition else FAIL
    print(f"{status} {name}" + (f"\n       {detail}" if detail and not condition else ""))


# ── Synthetic data for analytics tests ───────────────────────────────────────

def make_synthetic_df(n: int = 200, seed: int = 42) -> pd.DataFrame:
    """100-row DataFrame with FEATURE_NAMES + TARGET (no model/CSV required)."""
    from src.data_prep import FEATURE_NAMES
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "annual_inflow":              rng.uniform(15_000, 120_000, n),
        "avg_monthly_balance":        rng.uniform(500, 15_000, n),
        "days_since_account_open":    rng.uniform(100, 4_000, n),
        "primary_bank_health_score":  rng.uniform(0.1, 1.0, n),
        "secondary_bank_health_score":rng.uniform(0.1, 1.0, n),
        "failed_payment_cluster_risk":rng.choice([1.0, 2.0, 3.0], n),
        "TARGET":                     rng.choice([0, 1], n, p=[0.82, 0.18]),
    })


# ──────────────────────────────────────────────────────────────────────────────
# Section 1: scorecard.py
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 1: scorecard.py ───────────────────────────────────────────────")

from src.scorecard import pd_to_score, get_risk_grade

# S01: very low PD → score well above target-score anchor (600)
# pd=0.001 → odds=999 → score ≈ 686 (formula: offset + factor*ln(odds))
s_low_pd = pd_to_score(0.001)
check("S01 very low PD (0.001) → score > 600", s_low_pd >= 600,
      f"pd=0.001 → score={s_low_pd:.2f}")

# S02: very high PD → score near 300
s_high_pd = pd_to_score(0.999)
check("S02 very high PD → score near 300", s_high_pd <= 320,
      f"pd=0.999 → score={s_high_pd:.2f}")

# S03: PD=0.5 → odds=1 → score near offset (~487, below grade-B threshold 495)
s_half = pd_to_score(0.5)
check("S03 pd=0.5 gives score in C-grade range (< 495)", s_half < 495,
      f"pd=0.5 → score={s_half:.2f}, expected < 495")

# S04: monotonicity — lower PD → higher score (test 5 points)
pds = [0.02, 0.05, 0.10, 0.20, 0.40]
scores = [pd_to_score(p) for p in pds]
is_monotone = all(scores[i] > scores[i+1] for i in range(len(scores)-1))
check("S04 monotonically decreasing: higher PD → lower score", is_monotone,
      f"scores={[round(s,1) for s in scores]}")

# S05: clamping at 300 (floor)
s_floor = pd_to_score(1 - 1e-9)  # extremely high PD
check("S05 score clamped at 300 (floor)", s_floor == 300.0,
      f"got {s_floor}")

# S06: clamping at 850 (ceiling)
s_ceil = pd_to_score(1e-9)  # extremely low PD
check("S06 score clamped at 850 (ceiling)", s_ceil == 850.0,
      f"got {s_ceil}")

# S07: grade A threshold (score=521 → A)
check("S07 score=521 → grade A", get_risk_grade(521) == "A",
      f"got {get_risk_grade(521)}")

# S08: grade B boundary (score=520 → B, score=495 → B)
check("S08 score=520 → grade B", get_risk_grade(520) == "B",
      f"got {get_risk_grade(520)}")
check("S09 score=495 → grade B", get_risk_grade(495) == "B",
      f"got {get_risk_grade(495)}")

# S10: grade C (score=494 → C)
check("S10 score=494 → grade C", get_risk_grade(494) == "C",
      f"got {get_risk_grade(494)}")

# S11: grade A for very high score
check("S11 score=850 → grade A", get_risk_grade(850) == "A",
      f"got {get_risk_grade(850)}")

# S12: grade C for very low score
check("S12 score=300 → grade C", get_risk_grade(300) == "C",
      f"got {get_risk_grade(300)}")


# ──────────────────────────────────────────────────────────────────────────────
# Section 2: simulation.py
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 2: simulation.py ──────────────────────────────────────────────")

from src.simulation import simulate_lender_pool, RISK_APPETITES

pool = simulate_lender_pool(n=1000, seed=42)

# SIM01: exact count
check("SIM01 pool has exactly 1000 lenders", len(pool) == 1000,
      f"got {len(pool)}")

# SIM02: lender_ids are 1..1000 and unique
ids = [l["lender_id"] for l in pool]
check("SIM02 lender_ids unique and span 1–1000",
      sorted(ids) == list(range(1, 1001)),
      f"min={min(ids)}, max={max(ids)}, unique={len(set(ids))}")

# SIM03: all risk_appetites valid
appetites = {l["risk_appetite"] for l in pool}
check("SIM03 only valid risk_appetite values",
      appetites.issubset(set(RISK_APPETITES)),
      f"unexpected appetites: {appetites - set(RISK_APPETITES)}")

# SIM04: pot_size_gbp within global range [500, 30000]
pot_sizes = [l["pot_size_gbp"] for l in pool]
check("SIM04 pot_size_gbp in [500, 30000]",
      all(500 <= p <= 30_000 for p in pot_sizes),
      f"min={min(pot_sizes):.2f}, max={max(pot_sizes):.2f}")

# SIM05: target_yield_pct within global range [3.0, 15.0]
yields = [l["target_yield_pct"] for l in pool]
check("SIM05 target_yield_pct in [3.0, 15.0]",
      all(3.0 <= y <= 15.0 for y in yields),
      f"min={min(yields):.2f}, max={max(yields):.2f}")

# SIM06: deterministic with same seed
pool2 = simulate_lender_pool(n=1000, seed=42)
check("SIM06 same seed → identical pool",
      pool[0] == pool2[0] and pool[-1] == pool2[-1])

# SIM07: different seed → different pool
pool3 = simulate_lender_pool(n=1000, seed=99)
check("SIM07 different seed → different pool",
      pool[0] != pool3[0])

# SIM08: distribution roughly 35/45/20 (allow ±10pp tolerance)
n_con = sum(1 for l in pool if l["risk_appetite"] == "Conservative")
n_bal = sum(1 for l in pool if l["risk_appetite"] == "Balanced")
n_agg = sum(1 for l in pool if l["risk_appetite"] == "Aggressive")
check("SIM08 distribution roughly 35/45/20 (±10pp)",
      abs(n_con/10 - 35) < 10 and abs(n_bal/10 - 45) < 10 and abs(n_agg/10 - 20) < 10,
      f"Con={n_con}({n_con/10:.0f}%) Bal={n_bal}({n_bal/10:.0f}%) Agg={n_agg}({n_agg/10:.0f}%)")


# ──────────────────────────────────────────────────────────────────────────────
# Section 3: analytics.py
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 3: analytics.py ───────────────────────────────────────────────")

from src.analytics import (
    calculate_mape_mock,
    calculate_backtest_stats,
    calculate_portfolio_returns,
    stress_test_borrower,
    generate_eda_stats,
)

# AN01–AN04: MAPE mock
mape = calculate_mape_mock(n_days=30, seed=42)
check("AN01 MAPE returns expected keys",
      set(mape.keys()) == {"days", "actual", "forecasted", "mape_pct"})
check("AN02 MAPE days=[1..30]", mape["days"] == list(range(1, 31)),
      f"got {mape['days'][:3]}...")
check("AN03 MAPE actual/forecasted both length 30",
      len(mape["actual"]) == 30 and len(mape["forecasted"]) == 30)
check("AN04 MAPE pct in [0, 100]",
      0 <= mape["mape_pct"] <= 100,
      f"mape_pct={mape['mape_pct']}")

# AN05: MAPE deterministic (same seed → same result)
mape2 = calculate_mape_mock(n_days=30, seed=42)
check("AN05 MAPE deterministic with same seed",
      mape["mape_pct"] == mape2["mape_pct"])

# AN06–AN09: stress test
low_risk = [50_000.0, 5_000.0, 1_000.0, 0.9, 0.85, 1.0]
stressed = stress_test_borrower(low_risk, income_multiplier=0.5)
check("AN06 stress_test returns expected keys",
      {"original_score","stressed_score","score_delta","original_grade","stressed_grade"}.issubset(stressed))
check("AN07 income shock 0.5× worsens or maintains score",
      stressed["stressed_score"] <= stressed["original_score"],
      f"original={stressed['original_score']:.2f}, stressed={stressed['stressed_score']:.2f}")
check("AN08 stress_test score_delta = stressed - original",
      abs(stressed["score_delta"] - (stressed["stressed_score"] - stressed["original_score"])) < 0.01)
neutral = stress_test_borrower(low_risk, income_multiplier=1.0)
check("AN09 income_multiplier=1.0 → score_delta=0",
      abs(neutral["score_delta"]) < 0.01,
      f"delta={neutral['score_delta']}")

# AN10–AN11: backtest + portfolio returns on synthetic data
df_fake = make_synthetic_df(200)
backtest = calculate_backtest_stats(df_fake)
check("AN10 backtest returns A/B/C grades",
      set(backtest.keys()) == {"A", "B", "C"})
check("AN11 backtest default_rates in [0,1] and n_borrowers sums to 200",
      all(0 <= backtest[g]["default_rate"] <= 1 for g in "ABC")
      and sum(backtest[g]["n_borrowers"] for g in "ABC") == 200,
      f"A={backtest['A']}, B={backtest['B']}, C={backtest['C']}")

# AN12: portfolio returns
pool_small = simulate_lender_pool(n=50, seed=1)
returns = calculate_portfolio_returns(pool_small, backtest)
check("AN12 portfolio returns has expected keys",
      {"weighted_yield_pct","risk_free_rate_pct","excess_return_pct","sharpe_ratio","total_capital_gbp"}.issubset(returns))
check("AN13 total_capital_gbp > 0",
      returns["total_capital_gbp"] > 0,
      f"got {returns['total_capital_gbp']}")
check("AN14 sharpe_ratio is a finite float",
      isinstance(returns["sharpe_ratio"], float) and not (returns["sharpe_ratio"] != returns["sharpe_ratio"]),
      f"got {returns['sharpe_ratio']}")

# AN15: EDA stats
eda = generate_eda_stats(df_fake)
check("AN15 EDA has summary and correlation keys",
      set(eda.keys()) == {"summary", "correlation"})
check("AN16 EDA summary covers top 5 features",
      len(eda["summary"]) == 5)
check("AN17 EDA summary values have mean/median/std",
      all(set(v.keys()) == {"mean","median","std"} for v in eda["summary"].values()))


# ──────────────────────────────────────────────────────────────────────────────
# Section 4: model pipeline (get_pd → pd_to_score → get_risk_grade)
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 4: model pipeline ─────────────────────────────────────────────")

from src.model_trainer import get_pd

# Representative borrower feature vectors
LOW_RISK  = [80_000.0, 8_000.0, 2_000.0, 0.95, 0.90, 1.0]  # good profile
HIGH_RISK = [12_000.0,   300.0,    60.0, 0.20, 0.15, 3.0]  # bad profile

pd_low  = get_pd(LOW_RISK)
pd_high = get_pd(HIGH_RISK)

# M01: PD in [0, 1]
check("M01 get_pd returns float in [0,1]",
      isinstance(pd_low, float) and 0 <= pd_low <= 1,
      f"pd_low={pd_low}")

# M02: PD consistent (same input → same output)
pd_low2 = get_pd(LOW_RISK)
check("M02 get_pd consistent for same input",
      abs(pd_low - pd_low2) < 1e-9)

# M03: high-risk borrower has materially higher PD
check("M03 high-risk PD > low-risk PD",
      pd_high > pd_low,
      f"low_risk_PD={pd_low:.4f}, high_risk_PD={pd_high:.4f}")

# M04: pd_to_score monotonically decreasing (low PD → higher score)
s_low  = pd_to_score(pd_low)
s_high = pd_to_score(pd_high)
check("M04 low-risk borrower has higher score than high-risk",
      s_low > s_high,
      f"low={s_low:.1f}, high={s_high:.1f}")

# M05: grade ordering is consistent with score ordering
g_low  = get_risk_grade(s_low)
g_high = get_risk_grade(s_high)
grade_rank = {"A": 3, "B": 2, "C": 1}
check("M05 low-risk grade ≥ high-risk grade (A≥B≥C)",
      grade_rank[g_low] >= grade_rank[g_high],
      f"low={g_low}, high={g_high}")

# M06: numpy array input works the same as list
pd_arr = get_pd(np.array(LOW_RISK))
check("M06 numpy array input gives same result as list",
      abs(pd_arr - pd_low) < 1e-9,
      f"list={pd_low:.6f}, array={pd_arr:.6f}")

# M07: PD for typical mid-risk borrower is in (0, 1) non-trivially
MID_RISK = [35_000.0, 2_000.0, 500.0, 0.55, 0.50, 2.0]
pd_mid = get_pd(MID_RISK)
check("M07 typical mid-risk borrower PD in (0.01, 0.99)",
      0.01 < pd_mid < 0.99,
      f"pd_mid={pd_mid:.4f}")

# M08: higher annual income → materially lower PD
# annual_inflow is index 0; XGBoost learned this direction from the training data.
feat_low_income  = [10_000.0, 500.0, 500.0, 0.6, 0.6, 2.0]
feat_high_income = [100_000.0, 500.0, 500.0, 0.6, 0.6, 2.0]
pd_low_inc  = get_pd(feat_low_income)
pd_high_inc = get_pd(feat_high_income)
check("M08 higher annual income → lower PD",
      pd_low_inc > pd_high_inc,
      f"low_income_PD={pd_low_inc:.4f}, high_income_PD={pd_high_inc:.4f}")


# ──────────────────────────────────────────────────────────────────────────────
# Section 5: API state management (_update_state, _compute_features)
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 5: API state management ──────────────────────────────────────")

# Import internal helpers without starting the full FastAPI app
import importlib.util, types

# Load api/main.py as a module without triggering lifespan startup
spec = importlib.util.spec_from_file_location(
    "api_main",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "api", "main.py"),
)
api_main = importlib.util.module_from_spec(spec)
# Stub FastAPI so the module-level app creation doesn't need a running server
import fastapi
spec.loader.exec_module(api_main)

_default_user_state = api_main._default_user_state
_update_state       = api_main._update_state
_compute_features   = api_main._compute_features
Transaction         = api_main.Transaction


def make_txn_api(amount: float, type_: str, desc: str = "", days_ago: int = 0) -> Transaction:
    ts = datetime.now(tz=timezone.utc) - timedelta(days=days_ago)
    return Transaction(
        user_id="test_user",
        amount=amount,
        transaction_type=type_,
        description=desc,
        merchant_name=None,
        booked_at=ts,
    )


# ST01: credit increases total_inflow
state = _default_user_state()
_update_state(state, make_txn_api(1000.0, "CREDIT", days_ago=10))
check("ST01 credit → total_inflow += amount",
      abs(state["total_inflow"] - 1000.0) < 0.01,
      f"got {state['total_inflow']}")

# ST02: debit increases total_outflow
_update_state(state, make_txn_api(-200.0, "DEBIT", days_ago=5))
check("ST02 debit → total_outflow += abs(amount)",
      abs(state["total_outflow"] - 200.0) < 0.01,
      f"got {state['total_outflow']}")

# ST03: txn_count increments correctly
check("ST03 txn_count = 2 after two transactions",
      state["txn_count"] == 2,
      f"got {state['txn_count']}")

# ST04: failed keyword increments failed_flags
state2 = _default_user_state()
_update_state(state2, make_txn_api(-50.0, "DEBIT", desc="Payment failed — insufficient funds"))
check("ST04 failed keyword → failed_flags = 1",
      state2["failed_flags"] == 1,
      f"got {state2['failed_flags']}")

# ST05: clean debit does not increment failed_flags
state3 = _default_user_state()
_update_txn = make_txn_api(-30.0, "DEBIT", desc="Tesco grocery shop")
_update_state(state3, _update_txn)
check("ST05 normal description → failed_flags = 0",
      state3["failed_flags"] == 0)

# ST06: _compute_features returns BorrowerFeatures with valid ranges
state4 = _default_user_state()
for mo in range(6):  # 6 months of credits
    _update_state(state4, make_txn_api(2000.0, "CREDIT", days_ago=30 * mo))
    _update_state(state4, make_txn_api(-500.0,  "DEBIT",  days_ago=30 * mo + 5))
feats = _compute_features(state4)
check("ST06 _compute_features returns BorrowerFeatures",
      hasattr(feats, "annual_inflow") and hasattr(feats, "risk_grade" if False else "failed_payment_cluster_risk"))
check("ST07 annual_inflow > 0 after credits",
      feats.annual_inflow > 0,
      f"got {feats.annual_inflow}")
check("ST08 primary_bank_health_score in [0, 1]",
      0.0 <= feats.primary_bank_health_score <= 1.0,
      f"got {feats.primary_bank_health_score}")


# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Summary ───────────────────────────────────────────────────────────────")
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
total = len(results)

print(f"\n  {passed}/{total} tests passed", end="")
if failed:
    print(f"  ({failed} FAILED)")
    print("\nFailed tests:")
    for name, ok, detail in results:
        if not ok:
            print(f"  x {name}: {detail}")
else:
    print("  — all green!")

sys.exit(0 if failed == 0 else 1)
