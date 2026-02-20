import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Welcome */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-navy">Welcome to Flowzo</h1>
          <p className="mt-2 text-text-secondary">
            Let&apos;s get you set up. Connect your bank to start forecasting your cash flow.
          </p>
        </div>

        {/* Connect Bank Card */}
        <div className="card-monzo p-6 space-y-4">
          <div className="w-12 h-12 bg-coral/10 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-navy">Connect your bank</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We use TrueLayer to securely read your transactions. Flowzo never stores your bank
            credentials and uses read-only access.
          </p>
          <a
            href="#"
            className="block w-full text-center bg-coral text-white font-semibold py-3 rounded-full hover:bg-coral-dark transition-colors"
          >
            Connect Bank
          </a>
        </div>

        {/* Skip */}
        <div className="text-center">
          <Link
            href="/borrower"
            className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
