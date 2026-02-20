export default function BorrowerHomePage() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Flowzo</h1>
        <p className="text-sm text-text-secondary">Good morning</p>
      </div>

      {/* TODO: Calendar Heatmap component */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Your Cash Calendar</h2>
        <div className="bg-warm-grey rounded-2xl min-h-[200px] flex items-center justify-center text-text-muted">
          Calendar Heatmap
        </div>
      </section>

      {/* TODO: AI Suggestion Feed component */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Suggestions</h2>
        <div className="card-monzo p-6 text-center text-text-muted">
          AI Suggestions will appear here
        </div>
      </section>

      {/* TODO: Comparison component (With Flowzo vs Without) */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-3">Your Forecast</h2>
        <div className="card-monzo p-6 text-center text-text-muted">
          With Flowzo vs Without
        </div>
      </section>
    </div>
  );
}
