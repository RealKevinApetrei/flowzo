"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface DataTabsProps {
  tabs: Tab[];
  children: (activeTab: string) => React.ReactNode;
}

export function DataTabs({ tabs, children }: DataTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-coral text-white"
                : "bg-warm-grey/50 text-text-secondary hover:bg-warm-grey"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{children(activeTab)}</div>
    </div>
  );
}
