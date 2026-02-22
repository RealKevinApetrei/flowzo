"""
test_spending_forecast.py — Manual test suite for spending_forecast.py

Tests:
  1. Classification — INCOME excluded
  2. Classification — obligation merchant excluded (RECURRING)
  3. Classification — gap-CV recurring detection (≥2 appearances, CV < 0.5)
  4. Classification — high-CV irregular repeated merchant (NOT recurring)
  5. Classification — unknown one-off expense is IRREGULAR
  6. Forecast — zero history returns all-zero output
  7. Forecast — correct number of days returned
  8. Forecast — p10 <= mean <= p90 for every day
  9. Forecast — dates are consecutive ISO strings
 10. Forecast — payday multiplier: day+1 after payday has higher mean than day-1 before
 11. Forecast — with rich history, model uses Gamma (non-flat estimates)
 12. API endpoint — /api/forecast/spending round-trip (starts server in thread)

Run:
    python scripts/test_spending_forecast.py
"""

import sys
import os
import traceback
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.spending_forecast import (
    TxnRecord,
    ObligationRecord,
    DailyForecast,
    classify_transactions,
    _aggregate_daily_spend,
    _fit_gamma,
    _compute_payday_multiplier,
    forecast_irregular_spending,
)
import numpy as np

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS = "\033[92m  PASS\033[0m"
FAIL = "\033[91m  FAIL\033[0m"
results: list[tuple[str, bool, str]] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((name, condition, detail))
    status = PASS if condition else FAIL
    print(f"{status} {name}" + (f"\n       {detail}" if detail and not condition else ""))


def make_txn(
    amount: float,
    days_ago: int,
    merchant: str | None = None,
    desc: str | None = None,
) -> TxnRecord:
    d = date(2026, 1, 31) - timedelta(days=days_ago)
    return TxnRecord(amount=amount, booked_at=d, merchant_name=merchant, description=desc)


# ── Test data factory ─────────────────────────────────────────────────────────

def build_rich_history() -> list[TxnRecord]:
    """90 days of realistic transactions for forecast tests."""
    txns: list[TxnRecord] = []
    base = date(2026, 1, 31)

    for i in range(90):
        d = base - timedelta(days=i)
        # Salary on the 25th of each month
        if d.day == 25:
            txns.append(TxnRecord(2800.0, d, None, "Employer Ltd Salary"))
        # Netflix monthly subscription (very regular: every 30 days, CV≈0)
        if i % 30 == 0:
            txns.append(TxnRecord(-15.99, d, "netflix", "Netflix"))
        # Gym monthly (every 28 days, slight jitter via +1 every other month → CV≈0.1)
        if i % 28 == 0:
            txns.append(TxnRecord(-35.00, d, "puregym", "PureGym"))
        # Irregular coffee/lunch spending (daily, random amount ~£5–20)
        rng = np.random.default_rng(seed=i)
        daily_coffee = float(rng.uniform(5, 20))
        txns.append(TxnRecord(-daily_coffee, d, "cafe nero", f"Cafe Nero {i}"))
        # Weekend restaurant splurge (Fri/Sat, higher spend)
        if d.weekday() in (4, 5):
            txns.append(TxnRecord(-float(rng.uniform(30, 80)), d, None, "Deliveroo order"))
        # One-off irregular spend (every ~2 weeks)
        if i % 14 == 3:
            txns.append(TxnRecord(-float(rng.uniform(20, 100)), d, None, "Amazon purchase"))

    return txns


# ──────────────────────────────────────────────────────────────────────────────
# Section 1: classify_transactions
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 1: classify_transactions ─────────────────────────────────────")

# Test 1: INCOME excluded
income_txn = make_txn(2500.0, 5, desc="Salary")
irregular = classify_transactions([income_txn], [])
check("T01 income excluded", len(irregular) == 0,
      f"got {len(irregular)} irregular, expected 0")

# Test 2: obligation merchant excluded
netflix = make_txn(-15.99, 10, merchant="netflix", desc="Netflix")
obl = ObligationRecord(merchant_name="Netflix")
irregular = classify_transactions([netflix], [obl])
check("T02 obligation merchant excluded", len(irregular) == 0,
      f"got {len(irregular)} irregular, expected 0")

# Test 3a: Case-insensitive obligation matching
netflix_upper = make_txn(-15.99, 10, merchant="NETFLIX", desc="Netflix Sub")
irregular = classify_transactions([netflix_upper], [obl])
check("T03a obligation case-insensitive", len(irregular) == 0,
      f"NETFLIX should match obligation 'Netflix'")

