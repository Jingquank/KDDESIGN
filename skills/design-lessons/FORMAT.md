# Formats

Four texts: the design rules the run writes, the pointer line that lets agents find them, the `review.json` the page renders, and the Verdicts the page copies. Everything is English; only `review.json` also carries Chinese, for the page's EN | 中 toggle.

## Design rules

A `## Design rules` section in the rules file. In an existing design document it is appended at the end and the rest of the document is never touched; in a new `DESIGN.md` it is the whole file under a `# Design` title. Paths in these examples use the default Deltas folder, `docs/deltas/`; write the project's own.

```markdown
## Design rules

Accepted in Design Lessons Reviews from the Deltas in docs/deltas/, or written in directly. Last run: 2026-11-02.

### rule/primary-action-own-row
Rule: A step's primary action sits on its own row, under the content it acts on.
Scope: Multi-step flows: checkout, onboarding, settings forms.
Why: Users missed the pay button beside the coupon field. (Note)
Exceptions: —
Bad: A 160px pay button sharing a row with the coupon field.
Good: A full-width pay button under the order total.
Sources: docs/deltas/2026-10-22-checkout-polish.md c1 (Note) · docs/deltas/2026-11-01-onboarding-refresh.md c3 (commit 0a1b2c3)
Accepted: 2026-11-02

### Watching
- rule/empty-states-next-step · 2026-11-02 · 1 source

### Rejected
- rule/no-modals · 2026-11-02 · Modals are fine for confirming a destructive action.
```

- **Rule** is one sentence a reviewer can check by looking at the screen. Adjectives such as clean, clear or polished are not rules.
- **Scope** names the surfaces it governs; **Exceptions** names where it does not hold, or `—`.
- **Why** keeps its source in brackets, as in a Delta. With no source it is `—`.
- **Bad** and **Good** are one line each, taken from one Change's Before → After.
- **Sources** lists each Delta and Change with its source kind. The Deltas carry the full evidence.
- **Reviewed:** lines are appended after a Re-review, `Reviewed: 2026-12-01 kept` or `… watch`, newest last.
- Rules are ordered by id. Watching and Rejected keep one line per id.
- A Rule written in directly by the user or another agent may lack fields (Sources, Accepted); the run keeps it as written and never fills in what no source states.
- **Last run** is the date of the last Design Lessons Review offered (published, or a run with nothing to decide), not of the last Verdicts. `/design-delta` counts Deltas dated after it.

## Pointer

One line in `AGENTS.md` or `CLAUDE.md` (SKILL.md step 5, Record, decides which), written once and updated if the rules file moves:

```
Design rules: DESIGN.md (section "Design rules"). Read them before changing UI.
```

A pointer line written by an earlier version may still end with `change them only through /design-lessons`; drop that clause when the run records.

`/design-delta` finds the rules through this line; without it, the project has no rules yet.

## review.json

```json
{
  "date": "2026-11-02",
  "project": "acme-web",
  "rulesFile": "DESIGN.md",
  "rulesFileExists": true,
  "lastRun": "2026-10-01",
  "read": { "deltas": 12 },
  "items": [
    {
      "id": "rule/primary-action-own-row",
      "group": "review",
      "title": "Primary action on its own row",
      "draft": { "rule": "…", "scope": "…", "why": "…", "exceptions": "—", "bad": "…", "good": "…" },
      "sources": [
        { "kind": "note", "ref": "Note", "where": "docs/deltas/2026-10-22-checkout-polish.md c1", "text": "Users missed it beside the coupon field." },
        { "kind": "commit", "ref": "0a1b2c3", "where": "docs/deltas/2026-11-01-onboarding-refresh.md c3", "text": "…",
          "merged": ["docs/deltas/2026-11-05-settings.md c2"] }
      ],
      "changelogs": ["https://claude.ai/artifact/…"],
      "example": {
        "bad":  { "src": "ex/primary-action-own-row/bad-1440.avif", "where": "docs/deltas/2026-10-22-checkout-polish.md c1 · Before",
                  "from": { "artifact": "https://claude.ai/artifact/…", "path": "c1/before-1440.avif" } },
        "good": { "src": "ex/primary-action-own-row/good-1440.avif", "where": "docs/deltas/2026-10-22-checkout-polish.md c1 · After",
                  "from": { "artifact": "https://claude.ai/artifact/…", "path": "c1/after-1440.avif" } }
      },
      "zh": {
        "title": "主要操作单独一行",
        "draft": { "rule": "…", "scope": "…", "why": "…", "exceptions": "—", "bad": "…", "good": "…" },
        "sources": [{ "text": "…" }, { "text": "…" }]
      }
    }
  ]
}
```

| `group` | Also requires |
|---|---|
| `review` | `draft`, 2+ `sources` or one of kind `note` |
| `back` | `draft`, `rejected: {date, reason}`, sources dated after it |
| `rereview` | `current` (the Rule as written, same keys as `draft` plus `accepted`), `breaks: [{where, date, text}]` with 2+ entries; `draft` only when a rewrite is suggested |
| `thin` | `missing` ("needs 1 more source") |

`kind` is `commit`, `conversation` or `note`; `merged` lists the other places the same event was cited. `wordings`, on `review` and `back` items only, lists the candidate's other sentences as `[{text, where}]`, when Deltas word it differently from `draft.rule`. `changelogs`, `merged` and `wordings` are optional everywhere, and so is `sources` on a `rereview` item (the Rule's own sources). `where` names a Delta and Change.

`example` holds the screenshots behind the Bad and Good lines (Examples, below), each side optional. `src` is where the page shows it, always under `ex/<rule-slug>/`; `from` names the Design Changelog and the still's published path, which the publish copies server side. Without `from`, `src` must be a file already in the folder (the evals do this). The image's alt text is the item's Bad or Good line.

`zh` is a translation for reading only: the design rules and the Verdicts are written in English. It mirrors the item's text in Chinese, key for key: `title` always; `draft` (and `current` for `rereview`) with all six rule keys; `missing` for `thin`; `rejected.reason`, and `sources`, `breaks` and `wordings` as lists of `{text}` in the same order, when they help. A missing optional key shows the English. Ids, paths, commits and dates are never translated.

### Examples

The stills come from the Change the Bad and Good lines come from, in that Change's Design Changelog (the `Page:` link in its Delta's header). List the Changelog's files (`Artifact`, `action: "list"`, `scope: "files"`, its `url`) and take that Change's stills at its widest width: `c<N>/before-<w>.avif` is Bad and `c<N>/after-<w>.avif` is Good; a New Change has no Before, so it gives Good only. For a Re-review item, Bad is the After still of its first break's Change, and Good the After still of the Change in the Rule's first Source. Each still is written as `example.bad` or `example.good` with `src` `ex/<rule-slug>/<bad|good>-<w>.avif` and `from` the Changelog and path. A Changelog that cannot be listed, or has no still for that Change, leaves that side out; the text lines stand alone.

## Verdicts

What **Copy Verdicts** produces:

```
# Verdicts · Design Lessons Review · 2026-11-02
Project: acme-web · Rules: DESIGN.md
3 of 5 items decided · 1 Accept, 1 Reject, 1 Watch

## rule/primary-action-own-row · Review · Accept
- Note: only in multi-step flows

## rule/no-modals · Back after rejection · Reject
- Note: modals are still fine for destructive confirmations

## rule/icon-buttons-have-labels · Re-review · Watch

Every other item: Watch.
```

With nothing set it reads `0 of 5 items decided` and `Every item: Watch.`
