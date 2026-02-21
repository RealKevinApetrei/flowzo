import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { SuggestionFeed } from "@/components/borrower/suggestion-feed";
import { DangerSummary } from "@/components/borrower/danger-summary";
import { UpcomingTransactions } from "@/components/borrower/upcoming-transactions";
import { FirstVisitBanner } from "@/components/shared/first-visit-banner";

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

  // Map to the heatmap component's expected prop shape (DB stores GBP -> convert to pence)
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

  // Fetch upcoming obligations (next 14 days)
  const fourteenDaysLater = new Date(today);
  fourteenDaysLater.setDate(today.getDate() + 14);

  const { data: obligations } = await supabase
    .from("obligations")
    .select("id, name, amount, frequency, next_expected, confidence, is_essential, category, merchant_name")
    .eq("user_id", user.id)
    .eq("active", true)
    .gte("next_expected", today.toISOString().split("T")[0])
    .lte("next_expected", fourteenDaysLater.toISOString().split("T")[0])
    .order("next_expected", { ascending: true });

  const upcomingObligations = (obligations ?? []).map((o) => ({
    id: o.id,
    name: o.name ?? o.merchant_name ?? "Bill",
    amount_pence: Math.round(Number(o.amount) * 100),
    frequency: o.frequency ?? "MONTHLY",
    next_expected: o.next_expected,
    confidence: Number(o.confidence ?? 0.5),
    is_essential: o.is_essential ?? true,
    category: o.category,
  }));

  const dangerCount = forecasts.filter((f) => f.is_danger).length;
  const hasData = forecasts.length > 0;

  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto">
      <TopBar title="Flowzo" />

      <div className="px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-extrabold text-navy">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Here&apos;s what needs your attention
          </p>
        </div>

        <FirstVisitBanner
          storageKey="flowzo-bills-intro-seen"
          message="This is where you manage your bills and see your cash forecast."
        />

        {/* Connect bank banner -- shown when no data */}
        {!hasData && (
          <div className="rounded-2xl bg-coral/5 border border-coral/20 p-5 text-center space-y-3">
            <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-navy">Connect your bank to get started</h3>
            <p className="text-sm text-text-secondary">
              We need your transaction data to forecast your cash flow and suggest bill shifts.
            </p>
            <Link
              href="/onboarding"
              className="inline-block bg-coral text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-coral-dark transition-colors active:scale-95"
            >
              Connect Bank
            </Link>
          </div>
        )}

        {/* Danger Summary + Calendar */}
        {hasData && (
          <section>
            <DangerSummary dangerCount={dangerCount} forecasts={forecasts} />
          </section>
        )}

        {/* Upcoming Transactions */}
        {upcomingObligations.length > 0 && (
          <section>
            <UpcomingTransactions obligations={upcomingObligations} />
          </section>
        )}

        {/* AI Suggestions -- primary actionable content */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Suggestions</h2>
          <SuggestionFeed userId={user.id} />
        </section>
      </div>
    </div>
  );
}
