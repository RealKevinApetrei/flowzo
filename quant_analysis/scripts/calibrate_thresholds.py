"""
calibrate_thresholds.py — Compute data-driven score thresholds from the
pre-trained model and sample data.

Run from quant_analysis/ directory:
    python scripts/calibrate_thresholds.py

Prints the recommended A/B/C threshold values for scorecard.py.
Does NOT modify any files.
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data_prep import FEATURE_NAMES, load_data
from src.model_trainer import get_model
from src.scorecard import pd_to_score


def main():
    print("Loading model and sample data...")
    model = get_model()
    df = load_data()
    sample = df.sample(n=min(5_000, len(df)), random_state=1).reset_index(drop=True)

    X = sample[FEATURE_NAMES].values
    proba = model.predict_proba(X)
    pds = proba[:, 1]
    scores = np.array([pd_to_score(float(p)) for p in pds])

    print(f"\nPD statistics (n={len(pds):,}):")
    print(f"  mean:   {pds.mean()*100:.2f}%")
    print(f"  median: {np.median(pds)*100:.2f}%")
    print(f"  p10:    {np.percentile(pds, 10)*100:.2f}%")
    print(f"  p90:    {np.percentile(pds, 90)*100:.2f}%")

    print(f"\nScore distribution (n={len(scores):,}):")
    for p in [10, 25, 40, 50, 60, 75, 80, 90, 95]:
        print(f"  p{p:2d}: {np.percentile(scores, p):.1f}")

    # Thresholds: top 20% → A, next 35% → B, bottom 45% → C
    a_thresh = float(np.percentile(scores, 80))
    b_thresh = float(np.percentile(scores, 45))

    print(f"\nRecommended thresholds (20% A / 35% B / 45% C):")
    print(f"  A >= {a_thresh:.1f}")
    print(f"  B >= {b_thresh:.1f}")
    print(f"  C <  {b_thresh:.1f}")

    n_a = (scores >= a_thresh).sum()
    n_b = ((scores >= b_thresh) & (scores < a_thresh)).sum()
    n_c = (scores < b_thresh).sum()
    print(f"\nValidation split: A={n_a} ({n_a/len(scores)*100:.0f}%), "
          f"B={n_b} ({n_b/len(scores)*100:.0f}%), "
          f"C={n_c} ({n_c/len(scores)*100:.0f}%)")

    targets = sample["TARGET"].values
    print("\nDefault rates by grade:")
    for label, mask in [
        ("A", scores >= a_thresh),
        ("B", (scores >= b_thresh) & (scores < a_thresh)),
        ("C", scores < b_thresh),
    ]:
        if mask.sum() > 0:
            dr = targets[mask].mean()
            print(f"  Grade {label}: n={mask.sum():,}, default_rate={dr*100:.1f}%")

    print(f"\n>>> Copy these into scorecard.py get_risk_grade():")
    print(f"    A >= {a_thresh:.0f}")
    print(f"    B >= {b_thresh:.0f}")


if __name__ == "__main__":
    main()
