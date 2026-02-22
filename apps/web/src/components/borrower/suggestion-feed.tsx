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
  const scrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Scroll to active card when activeIndex changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.children[activeIndex] as HTMLElement | undefined;
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeIndex]);

  // Track scroll position to update active dot
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    function onScroll() {
      if (!container) return;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.max(0, Math.min(index, proposals.length - 1)));
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [proposals.length]);

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

  function scrollTo(index: number) {
    const clamped = Math.max(0, Math.min(index, proposals.length - 1));
    setActiveIndex(clamped);
    const container = scrollRef.current;
    if (container) {
      const card = container.children[clamped] as HTMLElement;
      card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  return (
    <div className="relative">
      {/* Card count */}
      <p className="text-xs text-text-muted mb-2">
        {activeIndex + 1} of {proposals.length} suggestion{proposals.length !== 1 ? "s" : ""}
      </p>

      {/* Carousel scroll container */}
      <div className="relative">
        {/* Left arrow */}
        {proposals.length > 1 && activeIndex > 0 && (
          <button
            onClick={() => scrollTo(activeIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex w-8 h-8 rounded-full bg-[var(--card-surface)] shadow-md border border-cool-grey/50 items-center justify-center"
            aria-label="Previous suggestion"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {proposals.length > 1 && activeIndex < proposals.length - 1 && (
          <button
            onClick={() => scrollTo(activeIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex w-8 h-8 rounded-full bg-[var(--card-surface)] shadow-md border border-cool-grey/50 items-center justify-center"
            aria-label="Next suggestion"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide"
        >
        {proposals.map((proposal) => (
          <div key={proposal.id} className="min-w-full snap-center">
            <SuggestionCard
              proposal={proposal}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          </div>
        ))}
      </div>
      </div>

      {/* Dot indicators */}
      {proposals.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {proposals.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
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
