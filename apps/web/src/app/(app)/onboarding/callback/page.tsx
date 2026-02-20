"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OnboardingCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your bank...");

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setStatus("success");
      setMessage("Bank connected successfully!");
      setTimeout(() => router.push("/borrower"), 2000);
    } else if (error) {
      setStatus("error");
      setMessage(
        error === "no_code"
          ? "Bank connection was cancelled."
          : error === "invalid_state"
            ? "Security check failed. Please try again."
            : "Something went wrong. Please try again.",
      );
      setTimeout(() => router.push("/onboarding"), 3000);
    } else {
      // Still processing - wait then redirect
      setTimeout(() => router.push("/onboarding"), 5000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <div className="w-12 h-12 border-4 border-coral border-t-transparent rounded-full animate-spin mx-auto" />
        )}
        {status === "success" && (
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === "error" && (
          <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <p className="text-lg font-medium text-navy">{message}</p>
        <p className="text-sm text-text-muted">
          {status === "loading" && "This may take a moment"}
          {status === "success" && "Redirecting to your dashboard..."}
          {status === "error" && "Redirecting back to onboarding..."}
        </p>
      </div>
    </div>
  );
}
