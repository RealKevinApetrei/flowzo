import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LenderPageClient } from "@/components/lender/lender-page-client";

export default async function LenderHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch lending pot data (DB stores GBP decimal)
  const { data: pot } = await supabase
    .from("lending_pots")
    .select(
      "available, locked, total_deployed, realized_yield, withdrawal_queued",
    )
    .eq("user_id", user.id)
    .single();

  // Fetch trades where this user has allocations (lenders don't have lender_id on trades)
  const { data: allocations } = await supabase
    .from("allocations")
    .select(
      "trade_id, amount_slice, fee_slice, status, trades(amount, fee, shift_days, status)",
    )
    .eq("lender_id", user.id);

  const allTrades = (allocations ?? []).map((a) => {
    const trade = Array.isArray(a.trades) ? a.trades[0] : a.trades;
    return {
      amount: Number(trade?.amount ?? a.amount_slice ?? 0),
      fee: Number(trade?.fee ?? a.fee_slice ?? 0),
      shift_days: Number(trade?.shift_days ?? 0),
      status: (trade?.status ?? a.status) as string,
    };
  });

  const activeTrades = allTrades.filter((t) =>
    ["MATCHED", "LIVE"].includes(t.status),
  );
  const settledTrades = allTrades.filter((t) => t.status === "REPAID");

  // Convert GBP to pence for client components
  const totalYieldPence = Math.round(
    settledTrades.reduce((sum, t) => sum + t.fee, 0) * 100,
  );

  const avgTermDays =
    allTrades.length > 0
      ? Math.round(
          allTrades.reduce((sum, t) => sum + t.shift_days, 0) /
            allTrades.length,
        )
      : 0;

  const avgAprBps =
    allTrades.length > 0
      ? Math.round(
          allTrades.reduce((sum, t) => {
            if (!t.amount || !t.shift_days) return sum;
            const annualRate =
              (t.fee / t.amount) * (365 / t.shift_days);
            return sum + annualRate * 10000; // convert to bps
          }, 0) / allTrades.length,
        )
      : 0;

  // Fetch recent FEE_CREDIT entries for yield sparkline
  const { data: recentYields } = await supabase
    .from("pool_ledger")
    .select("amount, created_at")
    .eq("user_id", user.id)
    .eq("entry_type", "FEE_CREDIT")
    .order("created_at", { ascending: true })
    .limit(20);

  const sparklineData = (recentYields ?? []).map((r) =>
    Math.round(Number(r.amount) * 100),
  );

  const yieldStats = {
    totalYieldPence,
    avgTermDays,
    avgAprBps,
    tradeCount: allTrades.length,
    activeTrades: activeTrades.length,
  };

  return (
    <>
      <LenderPageClient
        initialPot={
          pot
            ? {
                available_pence: Math.round(Number(pot.available) * 100),
                locked_pence: Math.round(Number(pot.locked) * 100),
                total_deployed_pence: Math.round(
                  Number(pot.total_deployed) * 100,
                ),
                realized_yield_pence: Math.round(
                  Number(pot.realized_yield) * 100,
                ),
              }
            : null
        }
        initialYieldStats={yieldStats}
        sparklineData={sparklineData}
      />
    </>
  );
}
