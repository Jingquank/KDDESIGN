---
name: design-whip
description: Whip a sloppy design back into line. Check the UI changes of this conversation (else of this branch) against nine fixed rules and fix every violation on the spot, then list what changed and which rule it broke.
disable-model-invocation: true
argument-hint: [file | path | surface]
---

# /design-whip

Hold the UI changes against the nine rules below and fix what breaks them, then and there. Do not ask first: the run keeps a snapshot, so every fix can be undone without touching the user's own work.

## Scope

- **With an argument** (`$ARGUMENTS`): only the files, path or surface it names.
- **Without one**: the UI changes made in this conversation. With none, the current branch's UI changes since it left the default branch, uncommitted work included.

Artifact pages published in scope count too: fix them in the same file and redeploy to the same URL. On a `/crazy-prototype` page, fix only inside each Idea; never remove an Idea, and keep its number, its tick and the copy button.

Fix only the elements the changes added or changed. A violation in an older element on a surface the changes touched goes into the hand-over as a finding, unfixed.

Read code only; open no browser. Use the nine rules alone: do not read the project's design rules. An accessible name (`aria-label` and the like) is text like any other: it is not added unless asked for.

## Snapshot

Fixes land in files that may hold the user's uncommitted work, where a plain `git restore` would throw that work away too. So before the first fix, run `git stash create` in the repo: it records the working tree without changing it and prints a hash (nothing when the tree is clean, and then the snapshot is `HEAD`). It does not cover untracked files: copy each untracked file you will edit to `<scratchpad>/design-whip/` first.

## The rules

1. Never add labels or explanation text that wasn’t explicitly asked for. Every extra line is something the user reads before they can act. Bad: "Type to search" under a search box. Good: the search box alone.

2. Be consistent in style, layout and general experience. If you’re designing a control, look for similar controls, and reuse their components/view code when you can. What the user learned on one control should already work on the next. Bad: a hand-rolled dropdown beside the app's own Select. Good: the app's own Select.

3. Keep things together that belong together. Users read nearness as belonging. Bad: a form's Save button at the bottom of the page, far below its fields. Good: Save right under the fields it saves.

4. Use animations only when they give the user needed context (e.g. things that would otherwise teleport in a confusing way). Bad: cards fading in on page load. Good: the rows below a deleted row sliding up, so they do not jump.

5. Use Occam’s Razor. Ask each UI element you want to add: Do you belong here? Will the user experience break down if I remove you? Is there a different more direct way to do what you do? Keep removing elements until removing one more would stop the user from doing something they need. Every element takes attention from the ones that matter. Bad: a Close button and a Cancel button that do the same thing. Good: one of them.

6. Never use jargon. Use words anyone can understand. Bad: "Sync failed: 409 conflict". Good: "Someone else changed this. Reload to see it."

7. Avoid language as much as possible. Most of our worldwide audience are not native English speakers. Bad: "Click here to choose a file to upload". Good: a drop zone with an upload icon.

8. Show, don’t tell. Seeing a thing happen is understood faster than reading about it. Bad: "Your changes are saved automatically." Good: a tick that appears after each edit.

9. Align the text, not the box. When chips and rows have a tinted background, let the background hang outside the column so the text lines up with everything else. Check it in the code: the text's left edge (the container's left edge plus its left padding) equals the left edge of the column's other text, with the tint pulled outward by a negative margin of the same size. Bad: a tinted chip whose box sits on the column edge, so its label starts 8px in. Good: the tint hangs 8px outside the column and the label sits on the edge.

## Hand-over

One list in the conversation, in the user's language: each fix as where, what changed, and the rule number it answers; then the findings left unfixed, with their rule numbers. End with the undo: `git restore --source <hash> -- <files>` (`git restore -- <files>` when the snapshot is `HEAD`), and the copies for untracked files. Then end the turn. Do not commit.
