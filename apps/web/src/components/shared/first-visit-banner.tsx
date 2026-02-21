"use client";

import { useState, useEffect } from "react";

interface FirstVisitBannerProps {
  storageKey: string;
  message: string;
}

export function FirstVisitBanner({ storageKey, message }: FirstVisitBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setVisible(true);
    }
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="rounded-xl bg-coral/5 border border-coral/20 px-4 py-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <p className="text-sm text-text-secondary">{message}</p>
      <button
        onClick={dismiss}
        className="shrink-0 text-xs font-medium text-coral hover:text-coral-dark transition-colors"
      >
        Got it
      </button>
    </div>
  );
}
