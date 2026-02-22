"use client";

import { useEffect } from "react";

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to load chunk") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("from module")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      window.location.reload();
      return;
    }
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <h2 style={{ color: "#1B1B3A", fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>
            {isChunkLoadError(error) ? "Reloading..." : "An unexpected error occurred."}
          </p>
          <button
            onClick={() => isChunkLoadError(error) ? window.location.reload() : reset()}
            style={{ marginTop: 16, backgroundColor: "#FF5A5F", color: "white", fontWeight: 600, padding: "10px 24px", borderRadius: 9999, border: "none", cursor: "pointer", fontSize: 14 }}
          >
            {isChunkLoadError(error) ? "Reload" : "Try again"}
          </button>
        </div>
      </body>
    </html>
  );
}
