import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode } from "@/lib/truelayer/auth";
import { resolveOrigin } from "@/lib/truelayer/config";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = resolveOrigin(request);

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
        status: "syncing",
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

    // Run pipeline in background AFTER redirect (prevents Vercel timeout)
    const userId = user.id;
    const connectionId = connection.id;
    after(async () => {
      const admin = createAdminClient();
      try {
        console.log(`[Pipeline] Starting background sync for user ${userId}`);

        const { error: syncError } = await admin.functions.invoke("sync-banking-data", {
          body: { user_id: userId, connection_id: connectionId },
        });
        if (syncError) {
          console.error("Pipeline sync-banking-data failed:", syncError.message);
          await admin.from("bank_connections").update({ status: "sync_failed" }).eq("id", connectionId);
          return;
        }

        // Compute borrower features (non-blocking)
        const { error: featError } = await admin.functions.invoke("compute-borrower-features", {
          body: { user_id: userId },
        });
        if (featError) {
          console.warn("Feature computation failed (continuing):", featError.message);
        }

        const { error: forecastError } = await admin.functions.invoke("run-forecast", {
          body: { user_id: userId },
        });
        if (forecastError) {
          console.error("Pipeline run-forecast failed:", forecastError.message);
          await admin.from("bank_connections").update({ status: "sync_failed" }).eq("id", connectionId);
          return;
        }

        const { error: proposalsError } = await admin.functions.invoke("generate-proposals", {
          body: { user_id: userId },
        });
        if (proposalsError) {
          console.error("Pipeline generate-proposals failed:", proposalsError.message);
          // Still mark active — sync + forecast succeeded
        }

        await admin.from("bank_connections").update({ status: "active" }).eq("id", connectionId);
        console.log(`[Pipeline] Background sync completed for user ${userId}`);
      } catch (err) {
        console.error("Pipeline call failed:", err);
        await admin.from("bank_connections").update({ status: "sync_failed" }).eq("id", connectionId);
      }
    });

    // Redirect immediately — pipeline runs in background
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
