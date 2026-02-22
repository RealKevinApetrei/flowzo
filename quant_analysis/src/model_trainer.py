"""
model_trainer.py — Train XGBoost classifier and expose Probability of Default (PD).

Loads a pre-trained model from models/xgboost_model.joblib if available,
otherwise trains from CSV (slower, ~30s).
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from .data_prep import FEATURE_NAMES, load_data

_model: XGBClassifier | None = None

MODELS_DIR = Path(__file__).parent.parent / "models"


def _load_pretrained() -> XGBClassifier | None:
    """Load pre-trained model from joblib if available."""
    model_path = MODELS_DIR / "xgboost_model.joblib"
    if model_path.exists():
        print(f"Loading pre-trained model from {model_path}")
        return joblib.load(model_path)
    return None


def _train_model() -> XGBClassifier:
    """Train from CSV — fallback when no pre-trained model exists. Saves model on completion."""
    print("No pre-trained model found, training from CSV...")
    df = load_data()
    X = df[FEATURE_NAMES]
    y = df["TARGET"]

    X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Save immediately so the next process load skips retraining
    MODELS_DIR.mkdir(exist_ok=True)
    model_path = MODELS_DIR / "xgboost_model.joblib"
    joblib.dump(model, model_path, compress=3)
    print(f"Model saved to {model_path}")

    return model


def get_model() -> XGBClassifier:
    """Return the singleton model — loads pre-trained if available, else trains."""
    global _model
    if _model is None:
        pretrained = _load_pretrained()
        _model = pretrained if pretrained is not None else _train_model()
    return _model


def get_pd(features: list[float] | np.ndarray | pd.DataFrame) -> float:
    """
    Return the Probability of Default (PD) for a single borrower.

    Parameters
    ----------
    features : array-like of shape (n_features,) or (1, n_features)
        Values ordered as: annual_inflow, avg_monthly_balance,
        days_since_account_open, primary_bank_health_score,
        secondary_bank_health_score, failed_payment_cluster_risk
    """
    model = get_model()

    if isinstance(features, pd.DataFrame):
        arr = features[FEATURE_NAMES].values
    else:
        arr = np.array(features, dtype=float).reshape(1, -1)

    proba = model.predict_proba(arr)
    return float(proba[0, 1])
