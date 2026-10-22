# KDDESIGN hosts KD's design skills

KD's own skills had three possible homes: directly in `~/.claude/skills` (vigglify, writereport), inside the imported `~/.agents/skills` set, or inside a project repo with a symlink from `~/.claude/skills` (codebury, launch-video). We chose the third for `crazyprototype` and made KDDESIGN that project, so design skills get git history and a shared CONTEXT.md and ADR trail. Each skill lives at `.claude/skills/<name>/` here and is symlinked into `~/.claude/skills/<name>`.
