# Gold sheets

Contact sheets of films that passed every check and a fresh-eye review with nothing open, one per
act, named `<film-id>-<act>.jpg` (JPEG, about 2900 px wide, as `tools/sheet.py` writes them at 4
columns). Step 9 puts a new film's sheets beside these; REVIEW.md gives them to the reviewer.

Empty for now. The first film was checked against the new rules on 2026-10-31: after
its data fixes, `check.mjs` and the text check were clean, but the fresh-eye review returned nine
items (a muddy middle state in the sidebar, chip labels travelling to an empty filter column, the
account row crossing a tile, the grid not making room first, a white icon on a white segment,
tags over text and past the stage edge, guides staying into the skin). It becomes gold once those
are fixed and a second review returns nothing.
