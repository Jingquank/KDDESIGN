---
name: design-delta
description: Lay out every design change from this conversation or this branch on one Artifact page, Before beside After. Mark each New or Fix, add Notes, paste them back, and the page becomes its shareable Final plus a text Record in the repo.
disable-model-invocation: true
argument-hint: [focus] [--range <base>..<after>] [--plan]
---

# /design-delta

One run produces one **DesignDelta**: an Artifact page that shows every **Change** since a **Baseline** as a **Before** and an **After**, and, at Final, a **Record** in the repo. Round 1 lets the user correct each Change's **Kind** and write a **Note**; pasting the **Notes** back makes the page **Final**.

- **Change**: one intent carried out on one surface, however many elements and commits it took. A **surface** is the smallest part of the product a user names when telling someone where to look: a section of a web page ("the Rate section"), a native screen ("the category page"), a dialog. The bar, hero or grid inside one screen are parts of that surface, not surfaces.
- **Before** / **After**: the surface at the Baseline, and in the working tree now.
- **Kind**: **New** (something a user can point to that was not there: a surface, component, indicator, card, option or visual treatment, even inside an existing surface) or **Fix** (something that existed and was changed, merged or removed).
- **Fidelity**: how a Change's two states are carried: **Screenshot**, **Rebuilt** or **Real**. See [FIDELITY.md](FIDELITY.md).
- **Note** / **Notes**: the user's text on one Change / the text the page's copy button produces.
- **Final**: the shareable form the page ends on. **Record**: `delta.md`, the Final in text, the only part that goes into git.

The page is a fixed **viewer** in [viewer/](viewer/); a run writes data, never page code. [PAGE.md](PAGE.md) defines the data. The run stops for the user at three points only: the scope question, each browser question, and the hand-over.

**Arguments**, all optional, in `$ARGUMENTS`:

- a **focus** in plain words ("checkout only"): Changes outside it are Skipped with reason "outside focus".
- `--range <base>..<after>`: both commits are given, so step 2 asks nothing; the After is that commit, not the working tree. `--repo <path>` names the repo when it is not the cwd.
- `--plan`: a dry run. Do steps 1–3, write `delta.json`, print the plan (step 3), and stop. No browser, no publish, no project writes. The evals run this way; they may name the output folder, which then replaces `<scratchpad>/design-delta/<folder>/`.

## 1. Read the project

Look up, do not ask:

