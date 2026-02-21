import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { formatCurrency, formatDate } from "@flowzo/shared";
import { TradeDetailClient } from "./trade-detail-client";
import type { TradeStatus } from "@flowzo/shared";

const STEPS = ["Submitted", "Matching", "Funded", "Done"] as const;

function getStepIndex(status: TradeStatus): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "PENDING_MATCH":
      return 1;
    case "MATCHED":
    case "LIVE":
      return 2;
    case "REPAID":
      return 3;
    case "DEFAULTED":
    case "CANCELLED":
      return -1; // special state
    default:
      return 0;
  }
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
  const amountPence = Math.round(Number(trade.amount) * 100);
  const feePence = Math.round(Number(trade.fee) * 100);
  const shiftDays =
    trade.shift_days ??
    Math.round(
      (new Date(trade.new_due_date).getTime() -
        new Date(trade.original_due_date).getTime()) /
        (1000 * 60 * 60 * 24),
    );

  const currentStep = getStepIndex(status);
  const isFailed = status === "DEFAULTED" || status === "CANCELLED";

  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto">
      <TopBar title="Trade Details" showBack backHref="/borrower" />

      <div className="px-4 py-6 space-y-6">
        {/* Trade header */}
        <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
          <div className="text-center mb-5">
            <h1 className="text-2xl font-extrabold text-navy">
              {formatCurrency(amountPence)}
            </h1>
          </div>

          {/* Status tracker */}
          {!isFailed ? (
            <div className="flex items-center justify-between mb-6">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        i < currentStep
                          ? "bg-success text-white"
                          : i === currentStep
                            ? "bg-coral text-white"
                            : "bg-warm-grey text-text-muted"
                      }`}
                    >
                      {i < currentStep ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i === currentStep ? (
                        <span>{i + 1}</span>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${
                      i <= currentStep ? "text-navy" : "text-text-muted"
                    }`}>
                      {step}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full ${
                      i < currentStep ? "bg-success" : "bg-warm-grey"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 rounded-xl bg-danger/10 border border-danger/30 p-3 text-center">
              <span className="text-sm font-semibold text-danger">
                {status === "CANCELLED" ? "Cancelled" : "Defaulted"}
              </span>
            </div>
          )}

          {/* Trade details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Original date</span>
              <span className="font-semibold text-navy">
                {formatDate(trade.original_due_date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">New date</span>
              <span className="font-semibold text-navy">
                {formatDate(trade.new_due_date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Shift</span>
              <span className="font-semibold text-navy">{shiftDays} days</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Fee</span>
              <span className="font-semibold text-navy">
                {formatCurrency(feePence)}
              </span>
            </div>
          </div>
        </div>

        {/* Action area */}
        {(status === "DRAFT" || status === "PENDING_MATCH") && (
          <TradeDetailClient
            trade={{ id: trade.id, fee_pence: feePence }}
            status={status}
          />
        )}

        {status === "REPAID" && (
          <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
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
