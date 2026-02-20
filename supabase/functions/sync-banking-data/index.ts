import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const TRUELAYER_BASE = "https://api.truelayer-sandbox.com";

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

async function tlFetch(path: string, accessToken: string) {
  const res = await fetch(`${TRUELAYER_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TrueLayer ${path} returned ${res.status}: ${body}`,
    );
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

    const accessToken: string =
      conn.truelayer_token?.access_token ?? conn.truelayer_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "No access_token in bank connection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch accounts from TrueLayer -----------------------------------
    const tlAccounts = await tlFetch("/data/v1/accounts", accessToken);

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let accountsSynced = 0;
    let transactionsSynced = 0;
    let obligationsDetected = 0;

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

        // Calculate next expected date
        const nextExpected = new Date(lastDate);
        switch (frequency) {
          case "WEEKLY":
            nextExpected.setDate(nextExpected.getDate() + 7);
            break;
          case "FORTNIGHTLY":
            nextExpected.setDate(nextExpected.getDate() + 14);
            break;
          case "MONTHLY":
            nextExpected.setMonth(nextExpected.getMonth() + 1);
            break;
          case "QUARTERLY":
            nextExpected.setMonth(nextExpected.getMonth() + 3);
            break;
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
        } else {
          obligationsDetected++;
        }
      }
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
      success: true,
      connection_id,
      accounts_synced: accountsSynced,
      transactions_synced: transactionsSynced,
      obligations_detected: obligationsDetected,
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