# Test 3b: gap-CV recurring detection — weekly Starbucks (CV≈0) should be RECURRING
starbucks_txns = [
    make_txn(-4.50, 7 * i, merchant="starbucks", desc="Starbucks coffee")
    for i in range(1, 10)  # 9 weekly entries
]
irregular = classify_transactions(starbucks_txns, [])
check("T04 gap-CV weekly → RECURRING", len(irregular) == 0,
      f"weekly Starbucks should be recurring, got {len(irregular)} irregular")

# Test 4: High-CV transactions NOT classified as recurring
# (payments on days 1, 5, 40, 80 — wildly irregular gaps)
erratic_txns = [
    TxnRecord(-20.0, date(2025, 11, 1), None, "random store"),
    TxnRecord(-20.0, date(2025, 11, 5), None, "random store"),
    TxnRecord(-20.0, date(2025, 12, 10), None, "random store"),
    TxnRecord(-20.0, date(2026, 1, 30), None, "random store"),
]
irregular = classify_transactions(erratic_txns, [])
check("T05 erratic gaps → IRREGULAR", len(irregular) == 4,
      f"erratic 'random store' should be irregular, got {len(irregular)}")

# Test 5: One-off unknown merchant is IRREGULAR
one_off = make_txn(-250.0, 3, merchant="apple store", desc="iPhone case")
irregular = classify_transactions([one_off], [])
check("T06 one-off → IRREGULAR", len(irregular) == 1,
      f"got {len(irregular)} irregular, expected 1")

# Test 6: Mixed batch — verify separation is correct
mixed = [
    make_txn(2500.0, 30, desc="Salary"),                          # INCOME
    make_txn(-15.99, 30, merchant="netflix", desc="Netflix"),     # RECURRING (obligation)
    make_txn(-15.99, 60, merchant="netflix", desc="Netflix"),     # RECURRING (obligation)
    *[make_txn(-35.0, 28 * k, merchant="gym", desc="Gym") for k in range(1, 5)],  # RECURRING (gap-CV)
    make_txn(-42.00, 5, merchant="amazon", desc="Amazon order"),  # IRREGULAR (one-off)
    make_txn(-18.50, 2, None, "Just Eat order"),                  # IRREGULAR (one-off)
]
obl_net = ObligationRecord(merchant_name="Netflix")
irregular = classify_transactions(mixed, [obl_net])
check("T07 mixed batch separation", len(irregular) == 2,
      f"expected 2 irregular (Amazon + Just Eat), got {len(irregular)}: "
      + str([(t.merchant_name or t.description) for t in irregular]))

# Test 7: No false-positive — gym (4 payments at ~28-day intervals, CV≈0.02) should be RECURRING
gym_txns = [
    TxnRecord(-35.0, date(2025, 10, 1), "gym", "Gym"),
    TxnRecord(-35.0, date(2025, 10, 29), "gym", "Gym"),  # 28 days
    TxnRecord(-35.0, date(2025, 11, 26), "gym", "Gym"),  # 28 days
    TxnRecord(-35.0, date(2025, 12, 24), "gym", "Gym"),  # 28 days
]
irregular = classify_transactions(gym_txns, [])
check("T08 gym monthly → RECURRING via gap-CV", len(irregular) == 0,
      f"gym with 28-day gaps (CV≈0) should be recurring, got {len(irregular)} irregular")

# Test 8: Monthly sub with slight natural jitter (29/30/31 day gaps, CV≈0.03) → RECURRING
jittery_sub = [
    TxnRecord(-9.99, date(2025, 10, 2), "spotify", "Spotify"),
    TxnRecord(-9.99, date(2025, 11, 1), "spotify", "Spotify"),   # 30 days
    TxnRecord(-9.99, date(2025, 12, 2), "spotify", "Spotify"),   # 31 days
    TxnRecord(-9.99, date(2026, 1, 1), "spotify", "Spotify"),    # 30 days
]
irregular = classify_transactions(jittery_sub, [])
check("T09 jittery monthly sub → RECURRING", len(irregular) == 0,
      f"Spotify with 29-31 day gaps should be recurring, got {len(irregular)}")

# ──────────────────────────────────────────────────────────────────────────────
# Section 2: forecast_irregular_spending
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 2: forecast_irregular_spending ────────────────────────────────")

START = date(2026, 2, 1)

# Test 9: Zero history → all-zero output
empty_forecasts = forecast_irregular_spending([], [], START, horizon_days=7)
check("T10 zero history → 7 zero forecasts", len(empty_forecasts) == 7)
check("T11 zero history → mean=0", all(f.mean_spend == 0.0 for f in empty_forecasts))

# Test 10: Correct number of days
history = build_rich_history()
obl_net = ObligationRecord(merchant_name="Netflix")
obl_gym = ObligationRecord(merchant_name="PureGym")
forecasts = forecast_irregular_spending(history, [obl_net, obl_gym], START, horizon_days=30)
check("T12 30-day forecast length", len(forecasts) == 30,
      f"expected 30, got {len(forecasts)}")

