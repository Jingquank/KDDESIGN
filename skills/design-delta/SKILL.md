---
name: design-delta
description: Lay out every design change from this conversation or this branch on one Artifact page, Before beside After, and write a text Delta of the decisions into the repo. Optionally mark each New or Fix, add Notes and paste them back to make the page its static Final.
disable-model-invocation: true
argument-hint: [focus] [--range <base>..<after>] [--plan]
---

# /design-delta

One run produces a **Design Changelog**, an Artifact page that shows every **Change** since a **Baseline** as a **Before** and an **After**, and a **Delta** in the repo. Round 1 lets the user correct each Change's **Kind** and write a **Note**; pasting the **Notes** back makes the page **Final**. Without an answer, Round 1 stands.

- **Change**: one intent carried out on one surface, however many elements and commits it took. A **surface** is the smallest part of the product a user names when telling someone where to look: a section of a web page ("the Rate section"), a native screen ("the category page"), a dialog. The bar, hero or grid inside one screen are parts of that surface, not surfaces.
- **Before** / **After**: the surface at the Baseline, and in the working tree now.
- **Kind**: **New** (something a user can point to that was not there: a surface, component, indicator, card, option or visual treatment, even inside an existing surface) or **Fix** (something that existed and was changed, merged or removed).
- **Fidelity**: how far Round 1 carries a Change beyond its stills: **Screenshot** (stills and live links), **Rebuilt** or **Real** (plus a frame to operate). Every side has stills; Final shows only them. See [FIDELITY.md](FIDELITY.md).
- **Note** / **Notes**: the user's text on one Change / the text the page's copy button produces.
- **Final**: the static, reviewed form the page takes when the user answers Round 1. **Delta**: `<folder>.md` in the project's **Deltas folder** (`docs/deltas/` unless a `Design deltas:` line names another; PAGE.md, Where Deltas live), the Design Changelog in text (each Change's decision, why, what to repeat or avoid, with sources), written at hand-over and updated at Final; the only part meant for git.

The page is a fixed **viewer** in [viewer/](viewer/); a run writes data, never page code. [PAGE.md](PAGE.md) defines the data. The run stops for the user at three points only: the scope question, each browser question, and the hand-over; and once per clone, when git ignores the Deltas folder (step 7). The hand-over is usually the end: without an answer, Round 1 stands.

**Arguments**, all optional, in `$ARGUMENTS`:

