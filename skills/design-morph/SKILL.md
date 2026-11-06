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
- **Finding**: a problem `check.mjs` reports (overlap, outside, leftover, snap, drift, tag,
  orphan, void, icon or time),
  or the text check reports (clip).
- **Scene data**: `scene.json` and `acts/<key>.json` in the **film folder**; [SCENE.md](SCENE.md)
  defines every field.

The engine, player, build, checker and tools in [engine/](engine/) and [tools/](tools/) are fixed.
**Run them as they are; never edit them.** A run writes scene data and assets only. A component the
fields cannot express goes through the extension point (SCENE.md, Extending), never a patch.
[LESSONS.md](LESSONS.md) holds the defaults that keep in-between frames sound; read it before
step 5.

The film is made from web pages only: live URLs (production or localhost) and commits of one
repo. For a native app or a simulator, say it is not supported and stop.

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
problem. **Do not stop, hand over, or publish a hand-over version while any line is open**, except
review items the rule in step 9 leaves open, which go to the hand-over by name. These
are the early stops to avoid by name:

- handing over with "a few small overlaps remain" or "the rest is minor";
- skipping the visual pass because the checker is clean;
- skipping the text check or the fresh-eye review because the sheets look fine to you;
- a fourth review round, or a new reviewer for a re-review (each new reviewer samples new frames);
- silencing a real collision with `ok`, `clipOk`, `snapOk`, `driftOk` or `iconOk` (those are for what the
  design intends, each with a reason in a comment);
- editing anything in `engine/` or `tools/` to make a finding go away;
- ending the turn on a status note or asking "shall I keep fixing?" in the middle of the loop.

The stops this run does want: a request for a native app (say so and stop); a Pair you cannot
decide between two plausible matches (ask, step 5); the end of the review by the rule in step 9;
a missing ffmpeg (step 12). Everywhere else, put status notes in the same message as the next
tool call and carry on.

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
- **New film**: `film-id` is the product and surfaces in kebab case (`fieldnote`); the title is
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
- In the chosen browser, set the viewport to the stage's `w` × `h` at device scale 1 (in a
  browser with CDP, `Emulation.setDeviceMetricsOverride`; otherwise its own viewport call), open
  each page, dismiss the overlays the user did not include, and wait for media.
- Run [tools/measure.js](tools/measure.js) in the page: pass the file's text unchanged to the
  browser's evaluate as `(<text>)({ w, h, fonts })`, with `fonts` that page's web UI font from
  step 1 (the old product's on the old page, the new one's on the new; leave out a system font),
  save the result to `<film>/measure/<act>-before.json` and `…-after.json`, and take one
  screenshot of each.
- It measures only once the page is at rest. A result whose `ready.status` is `inconclusive` is not
  scene data: boxes taken in a fallback font or mid-entrance put every Pair in the wrong place.
  Deal with what its `ready.reasons` name (dismiss an overlay, scroll so lazy images load, give a
  slow page a longer `timeout`) and measure again. A page that never comes to rest is measured as
  it stands, and its reasons go to the hand-over as open.
- Collect assets into `<film>/assets/` (lesson 11): every icon of both pages into `icons.json`;
  the after font file; the media set the user chose in question 2, the same files for both sides;
  crops for plates.

**Measurers.** With 2 or more Acts being written, the measuring is split across **measurers**,
one subagent per Act in a tab of its own (ADR 0034). You keep the worktrees, the dev servers,
the assets and every measurement that needs doing again. Once both versions are up, start every
measurer in one message with the Agent tool, each with only its brief: its tab, its Act's key and
Before and After URLs, the stage `w` × `h`, the overlays to dismiss, each page's `fonts`, the
absolute paths of `tools/measure.js` and `<film>/measure/`, and the second and third bullets
above and the one on `ready.status`, word for word. Its rules: work only in its own tab and never
close it; write only into `<film>/measure/`; never start a server, install, collect assets or ask
the user; answer per page with the result's path, the screenshot's path, its `ready.status` and its
`reasons`. Read every screenshot it returns; a page still `inconclusive` after it dealt with the
reasons is yours to measure again. Collect the assets from the measurements once every measurer
has answered. One Act, or no Agent tool: measure it yourself.

Completion: two measurements, each `ready` or its reasons noted for the hand-over, and two
screenshots per Act being written, and every asset an element will name is in `assets/`.

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
- **snap** `x jumps N px in one frame` or `x pops`: at 60 fps, the MP4's rate, one frame moves,
  resizes or fades it far more than the frames beside it. Usually an `at` too short for its
  distance (widen it), a waypoint that ends where the next stretch does not start, or an exit
  squeezed into a few frames. A snap the design wants (a hard cut inside one element) takes
  `snapOk: true` with its reason in a comment in the generator.
