import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Fee calculation
// ---------------------------------------------------------------------------

const BASE_RATE = 0.049; // 4.9% APR

const RISK_MULTIPLIERS: Record<string, number> = {
  A: 1.0,
  B: 1.5,
  C: 2.0,
};

/**
 * Calculate the fee for shifting a bill.
 * amount is in GBP (decimal). Returns fee in GBP (decimal).
 * Cap: lesser of 5% of amount or GBP 10.
 */
function calculateFee(
  amount: number,
  shiftDays: number,
  riskGrade: string,
): number {
  const riskMult = RISK_MULTIPLIERS[riskGrade] ?? 1.5;
  const rawFee = BASE_RATE * amount * (shiftDays / 365) * riskMult;
  const cap = Math.min(amount * 0.05, 10.0); // GBP 10 cap
  const fee = Math.min(rawFee, cap);
  return Math.round(Math.max(fee, 0.01) * 100) / 100;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatGBP(amount: number): string {
  return amount.toFixed(2);
}

// Buffer: GBP 50 above the obligation amount
const SAFETY_BUFFER = 50.0;

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

    // 1. Get user profile for risk grade --------------------------------
    const { data: profile } = await supabase
      .from("profiles")
      .select("risk_grade")
      .eq("id", user_id)
      .single();

    const riskGrade = (profile?.risk_grade as string) ?? "B"; // default B

    // 2. Fetch danger days from forecasts --------------------------------
    const { data: dangerForecasts, error: fcErr } = await supabase
      .from("forecasts")
      .select("*")
      .eq("user_id", user_id)
      .eq("danger_flag", true)
      .order("forecast_date", { ascending: true });

    if (fcErr) {
      throw new Error(`Failed to fetch forecasts: ${fcErr.message}`);
    }

    if (!dangerForecasts || dangerForecasts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          proposals: [],
          message: "No danger days found - no proposals needed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Fetch all active obligations -----------------------------------
    const { data: obligations, error: oblErr } = await supabase
      .from("obligations")
      .select("*")
      .eq("user_id", user_id)
      .eq("active", true);

    if (oblErr) {
      throw new Error(`Failed to fetch obligations: ${oblErr.message}`);
    }

    // 4. Fetch all forecasts for safe-day lookup -------------------------
    const { data: allForecasts } = await supabase
      .from("forecasts")
      .select("forecast_date, projected_balance")
      .eq("user_id", user_id)
      .order("forecast_date", { ascending: true });

    // 5. Create an agent run record -------------------------------------
    const { data: agentRun, error: runErr } = await supabase
      .from("agent_runs")
      .insert({
        agent_type: "generate_proposals",
        user_id,
        input_summary: {
          danger_days: dangerForecasts.length,
          obligations_count: (obligations ?? []).length,
          risk_grade: riskGrade,
        },
      })
      .select("id")
      .single();

    if (runErr || !agentRun) {
      throw new Error(`Failed to create agent run: ${runErr?.message}`);
    }

    // 6. For each danger day, find at-risk obligations ------------------
    const proposals: Record<string, unknown>[] = [];
    const processedObligationIds = new Set<string>();

    for (const dangerDay of dangerForecasts) {
      const dangerDate = new Date(dangerDay.forecast_date as string);

      for (const obl of obligations ?? []) {
        // Skip if we already proposed for this obligation
        if (processedObligationIds.has(obl.id as string)) continue;

        // Check if obligation is due on or near this danger day (+/- 1 day)
        const oblNextExpected = obl.next_expected
          ? new Date(obl.next_expected as string)
          : null;
        const oblDay = obl.expected_day as number;

        let isDueNearDanger = false;

        if (oblNextExpected) {
          const diffDays = Math.abs(
            Math.round(
              (oblNextExpected.getTime() - dangerDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          isDueNearDanger = diffDays <= 1;
        } else {
          // Fall back to checking expected_day vs danger date day
          isDueNearDanger =
            Math.abs(dangerDate.getDate() - oblDay) <= 1 ||
            Math.abs(dangerDate.getDate() - oblDay) >= 28; // wrap-around
        }

        if (!isDueNearDanger) continue;

        processedObligationIds.add(obl.id as string);

        const oblAmount = Number(obl.amount);
        const originalDate = oblNextExpected ?? dangerDate;

        // Find nearest safe date: balance > obligation + buffer
        let shiftedDate: Date | null = null;
        let shiftDays = 0;

        if (allForecasts) {
          for (const fc of allForecasts) {
            const fcDate = new Date(fc.forecast_date as string);
            if (fcDate <= originalDate) continue;

            const projectedBalance = Number(fc.projected_balance);
            if (projectedBalance > oblAmount + SAFETY_BUFFER) {
              shiftedDate = fcDate;
              shiftDays = Math.round(
                (fcDate.getTime() - originalDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              break;
            }
          }
        }

        // If no safe date found within the forecast window, suggest +7 days
        if (!shiftedDate) {
          shiftDays = 7;
          shiftedDate = new Date(originalDate);
          shiftedDate.setDate(shiftedDate.getDate() + shiftDays);
        }

        // Cap shift to 14 days (trade constraint)
        if (shiftDays > 14) {
          shiftDays = 14;
          shiftedDate = new Date(originalDate);
          shiftedDate.setDate(shiftedDate.getDate() + 14);
        }

        if (shiftDays < 1) continue;

        // Calculate fee
        const feePence = Math.round(
          calculateFee(oblAmount, shiftDays, riskGrade) * 100,
        );
        const fee = feePence / 100;

        const payload = {
          obligation_id: obl.id,
          obligation_name: obl.name,
          original_date: isoDate(originalDate),
          shifted_date: isoDate(shiftedDate),
          amount_pence: Math.round(oblAmount * 100),
          fee_pence: feePence,
          shift_days: shiftDays,
          risk_grade: riskGrade,
        };

        const explanationText =
          `Move ${obl.name} from ${isoDate(originalDate)} to ${isoDate(shiftedDate)} to avoid a shortfall. Fee: \u00a3${formatGBP(fee)}`;

        proposals.push({
          user_id,
          type: "SHIFT_BILL",
          obligation_id: obl.id,
          status: "PENDING",
          payload,
          explanation_text: explanationText,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 day expiry
        });
      }
    }

    // 7. Insert proposals -----------------------------------------------
    if (proposals.length > 0) {
      const { error: propErr } = await supabase
        .from("agent_proposals")
        .insert(proposals);

      if (propErr) {
        console.error("Proposal insert error:", propErr);
        throw new Error(`Failed to insert proposals: ${propErr.message}`);
      }
    }

    // 8. Update agent run -----------------------------------------------
    await supabase
      .from("agent_runs")
      .update({
        result_summary: {
          proposals_generated: proposals.length,
          risk_grade: riskGrade,
        },
        proposals_count: proposals.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", agentRun.id);

    // 9. Return proposals -----------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        agent_run_id: agentRun.id,
        risk_grade: riskGrade,
        danger_days: dangerForecasts.length,
        proposals_count: proposals.length,
        proposals,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("generate-proposals error:", err);
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
