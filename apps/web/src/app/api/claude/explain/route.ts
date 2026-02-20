import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // TODO: Call Claude API to explain proposal
  const body = await request.json();
  return NextResponse.json({
    explanation: `This is a placeholder explanation for proposal ${body.proposalId}. The AI agent will explain why this bill shift is recommended.`,
  });
}