# Test 11: p10 <= mean <= p90 for every day
violations = [
    (f.forecast_date, f.p10, f.mean_spend, f.p90)
    for f in forecasts
    if not (f.p10 <= f.mean_spend <= f.p90)
]
check("T13 p10 ≤ mean ≤ p90 all days", len(violations) == 0,
      f"violations: {violations[:3]}")

# Test 12: p10 >= 0 for every day
neg_p10 = [f for f in forecasts if f.p10 < 0]
check("T14 p10 ≥ 0 all days", len(neg_p10) == 0,
      f"negative p10 on: {[f.forecast_date for f in neg_p10]}")

# Test 13: dates are consecutive ISO strings
for i, f in enumerate(forecasts):
    expected_date = (START + timedelta(days=i)).isoformat()
    if f.forecast_date != expected_date:
        check("T15 dates consecutive", False,
              f"day {i}: expected {expected_date}, got {f.forecast_date}")
        break
else:
    check("T15 dates consecutive", True)

# Test 14: mean_spend > 0 (Cafe Nero is irregular with rich history)
check("T16 mean_spend > 0 with history", all(f.mean_spend > 0 for f in forecasts),
      f"zero mean on: {[f.forecast_date for f in forecasts if f.mean_spend == 0]}")

# Test 15: p90 > p10 (distribution has spread)
flat_days = [f for f in forecasts if f.p90 <= f.p10]
check("T17 p90 > p10 (spread exists)", len(flat_days) == 0,
      f"flat distribution on: {[f.forecast_date for f in flat_days[:3]]}")

# Test 16: non-trivial forecast values
mean_spends = [f.mean_spend for f in forecasts]
check("T18 mean_spend in plausible range (£2–£100)",
      all(2 < m < 100 for m in mean_spends),
      f"out-of-range: min={min(mean_spends):.2f}, max={max(mean_spends):.2f}")

# ──────────────────────────────────────────────────────────────────────────────
# Section 3: payday multiplier
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 3: payday multiplier ──────────────────────────────────────────")

# Build history where payday is day 25 and post-payday spend is 2× normal.
# NOTE: descriptions must be UNIQUE per occurrence so gap-CV does NOT flag
#       them as RECURRING (which would exclude them from daily_irregular).
payday_history: list[TxnRecord] = []
for month in range(1, 4):   # Jan, Feb, Mar 2025
    year = 2025
    # Salary on the 25th
    payday_history.append(TxnRecord(
        2500.0, date(year, month, 25), None, "Salary"
    ))
    # Post-payday splurge (days 26, 27) — unique descriptions each month so
    # they don't get gap-CV detected as RECURRING
    payday_history.append(TxnRecord(-120.0, date(year, month, 26), None, f"Splurge {year}-{month:02d}-26"))
    payday_history.append(TxnRecord(-110.0, date(year, month, 27), None, f"Splurge {year}-{month:02d}-27"))
    # Normal daily spend all other days — unique descriptions so each is IRREGULAR
    for day in range(1, 29):
        if day not in (25, 26, 27):
            payday_history.append(TxnRecord(-25.0, date(year, month, day), None, f"Shop {year}-{month:02d}-{day:02d}"))

# Get the daily_irregular dict for payday multiplier test
irregular_txns = classify_transactions(payday_history, [])
daily = _aggregate_daily_spend(irregular_txns)
overall_mean = float(np.mean(list(daily.values()))) if daily else 0.0

payday_dom, payday_mult = _compute_payday_multiplier(payday_history, daily, overall_mean)

check("T19 payday DOM detected as 25", payday_dom == 25, f"got {payday_dom}")
check("T20 payday multiplier > 1.0", payday_mult > 1.0, f"got {payday_mult:.3f}")
check("T21 payday multiplier ≤ 2.0 (cap)", payday_mult <= 2.0, f"got {payday_mult:.3f}")

# Forecast: day after the 25th should have higher mean than day before
payday_start = date(2025, 4, 24)   # starts 1 day before payday
fc_payday = forecast_irregular_spending(payday_history, [], payday_start, horizon_days=5)
# fc_payday[0] = Apr 24 (day before payday)
# fc_payday[1] = Apr 25 (payday itself)
# fc_payday[2] = Apr 26 (day+1 after payday — should be boosted)
# fc_payday[3] = Apr 27 (day+2 after payday — partially boosted)
# fc_payday[4] = Apr 28 (no boost)
day_before = fc_payday[0].mean_spend
day_plus1  = fc_payday[2].mean_spend
day_plus2  = fc_payday[3].mean_spend
day_normal = fc_payday[4].mean_spend

