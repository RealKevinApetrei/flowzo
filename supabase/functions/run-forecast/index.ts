import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Check if a given date matches an obligation's schedule.
 * Returns true if the obligation is due on this date.
 */
function isObligationDueOn(
  obl: Record<string, unknown>,
  date: Date,
): boolean {
  // If we have a next_expected date, check if it matches
  if (obl.next_expected) {
    const nextExpected = new Date(obl.next_expected as string);
    if (isoDate(nextExpected) === isoDate(date)) return true;
  }

  const day = date.getDate();
  const expectedDay = obl.expected_day as number;

  switch (obl.frequency as string) {
    case "WEEKLY": {
      // Check if same day-of-week as expected
      if (obl.next_expected) {
        const nextExp = new Date(obl.next_expected as string);
        return date.getDay() === nextExp.getDay();
      }
      return day === expectedDay;
    }
    case "FORTNIGHTLY": {
      if (obl.next_expected) {
        const nextExp = new Date(obl.next_expected as string);
        const diffDays = Math.round(
          (date.getTime() - nextExp.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diffDays >= 0 && diffDays % 14 === 0;
      }
      return day === expectedDay;
    }
    case "MONTHLY":
      return day === expectedDay;
    case "QUARTERLY": {
      if (obl.next_expected) {
        const nextExp = new Date(obl.next_expected as string);
        return (
          day === nextExp.getDate() &&
          (date.getMonth() - nextExp.getMonth()) % 3 === 0
        );
      }
      return day === expectedDay;
    }
    default:
      return day === expectedDay;
  }
}

/** Estimate average daily income from positive recurring transactions. */
function estimateDailyIncome(
  transactions: Record<string, unknown>[],
): number {
  if (!transactions || transactions.length === 0) return 0;

  const positiveTxns = transactions.filter(
    (t) => Number(t.amount) > 0,
  );
  if (positiveTxns.length === 0) return 0;

  const totalIncome = positiveTxns.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );

  // Find the date range of transactions
  const dates = positiveTxns.map((t) =>
    new Date(t.booked_at as string).getTime()
  );
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const spanDays = Math.max(
    1,
    Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)),
  );

  return totalIncome / spanDays;
}

