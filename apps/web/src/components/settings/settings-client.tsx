"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { useTheme } from "@/components/providers/theme-provider";
import { TopBar } from "@/components/layout/top-bar";

interface SettingsClientProps {
  email: string;
  displayName: string | null;
  rolePreference: string;
  connections: Array<{
    id: string;
    provider: string;
    status: string;
    last_synced_at: string | null;
  }>;
  onboardingCompleted: boolean;
  lenderPrefs?: {
    min_apr: number;
    max_shift_days: number;
    risk_bands: string[];
    auto_match_enabled: boolean;
  };
}

export function SettingsClient({
  email,
  displayName,
  connections,
}: SettingsClientProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    toast("Signed out successfully");
    router.push("/login");
    router.refresh();
  }

  function handleConnectBank() {
    window.location.href = "/api/truelayer/auth";
  }

  return (
    <div>
      <TopBar title="Settings" />
      <div className="px-4 py-6 space-y-6 max-w-lg sm:max-w-2xl mx-auto">
        {/* Account */}
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Account
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Email</p>
              <p className="text-sm text-text-secondary">{email}</p>
            </div>
            <span className="text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>
          {displayName && (
            <div>
              <p className="font-medium text-navy">Display Name</p>
              <p className="text-sm text-text-secondary">{displayName}</p>
            </div>
          )}
        </section>

        {/* Bank Connections */}
        <section className="card-monzo p-5 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Bank Connections
          </h2>
          {connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between py-2 border-b border-warm-grey last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-coral/10 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-coral">
                        <path d="M3 21h18" /><path d="M3 10h18" /><path d="M12 3l9 7H3l9-7z" />
                        <path d="M5 10v11" /><path d="M19 10v11" /><path d="M9 10v11" /><path d="M14 10v11" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-navy capitalize">{conn.provider}</p>
                      <p className="text-xs text-text-muted">
                        {conn.last_synced_at
                          ? `Synced ${new Date(conn.last_synced_at).toLocaleDateString()}`
                          : "Not synced yet"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      conn.status === "active"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {conn.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No bank accounts connected yet.</p>
          )}
          <button
            onClick={handleConnectBank}
            className="w-full bg-coral text-white font-semibold py-2.5 rounded-full hover:bg-coral-dark transition-colors text-sm active:scale-95 transition-transform"
          >
            {connections.length > 0 ? "Connect Another Bank" : "Connect Bank"}
          </button>
        </section>

        {/* Appearance */}
        <section className="card-monzo p-5 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Appearance
          </h2>
          <div className="flex items-center gap-1.5 bg-warm-grey p-1 rounded-full">
            {(["light", "system", "dark"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  theme === option
                    ? "bg-coral text-white shadow-sm"
                    : "text-text-secondary hover:text-navy"
                }`}
              >
                {option === "light" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    Light
                  </span>
                ) : option === "dark" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                    Dark
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    System
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full border border-danger text-danger font-semibold py-2.5 rounded-full hover:bg-danger hover:text-white transition-colors text-sm disabled:opacity-50 active:scale-95 transition-transform"
        >
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>

        {/* Legal */}
        <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
          <Link href="/terms" className="hover:text-navy transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-navy transition-colors">Privacy</Link>
          <Link href="/fca-disclaimer" className="hover:text-navy transition-colors">FCA Disclaimer</Link>
        </div>

        {/* App version */}
        <p className="text-center text-xs text-text-muted">
          Flowzo v0.1.0 — Hackathon Build
        </p>
      </div>
    </div>
  );
}
