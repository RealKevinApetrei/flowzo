"use client";

import { useState, useEffect, useCallback } from "react";

const slides = [
  {
    id: 1,
    label: "The Problem",
    bg: "bg-navy-bg",
    dark: true,
    content: (
      <div className="w-full max-w-4xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Problem</p>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-10">
          Your bills don't care<br />
          <span className="text-coral">when you get paid.</span>
        </h1>
        <p className="text-xl sm:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
          Millions of UK adults have regular income and pay their bills on time
          but a <span className="text-white font-semibold">timing mismatch</span> between when money arrives and when recurring payments land sends them into overdraft every month.
        </p>
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-extrabold text-coral">1 in 4</div>
          <p className="text-sm text-white/50 mt-3">UK workers run out of money before payday (CIPHR, 2024)</p>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    label: "The Cost",
    bg: "bg-navy-bg",
    dark: true,
    content: (
      <div className="w-full max-w-4xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Cost</p>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-10">
          A timing problem.<br />
          <span className="text-coral">An overdraft price.</span>
        </h1>
        <p className="text-xl sm:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
          It's not a debt problem. It's a <span className="text-coral font-semibold">cashflow timing problem</span> — but banks charge full overdraft rates regardless.
        </p>
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-extrabold text-coral">~40%</div>
          <p className="text-sm text-white/50 mt-3">APR charged on overdrafts by major UK banks</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    label: "The Gap",
    bg: "bg-navy-bg",
    dark: true,
    content: (
      <div className="w-full max-w-4xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Gap</p>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-10">
          No product has been<br />
          <span className="text-coral">built to solve this.</span>
        </h1>
        <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed mb-10">
          Flowzo fixes this with AI-driven bill shifting, backed by a <span className="text-white font-semibold">democratised P2P lending pool</span> — giving anyone access to affordable short-term liquidity.
        </p>
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-extrabold text-coral">0</div>
          <p className="text-sm text-white/50 mt-3">Products using Open Banking data to predict and prevent overdrafts via P2P lending</p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    label: "Data Pipeline",
    bg: "bg-soft-white",
    dark: false,
    content: (
      <div className="w-full max-w-5xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Data Pipeline</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-navy leading-tight mb-4">
          Bank data in.<br />
          <span className="text-coral">Actionable insight out.</span>
        </h1>
        <p className="text-lg text-text-secondary mb-3 max-w-xl mx-auto">
          Three steps from raw transactions to a personalised bill-shift proposal — in under 10 seconds.
        </p>
        <p className="text-base text-coral font-semibold mb-10 max-w-xl mx-auto">
          Feature engineering from noisy data → signal extraction → execution. Same discipline as quant finance, different asset class.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          {[
            {
              step: "01",
              title: "Connect",
              subtitle: "TrueLayer Open Banking",
              desc: "User connects their bank. We pull 90 days of real transaction history in seconds.",
            },
            {
              step: "02",
              title: "Analyse",
              subtitle: "Feature Engineering",
              desc: "We detect recurring bills, classify income patterns, and flag danger days on a 30-day forecast.",
            },
            {
              step: "03",
              title: "Score & Propose",
              subtitle: "AI Decision Engine",
              desc: "An A/B/C risk grade is assigned and APR calculated accordingly. Claude AI generates a plain-English bill-shift proposal.",
            },
          ].map(({ step, title, subtitle, desc }) => (
            <div key={title} className="card-monzo p-6 text-left">
              <div className="mb-3">
                <span className="text-coral text-xs font-extrabold uppercase tracking-widest">{step}</span>
              </div>
              <div className="font-extrabold text-navy text-lg">{title}</div>
              <div className="text-coral text-sm font-semibold mb-2">{subtitle}</div>
              <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-text-muted">Powered by TrueLayer · Supabase Edge Functions · Claude API · 6-stage event-sourced pipeline</p>
      </div>
    ),
  },
  {
    id: 5,
    label: "Prediction",
    bg: "bg-navy-bg",
    dark: true,
    content: (
      <div className="w-full max-w-4xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Forecast</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          14 days ahead.<br />
          <span className="text-coral">Danger flagged.</span><br />
          Bills shifted.
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
          When Flowzo detects a shortfall, Claude AI proposes the exact bill to move, the exact date to move it to, and the exact fee — in plain English.
        </p>
<div className="grid grid-cols-3 gap-8 w-full max-w-2xl mx-auto">
          {[
            { stat: "< 10s", label: "Sync → forecast → proposal" },
            { stat: "85%+", label: "30-day balance forecast accuracy" },
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
    id: 6,
    label: "Decision Engine",
    bg: "bg-soft-white",
    dark: false,
    content: (
      <div className="w-full max-w-5xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">The Engine</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-navy leading-tight mb-4">
          Signal → Price → Match → Settle.<br />
          <span className="text-coral">Fully automated.</span>
        </h1>
        <p className="text-lg text-text-secondary mb-4 max-w-xl mx-auto">
          The agentic loop runs continuously. Every decision is auditable. Every state transition is event-sourced.
        </p>
        <p className="text-base text-text-secondary mb-8 max-w-xl mx-auto">
          Lenders deploy idle cash into a <span className="text-navy font-semibold">democratised P2P pool</span> — funding borrowers directly, earning micro-returns, with full risk transparency.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-3xl mx-auto mb-8">
          {[
            { step: "Forecast", color: "bg-coral" },
            { step: "→", color: "" },
            { step: "Propose", color: "bg-gray-500" },
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
            { label: "P2P Microlender", desc: " Displays orderbook to lenders. Deploys idle cash to a democratised P2P pool." },
            { label: "Risk Engine", desc: "A/B/C grades drive fee pricing. Higher risk = higher return for lender." },
            { label: "Settlement", desc: "Repayment on shifted date. Full double-entry ledger. Idempotent." },
          ].map(({ label, desc }) => (
            <div key={label} className="card-monzo p-5 text-left">
              <div className="font-extrabold text-navy text-sm mb-1">{label}</div>
              <p className="text-text-secondary text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 7,
    label: "Validation",
    bg: "bg-navy-bg",
    dark: true,
    content: (
      <div className="w-full max-w-4xl mx-auto px-8 text-center">
        <p className="text-coral text-sm font-bold uppercase tracking-widest mb-6">Why We Win</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          Validated against<br />
          <span className="text-coral">303K real loans.</span>
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
          Flowzo risk grades backtested on Home Credit Default Risk data. Grade A predicts defaults better than FICO alone.
        </p>
        <div className="grid grid-cols-2 gap-8 w-full max-w-md mx-auto mb-8">
          {[
            { stat: "Grade A", label: "Default rate < B < C on backtest", color: "text-success" },
            { stat: "> 80%", label: "Auto-matched within 30 seconds", color: "text-white" },
          ].map(({ stat, label, color }) => (
            <div key={stat} className="text-center">
              <div className={`text-2xl sm:text-3xl font-extrabold ${color}`}>{stat}</div>
              <p className="text-xs text-white/50 mt-2 leading-snug">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        <p className="mt-8 text-white text-lg font-bold tracking-wide">The pipeline is live. Try it now.</p>
        <p className="mt-2 text-coral text-sm font-extrabold tracking-widest">flowzo-web.vercel.app</p>
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
    <div className={`h-screen ${slide.bg} transition-colors duration-500 flex flex-col overflow-hidden`}>
      {/* Slide content — fixed height, scrollable if needed */}
      <div className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center pt-16 pb-8">
        {slide.content}
      </div>

      {/* Navigation — fixed at bottom */}
      <div className="flex items-center justify-between px-8 pb-8 pt-2 shrink-0">
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "bg-coral w-6"
                  : slide.dark
                  ? "bg-white/30 w-2 hover:bg-white/60"
                  : "bg-navy/20 w-2 hover:bg-navy/50"
              }`}
              aria-label={s.label}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span className={`text-xs font-semibold uppercase tracking-widest ${slide.dark ? "text-white/40" : "text-text-muted"}`}>
            {current + 1} / {slides.length} — {slide.label}
          </span>
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={current === 0}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                slide.dark
                  ? "bg-white/10 text-white hover:bg-white/20 disabled:opacity-20"
                  : "bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-20"
              }`}
            >
              ←
            </button>
            <button
              onClick={next}
              disabled={current === slides.length - 1}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 bg-coral text-white hover:bg-coral-dark disabled:opacity-20`}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
