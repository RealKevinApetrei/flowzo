export default function MarketingLoading() {
  return (
    <div className="min-h-screen bg-soft-white px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-warm-grey rounded-lg animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-warm-grey rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-warm-grey rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-warm-grey rounded animate-pulse" />
        </div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-warm-grey rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-warm-grey rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
