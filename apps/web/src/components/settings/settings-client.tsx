"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { useTheme } from "@/components/providers/theme-provider";
import { useLenderSettings, BUBBLE_COLOR_PRESETS } from "@/lib/hooks/use-lender-settings";
import type { HudPosition, FilterMode, BubbleColorMode } from "@/lib/hooks/use-lender-settings";
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
    hudPosition,
    setHudPosition,
    defaultFilterMode,
    setDefaultFilterMode,
    bubbleColorMode,
    setBubbleColorMode,
    unifiedColorHex,
    setUnifiedColorHex,
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

  // Notification preferences (UI only — no backend wiring)
  const [notifTradeUpdates, setNotifTradeUpdates] = useState(true);
  const [notifForecastAlerts, setNotifForecastAlerts] = useState(true);
  const [notifEmailDigest, setNotifEmailDigest] = useState(false);

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
        toast.success("Lending preferences saved");
      } catch {
        toast.error("Failed to save lending preferences");
      }
    });
  }

  return (
    <div>
      <TopBar title="Settings" />
      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Account Section */}
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
                      <span className="text-coral text-sm">🏦</span>
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
                toast(checked ? "Trade updates enabled" : "Trade updates disabled");
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
                toast(checked ? "Forecast alerts enabled" : "Forecast alerts disabled");
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Weekly email digest</p>
              <p className="text-xs text-text-secondary">
                Summary of your activity and upcoming bills
              </p>
            </div>
            <Switch
              checked={notifEmailDigest}
              onCheckedChange={(checked) => {
                setNotifEmailDigest(checked);
                toast(checked ? "Email digest enabled" : "Email digest disabled");
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
                onClick={() => {
                  setTheme(option);
                  toast(`Theme set to ${option}`);
                }}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  theme === option
                    ? "bg-coral text-white shadow-sm"
                    : "text-text-secondary hover:text-navy"
                }`}
              >
                {option === "light" ? "☀️ Light" : option === "dark" ? "🌙 Dark" : "💻 System"}
              </button>
            ))}
          </div>
        </section>

        {/* Lender Display */}
        <section className="card-monzo p-5 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Lender Display
          </h2>
          <div>
            <p className="font-medium text-navy mb-2">HUD Position</p>
            <div className="flex items-center gap-1.5 bg-warm-grey p-1 rounded-full">
              {(["top", "side", "hidden"] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => {
                    setHudPosition(pos);
                    toast(`HUD position set to ${pos}`);
                  }}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    hudPosition === pos
                      ? "bg-coral text-white shadow-sm"
                      : "text-text-secondary hover:text-navy"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-navy mb-2">Default Filter Mode</p>
            <div className="flex items-center gap-1.5 bg-warm-grey p-1 rounded-full">
              {(["simple", "advanced"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setDefaultFilterMode(mode);
                    toast(`Default filter mode set to ${mode}`);
                  }}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    defaultFilterMode === mode
                      ? "bg-coral text-white shadow-sm"
                      : "text-text-secondary hover:text-navy"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-navy mb-2">Bubble Colors</p>
            <div className="flex items-center gap-1.5 bg-warm-grey p-1 rounded-full mb-3">
              {(["by-grade", "unified"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setBubbleColorMode(mode);
                    toast(`Bubble colors set to ${mode === "by-grade" ? "by grade" : "unified"}`);
                  }}
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
                    onClick={() => {
                      setUnifiedColorHex(preset.hex);
                      toast(`Bubble color set to ${preset.name}`);
                    }}
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
        </section>

        {/* Lending Preferences */}
        <section className="card-monzo p-5 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Lending Preferences
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
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>0%</span>
              <span>20%</span>
            </div>
          </div>

          {/* Max shift days */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-medium text-navy">Max shift days</p>
              <span className="text-sm font-bold text-coral">{maxShiftDays} days</span>
            </div>
            <input
              type="range"
              min={1}
              max={90}
              step={1}
              value={maxShiftDays}
              onChange={(e) => setMaxShiftDays(Number(e.target.value))}
              className="w-full h-1.5 bg-warm-grey rounded-full appearance-none cursor-pointer accent-coral"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>1 day</span>
              <span>90 days</span>
            </div>
          </div>

          {/* Risk bands */}
          <div>
            <p className="font-medium text-navy mb-2">Accepted risk grades</p>
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

          {/* Save button */}
          <button
            onClick={handleSaveLenderPrefs}
            disabled={isPrefSaving}
            className="w-full bg-coral text-white font-semibold py-2.5 rounded-full hover:bg-coral-dark transition-colors text-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isPrefSaving ? "Saving..." : "Save Lending Preferences"}
          </button>
        </section>

        {/* Preferences */}
        <section className="card-monzo p-5 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Preferences
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Role Preference</p>
              <p className="text-xs text-text-secondary">
                How you primarily use Flowzo
              </p>
            </div>
            <span className="text-sm font-medium text-coral capitalize">
              {rolePreference}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-navy">Onboarding</p>
              <p className="text-xs text-text-secondary">Setup status</p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                onboardingCompleted
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {onboardingCompleted ? "Complete" : "Incomplete"}
            </span>
          </div>
        </section>

        {/* Legal */}
        <section className="card-monzo p-5 space-y-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Legal
          </h2>
          <a href="/terms" className="block text-sm text-navy hover:text-coral transition-colors py-1">
            Terms of Service
          </a>
          <a href="/privacy" className="block text-sm text-navy hover:text-coral transition-colors py-1">
            Privacy Policy
          </a>
          <a href="/fca-disclaimer" className="block text-sm text-navy hover:text-coral transition-colors py-1">
            FCA Disclaimer
          </a>
        </section>

        {/* Sign Out */}
        <section className="card-monzo p-5 space-y-3 border border-danger/20">
          <h2 className="text-xs font-semibold text-danger uppercase tracking-wider">
            Danger Zone
          </h2>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full border border-danger text-danger font-semibold py-2.5 rounded-full hover:bg-danger hover:text-white transition-colors text-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </section>

        {/* App version */}
        <p className="text-center text-xs text-text-muted">
          Flowzo v0.1.0 — Hackathon Build
        </p>
      </div>
    </div>
  );
}