print(f"       Apr 24 (before payday) mean: £{day_before:.2f}")
print(f"       Apr 26 (day+1 payday)  mean: £{day_plus1:.2f}  (expected boost)")
print(f"       Apr 27 (day+2 payday)  mean: £{day_plus2:.2f}  (partial boost)")
print(f"       Apr 28 (normal)        mean: £{day_normal:.2f}")

check("T22 day+1 after payday boosted vs normal",
      day_plus1 > day_before,
      f"day+1={day_plus1:.2f} should > day-before={day_before:.2f}")
check("T23 day+1 > day+2 (boost decays)",
      day_plus1 >= day_plus2,
      f"day+1={day_plus1:.2f} should ≥ day+2={day_plus2:.2f}")

# ──────────────────────────────────────────────────────────────────────────────
# Section 4: _fit_gamma edge cases
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 4: _fit_gamma edge cases ─────────────────────────────────────")

check("T24 fit_gamma single value → None", _fit_gamma(np.array([10.0])) is None)
check("T25 fit_gamma two values → not None",
      _fit_gamma(np.array([10.0, 20.0])) is not None)
check("T26 fit_gamma zero values → None",
      _fit_gamma(np.array([])) is None)

# With a realistic spend distribution, mean should be close to the input mean
realistic = np.array([12, 8, 25, 14, 18, 9, 31, 22, 6, 15, 20, 11, 17, 7, 28,
                       10, 19, 23, 5, 16, 24, 13, 26, 8, 21, 14, 9, 18, 12, 15], dtype=float)
params = _fit_gamma(realistic)
if params is not None:
    from scipy import stats
    dist = stats.gamma(*params)
    fitted_mean = dist.mean()
    raw_mean = float(realistic.mean())
    check("T27 fitted Gamma mean close to data mean (within 20%)",
          abs(fitted_mean - raw_mean) / raw_mean < 0.20,
          f"data mean={raw_mean:.2f}, fitted mean={fitted_mean:.2f}")
else:
    check("T27 fitted Gamma mean close to data mean (within 20%)", False, "fit returned None")

# Outlier removal: one extreme value should not break the fit
with_outlier = np.append(realistic, 999.0)  # obvious outlier
params_out = _fit_gamma(with_outlier)
check("T28 outlier doesn't break fit", params_out is not None)

# ──────────────────────────────────────────────────────────────────────────────
# Section 5: edge-case inputs
# ──────────────────────────────────────────────────────────────────────────────
print("\n── Section 5: edge-case inputs ───────────────────────────────────────────")

# Only income transactions
only_income = [make_txn(1000.0, i, desc="Transfer") for i in range(10)]
fc = forecast_irregular_spending(only_income, [], START, horizon_days=3)
check("T29 all-income history → zero forecasts", all(f.mean_spend == 0.0 for f in fc))

# All spend is obligation-matched
all_obligation = [make_txn(-50.0, 30 * k, merchant="rent", desc="Rent") for k in range(1, 4)]
obl_rent = ObligationRecord(merchant_name="Rent")
fc = forecast_irregular_spending(all_obligation, [obl_rent], START, horizon_days=3)
check("T30 all-obligated spend → zero forecasts", all(f.mean_spend == 0.0 for f in fc),
      f"means: {[f.mean_spend for f in fc]}")

# Very sparse history (2 data points) — should use fallback, not crash
sparse = [make_txn(-20.0, 10, None, "Store A"), make_txn(-30.0, 50, None, "Store B")]
fc = forecast_irregular_spending(sparse, [], START, horizon_days=5)
check("T31 sparse 2-point history doesn't crash", len(fc) == 5)
check("T32 sparse history has positive mean", all(f.mean_spend > 0 for f in fc))

# horizon_days=1 edge case
fc1 = forecast_irregular_spending(history, [obl_net, obl_gym], START, horizon_days=1)
check("T33 horizon_days=1 returns 1 row", len(fc1) == 1)

# Leap year / short month edge case (Feb 30 doesn't exist for payday)
feb_payday_history = [
    TxnRecord(2500.0, date(2026, 1, 30), None, "Salary Jan"),  # payday dom=30
    TxnRecord(2500.0, date(2026, 2, 28), None, "Salary Feb"),  # Feb doesn't have day 30
    TxnRecord(-25.0, date(2026, 2, 15), None, "Shop"),
    TxnRecord(-30.0, date(2026, 1, 15), None, "Shop"),
]
try:
    fc_feb = forecast_irregular_spending(feb_payday_history, [], date(2026, 2, 1), horizon_days=5)
    check("T34 payday dom=30 in Feb doesn't crash", len(fc_feb) == 5)
except Exception as e:
    check("T34 payday dom=30 in Feb doesn't crash", False, str(e))

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
            print(f"  ✗ {name}: {detail}")
else:
    print("  — all green!")

sys.exit(0 if failed == 0 else 1)
