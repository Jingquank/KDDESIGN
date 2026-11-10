---
name: design-delta
description: Lay out every design change from this conversation or this branch on one Artifact page, Before beside After, each marked New or Fix, and write a text Delta of the decisions into the repo.
disable-model-invocation: true
argument-hint: [focus] [--range <base>..<after>] [--plan]
---

# /design-delta

One run produces a **Design Changelog**, an Artifact page that shows every **Change** since a **Baseline** as a **Before** and an **After**, and a **Delta** in the repo. Nobody reviews either: you set each Change's **Kind**, the page is published once in its lasting form, and the one place a person decides is the Design Lessons Review, where lessons become rules (ADR 0043).

- **Change**: one intent carried out on one surface, however many elements and commits it took. A **surface** is the smallest part of the product a user names when telling someone where to look: a section of a web page ("the Rate section"), a native screen ("the category page"), a dialog. The bar, hero or grid inside one screen are parts of that surface, not surfaces.
- **Before** / **After**: the surface at the Baseline, and in the working tree now.
- **Kind**: **New** (something a user can point to that was not there: a surface, component, indicator, card, option or visual treatment, even inside an existing surface) or **Fix** (something that existed and was changed, merged or removed).
- **Change fidelity**: how far the page carries a Change beyond its stills: **Screenshot** (stills and live links), **Rebuilt** or **Real** (plus a frame to operate). Every side has stills. See [FIDELITY.md](FIDELITY.md).
- **Delta**: `<folder>.md` in the project's **Deltas folder** (`docs/deltas/` unless a `Design deltas:` line names another; PAGE.md, Where Deltas live), the Design Changelog in text (each Change's decision, why, what to repeat or avoid, with sources), written at hand-over; the only part meant for git.

The page is a fixed **viewer** in [viewer/](viewer/); a run writes data, never page code. [PAGE.md](PAGE.md) defines the data. The run stops for the user at three points only: the scope question, each browser question, and the hand-over; and once per clone, when git ignores the Deltas folder (step 7). The hand-over is the end of the run.

**Arguments**, all optional, in `$ARGUMENTS`:

- a **focus** in plain words ("checkout only"): Changes outside it are Skipped with reason "outside focus".
- `--range <base>..<after>`: both commits are given, so step 2 asks nothing; the After is that commit, not the working tree. `--repo <path>` names the repo when it is not the cwd.
- `--background`: run in a background subagent nobody watches (ADR 0011). It comes with `--range` and asks nothing: no scope question, no browser question (use the browser the user's own rules name, else any browser tool this session has, in a tab of your own, never one of the user's), and when the lessons are due a chained `/design-lessons` gets `--background` and any `--rules <path>` given here. The hand-over is one line of JSON and nothing else (step 7).
- `--passive`: started by the KDDESIGN Nudge once UI work has been pushed: by itself in a project whose `Design deltas:` line says `(auto)`, after one key press elsewhere (ADR 0041, 0044). It comes with `--range` (both ends are pushed commits) and `--branch <name>`, the branch the Delta names. It follows every `--background` rule and goes further: no browser tool and no worktrees; its stills come from the page snapshots the Nudge saved (Passive run, below).
- `--rules <path>`: the rules file, when the user already chose it on the Nudge; passed on to `/design-lessons`.
- `--plan`: a dry run. Do steps 1–3, write `delta.json`, print the plan (step 3), and stop. No browser, no publish, no project writes. The evals run this way; they may name the output folder, which then replaces `<scratchpad>/design-delta/<folder>/`.

## Passive run

With `--passive` nobody waits for a page, so the run does only what is cheap: it writes the Delta from the diff and the transcripts, and takes its pictures from **snapshots** the Nudge already saved, never from a browser or a rebuilt commit. Pushing the work is the user's approval of what changed; why it changed is still only your reading, which is why every line keeps its source and the Design Lessons Review stays the one place a person decides (ADR 0041).