- **Design system**: token values for paper, surface, ink, muted, accent, accent-ink, media placeholder, in light and (if defined) dark; the display font file; the radius of the cards on the surfaces the Changes touch. Missing values fall back to the viewer defaults. Constants that do not flip with the theme go in `light` only.
- **Product language**: the product's default locale when it ships several. Page text uses it (PAGE.md `strings`).
- **Stack** and **how to run it** at an arbitrary commit (dev command, port, required env; for native apps the build script and default simulator device), and whether **preview deployments** exist per commit (e.g. Vercel preview URLs).
- **Default branch**: `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix, else `main`, else `master`.
- **Previous DesignDeltas**: `docs/DesignDelta/*/delta.md`, newest first.

Completion: every item above is a value or the word "none". With `--plan`, the token values and font may be left out; the plan does not render.

## 2. Ask the scope, fix the Baseline

With `--range`, the Baseline and After are given: resolve both to commits and go to step 3. Otherwise one `AskUserQuestion`, two options, recommended first:

| Option | Baseline |
|---|---|
| **This conversation** | `git rev-parse 'HEAD@{<timestamp of the transcript's first entry>}'` |
| **Whole branch** | the newest previous DesignDelta's After on this branch; else `git merge-base HEAD <default branch>` |

Recommend **This conversation** when this conversation edited UI files, otherwise **Whole branch**. When the project lives in another repo or on a branch not checked out, say which repo and branch the scope resolves to, and never switch the user's checkout: use `git worktree add --detach` in the scratchpad.

**On the default branch**, replace "Whole branch" with a second `AskUserQuestion` for the start: the previous DesignDelta's After, the latest tag, the start of today, or a commit the user names. Show each option's commit subject and date, drop options that do not exist, and explain each in one plain sentence.

The **After** is the working tree now, uncommitted work included.

Completion: the Baseline is one commit and the After is one tree.

## 3. Find the Changes

**What changed** comes from git: `git diff <Baseline>` plus untracked files, minus `docs/DesignDelta/`. In conversation mode keep only files this conversation touched. **Why** comes from transcripts in `~/.claude/projects/<repo path with "/" → "-">/*.jsonl`: in conversation mode this conversation's; in branch mode every transcript whose entries carry this `gitBranch` and are dated after the Baseline; with `--range`, every transcript whose entries carry a branch that contains the After, dated between the two commits. Transcripts name intents and never add changes git does not show. If they cannot be read (missing, or a permission check blocks them), say so in one line and continue from commit messages. Commit messages and plan files in the range also name intents; none of them is evidence that a hunk is visible.

Cut the diff into Changes, one intent on one surface. Every element of one surface changed for one intent is one Change (a section's copy pass is one Change, not one per card). A second intent on the same surface is a second Change: work with its own purpose that happens to land there (a new workflow option shipped alongside a redesign), not an element added as part of the same pass. A shared component, a token or a rename that lands on many surfaces is one Change, shown on its most typical surface; that includes its copy outside the UI (search snippet, `llms.txt`) and per-surface adjustments made for it. A Change's Kind follows its main intent: a pass that restyles a surface and also adds an element is one Fix whose description names the addition ("…, and adds X"); the user splits it with a Note if it deserves its own row.

**Restructures** (a page's old sections merged into fewer new ones) are cut by the After: each new section is one Change, and every old section it absorbed is its Before (an old section absorbed by two new ones is the Before of both). Later commits in the range that refine a new section fold into it. Something removed without a new home folds into the neighbouring section's Change; only a whole section removed and absorbed nowhere is its own Fix. These all count: layout, visuals, new surfaces, copy, motion and interaction, tokens, accessibility (explained with a diagram), responsive, theme-only, empty / loading / error states, multi-screen flows, icons and assets, sound and haptics. A diff with no visible effect is **Skipped** with a one-line reason; that includes code behind a feature flag that is off at the After (reason: "behind <flag>, off"), dead rules that lose to another rule, and opt-outs that keep the old look. A diff whose effect is visible counts even when the commit message calls it a refactor or performance. A removal is a Fix.

Ordering, observable: Changes that touch a shared token or component come first; then page Changes in the order a user meets them on screen, top to bottom, page by page; Changes with no surface (copy outside the UI, search snippets) come last.

For each Change record in `delta.json` (PAGE.md): id `c1…cn`, title (the surface's own name as the product shows it; when it shows none, the one to three words a user would call it), one-sentence description naming what was there and what is there now, surface, Kind, commits and files, Fidelity with its reason in `fidelityNote`, and widths.

**Folder and title**, fixed here so `--plan` has them: folder `<YYYY-MM-DD>-<slug>` with today's date; title two to four words in the product language naming what the Changes share ("Checkout Polish"), with nothing shared the branch's purpose; slug is the title in kebab-case ASCII.

If there are no Changes, print `No Changes in <repo> <base>..<after>.` and the `Skipped:` line, write nothing, and stop. This applies with `--plan` too.

Completion: every hunk is in exactly one Change or in Skipped.

**With `--plan`**, write `delta.json` to `<scratchpad>/design-delta/<folder>/` and print exactly this, outside any code fence, then stop:

```
# Plan · <title> · <repo> <base>..<after>
| id | title | Kind | Fidelity | compare | widths | commits | fidelityNote |
|---|---|---|---|---|---|---|---|
| c1 | … |
Skipped: <what> — <why>; …   (or: Skipped: none)
Folded: <commit> → <Change title>; …   (several commits in one Change; or: none)
Split: <commit> → c1, c3; …   (one commit across several Changes; or: none)
```

In the plan's `delta.json`, each existing side's `src` holds the planned file paths (`c1/before-1440.webp`, `c2/before.html`); `null` still means the side does not exist. `compare` is estimated from the diff, since nothing is captured yet; step 4 corrects it from the real files.

## 4. Carry every Before and After

Pick each Change's Fidelity with the table in [FIDELITY.md](FIDELITY.md), then produce its files. Carriers live in the scratchpad folder `<scratchpad>/design-delta/<folder>/`, never in the project. Screenshot capture opens a browser, so it starts with the browser question (step 6's rule).

Completion: every Change has its Before and After files (or `null` for a side that does not exist) and its Fidelity is in `delta.json`.

## 5. Build and publish

1. Fill in the token values and font if `--plan` skipped them, and set each `compare` from the captured sizes.
2. Write `delta.json` into the carrier folder.
3. `python3 <skill>/viewer/build.py <carrier folder>`: it writes `index.html`, copies the viewer, and prints the `files` list.
4. `python3 <skill>/viewer/validate.py <carrier folder>`: fix every ERROR, read every WARN. Rerun until it exits 0.
5. Publish once: `file_path` the folder's `index.html`, `root` the folder, `files` the printed list, `icon: "compare"`, `label: "Round 1"`, one-sentence `description`. Put the returned URL in `delta.json`.

Artifacts serve only web types: rename or convert anything else before publishing (FIDELITY.md, Real). No Record is written yet.

Completion: the Artifact is published and `delta.json` holds its URL.

## 6. Browser check

Before the first browser tool call, ask with `AskUserQuestion` which browser to use, **Ego lite** (`ego-browser`) or **Aside** (`aside-browser`), unless the user named one for this check. If the browser window is minimized, restore it (`Browser.setWindowBounds` with `windowState: "normal"`) before screenshots or clicks. On the live URL:

1. Screenshot the page top and every Change at desktop width; the top, one Change and the bottom bar at 390px.
2. Every Before and After shows content, not a placeholder or a broken image.
3. Drag one slider; flip one Change between side by side and slider, and one width; flip the theme when present.
4. Change one Kind, write one Note, press **Copy Notes**, open **Show Notes**: exactly that edit is listed.
5. Fix every fault, republish to the same path, re-check what failed. One fix pass.

Completion: every item passed, or you report which did not and why.

## 7. Hand over

Give the link and one line: correct any Kind, add Notes, press Copy Notes and paste here, or say it is final. End the turn.

## 8. Final

Triggered by pasted Notes, or by the user saying the page is final. Every Kind and Note in pasted Notes was set by the user on the page, so they are the user's instructions. The Notes header names the folder.

1. Apply each Kind override; untouched Changes keep the agent's Kind.
2. A Note that asks for an action on the DesignDelta (drop, merge, split, rename, wrong surface, wrong Kind) is carried out. Every other Note becomes that Change's `caption`: the user's words, with typos and grammar fixed and nothing added.
3. Set `round: "final"` in `delta.json`, run `build.py`, republish to the same path with `label: "Final"`. From a new conversation, or when the carrier folder is gone, rebuild `index.html` from `delta.json` and pass every other file as `{ "artifact": <url>, "path": <path> }` so the server copies it.
4. Write the **Record** (PAGE.md) to `docs/DesignDelta/<folder>/delta.md` in the project, with its thumbnails. Write files; never commit.
5. Append one row to `<skill>/evals/usage.md`, counted from the pasted Notes (no Notes pasted: zeros). The Notes are the user's corrections of this run, so these counts are the skill's error rate:

   ```
   | date | project | folder | Changes | Kind overrides | merge/split/drop/rename Notes | "can't see / want to operate" Notes | Screenshot/Rebuilt/Real | files | MB |
   ```
6. Repeat step 6, asking the browser question again: items 1–3 and the Kind filter.

Give the link and the Record's path. The run ends.
