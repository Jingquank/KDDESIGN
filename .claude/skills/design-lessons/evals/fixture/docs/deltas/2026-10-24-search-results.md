# Search Results
Branch feat/search · 4d5e6f7 (14 Oct) → 9f8e7d6 (24 Oct) · Page: https://claude.ai/artifact/EXAMPLE-SEARCH
After: 9f8e7d6
Review: not reviewed (Round 1)
3 Changes: 1 New, 2 Fix · 0 Skipped

## c1 · Result row · Fix
Surface: Search results, each row
Decision: Each row shows pin, share and hide icons on hover.
Why: —
Before → After: a three-dot menu → three bare icons on hover.
Repeat: —
Avoid: —
Breaks: `rule/icon-buttons-have-labels`: the pin, share and hide icons have no labels or tooltips. (commit 8e9f0a1)
Evidence: 8e9f0a1 row actions on hover · src/search/ResultRow.tsx · Page: c1

## c2 · Filters · Fix
Surface: Search results, filters
Decision: Filters open in a side sheet instead of a modal.
Why: —
Before → After: a centred modal with the filters → a side sheet that keeps the results visible.
Repeat: Filters that keep the results in view. (commit 9f8e7d6)
Avoid: —
Rule candidate: `rule/no-modals`: no feature uses a centred modal; use a sheet or an inline panel. Pending.
Evidence: 9f8e7d6 filters in a side sheet · src/search/Filters.tsx · Page: c2

## c3 · No results · New
Surface: Search results, empty
Decision: No results shows the next step: clear filters or search everything.
Why: —
Before → After: nothing → "No results in Docs. Clear filters or search everything." with both buttons.
Repeat: An empty state names the next step and offers it. (commit 1a2b3c4)
Avoid: —
Rule candidate: `rule/empty-states-next-step`: an empty state names the next step and offers the control for it. Pending.
Evidence: 1a2b3c4 empty states with a next step (shared component) · src/components/EmptyState.tsx · Page: c3

## Skipped
- none
