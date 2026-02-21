import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { proposal_id } = await req.json();
    if (!proposal_id) {
      return new Response(
        JSON.stringify({ error: "proposal_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the proposal ---------------------------------------------
    const { data: proposal, error: propErr } = await supabase
      .from("agent_proposals")
      .select("*, obligations(*)")
      .eq("id", proposal_id)
      .single();

    if (propErr || !proposal) {
      return new Response(
        JSON.stringify({
          error: "Proposal not found",
          detail: propErr?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Build context for Claude ---------------------------------------
    const payload = proposal.payload;
    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Proposal payload is missing or invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const p = payload as Record<string, unknown>;
    const obligation = proposal.obligations as Record<string, unknown> | null;

    const amountGBP = p.amount_pence
      ? (Number(p.amount_pence) / 100).toFixed(2)
      : "unknown";
    const feeGBP = p.fee_pence
      ? (Number(p.fee_pence) / 100).toFixed(2)
      : "unknown";

    const prompt = `You are Flowzo, a friendly personal finance assistant for UK consumers.
You help people understand bill-shifting proposals in simple, reassuring language.

A user has a bill that falls on a day when their account balance would be dangerously low.
We are proposing to shift this bill to a safer date for a small fee.

Here are the details:
- Bill name: ${obligation?.name ?? p.obligation_name ?? "Unknown bill"}
- Bill amount: \u00a3${amountGBP}
- Original due date: ${p.original_date}
- Proposed new date: ${p.shifted_date}
- Number of days shifted: ${p.shift_days}
- Fee for this shift: \u00a3${feeGBP}
- Risk grade: ${p.risk_grade ?? "B"}
- Bill frequency: ${obligation?.frequency ?? "monthly"}
- Bill category: ${obligation?.category ?? "general"}

Write a short, friendly explanation (2-3 sentences) for the user about why this shift is being proposed and what it means for them.
Keep the tone warm and supportive - not patronising. Mention the specific amounts and dates.
Do NOT use markdown formatting. Write plain text only.`;

    // 3. Call Claude API ------------------------------------------------
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errBody);
      throw new Error(
        `Claude API returned ${claudeRes.status}: ${errBody}`,
      );
    }

    const claudeData = await claudeRes.json();
    const explanationText =
      claudeData.content?.[0]?.text ??
      proposal.explanation_text ??
      "Unable to generate explanation at this time.";

    // 4. Update proposal with explanation --------------------------------
    const { error: updateErr } = await supabase
      .from("agent_proposals")
      .update({ explanation_text: explanationText })
      .eq("id", proposal_id);

    if (updateErr) {
      console.error("Failed to update proposal explanation:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id,
        explanation_text: explanationText,
        model: CLAUDE_MODEL,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("explain-proposal error:", err);
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
