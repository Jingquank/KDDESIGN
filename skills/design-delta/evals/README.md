# design-delta evals

Four layers, cheapest first. Run the first two after every change to the skill; the third after a change to `FIDELITY.md` or `viewer/`; the fourth runs itself.

## 1. Viewer (code, seconds)

`viewer-sample/` holds one `delta.json` that exercises every case the viewer handles: a screenshot pair at two widths with live links, a New with no Before, a removal with no After, a Rebuilt frame with its stills, two stills of very different heights. `delta.final-zh.json` is the same data as a single-theme Chinese Final.

```sh
python3 ../viewer/build.py viewer-sample && python3 ../viewer/validate.py viewer-sample
python3 ../viewer/build.py viewer-sample --data delta.final-zh.json --out index-final-zh.html
python3 ../viewer/validate.py viewer-sample --data delta.final-zh.json
```

Both must exit 0. After a viewer change, open `index.html` and `index-final-zh.html` once in a browser (ask which one) and look at every Change.

## 2. Cutting (`--plan`, minutes, no browser)

For each fixture in `private/fixtures.json` and `private/holdout.json` (gitignored: they are built on a private product site), run in a fresh context (a new conversation, or a subagent that is told not to read this folder):

```
/design-delta --plan --repo <repo> --range <range>
```

Score the printed plan against `expected`:

- **Found**: each expected Change appears once (title may differ; the surface and intent must match).
- **Extra**: a Change the key does not have. Not always wrong: read it, and either fix the key (`reviewed: false` keys can be wrong) or count it.
- **Kind**: matches the key.
- **Skipped**: every expected skip is skipped, and nothing visible is.
- **Fidelity**: Rebuilt or Real only where `operable` is true.
- **Unclear**: what the run says it had to guess. Each one is a sentence to sharpen in the skill.

Who edits `SKILL.md`, `FIDELITY.md` or `PAGE.md` does not read `private/holdout.json`.

## 3. Carrying (a full run, an hour, browser)

Run `/design-delta --range <range>` on the carrying fixture end to end. Count files and MB from the published `files` list, the operable Changes, and the browser check items passed, and compare with `baseline_run` and `budget`. Only the first attempt counts.

## 4. Real use (automatic)

Step 8 appends a row to `private/usage.md` from the pasted Notes: Kind overrides, merge / split / drop / rename Notes, "can't see / want to operate" Notes. Those are the user's corrections, so they are the skill's error rate where it matters. They should fall over time.

## Results

Append to `private/results.md`:

```
| date | skill commit | fixture | found | extra | kind | skipped | fidelity | unclear | notes |
```
