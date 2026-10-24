<h1 align="center"><img src="docs/title.svg" alt="KDDESIGN" width="640"></h1>

<p align="center">KD's design skills for coding agents.</p>

Three skills turn what you ship into design rules your agents follow. `/crazy-prototype` explores, `/design-delta` records what actually shipped and why, and `/design-lessons` turns the lessons that keep coming back into rules, once you agree. The rules then feed back into every record that follows.

<p align="center"><img src="docs/rule-loop.svg" alt="The KDDESIGN loop on three terraces, high to low: claude.ai Artifacts, this session, and the git repo. The three skills are the red machines with dark labels: crazy-prototype, design-delta and design-lessons. Red dashed traces mark the rules half." width="100%"></p>

<sub>Read it in terraces, high to low: pages for you on claude.ai, what Claude runs in this session, and the git repo, the only part kept for good. Read it left to right: explore, build, notice, record, distill. Dotted traces are what you paste back. Red traces are the rules half: five Deltas become a Design Lessons Review, only your Verdicts write the design rules, and the rules come back to every build and every record.</sub>

## The skills

| Skill | What it does |
|---|---|
| `/crazy-prototype <brief>` | Turns a brief into one Artifact page full of pickable Ideas. Tick the Ideas you mean and paste the Pick sheet back with what to do; the next Round applies it. |
| `/design-delta` | Lays this conversation's or this branch's design Changes out Before beside After on one Artifact page, the Design Changelog, and writes a text Delta of the decisions into the target project's `docs/deltas/`. The page is a fixed viewer fed by `delta.json`. |
| `/design-lessons` | Reads every Delta, counts the sources behind each rule candidate, and puts those with enough evidence on one Artifact page, the Design Lessons Review. The rules you accept go into the project's design rules. `/design-delta` runs it on its own once 5 Deltas have piled up since the last review. |

## What you do

Everything else runs by itself. You answer the Nudge with one key, and you act in three places, each by pasting one text back into the conversation.

1. **On a prototype page.** Tick the Ideas you mean, copy the Pick sheet, paste it back with what to do (drop, merge, vary). The next Round applies it. Pick sheets stay in prototyping: they are quick calls among rough Ideas, so they never become rules.
2. **On a Design Changelog** (optional). Correct a Kind or write a Note, press Copy Notes, paste it back. The page turns static and its Delta is marked reviewed. One Note of yours is enough to put a rule candidate up for review.
3. **On a Design Lessons Review.** Give each item Accept, Reject or Watch, add a Note to reword it, press Copy Verdicts, paste it back. Only now do the rules change; no reply changes nothing.

## The Nudge

You do not have to remember to run `/design-delta` or `/design-lessons`. When a stretch of design work has Settled (you approved it, moved to another surface or to non-UI work, or began to ship), the Nudge asks above the prompt, the way a survey does:

```
█══╡ design-delta ╞═════════════════════════════════════════════
 Just finished: 3 checkout changes settled · pay button, coupon, summary
 Run design-delta in the background to record a Design Changelog?
 1: Do it   2: Why   3: Not now
```

**1** runs it in a background subagent and the conversation carries on; the red rule fills while it runs, and a notification says when the Design Changelog is ready. **2** explains why now and what it would cover. **3** leaves it until more work Settles. It never asks while UI work is under way, nor while a survey or another band is showing, and it asks for `/design-lessons` once 5 Deltas have piled up since the last review. It speaks the language you write in and lays itself out for the terminal's width. A background run asks nothing: it records from the last Delta to a snapshot taken when you press 1, and takes its stills in an Ego lite tab of its own ([ADR 0011](docs/adr/0011-nudge-runs-design-delta-unattended.md)).

The Nudge is a Claude Code mod: it draws in the terminal and in the Desktop app's Code tab, not in the VS Code extension, `claude -p` or cloud sessions.

## One rule, all the way round

1. While building a checkout, you say “the pay button gets lost next to the coupon field”. `/design-delta` writes it into that Delta's Avoid, sourced to the conversation, and proposes `rule/primary-action-own-row`, Pending.
2. Weeks later, an onboarding commit says “Continue and Skip side by side; people pressed Skip by mistake”. Another Delta proposes the same id: now there are two sources.
3. That run writes the fifth Delta since the last review, so `/design-delta` runs `/design-lessons` at its hand-over. You get the Design Changelog and a Design Lessons Review together.
4. It counts sources as events, not lines: one conversation and one commit make 2, over the bar. The review shows the drafted rule, its sources, and the Before and After screenshots of the Change it came from.
5. You Accept with the Note “only in multi-step flows” and paste the Verdicts back. The rule is narrowed as the Note says and written into the design rules, which every coding agent reads through one line in `AGENTS.md`.
6. From then on `/design-delta` checks every Change against it. A Change that breaks it gets a `Breaks:` line; two breaks bring the rule back to a Design Lessons Review, where Accept keeps it and Reject removes it.

## Install

KDDESIGN is one Claude Code plugin: the three skills and the Nudge ([ADR 0010](docs/adr/0010-kddesign-ships-as-one-plugin.md)).

```
/plugin marketplace add Jingquank/KDDESIGN
/plugin install kddesign@kddesign
```

The skills then run as `/kddesign:crazy-prototype`, `/kddesign:design-delta` and `/kddesign:design-lessons`. They live in `skills/<name>/`, the Nudge in `hooks/register.tsx`. While working on the plugin, `claude --plugin-dir .` loads it from this folder for one session.

Vocabulary: [`CONTEXT.md`](CONTEXT.md). Decisions: [`docs/adr/`](docs/adr/).
