# The page and the Record

The page is the fixed **viewer** in [viewer/](viewer/): `index.html` (template), `viewer.css`, `viewer.js`, `frame.js`, `still.py` (encodes stills), `build.py`, `validate.py`. A run never writes page code. It writes `delta.json`, the Change files, and at Final the Record. A missing feature or a viewer bug is fixed in `viewer/` once, for every future run.

## Carrier folder

`<scratchpad>/design-delta/<folder>/`, published from there:

```
2026-10-22-checkout-polish/
├── delta.json          the data (step 3–5)
├── index.html          written by build.py
├── viewer.css  viewer.js
├── c1/ before-1440.avif  after-1440.avif  before-390.avif  after-390.avif
├── c2/ the same stills, + after.html (a Rebuilt or Real frame, Round 1 only)
└── …
```

## delta.json

```json
{
  "title": "Checkout Polish",
  "round": "1",
  "folder": "2026-10-22-checkout-polish",
  "path": "docs/DesignDelta/2026-10-22-checkout-polish",
  "project": "acme-web · /checkout",
  "scope": {
    "branch": "feat/checkout",
    "baseline": { "sha": "4c3b2af", "date": "20 Oct", "note": "where the branch left main" },
    "after": { "sha": "1f0d1e5", "date": "21 Oct", "note": "branch tip" }
  },
  "theme": {
    "light": { "paper": "#fcfcfc", "surface": "#f1eeea", "ink": "#29231e", "muted": "#74685a",
               "accent": "#00e13f", "accent-ink": "#29231e", "media": "#d9d9d9" },
    "dark": { "paper": "#151110", "surface": "#221d18", "ink": "#f4f1ec", "muted": "#a5988a", "media": "#2e2a25" },
    "font": { "family": "Satoshi", "src": "data:font/woff2;base64,…" },
    "radius": 24
  },
  "strings": {},
  "changes": [
    {
      "id": "c1", "title": "Pay button", "kind": "fix",
      "desc": "One sentence: what was there, what is there now.",
      "surface": "Checkout, step 3",
      "fidelity": "screenshot", "fidelityNote": "Layout change; nothing to operate.",
      "widths": [1440, 390],
      "before": { "src": { "1440": "c1/before-1440.avif", "390": "c1/before-390.avif" }, "live": "https://…preview-a.vercel.app/checkout" },
      "after":  { "src": { "1440": "c1/after-1440.avif",  "390": "c1/after-390.avif" },  "live": "https://…preview-b.vercel.app/checkout",
                  "frame": null },
      "commits": [{ "sha": "0617e06", "subject": "redesign checkout" }],
      "files": ["src/checkout/PayButton.tsx"],
      "caption": ""
    }
  ],
  "skipped": [{ "what": "5e0816d · src/utils/lazy.ts", "why": "Performance only; nothing visible changes." }],
  "url": null
}
```

- **theme**: the project's design-system values under the viewer's seven token names. Omit `dark` when the system has one theme: the page then has no theme toggle. `font.src` is a `data:` URI (a font file the page links to may be blocked).
- **strings**: overrides for every label the viewer prints, in the product language. Keys are in `viewer.js` (`S`). Leave empty for English.
- **before / after**: `null` for a side that does not exist (a New surface has no Before; a removed one has no After). `src` always maps width → still, at every Fidelity. `frame` is one HTML file, set only on a Rebuilt or Real side that responds, rendered at the same `widths`; Round 1 shows it instead of the still, Final never does. `live` is optional: a link to that state running somewhere (a preview deployment).
- **caption**: set at Final from the user's Note.
- Every string is plain text; the viewer escapes it.

## What the viewer does

Header (title, Round 1 or Final, scope line, counts), a Change index, one sheet per Change (description, Kind control or badge, Fidelity tag, width switch, live links, Before beside After, Note field or caption, Source), the Skipped list, and in Round 1 a bottom bar with **Clear**, **Show Notes** and **Copy Notes**. Before and After stack below 760px. Frames load near the viewport and unload far from it, so the page never holds more live WebGL contexts than a browser allows. Edits live in browser storage under `dd:<folder>:r1` and travel by paste. Final hides every edit control, turns the counts into a New / Fix filter, and is static: every side shows its stills and `live` links, no frame loads, and `build.py` maps every other file to `null` so the Artifact drops the Round 1 frames and what they loaded.

## Notes

What **Copy Notes** produces:

```
# Notes · Checkout Polish · Round 1
Folder: docs/DesignDelta/2026-10-22-checkout-polish
2 of 9 Changes edited

## c3 · Pay button · Fix → New
- Note: this was a new primary action, not a fix

Every other Change keeps the agent's Kind.
```

With no edits it reads `No edits` and `Make it Final as is.`

## The Record

`docs/DesignDelta/<folder>/delta.md` in the project, written at hand-over and updated at Final. It is the only part of a DesignDelta in git, and it is text only: no images. The pictures live in the Final page; the commits rebuild either state at any time. Like an exemplar recording a shipped pull request, it keeps what a future agent or designer needs to repeat a decision or avoid a mistake. A worked example from a real run: [evals/record-sample.md](evals/record-sample.md).

```markdown
# Checkout Polish
Branch feat/checkout · 4c3b2af (20 Oct) → 1f0d1e5 (21 Oct) · Page: <artifact url>
After: 1f0d1e5 · snapshot: refs/design-delta/2026-10-22-checkout-polish (only when the tree was dirty)
Review: reviewed 23 Oct (Final)   (or: not reviewed (Round 1))
9 Changes: 2 New, 7 Fix · 3 Skipped

## c1 · Pay button · Fix
Surface: Checkout, step 3
Decision: The pay button is full width and sits under the total.
Why: Users missed it beside the coupon field. (Note)
Before → After: 160px button beside the coupon field → full-width button under the total; label 14 → 16px.
Repeat: —
Avoid: Primary actions sharing a row with secondary inputs. (conversation 21 Oct)
Rule candidate: `rule/primary-action-own-row`: a step's primary action gets its own row. Pending.
Evidence: 0617e06 redesign checkout · src/checkout/PayButton.tsx · Page: c1

## Skipped
- 5e0816d · src/utils/lazy.ts: Performance only; nothing visible changes.
```

- **Review** says whether the user checked the Kinds and Notes. A later reading across many Records weighs a reviewed Record's lessons above an unreviewed one's, which is the agent's reading alone.
- **Decision** is the Change's `desc` as it stands. **Before → After** names the visible difference, with the values that changed when the diff has them (sizes, tokens, copy).
- **Why**, **Repeat** and **Avoid** each end with their source in brackets: `(Note)`, `(conversation <date>)`, `(commit <sha>)`. With no source the line is `—`. Never infer a reason, a lesson or a rule the sources do not state.
- **Rule candidate** appears only when Repeat or Avoid has a source. It names a stable id (`rule/<kebab-slug>`), one observable sentence, and `Pending`. Promoting it into the project's design rules is the user's call; the Record never edits them.
- **Evidence** lists the commits with subjects, the files, `live` links when they exist, and the Change's id on the Final page (the header's Page link).
- The `After:` line is what the next DesignDelta reads to set its Baseline.
