"""
simulation.py — Monte Carlo simulation of the Flowzo retail lender pool.
"""

import random
from typing import TypedDict

RISK_APPETITES = ["Conservative", "Balanced", "Aggressive"]
# Weighted distribution: most retail users are Balanced
_WEIGHTS = [0.35, 0.45, 0.20]

# Yield rates (annual %) per appetite tier
_YIELD_MAP = {
    "Conservative": (3.0, 5.5),
    "Balanced": (5.5, 9.0),
    "Aggressive": (9.0, 15.0),
}

# Pot size ranges (£) per tier
_POT_SIZE_MAP = {
    "Conservative": (500, 5_000),
    "Balanced": (1_000, 15_000),
    "Aggressive": (2_000, 30_000),
}


class Lender(TypedDict):
    lender_id: int
    risk_appetite: str
    pot_size_gbp: float
    target_yield_pct: float


def simulate_lender_pool(n: int = 1_000, seed: int = 42) -> list[Lender]:
    """
    Generate a synthetic pool of ``n`` retail lenders.

    Each lender has:
    - ``lender_id``        — unique integer
    - ``risk_appetite``    — Conservative / Balanced / Aggressive
    - ``pot_size_gbp``     — amount allocated to the lending pot (£)
    - ``target_yield_pct`` — desired annual return (%)
    """
    rng = random.Random(seed)

    pool: list[Lender] = []
    for i in range(1, n + 1):
        appetite = rng.choices(RISK_APPETITES, weights=_WEIGHTS, k=1)[0]

        lo_yield, hi_yield = _YIELD_MAP[appetite]
        lo_pot, hi_pot = _POT_SIZE_MAP[appetite]

        lender: Lender = {
            "lender_id": i,
            "risk_appetite": appetite,
            "pot_size_gbp": round(rng.uniform(lo_pot, hi_pot), 2),
            "target_yield_pct": round(rng.uniform(lo_yield, hi_yield), 2),
        }
        pool.append(lender)

    return pool
