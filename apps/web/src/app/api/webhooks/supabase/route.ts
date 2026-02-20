import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // TODO: Handle Supabase webhook events
  const body = await request.json();
  console.log("Supabase webhook received:", body.type);
  return NextResponse.json({ received: true });
}
