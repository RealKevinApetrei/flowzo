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

// ── Bill Priority Ranker ──────────────────────────────────────────────────────

export const BILL_PRIORITY_SYSTEM = `You are Flowzo's AI bill optimiser. You rank which bills to shift first for maximum cash flow impact. Return a JSON array of objects with keys: name, priority (1=shift first), reason (1 sentence). Order by priority ascending. Never give financial advice. Use GBP.`;

export function buildBillPriorityPrompt(params: {
  obligations: { name: string; amount_pence: number; expected_day: number; category: string }[];
  dangerDays: { day: number; deficit_pence: number }[];
  avgBalancePence: number;
}): string {
  const bills = params.obligations
    .map((o) => `${o.name}: £${(o.amount_pence / 100).toFixed(2)} due day ${o.expected_day} (${o.category})`)
    .join("\n");
  const dangers = params.dangerDays
    .map((d) => `Day ${d.day}: -£${(d.deficit_pence / 100).toFixed(2)} shortfall`)
    .join("\n");

  return `Rank these bills by shift priority (which to move first for maximum cash flow relief):

Bills:
${bills}

Danger days:
${dangers}

Average balance: £${(params.avgBalancePence / 100).toFixed(2)}

Return a JSON array: [{"name": "...", "priority": 1, "reason": "..."}]
Only include bills worth shifting. Max 5 entries.`;
}

// ── What-If Simulator ────────────────────────────────────────────────────────

export const WHAT_IF_SYSTEM = `You are Flowzo's cash flow simulator. Given a proposed set of bill shifts, predict the impact on the borrower's cash flow. Return a brief JSON object with keys: danger_days_before (number), danger_days_after (number), lowest_balance_before_pence (number), lowest_balance_after_pence (number), summary (2-3 sentence narrative). Use GBP. Be specific with numbers.`;

export function buildWhatIfPrompt(params: {
  shifts: { name: string; amount_pence: number; from_day: number; to_day: number }[];
  forecasts: { day: number; balance_pence: number; is_danger: boolean }[];
  obligations: { name: string; amount_pence: number; expected_day: number }[];
}): string {
  const shifts = params.shifts
    .map((s) => `Shift ${s.name} (£${(s.amount_pence / 100).toFixed(2)}) from day ${s.from_day} → day ${s.to_day}`)
    .join("\n");
  const forecast = params.forecasts
    .map((f) => `Day ${f.day}: £${(f.balance_pence / 100).toFixed(2)}${f.is_danger ? " [DANGER]" : ""}`)
    .join("\n");

  return `Simulate the impact of these bill shifts on cash flow:

Proposed shifts:
${shifts}

Current 30-day forecast:
${forecast}

Return JSON: {"danger_days_before": N, "danger_days_after": N, "lowest_balance_before_pence": N, "lowest_balance_after_pence": N, "summary": "..."}`;
}

// ── Anomaly Detector ─────────────────────────────────────────────────────────

export const ANOMALY_DETECTOR_SYSTEM = `You are Flowzo's risk anomaly detector. You analyse platform-wide trading data and flag unusual patterns that could indicate systemic risk. Return a JSON array of anomalies with keys: severity ("high"|"medium"|"low"), title (5 words max), description (1-2 sentences). Max 3 anomalies. If nothing unusual, return empty array [].`;

export function buildAnomalyPrompt(params: {
  defaultRateByGrade: { grade: string; rate: number; count: number }[];
  matchSpeedByGrade: { grade: string; avgHours: number; medianHours: number }[];
  recentDefaults: number;
  totalActive: number;
  liquidityRatio: number;
  weekOverWeekVolume: number; // % change
}): string {
  const defaults = params.defaultRateByGrade
    .map((d) => `Grade ${d.grade}: ${(d.rate * 100).toFixed(1)}% (${d.count} trades)`)
    .join(", ");
  const speeds = params.matchSpeedByGrade
    .map((s) => `Grade ${s.grade}: avg ${s.avgHours.toFixed(1)}h, median ${s.medianHours.toFixed(2)}h`)
    .join(", ");

  return `Analyse these platform metrics for anomalies:

Default rates: ${defaults}
Match speeds: ${speeds}
Recent defaults (7 days): ${params.recentDefaults}
Active trades: ${params.totalActive}
Liquidity ratio: ${params.liquidityRatio.toFixed(2)}x
Volume change (week-over-week): ${params.weekOverWeekVolume > 0 ? "+" : ""}${params.weekOverWeekVolume.toFixed(1)}%

Flag anything unusual. Consider: default rate spikes, match speed degradation, liquidity crunches, volume anomalies.`;
}

// ── Lender Risk Advisor ──────────────────────────────────────────────────────

export const LENDER_ADVISOR_SYSTEM = `You are Flowzo's lender risk advisor. Given a lender's current portfolio and market conditions, suggest specific parameter adjustments to reduce risk while maintaining returns. Return JSON: {"recommendations": [{"parameter": "min_apr"|"risk_bands"|"max_exposure"|"max_shift_days", "current": "...", "suggested": "...", "reason": "1 sentence"}], "summary": "2-3 sentence overall advice"}. Max 3 recommendations.`;

export function buildLenderAdvisorPrompt(params: {
  currentPrefs: { min_apr: number; risk_bands: string[]; max_exposure: number; max_shift_days: number };
  portfolio: { grade_a_pct: number; grade_b_pct: number; grade_c_pct: number; total_deployed: number; realized_yield: number; default_count: number };
  marketRates: { grade: string; bid_apr: number; ask_apr: number; liquidity: number }[];
}): string {
  const market = params.marketRates
    .map((m) => `Grade ${m.grade}: bid ${m.bid_apr.toFixed(1)}%, ask ${m.ask_apr.toFixed(1)}%, liquidity ${m.liquidity.toFixed(1)}x`)
    .join("\n");

  return `Advise this lender on risk reduction:

Current preferences:
- Min APR: ${params.currentPrefs.min_apr.toFixed(1)}%
- Risk bands: ${params.currentPrefs.risk_bands.join(", ")}
- Max exposure per trade: £${params.currentPrefs.max_exposure.toFixed(0)}
- Max shift days: ${params.currentPrefs.max_shift_days}

Portfolio:
- Grade A: ${params.portfolio.grade_a_pct.toFixed(0)}%, Grade B: ${params.portfolio.grade_b_pct.toFixed(0)}%, Grade C: ${params.portfolio.grade_c_pct.toFixed(0)}%
- Total deployed: £${params.portfolio.total_deployed.toFixed(0)}
- Realized yield: £${params.portfolio.realized_yield.toFixed(2)}
- Defaults: ${params.portfolio.default_count}

Market conditions:
${market}

Suggest adjustments to reduce risk. Be specific about parameters and values.`;
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
