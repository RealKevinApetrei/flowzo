import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import {
  FINANCIAL_INSIGHTS_SYSTEM,
  buildFinancialInsightsPrompt,
} from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
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

    const raw = await callClaude(
      FINANCIAL_INSIGHTS_SYSTEM,
      [{ role: "user", content: prompt }],
      300,
    );

    // Parse structured JSON from Claude
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    }

    // Fallback: return as plain insight
    return NextResponse.json({
      status: "caution",
      headline: "Cash flow analysis",
      insights: [{ icon: "💡", text: raw.slice(0, 80) }],
    });
  } catch (error) {
    console.error("Financial insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
}
