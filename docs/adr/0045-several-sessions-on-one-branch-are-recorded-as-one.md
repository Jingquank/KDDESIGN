# Several sessions on one branch are recorded as one push

KD often has several Claude Code sessions editing the same branch and then commits and pushes everything from one of them. The passive run was built with one session in mind, and three things went wrong with more:

- **Every open session saw the same push.** Each has its own copy of the mod, and each found pushed, unrecorded UI work at its next look. With `(auto)` that is one background run per session and as many Deltas; without it, the same question in every band.
- **Only the first edit got a Before.** A page was saved before the first UI edit since the Baseline, and only while no UI file differed from it. The second session's first edit met a tree the first session had already changed, so its page was never saved; the same held for a second page in one session.
- **The reasons live in several transcripts.** The session that pushes may never have discussed most of what it pushes.

So:

- **One session claims a push.** Before the slow steps, the mod writes the pushed diff's fingerprint, its own id and the time into the store all sessions share; another session that finds a fresh claim on the same diff neither starts a run nor asks. A claim lapses after 30 minutes, so a session that closed before its run or its answer does not bury the work. `/nudge` asks regardless.
- **A page is saved before the first edit of each UI file**, not once per Baseline, and other files may already be edited. The snapshot keeps the list of what had changed. `pair` gives it as a Before only to a route none of those files belong to, names the list beside it, and never takes such a page as an After. A page saved later from a clean tree replaces it.
- **The run reads every transcript in the range**, which step 3 already asked for; the passive steps now say why.

The diff itself never had the problem: it is taken between two pushed commits, whoever wrote them.

What stays imperfect: a Before saved beside an edit to something the whole page shares (a token file, a global stylesheet, the layout) already shows that edit. The script cannot know which files are shared, so it names them and the run decides; the look at every still (ADR 0042) is the second check. Two sessions looking in the same second can both claim; the window is the time between two store reads.
