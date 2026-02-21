"use client";

import Link from "next/link";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}

export function TopBar({ title = "Flowzo", showBack = false, backHref = "/" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-cool-grey">
      <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
        {showBack && (
          <Link href={backHref as "/"} className="mr-3 text-coral font-medium">
            ← Back
          </Link>
        )}
        <h1 className="text-lg font-bold text-navy">{title}</h1>
      </div>
    </header>
  );
}
