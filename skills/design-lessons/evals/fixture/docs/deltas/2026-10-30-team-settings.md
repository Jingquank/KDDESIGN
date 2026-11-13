# Team Settings
Branch feat/team · 7a8b9c0 (27 Oct) → 2b3c4d5 (30 Oct) · Page: https://claude.ai/artifact/EXAMPLE-TEAM
After: 2b3c4d5
1 Change: 1 New, 0 Fix · 0 Skipped

## c1 · Member role · New
Surface: Team settings, each member row
Decision: Each member row has a role select: Owner, Editor or Viewer.
Why: —
Before → After: a role shown as text → a role select at the end of each row.
Repeat: —
Avoid: —
Twin: src/components/Select.tsx (12 uses) · differs: src/team/RoleSelect.tsx (1 use) has its own markup, radius 12 → 8 in Select, height 40 → 36 in Select (twin 6c7d8e9)
Rule candidate: `rule/twin-select`: every select is built from src/components/Select.tsx. Pending.
Evidence: 6c7d8e9 role select on member rows · src/team/RoleSelect.tsx · src/team/MemberRow.tsx · Page: c1

## Skipped
- none
