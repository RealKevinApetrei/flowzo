import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/onboarding?error=no_code", request.url));
  }

  // TODO: Exchange code for TrueLayer tokens, store in bank_connections
  return NextResponse.redirect(new URL("/onboarding?success=true", request.url));
}
