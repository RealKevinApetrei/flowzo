/** Static demo data for the mini heatmap — no server fetch needed */
const DEMO_DAYS = [
  1, 1, 1, 0, 1, 1, 1, // week 1: mostly safe
  1, 1, 2, 2, 1, 1, 0, // week 2: some tight days
  1, -1, -1, 1, 1, 1, 1, // week 3: two danger days
  1, 1, 1, 0, 1, 1, 1, // week 4: mostly safe
  1, 1,                  // remaining
] as const;

function getDemoColor(val: number) {
  if (val < 0) return "bg-danger/20 border-danger";
  if (val === 0) return "bg-warning/20 border-warning";
  return "bg-success/20 border-success";
}

const DEMO_SHIFTS = [
  { name: "Netflix", from: "Feb 15", to: "Feb 27", amount: "£15.99", fee: "£0.18", status: "shifted" as const },
  { name: "Council Tax", from: "Feb 18", to: "Feb 28", amount: "£142.00", fee: "£1.42", status: "shifted" as const },
  { name: "Car Insurance", from: "Feb 19", to: "Mar 1", amount: "£67.50", fee: "£0.54", status: "pending" as const },
  { name: "Energy Bill", from: "Feb 22", to: "Mar 3", amount: "£89.00", fee: "£0.71", status: "shifted" as const },
  { name: "Phone", from: "Feb 24", to: "Mar 5", amount: "£32.00", fee: "£0.26", status: "pending" as const },
];

const DEMO_SUGGESTIONS = [
  { bill: "Spotify", amount: "£10.99", from: "Feb 25", to: "Mar 2", fee: "£0.09", reason: "Balance drops to £23 on Feb 25. Shifting to Mar 2 avoids overdraft risk." },
  { bill: "Gym Membership", amount: "£35.00", from: "Feb 26", to: "Mar 4", fee: "£0.28", reason: "Payday lands Mar 1. Moving this 6 days keeps you safe." },
  { bill: "Water Bill", amount: "£48.00", from: "Feb 27", to: "Mar 6", fee: "£0.38", reason: "Tight cash window. Shifting past payday saves £35 in overdraft fees." },
];

export function LandingPreviews() {
  return (
    <div className="space-y-6">
      {/* Top row: Calendar + Smart Shifts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Borrower preview — mini heatmap */}
        <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-coral uppercase tracking-wider">Forecast</span>
          </div>
          <h3 className="text-base font-bold text-navy mb-3">Cash Calendar</h3>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-medium text-text-muted">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DEMO_DAYS.map((val, i) => (
              <div
                key={i}
                className={`aspect-square rounded-md border-2 ${getDemoColor(val)} flex items-center justify-center`}
              >
                <span className="text-[10px] font-semibold text-navy/70">{i + 1}</span>
                {val < 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-danger" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3 text-[9px] text-text-secondary">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success/30 border border-success" />Safe</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning/30 border border-warning" />Tight</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger/30 border border-danger" />Danger</span>
          </div>
        </div>

        {/* Smart Shifts — filled with more items + stats */}
        <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-coral uppercase tracking-wider">Smart Shifts</span>
          </div>
          <h3 className="text-base font-bold text-navy mb-3">Bills moved to safety</h3>
          <div className="space-y-2 flex-1">
            {DEMO_SHIFTS.map((shift) => (
              <div
                key={shift.name}
                className="rounded-xl bg-soft-white p-2.5 flex items-center gap-2.5"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-coral/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-coral">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M8 14l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-navy truncate">{shift.name}</span>
                    <span className="text-xs font-bold text-navy">{shift.amount}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-danger line-through">{shift.from}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-coral flex-shrink-0">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[9px] font-semibold text-success">{shift.to}</span>
                    <span className="text-[9px] text-text-muted ml-auto">fee {shift.fee}</span>
                  </div>
                </div>
                {shift.status === "shifted" ? (
                  <span className="text-[8px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    Shifted
                  </span>
                ) : (
                  <span className="text-[8px] font-bold text-coral bg-coral/10 px-1.5 py-0.5 rounded-full whitespace-nowrap animate-pulse">
                    1 tap
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-text-muted">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-success">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Overdraft avoided on 3 bills</span>
            </div>
            <span className="font-semibold text-coral">£3.11 total fees</span>
          </div>
        </div>
      </div>

      {/* Full-width Lending card */}
      <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-coral uppercase tracking-wider">Peer Lending</span>
        </div>
        <h3 className="text-lg font-bold text-navy mb-4">Earn yield on idle cash</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Pot */}
          <div className="rounded-2xl bg-soft-white p-4 sm:p-5 text-center">
            <p className="text-xs font-medium text-text-secondary mb-1">Lending Pot</p>
            <p className="text-2xl font-extrabold text-navy">£500</p>
            <p className="text-[10px] text-text-muted mt-1">Available to lend</p>
          </div>
          {/* Active */}
          <div className="rounded-2xl bg-soft-white p-4 sm:p-5 text-center">
            <p className="text-xs font-medium text-text-secondary mb-1">Deployed</p>
            <p className="text-2xl font-extrabold text-coral">£320</p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <p className="text-[10px] text-text-muted">8 active trades</p>
            </div>
          </div>
          {/* Yield */}
          <div className="rounded-2xl bg-soft-white p-4 sm:p-5 text-center">
            <p className="text-xs font-medium text-text-secondary mb-1">Yield Earned</p>
            <p className="text-2xl font-extrabold text-success">£18.40</p>
            <p className="text-[10px] text-text-muted mt-1">12.8% APY average</p>
          </div>
        </div>
        <p className="text-xs text-text-muted text-center mt-4">
          Micro-lend to borrowers shifting bills. Fully automated, risk-graded, and settled on time.
        </p>
      </div>

      {/* AI Suggestions preview with slide arrows */}
      <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-coral uppercase tracking-wider">AI Suggestions</span>
        </div>
        <h3 className="text-base font-bold text-navy mb-3">Personalised shift recommendations</h3>
        <div className="relative">
          {/* Left arrow */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 hidden sm:flex">
            <div className="w-8 h-8 rounded-full bg-[var(--card-surface)] shadow-md border border-cool-grey/50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {/* Right arrow */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 hidden sm:flex">
            <div className="w-8 h-8 rounded-full bg-[var(--card-surface)] shadow-md border border-cool-grey/50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Cards row */}
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {DEMO_SUGGESTIONS.map((s) => (
              <div
                key={s.bill}
                className="flex-shrink-0 w-[260px] sm:w-[280px] rounded-2xl bg-soft-white p-4 snap-start"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-navy">{s.bill}</span>
                  <span className="text-sm font-bold text-navy">{s.amount}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] text-danger line-through">{s.from}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-coral">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[10px] font-semibold text-success">{s.to}</span>
                  <span className="text-[10px] text-text-muted ml-auto">fee {s.fee}</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">{s.reason}</p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-coral text-white text-[10px] font-bold py-1.5 rounded-full">
                    Shift it
                  </button>
                  <button className="flex-1 border border-cool-grey text-text-secondary text-[10px] font-semibold py-1.5 rounded-full">
                    Not now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {DEMO_SUGGESTIONS.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-coral" : "bg-cool-grey"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
