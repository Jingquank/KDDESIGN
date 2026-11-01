# design-morph evals

Engine layer only. The model's mapping judgement (which old element becomes which new one) has no
flow-level eval in v1; a run's `--plan` output is the place to read it.

## Checker (code, about a second, no browser)

```sh
node evals/run.mjs
```

Builds and checks every sample with `engine/build.mjs` and `engine/check.mjs`, and must print
`All 16 passed`. Run it after any change to `engine/`.

| Case | Must report | The bug it reproduces |
|---|---|---|
| `clean/` | 0 findings | — a two-pane gallery: a room, rows moving, an exit, a title move, cards with labels, a panel entering |
| `broken/exit-without-op/` | **leftover** `r.settings` | a leaving row whose new state lost `op: 0`, so the engine moved it and it stayed (a page title's icon left behind as a ghost) |
| `broken/label-leaves-card/` | **outside** `c.oneL` crosses `c.one` | the card lands first and its label climbs in after, across the card's edge (filter labels climbing into their panel) |
| `broken/siblings-overlap/` | **overlap** `c.one × c.two` | two cards swap places and pass through each other (two switches swapping places) |
| `broken/time-backwards/` | **time** window `panel`, chapter `cards` | a window that ends before it starts and a chapter before the one ahead of it |
| clock without clamps | **time** player clock | `clean/` with the reference player's unclamped clock swapped in: a negative `dt` reached `ACTS[-1]` |
| `clean-own-group-via/` | 0 findings | a waypoint in the element's own group: the engine gave it no layout window and it jumped across the stage at t 0.5 (a balance icon, 1005 px in one frame) |
| `broken/snap/` | **snap** `h.title` | an `at` shorter than a frame: the title jumps 436 px at once |
| `broken/drift/` | **drift** `c.oneL` from `c.one` | a label on a later window than its card slides inside it in flight |
| `broken/row-drift/` | **drift** `r.homeI` from `r.home` | an icon and the label beside it on two windows: the row comes apart mid-move (the sidebar rows, four review rounds running) |
| `broken/tag/` | **tag** on `r.gallery` | a row's spec tag drawn above it lands on the row before (tags over text, five review rounds running) |
| `broken/orphan/` | **orphan** `p.head` | the panel heading lands and waits 0.9 s for its card (labels floating with no card) |
| `broken/void/` | **void** `m.pane` | the old cards leave early and the new ones arrive late: an empty canvas for 2.4 s (a home page's hero) |
| `broken/icon-grows/` | **icon** `h.search` | a 16 px icon moving into a 40 px box draws the old glyph at 40 px until the skin turns (a music player's controls swelling into huge buttons) |
| `broken/css-animation/` | build refuses | `@keyframes`, `animation` and `transition` in `scene.css`: the wall clock drives them, so a seek and the MP4 cannot |

Each broken sample is `clean/` with one change, so a new false positive in the checker shows up
as an extra finding there. A new checker rule gets a broken sample of its own here.

## Text check (a browser, seconds)

After a change to `tools/frames.mjs`'s `texts()` or the element markup in `engine.js`, build
`clean/`, serve it, and run `texts()` on it: it must return no findings. Then shrink `h.title`'s
new `w` to 60 and run it again: it must report `h.title "Gallery"`.

## Portrait (a browser, minutes)

`portrait/` is a 390 × 844 stage with two languages. After a change to `player.js`,
`index.html` or `tools/`, serve it, open it in the user's chosen browser, and check that the
stage is centered with the transport under it, `中` switches the captions, and a one-second
`render` encoded by `tools/encode.sh` gives an H.264, yuv420p, 60 fps file of the stage alone.

## Plan run

`/design-morph --plan <artifact link or pages>` measures, maps and writes the scene data, runs
the checker once, and prints the plan table without a visual pass or a publish. Use it to try a
change to SKILL.md or LESSONS.md cheaply on a real product.
