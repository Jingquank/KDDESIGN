# Nobody reviews a Design Changelog: one page form, no Notes, no Final

ADR 0008 kept the review as an option: Round 1 let the user change a Kind and write Notes, pasting them back made the page Final, and no answer left Round 1 standing. ADR 0041 said why even the option is dead weight (KD does not open the page, the Kinds are right, Approve is a key pressed for nothing) and removed it from passive runs. A hand run still carried all of it: two page forms, an edit bar, browser storage, a paste format, a step 8, a `Review:` line, and two keys on the Nudge.

So it goes everywhere:

- **The page has one form.** The viewer shows each Change with its Kind as a badge, its stills, a frame where the ladder added one, and counts that filter by New or Fix. There is no Round, no Kind control, no Note field, no bottom bar, and `delta.json` has no `round`. A page already published keeps the viewer it was published with.
- **Frames stay.** Final used to drop Rebuilt and Real frames to leave a static page. A hand run now exists to show someone the work, and operating it is part of showing, so the frames are kept for as long as the page is. The 8 MB budget still bounds them.
- **A correction is a sentence, not a paste.** When the user says a Kind is wrong or a Change should be dropped, merged, split or renamed, the agent changes `delta.json` and the Delta and republishes. Nothing asks for it.
- **The Delta has no `Review:` line.** It said whether a person had checked the reading; now none does, and the line would read the same on every Delta. Why, Repeat and Avoid quote the user's words when a conversation is the source, in hand runs too, so a Design Lessons Review shows what was actually said.
- **`stated` takes the Note's place.** A Note was the one source that put a candidate up for review alone, because the user wrote it. A lesson the user states in conversation as a general preference does the same (ADR 0041). Old Deltas keep their `(Note)` sources and `/design-lessons` still counts them that way.
- **The Nudge approves only a Design Lessons Review.** After a run with a Changelog alone the band offers Open and Dismiss. Approve and Approve with Changes appear when a Review came with it, and speak of Verdicts only.

The Verdicts of a Design Lessons Review are now the only place a person decides anything in this loop. That is where it matters: a Delta is evidence and binds nobody, a rule binds every later change.

What is given up: the count of the user's corrections per reviewed run, which `evals/usage.md` called the skill's error rate in real use. A hand run still logs a row, and a correction asked for in conversation adds to it, but most runs are passive and log nothing, so that number will be thin. The Kinds were right often enough that nobody was correcting them, which is the reason for this ADR and also the reason the number had stopped moving.

Supersedes the review half of ADR 0008; the half that writes the Delta at hand-over stands.
