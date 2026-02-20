"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/truelayer/auth";

export async function startBankConnection() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Store state in user metadata for verification on callback
  await supabase.auth.updateUser({
    data: { truelayer_state: state },
  });

  const authUrl = buildAuthUrl(state);
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
