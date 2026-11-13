# The page and the Delta

The page is the fixed **viewer** in [viewer/](viewer/): `index.html` (template), `viewer.css`, `viewer.js`, `frame.js`, `still.py` (encodes stills), `build.py`, `validate.py`. A run never writes page code. It writes `delta.json`, the Change files, and the Delta. A missing feature or a viewer bug is fixed in `viewer/` once, for every future run.

## Carrier folder

`<scratchpad>/design-delta/<folder>/`, published from there:

```
2026-10-22-checkout-polish/
├── delta.json          the data (step 3–5)
├── index.html          written by build.py
├── viewer.css  viewer.js
├── c1/ before-1440.avif  after-1440.avif  before-390.avif  after-390.avif
├── c2/ the same stills, + after.html (a Rebuilt or Real frame)
├── raw/  captures waiting to be encoded as stills; never published
└── …
```

## delta.json

```json
{
  "title": "Checkout Polish",
  "folder": "2026-10-22-checkout-polish",
  "path": "docs/deltas/2026-10-22-checkout-polish.md",
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
- **before / after**: `null` for a side that does not exist (a New surface has no Before; a removed one has no After). `src` always maps width → still, at every Change fidelity. `frame` is one HTML file, set only on a Rebuilt or Real side that responds, rendered at the same `widths`; the page shows it in the still's place. `live` is optional: a link to that state running somewhere (a preview deployment).
- **caption**: optional, one line under the description for what a reader must know about the pictures ("Before not saved"). Usually empty.
- Every string is plain text; the viewer escapes it.

## What the viewer does

Header (title, scope line, counts that filter by New or Fix), a Change index, one sheet per Change (description, caption, Kind badge, Change fidelity tag, width switch, live links, Before beside After, Source) and the Skipped list. Before and After stack below 760px. Frames load near the viewport and unload far from it, so the page never holds more live WebGL contexts than a browser allows. The page has one form and no edit controls: nobody reviews it (ADR 0043), and a correction the user asks for is made in `delta.json` and republished (SKILL.md, Corrections).

## The Delta

`<folder>.md` in the project's **Deltas folder** (below), written at hand-over. It is the only part of a run meant for git, and it is text only: no images. The pictures live in the page; the commits rebuild either state at any time. Like an exemplar recording a shipped pull request, it keeps what a future agent or designer needs to repeat a decision or avoid a mistake. A worked example from a real run is kept on this machine only, in `evals/private/delta-sample.md` (gitignored).

```markdown
# Checkout Polish
Branch feat/checkout · 4c3b2af (20 Oct) → 1f0d1e5 (21 Oct) · Page: <artifact url>
After: 1f0d1e5 · snapshot: refs/design-delta/2026-10-22-checkout-polish (only when the tree was dirty)
9 Changes: 2 New, 7 Fix · 3 Skipped

## c1 · Pay button · Fix
Surface: Checkout, step 3
Decision: The pay button is full width and sits under the total.
Why: “the pay button gets lost next to the coupon field” (conversation 21 Oct · 84716829)
Before → After: 160px button beside the coupon field → full-width button under the total; label 14 → 16px.
Repeat: —
Avoid: Primary actions sharing a row with secondary inputs. (conversation 21 Oct · 84716829)
Rule candidate: `rule/primary-action-own-row`: a step's primary action gets its own row. Pending.
Twin: src/ui/Button.tsx · follows
Breaks: `rule/icon-buttons-have-labels`: the new coupon remove icon has no label or tooltip. (commit 0617e06)
Evidence: 0617e06 redesign checkout · src/checkout/PayButton.tsx · Page: c1

