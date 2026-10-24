# KDDESIGN ships as one plugin: the three skills and the Nudge mod together

Status: supersedes the install half of ADR 0001; the skills still live in this repo.

ADR 0001 installed each skill by symlinking `.claude/skills/<name>` into `~/.claude/skills`. The Nudge is a mod, and a mod only loads as part of a plugin, so the repo needed a plugin either way. We could have shipped the mod alone and kept the symlinks, but then the mod has to guess where the skills it runs live, and someone who installs it without them gets a Nudge that cannot run. So the repo is one plugin with its own marketplace: one install brings `crazy-prototype`, `design-delta`, `design-lessons` and the Nudge, and the mod reads the skills from its own plugin root. The cost is the namespace: the commands become `/kddesign:design-delta` and so on, and the old symlinks must go, or every skill shows up twice.
