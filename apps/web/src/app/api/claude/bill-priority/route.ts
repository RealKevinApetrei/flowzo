import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { BILL_PRIORITY_SYSTEM, buildBillPriorityPrompt } from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = buildBillPriorityPrompt({
      obligations: body.obligations ?? [],
      dangerDays: body.dangerDays ?? [],
      avgBalancePence: body.avgBalancePence ?? 0,
    });

    const raw = await callClaude(BILL_PRIORITY_SYSTEM, [{ role: "user", content: prompt }], 600);

    // Extract JSON from response (Claude may wrap in markdown)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const priorities = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ priorities });
  } catch (error) {
    console.error("Bill priority error:", error);
    return NextResponse.json({ priorities: [] }, { status: 200 });
  }
}
