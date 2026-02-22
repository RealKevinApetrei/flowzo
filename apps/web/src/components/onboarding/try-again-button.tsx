"use client";

import { useState } from "react";

export function TryAgainButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={() => {
        setLoading(true);
        window.location.href = "/api/truelayer/auth";
      }}
      disabled={loading}
      className="text-sm font-semibold bg-coral text-white px-5 py-2 rounded-full hover:bg-coral-dark transition-colors disabled:opacity-50"
    >
      {loading ? "Connecting…" : "Try Again"}
    </button>
  );
}