- **drift** `y pulls N px away from x`: parts of one object come apart in flight because they run
  on different windows: a moving card and its label, a group sharing one `at`, or row neighbours
  such as an icon and its label, also while they enter or leave. Give them the same `g` and `at`
  (lesson 12).
- **tag** `the tag "…" on x covers y`: a spec tag sits over a string on screen. Set `specAt` to
  place it clear, or drop the spec; a few tags per Act are enough.
- **orphan** `x lands … and waits N s before y`: an item lands where its card will be and sits
  alone. Bring the card in right after it (lesson 4).
- **void** `pane p is N% covered for N s`: the old content left and the new has not come. Start
  the arrivals while the exits are still under way.
- **icon** `x's old icon is drawn at N× its start`: a mask icon is drawn to fit its box, so a box
  that grows or shrinks on both axes before the art swaps draws the old glyph at a size neither
  product uses. Start it in the new box with the art inset to the old glyph size (a `pad` class or
  a padded viewBox), or give the art its own short swap before the box changes (lesson 16).
- **time**: a window, `at`, waypoint or chapter steps backwards or leaves 0..1; or a group whose
  stagger does not fit its window (lesson 13: widen the window, give some slots their own `at`, or
  split the group). "player clock" means the engine itself is broken: stop and report it; do not
  patch it in the run.

Completion: `Findings: 0`.

## 9. Visual pass

Geometry cannot see clipped text, ugly paths or wrong colors in the middle state. Serve the film
and look:

```sh
python3 -m http.server <port> -d <film>        # in the background; file:// blocks fonts
```

First the text check: it seeks through the film 30 times a second and measures every visible
string against its own box, which `check.mjs` cannot do in Node. Each result is a **clip**
finding on the checklist (`l.pt1 "Shared with me" overflows its box by 3.1 px, 9.67 to 9.67 s`):
widen the box to fit both strings while they share it, or move `swapAt` so the long string shows
only once the box has grown (lesson 6). Rerun it until it returns none.

Then shoot stills every 0.6 s across each Act being written, then contact sheets.
[tools/frames.mjs](tools/frames.mjs) takes any page object with `evaluate` and `cdp`. In the calls
below, `task.page('p1')` stands for the chosen browser's page object; when it has no such object,
run the same seek and stage screenshot through its own runner:

```js
const { texts, stills } = await import('<skill>/tools/frames.mjs');
const { findings } = await texts(task.page('p1'), { url: 'http://localhost:<port>/index.html', width: <stage w> });
await stills(task.page('p1'), { url: 'http://localhost:<port>/index.html', out: '<film>/frames',
  times: [/* act start + 0.4 … act end, every 0.6 s */], width: <stage w>, prefix: '<act>' });
```

```sh
python3 <skill>/tools/sheet.py <film>/frames <act> <film>/frames/sheet-<act>.png 4
```

**Several Acts.** With 2 or more Acts being written, run the first text check and the first stills
of every Act from one script, one page per Act, the Acts at once (ADR 0034). Each page must keep
rendering while another has focus (its own window, or a browser that keeps every page drawn),
since `frames.mjs` waits on `requestAnimationFrame`. Do not rebuild while it runs.

```js
const { texts, stills } = await import('<skill>/tools/frames.mjs');
// one entry per Act: its key, start and end seconds, still times, and its own page object
const acts = [/* { key, from, to, times, page } */];
const url = 'http://localhost:<port>/index.html';
const out = await Promise.all(acts.map(async (a) => ({ key: a.key,
  findings: (await texts(a.page, { url, width: <stage w>, from: a.from, to: a.to })).findings,
  shot: await stills(a.page, { url, out: '<film>/frames', times: a.times, width: <stage w>, prefix: a.key }) })));
```

Then `sheet.py` for each Act. One Act, or a browser with one page: run the calls above in turn.

When [gold/](gold/) holds a sheet, put each sheet beside it at the same size: a film whose middle
state is emptier, muddier or more crowded than the gold's is the first fix. Then look at every
sheet, and at full size wherever something looks off. Check: text clipped mid-swap,
a traveller whose path reads wrong, text that fades into its ground in the middle state, plates
whose edges show, an icon flying to a place where it means something else, guides and tags that
cover what they explain, an icon or label that is gone because a container listed after it in
`els` covers it (lesson 15). Add each problem to the checklist, fix it in the data, rebuild, recheck
(step 8), and shoot that stretch again.

