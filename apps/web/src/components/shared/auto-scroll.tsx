"use client";

import { useEffect } from "react";

/**
 * Auto-scrolls to a target element on mount with a short delay.
 * Scrolls smoothly to bring the target into view without going to the very bottom.
 */
export function AutoScroll({ targetId, delay = 500 }: { targetId: string; delay?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [targetId, delay]);

  return null;
}
