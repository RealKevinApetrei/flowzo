import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user already has a bank connection
  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, provider, status")
    .eq("user_id", user?.id ?? "")
    .eq("status", "active");

  const hasConnection = (connections?.length ?? 0) > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Welcome */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-navy">Welcome to Flowzo</h1>
          <p className="mt-2 text-text-secondary">
            {hasConnection
              ? "Your bank is connected! You're all set."
              : "Let's get you set up. Connect your bank to start forecasting your cash flow."}
          </p>
        </div>

        {/* Status messages */}
        {params.success === "true" && (
          <div className="bg-success/10 text-success px-4 py-3 rounded-xl text-sm font-medium text-center">
            Bank connected successfully! Your transactions are syncing.
          </div>
        )}
        {params.error && (
          <div className="bg-danger/10 text-danger px-4 py-3 rounded-xl text-sm font-medium text-center">
            {params.error === "no_code" && "Bank connection was cancelled."}
            {params.error === "invalid_state" && "Security check failed. Please try again."}
            {params.error === "token_exchange_failed" && "Failed to connect bank. Please try again."}
            {params.error === "storage_failed" && "Failed to save connection. Please try again."}
          </div>
        )}

        {hasConnection ? (
          /* Already connected - go to app */
          <div className="card-monzo p-6 space-y-4">
            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-navy">Bank connected</h2>
            <p className="text-sm text-text-secondary">
              Your bank account is linked. Flowzo will analyse your transactions and forecast your cash flow.
            </p>
            <Link
              href="/borrower"
              className="block w-full text-center bg-coral text-white font-semibold py-3 rounded-full hover:bg-coral-dark transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          /* Connect Bank Card */
          <OnboardingClient />
        )}

        {/* Skip */}
        {!hasConnection && (
          <div className="text-center">
            <Link
              href="/borrower"
              className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip for now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
