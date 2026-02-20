export default function OnboardingCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-coral border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-lg font-medium">Connecting your bank...</p>
        <p className="text-sm text-text-muted">This may take a moment</p>
      </div>
    </div>
  );
}
