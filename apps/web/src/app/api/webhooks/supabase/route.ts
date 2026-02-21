import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.type as string | undefined;
  const record = body.record as Record<string, unknown> | undefined;

  // Log all webhook events for debugging
  console.log("Supabase webhook received:", eventType, record?.id ?? "");

  // Store webhook event for audit trail
  const supabase = createAdminClient();
  await supabase.from("webhook_events").upsert(
    {
      provider: "supabase",
      external_id: (record?.id as string) ?? crypto.randomUUID(),
      event_type: eventType ?? "unknown",
      payload: body,
      processed: true,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "provider,external_id" },
  );

  return NextResponse.json({ received: true });
}
