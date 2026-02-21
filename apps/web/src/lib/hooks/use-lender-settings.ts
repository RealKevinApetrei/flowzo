"use client";

import { useState, useEffect, useCallback } from "react";

export type HudPosition = "top" | "side" | "hidden";
export type FilterMode = "simple" | "advanced";

interface LenderSettings {
  hudPosition: HudPosition;
  defaultFilterMode: FilterMode;
}

const STORAGE_KEY = "flowzo-lender-settings";

const DEFAULTS: LenderSettings = {
  hudPosition: "top",
  defaultFilterMode: "simple",
};

function readSettings(): LenderSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(settings: LenderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

export function useLenderSettings() {
  const [settings, setSettings] = useState<LenderSettings>(DEFAULTS);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  const setHudPosition = useCallback((hudPosition: HudPosition) => {
    setSettings((prev) => {
      const next = { ...prev, hudPosition };
      writeSettings(next);
      return next;
    });
  }, []);

  const setDefaultFilterMode = useCallback((defaultFilterMode: FilterMode) => {
    setSettings((prev) => {
      const next = { ...prev, defaultFilterMode };
      writeSettings(next);
      return next;
    });
  }, []);

  return {
    hudPosition: settings.hudPosition,
    setHudPosition,
    defaultFilterMode: settings.defaultFilterMode,
    setDefaultFilterMode,
  };
}
