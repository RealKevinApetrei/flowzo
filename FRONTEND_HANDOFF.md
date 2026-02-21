# Frontend Handoff — What Backend/Pipeline Needs to Provide

This document describes what the frontend now expects from the backend. Each section maps a frontend feature to the API/data contract it relies on.

---

## For Member A (Pipeline & Integrations)

### 1. Auth-Aware Landing Page
The landing page (`/`) now checks `supabase.auth.getUser()` server-side. No backend work needed — just ensure Supabase Auth is configured with the correct redirect URLs.

### 2. Toast Notifications
Toasts fire on the **client** after server action calls. The following actions must return cleanly (no silent failures):

| Action | File | What frontend expects |
|---|---|---|
| `createTrade(formData)` | `lib/actions/trades.ts` | Returns `{ id: string }` on success, throws on failure |
| `submitTrade(tradeId)` | `lib/actions/trades.ts` | Resolves on success, throws on failure |
| `toggleAutoMatch(enabled)` | `lib/actions/lending.ts` | Resolves on success, throws on failure |
| `fundTrade(tradeId)` | `lib/actions/lending.ts` | Resolves on success, throws on failure |

**Key:** If these actions fail silently (return without throwing), the toast won't show the error state. Ensure they `throw` on failure.

### 3. Onboarding Stepper
The onboarding page reads:
- `bank_connections` table: `SELECT id, provider, status WHERE user_id = ? AND status = 'active'`
- Query params: `?success=true` or `?error=<code>` from TrueLayer callback

**Ensure:** The TrueLayer callback redirect includes these query params correctly. The stepper progress is derived from `hasConnection` (boolean) and `success` param.

### 4. Supabase Realtime (for bubble board)
The `useBubbleBoard` hook subscribes to Realtime changes on the `trades` table. **Ensure:**
- Realtime is enabled on the `trades` table in Supabase Dashboard
- RLS allows `SELECT` on trades with `status = 'PENDING_MATCH'` for all authenticated users (lenders need to see available trades)

### 5. Seed Data for Demo
The frontend renders empty states gracefully, but the demo needs rich data. Seed data should include:
- At least 3-5 `forecasts` rows per demo user (with mix of safe/warning/danger days)
- At least 2-3 `agent_proposals` with status `PENDING` and realistic payloads:
  ```json
  {
    "obligation_name": "Netflix",
    "original_date": "2026-02-25",
    "shifted_date": "2026-03-02",
    "amount_pence": 1599,
    "fee_pence": 120,
    "shift_days": 5
  }
  ```
- At least 3-5 `trades` with status `PENDING_MATCH` for the bubble board
- A `lending_pots` entry for the demo lender
- A `profiles` entry with `display_name` set

---

## For Member B (Data Science & Analytics)

### 6. Data Pages
The data pages (`/data/*`) are Member B's responsibility. The frontend provides:
- Design system: use `card-monzo` class for cards, Tailwind colors (`text-coral`, `bg-navy`, etc.)
- Dark mode: all CSS variables now support `.dark` class. Use `var(--card-surface)` for card backgrounds instead of `bg-white`
- Toast system: `import { toast } from "sonner"` is available project-wide

### 7. New Component Patterns
If building data viz components, follow these patterns:
- Use `"use client"` directive for interactive components
- Use `bg-[var(--card-surface)]` instead of hardcoded `bg-white` (dark mode compat)
- Use `active:scale-95` on buttons for press feedback
- Import `Button` from `@/components/ui/button` for consistent styling

---

## For Member D (Infrastructure & Pitch)

### 8. Build Verification
The build passes with zero TypeScript errors. New dependencies added:
- `sonner` (toast notifications) — add to CI if not already

### 9. Sonner Toaster Configuration
The `<Toaster>` is mounted in the root layout (`layout.tsx`). Position: `top-center`, pill-shaped toasts. No additional setup needed for new pages.

### 10. Dark Mode for Demo
Dark mode is togglable from Settings > Appearance (Light / System / Dark). For the demo script:
- Default follows system preference
- Can be toggled live during demo for dramatic effect
- Theme persists in `localStorage` under key `flowzo-theme`

### 11. Environment Variables
No new env vars were added. All frontend changes are UI-only.

---

## File Change Summary

| File | Change |
|---|---|
| `apps/web/src/app/page.tsx` | Auth-aware header, stats section, polished copy |
| `apps/web/src/app/layout.tsx` | ThemeProvider + Toaster wrapping |
| `apps/web/src/app/globals.css` | Dark mode vars, card animations, mobile touch |
| `apps/web/src/app/not-found.tsx` | **NEW** — Global 404 page |
| `apps/web/src/app/(app)/loading.tsx` | **NEW** — App skeleton loader |
| `apps/web/src/app/(app)/error.tsx` | **NEW** — App error boundary |
| `apps/web/src/app/(auth)/loading.tsx` | **NEW** — Auth skeleton loader |
| `apps/web/src/app/(marketing)/loading.tsx` | **NEW** — Marketing skeleton loader |
| `apps/web/src/app/(app)/onboarding/page.tsx` | 3-step stepper, success animation |
| `apps/web/src/app/(app)/onboarding/callback/page.tsx` | Toast on success/error |
| `apps/web/src/components/providers/theme-provider.tsx` | **NEW** — Theme context + provider |
| `apps/web/src/components/settings/settings-client.tsx` | Theme toggle, notification toggles, toasts |
| `apps/web/src/components/borrower/suggestion-feed.tsx` | Toasts on accept/dismiss, dark mode bg |
| `apps/web/src/components/borrower/suggestion-card.tsx` | Dark mode bg |
| `apps/web/src/components/borrower/calendar-heatmap.tsx` | Dark mode bg |
| `apps/web/src/components/lender/lender-page-client.tsx` | Toasts on fund/auto-match |
| `apps/web/src/components/lender/trade-detail-modal.tsx` | Dark mode bg |
| `apps/web/src/components/ui/button.tsx` | active:scale-95 press feedback |
| `apps/web/package.json` | Added `sonner` dependency |
