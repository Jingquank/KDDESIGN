# crazy-prototype recommends skip from the Brief alone

The Gate's recommendation was one sentence: skip when the prompt "already carries goal and constraints", grill-with-docs when the project has a `CONTEXT.md` or `docs/adr/`, else grill-me. "Goal and constraints" had no test, so the call drifted from run to run, and because docs decided between grill-with-docs and the other two, any project with docs pulled even a clear one-line Brief towards a grill. A grill also narrows the Brief before drawing, while the skill's value is in spreading wide and fast.

So the recommendation now takes two steps. First, from the Brief alone, grill or skip: skip when the user asks to start right away or the prompt names what to make and who or what it is for; constraints are not required. Only then, if it is a grill, docs choose grill-with-docs over grill-me. Each option says in one line why it is or is not recommended for this prompt, so the user can see a wrong call at a glance.

What a skipped Brief leaves open is not guessed past: it becomes an axis the Ideas split on, and the user's Picks answer it. That carries the grill's questions into the page instead of dropping them.

Not chosen: remembering the user's past Gate choices as a default, since a Gate decided by habit stops looking at the Brief.
