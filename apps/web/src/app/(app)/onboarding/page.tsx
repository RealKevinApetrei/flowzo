import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

const steps = [
  { label: "Connect Bank", key: "connect" },
  { label: "Sync Data", key: "sync" },
  { label: "Ready", key: "ready" },
] as const;

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
  const justConnected = params.success === "true";

  // Determine current step
  const currentStep = hasConnection ? 2 : justConnected ? 1 : 0;

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

        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-2">
          {steps.map((step, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                      isCompleted
                        ? "bg-success text-white"
                        : isCurrent
                          ? "bg-coral text-white ring-4 ring-coral/20"
                          : "bg-warm-grey text-text-muted"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      isCompleted
                        ? "text-success"
                        : isCurrent
                          ? "text-coral"
                          : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-colors duration-500 ${
                      i < currentStep ? "bg-success" : "bg-cool-grey"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Status messages */}
        {params.success === "true" && (
          <div className="bg-success/10 text-success px-4 py-3 rounded-xl text-sm font-medium text-center">
            Bank connected successfully! Your transactions are syncing.
          </div>
        )}
        {params.error && (
          <div className="bg-danger/10 border border-danger/20 px-4 py-4 rounded-xl text-center space-y-3">
            <p className="text-sm font-semibold text-danger">Connection failed</p>
            <p className="text-xs text-text-secondary">
              {params.error === "no_code" && "Bank connection was cancelled. You can try again."}
              {params.error === "invalid_state" && "Security check failed. Please try again."}
              {params.error === "token_exchange_failed" && "Failed to connect to your bank. This can happen with sandbox credentials — please try again."}
              {params.error === "storage_failed" && "Failed to save your connection. Please try again."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/api/truelayer/auth"
                className="text-sm font-semibold bg-coral text-white px-5 py-2 rounded-full hover:bg-coral-dark transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/borrower"
                className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
              >
                Skip for now
              </Link>
            </div>
          </div>
        )}

        {/* Sandbox credential hint */}
        {!hasConnection && process.env.NEXT_PUBLIC_TRUELAYER_ENV !== "production" && (
          <div className="bg-warning/10 border border-warning/20 px-4 py-3 rounded-xl text-center">
            <p className="text-xs font-semibold text-warning">Demo mode</p>
            <p className="text-xs text-text-secondary mt-1">
              Use credentials <span className="font-mono font-bold text-navy">john</span> / <span className="font-mono font-bold text-navy">doe</span> at the mock bank
            </p>
          </div>
        )}

        {hasConnection ? (
          /* Already connected - success state with animation */
          <div className="card-monzo p-6 space-y-4 text-center">
            <div className="relative mx-auto w-16 h-16">
              {/* Animated success ring */}
              <div className="absolute inset-0 rounded-full bg-success/10 animate-ping" style={{ animationDuration: "1.5s", animationIterationCount: "2" }} />
              <div className="relative w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: 0,
                    animation: "checkmark-draw 0.6s ease-out forwards",
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-navy">All set!</h2>
            <p className="text-sm text-text-secondary">
              Your bank account is linked. Flowzo will analyse your transactions and forecast your cash flow.
            </p>
            <Link
              href="/borrower"
              className="block w-full text-center bg-coral text-white font-semibold py-3 rounded-full hover:bg-coral-dark transition-colors active:scale-95 transition-transform"
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
