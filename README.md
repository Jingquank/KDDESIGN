<h1 align="center"><img src="docs/title.svg" alt="KDDESIGN" width="640"></h1>

<p align="center">KD's design skills for coding agents.</p>

Three skills turn what you ship into design rules your agents follow. `/crazy-prototype` explores, `/design-delta` records what actually shipped and why, and `/design-lessons` turns the lessons that keep coming back into rules, once you agree. The rules then feed back into every record that follows.

<p align="center"><img src="docs/rule-loop.svg" alt="The rule loop on a board of four lanes, back to front: claude.ai Artifacts, this machine's conversations, skill runs, and the git repo. The three skills are ink blocks; pages, files and the build step are paper tiles. Red marks the rules half of the loop." width="100%"></p>

<sub>Read it in lanes, back to front: what lives on claude.ai as pages for people, what stays in this machine's conversations, the skill runs, and the git repo, the only part kept for good. Read it in columns, left to right: explore, build, record, distill. Red is the rules half: how records become rules, and how rules come back to every new record.</sub>

## The skills

| Skill | What it does |
|---|---|
| `/crazy-prototype <brief>` | Turns a brief into one Artifact page full of pickable Ideas. Tick or ✗ each Idea and paste the Pick sheet back for the next Round. |
| `/design-delta` | Lays this conversation's or this branch's design Changes out Before beside After on one Artifact page, the Design Changelog, and writes a text Delta of the decisions into the target project's `docs/deltas/`. The page is a fixed viewer fed by `delta.json`. |
| `/design-lessons` | Reads every Delta, counts the sources behind each rule candidate, and puts those with enough evidence on one Artifact page, the Lessons Review. The rules you accept go into the project's design rules. `/design-delta` runs it on its own once 5 Deltas have piled up since the last review. |

## What you do

Everything else runs by itself. You act in three places, each by pasting one text back into the conversation.

1. **On a prototype page.** Tick or ✗ each Idea, press Copy Pick sheet, paste it back. The next Round builds on your Picks. Pick sheets stay in prototyping: they are quick calls among rough Ideas, so they never become rules.
2. **On a Design Changelog** (optional). Correct a Kind or write a Note, press Copy Notes, paste it back. The page turns static and its Delta is marked reviewed. One Note of yours is enough to put a rule candidate up for review.
3. **On a Lessons Review.** Give each item Accept, Reject or Watch, add a Note to reword it, press Copy Verdicts, paste it back. Only now do the rules change; no reply changes nothing.

## One rule, all the way round

1. While building a checkout, you say “the pay button gets lost next to the coupon field”. `/design-delta` writes it into that Delta's Avoid, sourced to the conversation, and proposes `rule/primary-action-own-row`, Pending.
2. Weeks later, an onboarding commit says “Continue and Skip side by side; people pressed Skip by mistake”. Another Delta proposes the same id: now there are two sources.
3. That run writes the fifth Delta since the last review, so `/design-delta` runs `/design-lessons` at its hand-over. You get the Design Changelog and a Lessons Review together.
4. It counts sources as events, not lines: one conversation and one commit make 2, over the bar. The review shows the drafted rule, its sources, and the Before and After screenshots of the Change it came from.
5. You Accept with the Note “only in multi-step flows” and paste the Verdicts back. The rule is narrowed as the Note says and written into the design rules, which every coding agent reads through one line in `AGENTS.md`.
6. From then on `/design-delta` checks every Change against it. A Change that breaks it gets a `Breaks:` line; two breaks bring the rule back to a Lessons Review, where Accept keeps it and Reject removes it.

## Install

Each skill lives in `.claude/skills/<name>/`. Symlink the ones you want into `~/.claude/skills/`:

```sh
ln -s "$PWD/.claude/skills/design-delta" ~/.claude/skills/design-delta
```

Vocabulary: [`CONTEXT.md`](CONTEXT.md). Decisions: [`docs/adr/`](docs/adr/).
