import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { SuggestionFeed } from "@/components/borrower/suggestion-feed";
import { DangerSummary } from "@/components/borrower/danger-summary";

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

  const dangerCount = forecasts.filter((f) => f.is_danger).length;

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
            Here&apos;s what needs your attention
          </p>
        </div>

        {/* Danger Summary -- collapsible, expands to full heatmap */}
        <section>
          <DangerSummary dangerCount={dangerCount} forecasts={forecasts} />
        </section>

        {/* AI Suggestions -- primary actionable content */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Suggestions</h2>
          <SuggestionFeed userId={user.id} />
        </section>
      </div>
    </div>
  );
}
