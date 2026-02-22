"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { useTheme } from "@/components/providers/theme-provider";
import { TopBar } from "@/components/layout/top-bar";
import { updateDisplayName } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@flowzo/shared";

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
  achievements?: {
    borrowerSavedPence: number;
    borrowerTradeCount: number;
    lenderAmountPence: number;
    lenderPeopleHelped: number;
  };
  creditProfile?: {
    creditScore: number;
    riskGrade: string;
    maxTradeAmount: number;
    maxActiveTrades: number;
    eligibleToBorrow: boolean;
    lastScoredAt: string | null;
  };
}

export function SettingsClient({
  email,
  displayName,
  connections,
  achievements,
  creditProfile,
}: SettingsClientProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(displayName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed.length > 50) {
      toast.error("Name must be 1–50 characters");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("displayName", trimmed);
      await updateDisplayName(fd);
      toast.success("Display name updated");
      setEditingName(false);
      router.refresh();
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSaving(false);
    }
  }

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
      <TopBar title="Profile" />
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
          <div>
            <p className="font-medium text-navy">Display Name</p>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={50}
                  autoFocus
                  className="flex-1 rounded-xl border border-cool-grey px-3 py-1.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-coral/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") { setEditingName(false); setNameValue(displayName ?? ""); }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="rounded-full"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingName(false); setNameValue(displayName ?? ""); }}
                  disabled={saving}
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-text-secondary">{displayName || "Not set"}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-text-muted hover:text-navy transition-colors"
                  aria-label="Edit display name"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Credit Profile */}
        {creditProfile && (
          <section className="card-monzo p-5 space-y-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Credit Profile
            </h2>

            {/* Score + Grade */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-warm-grey" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5"
                    strokeDasharray={`${Math.round((creditProfile.creditScore / 850) * 97.4)} 97.4`}
                    strokeLinecap="round"
                    className={creditProfile.creditScore >= 700 ? "text-success" : creditProfile.creditScore >= 600 ? "text-warning" : "text-danger"}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-navy leading-none">{creditProfile.creditScore}</span>
                  <span className="text-[9px] text-text-muted">/ 850</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    creditProfile.riskGrade === "A" ? "bg-success/10 text-success" :
                    creditProfile.riskGrade === "B" ? "bg-warning/10 text-warning" :
                    "bg-danger/10 text-danger"
                  }`}>
                    Grade {creditProfile.riskGrade}
                  </span>
                  {creditProfile.eligibleToBorrow ? (
                    <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">Eligible</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full">Ineligible</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  {creditProfile.creditScore >= 700 ? "Excellent credit standing" :
                   creditProfile.creditScore >= 600 ? "Good credit standing" :
                   creditProfile.creditScore >= 500 ? "Fair credit standing" :
                   "Below borrowing threshold"}
                </p>
                {creditProfile.lastScoredAt && (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Last assessed {new Date(creditProfile.lastScoredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            {/* Credit Limits */}
            <div className="rounded-xl bg-soft-white p-3 space-y-2">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Your Limits</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Max shift amount</span>
                <span className="font-bold text-navy">£{creditProfile.maxTradeAmount.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Active trades allowed</span>
                <span className="font-bold text-navy">{creditProfile.maxActiveTrades}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Max shift duration</span>
                <span className="font-bold text-navy">
                  {creditProfile.riskGrade === "A" ? "14" : creditProfile.riskGrade === "B" ? "10" : "7"} days
                </span>
              </div>
            </div>

            {!creditProfile.eligibleToBorrow && (
              <p className="text-xs text-danger">
                A credit score of 500 or above is required to borrow. Keep your bank connected and build a positive payment history.
              </p>
            )}
          </section>
        )}

        {/* Achievements */}
        {achievements && (achievements.borrowerSavedPence > 0 || achievements.lenderAmountPence > 0) && (
          <section className="card-monzo p-5 space-y-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Your Impact
            </h2>

            {achievements.borrowerSavedPence > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-success">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-navy">
                    {formatCurrency(achievements.borrowerSavedPence)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    saved from overdraft across {achievements.borrowerTradeCount} bill {achievements.borrowerTradeCount === 1 ? "shift" : "shifts"}
                  </p>
                </div>
              </div>
            )}

            {achievements.lenderAmountPence > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-coral">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-navy">
                    {achievements.lenderPeopleHelped} {achievements.lenderPeopleHelped === 1 ? "person" : "people"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    helped avoid {formatCurrency(achievements.lenderAmountPence)} in overdraft fees through your lending
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

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
