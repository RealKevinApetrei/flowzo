import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode } from "@/lib/truelayer/auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log(`[TrueLayer Callback] origin=${origin}, redirect_uri=${origin}/api/truelayer/callback`);

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

    // Mark as syncing
    await supabase
      .from("bank_connections")
      .update({ status: "syncing" })
      .eq("id", connection.id);

    // Run pipeline directly using admin client (avoids cookie/auth issues on serverless)
    const admin = createAdminClient();
    try {
      // Step 1: Sync banking data
      const { error: syncError } = await admin.functions.invoke("sync-banking-data", {
        body: { user_id: user.id, connection_id: connection.id },
      });

      if (syncError) {
        console.error("Pipeline sync-banking-data failed:", syncError.message);
        await admin.from("bank_connections").update({ status: "sync_failed" }).eq("id", connection.id);
        return NextResponse.redirect(`${origin}/borrower`);
      }

      // Step 1.5: Compute borrower features (non-blocking)
      const { error: featError } = await admin.functions.invoke("compute-borrower-features", {
        body: { user_id: user.id },
      });
      if (featError) {
        console.warn("Feature computation failed (continuing):", featError.message);
      }

      // Step 2: Run forecast
      const { error: forecastError } = await admin.functions.invoke("run-forecast", {
        body: { user_id: user.id },
      });

      if (forecastError) {
        console.error("Pipeline run-forecast failed:", forecastError.message);
        await admin.from("bank_connections").update({ status: "sync_failed" }).eq("id", connection.id);
        return NextResponse.redirect(`${origin}/borrower`);
      }

      // Step 3: Generate proposals
      const { error: proposalsError } = await admin.functions.invoke("generate-proposals", {
        body: { user_id: user.id },
      });

      if (proposalsError) {
        console.error("Pipeline generate-proposals failed:", proposalsError.message);
        // Still mark active — sync + forecast succeeded
      }

      // Pipeline succeeded
      await admin.from("bank_connections").update({ status: "active" }).eq("id", connection.id);
    } catch (err) {
      console.error("Pipeline call failed:", err);
      await admin.from("bank_connections").update({ status: "sync_failed" }).eq("id", connection.id);
    }

    return NextResponse.redirect(`${origin}/borrower`);
  } catch (error) {
    console.error(
      "[TrueLayer Callback] Token exchange failed:",
      error instanceof Error ? error.message : error,
      `\n  origin: ${origin}`,
      `\n  code present: ${!!code}`,
    );
    return NextResponse.redirect(`${origin}/onboarding?error=token_exchange_failed`);
  }
}
