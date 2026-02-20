interface AmountDisplayProps {
  amountPence: number;
  size?: "sm" | "md" | "lg" | "xl";
  color?: "default" | "coral" | "success" | "danger";
  showSign?: boolean;
}

const SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

const COLOR_CLASSES = {
  default: "text-navy",
  coral: "text-coral",
  success: "text-success",
  danger: "text-danger",
};

export function AmountDisplay({
  amountPence,
  size = "md",
  color = "default",
  showSign = false,
}: AmountDisplayProps) {
  const pounds = Math.abs(amountPence) / 100;
  const formatted = pounds.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = showSign ? (amountPence >= 0 ? "+" : "-") : amountPence < 0 ? "-" : "";

  return (
    <span className={`font-bold tabular-nums ${SIZE_CLASSES[size]} ${COLOR_CLASSES[color]}`}>
      {sign}£{formatted}
    </span>
  );
}
