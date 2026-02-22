import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude/client";
import {
  RISK_EXPLAINER_SYSTEM,
  buildRiskExplainPrompt,
} from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { creditScore, riskGrade, shapValues } = body;

    if (!creditScore || !riskGrade) {
      return NextResponse.json(
        { error: "creditScore and riskGrade are required" },
        { status: 400 },
      );
    }

    const prompt = buildRiskExplainPrompt({
      creditScore,
      riskGrade,
      shapValues: shapValues ?? [],
    });

    const explanation = await callClaude(
      RISK_EXPLAINER_SYSTEM,
      [{ role: "user", content: prompt }],
      300,
    );

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Risk explain error:", error);
    return NextResponse.json(
      { error: "Failed to generate risk explanation" },
      { status: 500 },
    );
  }
}
