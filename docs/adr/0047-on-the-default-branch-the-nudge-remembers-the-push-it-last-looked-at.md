# On the default branch the Nudge remembers the push it last looked at

The Nudge records what lies between a Baseline and the pushed commit (ADR 0044). The Baseline is the branch's newest Delta's After, else where the branch left the default branch. On the default branch with no Delta yet there is neither, and the Nudge used where the session started.

That place was held in the module's memory, and it is read again whenever a session starts: a new session, a `/clear`, a reload of the mod. After any of them the Baseline was the pushed commit itself, so there was nothing between the two. KD committed and pushed on `main`, came back the next day, ran `/nudge` and was told there was nothing to ask. A project with no Delta could only get its first one from the Nudge if the session was opened before the commit and never cleared before the push.

So on the default branch, until a Delta names a Baseline:

- **The pushed commit last looked at is kept in the store**, per project and branch. It is the Baseline, across sessions. Every push since it is one range.
- **It moves on only when there is nothing in the range for a Delta**: no UI file changed, or the small model says no user could see the change. A range that was declined (**3**) or whose run failed stays, and is recorded together with the next push, as ADR 0044 says.
- **The first look starts one step back.** With nothing kept, the Baseline is where the upstream stood before the last push made from this clone, read from the upstream's reflog, so the push the user has just made is asked about even in a session that started after it. This holds only when a push is the last thing that moved the upstream: a fetch brings other people's commits, and those are not asked about. Without such a push it is where the session started, when that is behind the upstream, else the upstream as it stands.
- **A kept commit that is no longer behind the upstream** (a rebase, a forced push) is dropped and the first look is taken again.

Once the branch has a Delta, its After is the Baseline as before and the kept commit is not read.

What is given up: on the first look only the last push is found. Pushes made before it, in sessions that came and went while the fault stood, are not in the range; a hand run of `/design-delta` records them.

Changes the last clause of the Baseline rule the Nudge shares with design-delta ("on the default branch, where this session started") for the Nudge only. A hand run still starts from the session, since it records the working tree and not a push.
