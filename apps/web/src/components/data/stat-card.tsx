interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "text-navy",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function StatCard({
  label,
  value,
  subtitle,
  variant = "default",
}: StatCardProps) {
  return (
    <div className="bg-warm-grey/30 rounded-xl p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${variantStyles[variant]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
