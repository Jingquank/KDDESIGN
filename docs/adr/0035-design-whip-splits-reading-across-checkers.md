# design-whip splits its reading across checkers on a large scope

`/design-whip` reads code and fixes it in place. On a branch that touched dozens of files, the reading is most of the run, and each file is held against the nine rules on its own. So with 20 or more changed files in scope, up to 4 read-only checkers each hold 5 to 10 files against the rules and return their violations; the main agent checks each against the code and makes every fix.

Fixes stay with one agent: the files may hold the user's uncommitted work, the snapshot covers one set of edits, and two agents editing one file undo each other's work. Rule 2 across batches stays with the main agent too, since a checker cannot see that another batch added a control doing the same job.

Not chosen: splitting by rule, nine agents each reading every file, which reads every file nine times; splitting below 20 files, where the briefs cost more than the reading they save.
