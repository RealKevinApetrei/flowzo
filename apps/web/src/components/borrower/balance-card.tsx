import { formatCurrency } from "@flowzo/shared";

interface BalanceCardProps {
  totalBalancePence: number;
  accountCount: number;
}

export function BalanceCard({ totalBalancePence, accountCount }: BalanceCardProps) {
  return (
    <div className="rounded-2xl bg-navy text-white p-6">
      <p className="text-sm text-white/70">Total balance</p>
      <p className="text-4xl font-extrabold tracking-tight mt-1">
        {formatCurrency(totalBalancePence)}
      </p>
      {accountCount > 0 && (
        <p className="text-sm text-white/60 mt-1">
          Across {accountCount} account{accountCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