**The fresh eye.** The run that wrote the scene reads its own sheets with its reasons in mind.
Once the sheets are clean to you, start a reviewer with the Agent tool and the brief in
[REVIEW.md](REVIEW.md), and keep its id: every later round goes to the same reviewer with
SendMessage. Give it the sheets and every still, the gold sheets if any, LESSONS.md and the list of
every `ok`, `clipOk`, `snapOk`, `driftOk`, `iconOk`, `keep` and `sound.mute` in the scene, and nothing else: not the
generator, not the checklist's reasons, not this conversation.

Every item comes back graded A (story and paths), B (readability) or C (finish). Put each on the
checklist, fix it in the data, recheck (step 8), and reshoot the stretches you touched. Then send a
re-review: the new sheets, your answer to each item (fixed, or kept with its reason and the frame
that shows it), and the time stretches your fixes touched. An item that recurs in kind (a second
tag over text, a second row coming apart) is a checker rule waiting to be written: note it for the
hand-over.

The review ends, and the film ships, at the first of:

- a round that returns no A and no B item: the C items go to the hand-over as open;
- the third round's answer: whatever is still open, A and B included, goes to the hand-over as
  open, each with its frame. Between the second and the third round, fix A items only.

Completion: the text check returns nothing, every sheet looked at (beside the gold, when there is
one), the review ended by the rule above, and step 8 still prints `Findings: 0`.

## 10. Publish

`publish_files` with the list in `<film>/.files.json`.

- **New film**: `title` the scene's title, `icon: "film"`, `label` the acts.
- **Existing film**: `slug` and `base_version` from step 2 (and `shared_live` when it is shared),
  the same files, `label` naming the redone act. Every file is republished, so a dropped asset is
  listed in `remove`.

For a new film, or when this run added files, open the live URL once: the Artifact frame blocks
what a local server allows, so check that the fonts and media load, the transport plays, and the
Sound switch is there. Fix and republish if not.

Sound needs no step of its own: `build.mjs` copies `engine/sound.js` and `engine/cuelume.js`, and
the player plays the Cue map from the scene data. The film opens paused, its first Play starts the
sound, and the Sound switch beside Guides mutes it. Change nothing about sound unless the user asks;
a cue the map gets wrong in this film goes in `sound.mute` with its reason (SCENE.md).

Completion: the Artifact is live at its URL and plays.

## 11. Hand over

Give, in this order and nothing else:

1. The link.
2. The Acts, each with its Chapters in one line (`Library: grid · top bar · sidebar · title ·
   tiles · filters · skin`).
3. The Pairs you decided on your own that a reviewer might question, one line each, or "none".
4. What is open, one line each, or "none": review items left by the rule in step 9, with grade and
   frame; a reviewer item you judged wrong, with its frame; a page measured before it came to
   rest, with its reasons; a speed, a language, a stage size or an overlay never shot; every
   `sound.mute`, with its reason.
5. How to redo one Act: "Say `/design-morph <act>` (or 'the library changed, redo it'); only that
   Act is measured again and the film keeps its link."
6. How to get the MP4: "Say 'make the MP4' or run `/design-morph --mp4`."

Then end the turn, unless `--mp4` was given.

## 12. MP4 (only with `--mp4` or when asked)

1. `command -v ffmpeg`; if missing, say "Install ffmpeg (`brew install ffmpeg`) and ask again"
   and stop.
2. Serve the film (step 9). Render every frame of the stage, guides on, no player chrome or
   captions: seek, two `requestAnimationFrame`s, a CDP screenshot of the stage, 60 fps. Width:
   1920 for a landscape stage; for a portrait one, the width that makes the height 1920. In
   chunks of one Act (`from`, `to` in seconds), so no single browser call runs long:

   ```js
   // task.page('p1'): the chosen browser's page object (step 9)
   const { render } = await import('<skill>/tools/frames.mjs');
   await render(task.page('p1'), { url, out: '<film>/render', width: 1920, from, to });
   ```

3. Render the sound: the same cues the player plays, through an offline audio context on the
   film's clock, into one WAV. It needs a fresh load of the film, so run it in its own call:

   ```js
   const { audio } = await import('<skill>/tools/frames.mjs');
   await audio(task.page('p1'), { url, out: '<film>/audio.wav' });   // { cues, seconds, peak }
   ```

   `cues: 0` means a silent film (`sound.off`): encode without the WAV.
4. `sh <skill>/tools/encode.sh <film>/render ~/Downloads/<film-id>.mp4 <film>/audio.wav` (H.264,
   CRF 16, yuv420p, faststart; AAC with its peak at −1 dB).
5. Give the file's path, its length and size, and whether it has sound.
