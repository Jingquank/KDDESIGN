# The Nudge asks about design-delta on a push, never on a guess

ADR 0041 made a push the trigger, but only where a project's `Design deltas:` line says `(auto)`. Everywhere else the Nudge kept the older rule: a small model read the last ten messages and guessed whether the work had Settled, the offer covered the working tree as it stood when **1** was pressed, the run rebuilt both states and drove a browser for its stills (26 minutes, ADR 0031), and the Delta was left uncommitted for the user to remember.

That left two flows to keep in step, and the older one had the faults 0041 named. It could ask too early, with the next surface half done and inside the range. It recorded a state nobody had approved. And its Delta reached git only if someone carried it there.

So a push is the trigger in every project:

- **With `(auto)`** nothing changes: the Nudge starts the run itself.
- **Otherwise it asks once**, for the pushed range, and **1** starts the same passive run: stills from page snapshots, no browser, a Delta the Nudge commits alone and pushes on any branch but the default one. The key press is the permission to commit, as the `(auto)` mark is in the other case. **3** leaves the work until the next push, which is then recorded together with it.
- **Work that is not pushed is never asked about.** Someone who wants a record before pushing runs `/design-delta` by hand.
- **Pages are saved in every project the Nudge is on in**, not only with `(auto)`: a pressed **1** needs its Before as much as an unasked run does.
- **The small model only says whether a user could see the diff**, and words the line that names what was pushed. Settled and "UI still under way" are gone from its answer, and the term Settled is retired.
- **The tree snapshot is gone**: `refs/design-delta/nudge-*` is no longer written, since no offer covers the working tree. A Delta whose After is such a snapshot is still read as a Baseline.

`(auto)` and `(manual)` now differ in one thing, whether the Nudge asks before it starts.

What is given up: a nudge for work that sits unpushed for days, and the fuller page (every still captured from the running product, frames for what must be operated) from a pressed **1**. That page is a hand run's now, as ADR 0041 already said for `(auto)`.

Supersedes the timing and the range of ADR 0011's unattended run (a guess that work had finished, and the working tree as it stood at the press). Turning on with a hand run (ADR 0012) and asking in the user's name on **1** (ADR 0014) stand.
