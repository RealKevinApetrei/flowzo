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
  { name: "Netflix", from: "Feb 15", to: "Feb 27", amount: "£15.99", status: "shifted" as const },
  { name: "Council Tax", from: "Feb 18", to: "Feb 28", amount: "£142.00", status: "shifted" as const },
  { name: "Car Insurance", from: "Feb 19", to: "Mar 1", amount: "£67.50", status: "pending" as const },
];

export function LandingPreviews() {
  return (
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

      {/* Bill shift preview — shows how bills get moved to safer dates */}
      <div className="bg-[var(--card-surface)] rounded-3xl shadow-lg border border-cool-grey/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-coral uppercase tracking-wider">Smart Shifts</span>
        </div>
        <h3 className="text-base font-bold text-navy mb-3">Bills moved to safety</h3>
        <div className="space-y-2.5">
          {DEMO_SHIFTS.map((shift) => (
            <div
              key={shift.name}
              className="rounded-xl bg-soft-white p-3 flex items-center gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-coral">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy truncate">{shift.name}</span>
                  <span className="text-sm font-bold text-navy">{shift.amount}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-danger line-through">{shift.from}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-coral flex-shrink-0">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[10px] font-semibold text-success">{shift.to}</span>
                </div>
              </div>
              {shift.status === "shifted" ? (
                <span className="text-[9px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Shifted
                </span>
              ) : (
                <span className="text-[9px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full whitespace-nowrap animate-pulse">
                  1 tap
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-success">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span>Overdraft avoided on 2 bills</span>
        </div>
      </div>
    </div>
  );
}
