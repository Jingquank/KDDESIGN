# Lessons

Defaults that keep every in-between frame sound: do it this way unless the measurements make it
impossible. The checker catches the ones marked **(check)**; the visual pass catches the rest.

1. **Exits say `op: 0`.** An element whose new state is `op: 0` (or that has no `n`) is an exit.
   A new state with only `x, y` makes it a move that never leaves, such as an icon left behind
   as a ghost beside a title. **(check: leftover)**

2. **Make room first.** When the new layout adds a pane (a sidebar, a filter column), the old
   content first scales into the space it will own (`room` on the act), with the same window as
   the panes. Only then does the new pane enter, into empty space.

3. **Vacate before arriving.** Order groups so a destination is empty before anything arrives:
   the Library reorders its tiles first, then builds the filter panel in the freed column. A row
   in the way gets a waypoint (`via`, `via2`) that parks it somewhere empty. Two things that swap
   places cross unless one dips out of line first (the credits bolt: a `via` 80 px down).
   **(check: overlap)**

4. **Containers after travellers.** When moving labels end inside a new card, the card fades in
   under them after they arrive, not before. A traveller crossing a visible card edge reads as
   spilling out, such as filter labels crossing into an already-visible panel card. Labels landing
   lowest row first never cross each other. **(check: outside)**

5. **Fade in place.** An icon whose meaning changes fades where it stands (`travel: 0`) while the
   new icon enters. Do not fly an icon to a place where it means something else. The same goes
   for anything whose path would cross a whole column of rows: the profile avatar fades at its row
   and the account avatar enters at the bottom. **(check: overlap)**

6. **Text boxes fit both strings, and no more.** During a content swap the box is wide enough for
   the old and the new text, or a long label such as "Character Refine" clips mid-move. At the
   end it is no wider than the room it has, or a short label's box runs over the next column.
   **(check: outside, for the end)**

7. **Skins.** The middle state is "new structure in old skin" (`oldSkin`). White text stays light
   on a dark old skin (`oldSkin.text`), and plates need a fade overlay (`.plfade`, `fadeTo`) so
   their edges do not show. A traveller that lands on a pane from another layer names that pane
   in `skinWith`, so its text turns with its ground instead of vanishing against it (content of
   a clipped pane already does).

8. **Round clip layers.** Each pane is a clipped layer (`clip` on the layer), so its content
   clips to the same corner shape as the pane. **(check: outside, for the layer)**

9. **Exit drift is short.** Exits drift at most 28 px toward where they fold into; anything
   further reads as a move. Set `travel` lower, never higher.

10. **Hybrid fidelity.** Chrome and type are rebuilt live from measurements; photos and video
    frames are screenshot crops. The same curated clips are used on both sides, so tiles travel
    one to one, and tiles keep their rows and columns where they can: an affine move never
    crosses.

11. **Real assets.** Pull every icon from both apps (from the DOM with `tools/measure.js`, or the
    source code) into `assets/icons.json` as data URIs, and the after-project's font file into
    `assets/`. Never draw placeholder icons.
