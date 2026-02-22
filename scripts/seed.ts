/**
 * Flowzo Seed Script
 *
 * Creates ~425 demo users with realistic trading data.
 * Run: source apps/web/.env.local && npx tsx scripts/seed.ts
 *
 * Idempotent: deletes all @flowzo-demo.test users first (cascades).
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  console.error("Run: source apps/web/.env.local && npx tsx scripts/seed.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BORROWER_COUNT = 250;
const LENDER_COUNT = 175;
const DUAL_ROLE_COUNT = 75; // borrowers who are also lenders
const TOTAL_USERS = BORROWER_COUNT + LENDER_COUNT; // 425

const TRADE_COUNT = 10000;
const PROPOSAL_COUNT = 500;

const PASSWORD = "FlowzoDemo2026!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number, len = 3): string {
  return String(n).padStart(len, "0");
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Realistic match delay: 80% within 1-10s, 15% within 10-60s, 5% within 1-5min */
function realisticMatchDelay(): number {
  const roll = Math.random();
  if (roll < 0.8) return randomInt(1, 10);             // 1-10 seconds
  if (roll < 0.95) return randomInt(10, 60);           // 10-60 seconds
  return randomInt(60, 300);                            // 1-5 minutes in seconds
}

function addSeconds(d: Date, s: number): Date {
  return new Date(d.getTime() + s * 1000);
}

