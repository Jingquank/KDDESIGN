---
name: design-morph
description: Turn a UI redesign into an animated film on one Artifact page, the old page morphing into the new one element by element with design guide lines, from live URLs or two commits of the same repo. Redo one act of an existing film, or render it as an MP4.
disable-model-invocation: true
argument-hint: [focus or act] [artifact link] [--mp4] [--plan]
---

# /design-morph

One run makes a **Morph film**: an Artifact page where each **Act** plays one page of the old
product turning into the same page of the new one, **skeleton first** (grid and layout, then
content, then skin), with **Guides** drawn over it. The page is the **Theater** player; the film
is **scene data**. The Artifact is the only store: nothing is written into the target repo.

- **Act**: one page pair, Before → After, about 13.3 s at 1×, opened by a title card.
- **Chapter**: one step of an Act (lay the grid, fold the top bar, …) with one caption.
- **Element**: one box on the stage with an old state and a new state: a **move** (both), an
  **enter** (new only) or an **exit** (old only, or new `op: 0`).
- **Mapping**: which old element becomes which new one. **Pair**: one such old → new match.
- **Middle state**: the new structure in the old skin, between layout and skin.
- **Guides**: grid traces, extension lines, box traces and **spec tags** in the after-project's
  accent and UI font.
- **Finding**: a problem `check.mjs` reports: overlap, outside, leftover or time.
- **Scene data**: `scene.json` and `acts/<key>.json` in the **film folder**; [SCENE.md](SCENE.md)
  defines every field.

The engine, player, build, checker and tools in [engine/](engine/) and [tools/](tools/) are fixed.
**Run them; do not read or edit them.** A run writes scene data and assets only. A component the
fields cannot express goes through the extension point (SCENE.md, Extending), never a patch.
[LESSONS.md](LESSONS.md) holds the defaults that keep in-between frames sound; read it before
step 5.

v1 is web only: live URLs (production or localhost) and commits of one repo. Native apps and
simulators are a later extension; when asked for one, say so and stop.

**Arguments**, all optional, in `$ARGUMENTS`:

- a **focus** or an **act** in plain words ("the library changed, redo it"): with an existing
  film, only that act is redone (step 2).
- an **Artifact link**: the film to work on; it wins over the search in step 2.
- `--mp4`: render the MP4 after the hand-over (step 12). A later "make the MP4" does the same.
- `--plan`: a dry run. Steps 1–6 and the checker, then print the plan (step 6) and stop: no
  visual pass, no publish. Measuring still opens a browser.

Paths: `<skill>` is this folder; `<film>` is `<scratchpad>/design-morph/<film-id>/`.

**Keep a checklist** for the whole run, in the task list when the harness has one, otherwise in
`<film>/.checklist.md`: one line per step below, then one line per open finding and per visual
problem. **Do not stop, hand over, or publish a hand-over version while any line is open.** These
are the early stops to avoid by name:

- handing over with "a few small overlaps remain" or "the rest is minor";
- skipping the visual pass because the checker is clean;
- silencing a real collision with `ok` or `clipOk` (those are for overlaps the design intends,
  each with a reason in a comment);
- editing anything in `engine/` or `tools/` to make a finding go away;
- ending the turn on a status note or asking "shall I keep fixing?" in the middle of the loop.

A finding you cannot fix after three different attempts is not a stop either: change the
choreography (a waypoint, a later window, fade in place) or ask the user about that one Pair.

## 1. Read the project

Look up, do not ask. From the after-project (the repo, or the code behind the after URL):

- **Tokens**: page, pane and card fills, ink and muted text, borders, the accent and the ink on it.
- **Fonts**: the UI font family and its file (woff2), and the old product's font.
- **Motion tokens**: an easing or duration the project defines for moves and enters. None: the
  defaults in SCENE.md.
