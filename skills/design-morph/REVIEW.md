# The fresh-eye review

The brief for the reviewer started in step 9. A film gets at most three review rounds: one
**first review** and up to two **re-reviews**, all by the same reviewer, continued with
SendMessage so its bar stays the same. The run gives the reviewer this file, the film's contact
sheets (`<film>/frames/sheet-<act>.png`) and every still behind them (`<act>-<time>.png`), the
gold sheets in [gold/](gold/) if any, [LESSONS.md](LESSONS.md), and the list of every `ok`,
`clipOk`, `snapOk`, `driftOk` and `keep` in the scene with the ids it names. Nothing else: not the
generator, not the checklist's reasons, not the conversation, not the run's plan. The reviewer
judges the picture, not the intent.

## Severity

Every item carries one grade. The grade decides whether the film can ship.

- **A, story and paths**: the change cannot be followed. A stretch with nothing on the canvas,
  things flying through each other, parts of one object coming apart, an old element left behind
  in the new layout, a label landing with no card under it, an icon flying to a place where it
  means something else.
- **B, readability**: a string that matters cannot be read in some frame. Text on a ground of the
  same tone, text clipped, an icon the color of its pill, or a control drawn at a size or shape
  neither product uses (an old glyph swelled to the new button's size).
- **C, finish**: everything else. A tag or guide over text, a color a step off, a dot or a gap a
  few pixels out, the product's own faint inks.

## The first review

You are reviewing a Morph film someone else built: one product's old page turning into its new
page, element by element, skeleton first (grid and layout, then content, then the skin), with
guide lines and spec tags in the new product's accent. Look at **every frame** of every sheet, and
at the full-size still wherever a frame is too small to judge; a sample of frames lets the next
round find what this one skipped. Judge it as the new product's designer would before showing it
to the team: can the change be followed, and can every string that matters be read?

Answer, from a frame each time:

1. **Story.** Can you tell, from the sheets alone, what changed and in what order? Does each
   stretch finish before the next one needs its space?
2. **Middle state.** Where the new layout wears the old skin, is every string that matters
   readable against its ground?
3. **Paths.** Does anything fly through something else, leave a ghost behind, land somewhere it
   means something else, or pop in or out?
4. **Text.** Is any string clipped, overlapping another, or wrapping where it should not?
5. **Guides and tags.** Does a guide or tag cover what it explains?
6. **Beside the gold.** When there is a gold sheet: the one difference, and in which frames.
7. **Exemptions.** For every exemption on the list, judge its frames again: designed, or silenced?

Return one list, A items first, then B, then C. Each item: its grade, the still file and time,
what you would screenshot, and the fix in one line. Then the frames you could not judge from
stills (a pop between two frames, speed). If there is nothing, say "nothing".

## A re-review

The builder fixed what it could and reshot. You get the new sheets and stills, your own last list,
and the builder's answer to each item (fixed, or kept with a reason and a frame). Answer only:

1. For each of your items: resolved, or still there (with the new frame).
2. For each item kept with a reason: does the frame bear the reason out?
3. In the stretches the fixes touched (the builder names them), any new **A** or **B** item.

Do not review untouched stretches again and do not add C items: the first review had its look.
Return the same kind of list.

## Rules of the review

- The bar for an item is a frame. Quote the still and the time.
- Rank by how much of the film it spoils, not by how easy it is to fix.
- An exemption the builder granted is not settled: judge the frame again.
- Do not fix anything. Do not soften an item because the film is nearly done.
- The products' own conventions are not faults: the old product's dark skin, the new product's
  type, colors, radii and faint inks are what the film is about. The skin turn passes through mid
  tones; judge whether text reads there, not the grey itself.
