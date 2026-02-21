"""
explainability.py — SHAP value generation for waterfall chart data.
"""

import numpy as np
import pandas as pd
import shap

from .data_prep import FEATURE_NAMES
from .model_trainer import get_model

_explainer: shap.TreeExplainer | None = None


def _get_explainer() -> shap.TreeExplainer:
    global _explainer
    if _explainer is None:
        model = get_model()
        _explainer = shap.TreeExplainer(model)
    return _explainer


def get_shap_explanation(features: list[float] | np.ndarray) -> dict:
    """
    Compute SHAP values for a single borrower and return the top 3 positive
    and top 3 negative contributors as a JSON-serialisable dict.

    Parameters
    ----------
    features : array-like of length 6
        Ordered: annual_inflow, avg_monthly_balance, days_since_account_open,
        primary_bank_health_score, secondary_bank_health_score,
        failed_payment_cluster_risk

    Returns
    -------
    {
        "positive": [{"feature": str, "shap_value": float}, ...],  # top 3, highest +
        "negative": [{"feature": str, "shap_value": float}, ...],  # top 3, most negative
        "base_value": float,
    }
    """
    arr = np.array(features, dtype=float).reshape(1, -1)
    df_row = pd.DataFrame(arr, columns=FEATURE_NAMES)

    explainer = _get_explainer()
    shap_values = explainer.shap_values(df_row)

    # XGBoost binary: shap_values is shape (1, n_features) for class 1
    if isinstance(shap_values, list):
        vals = shap_values[1][0]
    else:
        vals = shap_values[0]

    paired = list(zip(FEATURE_NAMES, vals.tolist()))

    positive = sorted(
        [p for p in paired if p[1] > 0], key=lambda x: x[1], reverse=True
    )[:3]
    negative = sorted(
        [p for p in paired if p[1] < 0], key=lambda x: x[1]
    )[:3]

    base_value = float(explainer.expected_value)
    if isinstance(explainer.expected_value, (list, np.ndarray)):
        base_value = float(explainer.expected_value[1])

    return {
        "base_value": base_value,
        "positive": [{"feature": f, "shap_value": round(v, 6)} for f, v in positive],
        "negative": [{"feature": f, "shap_value": round(v, 6)} for f, v in negative],
    }
