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

const TRADE_COUNT = 1050;
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

  // Create in batches of 15 with delays
  const BATCH_SIZE = 15;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
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
      users[i + j].id = data.user.id;
    }

    const progress = Math.min(i + BATCH_SIZE, users.length);
    process.stdout.write(
      `\r  Created ${progress}/${users.length} users...`,
    );
    if (i + BATCH_SIZE < users.length) await sleep(300);
  }
  console.log();

  // Filter out users that failed to create
  const validUsers = users.filter((u) => u.id);
  console.log(`  ${validUsers.length} users created successfully.`);
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
      batch.map((u) =>
        supabase
          .from("profiles")
          .update({
            risk_grade: u.riskGrade,
            role_preference: u.role,
            onboarding_completed: true,
          })
          .eq("id", u.id)
          .then(({ error }) => {
            if (error)
              console.error(`  Profile update error for ${u.email}:`, error.message);
          }),
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
    return {
      user_id: u.id,
      min_apr: randomFloat(0, 5),
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
// Step 5: Create Trades + Allocations + Transitions + Events
// ---------------------------------------------------------------------------

async function createTrades(users: SeedUser[], lenders: SeedUser[]) {
  console.log("Creating trades, allocations, transitions, and events...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );

  const now = new Date();
  const trades: Record<string, unknown>[] = [];
  const allocations: Record<string, unknown>[] = [];
  const transitions: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];

  // Distribution: 70% REPAID, 15% LIVE, 10% MATCHED, 5% PENDING_MATCH
  const statusDistribution = [
    ...Array(Math.round(TRADE_COUNT * 0.7)).fill("REPAID"),
    ...Array(Math.round(TRADE_COUNT * 0.15)).fill("LIVE"),
    ...Array(Math.round(TRADE_COUNT * 0.1)).fill("MATCHED"),
    ...Array(Math.round(TRADE_COUNT * 0.05)).fill("PENDING_MATCH"),
  ];

  for (let i = 0; i < statusDistribution.length; i++) {
    const status = statusDistribution[i] as string;
    const borrower = pick(borrowers);
    const tradeId = uuid();
    const shiftDays = randomInt(1, 14);
    const amount = randomFloat(10, 500);
    const feeRate = 0.049 * (borrower.riskGrade === "A" ? 1 : borrower.riskGrade === "B" ? 1.5 : 2);
    const fee = Math.max(
      0.01,
      Math.min(
        Math.round(feeRate * amount * (shiftDays / 365) * 100) / 100,
        Math.min(amount * 0.05, 10),
      ),
    );

    let originalDueDate: Date;
    let createdAt: Date;
    let matchedAt: string | null = null;
    let liveAt: string | null = null;
    let repaidAt: string | null = null;

    switch (status) {
      case "REPAID": {
        // Original due date 30-120 days ago
        const daysAgo = randomInt(30, 120);
        originalDueDate = addDays(now, -daysAgo);
        createdAt = addDays(originalDueDate, -randomInt(3, 14));
        matchedAt = addDays(createdAt, randomInt(0, 3)).toISOString();
        liveAt = originalDueDate.toISOString();
        repaidAt = addDays(originalDueDate, shiftDays).toISOString();
        break;
      }
      case "LIVE": {
        // Original due date 1-14 days ago, new_due_date still in future
        const daysAgo = randomInt(1, Math.min(shiftDays - 1, 13));
        originalDueDate = addDays(now, -daysAgo);
        createdAt = addDays(originalDueDate, -randomInt(3, 10));
        matchedAt = addDays(createdAt, randomInt(0, 2)).toISOString();
        liveAt = originalDueDate.toISOString();
        break;
      }
      case "MATCHED": {
        // Original due date in the future
        originalDueDate = addDays(now, randomInt(1, 30));
        createdAt = addDays(now, -randomInt(1, 10));
        matchedAt = addDays(createdAt, randomInt(0, 2)).toISOString();
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

    trades.push({
      id: tradeId,
      borrower_id: borrower.id,
      amount,
      currency: "GBP",
      original_due_date: isoDate(originalDueDate),
      new_due_date: isoDate(newDueDate),
      fee,
      fee_rate: Number(feeRate.toFixed(4)),
      risk_grade: borrower.riskGrade,
      status,
      matched_at: matchedAt,
      live_at: liveAt,
      repaid_at: repaidAt,
      created_at: createdAt.toISOString(),
      updated_at: (repaidAt ?? liveAt ?? matchedAt ?? createdAt.toISOString()),
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

    if (
      status === "PENDING_MATCH" ||
      status === "MATCHED" ||
      status === "LIVE" ||
      status === "REPAID"
    ) {
      addTransition(
        "DRAFT",
        "PENDING_MATCH",
        addDays(createdAt, randomInt(0, 1)).toISOString(),
      );
    }

    if (status === "MATCHED" || status === "LIVE" || status === "REPAID") {
      addTransition("PENDING_MATCH", "MATCHED", matchedAt!);
    }

    if (status === "LIVE" || status === "REPAID") {
      addTransition("MATCHED", "LIVE", liveAt!);
    }

    if (status === "REPAID") {
      addTransition("LIVE", "REPAID", repaidAt!);
    }

    // --- Allocations (one per MATCHED/LIVE/REPAID trade) ---
    if (status !== "PENDING_MATCH") {
      const lender = pick(lenders);
      const allocStatus =
        status === "REPAID"
          ? "REPAID"
          : status === "LIVE"
            ? "ACTIVE"
            : "RESERVED";

      allocations.push({
        trade_id: tradeId,
        lender_id: lender.id,
        amount_slice: amount,
        fee_slice: fee,
        status: allocStatus,
        created_at: matchedAt,
        updated_at: repaidAt ?? liveAt ?? matchedAt,
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

async function createProposals(users: SeedUser[]) {
  console.log("Creating agent proposals...");

  const borrowers = users.filter(
    (u) => u.role === "BORROWER_ONLY" || u.role === "BOTH",
  );

  const proposals: Record<string, unknown>[] = [];

  for (let i = 0; i < PROPOSAL_COUNT; i++) {
    const borrower = pick(borrowers);
    const merchant = pick(MERCHANTS);
    const amount = randomFloat(10, 300);
    const shiftDays = randomInt(1, 14);
    const now = new Date();
    const originalDate = addDays(now, randomInt(-30, 30));
    const shiftedDate = addDays(originalDate, shiftDays);
    const feeRate =
      0.049 *
      (borrower.riskGrade === "A"
        ? 1
        : borrower.riskGrade === "B"
          ? 1.5
          : 2);
    const fee = Math.max(
      0.01,
      Math.min(
        Math.round(feeRate * amount * (shiftDays / 365) * 100) / 100,
        Math.min(amount * 0.05, 10),
      ),
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
      status,
      payload: {
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
// Step 7: Reconcile Lending Pots
// ---------------------------------------------------------------------------

async function reconcileLendingPots(lenders: SeedUser[]) {
  console.log("Reconciling lending pots from allocation states...");

  for (const lender of lenders) {
    // Get all allocations for this lender
    const { data: allocs } = await supabase
      .from("allocations")
      .select("amount_slice, fee_slice, status")
      .eq("lender_id", lender.id);

    if (!allocs || allocs.length === 0) continue;

    let locked = 0;
    let deployed = 0;
    let yield_ = 0;

    for (const a of allocs) {
      const amount = Number(a.amount_slice);
      const fee = Number(a.fee_slice);

      switch (a.status) {
        case "RESERVED":
          locked += amount;
          break;
        case "ACTIVE":
          deployed += amount;
          break;
        case "REPAID":
          deployed += amount;
          yield_ += fee;
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

  console.log("  Lending pots reconciled.");
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
  await createTrades(users, lenders);
  await createProposals(users);
  await reconcileLendingPots(lenders);
  await validate();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Seed completed in ${elapsed}s.`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
