import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Generate TrueLayer auth URL with PKCE
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
