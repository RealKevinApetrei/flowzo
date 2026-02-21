import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { SectionNav } from "@/components/data/section-nav";

export default async function DataPage() {
  const supabase = await createClient();

  // Fetch all analytics views in parallel
  const [
    { data: tradeAnalytics },
    { data: riskDist },
    { data: poolOverview },
    { data: orderBook },
    { data: performance },
    { data: yieldCurve },
    { data: leaderboard },
    { data: platformTotals },
    { data: matchEfficiency },
  ] = await Promise.all([
    supabase.from("trade_analytics").select("*"),
    supabase.from("risk_distribution").select("*"),
    supabase.from("pool_overview").select("*").single(),
    supabase.from("order_book_depth").select("*"),
    supabase.from("trade_performance").select("*"),
    supabase.from("yield_curve").select("*"),
    supabase.from("lender_leaderboard").select("*").limit(10),
    supabase.from("platform_totals").select("*").single(),
    supabase.from("matching_efficiency").select("*"),
  ]);

  // Compute summary stats
  const totalTrades = tradeAnalytics?.reduce((s, r) => s + Number(r.trade_count), 0) ?? 0;
  const totalVolume = tradeAnalytics?.reduce((s, r) => s + Number(r.total_volume ?? 0), 0) ?? 0;
  const totalFees = tradeAnalytics?.reduce((s, r) => s + Number(r.total_fees ?? 0), 0) ?? 0;

  const poolSize = Number(poolOverview?.total_pool_size ?? 0);
  const poolAvailable = Number(poolOverview?.total_available ?? 0);
  const poolLocked = Number(poolOverview?.total_locked ?? 0);
  const lenderCount = Number(poolOverview?.lender_count ?? 0);

  const fmt = (gbp: number) => "\u00A3" + gbp.toFixed(2);
  const pct = (v: number | null) => v != null ? `${(Number(v) * 100).toFixed(1)}%` : "\u2014";

  return (
    <div>
      <TopBar title="Data & Analytics" />
      <SectionNav />
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Pool Summary */}
        <section id="pool-summary" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Pool Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Pool Size" value={fmt(poolSize)} />
            <StatCard label="Available" value={fmt(poolAvailable)} />
            <StatCard label="Locked" value={fmt(poolLocked)} />
            <StatCard label="Lenders" value={String(lenderCount)} />
          </div>
        </section>

        {/* Trade Summary */}
        <section id="trade-summary" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Trade Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Trades" value={String(totalTrades)} />
            <StatCard label="Volume" value={fmt(totalVolume)} />
            <StatCard label="Fees" value={fmt(totalFees)} />
          </div>
          {platformTotals && (
            <div className="grid grid-cols-4 gap-3 mt-3">
              <MiniStat label="Live" value={String(platformTotals.live_trades ?? 0)} />
              <MiniStat label="Pending" value={String(platformTotals.pending_trades ?? 0)} />
              <MiniStat label="Repaid" value={String(platformTotals.repaid_trades ?? 0)} />
              <MiniStat label="Defaulted" value={String(platformTotals.defaulted_trades ?? 0)} />
            </div>
          )}
        </section>

        {/* Order Book Depth */}
        <section id="order-book" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Order Book (Pending Trades)
          </h2>
          {orderBook && orderBook.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3 text-right">Count</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 pr-3 text-right">Avg Amount</th>
                    <th className="py-2 pr-3 text-right">Avg Term</th>
                    <th className="py-2 text-right">Avg APR</th>
                  </tr>
                </thead>
                <tbody>
                  {orderBook.map((row, i) => (
                    <tr key={i} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3">
                        <GradeBadge grade={row.risk_grade} />
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">{row.trade_count}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.total_amount))}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.avg_amount))}</td>
                      <td className="py-2 pr-3 text-right">{row.avg_term_days}d</td>
                      <td className="py-2 text-right font-medium text-coral">
                        {row.avg_implied_apr_pct != null ? `${Number(row.avg_implied_apr_pct).toFixed(1)}%` : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No pending trades.</p>
          )}
          {matchEfficiency && matchEfficiency.length > 0 && (
            <div className="mt-3 pt-3 border-t border-warm-grey">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Matching Efficiency
              </p>
              <div className="grid grid-cols-3 gap-3">
                {matchEfficiency.map((row, i) => (
                  <div key={i} className="text-center">
                    <GradeBadge grade={row.risk_grade} />
                    <p className="text-sm font-bold text-navy mt-1">{pct(row.fill_rate)}</p>
                    <p className="text-[10px] text-text-muted">
                      {row.avg_hours_to_match ? `${row.avg_hours_to_match}h avg` : "\u2014"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Trade Performance */}
        <section id="performance" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Trade Performance
          </h2>
          {performance && performance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3 text-right">Repaid</th>
                    <th className="py-2 pr-3 text-right">Defaulted</th>
                    <th className="py-2 pr-3 text-right">Default %</th>
                    <th className="py-2 pr-3 text-right">Avg APR</th>
                    <th className="py-2 text-right">Avg Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((row, i) => (
                    <tr key={i} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3">
                        <GradeBadge grade={row.risk_grade} />
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-success">
                        {row.repaid_count}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-danger">
                        {row.defaulted_count}
                      </td>
                      <td className="py-2 pr-3 text-right">{pct(row.default_rate)}</td>
                      <td className="py-2 pr-3 text-right">
                        {row.avg_apr_pct != null ? `${Number(row.avg_apr_pct).toFixed(1)}%` : "\u2014"}
                      </td>
                      <td className="py-2 text-right">
                        {row.avg_fee_repaid != null ? fmt(Number(row.avg_fee_repaid)) : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No settled trades yet.</p>
          )}
        </section>

        {/* Yield Curve */}
        <section id="yield-curve" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Yield Curve
          </h2>
          {yieldCurve && yieldCurve.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3">Term</th>
                    <th className="py-2 pr-3 text-right">Trades</th>
                    <th className="py-2 pr-3 text-right">Avg APR</th>
                    <th className="py-2 text-right">Avg Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {yieldCurve.map((row, i) => (
                    <tr key={i} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3">
                        <GradeBadge grade={row.risk_grade} />
                      </td>
                      <td className="py-2 pr-3 text-navy font-medium">{row.term_bucket}</td>
                      <td className="py-2 pr-3 text-right">{row.trade_count}</td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {row.avg_apr_pct != null ? `${Number(row.avg_apr_pct).toFixed(1)}%` : "\u2014"}
                      </td>
                      <td className="py-2 text-right">{fmt(Number(row.avg_fee))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No yield data yet.</p>
          )}
        </section>

        {/* Lender Leaderboard */}
        <section id="lenders" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Top Lenders
          </h2>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Lender</th>
                    <th className="py-2 pr-3 text-right">Capital</th>
                    <th className="py-2 pr-3 text-right">Locked</th>
                    <th className="py-2 pr-3 text-right">Yield</th>
                    <th className="py-2 text-right">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={i} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3 text-text-muted">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium text-navy">{row.display_name}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.total_capital))}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.locked))}</td>
                      <td className="py-2 pr-3 text-right text-success font-medium">
                        {fmt(Number(row.realized_yield))}
                      </td>
                      <td className="py-2 text-right">{row.trade_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No lenders yet.</p>
          )}
        </section>

        {/* Trade Analytics by Grade */}
        <section id="trade-analytics" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Trade Analytics by Grade
          </h2>
          {tradeAnalytics && tradeAnalytics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Count</th>
                    <th className="py-2 pr-3 text-right">Avg Amount</th>
                    <th className="py-2 pr-3 text-right">Avg Fee</th>
                    <th className="py-2 text-right">Default Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeAnalytics.map((row, i) => (
                    <tr key={i} className="border-b border-warm-grey/50 last:border-0">
                      <td className="py-2 pr-3">
                        <GradeBadge grade={row.risk_grade} />
                      </td>
                      <td className="py-2 pr-3 text-navy">{row.status}</td>
                      <td className="py-2 pr-3 text-right font-medium">{row.trade_count}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.avg_amount))}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.avg_fee))}</td>
                      <td className="py-2 text-right">
                        {row.default_rate != null
                          ? `${(Number(row.default_rate) * 100).toFixed(1)}%`
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No trade data yet.</p>
          )}
        </section>

        {/* Risk Distribution */}
        <section id="risk-distribution" className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Risk Distribution
          </h2>
          {riskDist && riskDist.length > 0 ? (
            <div className="flex gap-3">
              {riskDist.map((row) => (
                <div
                  key={row.risk_grade}
                  className={`flex-1 text-center py-3 rounded-xl ${
                    row.risk_grade === "A"
                      ? "bg-success/10"
                      : row.risk_grade === "B"
                        ? "bg-warning/10"
                        : "bg-danger/10"
                  }`}
                >
                  <p
                    className={`text-2xl font-bold ${
                      row.risk_grade === "A"
                        ? "text-success"
                        : row.risk_grade === "B"
                          ? "text-warning"
                          : "text-danger"
                    }`}
                  >
                    {row.user_count}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Grade {row.risk_grade}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No risk data yet.</p>
          )}
        </section>

        {/* ML Integration placeholder */}
        <section id="ml-scoring" className="card-monzo p-5 space-y-3 border border-dashed border-coral/30">
          <h2 className="text-xs font-semibold text-coral uppercase tracking-wider">
            ML Credit Scoring (Quant API)
          </h2>
          <p className="text-sm text-text-secondary">
            Backtest results, SHAP explanations, stress testing, and EDA will be available
            here once the Quant API is connected.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
            <div className="bg-warm-grey/50 rounded-lg p-3">POST /api/score</div>
            <div className="bg-warm-grey/50 rounded-lg p-3">POST /api/explain</div>
            <div className="bg-warm-grey/50 rounded-lg p-3">GET /api/backtest</div>
            <div className="bg-warm-grey/50 rounded-lg p-3">POST /api/stress-test</div>
            <div className="bg-warm-grey/50 rounded-lg p-3">GET /api/returns</div>
            <div className="bg-warm-grey/50 rounded-lg p-3">GET /api/eda</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-warm-grey/30 rounded-xl p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-navy mt-0.5">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold text-navy">{value}</p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
        grade === "A"
          ? "bg-success/15 text-success"
          : grade === "B"
            ? "bg-warning/15 text-warning"
            : "bg-danger/15 text-danger"
      }`}
    >
      {grade}
    </span>
  );
}
