"use client";

import { useEffect } from "react";
import { useSupabase } from "./use-supabase";

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls `onInsert` / `onUpdate` / `onDelete` when events occur.
 */
export function useRealtime<T extends object>(
  table: string,
  options: {
    filter?: string;
    onInsert?: (record: T) => void;
    onUpdate?: (record: T) => void;
    onDelete?: (old: T) => void;
  },
) {
  const supabase = useSupabase();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: options.filter,
        },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              options.onInsert?.(payload.new as T);
              break;
            case "UPDATE":
              options.onUpdate?.(payload.new as T);
              break;
            case "DELETE":
              options.onDelete?.(payload.old as T);
              break;
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omitting callback refs to avoid resubscription
  }, [supabase, table, options.filter]);
}
