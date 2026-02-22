"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createTrade, submitTrade } from "@/lib/actions/trades";
import { toast } from "sonner";
import { SuggestionCard } from "@/components/borrower/suggestion-card";

interface Proposal {
  id: string;
  type: string;
  status: string;
  payload: {
    obligation_id?: string;
    obligation_name: string;
    original_date: string;
    shifted_date: string;
    amount_pence: number;
    fee_pence: number;
    shift_days: number;
  };
  explanation_text: string | null;
}

interface SuggestionFeedProps {
  userId: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-warm-grey" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-warm-grey rounded-full w-3/4" />
          <div className="h-5 bg-warm-grey rounded-full w-1/3" />
        </div>
      </div>
      <div className="mt-4 h-16 bg-warm-grey rounded-xl" />
      <div className="mt-3 flex gap-2">
        <div className="h-9 bg-warm-grey rounded-full flex-1" />
        <div className="h-9 bg-warm-grey rounded-full flex-1" />
      </div>
    </div>
  );
}

export function SuggestionFeed({ userId }: SuggestionFeedProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const fetchProposals = useCallback(async () => {
    const { data, error } = await supabase
      .from("agent_proposals")
      .select("id, type, status, payload, explanation_text")
      .eq("user_id", userId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch proposals:", error);
      setError("Failed to load suggestions");
    } else if (data) {
      const mapped: Proposal[] = data.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        payload: {
          obligation_id: row.payload.obligation_id,
          obligation_name: row.payload.obligation_name,
          original_date: row.payload.original_date,
          shifted_date: row.payload.shifted_date,
          amount_pence: row.payload.amount_pence,
          fee_pence: row.payload.fee_pence,
          shift_days: row.payload.shift_days,
        },
        explanation_text: row.explanation_text,
      }));
      setProposals(mapped);
    }
    setLoading(false);
  }, [supabase, userId]);

  // Touch swipe refs (must be before early returns to satisfy rules of hooks)
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);


  async function handleAccept(proposalId: string, adjustedFeePence?: number) {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    try {
      const feePence = adjustedFeePence ?? proposal.payload.fee_pence;
      const formData = new FormData();
      formData.set("obligation_id", proposal.payload.obligation_id ?? "");
      formData.set("original_due_date", proposal.payload.original_date);
      formData.set("new_due_date", proposal.payload.shifted_date);
      formData.set("amount_pence", String(proposal.payload.amount_pence));
      formData.set("fee_pence", String(feePence));

      const trade = await createTrade(formData);
      await submitTrade(trade.id);

      await supabase
        .from("agent_proposals")
        .update({ status: "ACCEPTED", trade_id: trade.id, responded_at: new Date().toISOString() })
        .eq("id", proposalId);

      setProposals((prev) => {
        const next = prev.filter((p) => p.id !== proposalId);
        // Keep activeIndex in bounds
        setActiveIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
      toast.success("Proposal accepted -- trade created!");
      router.refresh();
    } catch (err) {
      console.error("Failed to accept proposal:", err);
      toast.error("Failed to accept proposal. Please try again.");
    }
  }

  async function handleDismiss(proposalId: string) {
    try {
      await supabase
        .from("agent_proposals")
        .update({ status: "DISMISSED", responded_at: new Date().toISOString() })
        .eq("id", proposalId);

      setProposals((prev) => {
        const next = prev.filter((p) => p.id !== proposalId);
        setActiveIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
      toast("Suggestion dismissed");
    } catch (err) {
      console.error("Failed to dismiss proposal:", err);
      toast.error("Failed to dismiss. Please try again.");
    }
  }

  if (loading) {
    return <SkeletonCard />;
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-8 text-center">
        <h3 className="text-base font-bold text-navy">Unable to load suggestions</h3>
        <p className="text-sm text-text-secondary mt-1">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--card-surface)] shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-success"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-navy">All caught up!</h3>
        <p className="text-sm text-text-secondary mt-1">
          No suggestions right now. We&apos;ll let you know if anything comes up.
        </p>
      </div>
    );
  }

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(index, proposals.length - 1)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    const threshold = 50; // minimum px to count as a swipe
    if (Math.abs(touchDeltaX.current) > threshold) {
      if (touchDeltaX.current < 0) {
        // Swiped left → next
        goTo(activeIndex + 1);
      } else {
        // Swiped right → previous
        goTo(activeIndex - 1);
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  }

  const activeProposal = proposals[activeIndex];

  return (
    <div>
      {/* Card count + arrows */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-text-muted">
          {activeIndex + 1} of {proposals.length} suggestion{proposals.length !== 1 ? "s" : ""}
        </p>
        {proposals.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="flex w-7 h-7 rounded-full border border-cool-grey/50 items-center justify-center disabled:opacity-30"
              aria-label="Previous suggestion"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-text-secondary">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === proposals.length - 1}
              className="flex w-7 h-7 rounded-full border border-cool-grey/50 items-center justify-center disabled:opacity-30"
              aria-label="Next suggestion"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-text-secondary">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Active card with touch swipe */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="touch-pan-y"
      >
        {activeProposal && (
          <SuggestionCard
            proposal={activeProposal}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        )}
      </div>

      {/* Dot indicators */}
      {proposals.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {proposals.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === activeIndex ? "bg-coral w-4" : "bg-warm-grey"
              }`}
              aria-label={`Go to suggestion ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
