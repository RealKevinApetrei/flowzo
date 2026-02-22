"use client";

import { useRef, useEffect } from "react";

/**
 * Renders an invisible anchor and scrolls to it on mount.
 * Place this component at the very bottom of the page content.
 */
export function AutoScrollAnchor({ delay = 800 }: { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return <div ref={ref} aria-hidden />;
}
