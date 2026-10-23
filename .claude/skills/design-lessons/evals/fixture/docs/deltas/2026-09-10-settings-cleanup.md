# Settings Cleanup
Branch feat/settings · 1111111 (8 Sep) → 3c4d5e6 (10 Sep) · Page: https://claude.ai/artifact/EXAMPLE-SETTINGS
After: 3c4d5e6
Review: reviewed 11 Sep (Final)
3 Changes: 0 New, 3 Fix · 0 Skipped

## c1 · Toolbar · Fix
Surface: Settings, toolbar
Decision: The four toolbar icons carry short labels under them.
Why: Testers could not tell the archive and delete icons apart. (Note)
Before → After: four bare icons → icons with labels Archive, Delete, Share, Edit.
Repeat: Label every icon-only button. (commit 3c4d5e6)
Avoid: —
Rule candidate: `rule/icon-buttons-have-labels`: every icon-only button has a visible label or a tooltip naming its action. Pending.
Evidence: 3c4d5e6 label toolbar icons · src/settings/Toolbar.tsx · Page: c1

## c2 · Empty list · Fix
Surface: Settings, connected apps list
Decision: The empty list says what to connect first and offers the button to do it.
Why: —
Before → After: "No apps" → "Connect your calendar to start" with a Connect button.
Repeat: An empty state names the next step and offers it. (commit 1a2b3c4)
Avoid: —
Rule candidate: `rule/empty-states-next-step`: an empty state names the next step and offers the control for it. Pending.
Evidence: 1a2b3c4 empty states with a next step · src/components/EmptyState.tsx · Page: c2

## c3 · Delete account · Fix
Surface: Settings, danger zone
Decision: The delete button names what it deletes and the dialog repeats the account name.
Why: —
Before → After: "Delete" → "Delete account ada@acme.dev"; the dialog shows the account name.
Repeat: —
Avoid: A destructive button that does not say what it destroys. (Note)
Rule candidate: `rule/destructive-actions-name-object`: a destructive action's label names the thing it destroys. Pending.
Evidence: 2b3c4d5 danger zone copy · src/settings/DangerZone.tsx · Page: c3

## Skipped
- none
