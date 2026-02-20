import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-soft-white font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-2xl font-bold text-navy">Flowzo</span>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-navy hover:text-coral transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-coral text-white px-5 py-2 rounded-full hover:bg-coral-dark transition-colors"
          >
            Sign up
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-navy leading-tight">
          Never miss a bill payment again
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed">
          AI-powered bill shifting meets P2P micro-lending. Flowzo moves your bills to match your
          cash flow, so you stay in control without overdrafts or late fees.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto bg-coral text-white font-semibold px-8 py-3.5 rounded-full text-lg hover:bg-coral-dark transition-colors"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto border-2 border-navy text-navy font-semibold px-8 py-3.5 rounded-full text-lg hover:bg-navy hover:text-white transition-colors"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-navy mb-12">
            How Flowzo works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-monzo text-center p-8">
              <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Smart Forecasting</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Our AI analyses your income and spending patterns to predict your cash flow weeks ahead.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-monzo text-center p-8">
              <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Bill Shifting</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                When bills clash with low balances, Flowzo finds a better date and covers the gap through P2P lending.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-monzo text-center p-8">
              <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Earn Returns</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Lend spare cash to help others shift bills and earn competitive micro-returns on your idle money.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-navy text-white">
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
