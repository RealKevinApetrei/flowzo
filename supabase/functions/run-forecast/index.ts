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

/** Detect income pattern: paydays + irregular daily income. */
interface IncomePattern {
  paydays: number[]; // days of month (e.g., [25])
  paydayAmount: number; // estimated salary per payday
  otherDailyIncome: number; // small irregular daily average
}

function detectIncomePattern(
  transactions: Record<string, unknown>[],
): IncomePattern {
  const empty = { paydays: [], paydayAmount: 0, otherDailyIncome: 0 };
  if (!transactions || transactions.length === 0) return empty;

  const positiveTxns = transactions.filter(
    (t) => Number(t.amount) > 0,
  );
  if (positiveTxns.length === 0) return empty;

  // Group by day-of-month, track totals and max single deposit
  const dayBuckets = new Map<
    number,
    { total: number; count: number; maxSingle: number }
  >();
  for (const t of positiveTxns) {
    const day = new Date(t.booked_at as string).getDate();
    const amount = Number(t.amount);
    const existing = dayBuckets.get(day) ?? {
      total: 0,
      count: 0,
      maxSingle: 0,
    };
    existing.total += amount;
    existing.count++;
    existing.maxSingle = Math.max(existing.maxSingle, amount);
    dayBuckets.set(day, existing);
  }

  // Find payday: day with highest single deposit > £200
  const sorted = [...dayBuckets.entries()].sort(
    (a, b) => b[1].maxSingle - a[1].maxSingle,
  );

  const paydays: number[] = [];
  let paydayAmount = 0;

  if (sorted.length > 0 && sorted[0][1].maxSingle > 200) {
    paydays.push(sorted[0][0]);
    paydayAmount = sorted[0][1].maxSingle;
  }

  // Non-payday daily income
  const totalPositive = positiveTxns.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );
  const dates = positiveTxns.map((t) =>
    new Date(t.booked_at as string).getTime(),
  );
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const spanDays = Math.max(
    1,
    Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)),
  );
  // Estimate payday contribution over the span (roughly 1 payday per 30 days)
  const estimatedPaydays = Math.max(1, Math.round(spanDays / 30));
  const totalPayday = paydayAmount * estimatedPaydays;
  const otherIncome = Math.max(0, totalPositive - totalPayday);
  const otherDailyIncome = otherIncome / spanDays;

  return { paydays, paydayAmount, otherDailyIncome };
}

