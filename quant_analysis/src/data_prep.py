"""
data_prep.py — Data loading, sampling (50k rows), and proxy column mapping.

Loads from pre-serialized models/sample_data.joblib if available,
otherwise loads from CSV (slower, requires 166MB file).
"""

from pathlib import Path
import pandas as pd

DATA_PATH = Path(__file__).parent.parent / "data" / "application_train.csv"
MODELS_DIR = Path(__file__).parent.parent / "models"

FEATURE_COLUMNS = [
    "AMT_INCOME_TOTAL",
    "AMT_CREDIT",
    "DAYS_EMPLOYED",
    "EXT_SOURCE_2",
    "EXT_SOURCE_3",
    "REGION_RATING_CLIENT",
]

COLUMN_RENAME_MAP = {
    "AMT_INCOME_TOTAL": "annual_inflow",
    "AMT_CREDIT": "avg_monthly_balance",
    "DAYS_EMPLOYED": "days_since_account_open",
    "EXT_SOURCE_2": "primary_bank_health_score",
    "EXT_SOURCE_3": "secondary_bank_health_score",
    "REGION_RATING_CLIENT": "failed_payment_cluster_risk",
}

FEATURE_NAMES = list(COLUMN_RENAME_MAP.values())


def _load_sample() -> pd.DataFrame | None:
    """Load pre-serialized sample data if available."""
    sample_path = MODELS_DIR / "sample_data.joblib"
    if sample_path.exists():
        import joblib

        print(f"Loading sample data from {sample_path}")
        return joblib.load(sample_path)
    return None


def _load_from_csv() -> pd.DataFrame:
    """Load and process from the full CSV — fallback path."""
    print(f"Loading from CSV: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)

    df = df.sample(n=min(50_000, len(df)), random_state=42).reset_index(drop=True)

    cols = ["TARGET"] + FEATURE_COLUMNS
    df = df[cols].copy()

    # DAYS_EMPLOYED is negative in raw data — convert to positive
    df["DAYS_EMPLOYED"] = df["DAYS_EMPLOYED"].abs()

    df.rename(columns=COLUMN_RENAME_MAP, inplace=True)

    # Median imputation for all feature columns
    for col in FEATURE_NAMES:
        if df[col].isna().any():
            df[col].fillna(df[col].median(), inplace=True)

    return df


def load_data() -> pd.DataFrame:
    """
    Load dataset — uses pre-serialized sample if available, otherwise CSV.
    """
    sample = _load_sample()
    if sample is not None:
        return sample
    return _load_from_csv()
