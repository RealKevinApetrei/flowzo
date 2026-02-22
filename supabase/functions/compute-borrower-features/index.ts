import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Feature derivation helpers
// ---------------------------------------------------------------------------

/** Standard deviation of an array of numbers. */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/** Coefficient of variation (stddev / |mean|). Returns Infinity if mean is 0. */
function cv(values: number[]): number {
  if (values.length < 2) return Infinity;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return Infinity;
  return stddev(values) / Math.abs(mean);
}

/**
 * Group positive transactions by calendar month and return monthly totals.
 * Used for income regularity calculation.
 */
function monthlyInflows(
  txns: { amount: number; booked_at: string }[],
): number[] {
  const months = new Map<string, number>();
  for (const tx of txns) {
    if (tx.amount <= 0) continue;
    const date = new Date(tx.booked_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) ?? 0) + tx.amount);
  }
  return [...months.values()];
}

/**
 * Count failed/bounced/returned transactions.
 * These typically have keywords in the description.
 */
const FAILED_KEYWORDS = ["failed", "rejected", "returned", "bounced", "unpaid", "nsf", "insufficient"];

function countFailedPayments(
  txns: { description?: string | null; category?: string | null }[],
): number {
  let count = 0;
  for (const tx of txns) {
    const desc = ((tx.description ?? "") + " " + (tx.category ?? "")).toLowerCase();
    if (FAILED_KEYWORDS.some((kw) => desc.includes(kw))) {
      count++;
    }
  }
  return count;
}

/**
 * Bucket failed payment count into 1-3 risk rating.
 * 0 failures → 1.0 (low risk), 1-2 → 2.0 (medium), 3+ → 3.0 (high).
 */
function failedPaymentRisk(failedCount: number): number {
  if (failedCount === 0) return 1.0;
  if (failedCount <= 2) return 2.0;
  return 3.0;
}

// ---------------------------------------------------------------------------
// BorrowerFeatures interface (matches Quant API's BorrowerFeatures schema)
// ---------------------------------------------------------------------------

interface BorrowerFeatures {
  annual_inflow: number;
  avg_monthly_balance: number;
  days_since_account_open: number;
  primary_bank_health_score: number;
  secondary_bank_health_score: number;
  failed_payment_cluster_risk: number;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch accounts — for balance data --------------------------------
    const { data: accounts, error: acctErr } = await supabase
      .from("accounts")
      .select("balance_current, balance_available, created_at")
      .eq("user_id", user_id);

    if (acctErr) {
      throw new Error(`Failed to fetch accounts: ${acctErr.message}`);
    }

