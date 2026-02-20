interface RiskBadgeProps {
  grade: string;
  size?: "sm" | "md";
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-success/10 text-success border-success/30",
  B: "bg-warning/10 text-warning border-warning/30",
  C: "bg-danger/10 text-danger border-danger/30",
};

const GRADE_LABELS: Record<string, string> = {
  A: "Low Risk",
  B: "Medium Risk",
  C: "High Risk",
};

export function RiskBadge({ grade, size = "sm" }: RiskBadgeProps) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES["B"];
  const label = GRADE_LABELS[grade] ?? grade;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${style} ${sizeClass}`}>
      <span className="font-bold">{grade}</span>
      {size === "md" && <span className="font-medium">{label}</span>}
    </span>
  );
}
