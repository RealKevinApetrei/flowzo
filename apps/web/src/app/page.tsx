import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingPreviews } from "@/components/landing/landing-previews";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-2xl font-bold text-navy">Flowzo</span>
        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              href="/borrower"
              className="text-sm font-semibold bg-coral text-white px-5 py-2 rounded-full hover:bg-coral-dark transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-navy hover:text-coral transition-colors">
              Log in
            </Link>
          )}
        </nav>
      </header>

      {/* Hero — problem-first */}
      <section className="px-6 pt-16 pb-12 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-navy leading-tight">
          Bills land before payday?
        </h1>
        <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-coral">
          We move them.
        </p>
        <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
          Flowzo predicts your cash flow 30 days ahead and shifts bills to safer dates — no overdraft needed.
        </p>
        <div className="mt-10">
          <Link
            href={user ? "/borrower" : "/signup"}
            className="inline-block bg-coral text-white font-semibold px-10 py-4 rounded-full text-lg hover:bg-coral-dark transition-colors active:scale-95"
          >
            {user ? "Go to Dashboard" : "Try the Demo"}
          </Link>
        </div>
      </section>

      {/* Live App Previews */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <LandingPreviews />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-16 bg-[var(--card-surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-navy mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="card-monzo text-center p-8">
              <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="text-xs font-bold text-coral uppercase tracking-wider mb-2">Step 1</div>
              <h3 className="text-lg font-bold text-navy mb-2">Connect your bank</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                5 seconds via Open Banking. Read-only access, revoke any time.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-monzo text-center p-8">
              <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-xs font-bold text-coral uppercase tracking-wider mb-2">Step 2</div>
              <h3 className="text-lg font-bold text-navy mb-2">We spot the danger days</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                AI forecasts when bills will clash with low balances and flags the risk.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-monzo text-center p-8">
              <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="text-xs font-bold text-coral uppercase tracking-wider mb-2">Step 3</div>
              <h3 className="text-lg font-bold text-navy mb-2">Bills get shifted automatically</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Accept the shift with one tap. P2P micro-lending covers the gap until payday.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-navy-bg text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-xl font-bold">Flowzo</span>
            <div className="flex items-center gap-6 text-sm text-white/70">
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/fca-disclaimer" className="hover:text-white transition-colors">FCA Disclaimer</Link>
            </div>
          </div>
          <p className="mt-8 text-xs text-white/50 text-center sm:text-left leading-relaxed">
            Flowzo is a hackathon project and is not regulated by the Financial Conduct Authority (FCA).
            This is not financial advice. Do not use real money.
          </p>
        </div>
      </footer>
    </div>
  );
}