function uuid(): string {
  return crypto.randomUUID();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Weighted random selection
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_GRADES = ["A", "B", "C"] as const;
const RISK_WEIGHTS = [30, 45, 25]; // ~30% A, ~45% B, ~25% C

const MERCHANTS = [
  "Netflix",
  "Spotify",
  "Sky TV",
  "Virgin Media",
  "BT Broadband",
  "EE Mobile",
  "Three Mobile",
  "O2 Mobile",
  "Vodafone",
  "British Gas",
  "Octopus Energy",
  "OVO Energy",
  "Scottish Power",
  "Thames Water",
  "Council Tax",
  "TV Licence",
  "Amazon Prime",
  "Disney+",
  "Apple Music",
  "Gym Membership",
  "PureGym",
  "David Lloyd",
  "AA Breakdown",
  "RAC Breakdown",
  "Aviva Insurance",
  "Direct Line",
  "Admiral Insurance",
  "HMRC Self Assessment",
  "Student Loans Company",
  "Nationwide Mortgage",
];

const FREQUENCIES = [
  "MONTHLY",
  "MONTHLY",
  "MONTHLY",
  "MONTHLY",
  "WEEKLY",
  "FORTNIGHTLY",
  "QUARTERLY",
] as const;

// Realistic UK bill templates for obligation seeding
interface ObligationTemplate {
  name: string;
  merchant_name: string;
  amount_min: number; // GBP
  amount_max: number; // GBP
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY";
  category: string;
  is_essential: boolean;
  confidence: number;
}

const OBLIGATION_TEMPLATES: ObligationTemplate[] = [
  { name: "Netflix", merchant_name: "Netflix", amount_min: 6.99, amount_max: 17.99, frequency: "MONTHLY", category: "Entertainment", is_essential: false, confidence: 0.95 },
  { name: "Spotify", merchant_name: "Spotify", amount_min: 10.99, amount_max: 16.99, frequency: "MONTHLY", category: "Entertainment", is_essential: false, confidence: 0.95 },
  { name: "Sky TV", merchant_name: "Sky TV", amount_min: 26.0, amount_max: 65.0, frequency: "MONTHLY", category: "Entertainment", is_essential: false, confidence: 0.90 },
  { name: "Virgin Media", merchant_name: "Virgin Media", amount_min: 33.0, amount_max: 60.0, frequency: "MONTHLY", category: "Internet", is_essential: true, confidence: 0.92 },
  { name: "BT Broadband", merchant_name: "BT Broadband", amount_min: 29.99, amount_max: 45.99, frequency: "MONTHLY", category: "Internet", is_essential: true, confidence: 0.92 },
  { name: "EE Mobile", merchant_name: "EE Mobile", amount_min: 15.0, amount_max: 55.0, frequency: "MONTHLY", category: "Mobile", is_essential: true, confidence: 0.93 },
  { name: "Three Mobile", merchant_name: "Three Mobile", amount_min: 12.0, amount_max: 40.0, frequency: "MONTHLY", category: "Mobile", is_essential: true, confidence: 0.91 },
  { name: "British Gas", merchant_name: "British Gas", amount_min: 80.0, amount_max: 180.0, frequency: "MONTHLY", category: "Energy", is_essential: true, confidence: 0.88 },
  { name: "Octopus Energy", merchant_name: "Octopus Energy", amount_min: 60.0, amount_max: 150.0, frequency: "MONTHLY", category: "Energy", is_essential: true, confidence: 0.87 },
  { name: "Thames Water", merchant_name: "Thames Water", amount_min: 25.0, amount_max: 50.0, frequency: "MONTHLY", category: "Water", is_essential: true, confidence: 0.90 },
  { name: "Council Tax", merchant_name: "Council Tax", amount_min: 100.0, amount_max: 250.0, frequency: "MONTHLY", category: "Tax", is_essential: true, confidence: 0.95 },
  { name: "TV Licence", merchant_name: "TV Licence", amount_min: 13.25, amount_max: 13.25, frequency: "MONTHLY", category: "Entertainment", is_essential: false, confidence: 0.95 },
  { name: "Amazon Prime", merchant_name: "Amazon Prime", amount_min: 8.99, amount_max: 8.99, frequency: "MONTHLY", category: "Entertainment", is_essential: false, confidence: 0.93 },
  { name: "Disney+", merchant_name: "Disney+", amount_min: 7.99, amount_max: 13.99, frequency: "MONTHLY", category: "Entertainment", is_essential: false, confidence: 0.92 },
  { name: "PureGym", merchant_name: "PureGym", amount_min: 14.99, amount_max: 29.99, frequency: "MONTHLY", category: "Fitness", is_essential: false, confidence: 0.85 },
  { name: "Aviva Insurance", merchant_name: "Aviva Insurance", amount_min: 30.0, amount_max: 80.0, frequency: "MONTHLY", category: "Insurance", is_essential: true, confidence: 0.93 },
  { name: "Student Loan", merchant_name: "Student Loans Company", amount_min: 50.0, amount_max: 300.0, frequency: "MONTHLY", category: "Debt", is_essential: true, confidence: 0.90 },
  { name: "Mortgage", merchant_name: "Nationwide Mortgage", amount_min: 400.0, amount_max: 1200.0, frequency: "MONTHLY", category: "Housing", is_essential: true, confidence: 0.97 },
  { name: "AA Breakdown", merchant_name: "AA Breakdown", amount_min: 15.0, amount_max: 40.0, frequency: "QUARTERLY", category: "Motoring", is_essential: false, confidence: 0.80 },
  { name: "Self Assessment", merchant_name: "HMRC Self Assessment", amount_min: 200.0, amount_max: 2000.0, frequency: "QUARTERLY", category: "Tax", is_essential: true, confidence: 0.75 },
];

const EXPLANATION_TEMPLATES = [
  "Your {merchant} bill of {amount} is due on {original_date}, but your balance will be low that day. Shifting to {shifted_date} gives you {shift_days} more days — your account should be healthier by then. The fee is just {fee}.",
  "We noticed {merchant} ({amount}) falls on a tight day. Moving it to {shifted_date} avoids a potential shortfall. A small {fee} fee applies for the {shift_days}-day shift.",
  "Your {amount} {merchant} payment on {original_date} could push your balance below your buffer. Shifting by {shift_days} days to {shifted_date} keeps things comfortable. Fee: {fee}.",
  "Heads up — {merchant} is due right when your balance dips. For {fee}, we can move it {shift_days} days to {shifted_date} when you're in a stronger position.",
  "Moving your {merchant} bill ({amount}) by {shift_days} days from {original_date} to {shifted_date} helps avoid a cash crunch. The shift fee is {fee}.",
  "Your forecast shows a dip around {original_date} when {merchant} ({amount}) is due. A {shift_days}-day shift to {shifted_date} smooths things out. Fee: {fee}.",
  "We can help with your {merchant} payment of {amount}. Shifting from {original_date} to {shifted_date} ({shift_days} days) avoids going into the red. Fee: {fee}.",
  "Your {merchant} bill of {amount} on {original_date} coincides with several other payments. Moving it to {shifted_date} spreads things out. Shift fee: {fee}.",
  "Smart move alert: shifting {merchant} ({amount}) by {shift_days} days keeps your balance above the safety buffer. Only {fee} for the peace of mind.",
  "Your {amount} {merchant} payment could cause a shortfall. We suggest moving it to {shifted_date} for just {fee}. That gives you {shift_days} extra days.",
  "Looking at your cashflow, {original_date} is going to be tight with {merchant} due. A {shift_days}-day delay to {shifted_date} helps. Fee: {fee}.",
  "Your upcoming {merchant} payment ({amount}) falls on a danger day. For a {fee} fee, we'll shift it {shift_days} days to a safer date.",
  "We've spotted that {merchant} ({amount}) on {original_date} could strain your account. Shifting to {shifted_date} for {fee} keeps you in the clear.",
  "Balance forecast shows a dip on {original_date}. Shifting your {merchant} payment of {amount} by {shift_days} days helps maintain your buffer. Fee: {fee}.",
  "Avoid a potential shortfall: move {merchant} ({amount}) from {original_date} to {shifted_date}. The {shift_days}-day shift costs just {fee}.",
  "Your {merchant} bill is coming up on a day when money's tight. For {fee}, we can push it {shift_days} days to {shifted_date}.",
  "Quick cashflow fix: your {amount} {merchant} payment on {original_date} can be shifted to {shifted_date} for only {fee}.",
  "We recommend shifting {merchant} ({amount}) to {shifted_date}. Your balance recovers by then, and the fee is only {fee} for {shift_days} days.",
  "Your {merchant} payment is due at an awkward time. Shifting by {shift_days} days to {shifted_date} avoids dipping below your buffer. Fee: {fee}.",
  "Cashflow tip: {merchant} ({amount}) on {original_date} overlaps with other bills. A {fee} shift to {shifted_date} smooths your cash position.",
];

// ---------------------------------------------------------------------------
// Step 1: Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log("Cleaning up existing demo data...");

  // Use RPC to clean up everything in dependency order within a single
  // transaction. This avoids soft-delete issues with the JS admin client.
  const { error } = await supabase.rpc("exec_sql" as never, {
    sql: `
      DO $$ DECLARE demo_ids uuid[]; trade_ids uuid[];
      BEGIN
        SELECT array_agg(id) INTO demo_ids
        FROM auth.users WHERE email LIKE '%@flowzo-demo.test';
        IF demo_ids IS NULL THEN RETURN; END IF;

        SELECT array_agg(id) INTO trade_ids
        FROM public.trades WHERE borrower_id = ANY(demo_ids);

        IF trade_ids IS NOT NULL THEN
          DELETE FROM public.platform_revenue WHERE trade_id = ANY(trade_ids);
          DELETE FROM public.flowzo_events WHERE entity_id = ANY(trade_ids);
          DELETE FROM public.payment_orders WHERE trade_id = ANY(trade_ids);
          DELETE FROM public.pool_ledger WHERE trade_id = ANY(trade_ids);
          DELETE FROM public.trade_state_transitions WHERE trade_id = ANY(trade_ids);
          DELETE FROM public.allocations WHERE trade_id = ANY(trade_ids);
          DELETE FROM public.trades WHERE id = ANY(trade_ids);
        END IF;

        DELETE FROM public.allocations WHERE lender_id = ANY(demo_ids);
        DELETE FROM public.agent_proposals WHERE user_id = ANY(demo_ids);
        DELETE FROM public.agent_runs WHERE user_id = ANY(demo_ids);
        DELETE FROM public.pool_ledger WHERE user_id = ANY(demo_ids);
        DELETE FROM public.lender_preferences WHERE user_id = ANY(demo_ids);
        DELETE FROM public.lending_pots WHERE user_id = ANY(demo_ids);
        DELETE FROM public.forecasts WHERE user_id = ANY(demo_ids);
        DELETE FROM public.forecast_snapshots WHERE user_id = ANY(demo_ids);
        DELETE FROM public.obligations WHERE user_id = ANY(demo_ids);
        DELETE FROM public.accounts WHERE user_id = ANY(demo_ids);
        DELETE FROM public.bank_connections WHERE user_id = ANY(demo_ids);
        DELETE FROM auth.users WHERE id = ANY(demo_ids);
      END $$;
    `,
  } as never);

  if (error) {
    // If RPC doesn't exist, fall back to admin API
    console.log("  RPC cleanup unavailable, using admin API...");

    const { data: allUsers } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    const demoUsers = (allUsers?.users ?? []).filter((u) =>
      u.email?.endsWith("@flowzo-demo.test"),
    );

    if (demoUsers.length === 0) {
      console.log("  No existing demo users found.");
      return;
    }

    console.log(`  Found ${demoUsers.length} demo users to delete...`);
    for (let i = 0; i < demoUsers.length; i += 20) {
      const batch = demoUsers.slice(i, i + 20);
      await Promise.all(
        batch.map((u) => supabase.auth.admin.deleteUser(u.id, false)),
      );
      if (i + 20 < demoUsers.length) await sleep(200);
    }
    await sleep(2000);
  }

  console.log("  Cleanup complete.");
}

// ---------------------------------------------------------------------------
// Step 2: Create Users
// ---------------------------------------------------------------------------

interface SeedUser {
  id: string;
  email: string;
  role: "BORROWER_ONLY" | "LENDER_ONLY" | "BOTH";
  riskGrade: "A" | "B" | "C";
  displayName: string;
}

