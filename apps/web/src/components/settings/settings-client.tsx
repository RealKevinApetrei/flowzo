"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { useTheme } from "@/components/providers/theme-provider";
import { useLenderSettings, BUBBLE_COLOR_PRESETS } from "@/lib/hooks/use-lender-settings";
import type { BubbleColorMode } from "@/lib/hooks/use-lender-settings";
import { TopBar } from "@/components/layout/top-bar";
import { Switch } from "@/components/ui/switch";
import { updateLenderPreferences } from "@/lib/actions/lending";

interface LenderPrefs {
  min_apr: number;
  max_shift_days: number;
  risk_bands: string[];
  auto_match_enabled: boolean;
}

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
  lenderPrefs?: LenderPrefs;
}

export function SettingsClient({
  email,
  displayName,
  rolePreference,
  connections,
  onboardingCompleted,
  lenderPrefs,
}: SettingsClientProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const {
    bubbleColorMode,
    setBubbleColorMode,
    unifiedColorHex,
    setUnifiedColorHex,
    amountRange,
    setAmountRange,
    termRange,
    setTermRange,
  } = useLenderSettings();
  const [signingOut, setSigningOut] = useState(false);
  const [isPrefSaving, startPrefTransition] = useTransition();

  // Lender preference state
  const [minApr, setMinApr] = useState(lenderPrefs?.min_apr ?? 5);
  const [maxShiftDays, setMaxShiftDays] = useState(lenderPrefs?.max_shift_days ?? 14);
  const [riskBands, setRiskBands] = useState<Set<string>>(
    new Set(lenderPrefs?.risk_bands ?? ["A", "B", "C"]),
  );
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(
    lenderPrefs?.auto_match_enabled ?? false,
  );

  // Notification preferences
  const [notifTradeUpdates, setNotifTradeUpdates] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("flowzo-notif-trade") !== "false";
  });
  const [notifForecastAlerts, setNotifForecastAlerts] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("flowzo-notif-forecast") !== "false";
  });

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

  function handleToggleRiskBand(band: string) {
    setRiskBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) {
        if (next.size > 1) next.delete(band);
      } else {
        next.add(band);
      }
      return next;
    });
  }

  function handleSaveLenderPrefs() {
    startPrefTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("min_apr", String(minApr));
        formData.set("max_shift_days", String(maxShiftDays));
        for (const band of riskBands) {
          formData.append("risk_bands", band);
        }
        formData.set("auto_match_enabled", String(autoMatchEnabled));
        await updateLenderPreferences(formData);
        toast.success("Preferences saved");
      } catch {
        toast.error("Failed to save preferences");
      }
    });
  }

  return (
    <div>
      <TopBar title="Settings" />
      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
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

        {/* Lending */}
        <section className="card-monzo p-5 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Lending
          </h2>

          {/* Auto-match */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Auto-match</p>
              <p className="text-xs text-text-secondary">
                Automatically fund trades matching your criteria
              </p>
            </div>
            <Switch
              checked={autoMatchEnabled}
              onCheckedChange={setAutoMatchEnabled}
            />
          </div>

          {/* Amount range */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-medium text-navy">Amount range</p>
              <span className="text-sm font-bold text-coral">
                {"\u00A3"}{(amountRange[0] / 100).toFixed(0)} – {"\u00A3"}{(amountRange[1] / 100).toFixed(0)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-8">Min</span>
                <input
                  type="range"
                  min={0}
                  max={amountRange[1]}
                  step={500}
                  value={amountRange[0]}
                  onChange={(e) => setAmountRange([Number(e.target.value), amountRange[1]])}
                  className="flex-1 h-1.5 bg-warm-grey rounded-full appearance-none cursor-pointer accent-coral"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-8">Max</span>
                <input
                  type="range"
                  min={amountRange[0]}
                  max={100000}
                  step={500}
                  value={amountRange[1]}
                  onChange={(e) => setAmountRange([amountRange[0], Number(e.target.value)])}
                  className="flex-1 h-1.5 bg-warm-grey rounded-full appearance-none cursor-pointer accent-coral"
                />
              </div>
            </div>
          </div>

          {/* Term range */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-medium text-navy">Term range</p>
              <span className="text-sm font-bold text-coral">
                {termRange[0]}d – {termRange[1]}d
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-8">Min</span>
                <input
                  type="range"
                  min={1}
                  max={termRange[1]}
                  step={1}
                  value={termRange[0]}
                  onChange={(e) => setTermRange([Number(e.target.value), termRange[1]])}
                  className="flex-1 h-1.5 bg-warm-grey rounded-full appearance-none cursor-pointer accent-coral"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-8">Max</span>
                <input
                  type="range"
                  min={termRange[0]}
                  max={90}
                  step={1}
                  value={termRange[1]}
                  onChange={(e) => setTermRange([termRange[0], Number(e.target.value)])}
                  className="flex-1 h-1.5 bg-warm-grey rounded-full appearance-none cursor-pointer accent-coral"
                />
              </div>
            </div>
          </div>

          {/* Min APR */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-medium text-navy">Minimum APR</p>
              <span className="text-sm font-bold text-coral">{minApr}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={minApr}
              onChange={(e) => setMinApr(Number(e.target.value))}
              className="w-full h-1.5 bg-warm-grey rounded-full appearance-none cursor-pointer accent-coral"
            />
          </div>

          {/* Risk bands */}
          <div>
            <p className="font-medium text-navy mb-2">Risk grades</p>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((band) => (
                <button
                  key={band}
                  onClick={() => handleToggleRiskBand(band)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                    riskBands.has(band)
                      ? band === "A"
                        ? "bg-success/15 text-success ring-1 ring-success/30"
                        : band === "B"
                          ? "bg-warning/15 text-warning ring-1 ring-warning/30"
                          : "bg-danger/15 text-danger ring-1 ring-danger/30"
                      : "bg-warm-grey text-text-muted"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>

          {/* Bubble colors */}
          <div>
            <p className="font-medium text-navy mb-2">Bubble colors</p>
            <div className="flex items-center gap-1.5 bg-warm-grey p-1 rounded-full mb-3">
              {(["by-grade", "unified"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBubbleColorMode(mode)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                    bubbleColorMode === mode
                      ? "bg-coral text-white shadow-sm"
                      : "text-text-secondary hover:text-navy"
                  }`}
                >
                  {mode === "by-grade" ? "By Grade" : "Unified"}
                </button>
              ))}
            </div>
            {bubbleColorMode === "unified" && (
              <div className="flex flex-wrap gap-2.5">
                {BUBBLE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    onClick={() => setUnifiedColorHex(preset.hex)}
                    className="relative w-10 h-10 rounded-full transition-transform hover:scale-110 active:scale-95"
                    style={{ background: preset.hex }}
                    aria-label={preset.name}
                  >
                    {unifiedColorHex === preset.hex && (
                      <svg className="absolute inset-0 m-auto w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveLenderPrefs}
            disabled={isPrefSaving}
            className="w-full bg-coral text-white font-semibold py-2.5 rounded-full hover:bg-coral-dark transition-colors text-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isPrefSaving ? "Saving..." : "Save Lending Preferences"}
          </button>
        </section>

        {/* Notifications */}
        <section className="card-monzo p-5 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Trade updates</p>
              <p className="text-xs text-text-secondary">
                Get notified when trades are matched or settled
              </p>
            </div>
            <Switch
              checked={notifTradeUpdates}
              onCheckedChange={(checked) => {
                setNotifTradeUpdates(checked);
                localStorage.setItem("flowzo-notif-trade", String(checked));
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Forecast alerts</p>
              <p className="text-xs text-text-secondary">
                Warn when upcoming bills may cause a shortfall
              </p>
            </div>
            <Switch
              checked={notifForecastAlerts}
              onCheckedChange={(checked) => {
                setNotifForecastAlerts(checked);
                localStorage.setItem("flowzo-notif-forecast", String(checked));
              }}
            />
          </div>
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

        {/* App version */}
        <p className="text-center text-xs text-text-muted">
          Flowzo v0.1.0 — Hackathon Build
        </p>
      </div>
    </div>
  );
}
