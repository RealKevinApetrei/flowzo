import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/truelayer/auth";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Store state in user metadata for verification on callback
  await supabase.auth.updateUser({
    data: { truelayer_state: state },
  });

  const authUrl = buildAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
