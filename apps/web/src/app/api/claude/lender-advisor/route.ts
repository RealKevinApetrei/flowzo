import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { LENDER_ADVISOR_SYSTEM, buildLenderAdvisorPrompt } from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const prompt = buildLenderAdvisorPrompt({
      currentPrefs: body.currentPrefs ?? { min_apr: 5, risk_bands: ["A", "B"], max_exposure: 100, max_shift_days: 7 },
      portfolio: body.portfolio ?? { grade_a_pct: 50, grade_b_pct: 40, grade_c_pct: 10, total_deployed: 0, realized_yield: 0, default_count: 0 },
      marketRates: body.marketRates ?? [],
    });

    const raw = await callClaude(LENDER_ADVISOR_SYSTEM, [{ role: "user", content: prompt }], 600);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw, recommendations: [] };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lender advisor error:", error);
    return NextResponse.json({ summary: "Unable to generate advice right now.", recommendations: [] });
  }
}
