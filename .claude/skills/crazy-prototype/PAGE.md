# The page

One HTML file at a stable scratchpad path, `<scratchpad>/crazy-prototype/<slug>.html`, redeployed in place every Round. The `artifact-design` page contract governs the file (skeleton, title, CDN allowlist, three-state theme tokens, gutters, storage rules); this file adds the crazy-prototype anatomy on top.

## Anatomy, top to bottom

1. **Header.** Page title, `Round N` label, the language toggle (`EN | 中`), the theme toggle when the design system has both themes, and a live Pick counter.
2. **Brief.** The Brief as a short list, visible at rest, so every Design is read against it.
3. **Designs**, one section each, numbered `1…n` in list order:
   - Number, name, one-line thesis, and the axis it varies on.
   - **Whole-Design checkbox**: "Take this whole Design".
   - The Design's mock, rendered inline.
   - **Ideas** in a grid: each Idea is a card with its own rendered mock or detail, a title, a one-line description, a **checkbox**, and a **note field**.
   - **Design note field** at the end of the section.
4. **Bottom bar**, fixed: the Pick counter, **Copy Pick sheet**, and a **Show sheet** link that reveals the sheet text in a read-only textarea.

## Ids

Designs are `d1…dn`, Ideas are `d1.1…`. Every checkbox and note field carries a stable `id` built from these, so republishes preserve form state and the browser check can address them.

## Mocks

- Real HTML and CSS, interactive only where it costs nothing, read-only: no real mutations, no network.
- Faithful to the product: its design system tokens when a project has one, its own copy language, its theme. Each mock sits in a frame with an explicit background from the product's palette, so it stays faithful even when the page chrome is in the other theme.
- Designs differ structurally. Repeats to avoid on one page: the same hero-then-cards skeleton under different colors, every Design centered, one sidebar-and-table reused, one typeface for all. Ideas inside a Design are distinct decisions.
- Non-screen content: copy as typeset cards, flows as native mermaid blocks (`<pre class="mermaid">`), concepts as mini landing sections, pricing as tables.
- Frames shrink to phone width without horizontal page scroll; a frame that cannot reflow scales down inside its own container.

## Bilingual page text

- Every page string the agent writes (titles, theses, Idea descriptions, labels, placeholders, toasts, the Brief) exists in both `en` and `zh`, held in one dictionary and swapped by the toggle without reload. Mock copy is not in the dictionary.
- English shows first. The toggle sets `lang` on the root element and remembers the choice under `cp:lang`.

## Theme

- Page chrome follows the artifact-design three-state token contract regardless of toggle.
- When the design system defines both themes, the toggle sets `data-theme` on the root, the mock frames switch palettes with it, and the choice is remembered under `cp:theme`. Default is the viewer's system preference.
- When it defines one theme there is no toggle; mock frames keep that theme in both chrome states.

## Picks in the browser

Picks live in browser storage and travel by paste, never an artifact database: the paste is the user's explicit "done reviewing" signal.

- State shape, one object per Round under `cp:<slug>:r<N>`:
  `{ "d2": { "whole": true, "note": "…", "ideas": { "d2.1": { "picked": true, "note": "…" } } } }`
- Write on every change, read on load, every access in try/catch; the page renders unticked when storage is unavailable.
- A new Round uses a new key. Earlier Rounds' keys are left alone.
- A **Clear picks** control in the bottom bar resets the current Round after an in-page confirmation (no `confirm()` dialogs).

## Pick sheet

Markdown, grouped by Design, produced from the state at click time:

```
# Pick sheet · <Title> · Round N
<k> Picks across <m> Designs

## Design 2 · Sidebar first ☑ whole design
- [x] 2.1 Sticky filters — note: keep, but lighter
- [x] 2.3 Inline rename
- [ ] 2.2 Bulk actions — note: only if cheap
- Design note: header from here, sidebar from Design 4

## Design 4 · Canvas
- [x] 4.2 Infinite zoom

Paste this back to start Round N+1.
```

- A Design appears when it has a whole-Design tick, a Pick, or any note. An unpicked Idea appears only when it carries a note.
- Numbers match the page so the agent can find each Idea.
- **Copy Pick sheet** calls `navigator.clipboard.writeText` inside the click handler, shows a "Copied" toast, and on rejection reveals the sheet textarea with its text selected and the toast "Select and copy".

## Controls

Labelled checkboxes, visible focus states, `prefers-reduced-motion` respected, tabular numerals on counters. The bottom bar adds the safe-area insets to its padding.
