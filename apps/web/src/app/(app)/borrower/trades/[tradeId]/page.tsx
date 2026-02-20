export default async function TradeDetailPage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <a href="/borrower" className="text-coral font-medium">&larr; Back</a>
        <h1 className="text-xl font-bold">Trade {tradeId.slice(0, 8)}...</h1>
      </div>
      {/* TODO: Bid slider component */}
      <div className="bg-warm-grey rounded-2xl p-6 min-h-[200px] flex items-center justify-center text-text-muted">
        Bid Slider
      </div>
      {/* TODO: Probability curve component */}
      <div className="bg-warm-grey rounded-2xl p-6 min-h-[150px] flex items-center justify-center text-text-muted">
        Fill Probability Distribution
      </div>
    </div>
  );
}
