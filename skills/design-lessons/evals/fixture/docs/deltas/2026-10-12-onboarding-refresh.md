# Onboarding Refresh
Branch feat/onboarding · 7a8b9c0 (1 Oct) → 4d5e6f7 (12 Oct) · Page: https://claude.ai/artifact/EXAMPLE-ONBOARDING
After: 4d5e6f7
Review: not reviewed (Round 1)
2 Changes: 0 New, 2 Fix · 0 Skipped

## c1 · Profile step · Fix
Surface: Onboarding, profile step
Decision: Continue moves to its own row under the form.
Why: —
Before → After: Continue beside the "Skip for now" link → full-width Continue under the form, Skip below it.
Repeat: —
Avoid: Continue and Skip side by side; people pressed Skip by mistake. (commit 4d5e6f7)
Rule candidate: `rule/primary-action-own-row`: a step's primary action sits on its own row, under the content it acts on. Pending.
Evidence: 4d5e6f7 continue on its own row · src/onboarding/ProfileStep.tsx · Page: c1

## c2 · Step header · Fix
Surface: Onboarding, every step
Decision: The step header gains a back arrow and a close icon.
Why: —
Before → After: title only → back arrow, title, close icon.
Repeat: —
Avoid: —
Breaks: `rule/icon-buttons-have-labels`: the back arrow has no label or tooltip. (commit 5f6a7b8)
Evidence: 5f6a7b8 step header controls · src/onboarding/StepHeader.tsx · Page: c2

## Skipped
- none
