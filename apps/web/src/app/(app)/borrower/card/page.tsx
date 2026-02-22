import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";

export default async function CardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const cardholderName = profile?.display_name ?? "Flowzo User";

  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto">
      <TopBar title="Card" />

      <div className="px-4 py-6 space-y-6">
        {/* Card visual */}
        <div className="rounded-2xl bg-coral p-6 text-white aspect-[1.6/1] flex flex-col justify-between shadow-lg">
          <div className="flex items-start justify-between">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 opacity-80">
              <rect x="1" y="4" width="10" height="8" rx="1" />
              <line x1="3" y1="7" x2="9" y2="7" />
              <line x1="3" y1="9" x2="7" y2="9" />
            </svg>
            <p className="text-2xl font-extrabold tracking-tight">flowzo</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-sm font-medium opacity-80 tracking-wider">
              {cardholderName}
            </p>
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-500 opacity-80" />
              <div className="w-8 h-8 rounded-full bg-yellow-400 opacity-80" />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="card-monzo p-4 flex flex-col items-center gap-2 text-center opacity-60 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-coral">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-sm font-semibold text-navy">Reveal PIN</span>
            <span className="text-[10px] text-text-muted">Coming soon</span>
          </button>
          <button className="card-monzo p-4 flex flex-col items-center gap-2 text-center opacity-60 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-500">
              <path d="M12 2a5 5 0 015 5v1H7V7a5 5 0 015-5z" />
              <line x1="8" y1="14" x2="8" y2="18" />
              <line x1="12" y1="12" x2="12" y2="18" />
              <line x1="16" y1="16" x2="16" y2="18" />
            </svg>
            <span className="text-sm font-semibold text-navy">Freeze Card</span>
            <span className="text-[10px] text-text-muted">Coming soon</span>
          </button>
        </div>

        {/* Card details */}
        <section className="card-monzo p-5 space-y-0">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-navy">Card details</h2>
            <span className="text-xs text-text-muted">Demo</span>
          </div>
          <div className="divide-y divide-warm-grey">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Name on card</span>
              <span className="text-sm font-medium text-navy">{cardholderName}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Card number</span>
              <span className="text-sm font-medium text-navy font-mono tracking-wider">
                &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4921
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Expiry</span>
              <span className="text-sm font-medium text-navy">03/28</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">CVC</span>
              <span className="text-sm text-text-muted">&bull;&bull;&bull;</span>
            </div>
          </div>
        </section>

        {/* Spending limits */}
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-sm font-bold text-navy">Spending limits</h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">Contactless</span>
                <span className="text-navy font-medium">£100 / day</span>
              </div>
              <div className="h-1.5 rounded-full bg-warm-grey overflow-hidden">
                <div className="h-full rounded-full bg-coral w-1/4" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">Online</span>
                <span className="text-navy font-medium">£500 / day</span>
              </div>
              <div className="h-1.5 rounded-full bg-warm-grey overflow-hidden">
                <div className="h-full rounded-full bg-success w-1/6" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">ATM withdrawal</span>
                <span className="text-navy font-medium">£300 / day</span>
              </div>
              <div className="h-1.5 rounded-full bg-warm-grey overflow-hidden">
                <div className="h-full rounded-full bg-warning w-0" />
              </div>
            </div>
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
