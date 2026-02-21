import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET env var is not set");
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET not set" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all users with active bank connections
  const { data: connections, error: connErr } = await supabase
    .from("bank_connections")
    .select("user_id")
    .eq("status", "active");

  if (connErr) {
    return NextResponse.json(
      { error: "Failed to fetch connections", detail: connErr.message },
      { status: 500 },
    );
  }

  const uniqueUserIds = [...new Set(connections?.map((c) => c.user_id) ?? [])];
  const results: { user_id: string; success: boolean; error?: string }[] = [];

  for (const userId of uniqueUserIds) {
    const { error } = await supabase.functions.invoke("run-forecast", {
      body: { user_id: userId },
    });

    results.push({
      user_id: userId,
      success: !error,
      error: error?.message,
    });
  }

  return NextResponse.json({
    success: true,
    users_processed: results.length,
    results,
  });
}
