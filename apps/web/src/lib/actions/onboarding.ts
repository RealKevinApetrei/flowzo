"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/truelayer/auth";

export async function startBankConnection() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Derive origin from the incoming request headers
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Store state in user metadata for verification on callback
  await supabase.auth.updateUser({
    data: { truelayer_state: state },
  });

  const authUrl = buildAuthUrl(state, origin);
  redirect(authUrl);
}

export async function skipOnboarding() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  redirect("/borrower");
}
