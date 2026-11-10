# The Nudge draws a heads-up display of the branch

The Nudge's band was built for a question and a progress bar: a red rule with the skill's name, a line of what had Settled, three keys, and during a run a block bar creeping through five milestones. ADR 0041 to 0045 took most of its jobs away. Nothing is guessed any more, a run needs no watching, a Changelog needs no approval, and what the user actually wants to know has changed: what was pushed and is being recorded, how close the next Design Lessons Review is, whether the pages were saved, and whether this session or another is doing the recording.

KD prototyped eleven ways to redraw it, kept the one that drew the branch as a timeline, took that through six further versions, and tested the last four on a cell-exact terminal at six widths in two languages. The pick:

- **The branch is a strip.** Solid blocks are the Deltas recorded since the last Review (the newest carries its title), ticks are the commits in the pushed range, `▲ now` ends it. A run under way is a red block growing over the commits with a shine travelling through it; a refused or broken start is a `╳` where it stopped; a Review is five blocks under one bracket.
- **Readouts sit at fixed places around it**, inside corner brackets: the branch and range top left, a countdown to the Review top right (two-row block digits from 80 columns), the pages with `B` and `A` marks bottom left, the claim bottom right.
- **One state word says where things stand**: `ARMED`, `REC`, `SAVED`, `HOLD` when a key is needed, `FAIL`, `STBY`. They are instrument markings and stay in Latin capitals in every language; everything else is in the user's language.
- **Keys sit on the bottom edge**, the same choices as before.
- **It folds.** A run the mod started by itself opens the display, which reverses ADR 0041's "a passive run never takes the band": the display is where the count and the pages are, and one key folds it to a row in the status line. The fold is remembered per project, so a user who folds once is not shown it again; `/nudge` opens it. When the band shows nothing, one row may still speak: a page was saved before an edit (which is why the edit waited), a Delta was recorded, another session is recording.
- **It is laid out in cells** (`hooks/hud.ts`): a model in, rows of measured segments out, never wider than the terminal. Four widths: under 56 columns the word, the strip, one sentence and the keys; under 80 the frame with a plain `4/5`; under 120 the full display; from 120 a longer strip and the project's name.

Three things the display made possible, built with it:

- **The Review is judged in the terminal.** `/design-lessons --background` now hands over its items (`candidates`: id, the drafted sentence, the user's own words), and the display puts them to the user one at a time: Accept, Reject, Watch, Back. The last answer sends every Verdict into the conversation in the user's name, as pasted Verdicts would arrive, with no Notes. A Note still needs the page, which is one key away, and a run that hands over no items keeps the four older keys.
- **No pictures is asked about before it happens.** When pictures have worked in this clone before (a dev server is on record) and none answers after a push, the display reads `NO IMG` and asks, even with `(auto)`: look again once the server is up, record without pictures, or leave it. The mod does not start the server itself; which command, and what to do with a process that outlives the session, are not its to decide.
- **A scanline** steps down the rows while a run is under way: a change of ground colour on one row at a time, so no character moves.

What is given up: the red rule `█══╡ design-delta ╞══`, which was the Nudge's signature and told a parked Nudge from other status lines at a glance. The corner brackets and the state word take its place.
