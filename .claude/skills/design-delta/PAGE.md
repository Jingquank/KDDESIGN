# The page and the Record

The page is the fixed **viewer** in [viewer/](viewer/): `index.html` (template), `viewer.css`, `viewer.js`, `frame.js`, `build.py`. A run never writes page code. It writes `delta.json`, the Change files, and at Final the Record. A missing feature or a viewer bug is fixed in `viewer/` once, for every future run.

## Carrier folder

`<scratchpad>/design-delta/<folder>/`, published from there:

```
2026-10-22-checkout-polish/
├── delta.json          the data (step 3–5)
├── index.html          written by build.py
├── viewer.css  viewer.js
├── c1/ before-1440.webp  after-1440.webp  before-390.webp  after-390.webp
├── c2/ before.html  after.html  (+ whatever a Rebuilt or Real state needs)
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
      "compare": "side", "widths": [1440, 390],
      "before": { "src": { "1440": "c1/before-1440.webp", "390": "c1/before-390.webp" }, "live": "https://…preview-a.vercel.app/checkout" },
      "after":  { "src": { "1440": "c1/after-1440.webp",  "390": "c1/after-390.webp" },  "live": "https://…preview-b.vercel.app/checkout" },
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
- **before / after**: `null` for a side that does not exist (a New surface has no Before; a removed one has no After). For Screenshot, `src` maps width → image. For Rebuilt and Real, `src` is one HTML file and `widths` are the frame widths it renders at. `live` is optional: a link to that state running somewhere (a preview deployment).
- **compare**: `"slider"` only when Before and After are within 10% of each other in width and height at the first width; otherwise `"side"`. The viewer disables the slider when a side is `null`.
- **caption**: set at Final from the user's Note.
- Every string is plain text; the viewer escapes it.

## What the viewer does

Header (title, Round 1 or Final, scope line, counts), a Change index, one sheet per Change (description, Kind control or badge, Fidelity tag, width and comparison switches, live links, the stage, Note field or caption, Source), the Skipped list, and in Round 1 a bottom bar with **Clear**, **Show Notes** and **Copy Notes**. Side by side stacks below 760px. Frames load near the viewport and unload far from it, so the page never holds more live WebGL contexts than a browser allows. Edits live in browser storage under `dd:<folder>:r1` and travel by paste. Final hides every edit control and turns the counts into a New / Fix filter.

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

`docs/DesignDelta/<folder>/delta.md` in the project, written at Final, with `thumbs/`. It is the only part of a DesignDelta in git: text a future agent can read, the way an exemplar records a shipped decision.

```markdown
# Checkout Polish
Branch feat/checkout · 4c3b2af (20 Oct) → 1f0d1e5 (21 Oct) · Page: <artifact url>
After: 1f0d1e5 · snapshot: refs/design-delta/2026-10-22-checkout-polish (only when the tree was dirty)

## c1 · Pay button · Fix
Checkout, step 3. One-sentence description.
Why: <the user's Note, or "—">
Commits: 0617e06 · Files: src/checkout/PayButton.tsx
![Before](thumbs/c1-before.webp) ![After](thumbs/c1-after.webp)

## Skipped
- 5e0816d · src/utils/lazy.ts: Performance only; nothing visible changes.
```

- **Thumbnails**: one Before and one After per Change at the first width, WebP, at most 960px wide and 150 KB each; for Rebuilt and Real, a screenshot of the frame. Thumbnails are optional when a side is `null`.
- The `After:` line is what the next DesignDelta reads to set its Baseline.
