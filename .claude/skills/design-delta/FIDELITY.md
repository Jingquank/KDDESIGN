# Carrying Before and After

## Every Change has stills

Every side that exists gets a still per width (Screenshot, below), whatever its Fidelity. The stills are what Final shows and the fallback when a frame fails. Fidelity only decides what Round 1 adds on top, so the reviewer can operate the Change while judging it.

## Pick by what the Change is

Go down the ladder and stop at the first step that carries the Change:

| Step | When | Round 1 carries |
|---|---|---|
| 1. **Screenshot** | the Change is seen: layout, visuals, copy, tokens, icons, a removed or new surface. Also an operated Change when both states have a **preview deployment**: the `live` links let the reviewer operate the real thing for zero bytes | stills, plus `live` links whenever previews exist |
| 2. **Rebuilt** | operating it is the point (below) and there are no previews | stills, plus a frame of only that piece, re-implemented, on the side(s) that respond |
| 3. **Real** | operating it is the point, there are no previews, and Rebuilt cannot be faithful: a WebGL or canvas stage, a physics simulation, a third-party widget | stills, plus a frame of the project's own build, isolated to the piece |
| — | accessibility, sound, haptics | stills + a diagram or text in `desc` |
| — | copy with no surface: search snippets, `llms.txt`, store listings | a still of a text card (a search result, the file excerpt) at width `[760]`, the changed words marked |

Operating it is the point only when the Change's intent adds or changes how something responds (a new picker, new motion, new parallax). Something interactive that works as before (an existing 3D stage inside a re-laid-out section) does not count. A side that does not respond differently gets no frame: a picker that is new has a frame on the After only, and its Before is the still of what stood there. Write the reason in `fidelityNote`. When in doubt, step 1: a still and a live link are cheap and honest, and a wrong interactive copy is worse than a picture.

## Budget

Round 1 publishes at most **8 MB**, page included (the file count is not budgeted: it grows by four stills per Change, which costs nothing); `validate.py` fails over it and names the heaviest folders. Stills cost little (40 of them, 10 Changes at two widths, weigh 1.0 MB as AVIF at 960px); a Rebuilt frame costs 0.1–0.6 MB; a Real frame ships the app's chunks and every media file its section loads, about 29 MB on a product site. When over budget, walk back down the ladder on the heaviest Change: Real → Rebuilt; a frame's video → its poster, when the Change is not about the video; Rebuilt → Screenshot. Say what was given up in `fidelityNote`. Never raise the budget yourself; the user can, with `--budget-mb` when they ask for a heavier page.

## Getting the Baseline running