- **Corners**: whether the UI uses `corner-shape: superellipse(…)`, and its radii.
- **Primary breakpoint**: the layout the product is designed at first (a desktop app's widest
  frame, a mobile-first site's phone frame). It sets the stage: `1440 × 900` desktop or
  `390 × 844` phone unless the project names other sizes.
- **Language**: the product's default locale. Captions are in it and English; English only when
  the product is English.
- **Browser**: the user's own instructions say which browser to use and when to ask. Follow them;
  never assume one.

Completion: every item is a value or "none", written into `scene.json`'s `stage`, `langs` and `theme`.

## 2. Find the film, or start one

- **A link in the arguments**: that is the film.
- **Otherwise**, list the user's Artifacts (`list_artifacts`) and keep those whose title ends in
  `Design Morph` and whose `list_files` holds `scene.json` and `morph-engine.js`.
  - One matches the product and the request names an act: that is the film.
  - Several match: ask with `AskUserQuestion` which one, each option its title and date.
  - None, or the request is for a new film: start one.
- **New film**: `film-id` is the product and surfaces in kebab case (`meme-maker`); the title is
  `<Product> Design Morph`. Make `<film>`.
- **Existing film**: copy every file back with `read_file` (`paths`, up to 32 per call) into a
  fresh `<film>`, keeping the paths. The acts not being redone stay exactly as they are. The
  stored `answers` (step 3) and each act's `pages` stand, so a redo asks nothing unless the user
  changes them.

Completion: `<film>` exists and you know which acts this run writes.

## 3. Ask the three questions

With `AskUserQuestion`, one question at a time, recommended option first:

1. **Acts**: the Before and After page of each Act, one page pair per Act. Propose pairs from what
   you found (routes the redesign touched, pages the user named). Each option is an Act: label
   the page's name, description `<before URL or commit:path> → <after URL>`. Multi-select. A
   Before may be a commit: it runs in a worktree (step 4).
2. **Content**: swap in public or curated media on both sides (recommended), and drop failed
   states and personal photos; or keep what the pages show.
3. **Overlays**: which popups, toasts and popovers the film includes. List the ones the pages
   show or their code renders, by the names the product uses. "None" is recommended unless the
   redesign is about one.

Everything else is fixed and never asked: skeleton-first story order, about 13.3 s per Act at
1× with 0.5×, 1× and 2×, captions in the project's language and English, a hard cut and a title
card between Acts, the Theater layout. Write the answers to `scene.json` as
`"answers": { "content": "…", "overlays": [ … ] }` and each pair to its act's `pages`.

Completion: three answers, recorded; or none asked on a redo whose answers stand.

## 4. Bring up both versions and measure them

- **Live URL**: open it as is. **Commit**: `git worktree add --detach <scratchpad>/design-morph/wt-<sha> <sha>`,
  give it its own dependencies (the project's frozen, offline install), run its dev server on a
  free port. Never switch the user's checkout. Remove the worktree when the run ends.
- In the chosen browser, set the viewport to the stage
  (`Emulation.setDeviceMetricsOverride` with the stage `w`, `h`, `deviceScaleFactor: 1`), open
  each page, dismiss the overlays the user did not include, and wait for media.
- Run [tools/measure.js](tools/measure.js) in the page: pass the file's text unchanged to the
  browser's evaluate as `(<text>)({ w, h })`, save the result to `<film>/measure/<act>-before.json` and
  `…-after.json`, and take one screenshot of each.
- Collect assets into `<film>/assets/` (lesson 11): every icon of both pages into `icons.json`;
  the after font file; the media set the user chose in question 2, the same files for both sides;
  crops for plates.

Completion: two measurements and two screenshots per Act being written, and every asset an
element will name is in `assets/`.

## 5. Map the elements

Read [LESSONS.md](LESSONS.md) first. Match old elements to new ones by role, not by position:
the same control, the same content, the same place in the product's model. A new element with no
old one enters; an old one with no new one exits. Decide every Pair yourself. Stop to ask, with
`AskUserQuestion`, only about the Pairs you are unsure of (two plausible matches, or a match that
would decide the story of a Chapter), one question per Pair, and note every other call you made
on your own for the hand-over.

Then cut each Act into Chapters, skeleton first: the grid, then the shell (top bar, sidebar,
panes), then the page's content groups in the order a user meets them, then the skin. One
caption per Chapter: what changed and why, in plain words, in each language.

Completion: every measured element is in one Pair, one enter or one exit, or left out for a
reason (an overlay not chosen, an off-stage item).

## 6. Write the scene data

Write `scene.json` and one `acts/<key>.json` per Act (SCENE.md). A throwaway generator in
`<film>/gen/` may write the act files from the measurements; only its output is published.

- Coordinates come from the measurements, not from screenshots by eye.
- Spec tags go on a few key elements per Act, the ones that best explain the change.
- Every rule in LESSONS.md is a default; apply it while writing, not after the checker complains.

Completion: `node <skill>/engine/check.mjs <film>` runs (findings may still be open).

**With `--plan`**, run the checker once and print exactly this, outside any code fence, then stop:

```
# Plan · <title> · <stage w>×<stage h> · <new film | redo <act>>
| act | before → after | chapters | moves | enters | exits | spec tags | findings |
|---|---|---|---|---|---|---|---|
| library | … | 9 | 88 | 45 | 13 | 9 | 3 |
Asked: <the Pairs you asked about; or none>
Own calls: <Pairs you decided that a reviewer might question; or none>
```

## 7. Build

```sh
node <skill>/engine/build.mjs <film> > <film>/.files.json
```

It prints `built <n> files, <MB> MB` and writes the publish list to `.files.json`. It exits 1 and
names each problem (a missing asset or icon, an unscoped `scene.css` rule): fix the data and
rerun. `publish_files` takes at most 20 MiB per file and 64 MiB in all; crops are JPEG at the
stage size or below.

Completion: build exits 0.

## 8. Check until clean

```sh
node <skill>/engine/check.mjs <film> [--act <key>]
```

Fix every finding in the scene data, rebuild, rerun, until it prints `Findings: 0`. On a redo,
check the redone act with `--act`, then the whole film once. What each kind means and how it is
usually fixed:

- **overlap** `a × b`: two siblings cross. Give one a later window, a waypoint, or fade it in
  place (lessons 3, 5). Remap rows and columns so a group moves as one (lesson 10).
- **outside** `x crosses the edge of y`: a traveller crosses a visible card or pane edge. Let the
  container enter after the travellers (lesson 4), move the item with its container (same `at`),
  or trim a box that is wider than its room (lesson 6).
- **leftover** `x is still visible at the end`: give it `op: 0`, or describe its new look (lesson 1).
- **time**: a window, `at`, waypoint or chapter steps backwards or leaves 0..1. "player clock"
  means the engine itself is broken: stop and report it; do not patch it in the run.

Completion: `Findings: 0`.

## 9. Visual pass

Geometry cannot see clipped text, ugly paths or wrong colors in the middle state. Serve the film
and look:

```sh
python3 -m http.server <port> -d <film>        # in the background; file:// blocks fonts
```

In the chosen browser, shoot stills every 0.6 s across each Act being written, then contact
sheets. [tools/frames.mjs](tools/frames.mjs) takes any page object with `evaluate` and `cdp`.
The calls below are Ego lite's; with another browser, pass its page object, or run the same
seek and stage screenshot through its own runner:

```js
const { stills } = await import('<skill>/tools/frames.mjs');
await stills(task.page('p1'), { url: 'http://localhost:<port>/index.html', out: '<film>/frames',
  times: [/* act start + 0.4 … act end, every 0.6 s */], width: <stage w>, prefix: '<act>' });
```

```sh
python3 <skill>/tools/sheet.py <film>/frames <act> <film>/frames/sheet-<act>.png 4
```

Look at every sheet, then at full size wherever something looks off. Check: text clipped mid-swap,
a traveller whose path reads wrong, text that fades into its ground in the middle state, plates
whose edges show, an icon flying to a place where it means something else, guides and tags that
cover what they explain. Add each problem to the checklist, fix it in the data, rebuild, recheck
(step 8), and shoot that stretch again.

Completion: every sheet looked at, every problem fixed, and step 8 still prints `Findings: 0`.

## 10. Publish

`publish_files` with the list in `<film>/.files.json`.

- **New film**: `title` the scene's title, `icon: "film"`, `label` the acts.
- **Existing film**: `slug` and `base_version` from step 2 (and `shared_live` when it is shared),
  the same files, `label` naming the redone act. Every file is republished, so a dropped asset is
  listed in `remove`.

For a new film, or when this run added files, open the live URL once: the Artifact frame blocks
what a local server allows, so check that the fonts and media load and the transport plays. Fix
and republish if not.

Completion: the Artifact is live at its URL and plays.

## 11. Hand over

Give, in this order and nothing else:

1. The link.
2. The Acts, each with its Chapters in one line (`Library: grid · top bar · sidebar · title ·
   tiles · filters · skin`).
3. The Pairs you decided on your own that a reviewer might question, one line each, or "none".
4. How to redo one Act: "Say `/design-morph <act>` (or 'the library changed, redo it'); only that
   Act is measured again and the film keeps its link."
5. How to get the MP4: "Say 'make the MP4' or run `/design-morph --mp4`."

Then end the turn, unless `--mp4` was given.

## 12. MP4 (only with `--mp4` or when asked)

1. `command -v ffmpeg`; if missing, say "Install ffmpeg (`brew install ffmpeg`) and ask again"
   and stop.
2. Serve the film (step 9). Render every frame of the stage, guides on, no player chrome or
   captions: seek, two `requestAnimationFrame`s, a CDP screenshot of the stage, 60 fps. Width:
   1920 for a landscape stage; for a portrait one, the width that makes the height 1920. In
   chunks of one Act (`from`, `to` in seconds), so no single browser call runs long:

   ```js
   // Ego lite; with another browser, pass its page object (step 9)
   const { render } = await import('<skill>/tools/frames.mjs');
   await render(task.page('p1'), { url, out: '<film>/render', width: 1920, from, to });
   ```

3. `sh <skill>/tools/encode.sh <film>/render ~/Downloads/<film-id>.mp4` (H.264, CRF 16,
   yuv420p, faststart).
4. Give the file's path, its length and size.
