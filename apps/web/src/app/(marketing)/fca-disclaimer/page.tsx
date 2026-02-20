import Link from "next/link";

export default function FCADisclaimerPage() {
  return (
    <div className="min-h-screen bg-soft-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-coral font-medium text-sm hover:text-coral-dark transition-colors">
          &larr; Back to Flowzo
        </Link>

        <h1 className="text-3xl font-extrabold text-navy mt-6 mb-8">FCA Disclaimer</h1>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          {/* Important Notice */}
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-navy">Important Notice</h2>
            <p className="font-semibold text-navy">
              Flowzo is NOT regulated by the Financial Conduct Authority (FCA).
            </p>
            <p>
              This application is a hackathon project built for demonstration purposes only. It is
              not a licensed financial product, and no real financial transactions are processed.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">Not Financial Advice</h2>
            <p>
              Nothing in this application constitutes financial advice. The AI-generated suggestions,
              cash flow forecasts, and bill shift recommendations are purely illustrative and should
              not be relied upon for real financial decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">No Real Money</h2>
            <p>
              Flowzo does not process real payments. Any lending, borrowing, or pot balances shown in
              the application are simulated for demonstration purposes. Do not attempt to use real
              money with this service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">P2P Lending Risks</h2>
            <p>
              In a real implementation of this concept, peer-to-peer lending would carry significant
              risks including loss of capital. P2P lending platforms in the UK are regulated by the
              FCA. Any real version of Flowzo would require FCA authorisation before operating.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">Open Banking</h2>
            <p>
              While Flowzo demonstrates Open Banking integration via TrueLayer, in this prototype no
              real bank data is accessed or stored. TrueLayer is an FCA-authorised Account
              Information Service Provider (AISP).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">Contact</h2>
            <p>
              If you have questions about this disclaimer or the Flowzo project, please reach out at
              hello@flowzo.app (placeholder).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
