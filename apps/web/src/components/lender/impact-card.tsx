"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@flowzo/shared";

interface ImpactCardProps {
  stats: {
    peopleHelped: number;
    tradesFunded: number;
    totalLentPence: number;
    essentialBills: number;
  };
}

export function ImpactCard({ stats }: ImpactCardProps) {
  const { peopleHelped, tradesFunded, totalLentPence, essentialBills } = stats;

  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-success">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">Your Impact</h3>
            <p className="text-xs text-text-secondary">How you&apos;re making a difference</p>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-4xl font-extrabold text-navy">{peopleHelped}</p>
          <p className="text-sm font-semibold text-text-secondary mt-1">
            {peopleHelped === 1 ? "person" : "people"} helped
          </p>
        </div>

        {essentialBills > 0 && (
          <p className="text-xs text-text-secondary text-center mb-4 leading-relaxed">
            You&apos;ve helped fund {essentialBills} essential {essentialBills === 1 ? "bill" : "bills"} &mdash; keeping food on the table and lights on.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--card-surface)] p-3 text-center">
            <p className="text-lg font-extrabold text-coral">{tradesFunded}</p>
            <p className="text-[10px] text-text-muted">trades funded</p>
          </div>
          <div className="rounded-xl bg-[var(--card-surface)] p-3 text-center">
            <p className="text-lg font-extrabold text-navy">{formatCurrency(totalLentPence)}</p>
            <p className="text-[10px] text-text-muted">total lent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
