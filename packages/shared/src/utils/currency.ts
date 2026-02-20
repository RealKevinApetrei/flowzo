export function penceToPounds(pence: number): number {
  return pence / 100;
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function formatCurrency(pence: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(penceToPounds(pence));
}

export function formatCurrencyCompact(pence: number, currency = "GBP"): string {
  const pounds = penceToPounds(pence);
  if (Math.abs(pounds) >= 1000) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(pounds);
  }
  return formatCurrency(pence, currency);
}
