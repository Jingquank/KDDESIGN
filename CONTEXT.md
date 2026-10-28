# KDDESIGN

KD's design skills for coding agents. `crazy-prototype` turns a design brief or idea into one artifact page full of pickable prototypes. `design-delta` lays a branch's or a conversation's design changes out before-and-after on one artifact page, the Design Changelog, and keeps their Delta in the repo. `design-lessons` reads the Deltas and turns the rule candidates the user accepts into the project's design rules. `design-whip` holds a conversation's or a branch's UI changes against nine fixed rules and fixes what breaks them. The Nudge asks, above the prompt, whether to run `design-delta` or `design-lessons` now.

## Language

### crazy-prototype

**Idea**:
One numbered, pickable prototype on the page, with a tick. The agent groups and lays out Ideas however it likes.
_Avoid_: option, sub-variant, feature

**Pick**:
An Idea whose checkbox is ticked. A Pick carries no verdict of its own: it only marks which Ideas the user's next message is about; the words pasted with it say what to do (drop them, merge them, vary them).
_Avoid_: selection, vote, choice, keep

**Pick sheet**:
The text the page's copy CTA produces: every Pick, ready to paste back to the agent alongside the user's instruction.
_Avoid_: summary, export, selections

**Brief**:
The context a run starts from: the user's prompt plus whatever the gate's interview added.
_Avoid_: spec, requirements, context

**Round**:
One published state of the page. Round 1 is the first published set of Ideas; each change the user asks for, with or without a Pick sheet, publishes the next Round on the same URL. Ideas the request does not touch stay as they were; a number always means the same Idea, and new Ideas take new numbers. Picks clear with each Round.
_Avoid_: version, iteration, revision

**Gate**:
The opening question of a run: grill-me, grill-with-docs, or skip straight to building.
_Avoid_: intake, kickoff, onboarding

### design-delta

**Design Changelog**:
One artifact page that lays out a set of Changes, each as a Before and an After. Its text in the project is the Delta.
_Avoid_: DesignDelta, diff page, release notes

**Change**:
One intent carried out on one surface (a part of the product a user can name: a section, a screen, a dialog), however many elements and commits it took. A second intent on the same surface is a second Change; a shared component, token or rename used on many surfaces is one Change.
_Avoid_: delta, update, diff, commit

**Before** / **After**:
The two states of a Change: the surface as it was, and as it is now.
_Avoid_: old/new, original/updated

**Fidelity**:
How far Round 1 carries a Change beyond its stills, which every Change has: **Screenshot** (stills, plus links to preview deployments when they exist), **Rebuilt** (adds the piece re-implemented from each state's source) or **Real** (adds the project's own code), the last two only for a piece the user must operate and only when no preview exists. Final shows stills only.
_Avoid_: mode, render type, quality

**Baseline**:
The moment whose state every Before shows. It is the start of the current conversation; or, for a whole branch, the previous Delta's After when there is one, else the point where the branch left the default branch; or, on the default branch itself, a point the user picks (the previous Delta's After, the latest tag, the start of today, or any commit).
_Avoid_: base, starting point, since

**Kind**:
What a Change is: **New** (something a user can point to that was not there, even inside an existing surface: a component, indicator, card, option or visual treatment) or **Fix** (something that existed and was changed, merged or removed). A Change takes the Kind of its main intent; an element added inside a Fix is named in its description. The agent sets every Kind in Round 1; the user's edits override it.
_Avoid_: type, tag, category, label

**Note**:
The user's free text on one Change, written on the page.
_Avoid_: comment, annotation, remark

**Notes**:
The text the page's copy CTA produces: every Change's Kind and Note, ready to paste back to the agent. Pasting it, or saying the page is final with nothing to paste, turns the page into its Final.
_Avoid_: Pick sheet, mark sheet, export

**Final**:
The static, reviewed form a Design Changelog takes when the user answers Round 1 with Notes or asks for it: Kinds and Notes baked in as fixed content, no editing controls, stills only. Without an answer, Round 1 stands as the Design Changelog's last form.
_Avoid_: Round 2, published version, locked

**Skipped**:
A diff in the Design Changelog's range with no visible effect, listed at the page foot with its reason instead of becoming a Change.
_Avoid_: ignored, excluded, non-design change

**Delta**:
A Design Changelog written as text in the project, one file in `docs/deltas/`, no images, written at hand-over and updated at Final, marked reviewed or not reviewed: for each Change its decision, why, what to repeat and what to avoid (each with its source), a pending rule candidate when a source states one, the design rules it breaks, and its evidence (commits, files, links). The only part of a run that goes into git.
_Avoid_: Record, export, archive, changelog

**Rule candidate**:
A design rule a Delta proposes from a sourced Repeat or Avoid, with a stable id, waiting for the user's Verdict in a Design Lessons Review. Candidates come only from Deltas.
_Avoid_: guideline, best practice, proposal

### design-lessons

**Design rules**:
The section of a project's rules file that `/design-lessons` alone writes: the accepted Rules, the candidates being watched, the rejected ones, and the date of the last Design Lessons Review offered. Agents find it through one line in `AGENTS.md` or `CLAUDE.md`.
_Avoid_: guidelines, style guide, DESIGN.md (the file may be another)

**Rule**:
An accepted rule candidate: one observable sentence with its scope, why, exceptions, a bad and a good example, and its sources.
_Avoid_: lesson, principle, best practice

**Source**:
One event that supports a rule candidate: a commit, a conversation, or a Note. The same event cited in several places counts once. Only Deltas carry sources; Pick sheets are not read.
_Avoid_: evidence item, citation, vote

**Design Lessons Review**:
One artifact page that lists the rule candidates with enough sources, the Rules broken twice since their last review, and the rejected candidates with new evidence, each with its draft and sources, for the user to judge. It reads in English or Chinese; what it writes stays English.
_Avoid_: Lessons Review, review packet, rule review, report

**Verdict**:
The user's decision on one item of a Design Lessons Review: Accept, Reject or Watch, with an optional Note. An untouched item is Watch. On a Rule under re-review, Accept keeps it and Reject removes it.
_Avoid_: vote, approval, status

**Verdicts**:
The text the Design Lessons Review's copy button produces, ready to paste back. Only pasted Verdicts change the design rules.
_Avoid_: Notes, Pick sheet, decisions

### design-whip

**Whip rules**:
The nine fixed rules `/design-whip` checks UI changes against and fixes them by, in its SKILL.md: KD's sentences kept word for word, each followed by why it holds and a Bad and a Good example. They are not Design rules: the whip never reads those, and `/design-lessons` never writes these.
_Avoid_: rules, Design rules, guidelines, checklist

### Nudge

**Nudge**:
One question in the band above the prompt, in the manner of a survey, offering to run `/design-delta` or `/design-lessons` in the background now: **1** run it, **2** explain why and what it would cover, **3** not now. It asks only in a project where the user has run `/design-delta` by hand, and never while UI work is under way. While a survey or another mod holds the band it waits as one line in the status line and comes back when the band is free. Ignoring it changes nothing.
_Avoid_: reminder, offer, prompt, notification

**Unrecorded Changes**:
The visible design changes between the newest Delta's After on this branch (else where the branch left the default branch) and the working tree: what the next Delta would hold. A Nudge for `/design-delta` needs some.
_Avoid_: pending changes, backlog, diff

**Settled**:
Said of a stretch of design work the user has finished with: they approved it, moved to another surface or to non-UI work, or began to commit or ship. A Nudge for `/design-delta` appears only once work has Settled; after **3**, only when more work Settles.
_Avoid_: done, idle, complete
