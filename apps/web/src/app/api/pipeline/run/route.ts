import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { user_id, connection_id } = await request.json();

    if (!user_id || !connection_id) {
      return NextResponse.json(
        { error: "user_id and connection_id are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const results: Record<string, unknown> = {};

    // Step 1: Sync banking data
    const { data: syncData, error: syncError } =
      await supabase.functions.invoke("sync-banking-data", {
        body: { user_id, connection_id },
      });

    if (syncError) {
      return NextResponse.json(
        {
          error: "Pipeline failed at sync-banking-data",
          detail: syncError.message,
          results,
        },
        { status: 502 },
      );
    }
    results.sync = syncData;

    // Step 2: Run forecast
    const { data: forecastData, error: forecastError } =
      await supabase.functions.invoke("run-forecast", {
        body: { user_id },
      });

    if (forecastError) {
      return NextResponse.json(
        {
          error: "Pipeline failed at run-forecast",
          detail: forecastError.message,
          results,
        },
        { status: 502 },
      );
    }
    results.forecast = forecastData;

    // Step 3: Generate proposals
    const { data: proposalsData, error: proposalsError } =
      await supabase.functions.invoke("generate-proposals", {
        body: { user_id },
      });

    if (proposalsError) {
      return NextResponse.json(
        {
          error: "Pipeline failed at generate-proposals",
          detail: proposalsError.message,
          results,
        },
        { status: 502 },
      );
    }
    results.proposals = proposalsData;

    return NextResponse.json({
      success: true,
      pipeline: "sync → forecast → proposals",
      results,
    });
  } catch (err) {
    console.error("Pipeline orchestration error:", err);
    return NextResponse.json(
      {
        error: "Pipeline orchestration failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