- a **focus** in plain words ("checkout only"): Changes outside it are Skipped with reason "outside focus".
- `--range <base>..<after>`: both commits are given, so step 2 asks nothing; the After is that commit, not the working tree. `--repo <path>` names the repo when it is not the cwd.
- `--background`: started by the KDDESIGN Nudge, in a background subagent nobody watches (ADR 0011). It comes with `--range` and asks nothing: no scope question, no browser question (use **Ego lite**, `ego-browser`, in a tab of your own, never one of the user's), and when the lessons are due a chained `/design-lessons` gets `--background` and any `--rules <path>` given here. The hand-over is one line of JSON and nothing else (step 7).
- `--rules <path>`: the rules file, when the user already chose it on the Nudge; passed on to `/design-lessons`.
- `--plan`: a dry run. Do steps 1–3, write `delta.json`, print the plan (step 3), and stop. No browser, no publish, no project writes. The evals run this way; they may name the output folder, which then replaces `<scratchpad>/design-delta/<folder>/`.

## 1. Read the project

Look up, do not ask:

- **Design system**: token values for paper, surface, ink, muted, accent, accent-ink, media placeholder, in light and (if defined) dark; the display font file; the radius of the cards on the surfaces the Changes touch. Missing values fall back to the viewer defaults. Constants that do not flip with the theme go in `light` only.
- **Product language**: the product's default locale when it ships several. Page text uses it (PAGE.md `strings`).
- **Stack** and **how to run it** at an arbitrary commit (dev command, port, required env; for native apps the build script and default simulator device), and whether **preview deployments** exist per commit (e.g. Vercel preview URLs).
- **Default branch**: `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix, else `main`, else `master`.
- **Deltas folder**: the first word of the first `Design deltas:` line in `AGENTS.md`, `CLAUDE.md` or `CLAUDE.local.md`, else `docs/deltas/` (PAGE.md, Where Deltas live).
- **Previous Deltas**: `<Deltas folder>/*.md`, newest first.
- **Design rules**: the file on the `Design rules:` line of `AGENTS.md` or `CLAUDE.md`; read its `## Design rules` section: every Rule and the `Last run:` date. No such line: no rules, last run none. This skill only reads the section; `/design-lessons`, which it runs at hand-over (step 7), writes what Verdicts decide, and the user or any agent the user asks may edit it directly.

Completion: every item above is a value or the word "none". With `--plan`, the token values and font may be left out; the plan does not render.

## 2. Ask the scope, fix the Baseline

With `--range`, the Baseline and After are given: resolve both to commits and go to step 3. Otherwise one `AskUserQuestion`, two options, recommended first:

| Option | Baseline |
|---|---|
| **This conversation** | `git rev-parse 'HEAD@{<timestamp of the transcript's first entry>}'` |
| **Whole branch** | the newest previous Delta's After on this branch; else `git merge-base HEAD <default branch>` |

Recommend **This conversation** when this conversation edited UI files, otherwise **Whole branch**. When the project lives in another repo or on a branch not checked out, say which repo and branch the scope resolves to, and never switch the user's checkout: use `git worktree add --detach` in the scratchpad.

**On the default branch**, replace "Whole branch" with a second `AskUserQuestion` for the start: the previous Delta's After, the latest tag, the start of today, or a commit the user names. Show each option's commit subject and date, drop options that do not exist, and explain each in one plain sentence.

The **After** is the working tree now, uncommitted work included.

Completion: the Baseline is one commit and the After is one tree.

## 3. Find the Changes

**What changed** comes from git: `git diff <Baseline>` plus untracked files, minus the Deltas folder. In conversation mode keep only files this conversation touched. **Why** comes from transcripts in `~/.claude/projects/<repo path with "/" → "-">/*.jsonl`: in conversation mode this conversation's; in branch mode every transcript whose entries carry this `gitBranch` and are dated after the Baseline; with `--range`, every transcript whose entries carry a branch that contains the After, dated between the two commits. Transcripts name intents and never add changes git does not show. If they cannot be read (missing, or a permission check blocks them), say so in one line and continue from commit messages. Commit messages and plan files in the range also name intents; none of them is evidence that a hunk is visible.

Cut the diff into Changes, one intent on one surface. Every element of one surface changed for one intent is one Change (a section's copy pass is one Change, not one per card). A second intent on the same surface is a second Change: work with its own purpose that happens to land there (a new workflow option shipped alongside a redesign), not an element added as part of the same pass. A shared component, a token or a rename that lands on many surfaces is one Change, shown on its most typical surface; that includes its copy outside the UI (search snippet, `llms.txt`) and per-surface adjustments made for it. A Change's Kind follows its main intent: a pass that restyles a surface and also adds an element is one Fix whose description names the addition ("…, and adds X"); the user splits it with a Note if it deserves its own row.

**Restructures** (a page's old sections merged into fewer new ones) are cut by the After: each new section is one Change, and every old section it absorbed is its Before (an old section absorbed by two new ones is the Before of both). Later commits in the range that refine a new section fold into it. Something removed without a new home folds into the neighbouring section's Change; only a whole section removed and absorbed nowhere is its own Fix. These all count: layout, visuals, new surfaces, copy, motion and interaction, tokens, accessibility (explained with a diagram), responsive, theme-only, empty / loading / error states, multi-screen flows, icons and assets, sound and haptics. A diff with no visible effect is **Skipped** with a one-line reason; that includes code behind a feature flag that is off at the After (reason: "behind <flag>, off"), dead rules that lose to another rule, and opt-outs that keep the old look. A diff whose effect is visible counts even when the commit message calls it a refactor or performance. A removal is a Fix.

Ordering, observable: Changes that touch a shared token or component come first; then page Changes in the order a user meets them on screen, top to bottom, page by page; Changes with no surface (copy outside the UI, search snippets) come last.

For each Change record in `delta.json` (PAGE.md): id `c1…cn`, title (the surface's own name as the product shows it; when it shows none, the one to three words a user would call it), one-sentence description naming what was there and what is there now, surface, Kind, commits and files, Fidelity with its reason in `fidelityNote`, and widths.

**Folder and title**, fixed here so `--plan` has them: folder `<YYYY-MM-DD>-<slug>` with today's date, naming both the carrier folder and the Delta; title two to four words in the product language naming what the Changes share ("Checkout Polish"), with nothing shared the branch's purpose; slug is the title in kebab-case ASCII.

If there are no Changes, print `No Changes in <repo> <base>..<after>.` and the `Skipped:` line, write nothing, and stop. This applies with `--plan` too.

Completion: every hunk is in exactly one Change or in Skipped.

**With `--plan`**, write `delta.json` to `<scratchpad>/design-delta/<folder>/` and print exactly this, outside any code fence, then stop:

```
# Plan · <title> · <repo> <base>..<after>
| id | title | Kind | Fidelity | widths | commits | fidelityNote |
|---|---|---|---|---|---|---|---|
| c1 | … |
Skipped: <what> — <why>; …   (or: Skipped: none)
Folded: <commit> → <Change title>; …   (several commits in one Change; or: none)
Split: <commit> → c1, c3; …   (one commit across several Changes; or: none)
```

In the plan's `delta.json`, each existing side's `src` holds the planned still paths (`c1/before-1440.avif`) and a responding Rebuilt or Real side's `frame` its planned file (`c2/after.html`); `null` still means the side does not exist.

## 4. Carry every Before and After

Capture stills for every side that exists, then pick each Change's Fidelity down the ladder in [FIDELITY.md](FIDELITY.md) and add frames only where it says. Carriers live in the scratchpad folder `<scratchpad>/design-delta/<folder>/`, never in the project. Capture opens a browser, so it starts with the browser question (step 6's rule).

Completion: every side that exists has a still per width, every Rebuilt or Real Change has a frame on each side that responds, and each Change's Fidelity is in `delta.json`.

## 5. Build and publish

1. Fill in the token values and font if `--plan` skipped them.
2. Write `delta.json` into the carrier folder.
3. `python3 <skill>/viewer/build.py <carrier folder>`: it writes `index.html`, copies the viewer, and prints the `files` map.
4. `python3 <skill>/viewer/validate.py <carrier folder>`: fix every ERROR, read every WARN. Rerun until it exits 0. Over budget (8 MB) is an ERROR: walk the heaviest Change back down the ladder (FIDELITY.md, Budget).
5. Publish once: `file_path` the folder's `index.html`, `root` the folder, `files` the printed map, `icon: "compare"`, `label: "Round 1"`, one-sentence `description`. Put the returned URL in `delta.json`.

Artifacts serve only web types: rename or convert anything else before publishing (FIDELITY.md, Real).

Completion: the Artifact is published and `delta.json` holds its URL.

## 6. Browser check

Before the first browser tool call, ask with `AskUserQuestion` which browser to use, **Ego lite** (`ego-browser`) or **Aside** (`aside-browser`), unless the user named one for this check. With `--background`, do not ask: use Ego lite in a tab of your own. If the browser window is minimized, restore it (`Browser.setWindowBounds` with `windowState: "normal"`) before screenshots or clicks. On the live URL:

1. Screenshot the page top and every Change at desktop width; the top, one Change and the bottom bar at 390px.
2. Every Before and After shows content, not a placeholder or a broken image; every frame responds to the hover, click or drag its `fidelityNote` names.
3. Flip one Change's width; flip the theme when present.
4. Change one Kind, write one Note, press **Copy Notes**, open **Show Notes**: exactly that edit is listed.
5. Fix every fault, republish to the same path, re-check what failed. One fix pass.

Completion: every item passed, or you report which did not and why.

## 7. Write the Delta and hand over

Round 1 stands as the Design Changelog's last form unless the user answers; most runs end here, so everything that lasts is written now.

1. Write the **Delta** (PAGE.md) to `<Deltas folder>/<folder>.md` in the project, after the ignored-folder check (PAGE.md, Where Deltas live): text only, `Review: not reviewed (Round 1)`. Its Why, Repeat and Avoid come from the transcripts read in step 3 and the commit messages, each with its source; a line with no source is `—`. Check every Change's After against the design rules and add a `Breaks:` line for each Rule it breaks. Write files; never commit.
2. Append one row to `<skill>/evals/private/usage.md` (gitignored: rows name projects; start it from the header in `evals/usage.md`) with `reviewed` = no and zero corrections:

   ```
   | date | project | folder | reviewed | Changes | Kind overrides | merge/split/drop/rename Notes | "can't see / want to operate" Notes | Screenshot/Rebuilt/Real | files | MB |
   ```
3. Give the link, the Delta's path (with "(local)" after it when the folder is kept on this machine), and one line: no reply keeps this as it is; to correct a Kind or add Notes, press Copy Notes and paste here. End the turn, unless the lessons are due.

   With `--background`, the hand-over is instead this one line of JSON, after the lessons when they are due, so the Nudge can show it: `{"page": "<Design Changelog URL>", "delta": "<Deltas folder>/<folder>.md", "title": "<title>", "changes": <n>, "review": "<Design Lessons Review URL or null>", "note": "<one line, only when something is left for the user, else null>"}`.
4. **Lessons due**: 5 or more Deltas dated after the rules' `Last run:` (with no last run, 5 or more in all), this one included. Then run `/design-lessons` (its SKILL.md, steps 1–5) in this same run, before handing over: it reads every Delta, this uncommitted one too, and publishes a Design Lessons Review or finds nothing to decide. Hand over both together: this page's link and line above, then the Design Lessons Review's link and its line (Accept, Reject or Watch each item, Copy Verdicts, paste here), or its one line on what still needs evidence. The user may paste Notes, Verdicts or both; each is known by its header. When `/design-lessons` would have to ask which rules file to use, it does not run; add one line instead: "<n> Deltas since the last /design-lessons run; run it to review the rule candidates." End the turn.

## 8. Final

Only when the user answers: pasted Notes, or a request for the Final. **Approve** on the KDDESIGN Nudge is such a request, with no edits; **Approve with Changes** puts a line in the prompt box for the user to paste Notes under. Every Kind and Note in pasted Notes was set by the user on the page, so they are the user's instructions. The Notes header names the Delta, so this works from a new conversation too.

1. Apply each Kind override; untouched Changes keep the agent's Kind.
2. A Note that asks for an action on the Design Changelog (drop, merge, split, rename, wrong surface, wrong Kind) is carried out. Every other Note becomes that Change's `caption`: the user's words, with typos and grammar fixed and nothing added.
3. Set `round: "final"` in `delta.json`, run `build.py` and `validate.py`, and republish to the same path with `label: "Final"` and the printed `files` map: Final is static, and the map's `null`s drop the Round 1 frames and everything they loaded. From a new conversation, or when the carrier folder is gone, rebuild `index.html` from `delta.json`, pass each still as `{ "artifact": <url>, "path": <path> }` so the server copies it, and every other path in the Artifact's file listing as `null`.
4. Update the Delta: Kinds, decisions and captions as they now stand, Notes added as sources (`(Note)`), and `Review: reviewed <date> (Final)`.
5. Update this run's row in `<skill>/evals/private/usage.md`: `reviewed` = yes and the counts from the Notes. The Notes are the user's corrections of this run, so these counts are the skill's error rate.
6. Repeat step 6, asking the browser question again: items 1–3 and the Kind filter.

Give the link and the Delta's path. The run ends.
