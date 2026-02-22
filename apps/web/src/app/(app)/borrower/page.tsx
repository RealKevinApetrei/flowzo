import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { SuggestionFeed } from "@/components/borrower/suggestion-feed";
import { DangerSummary } from "@/components/borrower/danger-summary";
import { UpcomingTransactions } from "@/components/borrower/upcoming-transactions";
import { ActiveShifts } from "@/components/borrower/active-shifts";
import { FirstVisitBanner } from "@/components/shared/first-visit-banner";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function demoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

// Demo data for calendar when no real forecasts/obligations exist
function buildDemoForecasts() {
  // Simulate a realistic 30-day cash flow: starts ~£1,200, salary on day 5, dips around bills
  const baseBalances = [
    120000, 115000, 108000, 102000, 96000,   // days 0-4: declining
    245000, 243000, 240000, 235000, 228000,  // day 5: payday +£1,500, then spend
    222000, 218000, 195000, 190000, 185000,  // day 12: rent -£25k
    180000, 175000, 168000, 160000, 155000,  // steady decline
    148000, 140000, 135000, 128000, 120000,  // getting tight
    115000, 108000, 95000,  85000,  78000,   // day 27-29: danger zone
  ];
  const incomes =  [0,0,0,0,0, 150000,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0];
  const outgoings = [0,5000,7000,6000,6000, 0,2000,3000,5000,7000, 6000,4000,25000,5000,5000, 5000,5000,7000,8000,5000, 7000,8000,5000,7000,8000, 5000,7000,13000,10000,7000];

  return baseBalances.map((bal, i) => ({
    forecast_date: demoDate(i),
    projected_balance_pence: bal,
    is_danger: bal < 10000,
    confidence_low_pence: Math.round(bal * 0.85),
    confidence_high_pence: Math.round(bal * 1.15),
    income_expected_pence: incomes[i],
    outgoings_expected_pence: outgoings[i],
  }));
}

function buildDemoObligations() {
  return [
    { id: "demo-ob-1", name: "Netflix", amount_pence: 1599, frequency: "MONTHLY", next_expected: demoDate(2), confidence: 0.95, is_essential: false, category: "Entertainment" },
    { id: "demo-ob-2", name: "Spotify", amount_pence: 1099, frequency: "MONTHLY", next_expected: demoDate(2), confidence: 0.9, is_essential: false, category: "Entertainment" },
    { id: "demo-ob-3", name: "Phone Bill", amount_pence: 3500, frequency: "MONTHLY", next_expected: demoDate(4), confidence: 0.85, is_essential: true, category: "Utilities" },
    { id: "demo-ob-4", name: "Rent", amount_pence: 95000, frequency: "MONTHLY", next_expected: demoDate(12), confidence: 0.99, is_essential: true, category: "Housing" },
    { id: "demo-ob-5", name: "Council Tax", amount_pence: 14200, frequency: "MONTHLY", next_expected: demoDate(12), confidence: 0.95, is_essential: true, category: "Housing" },
    { id: "demo-ob-6", name: "Energy Bill", amount_pence: 8900, frequency: "MONTHLY", next_expected: demoDate(17), confidence: 0.8, is_essential: true, category: "Utilities" },
    { id: "demo-ob-7", name: "Water Bill", amount_pence: 4200, frequency: "MONTHLY", next_expected: demoDate(17), confidence: 0.75, is_essential: true, category: "Utilities" },
    { id: "demo-ob-8", name: "Gym", amount_pence: 2999, frequency: "MONTHLY", next_expected: demoDate(22), confidence: 0.9, is_essential: false, category: "Health" },
    { id: "demo-ob-9", name: "Car Insurance", amount_pence: 6500, frequency: "MONTHLY", next_expected: demoDate(27), confidence: 0.95, is_essential: true, category: "Transport" },
    { id: "demo-ob-10", name: "Internet", amount_pence: 3200, frequency: "MONTHLY", next_expected: demoDate(27), confidence: 0.85, is_essential: true, category: "Utilities" },
  ];
}

function buildDemoShifts() {
  return [
    {
      id: "demo-shift-1", obligation_name: "Energy Bill", amount_pence: 8900, fee_pence: 71,
      original_due_date: demoDate(-3), new_due_date: demoDate(8), shift_days: 11,
      status: "LIVE", matched_at: demoDate(-2), live_at: demoDate(-2),
    },
    {
      id: "demo-shift-2", obligation_name: "Council Tax", amount_pence: 14200, fee_pence: 142,
      original_due_date: demoDate(-1), new_due_date: demoDate(13), shift_days: 14,
      status: "LIVE", matched_at: demoDate(-1), live_at: demoDate(0),
    },
  ];
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

  // Fetch upcoming obligations (next 30 days — full calendar range)
  const { data: obligations } = await supabase
    .from("obligations")
    .select("id, name, amount, frequency, next_expected, confidence, is_essential, category, merchant_name")
    .eq("user_id", user.id)
    .eq("active", true)
    .gte("next_expected", today.toISOString().split("T")[0])
    .lte("next_expected", thirtyDaysLater.toISOString().split("T")[0])
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

  // Fetch active trades (MATCHED or LIVE) for the borrower
  const { data: activeTrades } = await supabase
    .from("trades")
    .select("id, amount, fee, original_due_date, new_due_date, shift_days, status, matched_at, live_at, obligations(name)")
    .eq("borrower_id", user.id)
    .in("status", ["MATCHED", "LIVE"])
    .order("new_due_date", { ascending: true });

  const activeShifts = (activeTrades ?? []).map((t) => {
    const obligation = Array.isArray(t.obligations) ? t.obligations[0] : t.obligations;
    return {
      id: t.id,
      obligation_name: obligation?.name ?? "Bill",
      amount_pence: Math.round(Number(t.amount) * 100),
      fee_pence: Math.round(Number(t.fee) * 100),
      original_due_date: t.original_due_date,
      new_due_date: t.new_due_date,
      shift_days: Number(t.shift_days),
      status: t.status as string,
      matched_at: t.matched_at,
      live_at: t.live_at,
    };
  });

  // Use demo data if no real data exists (for vivid calendar display)
  const isDemo = forecasts.length === 0 && upcomingObligations.length === 0 && activeShifts.length === 0;
  const displayForecasts = forecasts.length > 0 ? forecasts : buildDemoForecasts();
  const displayObligations = upcomingObligations.length > 0 ? upcomingObligations : buildDemoObligations();
  const displayShifts = activeShifts.length > 0 ? activeShifts : buildDemoShifts();

  const dangerCount = displayForecasts.filter((f) => f.is_danger).length;
  const hasData = displayForecasts.length > 0;

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

        {/* Demo data notice */}
        {isDemo && hasData && (
          <p className="text-xs text-text-muted text-center">Sample data -- connect your bank for real forecasts</p>
        )}

        {/* Danger Summary + Calendar */}
        {hasData && (
          <section>
            <DangerSummary dangerCount={dangerCount} forecasts={displayForecasts} repayments={displayShifts} obligations={displayObligations} />
          </section>
        )}

        {/* Active Shifts — current borrowing */}
        {displayShifts.length > 0 && (
          <ActiveShifts shifts={displayShifts} />
        )}

        {/* Upcoming Transactions */}
        {displayObligations.length > 0 && (
          <section>
            <UpcomingTransactions obligations={displayObligations} />
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
