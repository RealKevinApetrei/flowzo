"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function useSupabase() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  return supabase;
}
