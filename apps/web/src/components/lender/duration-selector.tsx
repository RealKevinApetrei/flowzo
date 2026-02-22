"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@flowzo/shared";
import { updateDurationPreference } from "@/lib/actions/lending";
import { toast } from "sonner";

interface DurationOption {
  days: number;
  aprPct: number;
  gainPence: number;
}

interface DurationSelectorProps {
  options: DurationOption[];
  initialMaxShiftDays: number;
}

export function DurationSelector({ options, initialMaxShiftDays }: DurationSelectorProps) {
  const [selected, setSelected] = useState(initialMaxShiftDays);
  const [isPending, startTransition] = useTransition();

  function handleSelect(days: number) {
    setSelected(days);
    startTransition(async () => {
      try {
        await updateDurationPreference(days);
      } catch {
        toast.error("Failed to update preference");
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-navy mb-1">Lending Duration</h3>
        <p className="text-xs text-text-secondary mb-4">
          Choose how long you&apos;re willing to lend. Longer terms earn more.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {options.map((opt) => {
            const isActive = selected === opt.days;
            return (
              <button
                key={opt.days}
                disabled={isPending}
                onClick={() => handleSelect(opt.days)}
                className={`
                  rounded-2xl p-4 text-center transition-all duration-200 border-2
                  ${isActive
                    ? "bg-coral text-white border-coral shadow-md scale-[1.02]"
                    : "bg-soft-white text-navy border-transparent hover:border-coral/30"
                  }
                `}
              >
                <p className={`text-xl font-extrabold ${isActive ? "text-white" : "text-navy"}`}>
                  {opt.days}d
                </p>
                <p className={`text-[10px] mt-1 ${isActive ? "text-white/80" : "text-text-secondary"}`}>
                  {opt.aprPct.toFixed(1)}% APR
                </p>
                <p className={`text-xs font-bold mt-2 ${isActive ? "text-white" : "text-success"}`}>
                  +{formatCurrency(opt.gainPence)}
                </p>
                <p className={`text-[9px] ${isActive ? "text-white/60" : "text-text-muted"}`}>
                  expected gain
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