    // 2. Fetch transactions (last 90 days) --------------------------------
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: txns, error: txnErr } = await supabase
      .from("transactions")
      .select("amount, booked_at, description, category")
      .eq("user_id", user_id)
      .gte("booked_at", ninetyDaysAgo.toISOString())
      .order("booked_at", { ascending: true });

    if (txnErr) {
      throw new Error(`Failed to fetch transactions: ${txnErr.message}`);
    }

    // 3. Fetch bank connection — for account age --------------------------
    const { data: bankConn, error: connErr } = await supabase
      .from("bank_connections")
      .select("created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (connErr) {
      // Not fatal — use a default
      console.warn("No bank connection found, using default days_since_account_open");
    }

    // =====================================================================
    // FEATURE DERIVATION
    // =====================================================================

    const allTxns = txns ?? [];
    const allAccounts = accounts ?? [];

    // --- annual_inflow: sum of positive txns in 90d, annualized (×4) ---
    const positiveSum = allTxns
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const annual_inflow = Math.round(positiveSum * 4 * 100) / 100;

    // --- avg_monthly_balance: mean of current balances across accounts ---
    const balances = allAccounts.map((a) => Number(a.balance_current ?? 0));
    const avg_monthly_balance = balances.length > 0
      ? Math.round((balances.reduce((a, b) => a + b, 0) / balances.length) * 100) / 100
      : 0;

    // --- days_since_account_open: from oldest bank connection ---
    const connCreatedAt = bankConn?.created_at
      ? new Date(bankConn.created_at)
      : new Date(); // fallback: today (0 days)
    const days_since_account_open = Math.max(
      1,
      Math.round((Date.now() - connCreatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // --- primary_bank_health_score: income regularity (0-1) ---
    // 1 - CV of monthly inflows. Higher = more regular income.
    const monthlyIncomes = monthlyInflows(
      allTxns.map((t) => ({ amount: Number(t.amount), booked_at: t.booked_at as string })),
    );
    const incomeCV = monthlyIncomes.length >= 2 ? cv(monthlyIncomes) : 1.0;
    const primary_bank_health_score = Math.round(
      Math.max(0, Math.min(1, 1 - incomeCV)) * 1000,
    ) / 1000;

    // --- secondary_bank_health_score: balance stability (0-1) ---
    // Approximate daily balances from transaction running total.
    // Higher = more stable balance.
    const outgoings = allTxns.map((t) => Number(t.amount));
    const balanceVolatility = outgoings.length >= 2
      ? stddev(outgoings) / (Math.abs(outgoings.reduce((a, b) => a + b, 0) / outgoings.length) || 1)
      : 1.0;
    const secondary_bank_health_score = Math.round(
      Math.max(0, Math.min(1, 1 - balanceVolatility * 0.3)) * 1000,
    ) / 1000;

    // --- failed_payment_cluster_risk: 1-3 risk bucket ---
    const failedCount = countFailedPayments(
      allTxns.map((t) => ({
        description: t.description as string | null,
        category: t.category as string | null,
      })),
    );
    const failed_payment_cluster_risk = failedPaymentRisk(failedCount);

    const features: BorrowerFeatures = {
      annual_inflow,
      avg_monthly_balance,
      days_since_account_open,
      primary_bank_health_score,
      secondary_bank_health_score,
      failed_payment_cluster_risk,
    };

    // =====================================================================
    // OPTIONAL: Call Quant API for ML scoring
    // =====================================================================

    const QUANT_API_URL = Deno.env.get("QUANT_API_URL") ?? "";
    let mlScore: { credit_score: number; probability_of_default: number; risk_grade: string } | null = null;

    if (QUANT_API_URL) {
      try {
        const scoreRes = await fetch(`${QUANT_API_URL}/api/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(features),
        });

        if (scoreRes.ok) {
          mlScore = await scoreRes.json();

          // Update profile with risk grade + credit limits + eligibility
          if (mlScore?.risk_grade) {
            const creditLimits: Record<string, { max_trade_amount: number; max_active_trades: number }> = {
              A: { max_trade_amount: 500, max_active_trades: 5 },
              B: { max_trade_amount: 200, max_active_trades: 3 },
              C: { max_trade_amount: 75, max_active_trades: 1 },
            };
            const limits = creditLimits[mlScore.risk_grade] ?? { max_trade_amount: 0, max_active_trades: 0 };
            const isEligible = (mlScore.credit_score ?? 0) >= 500;

            // Scale credit limit by income regularity (inflow confidence)
            const inflowConfidence = Math.max(0.5, primary_bank_health_score);
            const adjustedLimit = Math.round(limits.max_trade_amount * inflowConfidence);

            const { error: profileErr } = await supabase
              .from("profiles")
              .update({
                risk_grade: mlScore.risk_grade,
                credit_score: mlScore.credit_score,
                max_trade_amount: adjustedLimit,
                max_active_trades: limits.max_active_trades,
                eligible_to_borrow: isEligible,
                last_scored_at: new Date().toISOString(),
              })
              .eq("id", user_id);

            if (profileErr) {
              console.error("Failed to update profile credit data:", profileErr);
            }
          }

          // Log scoring event for audit trail
          await supabase.from("flowzo_events").insert({
            event_type: "borrower.scored",
            entity_type: "profile",
            entity_id: user_id,
            actor: "system",
            payload: {
              credit_score: mlScore?.credit_score,
              probability_of_default: mlScore?.probability_of_default,
              risk_grade: mlScore?.risk_grade,
              model_version: "xgboost_v1",
              features,
            },
          });
        } else {
          console.warn(`Quant API returned ${scoreRes.status}, falling back to heuristic`);
        }
      } catch (err) {
        console.warn("Quant API unavailable, using heuristic scoring:", err);
      }
    }

    // =====================================================================
    // FALLBACK: Heuristic scoring if Quant API unavailable
    // =====================================================================

    if (!mlScore) {
      // Use the DB function calculate_risk_grade for heuristic fallback
      const { data: riskResult } = await supabase.rpc("calculate_risk_grade", {
        p_income_regularity: primary_bank_health_score,
        p_min_monthly_balance: avg_monthly_balance,
        p_failed_payment_count: failedCount,
        p_bill_concentration: 0.5, // default — would need obligation data for real calc
        p_balance_volatility: balanceVolatility > 1 ? 1 : balanceVolatility,
      });

      if (riskResult) {
        const heuristic = riskResult as { score: number; grade: string };
        mlScore = {
          credit_score: heuristic.score * 10, // rough 0-100 → 0-1000 mapping
          probability_of_default: 0, // not computed in heuristic
          risk_grade: heuristic.grade,
        };

        // Update profile with heuristic grade + credit limits
        const heuristicLimits: Record<string, { max_trade_amount: number; max_active_trades: number }> = {
          A: { max_trade_amount: 500, max_active_trades: 5 },
          B: { max_trade_amount: 200, max_active_trades: 3 },
          C: { max_trade_amount: 75, max_active_trades: 1 },
        };
        const hLimits = heuristicLimits[heuristic.grade] ?? { max_trade_amount: 0, max_active_trades: 0 };
        const hScore = mlScore?.credit_score ?? heuristic.score * 10;

        await supabase
          .from("profiles")
          .update({
            risk_grade: heuristic.grade,
            credit_score: hScore,
            max_trade_amount: hLimits.max_trade_amount,
            max_active_trades: hLimits.max_active_trades,
            eligible_to_borrow: hScore >= 500,
            last_scored_at: new Date().toISOString(),
          })
          .eq("id", user_id);
      }
    }

    // =====================================================================
    // Response
    // =====================================================================

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        features,
        scoring: mlScore
          ? {
              source: QUANT_API_URL ? "quant_api" : "heuristic",
              credit_score: mlScore.credit_score,
              probability_of_default: mlScore.probability_of_default,
              risk_grade: mlScore.risk_grade,
            }
          : null,
        metadata: {
          transactions_analyzed: allTxns.length,
          accounts_count: allAccounts.length,
          failed_payments_detected: failedCount,
          monthly_income_samples: monthlyIncomes.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("compute-borrower-features error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