// Overdraft buffer: GBP 100
const OVERDRAFT_BUFFER = 100.0;
const FORECAST_DAYS = 30;

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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch accounts and current total balance -----------------------
    const { data: accounts, error: acctErr } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user_id);

    if (acctErr) {
      throw new Error(`Failed to fetch accounts: ${acctErr.message}`);
    }

    const currentBalance = (accounts ?? []).reduce(
      (sum, a) => sum + Number(a.balance_current ?? 0),
      0,
    );

    // 2. Fetch active obligations ---------------------------------------
    const { data: obligations, error: oblErr } = await supabase
      .from("obligations")
      .select("*")
      .eq("user_id", user_id)
      .eq("active", true);

    if (oblErr) {
      throw new Error(`Failed to fetch obligations: ${oblErr.message}`);
    }

    // 3. Fetch recent transactions for income estimation ----------------
    const ninetyDaysAgo = addDays(new Date(), -90);
    const { data: recentTxns } = await supabase
      .from("transactions")
      .select("amount, booked_at")
      .eq("user_id", user_id)
      .gte("booked_at", ninetyDaysAgo.toISOString())
      .order("booked_at", { ascending: true });

    const dailyIncome = estimateDailyIncome(recentTxns ?? []);

    // 4. Generate a run_id (forecast snapshot) --------------------------
    const { data: snapshot, error: snapErr } = await supabase
      .from("forecast_snapshots")
      .insert({
        user_id,
        starting_balance: Math.round(currentBalance * 100) / 100,
        obligations_count: (obligations ?? []).length,
        danger_days_count: 0, // updated later
        model_version: "v1_heuristic",
      })
      .select("id")
      .single();

    if (snapErr || !snapshot) {
      throw new Error(
        `Failed to create forecast snapshot: ${snapErr?.message}`,
      );
    }

    const runId = snapshot.id;

    // 5. Build daily forecast -------------------------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let runningBalance = currentBalance;
    let dangerDaysCount = 0;
    let minimumProjectedBalance = currentBalance;
    const forecastRows: Record<string, unknown>[] = [];

    for (let dayOffset = 0; dayOffset < FORECAST_DAYS; dayOffset++) {
      const forecastDate = addDays(today, dayOffset);

      // Outgoings: obligations due on this day
      let dailyOutgoings = 0;
      for (const obl of obligations ?? []) {
        if (isObligationDueOn(obl, forecastDate)) {
          dailyOutgoings += Number(obl.amount);
        }
      }

      // Income estimate for the day
      const incomeExpected =
        Math.round(dailyIncome * 100) / 100;

      // Update running balance
      runningBalance =
        runningBalance - dailyOutgoings + incomeExpected;

      // Track the deepest trough for loan recommendation
      if (runningBalance < minimumProjectedBalance) {
        minimumProjectedBalance = runningBalance;
      }

      // Confidence bands — absolute uncertainty that grows with time
      // Near term (0-13 days): ±£3/day; further out (14-29 days): ±£6/day
      const absoluteUncertainty = dayOffset < 14 ? dayOffset * 3 : dayOffset * 6;
      const confidenceLow =
        Math.round((runningBalance - absoluteUncertainty) * 100) / 100;
      const confidenceHigh =
        Math.round((runningBalance + absoluteUncertainty) * 100) / 100;

      // Danger flag: balance below 0 or below overdraft buffer
      const isDanger = runningBalance < OVERDRAFT_BUFFER;
      if (isDanger) dangerDaysCount++;

      forecastRows.push({
        user_id,
        forecast_date: isoDate(forecastDate),
        projected_balance: Math.round(runningBalance * 100) / 100,
        confidence_low: confidenceLow,
        confidence_high: confidenceHigh,
        danger_flag: isDanger,
        income_expected: incomeExpected,
        outgoings_expected:
          Math.round(dailyOutgoings * 100) / 100,
        run_id: runId,
      });
    }

    // 5b. Calculate recommended loan amount ------------------------------
    const recommendedLoanAmount =
      minimumProjectedBalance < OVERDRAFT_BUFFER
        ? Math.ceil(OVERDRAFT_BUFFER - minimumProjectedBalance)
        : 0;

    // 6. Store forecast rows --------------------------------------------
    // Delete previous forecasts for this user first
    const { error: deleteErr } = await supabase
      .from("forecasts")
      .delete()
      .eq("user_id", user_id)
      .neq("run_id", runId);

    if (deleteErr) {
      console.error("Failed to delete old forecasts:", deleteErr);
      // Continue — stale forecasts are better than no forecasts
    }

    if (forecastRows.length > 0) {
      const { error: fcErr } = await supabase
        .from("forecasts")
        .upsert(forecastRows, {
          onConflict: "user_id,forecast_date,run_id",
        });

      if (fcErr) {
        console.error("Forecast upsert error:", fcErr);
        throw new Error(`Forecast upsert failed: ${fcErr.message}`);
      }
    }

    // 7. Update snapshot danger count -----------------------------------
    await supabase
      .from("forecast_snapshots")
      .update({ danger_days_count: dangerDaysCount, recommended_loan_amount: recommendedLoanAmount, completed_at: new Date().toISOString() })
      .eq("id", runId);

    // 8. Return forecast ------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        starting_balance: Math.round(currentBalance * 100) / 100,
        forecast_days: FORECAST_DAYS,
        danger_days: dangerDaysCount,
        daily_income_estimate: Math.round(dailyIncome * 100) / 100,
        obligations_count: (obligations ?? []).length,
        recommended_loan_amount: recommendedLoanAmount,
        forecast: forecastRows,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("run-forecast error:", err);
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
