import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch bank connections
  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, provider, status, last_synced_at")
    .eq("user_id", user?.id ?? "");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role_preference, onboarding_completed")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <SettingsClient
      email={user?.email ?? ""}
      displayName={profile?.display_name ?? null}
      rolePreference={profile?.role_preference ?? "both"}
      connections={connections ?? []}
      onboardingCompleted={profile?.onboarding_completed ?? false}
    />
  );
}
