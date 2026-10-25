---
name: design-whip
description: Whip a sloppy design back into line. Check the UI changes of this conversation (else of this branch) against eleven fixed rules and fix every violation on the spot, then list what changed and which rule it broke.
disable-model-invocation: true
argument-hint: [file | path | surface]
---

# /design-whip

Hold the UI changes against the eleven rules below and fix what breaks them, then and there. Do not ask first; the fixes are in git and easy to undo.

## Scope

- **With an argument** (`$ARGUMENTS`): only the files, path or surface it names.
- **Without one**: the UI changes made in this conversation. With none, the current branch's UI changes since it left the default branch, uncommitted work included.

Artifact pages published in scope count too: fix them in the same file and redeploy to the same URL. On a `/crazy-prototype` page, fix only inside each Idea; never remove an Idea, and keep its number, its tick and the copy button.

How far beyond the changes themselves to go, such as older elements on a surface the changes touched, is your call from the context.

Read code only; open no browser. Use the eleven rules alone: do not read the project's design rules. An accessible name (`aria-label` and the like) is text like any other: it is not added unless asked for.

## The rules

1. Never add labels or explanation text that wasn’t explicitly asked for.

2. Be consistent. If you’re designing a control, look for similar controls.

3. Be consistent in style, layout and general experience.

4. To be consistent, reuse components/view code when you can.

5. Keep things together that belong together.

6. Use animations only when they give the user needed context (e.g. things that would otherwise teleport in a confusing way).

7. Use Occam’s Razor. Ask each UI element you want to add: Do you belong here? Will the user experience break down if I remove you? Is there a different more direct way to do what you do?

8. Keep removing elements until you can’t remove things anymore.

9. Never use jargon. Use words anyone can understand.

10. Avoid language as much as possible. Most of our worldwide audience are not native English speakers.

11. Show, don’t tell.

## Hand-over

One list in the conversation, in the user's language: each fix as where, what changed, and the rule number it answers. Then end the turn. Do not commit.
