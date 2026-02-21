"""
data_prep.py — Data loading, sampling (50k rows), and proxy column mapping.
"""

from pathlib import Path
import pandas as pd

DATA_PATH = Path(__file__).parent.parent / "data" / "application_train.csv"

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


def load_data() -> pd.DataFrame:
    """
    Load application_train.csv, sample to 50k rows, extract and rename
    Open Banking proxy features, impute missing values with column medians,
    and return the cleaned DataFrame.
    """
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
