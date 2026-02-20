"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface AutoPopToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function AutoPopToggle({ enabled, onToggle }: AutoPopToggleProps) {
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    if (justEnabled) {
      const timer = setTimeout(() => setJustEnabled(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justEnabled]);

  const handleToggle = (checked: boolean) => {
    if (checked) setJustEnabled(true);
    onToggle(checked);
  };

  return (
    <Card
      className={`transition-all duration-300 ${
        enabled
          ? "ring-2 ring-coral/30 shadow-md"
          : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: icon + text */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors duration-300 ${
                enabled ? "bg-coral/10" : "bg-warm-grey"
              }`}
            >
              <span
                className={`text-xl transition-transform duration-300 ${
                  justEnabled ? "animate-bounce" : ""
                }`}
                role="img"
                aria-label="Auto-pop"
              >
                {justEnabled ? "✨" : enabled ? "🍿" : "💤"}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-navy">Auto-Pop</h3>
                {enabled && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-coral/10 text-coral transition-opacity duration-300 ${
                      justEnabled ? "animate-pulse" : ""
                    }`}
                  >
                    ON
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                {enabled
                  ? "Bubbles will pop automatically!"
                  : "Enable to auto-match trades"}
              </p>
            </div>
          </div>

          {/* Right: toggle */}
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            className="shrink-0"
          />
        </div>

        {/* Description */}
        <p className="text-xs text-muted mt-3 leading-relaxed">
          When enabled, Flowzo automatically fills trades that match your
          preferences
        </p>

        {/* Pulse bar when active */}
        {enabled && (
          <div className="mt-3 h-1 rounded-full bg-warm-grey overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-coral animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
