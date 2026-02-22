export const EXPLAIN_PROPOSAL_SYSTEM = `You are Flowzo's AI assistant. You explain bill-shifting recommendations in plain, friendly English. Keep explanations under 3 sentences. Be conversational — imagine you're a smart friend helping someone with their finances. Never give financial advice. Use GBP currency.`;

export function buildExplainPrompt(params: {
  billName: string;
  originalDate: string;
  shiftedDate: string;
  amountPence: number;
  feePence: number;
  reason: string;
}): string {
  const amount = (params.amountPence / 100).toFixed(2);
  const fee = (params.feePence / 100).toFixed(2);

  return `Explain this bill shift recommendation to the user:

Bill: ${params.billName}
Original due date: ${params.originalDate}
Suggested new date: ${params.shiftedDate}
Amount: £${amount}
Flowzo fee: £${fee}
Reason: ${params.reason}

Keep it simple, friendly, and under 3 sentences. Don't say "I recommend" — explain why this shift helps their cash flow.`;
}

export const FORECAST_EXPLANATION_SYSTEM = `You are Flowzo's AI assistant. You summarise cash flow forecasts in plain, friendly English. Be brief (2-3 sentences). Use GBP currency. Never give financial advice.`;

export const FINANCIAL_INSIGHTS_SYSTEM = `You are Flowzo's AI financial insights assistant. You analyse a borrower's financial data and provide 2-3 actionable observations about their cash flow patterns, bill timing, and risk profile. Be conversational and specific — reference actual numbers. Use GBP. Never give regulated financial advice. Focus on practical timing and budgeting insights.`;

export function buildFinancialInsightsPrompt(params: {
  riskGrade: string;
  creditScore: number;
  dangerDays: number;
  obligations: { name: string; amount_pence: number; expected_day: number }[];
  avgBalance_pence: number;
  incomePattern: string;
}): string {
  const obligations = params.obligations
    .map((o) => `${o.name}: £${(o.amount_pence / 100).toFixed(2)} due day ${o.expected_day}`)
    .join(", ");

  return `Analyse this borrower's financial profile and give 2-3 specific, actionable insights:

Risk Grade: ${params.riskGrade} | Credit Score: ${params.creditScore}
Danger days (shortfall risk): ${params.dangerDays} in next 30 days
Average balance: £${(params.avgBalance_pence / 100).toFixed(2)}
Income pattern: ${params.incomePattern}
Bills: ${obligations}

Focus on bill timing clusters, income-expense alignment, and practical suggestions. Be specific about which bills and dates.`;
}

export const RISK_EXPLAINER_SYSTEM = `You are Flowzo's AI risk analyst. You explain credit risk scores using SHAP feature importance in plain English. Be brief (2-3 sentences). Explain which factors help and hurt the score. Use specific numbers. Never give financial advice.`;

export function buildRiskExplainPrompt(params: {
  creditScore: number;
  riskGrade: string;
  shapValues: { feature: string; value: number; impact: number }[];
}): string {
  const topPositive = params.shapValues
    .filter((s) => s.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((s) => `${s.feature.replace(/_/g, " ")}: +${s.impact.toFixed(1)}`)
    .join(", ");

  const topNegative = params.shapValues
    .filter((s) => s.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 3)
    .map((s) => `${s.feature.replace(/_/g, " ")}: ${s.impact.toFixed(1)}`)
    .join(", ");

  return `Explain this credit risk assessment to the user:

Score: ${params.creditScore} (Grade ${params.riskGrade})
Positive factors: ${topPositive || "none"}
Negative factors: ${topNegative || "none"}

Explain what drives their score in 2-3 sentences. Be encouraging but honest.`;
}

export function buildForecastSummaryPrompt(params: {
  dangerDays: number;
  lowestBalancePence: number;
  totalObligationsPence: number;
  daysUntilDanger: number;
}): string {
  const lowest = (params.lowestBalancePence / 100).toFixed(2);
  const obligations = (params.totalObligationsPence / 100).toFixed(2);

  return `Summarise this 30-day forecast for the user:

Danger days (risk of shortfall): ${params.dangerDays}
Lowest projected balance: £${lowest}
Total upcoming bills: £${obligations}
Days until first danger day: ${params.daysUntilDanger}

Keep it conversational and brief. If there are no danger days, be reassuring. If there are, gently flag the risk without being alarming.`;
}
