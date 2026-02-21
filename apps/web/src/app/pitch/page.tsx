"use client";

import { useState, useEffect, useCallback } from "react";

const slides = [
  {
    id: 1,
    label: "The Problem",
    bg: "bg-navy-bg",
    content: (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 max-w-4xl mx-auto">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Problem</p>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-8">
          20 million UK adults.<br />
          <span className="text-coral">Invisible to credit.</span>
        </h1>
        <p className="text-xl sm:text-2xl text-white/70 max-w-2xl leading-relaxed mb-12">
          They have bank accounts. Regular income. Years of payment history.
          But Experian can't see it — so they can't access affordable credit.
        </p>
        <div className="grid grid-cols-3 gap-8 w-full max-w-2xl">
          {[
            { stat: "£45", label: "Average overdraft fee per incident" },
            { stat: "34%", label: "UK adults hit an unexpected bill each year" },
            { stat: "29%", label: "APR on typical short-term credit" },
          ].map(({ stat, label }) => (
            <div key={stat} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-coral">{stat}</div>
              <p className="text-xs text-white/50 mt-2 leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 2,
    label: "Data Pipeline",
    bg: "bg-soft-white",
    content: (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 max-w-5xl mx-auto">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Signal</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-navy leading-tight mb-4">
          Raw transactions →<br />
          <span className="text-coral">Credit intelligence.</span>
        </h1>
        <p className="text-lg text-text-secondary mb-12 max-w-xl">
          We engineer features from Open Banking data the same way a quant extracts alpha from tick data.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          {[
            {
              icon: "📊",
              title: "Raw Transactions",
              subtitle: "= Tick Data",
              desc: "90 days of bank history ingested via TrueLayer Open Banking API in real time.",
            },
            {
              icon: "⚙️",
              title: "Feature Engineering",
              subtitle: "= Alpha Factors",
              desc: "Income regularity · Balance volatility · Failed payment clustering · Obligation detection.",
            },
            {
              icon: "🎯",
              title: "Risk Signal",
              subtitle: "= Trading Signal",
              desc: "A/B/C risk grades with dynamic fee pricing — execution strategy built in.",
            },
          ].map(({ icon, title, subtitle, desc }) => (
            <div key={title} className="bg-[var(--card-surface)] rounded-2xl p-6 shadow-sm border border-cool-grey/50 text-left">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="font-extrabold text-navy text-lg">{title}</div>
              <div className="text-coral text-sm font-semibold mb-2">{subtitle}</div>
              <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-text-muted">Powered by TrueLayer · Supabase Edge Functions · 6-stage event-sourced pipeline</p>
      </div>
    ),
  },
  {
    id: 3,
    label: "Prediction",
    bg: "bg-navy-bg",
    content: (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 max-w-4xl mx-auto">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Forecast</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          30 days ahead.<br />
          <span className="text-coral">Danger flagged.</span><br />
          Bills shifted.
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mb-12 leading-relaxed">
          When Flowzo detects a shortfall, Claude AI proposes the exact bill to move, the exact date to move it to, and the exact fee — in plain English.
        </p>
        <div className="bg-white/10 rounded-2xl px-8 py-6 max-w-lg w-full text-left border border-white/20">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Live Proposal Example</p>
          <p className="text-white text-lg font-semibold leading-snug">
            "Move your Netflix from the 15th to the 22nd to avoid a <span className="text-danger">−£45 overdraft</span>. Fee: <span className="text-coral">£1.20</span>."
          </p>
          <div className="mt-4 flex gap-3">
            <span className="bg-success/20 text-success text-xs font-bold px-3 py-1 rounded-full">Accept</span>
            <span className="bg-white/10 text-white/50 text-xs font-bold px-3 py-1 rounded-full">Dismiss</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-8 mt-10 w-full max-w-2xl">
          {[
            { stat: "< 10s", label: "Sync → forecast → proposal" },
            { stat: "MAPE < 15%", label: "Forecast accuracy target" },
            { stat: "< 30s", label: "Auto-match after proposal accepted" },
          ].map(({ stat, label }) => (
            <div key={stat} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-coral">{stat}</div>
              <p className="text-xs text-white/50 mt-1 leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 4,
    label: "Decision Engine",
    bg: "bg-soft-white",
    content: (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 max-w-5xl mx-auto">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Engine</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-navy leading-tight mb-6">
          Signal → Price → Match → Settle.<br />
          <span className="text-coral">Fully automated.</span>
        </h1>
        <p className="text-lg text-text-secondary mb-10 max-w-xl">
          The agentic loop runs continuously. Every decision is auditable. Every state transition is event-sourced.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-3xl mb-10">
          {[
            { step: "Forecast", color: "bg-coral" },
            { step: "→", color: "" },
            { step: "Propose", color: "bg-navy" },
            { step: "→", color: "" },
            { step: "Match", color: "bg-success" },
            { step: "→", color: "" },
            { step: "Settle", color: "bg-warning" },
          ].map(({ step, color }, i) =>
            color ? (
              <div key={i} className={`${color} text-white font-bold text-sm px-5 py-2.5 rounded-full`}>{step}</div>
            ) : (
              <span key={i} className="text-text-muted font-bold text-lg">{step}</span>
            )
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {[
            { label: "Borrower", desc: "Sees danger days on a calendar heatmap. Accepts a shift in one tap." },
            { label: "Lender", desc: "Deploys idle cash via a D3 bubble board. Auto-match or manual fund." },
            { label: "Risk Engine", desc: "A/B/C grades drive fee pricing. Higher risk = higher return for lender." },
            { label: "Settlement", desc: "Repayment on shifted date. Full double-entry ledger. Idempotent." },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-[var(--card-surface)] rounded-2xl p-5 shadow-sm border border-cool-grey/50 text-left">
              <div className="font-extrabold text-navy text-sm mb-1">{label}</div>
              <p className="text-text-secondary text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 5,
    label: "Validation",
    bg: "bg-navy-bg",
    content: (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 max-w-4xl mx-auto">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">Why We Win</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          Validated against<br />
          <span className="text-coral">2.2M real loans.</span>
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mb-10 leading-relaxed">
          Flowzo risk grades backtested on LendingClub data. Grade A predicts defaults better than FICO alone.
        </p>
        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl mb-10">
          {[
            { stat: "Grade A", label: "Default rate < Grade B < Grade C", color: "text-success" },
            { stat: "> 80%", label: "Trades auto-matched within 30s", color: "text-coral" },
            { stat: "£1.20", label: "Avg fee vs £45 overdraft charge", color: "text-warning" },
          ].map(({ stat, label, color }) => (
            <div key={stat} className="text-center">
              <div className={`text-3xl sm:text-4xl font-extrabold ${color}`}>{stat}</div>
              <p className="text-xs text-white/50 mt-2 leading-snug">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-coral/20 border border-coral/40 rounded-2xl px-6 py-4 text-center">
            <p className="text-coral font-extrabold text-sm uppercase tracking-wider">SIG Prize</p>
            <p className="text-white font-bold mt-1">Best Use of Data</p>
            <p className="text-white/50 text-xs mt-1">Feature engineering · Backtesting · Explainability</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center">
            <p className="text-white/60 font-extrabold text-sm uppercase tracking-wider">Monzo Track</p>
            <p className="text-white font-bold mt-1">Open Banking Innovation</p>
            <p className="text-white/50 text-xs mt-1">TrueLayer · Real sandbox · Monzo design system</p>
          </div>
        </div>
        <p className="mt-8 text-white/30 text-sm font-semibold tracking-wide">flowzo.vercel.app</p>
      </div>
    ),
  },
];

export default function PitchPage() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent((c) => Math.min(slides.length - 1, c + 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const slide = slides[current];

  return (
    <div className={`min-h-screen ${slide.bg} transition-colors duration-500 flex flex-col`}>
      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center">
        {slide.content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-8 pb-8">
        {/* Dot navigation */}
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "bg-coral w-6"
                  : slide.bg === "bg-navy-bg"
                  ? "bg-white/30 w-2 hover:bg-white/60"
                  : "bg-navy/20 w-2 hover:bg-navy/50"
              }`}
              aria-label={s.label}
            />
          ))}
        </div>

        {/* Slide label + arrows */}
        <div className="flex items-center gap-4">
          <span className={`text-xs font-semibold uppercase tracking-widest ${slide.bg === "bg-navy-bg" ? "text-white/40" : "text-text-muted"}`}>
            {current + 1} / {slides.length} — {slide.label}
          </span>
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={current === 0}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                slide.bg === "bg-navy-bg"
                  ? "bg-white/10 text-white hover:bg-white/20 disabled:opacity-20"
                  : "bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-20"
              }`}
            >
              ←
            </button>
            <button
              onClick={next}
              disabled={current === slides.length - 1}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                slide.bg === "bg-navy-bg"
                  ? "bg-coral text-white hover:bg-coral-dark disabled:opacity-20"
                  : "bg-coral text-white hover:bg-coral-dark disabled:opacity-20"
              }`}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
