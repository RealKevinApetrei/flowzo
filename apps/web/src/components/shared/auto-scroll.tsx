"use client";

import { useEffect } from "react";

/**
 * Auto-scrolls to the bottom of the page on mount with a short delay.
 */
export function AutoScroll({ delay = 500 }: { delay?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return null;
}
