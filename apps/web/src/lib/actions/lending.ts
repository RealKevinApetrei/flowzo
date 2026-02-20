"use server";

import { createClient } from "@/lib/supabase/server";
import { lenderPreferencesSchema } from "@/lib/validators";

export async function updateLenderPreferences(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const input = lenderPreferencesSchema.parse({
    min_apr_bps: Number(formData.get("min_apr_bps")),
    max_shift_days: Number(formData.get("max_shift_days")),
    risk_bands: formData.getAll("risk_bands"),
    auto_match_enabled: formData.get("auto_match_enabled") === "true",
  });

  const { error } = await supabase
    .from("lender_preferences")
    .upsert({
      user_id: user.id,
      ...input,
    })
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to update preferences: ${error.message}`);
}

export async function toggleAutoMatch(enabled: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("lender_preferences")
    .upsert({
      user_id: user.id,
      auto_match_enabled: enabled,
    })
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to toggle auto-match: ${error.message}`);
}
