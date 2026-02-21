import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { TRADE_STATUS_LABELS, TRADE_STATUS_COLORS, formatCurrency, formatDate } from "@flowzo/shared";
import { TradeDetailClient } from "./trade-detail-client";
import type { TradeStatus } from "@flowzo/shared";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch trade data (DB stores GBP decimal)
  const { data: trade, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .eq("borrower_id", user.id)
    .single();

  if (error || !trade) {
    notFound();
  }

  const status = trade.status as TradeStatus;
  const statusLabel = TRADE_STATUS_LABELS[status] ?? trade.status;
  const statusColor = TRADE_STATUS_COLORS[status] ?? "text-gray-500";

  // Determine risk grade (default to B if missing)
  const riskGrade = trade.risk_grade ?? "B";

  // Convert GBP to pence for display (formatCurrency expects pence)
  const amountPence = Math.round(Number(trade.amount) * 100);
  const feePence = Math.round(Number(trade.fee) * 100);
  const shiftDays =
    trade.shift_days ??
    Math.round(
      (new Date(trade.new_due_date).getTime() -
        new Date(trade.original_due_date).getTime()) /
        (1000 * 60 * 60 * 24),
    );

  return (
    <div className="max-w-lg mx-auto">
      <TopBar title="Trade Details" showBack backHref="/borrower" />

      <div className="px-4 py-6 space-y-6">
        {/* Trade header */}
        <div className="rounded-2xl bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-extrabold text-navy">
              {formatCurrency(amountPence)}
            </h1>
            <span
              className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-warm-grey ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-3">
            {/* Dates */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Original date</span>
              <span className="font-semibold text-navy">
                {formatDate(trade.original_due_date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Shifted date</span>
              <span className="font-semibold text-navy">
                {formatDate(trade.new_due_date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Shift</span>
              <span className="font-semibold text-navy">
                {shiftDays} days
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Current fee</span>
              <span className="font-semibold text-navy">
                {formatCurrency(feePence)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Risk grade</span>
              <span className="font-semibold text-navy">{riskGrade}</span>
            </div>
          </div>
        </div>

        {/* Interactive components (bid slider + probability curve) */}
        {(status === "DRAFT" || status === "PENDING_MATCH") && (
          <TradeDetailClient
            trade={{
              id: trade.id,
              amount_pence: amountPence,
              fee_pence: feePence,
              shift_days: shiftDays,
              risk_grade: riskGrade,
            }}
          />
        )}

        {/* Matched / completed info */}
        {status === "MATCHED" && (
          <div className="rounded-2xl bg-white shadow-sm p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-success"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-navy">Matched!</h3>
            <p className="text-sm text-text-secondary mt-1">
              A lender has been found. Your bill shift is being processed.
            </p>
          </div>
        )}

        {status === "REPAID" && (
          <div className="rounded-2xl bg-white shadow-sm p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-success"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-navy">All done!</h3>
            <p className="text-sm text-text-secondary mt-1">
              This trade has been repaid successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
