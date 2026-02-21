"""
scorecard.py — Convert Probability of Default (PD) to a 300-850 credit score.

Scorecard anchors
-----------------
Target Score (θ)  = 600
Target Odds (Ω)   = 50   (good:bad ratio at the target score)
Points to Double Odds (PDO) = 20

Derivation
----------
Factor = PDO / ln(2)
Offset = θ - Factor × ln(Ω)
Score  = Offset + Factor × ln(Odds)
       where Odds = (1 - PD) / PD
"""

import math

# Scorecard anchor constants
_TARGET_SCORE = 600.0
_TARGET_ODDS = 50.0
_PDO = 20.0

_FACTOR = _PDO / math.log(2)
_OFFSET = _TARGET_SCORE - _FACTOR * math.log(_TARGET_ODDS)

_SCORE_MIN = 300.0
_SCORE_MAX = 850.0


def pd_to_score(pd_value: float) -> float:
    """
    Convert a Probability of Default to a 300–850 credit score.

    Higher score → lower risk → lower PD.
    """
    pd_value = max(1e-6, min(1 - 1e-6, pd_value))  # guard log domain

    odds = (1.0 - pd_value) / pd_value
    raw_score = _OFFSET + _FACTOR * math.log(odds)

    return float(max(_SCORE_MIN, min(_SCORE_MAX, raw_score)))


def get_risk_grade(score: float) -> str:
    """Return risk grade A (best), B (mid), or C (worst) for a credit score."""
    if score > 700:
        return "A"
    if score >= 600:
        return "B"
    return "C"
