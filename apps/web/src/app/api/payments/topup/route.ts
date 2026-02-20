import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Integrate with Stripe for pot top-ups
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
