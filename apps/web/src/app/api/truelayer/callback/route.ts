import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode } from "@/lib/truelayer/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(`${origin}/onboarding?error=no_code`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Verify state matches what we stored
  const storedState = user.user_metadata?.truelayer_state;
  if (state && storedState && state !== storedState) {
    return NextResponse.redirect(`${origin}/onboarding?error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code, origin);

    // Store bank connection in database (truelayer_token is a jsonb column)
    const { data: connection, error } = await supabase
      .from("bank_connections")
      .insert({
        user_id: user.id,
        provider: "truelayer",
        truelayer_token: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
        },
        status: "active",
      })
      .select("id")
      .single();

    if (error || !connection) {
      console.error("Failed to store bank connection:", error);
      return NextResponse.redirect(`${origin}/onboarding?error=storage_failed`);
    }

    // Mark onboarding as completed
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    // Clear the state token
    await supabase.auth.updateUser({
      data: { truelayer_state: null },
    });

    // Store sync_pending flag so borrower page can show loading state
    await supabase
      .from("bank_connections")
      .update({ status: "syncing" })
      .eq("id", connection.id);

    // Fire pipeline — await the call to ensure it reaches the server,
    // but don't block the redirect on the full pipeline completing.
    // The pipeline route itself handles the 3-step orchestration.
    try {
      const pipelineRes = await fetch(`${origin}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          connection_id: connection.id,
        }),
      });

      if (!pipelineRes.ok) {
        console.error("Pipeline returned error:", pipelineRes.status);
        // Mark connection as needing retry
        await supabase
          .from("bank_connections")
          .update({ status: "sync_failed" })
          .eq("id", connection.id);
      } else {
        // Pipeline succeeded — mark active
        await supabase
          .from("bank_connections")
          .update({ status: "active" })
          .eq("id", connection.id);
      }
    } catch (err) {
      console.error("Pipeline call failed:", err);
      await supabase
        .from("bank_connections")
        .update({ status: "sync_failed" })
        .eq("id", connection.id);
    }

    return NextResponse.redirect(`${origin}/borrower`);
  } catch (error) {
    console.error("TrueLayer token exchange failed:", error);
    return NextResponse.redirect(`${origin}/onboarding?error=token_exchange_failed`);
  }
}
