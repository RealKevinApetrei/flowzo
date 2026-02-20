"use client";

import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

interface TradeDetailModalProps {
  trade: {
    id: string;
    amount_pence: number;
    fee_pence: number;
    shift_days: number;
    risk_grade: string;
    status: string;
    created_at: string;
  } | null;
  open: boolean;
  onClose: () => void;
  onFund: (tradeId: string) => void;
}

const formatPounds = (pence: number) => "\u00A3" + (pence / 100).toFixed(2);

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-success/10", text: "text-success", label: "Grade A" },
  B: { bg: "bg-warning/10", text: "text-warning", label: "Grade B" },
  C: { bg: "bg-danger/10", text: "text-danger", label: "Grade C" },
};

function annualizedRate(feePence: number, amountPence: number, shiftDays: number): string {
  if (amountPence === 0 || shiftDays === 0) return "0.00%";
  const rate = (feePence / amountPence) * (365 / shiftDays) * 100;
  return rate.toFixed(2) + "%";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TradeDetailModal({ trade, open, onClose, onFund }: TradeDetailModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!trade) return null;

  const badge = RISK_BADGE[trade.risk_grade] ?? RISK_BADGE.B;
  const isFundable = trade.status === "PENDING_MATCH";

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Bottom sheet content */}
        <Dialog.Content
          ref={contentRef}
          className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg bg-white rounded-t-3xl shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-cool-grey" />
          </div>

          {/* Close button */}
          <Dialog.Close className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-warm-grey text-text-secondary hover:bg-cool-grey transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Dialog.Close>

          <div className="px-5 pb-8 pt-2 space-y-5">
            {/* Header */}
            <div className="text-center">
              <Dialog.Title className="text-sm font-medium text-text-secondary">
                Trade Request
              </Dialog.Title>
              <p className="text-4xl font-extrabold text-navy mt-1 tracking-tight">
                {formatPounds(trade.amount_pence)}
              </p>
            </div>

            {/* Risk badge */}
            <div className="flex justify-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Detail rows */}
            <div className="space-y-0 divide-y divide-warm-grey">
              <DetailRow label="Shift duration" value={`${trade.shift_days} days`} />
              <DetailRow label="Fee" value={formatPounds(trade.fee_pence)} />
              <DetailRow
                label="Annualised rate"
                value={annualizedRate(
                  trade.fee_pence,
                  trade.amount_pence,
                  trade.shift_days,
                )}
              />
              <DetailRow label="Status" value={trade.status.replace(/_/g, " ")} />
              <DetailRow label="Created" value={formatDate(trade.created_at)} />
            </div>

            {/* Fund button */}
            {isFundable ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => onFund(trade.id)}
              >
                Fund this trade
              </Button>
            ) : (
              <Button size="lg" className="w-full" variant="secondary" disabled>
                {trade.status === "MATCHED" || trade.status === "LIVE"
                  ? "Already funded"
                  : "Not available"}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}
