export default function AppLoading() {
  return (
    <div className="max-w-lg sm:max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* TopBar skeleton */}
      <div className="h-8 w-32 bg-warm-grey rounded-lg animate-pulse" />
      {/* Content skeletons */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-warm-grey rounded-lg animate-pulse" />
        <div className="card-monzo p-5 space-y-3">
          <div className="h-4 w-full bg-warm-grey rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-warm-grey rounded animate-pulse" />
          <div className="h-32 w-full bg-warm-grey rounded-xl animate-pulse" />
        </div>
        <div className="card-monzo p-5 space-y-3">
          <div className="h-4 w-2/3 bg-warm-grey rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-warm-grey rounded animate-pulse" />
        </div>
        <div className="card-monzo p-5 space-y-3">
          <div className="h-4 w-full bg-warm-grey rounded animate-pulse" />
          <div className="h-20 w-full bg-warm-grey rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
