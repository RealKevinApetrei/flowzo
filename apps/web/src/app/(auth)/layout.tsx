import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Wordmark */}
      <Link href="/" className="mb-8">
        <span className="text-3xl font-extrabold text-foreground tracking-tight">Flowzo</span>
      </Link>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-[var(--card-surface)] rounded-2xl shadow-sm p-8">
        {children}
      </div>
    </div>
  );
}
