# Design

## Design rules

Written by /design-lessons from the Deltas in docs/deltas/; change them through a Design Lessons Review. Last run: 2026-09-20.

### rule/icon-buttons-have-labels
Rule: Every icon-only button has a visible text label or a tooltip that names its action.
Scope: Toolbars and list rows across the app.
Why: Testers could not tell the archive and delete icons apart. (Note)
Exceptions: The close button of a dialog.
Bad: A row of four bare icons in the settings toolbar.
Good: Icons with short labels under them: Archive, Delete, Share, Edit.
Sources: docs/deltas/2026-09-10-settings-cleanup.md c1 (Note) · docs/deltas/2026-09-10-settings-cleanup.md c1 (commit 3c4d5e6)
Accepted: 2026-09-20

### Watching

### Rejected
- rule/no-modals · 2026-09-20 · Modals are fine for confirming a destructive action.