async function createUsers(): Promise<SeedUser[]> {
  console.log("Creating users...");
  const users: SeedUser[] = [];

  // Generate user specs
  for (let i = 1; i <= BORROWER_COUNT; i++) {
    const isDual = i <= DUAL_ROLE_COUNT;
    users.push({
      id: "",
      email: `borrower-${pad(i)}@flowzo-demo.test`,
      role: isDual ? "BOTH" : "BORROWER_ONLY",
      riskGrade: weightedPick([...RISK_GRADES], RISK_WEIGHTS),
      displayName: `Borrower ${pad(i)}`,
    });
  }

  for (let i = 1; i <= LENDER_COUNT; i++) {
    users.push({
      id: "",
      email: `lender-${pad(i)}@flowzo-demo.test`,
      role: "LENDER_ONLY",
      riskGrade: weightedPick([...RISK_GRADES], RISK_WEIGHTS),
      displayName: `Lender ${pad(i)}`,
    });
  }

  // Build email→id map from existing users (paginate through all pages)
  console.log("  Checking for existing demo users...");
  const existingMap = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data: { users: pageUsers } } = await supabase.auth.admin.listUsers({
      perPage: 1000,
      page,
    });
    if (!pageUsers || pageUsers.length === 0) break;
    for (const u of pageUsers) {
      if (u.email?.endsWith("@flowzo-demo.test")) {
        existingMap.set(u.email, u.id);
      }
    }
    if (pageUsers.length < 1000) break;
    page++;
  }
  console.log(`  Found ${existingMap.size} existing demo users.`);

  // Clean up existing demo data (trades, allocations, etc.) if users exist
  if (existingMap.size > 0) {
    console.log("  Cleaning existing demo trade data...");
    const demoIds = Array.from(existingMap.values());
    // Delete in dependency order using service role (bypasses RLS)
    for (const table of [
      "pool_ledger",
      "trade_state_transitions",
      "allocations",
      "agent_proposals",
      "agent_runs",
      "lender_preferences",
      "lending_pots",
      "forecasts",
      "forecast_snapshots",
      "obligations",
      "accounts",
      "bank_connections",
    ]) {
      await supabase.from(table).delete().in("user_id", demoIds);
    }
    // Delete trades (borrower_id)
    const { data: demoTrades } = await supabase
      .from("trades")
      .select("id")
      .in("borrower_id", demoIds);
    if (demoTrades && demoTrades.length > 0) {
      const tradeIds = demoTrades.map((t) => t.id);
      await supabase.from("platform_revenue").delete().in("trade_id", tradeIds);
      await supabase.from("pool_ledger").delete().in("trade_id", tradeIds);
      await supabase.from("trade_state_transitions").delete().in("trade_id", tradeIds);
      await supabase.from("allocations").delete().in("trade_id", tradeIds);
      await supabase.from("trades").delete().in("id", tradeIds);
    }
    console.log("  Demo data cleaned.");
  }

  // Assign existing user IDs or create new ones
  let created = 0;
  let reused = 0;
  const BATCH_SIZE = 15;

  // First pass: assign existing IDs
  for (const u of users) {
    const existingId = existingMap.get(u.email);
    if (existingId) {
      u.id = existingId;
      reused++;
    }
  }

  // Second pass: create missing users in batches
  const toCreate = users.filter((u) => !u.id);
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((u) =>
        supabase.auth.admin.createUser({
          email: u.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: u.displayName },
        }),
      ),
    );

    for (let j = 0; j < results.length; j++) {
      const { data, error } = results[j];
      if (error) {
        console.error(`  Failed to create ${batch[j].email}:`, error.message);
        continue;
      }
      batch[j].id = data.user.id;
      created++;
    }

    const progress = reused + Math.min(i + BATCH_SIZE, toCreate.length);
    process.stdout.write(
      `\r  Processed ${progress}/${users.length} users...`,
    );
    if (i + BATCH_SIZE < toCreate.length) await sleep(300);
  }
  console.log();

  // Filter out users that failed
  const validUsers = users.filter((u) => u.id);
  console.log(`  ${created} created, ${reused} reused. ${validUsers.length} total valid users.`);
  return validUsers;
}

// ---------------------------------------------------------------------------
// Step 3: Update Profiles
// ---------------------------------------------------------------------------

async function updateProfiles(users: SeedUser[]) {
  console.log("Updating profiles with risk grades and roles...");

  // Profiles already exist (created by handle_new_user trigger).
  // Use individual updates to set risk_grade and role.
  const BATCH_SIZE = 20;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((u) => {
        // Generate credit score within grade range
        const scoreRanges: Record<string, [number, number]> = { A: [700, 850], B: [600, 699], C: [500, 599] };
        const [low, high] = scoreRanges[u.riskGrade] ?? [500, 700];
        const score = randomInt(low, high);
        const creditLimits: Record<string, { max_trade_amount: number; max_active_trades: number }> = {
          A: { max_trade_amount: 500, max_active_trades: 5 },
          B: { max_trade_amount: 200, max_active_trades: 3 },
          C: { max_trade_amount: 75, max_active_trades: 1 },
        };
        const limits = creditLimits[u.riskGrade] ?? { max_trade_amount: 0, max_active_trades: 0 };
        const isBorrower = u.role === "BORROWER_ONLY" || u.role === "BOTH";

        return supabase
          .from("profiles")
          .update({
            risk_grade: u.riskGrade,
            role_preference: u.role,
            onboarding_completed: true,
            credit_score: isBorrower ? score : null,
            max_trade_amount: limits.max_trade_amount,
            max_active_trades: limits.max_active_trades,
            eligible_to_borrow: isBorrower && score >= 500,
            last_scored_at: new Date().toISOString(),
          })
          .eq("id", u.id)
          .then(({ error }) => {
            if (error)
              console.error(`  Profile update error for ${u.email}:`, error.message);
          });
      },
      ),
    );
  }

  console.log("  Profiles updated.");
}

// ---------------------------------------------------------------------------
// Step 4: Create Lending Pots + Preferences
// ---------------------------------------------------------------------------

async function createLendingData(users: SeedUser[]) {
  console.log("Creating lending pots and preferences...");

  const lenders = users.filter(
    (u) => u.role === "LENDER_ONLY" || u.role === "BOTH",
  );

  const pots = lenders.map((u) => ({
    user_id: u.id,
    available: randomFloat(50, 2000),
    locked: 0,
    total_deployed: 0,
    realized_yield: 0,
    currency: "GBP",
  }));

  const preferences = lenders.map((u) => {
    const autoMatch = Math.random() < 0.8;
    const riskBands = pick([
      ["A", "B"],
      ["A", "B", "C"],
      ["A"],
      ["B", "C"],
    ]) as string[];
    const minApr = randomFloat(2, 8);
    const targetApr = randomFloat(minApr + 0.5, minApr + 2);
    return {
      user_id: u.id,
      min_apr: minApr,
      target_apr: targetApr,
      max_shift_days: pick([7, 10, 14]),
      max_exposure: randomFloat(50, 500),
      max_total_exposure: randomFloat(500, 2000),
      risk_bands: `{${riskBands.join(",")}}`,
      auto_match_enabled: autoMatch,
    };
  });

  // Insert pots in batches
  for (let i = 0; i < pots.length; i += 50) {
    const { error } = await supabase
      .from("lending_pots")
      .insert(pots.slice(i, i + 50));
    if (error) console.error("  Pot insert error:", error.message);
  }

  // Insert preferences in batches
  for (let i = 0; i < preferences.length; i += 50) {
    const { error } = await supabase
      .from("lender_preferences")
      .insert(preferences.slice(i, i + 50));
    if (error) console.error("  Preferences insert error:", error.message);
  }

  console.log(`  ${pots.length} lending pots created.`);
  console.log(`  ${preferences.length} lender preferences created.`);
  return lenders;
}

