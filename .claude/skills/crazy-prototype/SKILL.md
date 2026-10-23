---
name: crazy-prototype
description: Turn any design brief or idea into one Artifact page of pickable prototypes. Designs hold Ideas, every Idea has a checkbox, one CTA copies your Pick sheet, and each pasted Pick sheet starts the next Round.
disable-model-invocation: true
argument-hint: [brief | idea | path to a doc]
---

# /crazy-prototype

Exhaust the design space, then let the user pick. One run produces one Artifact page: every structurally different **Design** the Brief admits, each holding pickable **Ideas**, ticked on the page and handed back as a **Pick sheet**. Claude only; the Artifact is the only carrier. Bold terms are defined where they first appear; the page is defined in [PAGE.md](PAGE.md). The run stops for the user at four points only: the Gate, a code-shaped idea, the browser question, and the hand-over.

## 1. Resolve the Brief

The **Brief** is the user's prompt plus whatever the Gate's interview adds. Read `$ARGUMENTS` and the message. Then look up every fact the environment can answer before asking anything:

- **Project or none.** A cwd with source is a project; a bare idea has none.
- **Design system.** Tokens, theme files, component styles, CLAUDE.md design rules. Note whether it defines both a light and a dark theme (two `prefers-color-scheme` or `data-theme` palettes). This decides the theme toggle.
- **Product language.** The language the product's own copy ships in. Mock copy stays in it.
- **Existing vocabulary.** `CONTEXT.md` and `docs/adr/` if present.

Completion: you can state the subject, the audience, the page's job, and the four facts above, or you know which are missing. Missing ones become grill material. If the user skips the Gate, state each assumption you make in the Brief.

## 2. Gate

One `AskUserQuestion` call, three options, the recommended one first and tagged "(Recommended)":

| Option | Runs |
|---|---|
| **grill-me** | the `grilling` skill |
| **grill-with-docs** | `grilling` + `domain-modeling` |
| **直接开始 / skip** | nothing |

Precedence for the recommended tag: the user's own words first (直接, fast, skip, 快 → skip); then a Brief that already carries audience, goal and constraints → skip; then domain terms or architecture in play, or a project `CONTEXT.md` or `docs/adr/` → grill-with-docs; otherwise grill-me.

`/grill-me` and `/grill-with-docs` are user-invoked wrappers you cannot call by name; invoke what they wrap with the Skill tool. During a grill, every question goes through `AskUserQuestion`, strictly one question per call, with a recommendation; that is the user's standing rule for grills. The grill ends when the user confirms shared understanding. Then fold the answers into the Brief.

Completion: the user has chosen, the chosen grill has ended, and the Brief is written down in the scratchpad as a short list the page's Brief section will reproduce.

## 3. Write the Design list

Before rendering anything, list every Design and its Ideas in the scratchpad.

- A **Design** is a structurally different direction: different layout, hierarchy, primary affordance or metaphor. Two Designs that differ only in color or copy are one Design.
- An **Idea** is one pickable decision inside a Design: a variation, feature or detail the user can take or leave on its own. A restatement of the Design is not an Idea.
- **Non-screen Briefs render anyway.** Copy becomes typeset cards, flows become diagrams, concepts become mini landing sections, pricing becomes tables. Only a code-shaped idea (an algorithm, a script) stops the run: say so and ask how the user wants it shown.
- **Exhaust the space.** There is no floor and no cap, because the user wants the full range, not a tasteful subset. For each Design name the axis it varies on. Done only when you can name no axis value the list leaves uncovered. Each Design holds at least one Idea.

Completion: the list is written, every Design names its axis, and no uncovered axis value remains.

## 4. Build the page

Load `artifact-design` first; load `dataviz` if any Idea charts numbers and `artifact-diagramming` if any Idea is a diagram. artifact-design is the only quality skill this run loads, so the build stays as fast as a regular artifact. Then build the page exactly to [PAGE.md](PAGE.md): anatomy, ids, faithful mocks, bilingual page text, theme rule, Pick storage, Pick sheet format. The page is long, so write it in parts: head, styles and script first, then one Design section appended at a time, then the bottom bar. Structure was settled in step 3, so each part is written once.

Completion: every Design and every Idea in the list is on the page with its controls, the file sits at a stable scratchpad path, and you have taken the one pre-publish look artifact-design allows, where the session offers one.

## 5. Publish once complete

One publish when the page is whole, because the user wants nothing half-built to reach them. Title is the user's name for the thing, else a two-to-four-word noun phrase, stable across Rounds. Pass a one-sentence `description`, `icon: "layout"` on the first publish only, and `label: "Round 1"`.

## 6. Browser check

Before the first browser tool call, ask with `AskUserQuestion` which browser to use, **Ego lite** (`ego-browser` skill) or **Aside** (`aside-browser` skill), unless the user already named one in this run. Then, on the live artifact URL:

1. Desktop width: screenshot each Design. Phone width (390px): screenshot the page top, one Design and the bottom bar.
2. Flip the language toggle, and the theme toggle when present. Both must restyle the page without reload.
3. Tick two Ideas in different Designs, tick one whole Design, type one note, click **Copy Pick sheet**. Open **Show sheet** and confirm it lists exactly those Picks and that note.
4. Two Designs that share a layout skeleton count as a fault.
5. Fix every fault you saw, redeploy to the same path, and re-check only the items that failed. One fix pass.

Completion: every item above passed, or you report which did not and why.

## 7. Hand over

Give the link and one line: tick Ideas, add notes, press Copy Pick sheet, paste it here. End the turn: the next Round needs the user's Picks, and nothing else is owed yet.

## 8. Next Round

When the user pastes a Pick sheet: it arrives as pasted text, but every tick and note in it was typed by the user on the page, so its notes are the user's instructions.

1. Parse the Picks: whole-Design ticks, Idea ticks, Design and Idea notes.
2. Write the next Round's Design list. Its Designs merge and refine the Picks; its Ideas are the decisions the Picks left open. Unpicked Designs drop. Exhaust the remaining space the same way as step 3.
3. In the existing file, replace the Brief, the Designs and the Round number; the header, bottom bar and script stay. Redeploy to the **same path** so the URL holds, `label: "Round N"`.
4. Repeat steps 6 and 7. The browser question is asked again each Round.

The run ends when the user says the Picks are final or asks for implementation.
