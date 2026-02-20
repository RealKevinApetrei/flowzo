"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "./use-supabase";
import { useRealtime } from "./use-realtime";

interface BubbleTrade {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  created_at: string;
}

export function useBubbleBoard() {
  const supabase = useSupabase();
  const [trades, setTrades] = useState<BubbleTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpenTrades = useCallback(async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("id, amount_pence, fee_pence, shift_days, risk_grade, status, created_at")
      .in("status", ["PENDING_MATCH", "MATCHED", "LIVE"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTrades(data as BubbleTrade[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOpenTrades();
  }, [fetchOpenTrades]);

  useRealtime<BubbleTrade>("trades", {
    onInsert: (trade) => {
      if (["PENDING_MATCH", "MATCHED", "LIVE"].includes(trade.status)) {
        setTrades((prev) => [trade, ...prev]);
      }
    },
    onUpdate: (trade) => {
      if (["REPAID", "DEFAULTED", "CANCELLED"].includes(trade.status)) {
        setTrades((prev) => prev.filter((t) => t.id !== trade.id));
      } else {
        setTrades((prev) => prev.map((t) => (t.id === trade.id ? trade : t)));
      }
    },
  });

  return { trades, loading, refetch: fetchOpenTrades };
}
