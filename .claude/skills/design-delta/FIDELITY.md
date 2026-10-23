# Carrying Before and After

## Pick by what the Change is

| The Change is about… | Fidelity | Carries |
|---|---|---|
| layout, visuals, copy, tokens, icons, a removed or new surface | **Screenshot** | a still pair per width, plus `live` links when preview deployments exist |
| how something moves or responds: motion, hover, drag, a picker that must not jump, a 3D or canvas stage | **Rebuilt**, else **Real** | only that piece, operable |
| accessibility, sound, haptics | **Screenshot** + a diagram or text in `desc` | |
| copy with no surface: search snippets, `llms.txt`, store listings | **Rebuilt** as a text card (a search result, the file excerpt), width `[760]` | the old and new text, the changed words marked |

A Change gets Rebuilt or Real only when operating it is the point: its intent adds or changes how something responds (a new picker, new motion, new parallax). Something interactive that works as before (an existing 3D stage inside a re-laid-out section) does not make the Change operable. Write the reason in `fidelityNote`. When in doubt, Screenshot: a still plus a live link is cheap and honest, and a wrong interactive copy is worse than a picture.

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
4. Save WebP to `c<N>/before-<w>.webp` and `c<N>/after-<w>.webp`. Before and After of one width share the same clip box, so the slider lines up.

## Rebuilt

Re-implemented from each state's source, scoped to the piece being operated.

- Read the piece's source at the Baseline and now, plus each state's tokens. Write `c<N>/before.html` and `c<N>/after.html` as standalone pages (own doctype, charset, viewport, base styles) in plain HTML, CSS and JS with that state's values, same mock data on both sides.
- Reproduce, never improve: the Before keeps the flaws the Fix fixed. Build the interaction the Change is about and nothing else.
- Native: SwiftUI or Compose modifiers become their CSS equivalents; platform fonts fall back to `system-ui`.
- Inline [viewer/frame.js](viewer/frame.js) at the top of `<head>` with `SHOW` empty.

## Real

The project's own code, built per state and isolated to the piece. Reach for it only when Rebuilt cannot be faithful (a WebGL stage, a physics simulation, a third-party widget). Time-box: if a state does not build and render after two attempts, use Rebuilt or Screenshot and say why in `fidelityNote`.

Recipe for a static-buildable web app (proven on a prerendered SolidStart site):

1. **Build** each worktree with a relative base (`vite build --base ./`), limiting prerender to the one route.
2. **Share one `_build/`** between states: chunk names carry content hashes, so the union of both states' loaded chunks is enough. Load the page in the browser, click through the piece, and keep only the files it requested.
3. **State files**: copy the prerendered HTML to `c<N>/before.html` / `after.html`, and put `<base href="../real/">` first in `<head>`, then [viewer/frame.js](viewer/frame.js) with `SECTIONS`, `SHOW` and `HIDE` set to isolate the piece. If the client router reads the path, add `history.replaceState(history.state, "", "<route>")` before the app script; the static `<base>` keeps assets resolving.
4. **Media**: Artifact pages cannot load media from other hosts. Download every off-origin file the piece requested, rewrite its URLs to the local copy, and load the piece once more to confirm zero failed requests.
5. **Served types only**: Artifacts reject other extensions (`.gz`, `.bin`, `.glb`…). Decompress a `.gz` and serve it under a served type (`.wasm` serves raw bytes), then rename the reference too, checking whether the loader branches on the extension.
6. **Text files** must not contain U+FFFD; replace it with the `�` escape.

## The frame protocol

Every Rebuilt and Real state file carries [viewer/frame.js](viewer/frame.js): it reports `{ dd: 'size', top, h }` to the viewer, answers `ping`, and follows `{ dd: 'theme' }`. Without it a frame keeps its first height.
