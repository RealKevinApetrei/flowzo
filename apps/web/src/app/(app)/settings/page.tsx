import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";

  // Fetch bank connections
  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, provider, status, last_synced_at")
    .eq("user_id", userId);

  // Fetch profile (including credit risk data)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role_preference, onboarding_completed, risk_grade, credit_score, max_trade_amount, max_active_trades, eligible_to_borrow, last_scored_at")
    .eq("id", userId)
    .single();

  // Fetch lender preferences
  const { data: lenderPrefs } = await supabase
    .from("lender_preferences")
    .select("min_apr, max_shift_days, risk_bands, auto_match_enabled")
    .eq("user_id", userId)
    .single();

  // Achievement: borrower — total overdraft avoided via repaid trades
  const { data: repaidBorrowerTrades } = await supabase
    .from("trades")
    .select("amount")
    .eq("borrower_id", userId)
    .eq("status", "REPAID");

  const borrowerSavedPence = Math.round(
    (repaidBorrowerTrades ?? []).reduce((sum, t) => sum + Number(t.amount) * 100, 0),
  );
  const borrowerTradeCount = (repaidBorrowerTrades ?? []).length;

  // Achievement: lender — people helped and overdraft prevented
  const { data: repaidAllocations } = await supabase
    .from("allocations")
    .select("amount_slice, trades(borrower_id)")
    .eq("lender_id", userId)
    .eq("status", "REPAID");

  const lenderAmountPence = Math.round(
    (repaidAllocations ?? []).reduce((sum, a) => sum + Number(a.amount_slice) * 100, 0),
  );
  const uniqueBorrowers = new Set(
    (repaidAllocations ?? [])
      .map((a) => {
        const t = Array.isArray(a.trades) ? a.trades[0] : a.trades;
        return (t as { borrower_id?: string } | null)?.borrower_id;
      })
      .filter(Boolean),
  );

  // Fall back to mock data when no real achievements exist
  const hasRealAchievements = borrowerSavedPence > 0 || lenderAmountPence > 0;
  const achievements = hasRealAchievements
    ? {
        borrowerSavedPence,
        borrowerTradeCount,
        lenderAmountPence,
        lenderPeopleHelped: uniqueBorrowers.size,
      }
    : {
        borrowerSavedPence: 124350,   // £1,243.50
        borrowerTradeCount: 8,
        lenderAmountPence: 351200,    // £3,512.00
        lenderPeopleHelped: 14,
      };

  const creditProfile = profile?.credit_score != null
    ? {
        creditScore: profile.credit_score as number,
        riskGrade: (profile.risk_grade as string) ?? "C",
        maxTradeAmount: Number(profile.max_trade_amount ?? 75),
        maxActiveTrades: Number(profile.max_active_trades ?? 1),
        eligibleToBorrow: (profile.eligible_to_borrow as boolean) ?? false,
        lastScoredAt: profile.last_scored_at as string | null,
      }
    : undefined;

  return (
    <SettingsClient
      email={user?.email ?? ""}
      displayName={profile?.display_name ?? null}
      rolePreference={profile?.role_preference ?? "both"}
      connections={connections ?? []}
      onboardingCompleted={profile?.onboarding_completed ?? false}
      lenderPrefs={lenderPrefs ?? undefined}
      achievements={achievements}
      creditProfile={creditProfile}
    />
  );
}