## Skipped
- 5e0816d · src/utils/lazy.ts: Performance only; nothing visible changes.
```

- **Decision** is the Change's `desc` as it stands. **Before → After** names the visible difference, with the values that changed when the diff has them (sizes, tokens, copy).
- **Why**, **Repeat** and **Avoid** each end with their source in brackets: `(conversation <date> · <session>)` with the first 8 characters of the transcript's session id, or `(commit <sha>)`. A line sourced to a conversation quotes the user's own words, in their language, before the source. With no source the line is `—`. Never infer a reason, a lesson or a rule the sources do not state.
- **Twin** appears on a Change that adds or reworks a control or a component (SKILL.md step 3, Twins): the path of the piece that already does its job, then `follows`, `none`, or `differs:` with what differs, as in `Twin: src/ui/Select.tsx (12 uses) · differs: src/settings/RoleSelect.tsx (1 use) has its own markup, radius 12 → 8 in Select (twin 0617e06)`. Its source is written `(twin <sha>)`: the commit that brought the difference. A job with several pieces that differ lists every one, each with its count of files that import or render it.
- **Rule candidate** appears only when Repeat or Avoid has a source, or the `Twin:` line says `differs`. It names a stable id (`rule/<kebab-slug>`), one observable sentence, and `Pending`. A mismatch's candidate is `rule/twin-<job>` (`rule/twin-select`), whose sentence names the piece with the most uses, ties going to the older file: `every select is built from src/ui/Select.tsx`; its source is the `Twin:` line's, and its Why stays `—` unless another line states one (ADR 0047). Promoting it into the project's design rules is the user's call, made in a `/design-lessons` Design Lessons Review; the Delta never edits them, and a candidate that is already a Rule is not proposed again.
- **Breaks** appears when the project has design rules (SKILL.md step 1) and the After of this Change does what a Rule's sentence forbids within its Scope and outside its Exceptions, or does the job of a Rule's `Twin:` without building from that piece: the rule's id, what breaks it, and the source. One line per broken Rule; a Change that follows every Rule gets no line. `/design-lessons` re-reviews a Rule broken twice.
- **Evidence** lists the commits with subjects, the files, `live` links when they exist, and the Change's id on the page (the header's Page link).
- The `After:` line is what the next run reads to set its Baseline.
- A source reads `(conversation <date> · <session>, stated)` when the user's words state the lesson as a general preference ("primary buttons always get their own row"), not as a remark on this one place. One stated source is enough for `/design-lessons` to put a candidate up for review.
- A **passive** Delta (SKILL.md, Passive run) has a page only when page snapshots gave it stills; without one its header drops `Page:` and its Evidence drops `Page: c<N>`, as does the Evidence of a Change that has no still.
- Deltas written before ADR 0043 carry a `Review:` line, which nothing reads any more, and may carry `(Note)` sources, the user's own words typed on the page; a `(Note)` weighs as a stated source does.

## Where Deltas live

The **Deltas folder** is `docs/deltas/` unless a pointer line names another. The first `Design deltas:` line in `AGENTS.md`, `CLAUDE.md` or `CLAUDE.local.md`, in that order, wins; its first word is the folder, relative to the repo root:

```
Design deltas: design/deltas/ — one Delta per /design-delta run; read them before repeating a design decision.
```

`(local)` right after the folder says it is kept out of git on purpose; that line lives in `CLAUDE.local.md`, since it is one person's choice:

```
Design deltas: docs/deltas/ (local) — kept on this machine; /design-lessons here reads only this machine's Deltas.
```

`(auto)` right after the folder says the Nudge records what is pushed by itself and commits each Delta (SKILL.md, Passive run; ADR 0041); `(manual)` says the user chose to be asked. Either is written by `/design-delta` after its one question (SKILL.md step 7), or by hand:

```
Design deltas: docs/deltas/ (auto) — recorded by KDDESIGN when UI work is pushed; read them before repeating a design decision.
```

**Ignored folder.** Many shared repos ignore `docs/`, and then a Delta written there never reaches git, silently: the skill never commits, so nobody notices, and teammates' agents and their `/design-lessons` never see it. So before writing a Delta, unless the line marks the folder `(local)`, run `git check-ignore -v <folder><name>.md`. When it prints a match, git ignores the Delta. Ask once with `AskUserQuestion`, naming the ignoring rule and its file, three options, recommended first:

1. **Move to a tracked folder**: `design/deltas/`, or a folder the user names; check it with `git check-ignore` too. Move any Deltas already in the old folder there, and write the pointer line into the file that holds the `Design rules:` line, else by `/design-lessons`' Record order (its SKILL.md step 5).
2. **Un-ignore the folder**: offered only when the matching rule is in a `.gitignore` inside the repo (not `.git/info/exclude` or a global excludes file, which are not the team's to change). Add `!<folder>` after it. git cannot re-include a path whose parent folder is ignored, so a rule that ignores a parent folder (`docs/`, `/docs`) is rewritten to ignore its contents instead (`docs/*`, `/docs/*`), which ignores the same files. Run `git check-ignore` again; if it still matches, say so in one line and fall back to option 1. No pointer line is needed.
3. **Keep it on this machine**: write the `(local)` line into `CLAUDE.local.md`, creating it. If git does not already ignore `CLAUDE.local.md`, add it to `.git/info/exclude`, so a personal choice is never committed.

The answer is kept in the pointer line or `.gitignore`, so it is asked once per clone. With `--background`, ask nothing: write the Delta where it goes and set the hand-over's `note` to "<folder> is ignored by git, so this Delta stays on this machine; the next hand run of /design-delta asks where Deltas should live." With `--plan`, check nothing.
