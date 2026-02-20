import { BottomNav } from "@/components/layout/bottom-nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soft-white">
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
