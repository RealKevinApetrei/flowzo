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
      "trade_id, amount_slice, fee_slice, status, trades(amount, fee, shift_days, status, new_due_date, obligation_id, obligations(name))",
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

  // Real-time weighted APY from LIVE trades (Issue #33)
  const { data: currentApy } = await supabase.rpc("get_lender_current_apy", {
    p_user_id: user.id,
  });
  const currentApyBps = Math.round(Number(currentApy ?? 0)) || avgAprBps;

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
    avgAprBps: currentApyBps,
    tradeCount: allTrades.length,
    activeTrades: activeTrades.length,
  };

  // Fetch yield curve for duration selector (dynamic APR per term bucket)
  const { data: yieldCurve } = await supabase
    .from("yield_curve")
    .select("term_bucket, avg_apr_pct, trade_count");

  const potPence = Math.round(Number(pot?.available ?? 0) * 100);
  const fallbackApr = currentApyBps / 100; // bps → percent

  // Map yield_curve buckets to duration options
  const shortBucket = yieldCurve?.find((r) => r.term_bucket === "0-7d");
  const midBucket = yieldCurve?.find((r) => r.term_bucket === "8-14d");

  const shortApr = Number(shortBucket?.avg_apr_pct ?? fallbackApr);
  const midApr = Number(midBucket?.avg_apr_pct ?? fallbackApr);

  const durationOptions = [3, 7, 14].map((days) => {
    const apr = days <= 7 ? shortApr : midApr;
    const gainPence = Math.round((potPence * (apr / 100) * days) / 365);
    return { days, aprPct: apr, gainPence };
  });

  // Fetch lender preferences for initial duration selection
  const { data: lenderPrefs } = await supabase
    .from("lender_preferences")
    .select("max_shift_days")
    .eq("user_id", user.id)
    .single();

  const initialMaxShiftDays = lenderPrefs?.max_shift_days ?? 7;

  // Fetch impact data: unique borrowers helped + essential bills
  const { data: impactAllocations } = await supabase
    .from("allocations")
    .select("trade_id, amount_slice, trades(borrower_id, status, obligation_id)")
    .eq("lender_id", user.id)
    .in("status", ["RESERVED", "ACTIVE", "REPAID"]);

  const validImpact = (impactAllocations ?? []).filter((a) => {
    const trade = Array.isArray(a.trades) ? a.trades[0] : a.trades;
    return trade && ["MATCHED", "LIVE", "REPAID"].includes(trade.status as string);
  });

  const uniqueBorrowers = new Set(
    validImpact.map((a) => {
      const trade = Array.isArray(a.trades) ? a.trades[0] : a.trades;
      return trade?.borrower_id;
    }).filter(Boolean),
  );

  const totalLentPence = Math.round(
    validImpact.reduce((sum, a) => sum + Number(a.amount_slice ?? 0), 0) * 100,
  );

  // Count essential bills funded (via obligation_id on trades)
  const obligationIds = validImpact
    .map((a) => {
      const trade = Array.isArray(a.trades) ? a.trades[0] : a.trades;
      return trade?.obligation_id;
    })
    .filter((id): id is string => !!id);

  let essentialCount = 0;
  if (obligationIds.length > 0) {
    const uniqueObIds = [...new Set(obligationIds)];
    const { count } = await supabase
      .from("obligations")
      .select("id", { count: "exact", head: true })
      .in("id", uniqueObIds)
      .eq("is_essential", true);
    essentialCount = count ?? 0;
  }

  const impactStats = {
    peopleHelped: uniqueBorrowers.size,
    tradesFunded: validImpact.length,
    totalLentPence,
    essentialBills: essentialCount,
  };

  // Build upcoming repayments for lender (active trades with repay dates)
  const upcomingRepayments = (allocations ?? [])
    .filter((a) => {
      const trade = Array.isArray(a.trades) ? a.trades[0] : a.trades;
      return trade && ["MATCHED", "LIVE"].includes(trade.status as string);
    })
    .map((a) => {
      const trade = Array.isArray(a.trades) ? a.trades[0] : a.trades;
      const obligation = trade?.obligations
        ? (Array.isArray(trade.obligations) ? trade.obligations[0] : trade.obligations)
        : null;
      return {
        trade_id: a.trade_id,
        obligation_name: obligation?.name ?? "Trade",
        amount_pence: Math.round(Number(a.amount_slice) * 100),
        fee_pence: Math.round(Number(a.fee_slice) * 100),
        new_due_date: trade?.new_due_date as string,
        status: trade?.status as string,
      };
    })
    .filter((r) => r.new_due_date)
    .sort((a, b) => a.new_due_date.localeCompare(b.new_due_date));

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
        currentApyBps={currentApyBps}
        sparklineData={sparklineData}
        durationOptions={durationOptions}
        initialMaxShiftDays={initialMaxShiftDays}
        impactStats={impactStats}
        withdrawalQueued={!!pot?.withdrawal_queued}
        upcomingRepayments={upcomingRepayments}
      />
    </>
  );
}
