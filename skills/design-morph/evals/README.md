# design-morph evals

Engine layer only. The model's mapping judgement (which old element becomes which new one) has no
flow-level eval in v1; a run's `--plan` output is the place to read it.

## Checker (code, about a second, no browser)

```sh
node evals/run.mjs
```

Builds and checks every sample with `engine/build.mjs` and `engine/check.mjs`, and must print
`All 10 passed`. Run it after any change to `engine/`.

| Case | Must report | The bug it reproduces |
|---|---|---|
| `clean/` | 0 findings | — a two-pane gallery: a room, rows moving, an exit, a title move, cards with labels, a panel entering |
| `broken/exit-without-op/` | **leftover** `r.settings` | a leaving row whose new state lost `op: 0`, so the engine moved it and it stayed (the Mix title's ghost icon) |
| `broken/label-leaves-card/` | **outside** `c.oneL` crosses `c.one` | the card lands first and its label climbs in after, across the card's edge (the Library "Video" and "Characters" labels) |
| `broken/siblings-overlap/` | **overlap** `c.one × c.two` | two cards swap places and pass through each other (the switches over the icons in Mix) |
| `broken/time-backwards/` | **time** window `panel`, chapter `cards` | a window that ends before it starts and a chapter before the one ahead of it |
| clock without clamps | **time** player clock | `clean/` with the reference player's unclamped clock swapped in: a negative `dt` reached `ACTS[-1]` |
| `clean-own-group-via/` | 0 findings | a waypoint in the element's own group: the engine gave it no layout window and it jumped across the stage at t 0.5 (the Library balance bolt, 1005 px in one frame) |
| `broken/snap/` | **snap** `h.title` | an `at` shorter than a frame: the title jumps 436 px at once |
| `broken/drift/` | **drift** `c.oneL` from `c.one` | a label on a later window than its card slides inside it in flight |
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
