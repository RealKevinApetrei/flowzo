"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SyncStatusBanner({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("syncing");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        const { data } = await supabase
          .from("bank_connections")
          .select("status")
          .eq("id", connectionId)
          .single();

        if (cancelled) break;

        const s = data?.status ?? "syncing";
        setStatus(s);

        if (s === "active" || s === "sync_failed") {
          // Pipeline finished — refresh server data
          router.refresh();
          break;
        }

        await new Promise((r) => setTimeout(r, 3000));
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [connectionId, router]);

  if (status === "active") return null;

  if (status === "sync_failed") {
    return (
      <div className="rounded-2xl bg-danger/10 border border-danger/20 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-danger">Sync failed</p>
          <p className="text-xs text-text-secondary">Try reconnecting your bank from Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-coral/5 border border-coral/20 px-4 py-3 flex items-center gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-coral animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-navy">Syncing your bank data...</p>
        <p className="text-xs text-text-secondary">This usually takes 10-30 seconds.</p>
      </div>
    </div>
  );
}
