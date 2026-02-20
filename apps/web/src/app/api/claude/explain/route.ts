import { NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { EXPLAIN_PROPOSAL_SYSTEM, buildExplainPrompt } from "@/lib/claude/prompts";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { billName, originalDate, shiftedDate, amountPence, feePence, reason } = body;

    if (!billName || !originalDate || !shiftedDate || !amountPence) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = buildExplainPrompt({
      billName,
      originalDate,
      shiftedDate,
      amountPence,
      feePence: feePence ?? 0,
      reason: reason ?? "Balance shortfall detected on the original due date",
    });

    const explanation = await callClaude(EXPLAIN_PROPOSAL_SYSTEM, [
      { role: "user", content: prompt },
    ]);

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Claude explain error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 },
    );
  }
}
