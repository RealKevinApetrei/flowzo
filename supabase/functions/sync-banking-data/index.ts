import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const TRUELAYER_ENV = Deno.env.get("TRUELAYER_ENV") ?? "sandbox";
const TRUELAYER_BASE = TRUELAYER_ENV === "production"
  ? "https://api.truelayer.com"
  : "https://api.truelayer-sandbox.com";
const TRUELAYER_AUTH_BASE = TRUELAYER_ENV === "production"
  ? "https://auth.truelayer.com"
  : "https://auth.truelayer-sandbox.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Standard deviation of an array of numbers. */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/** Coefficient of variation. */
function cv(values: number[]): number {
  if (values.length < 2) return Infinity;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return Infinity;
  return stddev(values) / Math.abs(mean);
}

/** Classify a gap in days into a frequency label. */
function classifyFrequency(
  avgGapDays: number,
): "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "IRREGULAR" {
  if (avgGapDays >= 5 && avgGapDays <= 9) return "WEEKLY";
  if (avgGapDays >= 12 && avgGapDays <= 18) return "FORTNIGHTLY";
  if (avgGapDays >= 25 && avgGapDays <= 35) return "MONTHLY";
  if (avgGapDays >= 80 && avgGapDays <= 100) return "QUARTERLY";
  return "IRREGULAR";
}

// ---------------------------------------------------------------------------
// TrueLayer fetchers
// ---------------------------------------------------------------------------

