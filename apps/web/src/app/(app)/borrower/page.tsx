import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { BalanceCard } from "@/components/borrower/balance-card";
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

  // Fetch account balances for hero card
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance_current")
    .eq("user_id", user.id);

  const totalBalancePence = (accounts ?? []).reduce(
    (sum, a) => sum + Math.round(Number(a.balance_current) * 100),
    0,
  );
  const accountCount = accounts?.length ?? 0;

  // Fetch 30-day forecast for the user (with enhanced fields)
  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  const { data: rawForecasts } = await supabase
    .from("forecasts")
    .select(
      "forecast_date, projected_balance, danger_flag, confidence_low, confidence_high, income_expected, outgoings_expected",
    )
    .eq("user_id", user.id)
    .gte("forecast_date", today.toISOString().split("T")[0])
    .lte("forecast_date", thirtyDaysLater.toISOString().split("T")[0])
    .order("forecast_date", { ascending: true });

  // Fetch active obligations for calendar tooltip
  const { data: obligations } = await supabase
    .from("obligations")
    .select("id, name, amount, expected_day, merchant_name, next_expected")
    .eq("user_id", user.id)
    .eq("active", true);

  // Map to the heatmap component's expected prop shape (DB stores GBP → convert to pence)
  const forecasts = (rawForecasts ?? []).map((f) => ({
    forecast_date: f.forecast_date,
    projected_balance_pence: Math.round(Number(f.projected_balance) * 100),
    is_danger: f.danger_flag,
    confidence_low_pence: Math.round(
      Number(f.confidence_low ?? f.projected_balance) * 100,
    ),
    confidence_high_pence: Math.round(
      Number(f.confidence_high ?? Number(f.projected_balance) * 1.2) * 100,
    ),
    income_expected_pence: Math.round(Number(f.income_expected ?? 0) * 100),
    outgoings_expected_pence: Math.round(
      Number(f.outgoings_expected ?? 0) * 100,
    ),
  }));

  const obligationsMapped = (obligations ?? []).map((o) => ({
    id: o.id,
    name: o.name ?? o.merchant_name ?? "Bill",
    amount_pence: Math.round(Number(o.amount) * 100),
    expected_day: o.expected_day,
    next_expected: o.next_expected,
  }));

  // Calculate comparison data from forecasts and proposals
  const dangerDays = forecasts.filter((f) => f.is_danger);
  const totalNegativeBalance = dangerDays.reduce(
    (sum, f) => sum + Math.abs(Math.min(f.projected_balance_pence, 0)),
    0,
  );

  // Estimate overdraft fees: ~1p/day per pound overdrawn is typical UK rate
  const estimatedOverdraftFees = Math.round(
    totalNegativeBalance * 0.01 * dangerDays.length,
  );
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
  const billsShifted = proposals.filter(
    (p) => p.status === "ACCEPTED",
  ).length;

  const totalWithout = estimatedOverdraftFees + estimatedFailedPayments;
  const savedPence = Math.max(0, totalWithout - totalFlowzoFee);

  // Compute additional health metrics
  const healthyDays = forecasts.filter((f) => !f.is_danger).length;
  const overdraftProbability = Math.max(
    ...forecasts.map((f) => {
      if (f.confidence_low_pence >= 0) return 0;
      const range = f.confidence_high_pence - f.confidence_low_pence;
      if (range <= 0) return f.projected_balance_pence < 0 ? 95 : 0;
      return Math.min(
        Math.round((Math.abs(f.confidence_low_pence) / range) * 100),
        99,
      );
    }),
    0,
  );

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
    healthyDays,
    totalForecastDays: forecasts.length,
    upcomingObligations: obligationsMapped.length,
    overdraftProbability,
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

        {/* Hero Balance Card */}
        {accountCount > 0 && (
          <section>
            <BalanceCard
              totalBalancePence={totalBalancePence}
              accountCount={accountCount}
            />
          </section>
        )}

        {/* Calendar Heatmap */}
        <section>
          <CalendarHeatmap
            forecasts={forecasts}
            obligations={obligationsMapped}
          />
        </section>

        {/* AI Suggestions */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Suggestions</h2>
          <SuggestionFeed userId={user.id} />
        </section>

        {/* Financial Health Card */}
        <section>
          <ComparisonCard {...comparisonData} />
        </section>
      </div>
    </div>
  );
}
