# Flowzo Architecture Document

> Monzo-native "Bills + Pots" fintech webapp with a pooled P2P micro-lending layer.
> Hackathon MVP -- this document serves as both a technical reference and a production roadmap.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Database Schema (ER Diagram)](#3-database-schema)
4. [Edge Functions Pipeline](#4-edge-functions-pipeline)
5. [Risk Scoring Model](#5-risk-scoring-model)
6. [Fee Calculation Engine](#6-fee-calculation-engine)
7. [Security Architecture](#7-security-architecture)
8. [What's Needed for Production](#8-whats-needed-for-production)
9. [Tech Stack Summary](#9-tech-stack-summary)
10. [API Route Map](#10-api-route-map)

---

## 1. System Architecture Overview

```
+--------------------------------------------------+
|                    CLIENTS                        |
|  +--------------------------------------------+  |
|  |  Next.js 15 App Router (Vercel)            |  |
|  |  React 19 / TypeScript strict / Tailwind v4|  |
|  |  shadcn/ui components                      |  |
|  |                                            |  |
|  |  Route Groups:                             |  |
|  |    (auth)      - login, signup, callback   |  |
|  |    (app)       - borrower, lender, data    |  |
|  |    (marketing) - terms, privacy, fca       |  |
|  +--------------------+-----------------------+  |
+-----------------------|---------------------------+
                        |
          Supabase JS Client (anon key)
          Server Components + Server Actions
          API Routes (Next.js /api/*)
                        |
+--------------------------------------------------+
|                  SUPABASE CLOUD                   |
|                                                   |
|  +--------------------------------------------+  |
|  |            Supabase Auth (GoTrue)           |  |
|  |  Email/password + OAuth + JWT sessions      |  |
|  +--------------------------------------------+  |
|                                                   |
|  +--------------------------------------------+  |
|  |          PostgreSQL Database                |  |
|  |  18 tables, RLS on all, 3 views            |  |
|  |  pgcrypto extension                        |  |
|  |  RPC functions: update_lending_pot(),       |  |
|  |    calculate_risk_grade(),                  |  |
|  |    calculate_fee(),                         |  |
|  |    get_pool_utilization()                   |  |
|  |  Triggers: handle_new_user(),              |  |
|  |    record_trade_transition()               |  |
|  +--------------------------------------------+  |
|                                                   |
|  +--------------------------------------------+  |
|  |         Edge Functions (Deno)               |  |
|  |  sync-banking-data                         |  |
|  |  run-forecast                              |  |
|  |  generate-proposals                        |  |
|  |  match-trade                               |  |
|  |  settle-trade                              |  |
|  |  explain-proposal                          |  |
|  +--------------------------------------------+  |
|                                                   |
|  +--------------------------------------------+  |
|  |         Supabase Realtime                   |  |
|  |  Published tables: trades, allocations,     |  |
|  |    agent_proposals, lending_pots            |  |
|  +--------------------------------------------+  |
|                                                   |
+--------------------------------------------------+
           |                         |
           v                         v
+-------------------+    +----------------------+
| TrueLayer         |    | Anthropic Claude API |
| Open Banking      |    | (Haiku 3.5)          |
|                   |    |                      |
| Sandbox/Prod:     |    | Proposal explanation |
|  /data/v1/accounts|    | Natural language     |
|  /data/v1/balance |    | generation           |
|  /data/v1/txns    |    +----------------------+
|  /connect/token   |
+-------------------+    +----------------------+
                         | Payment Providers    |
                         | (STUBBED)            |
                         |                      |
                         | Stripe Connect       |
                         | GoCardless DD        |
                         | TrueLayer PIS        |
                         +----------------------+

+--------------------------------------------------+
|               MONOREPO STRUCTURE                  |
|                                                   |
|  flowzo/                                          |
|  +-- apps/                                        |
|  |   +-- web/           Next.js 15 application    |
|  |       +-- src/app/   App Router pages/routes   |
|  |       +-- src/lib/   Supabase, TrueLayer, etc  |
|  |       +-- src/components/  UI components       |
|  +-- packages/                                    |
|  |   +-- shared/        @flowzo/shared            |
|  |       +-- types/     TypeScript types          |
|  |       +-- constants/ Fee config, risk tiers    |
|  |       +-- utils/     Currency, date, math      |
|  +-- supabase/                                    |
|      +-- migrations/    14 migration files        |
|      +-- functions/     6 Edge Functions          |
+--------------------------------------------------+
```

---

## 2. Data Flow Diagrams

### A. User Onboarding Flow

```
+----------+     +-----------+     +------------------+     +-----------+
|  Signup  |---->| Supabase  |---->| Trigger:         |---->|  Profile  |
| (email/  |     | Auth      |     | handle_new_user()|     | created   |
|  pass)   |     | (GoTrue)  |     | creates profile  |     | (risk=C)  |
+----------+     +-----------+     +------------------+     +-----+-----+
                                                                  |
                                                                  v
+----------+     +-----------+     +------------------+     +-----------+
| Bank     |<----|  Role     |<----|  Onboarding      |<----|  Profile  |
| Connect  |     | Selection |     |  Page            |     |  Setup    |
| Button   |     | (BOTH/    |     |  /onboarding     |     |           |
+----+-----+     |  BORROWER/|     +------------------+     +-----------+
     |           |  LENDER)  |
     |           +-----------+
     v
+----------+     +-----------+     +------------------+
| TrueLayer|---->| OAuth     |---->| Exchange code    |
| Auth Link|     | Consent   |     | for tokens       |
| (sandbox)|     | Screen    |     | Store in         |
+----------+     +-----------+     | bank_connections |
                                   +--------+---------+
                                            |
                             Fire-and-forget POST /api/pipeline/run
                                            |
                        +-------------------+-------------------+
                        |                   |                   |
                        v                   v                   v
               +----------------+  +----------------+  +------------------+
               | Edge Function: |  | Edge Function: |  | Edge Function:   |
               | sync-banking-  |  | run-forecast   |  | generate-        |
               | data           |->|                |->| proposals        |
               |                |  | 30-day project |  |                  |
               | TrueLayer API  |  | danger days    |  | SHIFT_BILL       |
               | -> accounts    |  | (bal < GBP100) |  | proposals for    |
               | -> transactions|  | uncertainty    |  | at-risk bills    |
               | -> obligations |  | bands          |  | 7-day expiry     |
               | (CV analysis)  |  |                |  |                  |
               +----------------+  +----------------+  +------------------+
                                                               |
                                                               v
                                                     +------------------+
                                                     | Redirect to      |
                                                     | /borrower        |
                                                     | dashboard        |
                                                     +------------------+
```

### B. Borrower Flow

```
+------------------+     +------------------+     +------------------+
|  Borrower        |     |  AI Suggestions  |     |  Accept          |
|  Dashboard       |---->|  (agent_         |---->|  Proposal        |
|                  |     |   proposals)     |     |                  |
|  - Calendar      |     |  "Move Netflix   |     |  Creates DRAFT   |
|    heatmap       |     |   from 15th to   |     |  trade from      |
|  - Danger days   |     |   22nd, fee:     |     |  proposal        |
|    highlighted   |     |   GBP0.42"       |     |  payload         |
|  - Balance       |     |                  |     |                  |
|    forecast      |     |  Explain button  |     +--------+---------+
|    graph         |     |  -> Claude API   |              |
+------------------+     +------------------+              v
                                                 +------------------+
                                                 |  Trade Detail    |
                                                 |  /borrower/      |
                                                 |  trades/[id]     |
                                                 |                  |
                                                 |  Review amount,  |
                                                 |  dates, fee      |
                                                 +--------+---------+
                                                          |
                                                    POST /api/trades
                                                    /[tradeId]/bid
                                                          |
                                                          v
+------------------+     +------------------+     +------------------+
|  REPAID /        |     |  LIVE            |     |  PENDING_MATCH   |
|  DEFAULTED       |<----|  (disbursed)     |<----|                  |
|                  |     |                  |     |  match-trade     |
|  settle-trade    |     |  settle-trade    |     |  Edge Function   |
|  Edge Function   |     |  MATCHED->LIVE   |     |  scores lenders  |
|  (CRON daily)    |     |  on original_    |     |  allocates funds |
|                  |     |  due_date        |     |  -> MATCHED      |
+------------------+     +------------------+     +------------------+
```

### C. Lender Flow

```
+------------------+     +------------------+     +------------------+
|  Lender          |     |  Top Up Pot      |     |  Set Preferences |
|  Dashboard       |---->|                  |---->|                  |
|  /lender         |     |  POST /api/      |     |  lender_         |
|                  |     |  payments/topup  |     |  preferences     |
|  - Pot balance   |     |                  |     |                  |
|    (available,   |     |  amount_pence    |     |  - min_apr       |
|     locked,      |     |  -> update_      |     |  - max_shift_days|
|     deployed)    |     |  lending_pot()   |     |  - max_exposure  |
|  - Yield earned  |     |  RPC (DEPOSIT)   |     |  - risk_bands[]  |
|  - Allocation    |     |                  |     |  - auto_match    |
|    history       |     +------------------+     +--------+---------+
|                  |                                       |
+--------+---------+                                       |
         |                                                 |
         v                                                 v
+------------------+     +------------------+     +------------------+
|  Bubble Board    |     |  Manual Fund     |     |  Auto-Match      |
|  (D3 canvas)     |---->|  (select trade,  |     |  (match-trade    |
|                  |     |   fund manually) |     |   Edge Function  |
|  Browse          |     |                  |     |   scores and     |
|  PENDING_MATCH   |     +--------+---------+     |   allocates)     |
|  trades          |              |               +--------+---------+
|                  |              |                        |
|  Bubble size =   |              +------------------------+
|  trade amount    |                        |
|  Color = risk    |                        v
|  grade           |              +------------------+
+------------------+              |  Allocation      |
                                  |  Created          |
                                  |                  |
                                  |  RESERVE entry   |
                                  |  in pool_ledger  |
                                  |  locked funds    |
                                  +--------+---------+
                                           |
                                           v
                                  +------------------+
                                  |  On Repayment:   |
                                  |                  |
                                  |  REPAY principal |
                                  |  FEE_CREDIT      |
                                  |  yield earned    |
                                  +------------------+
```

### D. Trade Lifecycle State Machine

```
                            +-------------------+
                            |                   |
                            v                   |
+--------+    +-------------+--+    +-----------+------+
|        |    |                |    |                   |
| DRAFT  +--->| PENDING_MATCH  +--->|     MATCHED       |
|        |    |                |    |                   |
+---+----+    +-------+--------+    +--------+----------+
    |                 |                      |
    |                 |                      | original_due_date
    |                 |                      | arrives
    |                 |                      v
    |                 |             +--------+----------+
    |                 |             |                   |
    |                 |             |      LIVE         |
    |                 |             |                   |
    |                 |             +--+------+------+--+
    |                 |                |      |      |
    |                 |                |      |      | new_due_date
    |                 |                |      |      | + 3 day grace
    v                 v                |      |      | exceeded
+---------+     +-----------+         |      |      v
|         |     |           |         |      |  +---+-------+
|CANCELLED|     | (no match |         |      |  |           |
|         |     |  found)   |         |      |  | DEFAULTED |
+---------+     +-----------+         |      |  |           |
                                      |      |  +-----------+
                  new_due_date        |      |
                  arrives             |      |
                  (on time)           |      |
                                      v      |
                              +-------+--+   |
                              |          |   |
                              |  REPAID  |   |
                              |          |   |
                              +----------+   |
                                             |
    State Transitions:                       |
    - Recorded by trigger                    |
      record_trade_transition()              |
    - Stored in trade_state_transitions      |
    - Timestamps auto-set:                   |
      matched_at, live_at,                   |
      repaid_at, defaulted_at                |
```

**Status transition rules:**

| From | To | Trigger | Actor |
|---|---|---|---|
| DRAFT | PENDING_MATCH | Borrower submits bid (POST /api/trades/[id]/bid) | user |
| DRAFT | CANCELLED | Borrower cancels | user |
| PENDING_MATCH | MATCHED | match-trade Edge Function finds full funding | system |
| MATCHED | LIVE | settle-trade: original_due_date reached | system (CRON) |
| LIVE | REPAID | settle-trade: new_due_date reached | system (CRON) |
| LIVE | DEFAULTED | settle-trade: new_due_date + 3 days grace exceeded | system (CRON) |

### E. Payment & Settlement Flow (Pool Ledger Double-Entry)

```
+------------------+                    +------------------+
|  Lender tops up  |                    |  lending_pots    |
|  pot via          |                    |                  |
|  /api/payments/  +--------+           |  available: +X   |
|  topup            |        |           |  locked:    0    |
+------------------+        |           +------------------+
                            |
                            v
                   +--------+--------+
                   | update_lending_ |
                   | pot() RPC       |
                   | entry_type:     |
                   | DEPOSIT         |
                   +--------+--------+
                            |
                            v
                   +------------------+
                   |  pool_ledger     |
                   |  DEPOSIT entry   |
                   |  idempotency_key |
                   +------------------+

+------------------------------------------------------------------+
|                  ON MATCH (match-trade)                           |
+------------------------------------------------------------------+

  For each lender allocation:

  update_lending_pot(RESERVE)
  +------------------+     +------------------+
  |  lending_pots    |     |  pool_ledger     |
  |  available: -X   |     |  RESERVE entry   |
  |  locked:    +X   |     +------------------+
  +------------------+

+------------------------------------------------------------------+
|                  ON DISBURSE (settle-trade, MATCHED -> LIVE)      |
+------------------------------------------------------------------+

  update_lending_pot(DISBURSE)
  +------------------+     +------------------+
  |  lending_pots    |     |  pool_ledger     |
  |  locked:    -X   |     |  DISBURSE entry  |
  |  deployed:  +X   |     +------------------+
  +------------------+

+------------------------------------------------------------------+
|                  ON REPAY (settle-trade, LIVE -> REPAID)          |
+------------------------------------------------------------------+

  Step 1: update_lending_pot(REPAY) -- principal
  +------------------+     +------------------+
  |  lending_pots    |     |  pool_ledger     |
  |  available: +X   |     |  REPAY entry     |
  +------------------+     +------------------+

  Step 2: update_lending_pot(FEE_CREDIT) -- fee share
  +------------------+     +------------------+
  |  lending_pots    |     |  pool_ledger     |
  |  available: +fee |     |  FEE_CREDIT      |
  |  yield:    +fee  |     |  entry           |
  +------------------+     +------------------+

+------------------------------------------------------------------+
|                  ON DEFAULT (settle-trade, LIVE -> DEFAULTED)     |
+------------------------------------------------------------------+

  update_lending_pot(RELEASE) -- return locked funds, no fee
  +------------------+     +------------------+
  |  lending_pots    |     |  pool_ledger     |
  |  locked:    -X   |     |  RELEASE entry   |
  |  available: +X   |     +------------------+
  +------------------+

  Note: In the current MVP, defaults release funds back to lenders
  (no actual loss). Production would need a proper loss allocation
  model with recovery processes.
```

**Idempotency:** Every pool_ledger entry uses a unique `idempotency_key` (e.g., `reserve-{trade_id}-{lender_id}`) to prevent double-processing. The `update_lending_pot()` function uses `SELECT ... FOR UPDATE` row-level locking for atomicity.

---

## 3. Database Schema

### Enums

```
trade_status:       DRAFT | PENDING_MATCH | MATCHED | LIVE | REPAID | DEFAULTED | CANCELLED
allocation_status:  RESERVED | ACTIVE | REPAID | DEFAULTED | RELEASED
ledger_entry_type:  DEPOSIT | WITHDRAW | RESERVE | RELEASE | DISBURSE | REPAY | FEE_CREDIT
payment_direction:  OUTBOUND | INBOUND
payment_status:     PENDING | SUBMITTED | COMPLETED | FAILED
proposal_status:    PENDING | ACCEPTED | DISMISSED | EXPIRED
risk_grade:         A | B | C
obligation_frequency: WEEKLY | FORTNIGHTLY | MONTHLY | QUARTERLY | ANNUAL | IRREGULAR
role_preference:    BORROWER_ONLY | LENDER_ONLY | BOTH
```

### ER Diagram (18 Tables)

```
                              +-------------------+
                              |    auth.users      |
                              |  (Supabase Auth)   |
                              +--------+----------+
                                       |
                          trigger: handle_new_user()
                                       |
                                       v
+-------------------+         +--------+----------+         +-------------------+
| bank_connections  |<--------+     profiles       +------->| lender_preferences|
|                   |  1:N    |                    |  1:1   |                   |
| id (PK)           |         | id (PK, FK auth)  |        | id (PK)           |
| user_id (FK)      |         | display_name      |        | user_id (FK, UQ)  |
| provider          |         | risk_grade (enum)  |        | min_apr           |
| truelayer_token   |         | role_preference    |        | max_shift_days    |
| consent_id        |         | onboarding_done   |        | max_exposure      |
| status            |         | created_at        |        | max_total_exposure|
| last_synced_at    |         | updated_at        |        | risk_bands[]      |
+--------+----------+         +---+---+---+---+---+        | auto_match_enabled|
         |                        |   |   |   |            +-------------------+
         |                        |   |   |   |
         v                        |   |   |   +--------+
+--------+----------+             |   |   |            |
|     accounts       |<-----------+   |   |            v
|                    |  1:N           |   |   +--------+----------+
| id (PK)            |                |   |   |   lending_pots    |
| user_id (FK)       |                |   |   |                   |
| bank_connection_id |                |   |   | id (PK)           |
| external_account_id|                |   |   | user_id (FK, UQ)  |
| account_type       |                |   |   | available         |
| display_name       |                |   |   | locked            |
| currency           |                |   |   | total_deployed    |
| balance_current    |                |   |   | realized_yield    |
| balance_available  |                |   |   | currency          |
+--------+-----------+                |   |   +--------+----------+
         |                            |   |            |
         v                            |   |            v
+--------+-----------+                |   |   +--------+----------+
|   transactions     |                |   |   |   pool_ledger     |
|                    |                |   |   |                   |
| id (PK)            |                |   |   | id (PK)           |
| user_id (FK)       |                |   |   | user_id (FK)      |
| account_id (FK)    |                |   |   | entry_type (enum) |
| external_txn_id    |                |   |   | amount            |
| amount             |                |   |   | balance_after     |
| currency           |                |   |   | trade_id (FK)     |
| description        |                |   |   | allocation_id(FK) |
| merchant_name      |                |   |   | description       |
| category           |                |   |   | idempotency_key   |
| transaction_type   |                |   |   +-------------------+
| booked_at          |                |   |
+--------------------+                |   |
                                      |   |
+--------------------+                |   |        +-------------------+
|   obligations      |<---------------+   |        |  agent_proposals  |
|                    |  1:N               |        |                   |
| id (PK)            |                    |        | id (PK)           |
| user_id (FK)       |                    +------->| user_id (FK)      |
| account_id (FK)    |                      1:N    | type              |
| name               |                             | obligation_id(FK) |
| merchant_name      |      +---+                  | payload (jsonb)   |
| amount             |      |   |                  | status (enum)     |
| currency           |      |   |                  | explanation_text  |
| expected_day       |      |   |                  | trade_id (FK)     |
| frequency (enum)   |      |   |                  | expires_at        |
| category           |      |   |                  | responded_at      |
| is_essential       |      |   |                  +-------------------+
| confidence         |      |   |
| next_expected      |      |   |
+--------------------+      |   |
                            |   |
+--------------------+      |   |        +-------------------+
|    forecasts       |<-----+   +------->|     trades        |
|                    | 1:N      1:N(borr)| (borrower_id)     |
| id (PK)            |                   |                   |
| user_id (FK)       |                   | id (PK)           |
| forecast_date      |                   | borrower_id (FK)  |
| projected_balance  |                   | obligation_id(FK) |
| confidence_low     |                   | amount            |
| confidence_high    |                   | currency          |
| danger_flag        |                   | original_due_date |
| income_expected    |                   | new_due_date      |
| outgoings_expected |                   | shift_days (gen)  |
| run_id (FK)        |                   | fee               |
+--------------------+                   | fee_rate          |
                                          | risk_grade (enum) |
+--------------------+                   | status (enum)     |
| forecast_snapshots |                   | max_fee           |
|                    |                   | matched_at        |
| id (PK)            |                   | live_at           |
| user_id (FK)       |                   | repaid_at         |
| starting_balance   |                   | defaulted_at      |
| obligations_count  |                   +--------+----------+
| danger_days_count  |                            |
| model_version      |                            |
| run_at             |                   +--------+----------+
| completed_at       |                   | trade_state_      |
+--------------------+                   | transitions       |
                                          |                   |
+--------------------+                   | id (PK)           |
|   agent_runs       |                   | trade_id (FK)     |
|                    |                   | from_status       |
| id (PK)            |                   | to_status         |
| agent_type         |                   | actor             |
| user_id (FK)       |                   | metadata (jsonb)  |
| input_summary      |                   +-------------------+
| result_summary     |                            |
| proposals_count    |                            |
| error              |                   +--------+----------+
| started_at         |                   |   allocations     |
| completed_at       |                   |                   |
+--------------------+                   | id (PK)           |
                                          | trade_id (FK)     |
+--------------------+                   | lender_id (FK)    |
|  flowzo_events     |                   | amount_slice      |
|                    |                   | fee_slice         |
| id (PK)            |                   | status (enum)     |
| event_type         |                   +-------------------+
| entity_type        |
| entity_id          |                   +-------------------+
| actor              |                   |  payment_orders   |
| payload (jsonb)    |                   |  (STUBBED)        |
+--------------------+                   |                   |
                                          | id (PK)           |
+--------------------+                   | trade_id (FK)     |
|  webhook_events    |                   | direction (enum)  |
|                    |                   | amount            |
| id (PK)            |                   | provider (mock)   |
| provider           |                   | idempotency_key   |
| external_id        |                   | status (enum)     |
| event_type         |                   | external_ref      |
| payload (jsonb)    |                   +-------------------+
| processed          |
+--------------------+
```

### Views

| View | Purpose |
|---|---|
| `pool_summary` | Aggregate lending pot stats: total lenders, available, locked, utilization ratio, yield |
| `trade_analytics` | Trade stats grouped by risk_grade and status: count, avg amount/fee, default rate |
| `risk_distribution` | User count per risk grade |
| `pool_overview` | Simplified pool stats for dashboard display |

### Key Constraints

- `trades.shift_days` is a generated column: `new_due_date - original_due_date` (stored)
- `trades.chk_shift_days`: shift must be between 1 and 14 days
- `trades.chk_positive_amount`: amount must be > 0
- `lending_pots.user_id` is UNIQUE (one pot per user)
- `lender_preferences.user_id` is UNIQUE (one preference set per user)
- `obligations(user_id, merchant_name)` is UNIQUE (for upsert on sync)
- `pool_ledger.idempotency_key` is UNIQUE (prevents double processing)
- `webhook_events(provider, external_id)` is UNIQUE (dedup webhooks)

---

## 4. Edge Functions Pipeline

### Pipeline Orchestration

The pipeline is triggered from `POST /api/pipeline/run` and calls three Edge Functions sequentially:

```
sync-banking-data  --->  run-forecast  --->  generate-proposals
     (step 1)              (step 2)              (step 3)
```

### 4.1 sync-banking-data

**Input:** `{ user_id, connection_id }`
**Output:** `{ accounts_synced, transactions_synced, obligations_detected }`

```
TrueLayer API                     Supabase DB
+-------------------+             +-------------------+
| GET /data/v1/     |  upsert     |   accounts        |
|   accounts        +------------>| (by external_     |
|                   |             |  account_id)      |
+-------------------+             +-------------------+

+-------------------+             +-------------------+
| GET /data/v1/     |  update     |   accounts        |
|   accounts/{id}/  +------------>| balance_current   |
|   balance         |             | balance_available |
+-------------------+             +-------------------+

+-------------------+             +-------------------+
| GET /data/v1/     |  upsert     |   transactions    |
|   accounts/{id}/  +------------>| (by account_id +  |
|   transactions    |   90 days   |  external_txn_id) |
+-------------------+             +-------------------+
                                          |
                                  Statistical analysis
                                  of outgoing transactions
                                          |
                                          v
                                  +-------------------+
                                  | Recurring         |
                                  | Obligation        |
                                  | Detection         |
                                  |                   |
                                  | Group by merchant |
                                  | Compute inter-    |
                                  | payment gaps      |
                                  | CV(gaps) < 0.5    |
                                  | Classify freq:    |
                                  |  5-9d  = WEEKLY   |
                                  |  12-18d= FORTNIGHT|
                                  |  25-35d= MONTHLY  |
                                  |  80-100d= QUARTER |
                                  | CV(amounts)       |
                                  | confidence =      |
                                  |  regularity *     |
                                  |  amount_consist.  |
                                  | threshold >= 0.5  |
                                  +--------+----------+
                                           |
                                    upsert |
                                           v
                                  +-------------------+
                                  |   obligations     |
                                  | (by user_id +     |
                                  |  merchant_name)   |
                                  +-------------------+
```

**Token refresh:** On TrueLayer 401, automatically refreshes the OAuth token using the stored refresh_token and updates the bank_connections record.

### 4.2 run-forecast

**Input:** `{ user_id }`
**Output:** `{ run_id, starting_balance, danger_days, forecast[] }`

```
Inputs                            Processing                     Output
+-------------------+             +-------------------+         +-------------------+
| accounts          |             | For each of 30    |         | forecasts (30     |
| (current balance) |------------>| days:             |         | rows per user)    |
+-------------------+             |                   |         |                   |
                                  | running_balance = |         | forecast_date     |
+-------------------+             |   prev_balance    |         | projected_balance |
| obligations       |------------>|   - outgoings     |         | confidence_low    |
| (active, with     |             |   + daily_income  |         | confidence_high   |
|  expected_day +   |             |                   |         | danger_flag       |
|  frequency)       |             | danger_flag =     |         | income_expected   |
+-------------------+             |   balance < 100   |         | outgoings_expected|
                                  |   (GBP buffer)    |         +-------------------+
+-------------------+             |                   |
| transactions      |             | uncertainty:      |         +-------------------+
| (90 day history,  |------------>|   days 0-13: +/-  |         | forecast_snapshots|
|  for income est)  |             |     10%           |         |                   |
+-------------------+             |   days 14-29: +/- |         | starting_balance  |
                                  |     25%           |         | danger_days_count |
                                  +-------------------+         | model_version:    |
                                                                |  "v1_heuristic"   |
                                                                +-------------------+
```

### 4.3 generate-proposals

**Input:** `{ user_id }`
**Output:** `{ proposals[], risk_grade, danger_days }`

```
+-------------------+     +-------------------+     +-------------------+
| forecasts         |     | For each danger   |     | agent_proposals   |
| (danger_flag=true)|---->| day, find at-risk |---->| (PENDING status)  |
+-------------------+     | obligations       |     |                   |
                          | (+/- 1 day match) |     | type: SHIFT_BILL  |
+-------------------+     |                   |     | payload:          |
| obligations       |---->| Find safe date:   |     |  obligation_id    |
| (active)          |     | balance > amount  |     |  original_date    |
+-------------------+     | + GBP50 buffer    |     |  shifted_date     |
                          |                   |     |  amount_pence     |
+-------------------+     | Cap shift to 14d  |     |  fee_pence        |
| profile           |---->| Calculate fee     |     |  shift_days       |
| (risk_grade)      |     | (risk-adjusted)   |     |  risk_grade       |
+-------------------+     |                   |     |                   |
                          | Default: +7 days  |     | expires_at: +7d   |
                          | if no safe date   |     | explanation_text  |
                          +-------------------+     +-------------------+
```

### 4.4 match-trade

**Input:** `{ trade_id }`
**Output:** `{ fully_matched, allocations[], implied_apr }`

```
+-------------------+     +-------------------+     +-------------------+
| trade             |     | Filter eligible   |     | Score lenders     |
| (PENDING_MATCH)   |---->| lenders:          |---->| (composite 0-1):  |
+-------------------+     |                   |     |                   |
                          | auto_match = true |     | APR compat (40%)  |
+-------------------+     | risk_bands match  |     |  implied >= min   |
| lender_preferences|---->| max_shift_days >= |     |                   |
| (all with         |     | available > 0     |     | Headroom (30%)    |
|  auto_match=true) |     | exposure < max    |     |  avail / (10x     |
+-------------------+     | implied_apr >=    |     |  trade amount)    |
                          |   min_apr         |     |                   |
+-------------------+     +-------------------+     | Diversification   |
| lending_pots      |                               |  (30%)            |
| (available bal)   |                               |  1 - (exposure /  |
+-------------------+                               |  max_exposure)    |
                                                    +--------+----------+
                                                             |
                                           Sort by score desc|
                                                             v
                                                    +--------+----------+
                                                    | Allocate funds    |
                                                    |                   |
                                                    | Per lender cap:   |
                                                    |  min(available,   |
                                                    |   max_exposure,   |
                                                    |   50% of trade,   |
                                                    |   exposure_room,  |
                                                    |   remaining)      |
                                                    |                   |
                                                    | Create allocation |
                                                    | RESERVE via RPC   |
                                                    | (atomic lock)     |
                                                    |                   |
                                                    | If fully funded:  |
                                                    |  trade -> MATCHED |
                                                    +-------------------+
```

**Diversification constraint:** No single lender can fund more than 50% of any trade (`MAX_SINGLE_LENDER_PCT = 0.5`). This ensures at least 2 lenders per trade.

### 4.5 settle-trade

**Input:** `{ trade_id? }` (optional; processes all eligible if omitted)
**Output:** `{ disbursed[], repaid[], defaulted[], errors[] }`

Three phases run in sequence:

| Phase | From | To | Condition | Ledger Entry |
|---|---|---|---|---|
| 1. Disburse | MATCHED | LIVE | `original_due_date <= today` | DISBURSE |
| 2. Repay | LIVE | REPAID | `new_due_date <= today` | REPAY + FEE_CREDIT |
| 3. Default | LIVE | DEFAULTED | `new_due_date + 3 days < today` | RELEASE |

**Triggered by:** `GET /api/cron/settlement` (protected by CRON_SECRET bearer token).

### 4.6 explain-proposal

**Input:** `{ proposal_id }`
**Output:** `{ explanation_text }`

Calls the Anthropic Claude API (claude-3-5-haiku-20241022) to generate a natural-language explanation of a bill-shift proposal. Fetches the proposal with its linked obligation, builds a context prompt, and stores the generated explanation back on the proposal record.

---

## 5. Risk Scoring Model

### Current Implementation (Heuristic v1)

The risk score is computed by the `calculate_risk_grade()` PostgreSQL function:

```
Score = (income_regularity * 30)
      + (min(min_monthly_balance / 500, 1.0) * 20)
      + (max(1.0 - failed_payment_count * 0.25, 0) * 25)
      + (max(1.0 - bill_concentration, 0) * 10)
      + (max(1.0 - balance_volatility, 0) * 15)
                                                    -----
                                              Total:  100
```

**Input features (5):**

| Feature | Weight | Range | Description |
|---|---|---|---|
| `income_regularity` | 30% | 0.0 - 1.0 | How consistently income arrives (CV of gaps) |
| `min_monthly_balance` | 20% | GBP 0 - 500+ | Lowest balance in any month (capped at 500) |
| `failed_payment_count` | 25% | 0 - 4+ | Count of failed/bounced payments (each -25%) |
| `bill_concentration` | 10% | 0.0 - 1.0 | How clustered bills are in the month (Herfindahl-like) |
| `balance_volatility` | 15% | 0.0 - 1.0 | Standard deviation of daily balance / mean |

**Grade assignment:**

| Grade | Score Range | Max Shift Amount | Max Shift Days | Max Active Trades |
|---|---|---|---|---|
| A (Low Risk) | >= 70 | GBP 500 | 14 | 5 |
| B (Medium Risk) | >= 40 | GBP 200 | 10 | 3 |
| C (Higher Risk) | < 40 | GBP 75 | 7 | 1 |

### What's Needed for Production ML

**1. Training Data Requirements:**
- 12+ months of transaction history per user
- Repayment outcome labels (on-time, late, default)
- Minimum 10,000 labelled samples for reliable model training
- Balanced representation across risk grades

**2. Feature Engineering Pipeline:**
- Time-series features: rolling averages (7d, 30d, 90d), trend direction
- Behavioral patterns: spending velocity changes, new merchant frequency
- Income stability: paycheck amount variance, employer diversity
- Obligation burden ratio: total obligations / total income
- Seasonal adjustments: holiday spending, tax periods

**3. Model Options:**
- **XGBoost** for tabular data (primary candidate): fast, interpretable, handles mixed feature types
- **LSTM / Transformer** for transaction sequence patterns: captures temporal dependencies
- **Ensemble** of both for final scoring

**4. Production Infrastructure:**
```
Transaction History ---> Feature Store ---> Model Training
                         (offline)         (scheduled)
                              |                  |
                              v                  v
User Request ---------> Feature Lookup --> Real-time Inference
                         (online)          API (<100ms SLA)
                              |                  |
                              v                  v
                         Model Registry    A/B Test Router
                         (versioned)       (shadow scoring)
```

**5. Monitoring Requirements:**
- Precision/recall on default prediction (target: >80% precision)
- Calibration: predicted probability vs actual default rate
- Population Stability Index (PSI) for distribution drift
- Feature importance drift detection
- Bias detection across demographic groups (fair lending)

**6. Regulatory Requirements:**
- Model explainability: SHAP values or LIME for individual decisions
- Adverse action reasons (why a user got grade C)
- Bias testing across protected characteristics
- Model documentation and audit trail
- Annual model review and revalidation

---

## 6. Fee Calculation Engine

### Formula

The fee is computed by the `calculate_fee()` PostgreSQL function:

```
raw_fee = base_rate_per_day * amount * shift_days * risk_multiplier * utilization_multiplier

capped_fee = min(raw_fee, amount * 5%, GBP 10.00)
final_fee  = max(capped_fee, GBP 0.01)

implied_APR = (final_fee / amount) * (365 / shift_days) * 100%
```

### Parameters

| Parameter | Value | Notes |
|---|---|---|
| Base rate (daily) | 0.0005 | Approximately 4.9% APR annualized |
| Risk multiplier A | 1.0x | Low risk, base rate |
| Risk multiplier B | 1.5x | Medium risk |
| Risk multiplier C | 2.5x | Higher risk |
| Utilization multiplier | 1.0 + max(pool_util - 0.5, 0) * 2.0 | Increases when pool >50% utilized |
| Fee cap (%) | 5% of amount | Percentage cap |
| Fee cap (absolute) | GBP 10.00 | Hard ceiling |
| Fee floor | GBP 0.01 | Minimum charge |

### Example Calculations

| Amount | Shift Days | Grade | Pool Util | Raw Fee | Capped Fee | Implied APR |
|---|---|---|---|---|---|---|
| GBP 50 | 7 | A | 40% | GBP 0.18 | GBP 0.18 | 1.85% |
| GBP 100 | 7 | B | 50% | GBP 0.53 | GBP 0.53 | 2.74% |
| GBP 200 | 14 | B | 60% | GBP 2.52 | GBP 2.52 | 3.29% |
| GBP 100 | 7 | C | 70% | GBP 2.10 | GBP 2.10 | 10.95% |
| GBP 500 | 14 | A | 50% | GBP 3.50 | GBP 3.50 | 1.82% |
| GBP 500 | 14 | C | 90% | GBP 31.50 | GBP 10.00 | 5.21% |

### Utilization Multiplier Curve

```
Multiplier
  3.0 |                                        *
      |                                    *
  2.0 |                                *
      |                           *
  1.0 |  * * * * * * * * * * *
      |
  0.0 +----+----+----+----+----+----+----+---
      0   10   20   30   40   50   60   80  100
                Pool Utilization (%)

  Below 50%: multiplier = 1.0 (no surcharge)
  Above 50%: multiplier increases linearly
  At 100%:   multiplier = 2.0
```

---

## 7. Security Architecture

### Authentication

```
+------------------+     +------------------+     +------------------+
|  Client          |     |  Supabase Auth   |     |  PostgreSQL      |
|                  |     |  (GoTrue)        |     |                  |
|  supabase.auth.  |---->|  JWT issued      |---->|  auth.uid()      |
|  signUp/signIn   |     |  with user.id    |     |  available in    |
|                  |     |  as sub claim     |     |  RLS policies    |
+------------------+     +------------------+     +------------------+
```

### Row Level Security (RLS)

All 18 tables have RLS enabled. Key policies:

| Table | Policy | Rule |
|---|---|---|
| profiles | Own data only | `auth.uid() = id` |
| bank_connections | Own data only | `auth.uid() = user_id` |
| accounts | Own data only | `auth.uid() = user_id` |
| transactions | Own data only | `auth.uid() = user_id` |
| obligations | Own data only | `auth.uid() = user_id` |
| forecasts | Own data only | `auth.uid() = user_id` |
| trades (borrower) | Own trades | `auth.uid() = borrower_id` |
| trades (lender) | Via allocation | `EXISTS (allocation WHERE lender_id = auth.uid())` |
| trades (bubble board) | Public pending | `status = 'PENDING_MATCH' AND auth.uid() IS NOT NULL` |
| allocations | Own allocations | `auth.uid() = lender_id` |
| lending_pots | Own pot | `auth.uid() = user_id` |
| pool_ledger | Own entries | `auth.uid() = user_id` |
| agent_proposals | Own proposals | `auth.uid() = user_id` |
| flowzo_events | All authenticated | `true` (read-only) |
| payment_orders | Via trade ownership | JOIN through trades + allocations |

### Service Role Access

Edge Functions use the `service_role` key to bypass RLS for system operations:

```
+------------------+     +------------------+
| Edge Function    |     |  PostgreSQL      |
| (Deno runtime)   |     |                  |
|                  |     |  RLS bypassed    |
| createClient(    |---->|  Full table      |
|   SUPABASE_URL,  |     |  access for      |
|   SERVICE_ROLE   |     |  system ops      |
| )                |     |                  |
+------------------+     +------------------+
```

### CRON Endpoint Protection

```
GET /api/cron/forecast     ---> Authorization: Bearer {CRON_SECRET}
GET /api/cron/settlement   ---> Authorization: Bearer {CRON_SECRET}
```

Vercel CRON jobs are configured to call these endpoints with the `CRON_SECRET` environment variable as a bearer token.

### TrueLayer Token Security

- OAuth tokens stored as JSONB in `bank_connections.truelayer_token`
- Contains `access_token`, `refresh_token`, `expires_at`
- Auto-refresh on 401 (sync-banking-data handles token rotation)
- CSRF protection via random state parameter stored in user metadata

### Middleware

- Session refresh on every request via Next.js middleware
- Handles missing/expired Supabase sessions gracefully
- Redirects unauthenticated users from protected routes

---

## 8. What's Needed for Production

### 8.1 Infrastructure

| Item | Priority | Description |
|---|---|---|
| CI/CD pipeline | P0 | GitHub Actions: lint, type-check, test, build, deploy to Vercel |
| Staging environment | P0 | Separate Supabase project + Vercel preview deployments |
| Error monitoring | P0 | Sentry for frontend + Edge Functions error tracking |
| Structured logging | P1 | JSON logs with correlation IDs across the pipeline |
| Observability | P1 | OpenTelemetry traces for Edge Function pipeline (sync -> forecast -> proposals) |
| Rate limiting | P1 | On API routes: /api/pipeline/run, /api/payments/topup, /api/claude/explain |
| Health checks | P1 | Uptime monitoring for Supabase, TrueLayer, and Vercel endpoints |
| Secrets rotation | P2 | Automated rotation for CRON_SECRET, service_role key, TrueLayer credentials |

### 8.2 Payments (Currently Stubbed)

The current MVP uses mock payment processing. Production requires:

```
+-------------------+     +-------------------+     +-------------------+
|  Lender Funding   |     |  Escrow Account   |     |  Borrower Payout  |
|                   |     |                   |     |                   |
|  Stripe Connect   |---->|  Ring-fenced pool |---->|  TrueLayer PIS    |
|  or GoCardless    |     |  (FCA segregated  |     |  (Open Banking    |
|  Direct Debit     |     |  client money)    |     |  Payment          |
|                   |     |                   |     |  Initiation)      |
+-------------------+     +-------------------+     +-------------------+
                                    |
                                    v
                          +-------------------+
                          |  Reconciliation   |
                          |  Engine           |
                          |                   |
                          |  Match pool_ledger|
                          |  entries against  |
                          |  bank statements  |
                          |  Daily T+1 recon  |
                          +-------------------+
```

| Item | Priority | Description |
|---|---|---|
| Stripe Connect | P0 | Lender payouts and funding via connected accounts |
| GoCardless Direct Debit | P0 | Automated repayment collection from borrowers |
| TrueLayer PIS | P1 | Open Banking payment initiation for instant funding |
| Escrow account | P0 | FCA-compliant segregated client money account |
| Reconciliation engine | P0 | Daily T+1 matching of ledger entries against bank statements |
| Webhook processing | P1 | Replace stub `/api/webhooks/supabase` with real payment event handling |
| Retry/dead-letter queue | P1 | Failed payment retries with exponential backoff |

### 8.3 ML Risk Scoring

| Item | Priority | Description |
|---|---|---|
| Feature store | P1 | Historical transaction features (offline: batch, online: real-time lookup) |
| Model training pipeline | P1 | Python + scikit-learn/XGBoost, scheduled retraining (weekly) |
| Real-time inference API | P1 | <100ms scoring endpoint, deployed as Edge Function or separate service |
| Model versioning | P2 | MLflow or similar for experiment tracking and model registry |
| A/B testing framework | P2 | Shadow scoring: run new model alongside v1, compare predictions |
| Monitoring dashboard | P1 | Precision, recall, calibration, PSI, feature drift |
| Bias detection | P0 | Fair lending compliance: test across age, gender, ethnicity, postcode |

### 8.4 Compliance & Regulatory

| Item | Priority | Description |
|---|---|---|
| FCA authorization | P0 | Consumer credit license (Article 36H or full authorization) |
| KYC/AML integration | P0 | Onfido or Jumio for identity verification and sanctions screening |
| Strong Customer Auth (SCA) | P0 | PSD2-compliant SCA for payment initiation |
| GDPR compliance | P0 | Right to erasure, data portability, consent management, DPO |
| Credit agreement docs | P0 | Pre-contractual information, APR disclosure, cooling-off period |
| Interest rate disclosure | P0 | Representative APR calculation, total cost of credit |
| Complaint handling | P1 | FOS-compliant process, 8-week resolution SLA |
| Financial promotions | P1 | FCA-compliant marketing materials, risk warnings |
| Annual regulatory reporting | P1 | FCA returns, complaints data, default statistics |

### 8.5 Scalability

| Item | Priority | Description |
|---|---|---|
| Connection pooling | P1 | PgBouncer via Supabase (already available, needs tuning) |
| Read replicas | P2 | Separate analytics queries from transactional workload |
| Edge caching | P2 | Cache pool_summary, trade_analytics, risk_distribution views |
| Job queue | P0 | Replace fire-and-forget pipeline with proper queue (e.g., Inngest, Trigger.dev) |
| Horizontal scaling | P2 | Edge Functions auto-scale, but need concurrency controls for matching |
| Database partitioning | P2 | Partition transactions table by user_id or booked_at date range |
| CDN optimization | P2 | Static asset caching, image optimization for marketing pages |

**Job queue is critical:** The current pipeline is fire-and-forget from the TrueLayer callback:

```
// Current: fire-and-forget (unreliable)
fetch(`${origin}/api/pipeline/run`, { ... }).catch(console.error);

// Production: proper job queue
await jobQueue.enqueue('pipeline.run', { user_id, connection_id }, {
  retries: 3,
  backoff: 'exponential',
  timeout: '120s',
});
```

### 8.6 Testing

| Layer | Tool | Coverage Target | Current State |
|---|---|---|---|
| Unit tests | Vitest | Risk scoring, fee calculation, obligation detection, currency utils | Not yet implemented |
| Integration tests | Vitest + Supabase local | Edge Function pipeline end-to-end | Not yet implemented |
| E2E tests | Playwright | Critical user journeys: onboarding, trade creation, lender funding | Not yet implemented |
| Load tests | K6 | Concurrent trade matching, pool contention scenarios | Not yet implemented |
| Contract tests | Pact / manual | TrueLayer API schema validation | Not yet implemented |
| Visual regression | Playwright screenshots | Component library visual consistency | Not yet implemented |

**Priority test cases:**

1. `calculate_fee()` edge cases: zero amount, max shift days, high utilization
2. `calculate_risk_grade()` boundary conditions: scores at 39, 40, 69, 70
3. `update_lending_pot()` concurrency: two reserves racing for the same funds
4. Obligation detection: merchant name normalization, frequency edge cases
5. Trade state machine: invalid transitions should be rejected
6. Settlement CRON: grace period boundary, partial repayment handling

---

## 9. Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15, React 19, TypeScript strict | App shell, SSR, server components, App Router |
| Styling | Tailwind CSS v4, shadcn/ui | Design system, Monzo-inspired UI |
| State | React hooks, Supabase Realtime | Client state + live updates on trades, pots, proposals |
| Auth | Supabase Auth (GoTrue) | Email/password, JWT sessions, OAuth flow |
| Database | Supabase PostgreSQL | 18 tables, RLS, RPC functions, triggers, views |
| Edge Functions | Deno (Supabase Edge Functions) | Data pipeline, matching, settlement, AI explanations |
| Open Banking | TrueLayer (sandbox) | Account data, balances, transactions (90-day window) |
| AI | Claude API (Anthropic, Haiku 3.5) | Natural-language proposal explanations |
| Payments | Stripe / GoCardless / PIS (stubbed) | Funding, repayment, payment initiation |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) | Hosting, Edge Functions, database |
| Monorepo | pnpm workspaces + Turborepo | Build orchestration, shared packages |
| Shared Package | @flowzo/shared | TypeScript types, constants (fees, risk tiers), utilities |

### Design System

| Token | Value | Usage |
|---|---|---|
| Primary color | `#FF5A5F` (hot coral) | CTAs, active states, brand accent |
| Navigation | `#1B1B3A` (dark navy) | Sidebar, header, nav elements |
| Background | `#FAFAFA` (off-white) | Page backgrounds |
| Cards | White, `border-radius: 16px` | Content containers |
| Buttons | Pill style, `border-radius: 9999px` | All interactive buttons |
| Font | Inter | All text |

---

## 10. API Route Map

### Auth Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/callback` | Public | Supabase Auth callback -- exchanges code for session |
| GET | `/login` | Public | Login page |
| GET | `/signup` | Public | Signup page |

### App Pages (Protected)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/borrower` | User | Borrower dashboard: calendar heatmap, danger days, proposals |
| GET | `/borrower/trades/[tradeId]` | User | Trade detail: amount, dates, fee, status, allocations |
| GET | `/lender` | User | Lender dashboard: pot balance, preferences, bubble board |
| GET | `/onboarding` | User | Onboarding: role selection, bank connection |
| GET | `/onboarding/callback` | User | TrueLayer OAuth return page |
| GET | `/settings` | User | User settings |
| GET | `/data` | User | Data explorer / analytics dashboard |

### API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/truelayer/auth` | User session | Initiates TrueLayer OAuth flow, redirects to consent screen |
| GET | `/api/truelayer/callback` | User session | Handles TrueLayer OAuth callback, stores tokens, triggers pipeline |
| POST | `/api/pipeline/run` | Internal | Orchestrates 3-step pipeline: sync -> forecast -> proposals |
| POST | `/api/trades/[tradeId]/bid` | User session | Submit trade bid: sets fee, transitions DRAFT -> PENDING_MATCH |
| POST | `/api/payments/topup` | User session | Top up lending pot via atomic RPC (amount_pence in body) |
| POST | `/api/claude/explain` | Public | Generate AI explanation for a proposal (billName, dates, amounts) |
| GET | `/api/cron/forecast` | CRON_SECRET | Batch-run forecasts for all users with active bank connections |
| GET | `/api/cron/settlement` | CRON_SECRET | Run settlement: disburse matched trades, repay/default live trades |
| POST | `/api/webhooks/supabase` | Public | Supabase webhook handler (stub -- logs events only) |

### Supabase Edge Functions

| Function | Invocation | Auth | Description |
|---|---|---|---|
| `sync-banking-data` | `supabase.functions.invoke()` | service_role | Sync TrueLayer accounts, transactions, detect recurring obligations |
| `run-forecast` | `supabase.functions.invoke()` | service_role | Generate 30-day cash flow forecast with danger days |
| `generate-proposals` | `supabase.functions.invoke()` | service_role | Create SHIFT_BILL proposals for at-risk obligations |
| `match-trade` | `supabase.functions.invoke()` | service_role | Score lenders, allocate funds, transition to MATCHED |
| `settle-trade` | `supabase.functions.invoke()` | service_role | 3-phase settlement: disburse, repay, default |
| `explain-proposal` | `supabase.functions.invoke()` | service_role | Call Claude API to generate natural-language explanation |

### Supabase RPC Functions

| Function | Purpose | Security |
|---|---|---|
| `update_lending_pot()` | Atomic pool mutations with double-entry ledger | `SECURITY DEFINER` |
| `calculate_risk_grade()` | Compute risk score and grade from 5 input features | `IMMUTABLE` |
| `calculate_fee()` | Compute fee with risk/utilization multipliers and caps | `IMMUTABLE` |
| `get_pool_utilization()` | Current pool utilization ratio (locked / total) | `STABLE` |
| `handle_new_user()` | Trigger: create profile on auth.users insert | `SECURITY DEFINER` |
| `record_trade_transition()` | Trigger: log state transitions, set timestamps | `SECURITY DEFINER` |

### Marketing Pages

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Landing page |
| GET | `/pitch` | Public | Hackathon pitch deck |
| GET | `/terms` | Public | Terms of service |
| GET | `/privacy` | Public | Privacy policy |
| GET | `/fca-disclaimer` | Public | FCA regulatory disclaimer |

---

## Appendix: Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `TRUELAYER_CLIENT_ID` | Yes | TrueLayer OAuth client ID |
| `TRUELAYER_CLIENT_SECRET` | Yes | TrueLayer OAuth client secret |
| `TRUELAYER_ENV` | No | `sandbox` (default) or `production` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for proposal explanations |
| `CRON_SECRET` | Yes | Bearer token for CRON endpoint authentication |
| `QUANT_API_URL` | No | Optional ML scoring API URL (graceful degradation) |
