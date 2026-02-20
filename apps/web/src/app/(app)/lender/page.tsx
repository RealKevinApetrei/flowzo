export default function LenderHomePage() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Lending</h1>
        <p className="text-sm text-text-secondary">Your pot</p>
      </div>

      {/* TODO: Lending Pot card component */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Lending Pot</h2>
        <div className="card-monzo p-6">
          <p className="text-3xl font-extrabold text-navy">£0.00</p>
          <p className="text-sm text-text-secondary mt-1">Available to lend</p>
          <button className="mt-4 w-full bg-coral text-white font-semibold py-3 rounded-full hover:bg-coral-dark transition-colors">
            Top Up Pot
          </button>
        </div>
      </section>

      {/* TODO: Auto-pop toggle component */}
      <section>
        <div className="card-monzo p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-navy">Auto-pop</h3>
            <p className="text-sm text-text-secondary">Automatically lend to matching trades</p>
          </div>
          <div className="w-12 h-7 bg-cool-grey rounded-full flex items-center px-1">
            <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
          </div>
        </div>
      </section>

      {/* TODO: Bubble Board component */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Bubble Board</h2>
        <div className="bg-warm-grey rounded-2xl min-h-[400px] flex items-center justify-center text-text-muted">
          Bubble Board — Active trade requests
        </div>
      </section>

      {/* TODO: Yield dashboard component */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Yield Dashboard</h2>
        <div className="card-monzo p-6 text-center text-text-muted">
          Yield stats and history will appear here
        </div>
      </section>
    </div>
  );
}