/** Refresh an expired TrueLayer access token. */
async function refreshAccessToken(
  refreshTokenValue: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");
  const clientSecret = Deno.env.get("TRUELAYER_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("TRUELAYER_CLIENT_ID/SECRET required for token refresh");
  }
  const res = await fetch(`${TRUELAYER_AUTH_BASE}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function tlFetch(
  path: string,
  accessToken: string,
  retryCtx?: {
    refreshTokenValue: string;
    supabase: ReturnType<typeof createAdminClient>;
    connectionId: string;
  },
) {
  let res = await fetch(`${TRUELAYER_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // On 401, try refreshing the token once
  if (res.status === 401 && retryCtx) {
    console.log(`TrueLayer 401 on ${path}, refreshing token...`);
    const newTokens = await refreshAccessToken(retryCtx.refreshTokenValue);
    await retryCtx.supabase
      .from("bank_connections")
      .update({
        truelayer_token: {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", retryCtx.connectionId);

    res = await fetch(`${TRUELAYER_BASE}${path}`, {
      headers: { Authorization: `Bearer ${newTokens.access_token}` },
    });
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TrueLayer ${path} returned ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.results ?? json;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, connection_id } = await req.json();
    if (!user_id || !connection_id) {
      return new Response(
        JSON.stringify({ error: "user_id and connection_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch bank connection -------------------------------------------
    const { data: conn, error: connErr } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("user_id", user_id)
      .single();

    if (connErr || !conn) {
      return new Response(
        JSON.stringify({ error: "Bank connection not found", detail: connErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate token structure
    const tokenObj = conn.truelayer_token;
    if (!tokenObj || typeof tokenObj !== "object" || !tokenObj.access_token) {
      return new Response(
        JSON.stringify({
          error: "Invalid token format in bank connection",
          detail: "Expected truelayer_token to be an object with access_token",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken: string = tokenObj.access_token;
    const refreshTokenValue: string | undefined = tokenObj.refresh_token;
    const retryCtx = refreshTokenValue
      ? { refreshTokenValue, supabase, connectionId: connection_id }
      : undefined;

    // 2. Fetch accounts from TrueLayer -----------------------------------
    const tlAccounts = await tlFetch("/data/v1/accounts", accessToken, retryCtx);

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let accountsSynced = 0;
    let transactionsSynced = 0;
    let obligationsDetected = 0;
    const obligationErrors: string[] = [];

    for (const tlAcct of tlAccounts) {
      // 3. Upsert account ------------------------------------------------
      const { data: acct, error: acctErr } = await supabase
        .from("accounts")
        .upsert(
          {
            user_id,
            bank_connection_id: connection_id,
            external_account_id: tlAcct.account_id,
            account_type: tlAcct.account_type ?? "TRANSACTION",
            display_name:
              tlAcct.display_name ?? tlAcct.provider?.display_name ?? "Account",
            currency: tlAcct.currency ?? "GBP",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "bank_connection_id,external_account_id" },
        )
        .select("id")
        .single();

      if (acctErr || !acct) {
        console.error("Account upsert failed:", acctErr);
        continue;
      }
      accountsSynced++;

      // 4. Fetch & store balance -----------------------------------------
      try {
        const balances = await tlFetch(
          `/data/v1/accounts/${tlAcct.account_id}/balance`,
          accessToken,
          retryCtx,
        );
        const bal = balances[0];
        if (bal) {
          await supabase
            .from("accounts")
            .update({
              balance_current: bal.current ?? 0,
              balance_available: bal.available ?? bal.current ?? 0,
              balance_updated_at: new Date().toISOString(),
            })
            .eq("id", acct.id);
        }
      } catch (e) {
        console.error(`Balance fetch failed for ${tlAcct.account_id}:`, e);
      }

      // 5. Fetch & store transactions ------------------------------------
      try {
        const txns = await tlFetch(
          `/data/v1/accounts/${tlAcct.account_id}/transactions?from=${isoDate(ninetyDaysAgo)}&to=${isoDate(now)}`,
          accessToken,
          retryCtx,
        );

        const txnRows = txns.map((t: Record<string, unknown>) => ({
          user_id,
          account_id: acct.id,
          external_transaction_id: t.transaction_id,
          amount: t.amount,
          currency: (t.currency as string) ?? "GBP",
          description: t.description,
          merchant_name: t.merchant_name ?? null,
          category:
            (t.transaction_classification as string[])?.join(", ") ?? null,
          transaction_type: t.transaction_type ?? null,
          booked_at: t.timestamp,
        }));

        if (txnRows.length > 0) {
          const { error: txnErr } = await supabase
            .from("transactions")
            .upsert(txnRows, {
              onConflict: "account_id,external_transaction_id",
            });
          if (txnErr) {
            console.error("Transaction upsert error:", txnErr);
          } else {
            transactionsSynced += txnRows.length;
          }
        }
      } catch (e) {
        console.error(`Txn fetch failed for ${tlAcct.account_id}:`, e);
      }
    }

    // 5b. Fetch standing orders & direct debits (real bills from bank) ----
    let standingOrdersSynced = 0;
    let directDebitsSynced = 0;

    for (const tlAcct of tlAccounts) {
      const { data: acct } = await supabase
        .from("accounts")
        .select("id")
        .eq("bank_connection_id", connection_id)
        .eq("external_account_id", tlAcct.account_id)
        .single();

      if (!acct) continue;

      // Standing Orders
      try {
        const standingOrders = await tlFetch(
          `/data/v1/accounts/${tlAcct.account_id}/standing_orders`,
          accessToken,
          retryCtx,
        );

        for (const so of standingOrders ?? []) {
          const soAmount = Math.abs(Number(so.amount ?? so.next_payment_amount ?? 0));
          if (soAmount <= 0) continue;

          const nextDate = so.next_payment_date ?? so.first_payment_date;
          const soDay = nextDate ? new Date(nextDate).getDate() : 1;
          const freq = (so.frequency ?? "").toUpperCase().includes("WEEK") ? "WEEKLY"
            : (so.frequency ?? "").toUpperCase().includes("MONTH") ? "MONTHLY"
            : "MONTHLY";

          await supabase.from("obligations").upsert(
            {
              user_id,
              account_id: acct.id,
              name: so.reference ?? so.payee ?? "Standing Order",
              merchant_name: so.reference ?? so.payee ?? "Standing Order",
              amount: soAmount,
              currency: (so.currency as string) ?? "GBP",
              expected_day: soDay,
              frequency: freq,
              category: "Standing Order",
              is_essential: true,
              confidence: 1.0,
              next_expected: nextDate ? isoDate(new Date(nextDate)) : null,
              active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,merchant_name", ignoreDuplicates: false },
          );
          standingOrdersSynced++;
        }
      } catch (e) {
        console.warn(`Standing orders fetch failed for ${tlAcct.account_id}:`, e);
      }

      // Direct Debits
      try {
        const directDebits = await tlFetch(
          `/data/v1/accounts/${tlAcct.account_id}/direct_debits`,
          accessToken,
          retryCtx,
        );

        for (const dd of directDebits ?? []) {
          const ddAmount = Math.abs(Number(dd.previous_payment_amount ?? 0));
          if (ddAmount <= 0) continue;

          const lastPaid = dd.previous_payment_date;
          const ddDay = lastPaid ? new Date(lastPaid).getDate() : 1;

          // Estimate next payment: last payment + 1 month
          let nextExpected: string | null = null;
          if (lastPaid) {
            const next = new Date(lastPaid);
            next.setMonth(next.getMonth() + 1);
            nextExpected = isoDate(next);
          }

          await supabase.from("obligations").upsert(
            {
              user_id,
              account_id: acct.id,
              name: dd.name ?? dd.mandate_id ?? "Direct Debit",
              merchant_name: dd.name ?? dd.mandate_id ?? "Direct Debit",
              amount: ddAmount,
              currency: (dd.currency as string) ?? "GBP",
              expected_day: ddDay,
              frequency: "MONTHLY",
              category: "Direct Debit",
              is_essential: true,
              confidence: 1.0,
              last_paid_at: lastPaid ?? null,
              next_expected: nextExpected,
              active: dd.status === "Active" || dd.status === "active" || !dd.status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,merchant_name", ignoreDuplicates: false },
          );
          directDebitsSynced++;
        }
      } catch (e) {
        console.warn(`Direct debits fetch failed for ${tlAcct.account_id}:`, e);
      }
    }

    if (standingOrdersSynced > 0 || directDebitsSynced > 0) {
      console.log(
        `Synced ${standingOrdersSynced} standing orders + ${directDebitsSynced} direct debits from bank`,
      );
    }

    // 6. Detect recurring obligations ------------------------------------
    const { data: allTxns } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user_id)
      .lt("amount", 0) // outgoing
      .not("merchant_name", "is", null)
      .order("booked_at", { ascending: true });

    if (allTxns && allTxns.length > 0) {
      // Group by merchant
      const groups: Record<string, typeof allTxns> = {};
      for (const tx of allTxns) {
        const key = (tx.merchant_name as string).toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
      }

      for (const [merchantKey, txns] of Object.entries(groups)) {
        if (txns.length < 2) continue;

        // Calculate inter-payment gaps in days
        const dates = txns.map((t) =>
          new Date(t.booked_at as string).getTime()
        );
        const gaps: number[] = [];
        for (let i = 1; i < dates.length; i++) {
          gaps.push(
            Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)),
          );
        }

        const gapCV = cv(gaps);
        if (gapCV >= 0.5) continue; // too irregular

        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const frequency = classifyFrequency(avgGap);
        if (frequency === "IRREGULAR") continue;

        // Amount consistency
        const amounts = txns.map((t) => Math.abs(Number(t.amount)));
        const amountCV = cv(amounts);
        const avgAmount =
          amounts.reduce((a, b) => a + b, 0) / amounts.length;

        // Confidence = regularity * amount consistency
        const frequencyRegularity = Math.max(0, 1 - gapCV);
        const amountConsistency = Math.max(0, 1 - amountCV);
        const confidence =
          Math.round(frequencyRegularity * amountConsistency * 100) / 100;

        if (confidence < 0.5) continue;

        // Determine expected day of month
        const lastTxn = txns[txns.length - 1];
        const lastDate = new Date(lastTxn.booked_at as string);
        const expectedDay = lastDate.getDate();

        // Calculate next expected date (handle month boundary safely)
        const nextExpected = new Date(lastDate);
        switch (frequency) {
          case "WEEKLY":
            nextExpected.setDate(nextExpected.getDate() + 7);
            break;
          case "FORTNIGHTLY":
            nextExpected.setDate(nextExpected.getDate() + 14);
            break;
          case "MONTHLY": {
            // Advance month, then clamp to last day if overflowed
            const targetMonth = nextExpected.getMonth() + 1;
            nextExpected.setMonth(targetMonth);
            // If setMonth overflowed (e.g. Jan 31 → Mar 3), clamp to last day of target month
            if (nextExpected.getMonth() !== targetMonth % 12) {
              nextExpected.setDate(0); // sets to last day of previous month
            }
            break;
          }
          case "QUARTERLY": {
            const targetQMonth = nextExpected.getMonth() + 3;
            nextExpected.setMonth(targetQMonth);
            if (nextExpected.getMonth() !== targetQMonth % 12) {
              nextExpected.setDate(0);
            }
            break;
          }
        }

        // Find the account_id from the most recent transaction
        const accountId = lastTxn.account_id;

        const { error: oblErr } = await supabase.from("obligations").upsert(
          {
            user_id,
            account_id: accountId,
            name: txns[0].merchant_name,
            merchant_name: txns[0].merchant_name,
            amount: Math.round(avgAmount * 100) / 100,
            currency: "GBP",
            expected_day: expectedDay,
            frequency,
            category: txns[0].category ?? null,
            is_essential: true,
            confidence,
            last_paid_at: lastTxn.booked_at,
            next_expected: isoDate(nextExpected),
            active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,merchant_name",
            ignoreDuplicates: false,
          },
        );

        if (oblErr) {
          console.error(`Obligation upsert error for ${merchantKey}:`, oblErr);
          obligationErrors.push(`${merchantKey}: ${oblErr.message}`);
        } else {
          obligationsDetected++;
        }
      }
    }

    // 6b. Fetch identity (auto-populate profile name) --------------------
    try {
      const identityData = await tlFetch("/data/v1/info", accessToken, retryCtx);
      const identity = Array.isArray(identityData) ? identityData[0] : identityData;
      if (identity?.full_name) {
        await supabase
          .from("profiles")
          .update({ display_name: identity.full_name })
          .eq("id", user_id);
        console.log(`Updated profile display_name: ${identity.full_name}`);
      }
    } catch (e) {
      console.warn("Identity fetch failed (non-critical):", e);
    }

    // 7. Update last_synced_at -------------------------------------------
    await supabase
      .from("bank_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection_id);

    // 8. Return summary --------------------------------------------------
    const summary = {
      success: obligationErrors.length === 0,
      connection_id,
      accounts_synced: accountsSynced,
      transactions_synced: transactionsSynced,
      obligations_detected: obligationsDetected,
      standing_orders_synced: standingOrdersSynced,
      direct_debits_synced: directDebitsSynced,
      obligation_errors: obligationErrors.length > 0 ? obligationErrors : undefined,
      synced_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-banking-data error:", err);
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
