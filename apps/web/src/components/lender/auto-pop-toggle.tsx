"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface AutoPopToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
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
        enabled ? "ring-2 ring-coral/30 shadow-md" : ""
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
              {justEnabled ? (
                <SparkleIcon className="w-5 h-5 text-coral animate-bounce" />
              ) : enabled ? (
                <ZapIcon className="w-5 h-5 text-coral" />
              ) : (
                <MoonIcon className="w-5 h-5 text-text-muted" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-navy">Auto-match</h3>
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
                  ? "Trades matching your APY preference will be auto-funded"
                  : "Enable to automatically fund matching trades"}
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
