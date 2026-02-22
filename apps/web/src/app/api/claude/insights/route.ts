import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude/client";
import {
  FINANCIAL_INSIGHTS_SYSTEM,
  buildFinancialInsightsPrompt,
} from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      riskGrade,
      creditScore,
      dangerDays,
      obligations,
      avgBalance_pence,
      incomePattern,
    } = body;

    if (!riskGrade) {
      return NextResponse.json(
        { error: "riskGrade is required" },
        { status: 400 },
      );
    }

    const prompt = buildFinancialInsightsPrompt({
      riskGrade,
      creditScore: creditScore ?? 650,
      dangerDays: dangerDays ?? 0,
      obligations: obligations ?? [],
      avgBalance_pence: avgBalance_pence ?? 0,
      incomePattern: incomePattern ?? "monthly salary",
    });

    const insight = await callClaude(
      FINANCIAL_INSIGHTS_SYSTEM,
      [{ role: "user", content: prompt }],
      400,
    );

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Financial insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
}
