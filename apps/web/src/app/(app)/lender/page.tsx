import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { LenderPageClient } from "@/components/lender/lender-page-client";

export default async function LenderHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch lending pot data
  const { data: pot } = await supabase
    .from("lending_pots")
    .select("available_pence, locked_pence, total_deployed_pence, realized_yield_pence")
    .eq("user_id", user.id)
    .single();

  // Fetch lender preferences (auto-match flag)
  const { data: prefs } = await supabase
    .from("lender_preferences")
    .select("auto_match_enabled")
    .eq("user_id", user.id)
    .single();

  // Fetch yield stats (aggregated from completed trades where this user was lender)
  const { data: completedTrades } = await supabase
    .from("trades")
    .select("fee_pence, shift_days, amount_pence, status")
    .eq("lender_id", user.id);

  const allTrades = completedTrades ?? [];
  const activeTrades = allTrades.filter((t) =>
    ["MATCHED", "LIVE"].includes(t.status),
  );
  const settledTrades = allTrades.filter((t) => t.status === "REPAID");

  const totalYieldPence = settledTrades.reduce(
    (sum, t) => sum + (t.fee_pence ?? 0),
    0,
  );

  const avgTermDays =
    allTrades.length > 0
      ? Math.round(
          allTrades.reduce((sum, t) => sum + (t.shift_days ?? 0), 0) /
            allTrades.length,
        )
      : 0;

  const avgAprBps =
    allTrades.length > 0
      ? Math.round(
          allTrades.reduce((sum, t) => {
            if (!t.amount_pence || !t.shift_days) return sum;
            const annualRate =
              (t.fee_pence / t.amount_pence) * (365 / t.shift_days);
            return sum + annualRate * 10000; // convert to bps
          }, 0) / allTrades.length,
        )
      : 0;

  const yieldStats = {
    totalYieldPence,
    avgTermDays,
    avgAprBps,
    tradeCount: allTrades.length,
    activeTrades: activeTrades.length,
  };

  return (
    <>
      <TopBar title="Lending" />
      <LenderPageClient
        initialPot={
          pot
            ? {
                available_pence: pot.available_pence,
                locked_pence: pot.locked_pence,
                total_deployed_pence: pot.total_deployed_pence,
                realized_yield_pence: pot.realized_yield_pence,
              }
            : null
        }
        initialAutoMatch={prefs?.auto_match_enabled ?? false}
        initialYieldStats={yieldStats}
      />
    </>
  );
}
