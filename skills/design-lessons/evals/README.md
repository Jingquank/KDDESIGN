# design-lessons evals

Everything here is made up: `fixture/` is a small imaginary project, `acme-web`, with four Deltas and a rules file. Real projects' data goes in `private/` (gitignored), never here.

## Plan run

In a fresh context (a new conversation, or a subagent told not to read this folder's README), run:

```
/design-lessons --repo <skill>/evals/fixture --plan
```

It must write nothing into `fixture/`. Score its plan against the five cases below; each is one point.

| # | Case | Expected |
|---|---|---|
| 1 | `rule/primary-action-own-row`: one conversation cited twice in one Change, and one commit in another Delta | **Review**, 2 sources; the two lines of conversation `5e6f7a8b` merged into one |
| 2 | `rule/destructive-actions-name-object`: one `(Note)` in a reviewed Delta | **Review**, 1 source, a Note |
| 3 | `rule/empty-states-next-step`: commit `1a2b3c4` cited by two Deltas | **Not enough evidence**, 1 source, "needs 1 more source"; the second citation merged |
| 4 | `rule/icon-buttons-have-labels`: accepted 2026-09-20, broken on 2026-10-12 and 2026-10-24 | **Re-review**, 2 breaks; its own candidate line is left out as already a Rule |
| 5 | `rule/no-modals`: rejected 2026-09-20, one new commit source after it | **Left out** (Rejected, 1 new source); not Back after rejection |

Expected plan, line for line (the date is the run's):

```
# Plan · Design Lessons Review · fixture · <date>
Rules file: DESIGN.md (existing) · last run 2026-09-20
Review: rule/primary-action-own-row (2 sources); rule/destructive-actions-name-object (1 source, Note)
Re-review: rule/icon-buttons-have-labels (2 breaks)
Back after rejection: none
Not enough evidence: rule/empty-states-next-step (needs 1 more source)
Left out: rule/icon-buttons-have-labels (already a Rule); rule/no-modals (Rejected, 1 new source)
```

## Page

`review-sample.json` is the `review.json` the plan run should produce, except that its examples are the made-up stills in `ex/` instead of copies from real Design Changelogs. To check the page after changing `review/`:

```
mkdir -p <scratch>/lr && cp review-sample.json <scratch>/lr/review.json && cp -R ex <scratch>/lr/ && python3 ../review/build.py <scratch>/lr
```

`build.py` must exit 0, print `2 review, 1 rereview, 0 back, 1 thin`, and one `files` map with the six local stills. Each of the three decidable items shows a Bad and a Good screenshot. Then open the page: set one Verdict of each kind, write one Note, press Copy Verdicts; the Verdicts list exactly those three items and end with `Every other item: Watch.` Switch to 中: every heading, button and item text turns Chinese, the Verdicts set before stay set, and a fresh Copy Verdicts gives the same English text. Reload: the page opens in 中.

## Apply run

Paste these Verdicts into a run on a copy of `fixture/` (never the fixture itself):

```
# Verdicts · Design Lessons Review · 2026-10-25
Project: fixture · Rules: DESIGN.md
2 of 3 items decided · 1 Accept, 1 Reject, 0 Watch

## rule/primary-action-own-row · Review · Accept
- Note: only in multi-step flows

## rule/icon-buttons-have-labels · Re-review · Reject
- Note: hover actions on rows are fine without labels now that every row has a menu

Every other item: Watch.
```

Expected in the copy's `DESIGN.md`: `rule/primary-action-own-row` under Rules with Scope narrowed to multi-step flows and `Accepted: <date>`; `rule/icon-buttons-have-labels` moved to Rejected with the Note as its reason; `rule/destructive-actions-name-object` under Watching with 1 source; `Last run:` unchanged by the Verdicts (a real run sets it when it offers the review); `AGENTS.md` unchanged, because its pointer line already exists.

## Chained run

In a copy of `fixture/` with `Last run:` set to 2026-09-01, run `/design-delta` on any small change there. At hand-over, 5 Deltas (the four plus the new one) are dated after the last run, so it runs `/design-lessons` and hands over two links; `Last run:` in the copy's `DESIGN.md` becomes the run's date. Run `/design-delta` once more: only 1 Delta is newer now, so it hands over one link and no reminder.
