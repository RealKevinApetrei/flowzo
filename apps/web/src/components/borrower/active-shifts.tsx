import { formatCurrency } from "@flowzo/shared";

interface ActiveShift {
  id: string;
  obligation_name: string;
  amount_pence: number;
  fee_pence: number;
  original_due_date: string;
  new_due_date: string;
  shift_days: number;
  status: string;
  matched_at: string | null;
  live_at: string | null;
}

interface ActiveShiftsProps {
  shifts: ActiveShift[];
}

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(dateStr));
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function progressPercent(shift: ActiveShift): number {
  const start = new Date(shift.live_at ?? shift.matched_at ?? shift.original_due_date).getTime();
  const end = new Date(shift.new_due_date).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

export function ActiveShifts({ shifts }: ActiveShiftsProps) {
  if (shifts.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-bold text-navy mb-3">Active Shifts</h2>
      <div className="space-y-3">
        {shifts.map((shift) => {
          const remaining = daysUntil(shift.new_due_date);
          const progress = progressPercent(shift);
          const isLive = shift.status === "LIVE";

          return (
            <div
              key={shift.id}
              className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-coral">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy">{shift.obligation_name}</p>
                    <p className="text-xs text-text-secondary">{formatCurrency(shift.amount_pence)}</p>
                  </div>
                </div>
                {isLive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full">
                    Matched
                  </span>
                )}
              </div>

              {/* Dates row */}
              <div className="flex items-center gap-1.5 text-xs mb-3">
                <span className="text-text-muted line-through">{formatShortDate(shift.original_due_date)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-coral flex-shrink-0">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-navy">{formatShortDate(shift.new_due_date)}</span>
                <span className="text-text-muted ml-auto">fee {formatCurrency(shift.fee_pence)}</span>
              </div>

              {/* Progress bar */}
              <div className="relative h-1.5 rounded-full bg-warm-grey overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-coral transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Repayment info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  <span>Auto-repayment -- cannot be rescheduled</span>
                </div>
                <span className="text-xs font-bold text-navy">
                  {remaining === 0 ? "Today" : `${remaining}d left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
