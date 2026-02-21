import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";

export default async function DataPage() {
  const supabase = await createClient();

  // Fetch aggregate analytics from views
  const [
    { data: tradeAnalytics },
    { data: riskDist },
    { data: poolOverview },
  ] = await Promise.all([
    supabase.from("trade_analytics").select("*"),
    supabase.from("risk_distribution").select("*"),
    supabase.from("pool_overview").select("*").single(),
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

  return (
    <div>
      <TopBar title="Data & Analytics" />
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Pool Summary */}
        <section className="card-monzo p-5 space-y-3">
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
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Trade Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Trades" value={String(totalTrades)} />
            <StatCard label="Volume" value={fmt(totalVolume)} />
            <StatCard label="Fees" value={fmt(totalFees)} />
          </div>
        </section>

        {/* Trade Analytics by Grade */}
        <section className="card-monzo p-5 space-y-3">
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
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            row.risk_grade === "A"
                              ? "bg-success/15 text-success"
                              : row.risk_grade === "B"
                                ? "bg-warning/15 text-warning"
                                : "bg-danger/15 text-danger"
                          }`}
                        >
                          {row.risk_grade}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-navy">{row.status}</td>
                      <td className="py-2 pr-3 text-right font-medium">{row.trade_count}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.avg_amount))}</td>
                      <td className="py-2 pr-3 text-right">{fmt(Number(row.avg_fee))}</td>
                      <td className="py-2 text-right">
                        {row.default_rate != null
                          ? `${(Number(row.default_rate) * 100).toFixed(1)}%`
                          : "—"}
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
        <section className="card-monzo p-5 space-y-3">
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

        {/* ML Integration placeholder — Member B's quant API */}
        <section className="card-monzo p-5 space-y-3 border border-dashed border-coral/30">
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
