---
name: crazy-prototype
description: Turn any design brief or idea into one Artifact page packed with pickable prototypes. Tick or ✗ each Idea, copy the Pick sheet, paste it back, and the next Round builds on it.
disable-model-invocation: true
argument-hint: [brief | idea | path to a doc]
---

# /crazy-prototype

Prototype as many **Ideas** as the Brief admits on one Artifact page, then let the user pick. Claude only; the Artifact is the only carrier. The run stops for the user at three points: the Gate, the browser question, and the hand-over.

## 1. Gate

The **Brief** is the user's prompt, plus whatever a grill adds. Ask one `AskUserQuestion`, three options, the recommended one first and tagged "(Recommended)":

| Option | Runs |
|---|---|
| **grill-me** | the `grilling` skill |
| **grill-with-docs** | `grilling` + `domain-modeling` |
| **直接开始 / skip** | nothing |

Recommend skip when the user's words say so (直接, fast, skip, 快) or the prompt already carries goal and constraints; grill-with-docs when the project has a `CONTEXT.md` or `docs/adr/`; otherwise grill-me.

If `grilling` is in your skill list, run it with the Skill tool (plus `domain-modeling` for grill-with-docs); `/grill-me` and `/grill-with-docs` are user-invoked wrappers you cannot call by name. Otherwise run this interview yourself:

- Ask one question at a time through `AskUserQuestion`, each with your recommended answer first.
- Look up facts in the environment yourself; only decisions go to the user.
- Walk every open branch of the Brief until nothing is left to decide.
- For grill-with-docs, also write each settled term into the project's `CONTEXT.md` as you go (term, one-line definition, words to avoid).

Either way, every grill question goes through `AskUserQuestion`, strictly one per call: that is the user's standing rule. The grill ends when the user confirms shared understanding.

On skip, fill the gaps yourself and list those assumptions at the top of the page, so a wrong premise shows as a premise, not as a bad design.

## 2. Build

Load `artifact-design`, then build straight from the Brief: as many distinct Ideas as you can. Layout, grouping, mocks and how each Idea is shown are yours to decide; use the Artifact freely. Show each Idea at the size it actually needs (a full screen at full width, a small detail small), never shrunk to make the quantity fit: many Ideas mean a longer page, not smaller ones. In a project, mocks follow its design system (tokens, type, components) and its copy language. Write a long page in parts so no single write is huge.

The page has only four requirements:

- **EN | 中 toggle** for every page string you write (mock copy stays in the product's language). English first; remember the choice under `cp:lang`.
- **Light/dark toggle**, only when the project's design system defines both themes.
- **A number, a tick and a ✗ on every Idea.** Tick makes a **Pick**, ✗ makes a **Ditch**; setting one clears the other. Keep the state in `localStorage` under `cp:<slug>:r<N>`, every access in try/catch.
- **Copy Pick sheet** button: `navigator.clipboard.writeText` in the click handler, a "Copied" toast, and on failure a selected textarea with "Select and copy". The **Pick sheet** lists only ticked and ✗'d Ideas, by number, marked `[✓]` or `[✗]` (never `[x]`, which is too easy to misread as ✗):

```
# Pick sheet · <Title> · Round N
- [✓] 3 Inline rename
- [✓] 7 Sticky filters
- [✗] 4 Bulk actions
```

The scratchpad path `<scratchpad>/crazy-prototype/<slug>.html` stays stable across Rounds.

## 3. Publish

Publish once the page is whole. Title is the user's name for the thing, else a two-to-four-word noun phrase, stable across Rounds. Pass a one-sentence `description`, `icon: "layout"` on the first publish only, and `label: "Round N"`.

## 4. Quick browser check

Ask with `AskUserQuestion` which of the user's browser tools to use, unless the user named one; offer only tools this user actually has (for KD: **Ego lite**, `ego-browser`, or **Aside**, `aside-browser`). Then on the live URL: one full-page desktop screenshot, and one click on Copy Pick sheet. Fix only what is visibly broken (blank or cut-off areas, overlap, a dead button), redeploy, and re-look only if you fixed something. Speed matters more than polish here.

## 5. Hand over

Give the link and one line: tick or ✗ Ideas, press Copy Pick sheet, paste it here. End the turn.

## 6. Next Round

A pasted Pick sheet is the user's own decisions from the page. Build Round N+1 in the same file, redeploy to the same path with `label: "Round N+1"`, then repeat steps 4 and 5.

- **Ticked** Ideas stay as a reference, marked as kept from the last Round so they read as the base for the refinements beside them.
- **Untouched** Ideas carry over unchanged.
- **✗'d** Ideas are gone for good, in this and every later Round.
- A carried-over Idea keeps its number; new Ideas take new numbers, so a number means one Idea across every Round.
- Ticks reset each Round (new storage key).

The run ends when the user says the Picks are final or asks for implementation.
