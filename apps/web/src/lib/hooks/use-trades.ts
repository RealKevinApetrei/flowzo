"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "./use-supabase";
import { useRealtime } from "./use-realtime";

interface Trade {
  id: string;
  borrower_id: string;
  obligation_id: string | null;
  amount_pence: number;
  fee_pence: number;
  original_due_date: string;
  shifted_due_date: string;
  shift_days: number;
  status: string;
  risk_grade: string;
  created_at: string;
}

export function useTrades(userId?: string) {
  const supabase = useSupabase();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("borrower_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTrades(data as Trade[]);
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useRealtime<Trade>("trades", {
    filter: userId ? `borrower_id=eq.${userId}` : undefined,
    onInsert: (trade) => setTrades((prev) => [trade, ...prev]),
    onUpdate: (trade) =>
      setTrades((prev) => prev.map((t) => (t.id === trade.id ? trade : t))),
  });

  return { trades, loading, refetch: fetchTrades };
}