- `git worktree add --detach <scratchpad>/design-delta/wt-before <Baseline>` (and `wt-after` when the After is not the user's checkout). Never switch the user's checkout.
- **Give each worktree its own dependencies**: `pnpm install --frozen-lockfile --offline` (or the project's equivalent). A symlinked `node_modules` shares build caches between worktrees and silently builds the wrong commit.
- **Conversation mode, dirty at start**: files modified before the conversation began have a Before no commit holds. Take the current file and undo this conversation's edits in reverse order (Edit: `new_string` back to `old_string`; Write: the last Read before it). A file that cannot be undone uses its Baseline-commit version, and its `fidelityNote` says so.
- Remove the worktrees when the run is done.

## Recording a dirty After

When the working tree is dirty, freeze it so the next DesignDelta can start exactly here, without touching the user's index or stash:

```sh
tmp=$(mktemp -u) && GIT_INDEX_FILE=$tmp git read-tree HEAD && GIT_INDEX_FILE=$tmp git add -A && \
tree=$(GIT_INDEX_FILE=$tmp git write-tree) && \
snap=$(git commit-tree "$tree" -p HEAD -m "DesignDelta After: <folder>") && \
git update-ref "refs/design-delta/<folder>" "$snap"; rm -f "$tmp"
```

The Record's `After:` line names the ref.

## Screenshot

1. Ask the browser question (SKILL.md step 6 rule). Restore a minimized window before capturing.
2. Run each state: a preview deployment when one exists for that commit, else the project's dev server in its worktree, each on its own port; native apps build and install each worktree on the simulator in turn.
3. Capture **the surface, not the page**: clip to the Change's element or section, at every width in `widths`, in the theme the Change concerns. Widths: web `[1440, 390]`; a Change that only shows at one breakpoint gets that width only; native apps the default simulator device's point width (e.g. `[402]`), captured with `xcrun simctl io booted screenshot` and cropped. Force the state the Change is about (open the menu, fill the form, trigger the error) before capturing.
4. Capture PNG, then encode with `python3 <skill>/viewer/still.py <capture.png> c<N>/before-<w>.avif …`: at most 960px wide, full height, AVIF at quality 45. `<w>` names the width captured at, not the file's pixel width. Before and After of one width are captured at the same width, so they read side by side.
5. Rebuilt and Real Changes get their stills the same way, from the running product, never from the frame: the stills are the record of what shipped.

## Rebuilt

Re-implemented from each state's source, scoped to the piece being operated. Frames are small by construction: one HTML file per frame with its markup, JS and images inlined (still images re-encoded like the stills, animated ones kept), plus **one stylesheet per state** (`rebuilt/before.css`, `rebuilt/after.css`) shared by every frame of that state and holding only the rules those frames use, fonts inlined. Video only when the Change is about playback: clips cut to ≤6 s, ≤480px wide, no audio, in `c<N>/clips/`, shared by both sides.

**On a web project, build from the built page** with the two tools in [viewer/](viewer/):

1. Load the piece in the browser at the state's commit and run [viewer/snapshot.js](viewer/snapshot.js) in it, with `groups` naming the controls the Change is about (a workflow rail, a language switch). It saves the markup of every state those controls reach, the wrappers up to `<body>`, and the CSS rules any state uses. Mark elements a motion script needs (`data-dd-field`) before running it.
2. `python3 <skill>/viewer/rebuilt.py css <carrier> --out rebuilt/<state>.css …` once per state, with every capture of that state.
3. `python3 <skill>/viewer/rebuilt.py frame <carrier> --cap … --css rebuilt/<state>.css --out c<N>/<side>.html [--groups …] [--script motion.js]` per frame. The frame swaps states on the same clicks. Motion (parallax, playback turns) is the only code written by hand: a few dozen lines from the piece's source, passed as `--script`.

On devpage this made six frames for four Changes at 2.5 MB together (1.9 MB of frames and stylesheets, 0.6 MB of clips), against 29 MB for the same Changes as Real.

Without a built page to load (native apps, a piece that cannot run alone), write the frame by hand:

- Read the piece's source at the Baseline and now, plus each state's tokens. Write `c<N>/before.html` and `c<N>/after.html` (only the sides that respond) as standalone pages (own doctype, charset, viewport, base styles) in plain HTML, CSS and JS with that state's values, same mock data on both sides.
- Reproduce, never improve: the Before keeps the flaws the Fix fixed. Build the interaction the Change is about and nothing else.
- Native: SwiftUI or Compose modifiers become their CSS equivalents; platform fonts fall back to `system-ui`.
- Inline [viewer/frame.js](viewer/frame.js) at the top of `<head>` with `SHOW` empty.
- Point that side's `frame` at the file (PAGE.md).

## Real

The project's own code, built per state and isolated to the piece. Reach for it only at step 3 of the ladder, and only inside the budget. Time-box: if a state does not build and render after two attempts, use Rebuilt or Screenshot and say why in `fidelityNote`.

Recipe for a static-buildable web app (proven on a prerendered SolidStart site):

1. **Build** each worktree with a relative base (`vite build --base ./`), limiting prerender to the one route.
2. **Share one `_build/`** between states: chunk names carry content hashes, so the union of both states' loaded chunks is enough. Load the page in the browser, click through the piece, and keep only the files it requested.
3. **State files**: copy the prerendered HTML to `c<N>/before.html` / `after.html`, and put `<base href="../real/">` first in `<head>`, then [viewer/frame.js](viewer/frame.js) with `SECTIONS`, `SHOW` and `HIDE` set to isolate the piece. If the client router reads the path, add `history.replaceState(history.state, "", "<route>")` before the app script; the static `<base>` keeps assets resolving.
4. **Media**: Artifact pages cannot load media from other hosts. Keep only what the piece needs, and replace a video with its poster when the Change is not about the video. Download every off-origin file the piece still requests, rewrite its URLs to the local copy, and load the piece once more to confirm zero failed requests.
5. **Served types only**: Artifacts reject other extensions (`.gz`, `.bin`, `.glb`…). Decompress a `.gz` and serve it under a served type (`.wasm` serves raw bytes), then rename the reference too, checking whether the loader branches on the extension.
6. **Text files** must not contain U+FFFD; replace it with the `\uFFFD` escape.

## The frame protocol

Every frame carries [viewer/frame.js](viewer/frame.js): it reports `{ dd: 'size', top, h }` to the viewer, answers `ping`, and follows `{ dd: 'theme' }`. Without it a frame keeps its first height.
