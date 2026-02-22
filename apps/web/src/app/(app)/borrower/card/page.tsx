import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { getCards, type TrueLayerCard } from "@/lib/truelayer/client";
import { refreshToken } from "@/lib/truelayer/auth";

interface CardInfo {
  nameOnCard: string;
  lastFour: string;
  expiry: string;
  network: string; // VISA, MASTERCARD, etc.
  type: string; // DEBIT, CREDIT, etc.
}

async function fetchTrueLayerCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<TrueLayerCard | null> {
  const { data: connection } = await supabase
    .from("bank_connections")
    .select("id, truelayer_token")
    .eq("user_id", userId)
    .eq("provider", "truelayer")
    .eq("status", "active")
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .single();

  if (!connection?.truelayer_token) return null;

  const token = connection.truelayer_token as {
    access_token: string;
    refresh_token: string;
    expires_at?: string;
  };

  try {
    const cards = await getCards(token.access_token);
    if (cards && cards.length > 0) return cards[0];
  } catch (err: unknown) {
    // Try token refresh on 401
    if (err instanceof Error && err.message.includes("401") && token.refresh_token) {
      try {
        const refreshed = await refreshToken(token.refresh_token);
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

        await supabase
          .from("bank_connections")
          .update({
            truelayer_token: {
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token,
              expires_at: expiresAt,
            },
          })
          .eq("id", connection.id);

        const cards = await getCards(refreshed.access_token);
        if (cards && cards.length > 0) return cards[0];
      } catch {
        // Refresh failed — fall through to demo
      }
    }
  }

  return null;
}

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

  // Try fetching real card data from TrueLayer
  const tlCard = await fetchTrueLayerCard(supabase, user.id);

  const card: CardInfo = tlCard
    ? {
        nameOnCard: tlCard.name_on_card || cardholderName,
        lastFour: tlCard.partial_card_number || "••••",
        expiry: tlCard.valid_to || "••/••",
        network: tlCard.card_network || "MASTERCARD",
        type: tlCard.card_type || "DEBIT",
      }
    : {
        nameOnCard: cardholderName,
        lastFour: "4921",
        expiry: "03/28",
        network: "MASTERCARD",
        type: "DEBIT",
      };

  const isReal = !!tlCard;
  const isMastercard = card.network === "MASTERCARD";

  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto">
      <TopBar title="Card" />

      <div className="px-4 py-6 space-y-6">
        {/* Card visual — compact like Monzo */}
        <div className="rounded-2xl bg-coral px-5 py-4 text-white flex flex-col justify-between shadow-lg" style={{ aspectRatio: "1.7 / 1", maxHeight: "200px" }}>
          <div className="flex items-start justify-between">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 opacity-80">
              <rect x="1" y="4" width="10" height="8" rx="1" />
              <line x1="3" y1="7" x2="9" y2="7" />
              <line x1="3" y1="9" x2="7" y2="9" />
            </svg>
            <p className="text-xl font-extrabold tracking-tight">flowzo</p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">{card.type}</p>
              <p className="text-xs font-medium opacity-80 tracking-wider">
                {card.nameOnCard}
              </p>
            </div>
            {isMastercard ? (
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-red-500 opacity-80" />
                <div className="w-7 h-7 rounded-full bg-yellow-400 opacity-80" />
              </div>
            ) : (
              <p className="text-xs font-bold opacity-80 tracking-wider">{card.network}</p>
            )}
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
            {!isReal && <span className="text-xs text-text-muted">Demo</span>}
          </div>
          <div className="divide-y divide-warm-grey">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Name on card</span>
              <span className="text-sm font-medium text-navy">{card.nameOnCard}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Card number</span>
              <span className="text-sm font-medium text-navy font-mono tracking-wider">
                &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.lastFour}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Expiry</span>
              <span className="text-sm font-medium text-navy">{card.expiry}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">CVC</span>
              <span className="text-sm text-text-muted">&bull;&bull;&bull;</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-secondary">Network</span>
              <span className="text-sm font-medium text-navy">{card.network}</span>
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
