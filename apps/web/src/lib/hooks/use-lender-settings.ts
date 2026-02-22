"use client";

import { useState, useEffect, useCallback } from "react";

export type BubbleColorMode = "by-grade" | "unified";

export interface BubbleColorPreset {
  name: string;
  hex: string;
  center: string;
  edge: string;
  glow: string;
}

export const BUBBLE_COLOR_PRESETS: BubbleColorPreset[] = [
  { name: "Coral",   hex: "#FF5A5F", center: "#FF8A8E", edge: "#CC3B3F", glow: "rgba(255,90,95,0.35)" },
  { name: "Blue",    hex: "#3B82F6", center: "#60A5FA", edge: "#1D4ED8", glow: "rgba(59,130,246,0.35)" },
  { name: "Emerald", hex: "#10B981", center: "#34D399", edge: "#047857", glow: "rgba(16,185,129,0.35)" },
  { name: "Violet",  hex: "#8B5CF6", center: "#A78BFA", edge: "#6D28D9", glow: "rgba(139,92,246,0.35)" },
  { name: "Amber",   hex: "#F59E0B", center: "#FCD34D", edge: "#B45309", glow: "rgba(245,158,11,0.35)" },
  { name: "Cyan",    hex: "#06B6D4", center: "#22D3EE", edge: "#0E7490", glow: "rgba(6,182,212,0.35)" },
  { name: "Rose",    hex: "#F43F5E", center: "#FB7185", edge: "#BE123C", glow: "rgba(244,63,94,0.35)" },
  { name: "Slate",   hex: "#64748B", center: "#94A3B8", edge: "#475569", glow: "rgba(100,116,139,0.35)" },
];

const BY_GRADE: Record<string, { center: string; edge: string; glow: string }> = {
  A: { center: "#34D399", edge: "#047857", glow: "rgba(52,211,153,0.35)" },
  B: { center: "#FCD34D", edge: "#B45309", glow: "rgba(252,211,77,0.35)" },
  C: { center: "#FCA5A5", edge: "#DC2626", glow: "rgba(252,165,165,0.35)" },
};

export function resolveBubblePalette(
  riskGrade: string,
  mode: BubbleColorMode,
  unifiedHex: string,
): { center: string; edge: string; glow: string } {
  if (mode === "by-grade") {
    return BY_GRADE[riskGrade] ?? BY_GRADE.A;
  }
  const preset = BUBBLE_COLOR_PRESETS.find((p) => p.hex === unifiedHex);
  if (preset) return { center: preset.center, edge: preset.edge, glow: preset.glow };
  return BY_GRADE.A;
}

interface LenderSettings {
  bubbleColorMode: BubbleColorMode;
  unifiedColorHex: string;
  amountRange: [number, number];
  termRange: [number, number];
}

const STORAGE_KEY = "flowzo-lender-settings";

const DEFAULTS: LenderSettings = {
  bubbleColorMode: "by-grade",
  unifiedColorHex: "#3B82F6",
  amountRange: [0, 100000],
  termRange: [1, 90],
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initialization from localStorage
    setSettings(readSettings());
  }, []);

  const setBubbleColorMode = useCallback((bubbleColorMode: BubbleColorMode) => {
    setSettings((prev) => {
      const next = { ...prev, bubbleColorMode };
      writeSettings(next);
      return next;
    });
  }, []);

  const setUnifiedColorHex = useCallback((unifiedColorHex: string) => {
    setSettings((prev) => {
      const next = { ...prev, unifiedColorHex };
      writeSettings(next);
      return next;
    });
  }, []);

  const setAmountRange = useCallback((amountRange: [number, number]) => {
    setSettings((prev) => {
      const next = { ...prev, amountRange };
      writeSettings(next);
      return next;
    });
  }, []);

  const setTermRange = useCallback((termRange: [number, number]) => {
    setSettings((prev) => {
      const next = { ...prev, termRange };
      writeSettings(next);
      return next;
    });
  }, []);

  return {
    bubbleColorMode: settings.bubbleColorMode,
    setBubbleColorMode,
    unifiedColorHex: settings.unifiedColorHex,
    setUnifiedColorHex,
    amountRange: settings.amountRange,
    setAmountRange,
    termRange: settings.termRange,
    setTermRange,
  };
}
