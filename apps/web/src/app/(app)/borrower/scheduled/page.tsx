import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { formatCurrency } from "@flowzo/shared";

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateStr));
}

function demoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

interface ScheduledItem {
  id: string;
  name: string;
  amount_pence: number;
  date: string;
  type: "direct_debit" | "standing_order" | "shift_repayment";
  frequency?: string;
}

export default async function ScheduledPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch real obligations
  const today = new Date();
  const sixtyDaysLater = new Date(today);
  sixtyDaysLater.setDate(today.getDate() + 60);

  const { data: obligations } = await supabase
    .from("obligations")
    .select("id, name, amount, frequency, next_expected, merchant_name")
    .eq("user_id", user.id)
    .eq("active", true)
    .gte("next_expected", today.toISOString().split("T")[0])
    .lte("next_expected", sixtyDaysLater.toISOString().split("T")[0])
    .order("next_expected", { ascending: true });

  // Fetch active trade repayments
  const { data: activeTrades } = await supabase
    .from("trades")
    .select("id, amount, fee, new_due_date, obligations(name)")
    .eq("borrower_id", user.id)
    .in("status", ["MATCHED", "LIVE"])
    .order("new_due_date", { ascending: true });

  // Build scheduled items from real data or demo
  let items: ScheduledItem[] = [];

  if (obligations && obligations.length > 0) {
    for (const o of obligations) {
      items.push({
        id: o.id,
        name: o.name ?? o.merchant_name ?? "Bill",
        amount_pence: Math.round(Number(o.amount) * 100),
        date: o.next_expected,
        type: "direct_debit",
        frequency: o.frequency,
      });
    }
  }

  if (activeTrades && activeTrades.length > 0) {
    for (const t of activeTrades) {
      const obligation = Array.isArray(t.obligations) ? t.obligations[0] : t.obligations;
      items.push({
        id: `repay-${t.id}`,
        name: obligation?.name ?? "Bill shift repayment",
        amount_pence: Math.round((Number(t.amount) + Number(t.fee)) * 100),
        date: t.new_due_date,
        type: "shift_repayment",
      });
    }
  }

  // Demo fallback
  if (items.length === 0) {
    items = [
      { id: "d1", name: "Netflix", amount_pence: 1599, date: demoDate(3), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d2", name: "Spotify", amount_pence: 1099, date: demoDate(3), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d3", name: "EE Mobile", amount_pence: 3500, date: demoDate(7), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d4", name: "British Gas", amount_pence: 12800, date: demoDate(10), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d5", name: "Council Tax", amount_pence: 18000, date: demoDate(10), type: "standing_order", frequency: "MONTHLY" },
      { id: "d6", name: "Energy Bill (shifted)", amount_pence: 8971, date: demoDate(14), type: "shift_repayment" },
      { id: "d7", name: "Thames Water", amount_pence: 4200, date: demoDate(17), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d8", name: "PureGym", amount_pence: 2499, date: demoDate(22), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d9", name: "Aviva Insurance", amount_pence: 5500, date: demoDate(28), type: "direct_debit", frequency: "MONTHLY" },
      { id: "d10", name: "Council Tax (shifted)", amount_pence: 14342, date: demoDate(30), type: "shift_repayment" },
    ];
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  const totalPence = items.reduce((sum, i) => sum + i.amount_pence, 0);
  const directDebits = items.filter((i) => i.type === "direct_debit");
  const standingOrders = items.filter((i) => i.type === "standing_order");
  const shiftRepayments = items.filter((i) => i.type === "shift_repayment");

  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto">
      <TopBar title="Scheduled Payments" />

      <div className="px-4 py-6 space-y-6">
        {/* Summary */}
        <div className="card-monzo p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total upcoming</p>
          <p className="text-2xl font-extrabold text-navy mt-1">
            {formatCurrency(totalPence)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {items.length} payments in the next 60 days
          </p>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-monzo p-3 text-center">
            <p className="text-lg font-bold text-navy">{directDebits.length}</p>
            <p className="text-[10px] text-text-muted">Direct Debits</p>
          </div>
          <div className="card-monzo p-3 text-center">
            <p className="text-lg font-bold text-navy">{standingOrders.length}</p>
            <p className="text-[10px] text-text-muted">Standing Orders</p>
          </div>
          <div className="card-monzo p-3 text-center">
            <p className="text-lg font-bold text-coral">{shiftRepayments.length}</p>
            <p className="text-[10px] text-text-muted">Shift Repayments</p>
          </div>
        </div>

        {/* Timeline */}
        <section className="card-monzo p-5">
          <h2 className="text-sm font-bold text-navy mb-3">Upcoming</h2>
          <div className="space-y-0 divide-y divide-warm-grey">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-10 text-center shrink-0">
                  <p className="text-xs font-bold text-navy">{formatShortDate(item.date)}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  item.type === "shift_repayment" ? "bg-coral/10" : item.type === "standing_order" ? "bg-blue-500/10" : "bg-warning/10"
                }`}>
                  {item.type === "shift_repayment" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-coral">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${item.type === "standing_order" ? "text-blue-500" : "text-warning"}`}>
                      <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75V15.388l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{item.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {item.type === "shift_repayment" ? "Shift repayment (locked)" :
                     item.type === "standing_order" ? "Standing order" :
                     `Direct debit${item.frequency ? ` · ${item.frequency.charAt(0) + item.frequency.slice(1).toLowerCase()}` : ""}`}
                  </p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${item.type === "shift_repayment" ? "text-coral" : "text-navy"}`}>
                  -{formatCurrency(item.amount_pence)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/borrower"
          className="block text-center text-sm text-coral font-semibold py-2"
        >
          Back to Bills
        </Link>
      </div>
    </div>
  );
}
