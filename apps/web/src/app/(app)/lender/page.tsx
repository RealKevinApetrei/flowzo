import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LenderPageClient } from "@/components/lender/lender-page-client";
import { LenderRealtimeWrapper } from "@/components/lender/lender-realtime-wrapper";
import { LenderAdvisor } from "@/components/lender/lender-advisor";

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

  // Fetch primary Monzo card balance
  const { data: primaryAccount } = await supabase
    .from("accounts")
    .select("balance_available")
    .eq("user_id", user.id)
    .order("balance_updated_at", { ascending: false })
    .limit(1)
    .single();

  const cardBalancePence = Math.round(Number(primaryAccount?.balance_available ?? 0) * 100);

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
  let currentApyBps = Math.round(Number(currentApy ?? 0)) || avgAprBps;

  // Fallback to platform-wide market average APR if lender has no personal trades
  let usingMarketAvg = false;
  if (currentApyBps === 0) {
    const { data: marketAvg } = await supabase
      .from("trade_analytics")
      .select("avg_fee, avg_amount, avg_shift_days")
      .in("status", ["LIVE", "REPAID", "MATCHED"]);

    if (marketAvg && marketAvg.length > 0) {
      const totalWeightedApr = marketAvg.reduce((sum, row) => {
        const amount = Number(row.avg_amount ?? 0);
        const fee = Number(row.avg_fee ?? 0);
        const days = Number(row.avg_shift_days ?? 0);
        if (amount > 0 && days > 0) {
          return sum + (fee / amount) * (365 / days) * 10000;
        }
        return sum;
      }, 0);
      const avgBps = Math.round(totalWeightedApr / marketAvg.length);
      if (avgBps > 0) {
        currentApyBps = avgBps;
        usingMarketAvg = true;
      }
    }
  }

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

  // Fetch aggregated yield curve (volume-weighted across all grades per bucket)
  const { data: yieldCurveAgg } = await supabase
    .from("yield_curve_agg")
    .select("term_bucket, avg_apr_pct, trade_count");

  const potPence = Math.round(Number(pot?.available ?? 0) * 100);
  const fallbackApr = currentApyBps / 100; // bps → percent

  // Map yield_curve_agg buckets to duration options (one row per bucket, no grade ambiguity)
  const shortBucket = yieldCurveAgg?.find((r) => r.term_bucket === "0-7d");
  const midBucket = yieldCurveAgg?.find((r) => r.term_bucket === "8-14d");

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
    .select("max_shift_days, min_apr, risk_bands, max_exposure")
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
    <LenderRealtimeWrapper userId={user.id}>
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
        cardBalancePence={cardBalancePence}
        initialYieldStats={yieldStats}
        currentApyBps={currentApyBps}
        sparklineData={sparklineData}
        durationOptions={durationOptions}
        initialMaxShiftDays={initialMaxShiftDays}
        impactStats={impactStats}
        withdrawalQueued={!!pot?.withdrawal_queued}
        usingMarketAvg={usingMarketAvg}
        upcomingRepayments={upcomingRepayments}
      />
      <div className="px-4 pb-6 max-w-md mx-auto">
        <LenderAdvisor
          currentPrefs={{
            min_apr: Number(lenderPrefs?.min_apr ?? 5),
            risk_bands: (lenderPrefs?.risk_bands as string[]) ?? ["A", "B"],
            max_exposure: Number(lenderPrefs?.max_exposure ?? 100),
            max_shift_days: Number(lenderPrefs?.max_shift_days ?? 7),
          }}
          portfolio={{
            grade_a_pct: 40,
            grade_b_pct: 45,
            grade_c_pct: 15,
            total_deployed: Math.round(Number(pot?.locked ?? 0)),
            realized_yield: Number(pot?.realized_yield ?? 0),
            default_count: 0,
          }}
          marketRates={[]}
        />
      </div>
    </LenderRealtimeWrapper>
  );
}
