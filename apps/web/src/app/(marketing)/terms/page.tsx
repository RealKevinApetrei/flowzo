import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-soft-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-coral font-medium text-sm hover:text-coral-dark transition-colors">
          &larr; Back to Flowzo
        </Link>

        <h1 className="text-3xl font-extrabold text-navy mt-6 mb-8">Terms of Service</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary leading-relaxed">
          <p className="text-xs text-text-muted">Last updated: February 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">1. About Flowzo</h2>
            <p>
              Flowzo is a hackathon prototype demonstrating an AI-powered bill-shifting concept with
              peer-to-peer micro-lending. This is not a live financial product and should not be used
              with real money.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">2. Acceptance of Terms</h2>
            <p>
              By accessing or using Flowzo, you agree to be bound by these Terms of Service. If you
              do not agree, please do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">3. Description of Service</h2>
            <p>
              Flowzo provides a platform that forecasts your cash flow, suggests bill payment date
              shifts, and matches borrowers with lenders via a peer-to-peer micro-lending marketplace.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">4. Eligibility</h2>
            <p>
              You must be at least 18 years old and a UK resident to use Flowzo. By registering, you
              represent and warrant that you meet these requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">5. Limitation of Liability</h2>
            <p>
              Flowzo is provided &quot;as is&quot; without any warranties. We are not liable for any
              financial losses, missed payments, or other damages arising from the use of this service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">6. Contact</h2>
            <p>
              For questions about these terms, contact us at hello@flowzo.app (placeholder).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
