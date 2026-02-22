import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();

  const { data, error } = await supabase.functions.invoke("settle-trade", {
    body: body.trade_id ? { trade_id: body.trade_id } : {},
  });

  if (error) {
    return NextResponse.json(
      { error: "Settlement failed", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, settlement: data });
}
