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
