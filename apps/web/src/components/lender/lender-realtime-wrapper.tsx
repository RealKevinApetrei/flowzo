"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/lib/hooks/use-realtime";

interface LenderRealtimeWrapperProps {
  userId: string;
  children: React.ReactNode;
}

export function LenderRealtimeWrapper({ userId, children }: LenderRealtimeWrapperProps) {
  const router = useRouter();

  // Refresh when lending pot balance changes (deposits, withdrawals, fee credits)
  useRealtime("lending_pots", {
    filter: `user_id=eq.${userId}`,
    onUpdate: () => router.refresh(),
  });

  // Refresh when allocations change (new match, repayment, default)
  useRealtime("allocations", {
    filter: `lender_id=eq.${userId}`,
    onInsert: () => router.refresh(),
    onUpdate: () => router.refresh(),
  });

  return <>{children}</>;
}
