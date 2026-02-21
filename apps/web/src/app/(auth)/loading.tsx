export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-soft-white">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <div className="h-8 w-24 bg-warm-grey rounded-lg animate-pulse mx-auto" />
        </div>
        <div className="card-monzo p-6 space-y-4">
          <div className="h-5 w-32 bg-warm-grey rounded animate-pulse" />
          <div className="h-10 w-full bg-warm-grey rounded-lg animate-pulse" />
          <div className="h-10 w-full bg-warm-grey rounded-lg animate-pulse" />
          <div className="h-11 w-full bg-warm-grey rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
