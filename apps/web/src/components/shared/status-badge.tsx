interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-warm-grey text-text-secondary",
  PENDING_MATCH: "bg-warning/10 text-warning",
  MATCHED: "bg-coral/10 text-coral",
  LIVE: "bg-success/10 text-success",
  REPAID: "bg-success/20 text-success",
  DEFAULTED: "bg-danger/10 text-danger",
  CANCELLED: "bg-warm-grey text-text-muted",
  PENDING: "bg-warning/10 text-warning",
  ACCEPTED: "bg-success/10 text-success",
  DISMISSED: "bg-warm-grey text-text-muted",
  active: "bg-success/10 text-success",
  inactive: "bg-warm-grey text-text-muted",
  expired: "bg-danger/10 text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_MATCH: "Finding Lenders",
  MATCHED: "Matched",
  LIVE: "Active",
  REPAID: "Repaid",
  DEFAULTED: "Defaulted",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DISMISSED: "Dismissed",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-warm-grey text-text-secondary";
  const label = STATUS_LABELS[status] ?? status;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${style} ${sizeClass}`}>
      {label}
    </span>
  );
}
