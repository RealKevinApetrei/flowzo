"use client";

import { useState } from "react";

export function OnboardingClient() {
  const [loading, setLoading] = useState(false);

  function handleConnect() {
    setLoading(true);
    // Redirect to TrueLayer auth endpoint
    window.location.href = "/api/truelayer/auth";
  }

  return (
    <div className="card-monzo p-6 space-y-4">
      <div className="w-12 h-12 bg-coral/10 rounded-2xl flex items-center justify-center">
        <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-navy">Connect your bank</h2>
      <p className="text-sm text-text-secondary leading-relaxed">
        We use TrueLayer to securely read your transactions. Flowzo never stores your bank
        credentials and uses read-only access.
      </p>
      <ul className="text-xs text-text-muted space-y-1">
        <li className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          FCA-registered Open Banking provider
        </li>
        <li className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          Read-only access to transactions
        </li>
        <li className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          Revoke access any time
        </li>
      </ul>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="block w-full text-center bg-coral text-white font-semibold py-3 rounded-full hover:bg-coral-dark transition-colors disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Bank"}
      </button>
    </div>
  );
}
