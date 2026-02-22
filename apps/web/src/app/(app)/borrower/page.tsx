import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { SuggestionFeed } from "@/components/borrower/suggestion-feed";
import { DangerSummary } from "@/components/borrower/danger-summary";
import { UpcomingTransactions, type CashflowItem } from "@/components/borrower/upcoming-transactions";
import { ActiveShifts } from "@/components/borrower/active-shifts";
import { FirstVisitBanner } from "@/components/shared/first-visit-banner";
import { SyncStatusBanner } from "@/components/borrower/sync-status-banner";
import { ClaudeInsights } from "@/components/borrower/claude-insights";
import { BillPriority } from "@/components/borrower/bill-priority";
import { WhatIfSimulator } from "@/components/borrower/what-if-simulator";

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
  // Generate 180-day cashflow with repeating monthly pattern:
  // payday on 25th, rent on 1st, bills scattered, gradual spend-down
  const results: Array<{
    forecast_date: string;
    projected_balance_pence: number;
    is_danger: boolean;
    confidence_low_pence: number;
    confidence_high_pence: number;
    income_expected_pence: number;
    outgoings_expected_pence: number;
  }> = [];

  let balance = 42000; // start at £420

  for (let i = 0; i < 180; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dom = d.getDate();

    let income = 0;
    let outgoings = 0;

    // Payday on 25th: +£1,500
    if (dom === 25) income = 150000;

    // Rent on 1st: -£950
    if (dom === 1) outgoings += 95000;
    // Energy+water on 15th: -£130
    if (dom === 15) outgoings += 13000;
    // Council tax on 5th: -£142
    if (dom === 5) outgoings += 14200;
    // Subscriptions on 10th: -£45
    if (dom === 10) outgoings += 4500;
    // Daily irregular spend: ~£15/day
    outgoings += 1500;

    balance = balance - outgoings + income;

    const uncertainty = 10 * Math.sqrt(i + 1);
    const uncertaintyPence = Math.round(uncertainty * 100);

    results.push({
      forecast_date: demoDate(i),
      projected_balance_pence: balance,
      is_danger: balance < 10000,
      confidence_low_pence: balance - uncertaintyPence,
      confidence_high_pence: balance + uncertaintyPence,
      income_expected_pence: income,
      outgoings_expected_pence: outgoings,
    });
  }

  return results;
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

  // Fetch user profile (including credit risk data)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, risk_grade, credit_score, max_trade_amount, max_active_trades, eligible_to_borrow, last_scored_at")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? "there";
  const riskGrade = (profile?.risk_grade as string | null) ?? null;
  const creditScore = profile?.credit_score as number | null;
  const maxTradeAmount = Number(profile?.max_trade_amount ?? 75);
  const maxActiveTrades = Number(profile?.max_active_trades ?? 1);
  const eligibleToBorrow = profile?.eligible_to_borrow as boolean | null;
  const lastScoredAt = profile?.last_scored_at as string | null;

  // Check for syncing bank connections
  const { data: syncingConnections } = await supabase
    .from("bank_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "syncing")
    .limit(1);

  const syncingConnectionId = syncingConnections?.[0]?.id ?? null;

  // Fetch primary account balance
  const { data: account } = await supabase
    .from("accounts")
    .select("balance_available, display_name, currency")
    .eq("user_id", user.id)
    .order("balance_updated_at", { ascending: false })
    .limit(1)
    .single();

  const balancePence = account
    ? Math.round(Number(account.balance_available) * 100)
    : 23902; // demo: £239.02

  // Fetch 180-day forecast for the user (with enhanced fields)
  const today = new Date();
  const forecastEnd = new Date(today);
  forecastEnd.setDate(today.getDate() + 180);

  const { data: rawForecasts } = await supabase
    .from("forecasts")
    .select(
      "forecast_date, projected_balance, danger_flag, confidence_low, confidence_high, income_expected, outgoings_expected",
    )
    .eq("user_id", user.id)
    .gte("forecast_date", today.toISOString().split("T")[0])
    .lte("forecast_date", forecastEnd.toISOString().split("T")[0])
    .order("forecast_date", { ascending: true });

  // Map to the heatmap component&apos;s expected prop shape (DB stores GBP -> convert to pence)
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

  // Fetch upcoming obligations (next 180 days — full calendar range)
  const { data: obligations } = await supabase
    .from("obligations")
    .select("id, name, amount, frequency, next_expected, confidence, is_essential, category, merchant_name")
    .eq("user_id", user.id)
    .eq("active", true)
    .gte("next_expected", today.toISOString().split("T")[0])
    .lte("next_expected", forecastEnd.toISOString().split("T")[0])
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

  // Fetch active trades (PENDING_MATCH, MATCHED, or LIVE) for the borrower
  const { data: activeTrades } = await supabase
    .from("trades")
    .select("id, amount, fee, original_due_date, new_due_date, shift_days, status, matched_at, live_at, created_at, obligations(name)")
    .eq("borrower_id", user.id)
    .in("status", ["PENDING_MATCH", "MATCHED", "LIVE"])
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
      created_at: t.created_at,
    };
  });

  // Fetch market rates for match probability (graceful if view doesn't exist)
  const { data: marketRatesRaw } = await supabase
    .from("market_rates")
    .select("*")
    .limit(3);

  // Aggregate market context: average across grades for a general signal
  const marketContext = (marketRatesRaw && marketRatesRaw.length > 0)
    ? {
        liquidity_ratio: marketRatesRaw.reduce((s, r) => s + Number(r.liquidity_ratio ?? 0), 0) / marketRatesRaw.length,
        supply_count: marketRatesRaw.reduce((s, r) => s + Number(r.supply_count ?? 0), 0),
        demand_count: marketRatesRaw.reduce((s, r) => s + Number(r.demand_count ?? 0), 0),
        bid_apr: marketRatesRaw.reduce((s, r) => s + Number(r.bid_apr ?? 0), 0) / marketRatesRaw.length,
        ask_apr: marketRatesRaw.reduce((s, r) => s + Number(r.ask_apr ?? 0), 0) / marketRatesRaw.length,
      }
    : undefined;

  // Use demo data if no real data exists (for vivid calendar display)
  const isDemo = forecasts.length === 0 && upcomingObligations.length === 0 && activeShifts.length === 0;
  const displayForecasts = forecasts.length > 0 ? forecasts : buildDemoForecasts();
  const displayObligations = upcomingObligations.length > 0 ? upcomingObligations : buildDemoObligations();
  const displayShifts = activeShifts.length > 0 ? activeShifts : buildDemoShifts();

  // Build unified cashflow timeline: bills + income + repayments
  const cashflows: CashflowItem[] = [];

  // Bills (obligations)
  for (const o of displayObligations) {
    cashflows.push({
      id: o.id,
      name: o.name,
      amount_pence: o.amount_pence,
      date: o.next_expected,
      type: "bill",
      frequency: o.frequency,
      confidence: o.confidence,
      is_essential: o.is_essential,
      category: o.category,
    });
  }

  // Income days (from forecasts where income > 0)
  for (const f of displayForecasts) {
    if (f.income_expected_pence > 0) {
      cashflows.push({
        id: `income-${f.forecast_date}`,
        name: "Salary",
        amount_pence: f.income_expected_pence,
        date: f.forecast_date,
        type: "income",
      });
    }
  }

  // Everyday spending (forecast outgoings minus scheduled bills)
  const obligationsByDate = new Map<string, number>();
  for (const o of displayObligations) {
    obligationsByDate.set(o.next_expected, (obligationsByDate.get(o.next_expected) ?? 0) + o.amount_pence);
  }
  for (const f of displayForecasts) {
    const scheduledPence = obligationsByDate.get(f.forecast_date) ?? 0;
    const irregularPence = f.outgoings_expected_pence - scheduledPence;
    if (irregularPence >= 500) { // at least £5 to show
      cashflows.push({
        id: `everyday-${f.forecast_date}`,
        name: "Everyday spending",
        amount_pence: irregularPence,
        date: f.forecast_date,
        type: "bill",
        category: "estimated",
      });
    }
  }

  // Repayments (active shifts — locked auto-repayments)
  for (const s of displayShifts) {
    cashflows.push({
      id: `repay-${s.id}`,
      name: s.obligation_name,
      amount_pence: s.amount_pence + s.fee_pence,
      date: s.new_due_date,
      type: "repayment",
      locked: true,
    });
  }

  const dangerCount = displayForecasts.filter((f) => f.is_danger).length;
  const hasData = displayForecasts.length > 0;

  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto">
      <TopBar title="Flowzo" />

      <div className="px-4 py-6 space-y-6">
        {/* Monzo-style balance card */}
        {(() => {
          const pounds = Math.floor(Math.abs(balancePence) / 100);
          const pence = Math.abs(balancePence) % 100;
          const isNegative = balancePence < 0;
          return (
            <div className="rounded-2xl bg-coral p-5 text-white">
              <div className="flex items-start justify-between">
                <p className="text-lg font-extrabold tracking-tight opacity-90">flowzo</p>
                <div className="text-right">
                  <p className="text-3xl font-extrabold tracking-tight">
                    {isNegative && "-"}£{pounds.toLocaleString("en-GB")}
                    <span className="text-lg font-bold opacity-80">.{String(pence).padStart(2, "0")}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 opacity-70">
                    <path d="M3 21h18" /><path d="M3 10h18" /><path d="M12 3l9 7H3l9-7z" />
                    <path d="M5 10v11" /><path d="M19 10v11" /><path d="M9 10v11" /><path d="M14 10v11" />
                  </svg>
                  <p className="text-xs font-medium opacity-70">
                    {displayName !== "there" ? displayName : "Current Account"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {riskGrade && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      riskGrade === "A" ? "bg-green-500/30 text-green-100" :
                      riskGrade === "B" ? "bg-amber-400/30 text-amber-100" :
                      "bg-red-400/30 text-red-100"
                    }`}>
                      Grade {riskGrade}
                    </span>
                  )}
                  <p className="text-xs font-medium opacity-70">Balance</p>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Link
                  href="#suggestions"
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 transition-all px-4 py-2 rounded-full text-sm font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                  </svg>
                  Shift Bill
                </Link>
                <Link
                  href="/borrower/card"
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 transition-all px-4 py-2 rounded-full text-sm font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M2.5 4A1.5 1.5 0 001 5.5V6h18v-.5A1.5 1.5 0 0017.5 4h-15zM19 8.5H1v6A1.5 1.5 0 002.5 16h15a1.5 1.5 0 001.5-1.5v-6zM3 13.25A.75.75 0 013.75 12.5h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 13.25zm4.75-.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" />
                  </svg>
                  Card
                </Link>
                <div className="ml-auto">
                  <Link
                    href="/borrower/scheduled"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(0,0,0,0.3)] active:scale-95 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5.5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7-1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-extrabold text-navy">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Here&apos;s what needs your attention
          </p>
        </div>

        {syncingConnectionId && (
          <SyncStatusBanner connectionId={syncingConnectionId} />
        )}

        <FirstVisitBanner
          storageKey="flowzo-bills-intro-seen"
          message="This is where you manage your bills and see your cash forecast."
        />

        {/* Credit Score + Limits */}
        {creditScore != null && (
          <section className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Credit Profile</h2>
              {lastScoredAt && (
                <span className="text-[10px] text-text-muted">
                  Scored {new Date(lastScoredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Score circle */}
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-warm-grey" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                    strokeDasharray={`${Math.round((creditScore / 850) * 97.4)} 97.4`}
                    strokeLinecap="round"
                    className={creditScore >= 700 ? "text-success" : creditScore >= 600 ? "text-warning" : "text-danger"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-extrabold text-navy">{creditScore}</span>
                </div>
              </div>
              {/* Stats */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Status</span>
                  {eligibleToBorrow ? (
                    <span className="text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full">Eligible</span>
                  ) : (
                    <span className="text-danger font-semibold bg-danger/10 px-2 py-0.5 rounded-full">Ineligible</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Max shift</span>
                  <span className="font-semibold text-navy">£{maxTradeAmount.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Active limit</span>
                  <span className="font-semibold text-navy">{maxActiveTrades} trade{maxActiveTrades !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
            {!eligibleToBorrow && (
              <p className="text-xs text-danger mt-3">
                Score must be 500+ to borrow. Connect your bank and build history to improve.
              </p>
            )}
          </section>
        )}

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

        {/* Upcoming Cashflows */}
        {cashflows.length > 0 && (
          <section>
            <UpcomingTransactions items={cashflows} />
          </section>
        )}

        {/* Claude AI Financial Insight */}
        {riskGrade && (
          <ClaudeInsights
            riskGrade={riskGrade}
            creditScore={profile?.credit_score as number | null}
            dangerDays={dangerCount}
            obligations={upcomingObligations.slice(0, 5).map((o) => ({
              name: o.name,
              amount_pence: o.amount_pence,
              expected_day: new Date(o.next_expected).getDate(),
            }))}
            avgBalancePence={Math.round(
              (displayForecasts.reduce((s, f) => s + f.projected_balance_pence, 0) /
                Math.max(displayForecasts.length, 1)),
            )}
            incomePattern="monthly salary"
          />
        )}

        {/* AI Bill Priority Ranker + What-If Simulator */}
        <div className="grid grid-cols-2 gap-3">
          <BillPriority
            obligations={upcomingObligations.slice(0, 8).map((o) => ({
              name: o.name,
              amount_pence: o.amount_pence,
              expected_day: new Date(o.next_expected).getDate(),
              category: "Bill",
            }))}
            dangerDays={displayForecasts
              .filter((f) => f.is_danger)
              .map((f) => ({
                day: new Date(f.forecast_date).getDate(),
                deficit_pence: Math.abs(f.projected_balance_pence),
              }))}
            avgBalancePence={Math.round(
              displayForecasts.reduce((s, f) => s + f.projected_balance_pence, 0) /
                Math.max(displayForecasts.length, 1),
            )}
          />
          <WhatIfSimulator
            obligations={upcomingObligations.slice(0, 8).map((o) => ({
              name: o.name,
              amount_pence: o.amount_pence,
              expected_day: new Date(o.next_expected).getDate(),
            }))}
            forecasts={displayForecasts.map((f) => ({
              day: new Date(f.forecast_date).getDate(),
              balance_pence: f.projected_balance_pence,
              is_danger: f.is_danger,
            }))}
          />
        </div>

        {/* AI Suggestions -- primary actionable content */}
        <section id="suggestions">
          <h2 className="text-lg font-bold text-navy mb-3">Suggestions</h2>
          <SuggestionFeed userId={user.id} marketContext={marketContext} />
        </section>
      </div>
    </div>
  );
}
