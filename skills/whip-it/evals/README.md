# whip-it evals

Ten cases of one change. `base/` is a Members page; every case adds the same invite block to it
(an email field, a role, an Invite button, the list of who is invited). `cases/clean/` adds it by
all nine rules; each other case is `clean/` with one rule broken, so a fix to anything else is a
false fix. The page is plain HTML, which the whip reads like any UI code.

## Run

For each case, build its repo and run the whip there in a fresh context (a new conversation, or a
subagent told not to read this folder):

```sh
sh setup.sh <case> <scratch>/whip-<case>
cd <scratch>/whip-<case> && claude      # then: /whip-it
```

With no argument the whip takes the branch's change since it left `main`: the invite block. The
branch's commit message is the ask.

## Score

| Case | Broken | Must happen |
|---|---|---|
| `clean` | nothing | no edit, and no finding that blames the block |
| `1-label` | a hint under the form says how to use it | the hint gone; rule 1 (8 accepted) |
| `2-reuse` | a hand-rolled role dropdown beside the page's own `select.select` | the page's Select in its place; rule 2 |
| `3-together` | the Invite button sits in the page header, far from its fields | the button back beside the fields; rule 3 |
| `4-motion` | the invite block fades up on page load | the animation gone; rule 4 |
| `5-razor` | a second, icon-only submit button beside Invite | one submit button left; rule 5 |
| `6-jargon` | the error says `POST /api/invites returned 422` | an error in plain words; rule 6 |
| `7-language` | the button reads "Click here to send an invitation to this email address" | a short button label; rule 7 (1 accepted) |
| `8-show` | a toast tells that the invitation was sent while the new row shows it | the toast gone; rule 8 (1 accepted) |
| `9-align` | the tinted invited row sits on the column edge, so its text starts 12 px in | the tint hangs 12 px outside, the text on the column edge; rule 9 |

A case passes when the broken thing is gone and cited by its rule, and the diff from the case
touches nothing else: no other element of the block changed, no element of `base/` changed (an old
element may only appear as an unfixed finding). Count passes out of 10, and list each false fix by
case. Append to `private/results.md` (gitignored):

```
| date | model | skill commit | passed | missed | false fixes | notes |
```

## Which rules still do work

Benji Taylor found, while building Stageshow, that some rules quietly stop doing anything as models
improve, while others go on mattering. When a new model ships, take each rule in turn: delete its
paragraph from a copy of SKILL.md (keep the other numbers), point a fresh context at that copy, and
run that rule's case three times. A rule whose case passes all three times without it is one the
model now keeps on its own: list it for KD as a candidate to cut, with the runs. Never cut one
without KD. A rule whose case fails without it is still earning its place.
