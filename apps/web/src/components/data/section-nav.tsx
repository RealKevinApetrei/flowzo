"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "order-book", label: "Order Book" },
  { id: "performance", label: "Performance" },
  { id: "yield", label: "Yield" },
  { id: "lenders", label: "Lenders" },
  { id: "backtest", label: "Backtest" },
  { id: "returns", label: "Returns" },
  { id: "risk-score", label: "Risk Score" },
  { id: "stress-test", label: "Stress Test" },
  { id: "eda", label: "EDA" },
  { id: "forecast", label: "Forecast" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SectionNav() {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  // Scroll the active pill into view within the nav
  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector(`[data-section="${active}"]`);
    if (activeBtn) {
      (activeBtn as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [active]);

  return (
    <div
      ref={navRef}
      className="sticky top-14 z-30 bg-background/90 backdrop-blur-sm border-b border-cool-grey py-2 overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-1.5 px-4 max-w-2xl mx-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            data-section={s.id}
            onClick={() => scrollTo(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              active === s.id
                ? "bg-coral text-white"
                : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
