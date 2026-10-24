# Checkout Polish
Branch feat/checkout · 3c4d5e6 (20 Sep) → 7a8b9c0 (28 Sep) · Page: https://claude.ai/artifact/EXAMPLE-CHECKOUT
After: 7a8b9c0
Review: not reviewed (Round 1)
1 Change: 0 New, 1 Fix · 1 Skipped

## c1 · Pay step · Fix
Surface: Checkout, step 3
Decision: The pay button is full width and sits under the order total.
Why: The pay button got lost next to the coupon field. (conversation 27 Sep · 5e6f7a8b)
Before → After: a 160px pay button sharing a row with the coupon field → a full-width pay button under the total.
Repeat: —
Avoid: A primary action sharing a row with a secondary input. (conversation 27 Sep · 5e6f7a8b)
Rule candidate: `rule/primary-action-own-row`: a step's primary action sits on its own row, under the content it acts on. Pending.
Evidence: 7a8b9c0 full-width pay button · src/checkout/PayStep.tsx · Page: c1

## Skipped
- 6b7c8d9 · src/checkout/api.ts: Request retries; nothing visible changes.
