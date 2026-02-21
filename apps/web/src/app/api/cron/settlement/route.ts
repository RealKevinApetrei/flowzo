import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.functions.invoke("settle-trade", {
    body: {},
  });

  if (error) {
    return NextResponse.json(
      { error: "Settlement failed", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, settlement: data });
}
