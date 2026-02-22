"use client";

import { useState, useEffect } from "react";

interface Anomaly {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}

export function AnomalyDetector() {
  const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/claude/anomaly-detect")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setAnomalies(data?.anomalies ?? []);
      })
      .catch(() => { if (!cancelled) setAnomalies([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="card-monzo p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
        <span className="text-xs text-text-muted">AI scanning for anomalies...</span>
      </div>
    );
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="card-monzo p-4 flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-bold">&#10003;</span>
        <span className="text-xs text-text-secondary">No anomalies detected — platform operating normally.</span>
      </div>
    );
  }

  const severityColor = {
    high: "bg-danger/10 border-danger/20 text-danger",
    medium: "bg-warning/10 border-warning/20 text-warning",
    low: "bg-navy/5 border-navy/10 text-navy",
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-coral uppercase tracking-wider">AI Risk Monitor</p>
      {anomalies.map((a, i) => (
        <div key={i} className={`rounded-xl border p-3 ${severityColor[a.severity]}`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              a.severity === "high" ? "bg-danger/20" : a.severity === "medium" ? "bg-warning/20" : "bg-navy/10"
            }`}>{a.severity}</span>
            <span className="text-xs font-semibold">{a.title}</span>
          </div>
          <p className="text-xs mt-1 opacity-80">{a.description}</p>
        </div>
      ))}
    </div>
  );
}