1. Step 1, without the stack and how to run it.
2. Step 3, with visibility judged from the code. A hunk whose effect on screen cannot be told from the code is a Change, not Skipped, and its `Before → After` line ends "(not seen)" unless a still shows it (below).
3. **Pictures from snapshots**, in place of steps 4 and 6 (FIDELITY.md, Snapshots; ADR 0042). Name the route each Change shows on, read from the code (the page that renders the changed component; one route per Change, the most typical), then run once:

   ```sh
   node <skill>/viewer/snap.mjs pair --root <repo> --base <base> --after <after> --folder <folder> --route "/checkout=src/checkout/PayButton.tsx,src/checkout/Coupon.tsx" --route "/pricing=…"
   ```

   It prints, per route, a `before` and an `after` snapshot or `null` with the reason. For each Change with a snapshot on a side: find its surface with `snap.mjs outline --from <snapshot>`, then `snap.mjs still --from <snapshot> --selector <css> --width 1440 --out <carrier>/raw/c<N>-before-1440.png` (and `390`, and the After with the same selector when it still matches), and encode with `still.py` as in FIDELITY.md, Screenshot, step 4. Read every still: it must show the surface, and with both sides the difference the diff states. One that does not gets one more try with another selector, then that side has no still. This look is the run's fresh eye; a still you cannot find the Change in teaches the wrong thing later.
4. **The page**, only when some Change has a still: write `delta.json` (PAGE.md), holding the Changes that have a still (a Fix whose Before was not saved has `before: null` and the caption "Before not saved"); the rest stay in the Delta alone. Then step 5. With no still at all, there is no carrier folder and no page.
5. Step 7.1, the Delta, with these differences (PAGE.md, The Delta): `Branch` is `--branch`; `Before → After` carries every value the diff has (sizes, tokens, copy); a Why, Repeat or Avoid sourced to a conversation quotes the user's own words, in their language, before the source; without a page the header has no `Page:` link. Skip 7.2. Never commit: the Nudge commits the Delta file once the run ends.
6. Step 7.5, the lessons when due, with `--background`.
7. End with one line of JSON and nothing else: `{"page": "<Design Changelog URL or null>", "delta": "<Deltas folder>/<folder>.md", "title": "<title>", "changes": <n>, "review": "<Design Lessons Review URL or null>", "note": "<one line, only when something is left for the user, else null>"}`. With no Changes, write nothing and answer `{"page": null, "delta": null, "title": null, "changes": 0, "review": null, "note": null}`.

A hand run of `/design-delta` over the same range makes the full page, every still captured from the running product and frames where the ladder adds them, when the user wants to show it.

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

