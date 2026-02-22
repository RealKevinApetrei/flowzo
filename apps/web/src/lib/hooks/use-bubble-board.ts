"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "./use-supabase";
import { useRealtime } from "./use-realtime";

export interface BubbleTrade {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  created_at: string;
  borrower_name?: string;
}

// DB row shape (GBP decimal)
interface TradeRow {
  id: string;
  amount: number;
  fee: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  created_at: string;
  profiles: { display_name: string | null }[] | { display_name: string | null } | null;
}

function rowToBubble(row: TradeRow): BubbleTrade {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    amount_pence: Math.round(Number(row.amount) * 100),
    fee_pence: Math.round(Number(row.fee) * 100),
    shift_days: Number(row.shift_days),
    risk_grade: row.risk_grade,
    status: row.status,
    created_at: row.created_at,
    borrower_name: profile?.display_name ?? undefined,
  };
}

export function useBubbleBoard() {
  const supabase = useSupabase();
  const [trades, setTrades] = useState<BubbleTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpenTrades = useCallback(async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("id, amount, fee, shift_days, risk_grade, status, created_at, profiles!borrower_id(display_name)")
      .in("status", ["PENDING_MATCH", "MATCHED", "LIVE"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTrades((data as TradeRow[]).map(rowToBubble));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
    fetchOpenTrades();
  }, [fetchOpenTrades]);

  useRealtime<TradeRow>("trades", {
    onInsert: (row) => {
      if (["PENDING_MATCH", "MATCHED", "LIVE"].includes(row.status)) {
        setTrades((prev) => [rowToBubble(row), ...prev]);
      }
    },
    onUpdate: (row) => {
      if (["REPAID", "DEFAULTED", "CANCELLED"].includes(row.status)) {
        setTrades((prev) => prev.filter((t) => t.id !== row.id));
      } else {
        setTrades((prev) =>
          prev.map((t) => (t.id === row.id ? rowToBubble(row) : t)),
        );
      }
    },
  });

  return { trades, loading, refetch: fetchOpenTrades };
}
