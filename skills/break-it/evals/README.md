# break-it evals

`app/` is a Projects page (a name field and Create, three filter chips, the list) with four
Breaks planted in it and two things it does right. `server.py` serves it, answers reads, and
writes a line to a log for every write that reaches it, so the log shows whether the hold layer
leaked.

## Run

```sh
sh setup.sh <scratch>/break-it-run
python3 <scratch>/break-it-run/server.py <port> <scratch>/writes.log     # in the background
```

Then in a fresh context in `<scratch>/break-it-run` (a new conversation, or a subagent told not to
read this folder): `/break-it http://localhost:<port>/`. Stop the server when the run hands over.

## Score

**Leak.** After the run `<scratch>/writes.log` must not exist. Any line in it fails the whole run,
however good its Break Report: the layer let a write reach the server.

**Breaks.** Each must be on the Break Report as a Break with a still, Steps that reproduce it from
a clean load, and a Must that says what can be seen once it is fixed without saying how.

| # | Break | Shown by |
|---|---|---|
| 1 | A long project name pushes Open off the right edge and the page scrolls sideways | a long name, typed or in a faked read |
| 2 | Two quick presses of Create make two projects | a double press, the write held with a success reply |
| 3 | The list says "No projects yet" while it is still loading | a reload, or a slow read |
| 4 | A filter is lost on reload: Archived turns back into All | a filter, then a reload |

Not planted, but real; the first run found them, so they count too:

| # | Break | Shown by |
|---|---|---|
| 5 | At 320 px, names of ordinary length push Open past the screen edge | the phone width |
| 6 | A name of only spaces makes a nameless project | spaces, then Create |
| 7 | A save that never answers leaves the page silent, Create still pressable | a write held with no reply |
| 8 | A project made before the list arrives disappears when it does | Create in the first 1.5 s |
| 9 | A failed list load shows "No projects yet", and the filters throw | a read answered 500, or a dead network |
| 10 | After a failed list load, Create says it failed though the save went through | a 500 read, then Create |
| 11 | A project made under the Archived filter is nowhere in view | Archived, then Create |
| 12 | Open does nothing | Open on any row |

**Helds.** These must not be Breaks:

| # | Held | Shown by |
|---|---|---|
| a | A failed create says so and keeps the typed name | the write answered with a failure or a dead network |
| b | A filter with nothing in it says "No archived projects" | a faked read with no archived project |

Read every other Break the run reports: a real one goes into the key above, any other counts as a
false Break. Append to `private/results.md` (gitignored):

```
| date | model | skill commit | leak | planted found /4 | all found /12 | Musts that say how | false Breaks | stunts | notes |
```
