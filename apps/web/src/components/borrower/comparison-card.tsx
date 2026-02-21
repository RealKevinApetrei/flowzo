"use client";

import { formatCurrency } from "@flowzo/shared";

interface ComparisonProps {
  withoutFlowzo: {
    overdraftFeesPence: number;
    failedPaymentsPence: number;
    missedBillCount: number;
  };
  withFlowzo: {
    flowzoFeePence: number;
    billsShifted: number;
    savedPence: number;
  };
  healthyDays: number;
  totalForecastDays: number;
  upcomingObligations: number;
  overdraftProbability: number;
}

export function ComparisonCard({
  withoutFlowzo,
  withFlowzo,
  healthyDays,
  totalForecastDays,
  upcomingObligations,
  overdraftProbability,
}: ComparisonProps) {
  const totalWithout =
    withoutFlowzo.overdraftFeesPence + withoutFlowzo.failedPaymentsPence;
  const totalWith = withFlowzo.flowzoFeePence;
  const hasDangerDays = withoutFlowzo.missedBillCount > 0;

  // Calculate bar widths proportionally
  const maxValue = Math.max(totalWithout, totalWith, 1);
  const withoutWidth = Math.round((totalWithout / maxValue) * 100);
  const withWidth = Math.round((totalWith / maxValue) * 100);

  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
      <h2 className="text-lg font-bold text-navy mb-4">Financial Health</h2>

      {/* Health stats — always visible */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-navy">
            {healthyDays}
            <span className="text-sm font-semibold text-text-muted">
              /{totalForecastDays}
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
            Safe days
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-navy">
            {upcomingObligations}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
            Bills tracked
          </p>
        </div>
        <div className="text-center">
          <p
            className={`text-2xl font-extrabold ${
              overdraftProbability > 20
                ? "text-danger"
                : overdraftProbability > 0
                  ? "text-warning"
                  : "text-success"
            }`}
          >
            {overdraftProbability}%
          </p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
            Overdraft risk
          </p>
        </div>
      </div>

      {hasDangerDays ? (
        <>
          {/* Comparison section — only when danger days exist */}
          <div className="grid grid-cols-2 gap-4">
            {/* Without Flowzo */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-danger" />
                <span className="text-xs font-semibold text-danger">
                  Without Flowzo
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    Overdraft fees
                  </p>
                  <p className="text-sm font-bold text-navy">
                    {formatCurrency(withoutFlowzo.overdraftFeesPence)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    Failed payments
                  </p>
                  <p className="text-sm font-bold text-navy">
                    {formatCurrency(withoutFlowzo.failedPaymentsPence)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    At-risk bills
                  </p>
                  <p className="text-sm font-bold text-navy">
                    {withoutFlowzo.missedBillCount}
                  </p>
                </div>
              </div>
            </div>

            {/* With Flowzo */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-xs font-semibold text-success">
                  With Flowzo
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    Flowzo fee
                  </p>
                  <p className="text-sm font-bold text-navy">
                    {formatCurrency(withFlowzo.flowzoFeePence)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    Bills shifted
                  </p>
                  <p className="text-sm font-bold text-navy">
                    {withFlowzo.billsShifted}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    Total saved
                  </p>
                  <p className="text-sm font-bold text-success">
                    {formatCurrency(withFlowzo.savedPence)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison bars */}
          <div className="mt-5 space-y-2">
            <div>
              <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                <span>Without</span>
                <span>{formatCurrency(totalWithout)}</span>
              </div>
              <div className="h-3 bg-warm-grey rounded-full overflow-hidden">
                <div
                  className="h-full bg-danger/70 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${withoutWidth}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                <span>With Flowzo</span>
                <span>{formatCurrency(totalWith)}</span>
              </div>
              <div className="h-3 bg-warm-grey rounded-full overflow-hidden">
                <div
                  className="h-full bg-success/70 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(withWidth, 3)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Savings callout */}
          {withFlowzo.savedPence > 0 && (
            <div className="mt-4 rounded-xl bg-coral/5 border border-coral/20 p-3.5 text-center">
              <p className="text-xs text-text-secondary">You save</p>
              <p className="text-xl font-extrabold text-coral mt-0.5">
                {formatCurrency(withFlowzo.savedPence)}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Healthy state — no danger days */
        <div className="rounded-xl bg-success/5 border border-success/15 p-4 text-center">
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
          <p className="text-sm font-bold text-navy">
            Your balance stays healthy
          </p>
          <p className="text-xs text-text-secondary mt-1">
            No danger days in the next {totalForecastDays} days.{" "}
            {upcomingObligations > 0 &&
              `We're tracking ${upcomingObligations} upcoming bill${upcomingObligations !== 1 ? "s" : ""}.`}
          </p>
        </div>
      )}
    </div>
  );
}
