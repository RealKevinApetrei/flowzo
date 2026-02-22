import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { WHAT_IF_SYSTEM, buildWhatIfPrompt } from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = buildWhatIfPrompt({
      shifts: body.shifts ?? [],
      forecasts: body.forecasts ?? [],
      obligations: body.obligations ?? [],
    });

    const raw = await callClaude(WHAT_IF_SYSTEM, [{ role: "user", content: prompt }], 500);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw };

    return NextResponse.json(result);
  } catch (error) {
    console.error("What-if error:", error);
    return NextResponse.json({ summary: "Unable to simulate right now." }, { status: 200 });
  }
}
