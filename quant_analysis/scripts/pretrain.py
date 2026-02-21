"""
Pre-train the XGBoost model and serialize artifacts for production deployment.

Run from quant_analysis/ directory:
    python scripts/pretrain.py

Outputs:
    models/xgboost_model.joblib  — trained XGBoost classifier
    models/sample_data.joblib    — 5,000-row sample for analytics endpoints
    models/metadata.json         — training metadata
"""

import json
import sys
import time
from pathlib import Path

# Add parent directory to path for src imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
from src.data_prep import FEATURE_NAMES, load_data
from src.model_trainer import get_model

MODELS_DIR = Path(__file__).parent.parent / "models"


def main():
    MODELS_DIR.mkdir(exist_ok=True)

    print("Step 1/3: Loading and preparing data...")
    start = time.time()
    df = load_data()
    data_time = time.time() - start
    print(f"  Loaded {len(df)} rows in {data_time:.1f}s")

    print("Step 2/3: Training XGBoost model...")
    start = time.time()
    model = get_model()
    train_time = time.time() - start
    print(f"  Model trained in {train_time:.1f}s")

    print("Step 3/3: Saving artifacts...")

    # Save model
    model_path = MODELS_DIR / "xgboost_model.joblib"
    joblib.dump(model, model_path, compress=3)
    model_size = model_path.stat().st_size / (1024 * 1024)
    print(f"  Model saved: {model_path} ({model_size:.1f} MB)")

    # Save sample data for analytics endpoints
    sample = df.sample(n=min(5_000, len(df)), random_state=42).reset_index(drop=True)
    sample_path = MODELS_DIR / "sample_data.joblib"
    joblib.dump(sample, sample_path, compress=3)
    sample_size = sample_path.stat().st_size / (1024 * 1024)
    print(f"  Sample data saved: {sample_path} ({sample_size:.1f} MB)")

    # Save metadata
    metadata = {
        "feature_names": FEATURE_NAMES,
        "training_rows": len(df),
        "sample_rows": len(sample),
        "model_type": "XGBClassifier",
        "n_estimators": 200,
        "max_depth": 4,
        "random_state": 42,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    metadata_path = MODELS_DIR / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2))
    print(f"  Metadata saved: {metadata_path}")

    print(f"\nDone! Total artifacts: {model_size + sample_size:.1f} MB")
    print(f"Startup will now load in ~1s instead of ~{data_time + train_time:.0f}s")


if __name__ == "__main__":
    main()
