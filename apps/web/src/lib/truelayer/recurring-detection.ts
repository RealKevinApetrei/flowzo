/**
 * Recurring payment detection algorithm.
 *
 * Clusters transactions by merchant name, analyzes frequency and amount
 * consistency, and scores confidence to identify bill obligations.
 */

interface TransactionRecord {
  merchant_name: string | null;
  description: string;
  amount_pence: number;
  timestamp: string;
}

interface DetectedObligation {
  name: string;
  merchant_name: string;
  amount_pence: number;
  frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
  confidence: number; // 0-1
  next_expected_date: string;
  last_seen_date: string;
}

/** Cluster transactions by merchant, returning groups with 2+ occurrences */
function clusterByMerchant(txns: TransactionRecord[]): Map<string, TransactionRecord[]> {
  const groups = new Map<string, TransactionRecord[]>();

  for (const txn of txns) {
    const key = txn.merchant_name ?? txn.description.slice(0, 30).toLowerCase().trim();
    if (!key) continue;

    const existing = groups.get(key) ?? [];
    existing.push(txn);
    groups.set(key, existing);
  }

  // Only return groups with at least 2 transactions (potential recurring)
  const recurring = new Map<string, TransactionRecord[]>();
  for (const [key, group] of groups) {
    if (group.length >= 2) {
      recurring.set(key, group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    }
  }

  return recurring;
}

/** Detect frequency from inter-payment gaps (in days) */
function detectFrequency(gaps: number[]): {
  frequency: DetectedObligation["frequency"];
  confidence: number;
} {
  if (gaps.length === 0) return { frequency: "monthly", confidence: 0 };

  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  const stdDev = Math.sqrt(
    gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length,
  );

  // Coefficient of variation (lower = more regular)
  const cv = avgGap > 0 ? stdDev / avgGap : 1;
  const regularityScore = Math.max(0, 1 - cv);

  let frequency: DetectedObligation["frequency"];
  if (avgGap <= 10) frequency = "weekly";
  else if (avgGap <= 21) frequency = "fortnightly";
  else if (avgGap <= 45) frequency = "monthly";
  else if (avgGap <= 120) frequency = "quarterly";
  else frequency = "yearly";

  return { frequency, confidence: regularityScore };
}

/** Score amount consistency (how stable are the payment amounts) */
function scoreAmountConsistency(amounts: number[]): number {
  if (amounts.length <= 1) return 1;

  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  if (avg === 0) return 0;

  const maxDeviation = Math.max(...amounts.map((a) => Math.abs(a - avg)));
  const deviationRatio = maxDeviation / Math.abs(avg);

  // Allow up to 10% variation before penalizing
  return Math.max(0, 1 - Math.max(0, deviationRatio - 0.1) * 2);
}

/** Add days to a date string, returning ISO string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

const FREQUENCY_DAYS: Record<DetectedObligation["frequency"], number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

/**
 * Detect recurring obligations from transaction history.
 *
 * Only returns obligations with confidence >= 0.5 and negative amounts (outgoing payments).
 */
export function detectRecurringObligations(
  transactions: TransactionRecord[],
): DetectedObligation[] {
  // Only look at outgoing payments (negative amounts)
  const outgoing = transactions.filter((t) => t.amount_pence < 0);
  const clusters = clusterByMerchant(outgoing);
  const obligations: DetectedObligation[] = [];

  for (const [merchantKey, txns] of clusters) {
    if (txns.length < 2) continue;

    // Calculate inter-payment gaps in days
    const gaps: number[] = [];
    for (let i = 1; i < txns.length; i++) {
      const prev = new Date(txns[i - 1]!.timestamp).getTime();
      const curr = new Date(txns[i]!.timestamp).getTime();
      gaps.push((curr - prev) / (1000 * 60 * 60 * 24));
    }

    const { frequency, confidence: freqConfidence } = detectFrequency(gaps);
    const amounts = txns.map((t) => Math.abs(t.amount_pence));
    const amountConfidence = scoreAmountConsistency(amounts);

    // Combined confidence: frequency regularity * amount consistency * count bonus
    const countBonus = Math.min(1, txns.length / 4); // Bonus for more data points
    const confidence = freqConfidence * 0.5 + amountConfidence * 0.3 + countBonus * 0.2;

    if (confidence < 0.5) continue;

    const lastTxn = txns[txns.length - 1]!;
    const avgAmount = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length);

    obligations.push({
      name: merchantKey,
      merchant_name: lastTxn.merchant_name ?? merchantKey,
      amount_pence: avgAmount,
      frequency,
      confidence,
      next_expected_date: addDays(lastTxn.timestamp, FREQUENCY_DAYS[frequency]),
      last_seen_date: lastTxn.timestamp.split("T")[0]!,
    });
  }

  return obligations.sort((a, b) => b.confidence - a.confidence);
}

export type { DetectedObligation, TransactionRecord };