// ---------------------------------------------------------------------------
// Step 4b: Create Bank Connections + Accounts for Borrowers
// ---------------------------------------------------------------------------

interface SeedAccount {
  userId: string;
  accountId: string;
  bankConnectionId: string;
  balance: number; // GBP
}

async function createAccountsForSeedUsers(users: SeedUser[]): Promise<SeedAccount[]> {
  console.log("Creating bank connections and accounts for borrowers...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );

  const connections: Record<string, unknown>[] = [];
  const accounts: Record<string, unknown>[] = [];
  const seedAccounts: SeedAccount[] = [];

  for (const b of borrowers) {
    const connId = uuid();
    const acctId = uuid();

    // Balance based on risk grade
    let balance: number;
    switch (b.riskGrade) {
      case "A": balance = randomFloat(1500, 3000); break;
      case "B": balance = randomFloat(800, 1800); break;
      case "C": balance = randomFloat(200, 900); break;
    }

    connections.push({
      id: connId,
      user_id: b.id,
      provider: "seed",
      truelayer_token: {},
      status: "active",
    });

    accounts.push({
      id: acctId,
      user_id: b.id,
      bank_connection_id: connId,
      external_account_id: `seed-${b.id}`,
      account_type: "CURRENT",
      display_name: "Current Account",
      currency: "GBP",
      balance_current: balance,
      balance_available: balance,
      balance_updated_at: new Date().toISOString(),
    });

    seedAccounts.push({ userId: b.id, accountId: acctId, bankConnectionId: connId, balance });
  }

  // Insert bank connections in batches
  for (let i = 0; i < connections.length; i += 50) {
    const { error } = await supabase
      .from("bank_connections")
      .insert(connections.slice(i, i + 50));
    if (error) console.error("  Bank connection insert error:", error.message);
  }

  // Insert accounts in batches
  for (let i = 0; i < accounts.length; i += 50) {
    const { error } = await supabase
      .from("accounts")
      .insert(accounts.slice(i, i + 50));
    if (error) console.error("  Account insert error:", error.message);
  }

  console.log(`  ${connections.length} bank connections created.`);
  console.log(`  ${accounts.length} accounts created.`);
  return seedAccounts;
}

// ---------------------------------------------------------------------------
// Step 4c: Create Obligations for Borrowers
// ---------------------------------------------------------------------------

interface SeedObligation {
  id: string;
  userId: string;
  name: string;
  merchantName: string;
  amount: number; // GBP
  expectedDay: number;
  nextExpected: string; // YYYY-MM-DD
  frequency: string;
}

async function createObligations(users: SeedUser[]): Promise<Map<string, SeedObligation[]>> {
  console.log("Creating obligations for borrowers...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );

  const obligationRows: Record<string, unknown>[] = [];
  const obligationsMap = new Map<string, SeedObligation[]>();
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const b of borrowers) {
    const numObligations = randomInt(3, 8);
    // Shuffle templates and take N (ensures no duplicate merchants per user)
    const shuffled = [...OBLIGATION_TEMPLATES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numObligations);

    const userObls: SeedObligation[] = [];

    // Should we cluster bills on the same day? ~30% chance
    const shouldCluster = Math.random() < 0.3;
    let clusterDay = 0;
    if (shouldCluster) {
      clusterDay = randomInt(1, 28);
    }

    for (let i = 0; i < selected.length; i++) {
      const tpl = selected[i];
      const oblId = uuid();
      const amount = randomFloat(tpl.amount_min, tpl.amount_max);

      // Determine expected_day
      let expectedDay: number;
      if (shouldCluster && i < 3) {
        // First 2-3 obligations share the cluster day
        expectedDay = clusterDay;
      } else {
        expectedDay = randomInt(1, 28);
      }

      // Compute next_expected from expected_day (timezone-safe string formatting)
      let nextMonth = currentMonth;
      let nextYear = currentYear;
      if (expectedDay <= currentDay) {
        // Already passed this month, use next month
        nextMonth++;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }
      }
      const nextExpected = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(expectedDay).padStart(2, "0")}`;

      const obl: SeedObligation = {
        id: oblId,
        userId: b.id,
        name: tpl.name,
        merchantName: tpl.merchant_name,
        amount,
        expectedDay,
        nextExpected,
        frequency: tpl.frequency,
      };
      userObls.push(obl);

      obligationRows.push({
        id: oblId,
        user_id: b.id,
        name: tpl.name,
        merchant_name: tpl.merchant_name,
        amount,
        currency: "GBP",
        expected_day: expectedDay,
        frequency: tpl.frequency,
        category: tpl.category,
        is_essential: tpl.is_essential,
        confidence: tpl.confidence,
        next_expected: nextExpected,
        active: true,
      });
    }

    obligationsMap.set(b.id, userObls);
  }

  // Insert in batches
  for (let i = 0; i < obligationRows.length; i += 50) {
    const { error } = await supabase
      .from("obligations")
      .insert(obligationRows.slice(i, i + 50));
    if (error) console.error(`  Obligation insert error (batch ${i}):`, error.message);
  }

  console.log(`  ${obligationRows.length} obligations created for ${borrowers.length} borrowers.`);
  return obligationsMap;
}

// ---------------------------------------------------------------------------
// Step 5: Create Trades + Allocations + Transitions + Events
// ---------------------------------------------------------------------------

async function createTrades(users: SeedUser[], lenders: SeedUser[], obligationsMap: Map<string, SeedObligation[]>) {
  console.log("Creating trades, allocations, transitions, and events...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );

  const now = new Date();
  const trades: Record<string, unknown>[] = [];
  const allocations: Record<string, unknown>[] = [];
  const transitions: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];

  // Distribution: 45% REPAID, 12% LIVE, 8% MATCHED, 20% PENDING_MATCH, 12% DEFAULTED, 3% CANCELLED
  const statusDistribution = [
    ...Array(Math.round(TRADE_COUNT * 0.45)).fill("REPAID"),
    ...Array(Math.round(TRADE_COUNT * 0.12)).fill("LIVE"),
    ...Array(Math.round(TRADE_COUNT * 0.08)).fill("MATCHED"),
    ...Array(Math.round(TRADE_COUNT * 0.20)).fill("PENDING_MATCH"),
    ...Array(Math.round(TRADE_COUNT * 0.12)).fill("DEFAULTED"),
    ...Array(Math.round(TRADE_COUNT * 0.03)).fill("CANCELLED"),
  ];

  for (let i = 0; i < statusDistribution.length; i++) {
    const status = statusDistribution[i] as string;
    const borrower = pick(borrowers);
    const tradeId = uuid();
    const shiftDays = randomInt(1, 14);
    // Credit-limit-aware amount: cap by grade
    const maxAmounts: Record<string, number> = { A: 500, B: 200, C: 75 };
    const maxAmount = maxAmounts[borrower.riskGrade] ?? 75;
    const amount = randomFloat(10, maxAmount);
    // Continuous score-adjusted pricing
    const scoreRanges: Record<string, [number, number]> = { A: [700, 850], B: [600, 699], C: [500, 599] };
    const [sLow, sHigh] = scoreRanges[borrower.riskGrade] ?? [500, 700];
    const creditScore = randomInt(sLow, sHigh);
    const baseMult: Record<string, number> = { A: 0.8, B: 1.2, C: 1.8 };
    const capMult: Record<string, number> = { A: 1.2, B: 1.8, C: 2.5 };
    const bm = baseMult[borrower.riskGrade] ?? 1.2;
    const cm = capMult[borrower.riskGrade] ?? 2.0;
    const t = Math.max(0, Math.min(1, (creditScore - sLow) / (sHigh - sLow)));
    const riskMult = cm - t * (cm - bm);
    const termPremium = 1 + (shiftDays / 14) * 0.15;
    const feeRate = 0.049 * riskMult * termPremium;
    const fee = Math.max(
      0.01,
      Math.round(feeRate * amount * (shiftDays / 365) * 100) / 100,
    );

    let originalDueDate: Date;
    let createdAt: Date;
    let matchedAt: string | null = null;
    let liveAt: string | null = null;
    let repaidAt: string | null = null;
    let defaultedAt: string | null = null;

    switch (status) {
      case "REPAID": {
        // Original due date 30-120 days ago
        const daysAgo = randomInt(30, 120);
        originalDueDate = addDays(now, -daysAgo);
        createdAt = addDays(originalDueDate, -randomInt(3, 14));
        matchedAt = addSeconds(createdAt, realisticMatchDelay()).toISOString();
        liveAt = originalDueDate.toISOString();
        repaidAt = addDays(originalDueDate, shiftDays).toISOString();
        break;
      }
      case "DEFAULTED": {
        // Original due date 30-90 days ago, defaulted after grace period
        const daysAgo = randomInt(30, 90);
        originalDueDate = addDays(now, -daysAgo);
        createdAt = addDays(originalDueDate, -randomInt(3, 14));
        matchedAt = addSeconds(createdAt, realisticMatchDelay()).toISOString();
        liveAt = originalDueDate.toISOString();
        defaultedAt = addDays(originalDueDate, shiftDays + 3).toISOString(); // 3-day grace
        break;
      }
      case "LIVE": {
        // Original due date 1-14 days ago, new_due_date still in future
        const daysAgo = randomInt(1, Math.min(shiftDays - 1, 13));
        originalDueDate = addDays(now, -daysAgo);
        createdAt = addDays(originalDueDate, -randomInt(3, 10));
        matchedAt = addSeconds(createdAt, realisticMatchDelay()).toISOString();
        liveAt = originalDueDate.toISOString();
        break;
      }
      case "MATCHED": {
        // Original due date in the future
        originalDueDate = addDays(now, randomInt(1, 30));
        createdAt = addDays(now, -randomInt(1, 10));
        matchedAt = addSeconds(createdAt, realisticMatchDelay()).toISOString();
        break;
      }
      case "CANCELLED": {
        originalDueDate = addDays(now, randomInt(-10, 20));
        createdAt = addDays(now, -randomInt(5, 20));
        break;
      }
      case "PENDING_MATCH": {
        originalDueDate = addDays(now, randomInt(3, 30));
        createdAt = addDays(now, -randomInt(0, 5));
        break;
      }
      default:
        originalDueDate = addDays(now, randomInt(1, 30));
        createdAt = addDays(now, -randomInt(0, 5));
    }

    const newDueDate = addDays(originalDueDate, shiftDays);

    // Link MATCHED/LIVE trades to an obligation so Active Shifts shows real names
    let obligationId: string | null = null;
    if (["MATCHED", "LIVE"].includes(status)) {
      const userObls = obligationsMap.get(borrower.id);
      if (userObls && userObls.length > 0) {
        obligationId = pick(userObls).id;
      }
    }

    // Senior/Junior tranche fee split: 20% platform, 80% lenders
    const platformFee = Math.round(fee * 0.20 * 100) / 100;
    const lenderFee = Math.round((fee - platformFee) * 100) / 100;

    trades.push({
      id: tradeId,
      borrower_id: borrower.id,
      obligation_id: obligationId,
      amount,
      currency: "GBP",
      original_due_date: isoDate(originalDueDate),
      new_due_date: isoDate(newDueDate),
      fee,
      fee_rate: Number(feeRate.toFixed(4)),
      platform_fee: platformFee,
      lender_fee: lenderFee,
      risk_grade: borrower.riskGrade,
      status,
      matched_at: matchedAt,
      live_at: liveAt,
      repaid_at: repaidAt,
      defaulted_at: defaultedAt,
      created_at: createdAt.toISOString(),
      updated_at: (defaultedAt ?? repaidAt ?? liveAt ?? matchedAt ?? createdAt.toISOString()),
    });

    // --- Trade State Transitions ---
    const addTransition = (
      fromStatus: string | null,
      toStatus: string,
      ts: string,
    ) => {
      transitions.push({
        trade_id: tradeId,
        from_status: fromStatus,
        to_status: toStatus,
        actor: fromStatus === null ? "borrower" : "system",
        metadata: {},
        created_at: ts,
      });
    };

    addTransition(null, "DRAFT", createdAt.toISOString());

    const needsSubmit = ["PENDING_MATCH", "MATCHED", "LIVE", "REPAID", "DEFAULTED"].includes(status);
    if (needsSubmit) {
      addTransition(
        "DRAFT",
        "PENDING_MATCH",
        addDays(createdAt, randomInt(0, 1)).toISOString(),
      );
    }

    if (["MATCHED", "LIVE", "REPAID", "DEFAULTED"].includes(status)) {
      addTransition("PENDING_MATCH", "MATCHED", matchedAt!);
    }

    if (["LIVE", "REPAID", "DEFAULTED"].includes(status)) {
      addTransition("MATCHED", "LIVE", liveAt!);
    }

    if (status === "REPAID") {
      addTransition("LIVE", "REPAID", repaidAt!);
    }

    if (status === "DEFAULTED") {
      addTransition("LIVE", "DEFAULTED", defaultedAt!);
    }

    if (status === "CANCELLED") {
      addTransition("DRAFT", "CANCELLED", addDays(createdAt, randomInt(0, 2)).toISOString());
    }

    // --- Allocations (one per MATCHED/LIVE/REPAID/DEFAULTED trade) ---
    if (["MATCHED", "LIVE", "REPAID", "DEFAULTED"].includes(status)) {
      const lender = pick(lenders);
      const allocStatus =
        status === "REPAID"
          ? "REPAID"
          : status === "DEFAULTED"
            ? "DEFAULTED"
            : status === "LIVE"
              ? "ACTIVE"
              : "RESERVED";

      allocations.push({
        trade_id: tradeId,
        lender_id: lender.id,
        amount_slice: amount,
        fee_slice: lenderFee, // Lenders get 80% (senior tranche)
        status: allocStatus,
        created_at: matchedAt,
        updated_at: defaultedAt ?? repaidAt ?? liveAt ?? matchedAt,
      });
    }

    // --- Flowzo Events ---
    if (matchedAt) {
      events.push({
        event_type: "trade.matched",
        entity_type: "trade",
        entity_id: tradeId,
        actor: "system",
        payload: { allocations_count: 1, fully_matched: true },
        created_at: matchedAt,
      });
    }

    if (liveAt) {
      events.push({
        event_type: "trade.disbursed",
        entity_type: "trade",
        entity_id: tradeId,
        actor: "system",
        payload: { amount, original_due_date: isoDate(originalDueDate) },
        created_at: liveAt,
      });
    }

    if (repaidAt) {
      events.push({
        event_type: "trade.repaid",
        entity_type: "trade",
        entity_id: tradeId,
        actor: "system",
        payload: { amount, fee },
        created_at: repaidAt,
      });
    }

    if (defaultedAt) {
      events.push({
        event_type: "trade.defaulted",
        entity_type: "trade",
        entity_id: tradeId,
        actor: "system",
        payload: { amount, fee, grace_days: 3 },
        created_at: defaultedAt,
      });
    }
  }

  // Insert trades in batches of 50
  console.log(`  Inserting ${trades.length} trades...`);
  for (let i = 0; i < trades.length; i += 50) {
    const { error } = await supabase
      .from("trades")
      .insert(trades.slice(i, i + 50));
    if (error) {
      console.error(
        `  Trade insert error (batch ${i}):`,
        error.message,
      );
    }
  }

  // Insert transitions in batches
  console.log(`  Inserting ${transitions.length} trade state transitions...`);
  for (let i = 0; i < transitions.length; i += 100) {
    const { error } = await supabase
      .from("trade_state_transitions")
      .insert(transitions.slice(i, i + 100));
    if (error) {
      console.error(
        `  Transition insert error (batch ${i}):`,
        error.message,
      );
    }
  }

  // Insert allocations in batches
  console.log(`  Inserting ${allocations.length} allocations...`);
  for (let i = 0; i < allocations.length; i += 50) {
    const { error } = await supabase
      .from("allocations")
      .insert(allocations.slice(i, i + 50));
    if (error) {
      console.error(
        `  Allocation insert error (batch ${i}):`,
        error.message,
      );
    }
  }

  // Insert events in batches
  console.log(`  Inserting ${events.length} flowzo events...`);
  for (let i = 0; i < events.length; i += 100) {
    const { error } = await supabase
      .from("flowzo_events")
      .insert(events.slice(i, i + 100));
    if (error) {
      console.error(
        `  Event insert error (batch ${i}):`,
        error.message,
      );
    }
  }

  console.log("  Trades and related data created.");
  return { trades, allocations };
}

// ---------------------------------------------------------------------------
// Step 6: Create Agent Proposals
// ---------------------------------------------------------------------------

async function createProposals(users: SeedUser[], obligationsMap: Map<string, SeedObligation[]>) {
  console.log("Creating agent proposals...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );

  const proposals: Record<string, unknown>[] = [];

  for (let i = 0; i < PROPOSAL_COUNT; i++) {
    const borrower = pick(borrowers);
    const userObls = obligationsMap.get(borrower.id);
    const shiftDays = randomInt(1, 14);
    const now = new Date();

    // Use a real obligation if available, otherwise fall back to random merchant
    let merchant: string;
    let amount: number;
    let originalDate: Date;
    let obligationId: string | null = null;

    if (userObls && userObls.length > 0) {
      const obl = pick(userObls);
      merchant = obl.name;
      amount = obl.amount;
      originalDate = new Date(obl.nextExpected);
      obligationId = obl.id;
    } else {
      merchant = pick(MERCHANTS);
      amount = randomFloat(10, 300);
      originalDate = addDays(now, randomInt(-30, 30));
    }

    const shiftedDate = addDays(originalDate, shiftDays);
    const feeRate =
      0.049 *
      (borrower.riskGrade === "A"
        ? 1
        : borrower.riskGrade === "B"
          ? 1.5
          : 2);
    // Fee = rate * amount * days/365 — no flat % cap so APR stays consistent across term lengths
    const fee = Math.max(
      0.01,
      Math.round(feeRate * amount * (shiftDays / 365) * 100) / 100,
    );

    // Pick and fill a template
    const template = pick(EXPLANATION_TEMPLATES);
    const explanation = template
      .replace("{merchant}", merchant)
      .replace("{amount}", `\u00a3${amount.toFixed(2)}`)
      .replace("{original_date}", isoDate(originalDate))
      .replace("{shifted_date}", isoDate(shiftedDate))
      .replace(/\{shift_days\}/g, String(shiftDays))
      .replace(/\{fee\}/g, `\u00a3${fee.toFixed(2)}`);

    const status = weightedPick(
      ["PENDING", "ACCEPTED", "DISMISSED", "EXPIRED"],
      [30, 40, 20, 10],
    );

    proposals.push({
      user_id: borrower.id,
      type: "SHIFT_BILL",
      obligation_id: obligationId,
      status,
      payload: {
        obligation_id: obligationId,
        obligation_name: merchant,
        original_date: isoDate(originalDate),
        shifted_date: isoDate(shiftedDate),
        amount_pence: Math.round(amount * 100),
        fee_pence: Math.round(fee * 100),
        shift_days: shiftDays,
        risk_grade: borrower.riskGrade,
      },
      explanation_text: explanation,
      expires_at: addDays(now, randomInt(1, 14)).toISOString(),
      created_at: addDays(now, -randomInt(0, 30)).toISOString(),
      responded_at:
        status !== "PENDING"
          ? addDays(now, -randomInt(0, 15)).toISOString()
          : null,
    });
  }

  for (let i = 0; i < proposals.length; i += 50) {
    const { error } = await supabase
      .from("agent_proposals")
      .insert(proposals.slice(i, i + 50));
    if (error) {
      console.error(
        `  Proposal insert error (batch ${i}):`,
        error.message,
      );
    }
  }

  console.log(`  ${proposals.length} agent proposals created.`);
}

// ---------------------------------------------------------------------------
// Step 6b: Pre-generate Forecasts for Demo Borrowers
// ---------------------------------------------------------------------------

const FORECAST_DAYS = 180;
const OVERDRAFT_BUFFER = 100.0;
const DEMO_FORECAST_COUNT = 20; // first N borrowers get pre-generated forecasts

async function createForecasts(
  users: SeedUser[],
  seedAccounts: SeedAccount[],
  obligationsMap: Map<string, SeedObligation[]>,
) {
  console.log("Pre-generating 180-day forecasts for demo borrowers...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );
  const demoBorrowers = borrowers.slice(0, DEMO_FORECAST_COUNT);

  const allForecastRows: Record<string, unknown>[] = [];
  const allSnapshots: Record<string, unknown>[] = [];

  // Use local date parts to avoid timezone drift with isoDate/toISOString
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  for (const b of demoBorrowers) {
    const acct = seedAccounts.find((a) => a.userId === b.id);
    if (!acct) continue;

    const obls = obligationsMap.get(b.id) ?? [];
    const runId = uuid();
    let runningBalance = acct.balance;
    let dangerDaysCount = 0;

    // Income pattern: primary payday on 25th, 1-2 small irregular income days
    const payday = 25;
    const payAmount = randomFloat(1800, 3000);
    const irregularDays = [randomInt(5, 12), randomInt(15, 22)];
    const irregularAmount = randomFloat(50, 200);

    for (let dayOffset = 0; dayOffset < FORECAST_DAYS; dayOffset++) {
      // Build date string directly from local date parts to avoid UTC shift
      const d = new Date(todayYear, todayMonth, todayDay + dayOffset);
      const forecastDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayOfMonth = d.getDate();

      // Outgoings: sum obligations due on this day
      let dailyOutgoings = 0;
      for (const obl of obls) {
        if (dayOfMonth === obl.expectedDay) {
          dailyOutgoings += obl.amount;
        }
      }

      // Income: payday + irregular
      let incomeExpected = 0;
      if (dayOfMonth === payday) {
        incomeExpected = payAmount;
      } else if (irregularDays.includes(dayOfMonth)) {
        incomeExpected = irregularAmount;
      }

      incomeExpected = Math.round(incomeExpected * 100) / 100;
      dailyOutgoings = Math.round(dailyOutgoings * 100) / 100;

      runningBalance = runningBalance - dailyOutgoings + incomeExpected;

      // Confidence bands — grow sub-linearly over 180 days using sqrt
      const uncertainty = 10 * Math.sqrt(dayOffset + 1);
      const confidenceLow = Math.round((runningBalance - uncertainty) * 100) / 100;
      const confidenceHigh = Math.round((runningBalance + uncertainty) * 100) / 100;

      const isDanger = runningBalance < OVERDRAFT_BUFFER;
      if (isDanger) dangerDaysCount++;

      allForecastRows.push({
        user_id: b.id,
        forecast_date: forecastDateStr,
        projected_balance: Math.round(runningBalance * 100) / 100,
        confidence_low: confidenceLow,
        confidence_high: confidenceHigh,
        danger_flag: isDanger,
        income_expected: incomeExpected,
        outgoings_expected: dailyOutgoings,
        run_id: runId,
      });
    }

    allSnapshots.push({
      id: runId,
      user_id: b.id,
      starting_balance: Math.round(acct.balance * 100) / 100,
      obligations_count: obls.length,
      danger_days_count: dangerDaysCount,
      model_version: "v1_heuristic",
      completed_at: new Date().toISOString(),
    });
  }

  // Insert snapshots
  for (let i = 0; i < allSnapshots.length; i += 50) {
    const { error } = await supabase
      .from("forecast_snapshots")
      .insert(allSnapshots.slice(i, i + 50));
    if (error) console.error("  Snapshot insert error:", error.message);
  }

  // Insert forecast rows
  for (let i = 0; i < allForecastRows.length; i += 200) {
    const { error } = await supabase
      .from("forecasts")
      .insert(allForecastRows.slice(i, i + 200));
    if (error) console.error(`  Forecast insert error (batch ${i}):`, error.message);
  }

  console.log(`  ${allSnapshots.length} forecast snapshots created.`);
  console.log(`  ${allForecastRows.length} forecast rows created.`);
}

// ---------------------------------------------------------------------------
// Step 6c: Create Platform Revenue Entries
// ---------------------------------------------------------------------------

async function createPlatformRevenue() {
  console.log("Creating platform revenue entries...");

  // Fetch all seeded REPAID and DEFAULTED trades
  const { data: repaidTrades } = await supabase
    .from("trades")
    .select("id, platform_fee, amount, repaid_at")
    .eq("status", "REPAID")
    .gt("platform_fee", 0);

  const { data: defaultedTrades } = await supabase
    .from("trades")
    .select("id, amount, defaulted_at")
    .eq("status", "DEFAULTED");

  const revenueRows: Record<string, unknown>[] = [];

  // FEE_INCOME entries for repaid trades
  for (const t of repaidTrades ?? []) {
    revenueRows.push({
      entry_type: "FEE_INCOME",
      amount: Number(t.platform_fee),
      trade_id: t.id,
      description: `Platform fee from trade ${t.id}`,
      created_at: t.repaid_at,
    });
  }

  // DEFAULT_LOSS entries for defaulted trades (negative amount)
  for (const t of defaultedTrades ?? []) {
    revenueRows.push({
      entry_type: "DEFAULT_LOSS",
      amount: -Number(t.amount),
      trade_id: t.id,
      description: `Default loss absorbed (junior tranche): trade ${t.id}`,
      created_at: t.defaulted_at,
    });
  }

  // Insert in batches
  for (let i = 0; i < revenueRows.length; i += 50) {
    const { error } = await supabase
      .from("platform_revenue")
      .insert(revenueRows.slice(i, i + 50));
    if (error) console.error(`  Revenue insert error (batch ${i}):`, error.message);
  }

  console.log(`  ${(repaidTrades ?? []).length} FEE_INCOME entries created.`);
  console.log(`  ${(defaultedTrades ?? []).length} DEFAULT_LOSS entries created.`);
  console.log(`  ${revenueRows.length} total platform revenue entries.`);
}

// ---------------------------------------------------------------------------
// Step 7: Reconcile Lending Pots
// ---------------------------------------------------------------------------

async function reconcileLendingPots(lenders: SeedUser[]) {
  console.log("Reconciling lending pots and creating pool ledger entries...");

  const ledgerEntries: Record<string, unknown>[] = [];

  for (const lender of lenders) {
    // Get all allocations for this lender with trade details
    const { data: allocs } = await supabase
      .from("allocations")
      .select("id, trade_id, amount_slice, fee_slice, status, created_at, updated_at")
      .eq("lender_id", lender.id);

    if (!allocs || allocs.length === 0) continue;

    let locked = 0;
    let deployed = 0;
    let yield_ = 0;

    for (const a of allocs) {
      const amount = Number(a.amount_slice);
      const fee = Number(a.fee_slice);

      // Create ledger entries matching each allocation lifecycle
      // RESERVE entry (for all allocations)
      ledgerEntries.push({
        user_id: lender.id,
        entry_type: "RESERVE",
        amount: amount,
        trade_id: a.trade_id,
        allocation_id: a.id,
        description: `Reserved for trade`,
        idempotency_key: `seed-reserve-${a.id}`,
        created_at: a.created_at,
      });

      switch (a.status) {
        case "RESERVED":
          locked += amount;
          break;
        case "ACTIVE":
          deployed += amount;
          // DISBURSE entry
          ledgerEntries.push({
            user_id: lender.id,
            entry_type: "DISBURSE",
            amount: amount,
            trade_id: a.trade_id,
            allocation_id: a.id,
            description: `Disbursed to borrower`,
            idempotency_key: `seed-disburse-${a.id}`,
            created_at: a.updated_at,
          });
          break;
        case "REPAID":
          deployed += amount;
          yield_ += fee;
          // DISBURSE + REPAY + FEE_CREDIT entries
          ledgerEntries.push({
            user_id: lender.id,
            entry_type: "DISBURSE",
            amount: amount,
            trade_id: a.trade_id,
            allocation_id: a.id,
            description: `Disbursed to borrower`,
            idempotency_key: `seed-disburse-${a.id}`,
            created_at: a.created_at,
          });
          ledgerEntries.push({
            user_id: lender.id,
            entry_type: "REPAY",
            amount: amount,
            trade_id: a.trade_id,
            allocation_id: a.id,
            description: `Principal repaid`,
            idempotency_key: `seed-repay-${a.id}`,
            created_at: a.updated_at,
          });
          ledgerEntries.push({
            user_id: lender.id,
            entry_type: "FEE_CREDIT",
            amount: fee,
            trade_id: a.trade_id,
            allocation_id: a.id,
            description: `Fee earned`,
            idempotency_key: `seed-fee-${a.id}`,
            created_at: a.updated_at,
          });
          break;
        case "DEFAULTED":
          // DISBURSE + RELEASE (lost principal)
          ledgerEntries.push({
            user_id: lender.id,
            entry_type: "DISBURSE",
            amount: amount,
            trade_id: a.trade_id,
            allocation_id: a.id,
            description: `Disbursed to borrower`,
            idempotency_key: `seed-disburse-${a.id}`,
            created_at: a.created_at,
          });
          ledgerEntries.push({
            user_id: lender.id,
            entry_type: "RELEASE",
            amount: amount,
            trade_id: a.trade_id,
            allocation_id: a.id,
            description: `Default - principal lost`,
            idempotency_key: `seed-release-${a.id}`,
            created_at: a.updated_at,
          });
          break;
      }
    }

    // Get current pot
    const { data: pot } = await supabase
      .from("lending_pots")
      .select("available")
      .eq("user_id", lender.id)
      .single();

    if (!pot) continue;

    // Adjust available: original available - locked amounts
    // For REPAID trades, principal + fee returned, so add yield to available
    const originalAvailable = Number(pot.available);
    const adjustedAvailable = Math.max(
      0,
      originalAvailable - locked + yield_,
    );

    await supabase
      .from("lending_pots")
      .update({
        available: Number(adjustedAvailable.toFixed(2)),
        locked: Number(locked.toFixed(2)),
        total_deployed: Number(deployed.toFixed(2)),
        realized_yield: Number(yield_.toFixed(2)),
      })
      .eq("user_id", lender.id);
  }

  // Insert pool ledger entries in batches
  console.log(`  Inserting ${ledgerEntries.length} pool ledger entries...`);
  for (let i = 0; i < ledgerEntries.length; i += 50) {
    const { error } = await supabase
      .from("pool_ledger")
      .insert(ledgerEntries.slice(i, i + 50));
    if (error)
      console.error(`  Ledger insert error (batch ${i}):`, error.message);
  }

  console.log("  Lending pots reconciled and ledger entries created.");
}

// ---------------------------------------------------------------------------
// Step 8: Validation
// ---------------------------------------------------------------------------

async function validate() {
  console.log("\n--- Validation ---");

  const counts = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("lending_pots").select("id", { count: "exact", head: true }),
    supabase
      .from("lender_preferences")
      .select("id", { count: "exact", head: true }),
    supabase.from("trades").select("id", { count: "exact", head: true }),
    supabase.from("allocations").select("id", { count: "exact", head: true }),
    supabase
      .from("trade_state_transitions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("flowzo_events")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("agent_proposals")
      .select("id", { count: "exact", head: true }),
    supabase.from("obligations").select("id", { count: "exact", head: true }),
    supabase.from("bank_connections").select("id", { count: "exact", head: true }),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("forecasts").select("id", { count: "exact", head: true }),
    supabase
      .from("forecast_snapshots")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("platform_revenue")
      .select("id", { count: "exact", head: true }),
  ]);

  const labels = [
    "Profiles",
    "Lending Pots",
    "Lender Preferences",
    "Trades",
    "Allocations",
    "Trade Transitions",
    "Flowzo Events",
    "Agent Proposals",
    "Obligations",
    "Bank Connections",
    "Accounts",
    "Forecasts",
    "Forecast Snapshots",
    "Platform Revenue",
  ];

  for (let i = 0; i < labels.length; i++) {
    console.log(`  ${labels[i]}: ${counts[i].count ?? "?"}`);
  }

  // Risk grade distribution
  const { data: riskDist } = await supabase
    .from("profiles")
    .select("risk_grade");

  if (riskDist) {
    const gradeCounts = { A: 0, B: 0, C: 0 };
    for (const p of riskDist) {
      const g = p.risk_grade as keyof typeof gradeCounts;
      if (g in gradeCounts) gradeCounts[g]++;
    }
    const total = riskDist.length;
    console.log(
      `  Risk Distribution: A=${gradeCounts.A} (${((gradeCounts.A / total) * 100).toFixed(0)}%), ` +
        `B=${gradeCounts.B} (${((gradeCounts.B / total) * 100).toFixed(0)}%), ` +
        `C=${gradeCounts.C} (${((gradeCounts.C / total) * 100).toFixed(0)}%)`,
    );
  }

  // Trade status distribution
  const { data: statusDist } = await supabase
    .from("trades")
    .select("status");

  if (statusDist) {
    const statusCounts: Record<string, number> = {};
    for (const t of statusDist) {
      statusCounts[t.status as string] =
        (statusCounts[t.status as string] ?? 0) + 1;
    }
    const total = statusDist.length;
    const parts = Object.entries(statusCounts)
      .map(
        ([s, c]) => `${s}=${c} (${((c / total) * 100).toFixed(0)}%)`,
      )
      .join(", ");
    console.log(`  Trade Status: ${parts}`);
  }

  console.log("--- Validation Complete ---\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Flowzo Seed Script ===\n");
  const startTime = Date.now();

  await cleanup();
  const users = await createUsers();

  if (users.length === 0) {
    console.error("No users created. Aborting.");
    process.exit(1);
  }

  await updateProfiles(users);
  const lenders = await createLendingData(users);
  const seedAccounts = await createAccountsForSeedUsers(users);
  const obligationsMap = await createObligations(users);
  await createTrades(users, lenders, obligationsMap);
  await createProposals(users, obligationsMap);
  await createForecasts(users, seedAccounts, obligationsMap);
  await createPlatformRevenue();
  await reconcileLendingPots(lenders);
  await validate();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Seed completed in ${elapsed}s.`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
