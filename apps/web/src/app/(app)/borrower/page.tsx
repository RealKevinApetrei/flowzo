import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { CalendarHeatmap } from "@/components/borrower/calendar-heatmap";
import { SuggestionFeed } from "@/components/borrower/suggestion-feed";
import { ComparisonCard } from "@/components/borrower/comparison-card";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function BorrowerHomePage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, risk_grade")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? "there";

  // Fetch 30-day forecast for the user
  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  const { data: rawForecasts } = await supabase
    .from("forecasts")
    .select("forecast_date, projected_balance, danger_flag, confidence_low")
    .eq("user_id", user.id)
    .gte("forecast_date", today.toISOString().split("T")[0])
    .lte("forecast_date", thirtyDaysLater.toISOString().split("T")[0])
    .order("forecast_date", { ascending: true });

  // Map to the heatmap component's expected prop shape
  const forecasts = (rawForecasts ?? []).map((f) => ({
    forecast_date: f.forecast_date,
    projected_balance_pence: f.projected_balance,
    is_danger: f.danger_flag,
    confidence_low_pence: f.confidence_low ?? f.projected_balance,
  }));

  // Calculate comparison data from forecasts and proposals
  const dangerDays = forecasts.filter((f) => f.is_danger);
  const totalNegativeBalance = dangerDays.reduce(
    (sum, f) => sum + Math.abs(Math.min(f.projected_balance_pence, 0)),
    0,
  );

  // Estimate overdraft fees: ~1p/day per pound overdrawn is typical UK rate
  const estimatedOverdraftFees = Math.round(totalNegativeBalance * 0.01 * dangerDays.length);
  // Estimate failed payment charges (~25 GBP each)
  const failedPaymentCharge = 2500; // 25 GBP in pence
  const estimatedFailedPayments = dangerDays.length * failedPaymentCharge;

  // Fetch accepted/active proposals to estimate Flowzo benefit
  const { data: activeProposals } = await supabase
    .from("agent_proposals")
    .select("payload, status")
    .eq("user_id", user.id)
    .in("status", ["ACCEPTED", "PENDING"]);

  const proposals = activeProposals ?? [];
  const totalFlowzoFee = proposals
    .filter((p) => p.status === "ACCEPTED")
    .reduce((sum, p) => sum + (p.payload?.fee_pence ?? 0), 0);
  const billsShifted = proposals.filter((p) => p.status === "ACCEPTED").length;

  const totalWithout = estimatedOverdraftFees + estimatedFailedPayments;
  const savedPence = Math.max(0, totalWithout - totalFlowzoFee);

  const comparisonData = {
    withoutFlowzo: {
      overdraftFeesPence: estimatedOverdraftFees,
      failedPaymentsPence: estimatedFailedPayments,
      missedBillCount: dangerDays.length,
    },
    withFlowzo: {
      flowzoFeePence: totalFlowzoFee,
      billsShifted,
      savedPence,
    },
  };

  return (
    <div className="max-w-lg mx-auto">
      <TopBar title="Flowzo" />

      <div className="px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-extrabold text-navy">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Here&apos;s your cash flow overview
          </p>
        </div>

        {/* Calendar Heatmap */}
        <section>
          <CalendarHeatmap forecasts={forecasts} />
        </section>

        {/* AI Suggestions */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Suggestions</h2>
          <SuggestionFeed userId={user.id} />
        </section>

        {/* Comparison Card */}
        <section>
          <ComparisonCard {...comparisonData} />
        </section>
      </div>
    </div>
  );
}