// Overdraft buffer: GBP 100
const OVERDRAFT_BUFFER = 100.0;
const FORECAST_DAYS = 180;

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
      .select("amount, booked_at, merchant_name, description")
      .eq("user_id", user_id)
      .gte("booked_at", ninetyDaysAgo.toISOString())
      .order("booked_at", { ascending: true });

    const incomePattern = detectIncomePattern(recentTxns ?? []);

    // 3b. Fetch active trade repayments within forecast window ----------
    const forecastEnd = addDays(new Date(), FORECAST_DAYS);
    const { data: activeTrades } = await supabase
      .from("trades")
      .select("amount, fee, new_due_date")
      .eq("borrower_id", user_id)
      .in("status", ["MATCHED", "LIVE"])
      .gte("new_due_date", isoDate(new Date()))
      .lte("new_due_date", isoDate(forecastEnd));

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

    // 5a. Compute flat fallback for irregular spend (used if Quant API is down)
    const oblMerchantKeys = new Set(
      (obligations ?? [])
        .map((o) => ((o.merchant_name as string) ?? "").toLowerCase().trim())
        .filter(Boolean),
    );
    const irregularTxnsRaw = (recentTxns ?? []).filter((t) => {
      if (Number(t.amount) >= 0) return false;
      const key = (
        ((t.merchant_name as string) ?? (t.description as string) ?? "")
          .toLowerCase()
          .trim()
          .slice(0, 30)
      );
      return !oblMerchantKeys.has(key);
    });
    const irregularTotal = irregularTxnsRaw.reduce(
      (s, t) => s + Math.abs(Number(t.amount)),
      0,
    );
    const fallbackDailyIrregular = irregularTotal > 0 ? irregularTotal / 90 : 0;

    // 5b. Call Quant API for per-day Gamma irregular spend forecast --------
    const QUANT_API_URL = Deno.env.get("QUANT_API_URL");
    const irregularByDate: Record<
      string,
      { mean_spend: number; p10: number; p90: number }
    > = {};

    if (QUANT_API_URL && (recentTxns ?? []).length > 0) {
      try {
        const txnPayload = (recentTxns ?? []).map((t) => ({
          user_id,
          amount: Number(t.amount),
          transaction_type: Number(t.amount) >= 0 ? "CREDIT" : "DEBIT",
          description: (t.description as string) ?? "",
          merchant_name: (t.merchant_name as string) ?? null,
          booked_at: t.booked_at as string,
        }));
        const oblPayload = (obligations ?? []).map((o) => ({
          merchant_name: (o.merchant_name as string) ?? "",
        }));

        const quantRes = await fetch(`${QUANT_API_URL}/api/forecast/spending`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions: txnPayload,
            obligations: oblPayload,
            forecast_start: isoDate(today),
            horizon_days: FORECAST_DAYS,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (quantRes.ok) {
          const quantData = await quantRes.json();
          for (const row of (quantData.daily_forecasts ?? [])) {
            irregularByDate[row.forecast_date as string] = {
              mean_spend: Number(row.mean_spend ?? 0),
              p10: Number(row.p10 ?? 0),
              p90: Number(row.p90 ?? 0),
            };
          }
          console.log(
            `Irregular spend model=${quantData.model}, ` +
            `irregular_txns=${quantData.irregular_txn_count}, ` +
            `history_days=${quantData.total_days_history}`,
          );
        } else {
          console.warn(
            `Quant API returned ${quantRes.status} — using flat fallback for irregular spend`,
          );
        }
      } catch (e) {
        // Non-fatal: forecast still runs using the flat fallback
        console.warn("Quant API unreachable, using flat fallback:", e);
      }
    }

    for (let dayOffset = 0; dayOffset < FORECAST_DAYS; dayOffset++) {
      const forecastDate = addDays(today, dayOffset);

      // Outgoings: obligations due on this day
      let dailyOutgoings = 0;
      for (const obl of obligations ?? []) {
        if (isObligationDueOn(obl, forecastDate)) {
          dailyOutgoings += Number(obl.amount);
        }
      }

      // Outgoings: trade repayments due on this day (principal + fee)
      const dateStr = isoDate(forecastDate);
      for (const trade of activeTrades ?? []) {
        if (trade.new_due_date === dateStr) {
          dailyOutgoings += Number(trade.amount) + Number(trade.fee);
        }
      }

      // Income: payday-concentrated pattern, fallback to flat if no data
      const dayOfMonth = forecastDate.getDate();
      let incomeExpected: number;
      if (incomePattern.paydays.length > 0) {
        incomeExpected = incomePattern.otherDailyIncome;
        if (incomePattern.paydays.includes(dayOfMonth)) {
          incomeExpected += incomePattern.paydayAmount;
        }
      } else {
        incomeExpected = incomePattern.otherDailyIncome;
      }
      incomeExpected = Math.round(incomeExpected * 100) / 100;

      // Irregular spending: Gamma model if available, else flat fallback
      const dateKey = isoDate(forecastDate);
      const irreg = irregularByDate[dateKey];
      const irregularMean = irreg ? irreg.mean_spend : fallbackDailyIrregular;
      const irregularP10 = irreg ? irreg.p10 : fallbackDailyIrregular * 0.4;
      const irregularP90 = irreg ? irreg.p90 : fallbackDailyIrregular * 2.0;

      // Total outgoings = known obligations + predicted irregular spend
      const totalDailyOutgoings = dailyOutgoings + irregularMean;

      // Update running balance
      runningBalance = runningBalance - totalDailyOutgoings + incomeExpected;

      // Track the deepest trough for loan recommendation
      if (runningBalance < minimumProjectedBalance) {
        minimumProjectedBalance = runningBalance;
      }

      // Confidence bands: data-driven from Gamma p10/p90, growing sub-linearly
      const irregSpread = Math.max(0, irregularP90 - irregularP10);
      const cumulativeSpread = irregSpread * Math.sqrt(dayOffset + 1);
      const confidenceLow =
        Math.round((runningBalance - cumulativeSpread) * 100) / 100;
      const confidenceHigh =
        Math.round((runningBalance + cumulativeSpread * 0.5) * 100) / 100;

      // Danger flag: balance below overdraft buffer
      const isDanger = runningBalance < OVERDRAFT_BUFFER;
      if (isDanger) dangerDaysCount++;

      forecastRows.push({
        user_id,
        forecast_date: dateKey,
        projected_balance: Math.round(runningBalance * 100) / 100,
        confidence_low: confidenceLow,
        confidence_high: confidenceHigh,
        danger_flag: isDanger,
        income_expected: incomeExpected,
        outgoings_expected: Math.round(totalDailyOutgoings * 100) / 100,
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
    const { error: snapUpdateErr } = await supabase
      .from("forecast_snapshots")
      .update({
        danger_days_count: dangerDaysCount,
        recommended_loan_amount: recommendedLoanAmount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    if (snapUpdateErr) {
      console.error("Failed to update forecast snapshot:", snapUpdateErr);
    }

    // 8. Return forecast ------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        starting_balance: Math.round(currentBalance * 100) / 100,
        forecast_days: FORECAST_DAYS,
        danger_days: dangerDaysCount,
        income_pattern: incomePattern,
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