Cut the diff into Changes, one intent on one surface. Every element of one surface changed for one intent is one Change (a section's copy pass is one Change, not one per card). A second intent on the same surface is a second Change: work with its own purpose that happens to land there (a new workflow option shipped alongside a redesign), not an element added as part of the same pass. A shared component, a token or a rename that lands on many surfaces is one Change, shown on its most typical surface; that includes its copy outside the UI (search snippet, `llms.txt`) and per-surface adjustments made for it. A Change's Kind follows its main intent: a pass that restyles a surface and also adds an element is one Fix whose description names the addition ("…, and adds X"); the user may ask for it to be split (Corrections).

**Restructures** (a page's old sections merged into fewer new ones) are cut by the After: each new section is one Change, and every old section it absorbed is its Before (an old section absorbed by two new ones is the Before of both). Later commits in the range that refine a new section fold into it. Something removed without a new home folds into the neighbouring section's Change; only a whole section removed and absorbed nowhere is its own Fix. These all count: layout, visuals, new surfaces, copy, motion and interaction, tokens, accessibility (explained with a diagram), responsive, theme-only, empty / loading / error states, multi-screen flows, icons and assets, sound and haptics. A diff with no visible effect is **Skipped** with a one-line reason; that includes code behind a feature flag that is off at the After (reason: "behind <flag>, off"), dead rules that lose to another rule, and opt-outs that keep the old look. A diff whose effect is visible counts even when the commit message calls it a refactor or performance. A removal is a Fix.

Ordering, observable: Changes that touch a shared token or component come first; then page Changes in the order a user meets them on screen, top to bottom, page by page; Changes with no surface (copy outside the UI, search snippets) come last.

For each Change record in `delta.json` (PAGE.md): id `c1…cn`, title (the surface's own name as the product shows it; when it shows none, the one to three words a user would call it), one-sentence description naming what was there and what is there now, surface, Kind, commits and files, Change fidelity with its reason in `fidelityNote`, and widths.

**Folder and title**, fixed here so `--plan` has them: folder `<YYYY-MM-DD>-<slug>` with today's date, naming both the carrier folder and the Delta; title two to four words in the product language naming what the Changes share ("Checkout Polish"), with nothing shared the branch's purpose; slug is the title in kebab-case ASCII.

If there are no Changes, print `No Changes in <repo> <base>..<after>.` and the `Skipped:` line, write nothing, and stop. This applies with `--plan` too.

Completion: every hunk is in exactly one Change or in Skipped.

**With `--plan`**, write `delta.json` to `<scratchpad>/design-delta/<folder>/` and print exactly this, outside any code fence, then stop:

```
# Plan · <title> · <repo> <base>..<after>
| id | title | Kind | Change fidelity | widths | commits | fidelityNote |
|---|---|---|---|---|---|---|---|
| c1 | … |
Skipped: <what> — <why>; …   (or: Skipped: none)
Folded: <commit> → <Change title>; …   (several commits in one Change; or: none)
Split: <commit> → c1, c3; …   (one commit across several Changes; or: none)
```

In the plan's `delta.json`, each existing side's `src` holds the planned still paths (`c1/before-1440.avif`) and a responding Rebuilt or Real side's `frame` its planned file (`c2/after.html`); `null` still means the side does not exist.

## 4. Carry every Before and After

Capture stills for every side that exists, then pick each Change's Change fidelity down the ladder in [FIDELITY.md](FIDELITY.md) and add frames only where it says. Carriers live in the scratchpad folder `<scratchpad>/design-delta/<folder>/`, never in the project. Capture opens a browser, so it starts with the browser question (step 6's rule).

**Capturers.** Capture is most of a run's time (ADR 0031), one Change after another, so with 4 or more Changes to capture it is split across **capturers**, subagents that each take stills of a few Changes at once. You keep everything that needs the whole run: the worktrees, each state running once on its own port (FIDELITY.md, Getting the Baseline running), the browser, the frames and every recapture. Then:

1. Cut the Changes into batches in screen order, 3 to 5 Changes each, at most 4 batches; a Change is never split. Open one tab per batch in the chosen browser (in Ego, one task space holding one Page per batch; elsewhere, one tab each), and keep a tab of your own.
2. Start every capturer in one message with the Agent tool, each with only its brief: its tab (and the task space id), each state's URL, and per Change its id, title, `desc`, the surface's selector, the state to force, theme and widths; the font families for `ready.js`; the absolute paths of [viewer/ready.js](viewer/ready.js), `<skill>/viewer/still.py` and the carrier folder; and FIDELITY.md, Screenshot, steps 3 and 4, word for word. Its rules: work only in its own tab and never close it; never start a server, install, build, edit the project, write `delta.json` or publish; answer per side with the still paths, the `ready.js` status and its `reasons`.
3. While they capture, build the frames of Rebuilt and Real Changes in your own tab. Read every still they return before the fresh eye; a missing or wrong side is yours to recapture.

Fewer than 4 Changes, no Agent tool, or a native app (one simulator): capture them yourself, one after another.

**The fresh eye.** You know what each Change is, so you will see it in any still; someone who knows only what the page will say may not. The stills also become the Bad and Good examples of the rules `/design-lessons` drafts, so a still that misses its Change teaches the wrong thing. Once the stills are taken, start one reviewer with the Agent tool and give it, for every Change, its title, its `desc` and its stills at the widest width, and nothing else: not the diff, the commits, the files, the transcripts or this conversation. Its brief:

> For each Change, find what its description says in its stills. Answer with the still and a place on it (the top bar, the third card, the right column), or "not found" with what you see there instead. With a Before and an After, say whether that is the difference between them. Do not take the words on trust: "found" needs something you can point at.

Every "not found" is a still or a description that is wrong: recapture that side (the state forced, the crop, the width, the right build) or rewrite `desc` to say what the stills show, once. What is still not found goes to the hand-over (step 7) in the reviewer's words. With `--background` there may be no Agent tool; then answer the same brief yourself from the stills alone, and say in `note` that the eye was not fresh.

Completion: every capturer has answered and its tab is closed, every side that exists has a still per width, every Rebuilt or Real Change has a frame on each side that responds, each Change's Change fidelity is in `delta.json`, and the reviewer has found every Change or its misses wait for the hand-over.

## 5. Build and publish

1. Fill in the token values and font if `--plan` skipped them.
2. Write `delta.json` into the carrier folder.
3. `python3 <skill>/viewer/build.py <carrier folder>`: it writes `index.html`, copies the viewer, and prints the `files` map.
4. `python3 <skill>/viewer/validate.py <carrier folder>`: fix every ERROR, read every WARN. Rerun until it exits 0. Over budget (8 MB) is an ERROR: walk the heaviest Change back down the ladder (FIDELITY.md, Budget).
5. Publish once: `file_path` the folder's `index.html`, `root` the folder, `files` the printed map, `icon: "compare"`, one-sentence `description`. Put the returned URL in `delta.json`.

Artifacts serve only web types: rename or convert anything else before publishing (FIDELITY.md, Real).

Completion: the Artifact is published and `delta.json` holds its URL.

## 6. Browser check

Before the first browser tool call, use the browser the user's own rules name for this session; when they name none, ask once with `AskUserQuestion`, offering the browser tools this session has. With `--background`, do not ask: use the browser their rules name, else any browser tool this session has, in a tab of your own. If the browser window is minimized, restore it (with CDP, `Browser.setWindowBounds` with `windowState: "normal"`) before screenshots or clicks. On the live URL:

1. Screenshot the page top and every Change at desktop width; the top and one Change at 390px.
2. Every Before and After shows content, not a placeholder or a broken image; every frame responds to the hover, click or drag its `fidelityNote` names.
3. Flip one Change's width; flip the theme when present.
4. Press the **New** count, then **Fix**, then **All**: only Changes of that Kind stay, and All brings every one back.
5. Fix every fault, republish to the same path, re-check what failed. One fix pass.

Completion: every item passed, or you report which did not and why.

## 7. Write the Delta and hand over

The run ends at the hand-over and nobody is asked to review it, so everything that lasts is written now.

1. Write the **Delta** (PAGE.md) to `<Deltas folder>/<folder>.md` in the project, after the ignored-folder check (PAGE.md, Where Deltas live): text only. Its Why, Repeat and Avoid come from the transcripts read in step 3 and the commit messages, each with its source; a line with no source is `—`. Check every Change's After against the design rules and add a `Breaks:` line for each Rule it breaks. Write files; never commit.
2. Append one row to `<skill>/evals/private/usage.md` (gitignored: rows name projects; start it from the header in `evals/usage.md`) with `corrections` = 0:

   ```
   | date | project | folder | Changes | corrections | Screenshot/Rebuilt/Real | files | MB |
   ```
3. Give the link, the Delta's path (with "(local)" after it when the folder is kept on this machine), one line for each Change the fresh eye could not find and each side captured before it came to rest (step 4). End the turn, unless the lessons are due.

   With `--background`, the hand-over is instead this one line of JSON, after the lessons when they are due, so the Nudge can show it: `{"page": "<Design Changelog URL>", "delta": "<Deltas folder>/<folder>.md", "title": "<title>", "changes": <n>, "review": "<Design Lessons Review URL or null>", "note": "<one line, only when something is left for the user, else null>"}`.
4. **Passive from now on?** Once per project, in a hand run only (never with `--background`, `--passive` or `--plan`), when the `Design deltas:` line says none of `(auto)`, `(manual)` and `(local)`: one `AskUserQuestion`, recommended first. **Record by itself**: from now on the Nudge records what is pushed, with stills from page snapshots it saves while a dev server runs, and commits that one Delta file (pushing it too on any branch but the default one); the line gets `(auto)`. **Ask me each time**: the Nudge asks once after each push of UI work, and one key starts the same run; the line gets `(manual)`. Write the mark right after the folder on the line, creating the line where PAGE.md, Where Deltas live, puts it. The answer lives in the line, so it is asked once.
5. **Lessons due**: 5 or more Deltas dated after the rules' `Last run:` (with no last run, 5 or more in all), this one included. Then run `/design-lessons` (its SKILL.md, steps 1–5) in this same run, before handing over: it reads every Delta, this uncommitted one too, and publishes a Design Lessons Review or finds nothing to decide. Hand over both together: this page's link, then the Design Lessons Review's link and its line (Accept, Reject or Watch each item, Copy Verdicts, paste here), or its one line on what still needs evidence. When `/design-lessons` would have to ask which rules file to use, it does not run; add one line instead: "<n> Deltas since the last /design-lessons run; run it to review the rule candidates." End the turn.

## Corrections

Nothing asks for these; they happen only when the user, having seen the page or the Delta, says something is wrong: a Kind, a Change to drop, merge, split or rename, a wrong surface. This works from a new conversation too, since the Delta names its page.

1. Change `delta.json` (from a new conversation, read the Delta and the page's file listing), run `build.py` and `validate.py`, and republish to the same path. When the carrier folder is gone, pass each file already published as `{ "artifact": <url>, "path": <path> }` so the server copies it.
2. Update the Delta to match. A reason the user gives along the way is a conversation source like any other, quoted, and `stated` when they put it as a general preference (PAGE.md, The Delta).
3. Add one to `corrections` in this run's row of `<skill>/evals/private/usage.md` for each thing changed.

Give the link and the Delta's path.
