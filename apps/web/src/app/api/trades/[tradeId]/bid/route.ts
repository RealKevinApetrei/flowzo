import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const uuidSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tradeId: string }> },
) {
  const { tradeId } = await params;

  // Validate tradeId is a valid UUID
  const parsed = uuidSchema.safeParse(tradeId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trade ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const feePence = Number(body.fee_pence);

    if (!feePence || feePence < 0) {
      return NextResponse.json(
        { error: "Invalid fee_pence value" },
        { status: 400 },
      );
    }

    // Verify the trade belongs to this user and is in a biddable state
    const { data: trade, error: fetchErr } = await supabase
      .from("trades")
      .select("id, status, borrower_id")
      .eq("id", tradeId)
      .eq("borrower_id", user.id)
      .in("status", ["DRAFT", "PENDING_MATCH"])
      .single();

    if (fetchErr || !trade) {
      return NextResponse.json(
        { error: "Trade not found or not available for bidding" },
        { status: 404 },
      );
    }

    // Update the fee (convert pence to GBP for DB) and submit to PENDING_MATCH
    const feeGbp = feePence / 100;
    const { error: updateErr } = await supabase
      .from("trades")
      .update({ fee: feeGbp, status: "PENDING_MATCH" })
      .eq("id", tradeId);

    if (updateErr) {
      return NextResponse.json(
        { error: `Failed to update trade: ${updateErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, trade_id: tradeId });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
