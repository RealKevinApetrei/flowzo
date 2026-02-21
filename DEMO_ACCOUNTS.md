# Flowzo Demo Accounts

All accounts use the same password: **`flowzo123`**

| Account | Email | Role | Risk Grade | What to test |
|---------|-------|------|------------|-------------|
| Alex Chen | `alex@flowzo.demo` | Borrower | C | Danger days, AI proposals, pending trades |
| Sam Rivera | `sam@flowzo.demo` | Borrower | B | Moderate cash flow, live trade, repaid history |
| Jordan Wells | `jordan@flowzo.demo` | Lender | A | Lending pot, bubble board, yield stats |
| Taylor Kim | `taylor@flowzo.demo` | Both | A | Dual role switching, matched trade |

## Quick test flows

### Borrower flow (log in as Alex)
1. Dashboard shows 3 danger days (Feb 25-27) on the calendar heatmap
2. SuggestionFeed shows 3 pending AI proposals to shift bills
3. Accept a proposal to create a trade

### Lender flow (log in as Jordan)
1. Lending pot shows ~£407 available, £148 locked
2. Bubble board shows 2 PENDING_MATCH trades (Alex's electricity + Netflix)
3. Click a bubble to fund a trade
4. Yield stats show £0.12 earned from 1 repaid trade

### Full loop
1. Alex accepts a proposal (creates PENDING_MATCH trade)
2. Jordan sees it on the bubble board and funds it
3. Trade moves to MATCHED then LIVE
