# KDDESIGN hosts KD's design skills

Status: the install by symlink is superseded by ADR 0010; the skills now live in `skills/<name>/` and ship as one plugin.

KD's own skills had three possible homes: directly in `~/.claude/skills` (vigglify, writereport), inside the imported `~/.agents/skills` set, or inside a project repo with a symlink from `~/.claude/skills` (codebury, launch-video). We chose the third for `crazy-prototype` and made KDDESIGN that project, so design skills get git history and a shared CONTEXT.md and ADR trail. Each skill lives at `.claude/skills/<name>/` here and is symlinked into `~/.claude/skills/<name>`.
