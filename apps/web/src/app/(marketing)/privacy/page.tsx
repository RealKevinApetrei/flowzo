import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-coral font-medium text-sm hover:text-coral-dark transition-colors">
          &larr; Back to Flowzo
        </Link>

        <h1 className="text-3xl font-extrabold text-navy mt-6 mb-8">Privacy Policy</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary leading-relaxed">
          <p className="text-xs text-text-muted">Last updated: February 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">1. Information We Collect</h2>
            <p>
              When you register for Flowzo, we collect your email address and basic profile
              information. When you connect your bank via TrueLayer, we access read-only transaction
              data to power cash flow forecasting.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">2. How We Use Your Information</h2>
            <p>
              Your data is used to generate cash flow forecasts, suggest bill shift opportunities,
              and match you with lenders or borrowers. We do not sell your personal data to third
              parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">3. Data Storage</h2>
            <p>
              Your data is stored securely using Supabase (hosted on AWS). Bank tokens are encrypted
              at rest and in transit. We retain transaction data only as long as needed to provide
              the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">4. Third-Party Services</h2>
            <p>
              Flowzo integrates with TrueLayer for Open Banking data access, Supabase for
              authentication and storage, and Stripe for payment processing. Each service has its
              own privacy policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">5. Your Rights</h2>
            <p>
              Under UK GDPR, you have the right to access, correct, or delete your personal data.
              You can disconnect your bank at any time from the Settings page. To request data
              deletion, contact us at hello@flowzo.app (placeholder).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">6. Cookies</h2>
            <p>
              Flowzo uses essential cookies for authentication and session management. We do not use
              advertising or tracking cookies.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
