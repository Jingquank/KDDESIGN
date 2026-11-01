# Scene data

A run writes a **film folder** of data and assets; the engine in [engine/](engine/) does everything else. `build.mjs` checks every reference and inlines the scene into `index.html`; `check.mjs` reads the same files.

## Film folder

`<scratchpad>/design-morph/<film-id>/`, published from there as one multi-file Artifact:

```
fieldnote/
├── scene.json          the film: stage, theme, timing, languages, the act list
├── acts/library.json   one file per act: layers, windows, grid, chapters, elements
├── assets/             icons.json, fonts, media crops, SVGs, picture icons
├── scene.css           optional, scoped (Extending)
├── types/<name>.js     optional, custom element types (Extending)
├── index.html  morph-engine.js  morph-player.js     written by build.mjs
│   morph-sound.js  cuelume.js
└── gen/ measure/ frames/ render/                     local only, never published
```

`gen/` may hold a throwaway script that writes `acts/*.json` from the measurements; only its output is published, and a re-run writes a fresh one.

## scene.json

```json
{
  "id": "fieldnote",
  "title": "Fieldnote Design Morph",
  "sub": "Fieldnote v1 at app.fieldnote.example → Fieldnote v2",
  "stage": { "w": 1440, "h": 900, "gutter": 8 },
  "timing": { "card": 0.8, "act": 13.333 },
  "langs": ["en", "zh"],
  "theme": {
    "accent": "#2f6fed", "onAccent": "#ffffff",
    "ui": "'Manrope','Noto Sans SC',system-ui,sans-serif",
    "oldFont": "'Roboto',system-ui,sans-serif", "newFont": "'Manrope',system-ui,sans-serif",
    "fonts": [{ "family": "Manrope", "src": "assets/manrope.woff2", "weight": "300 800" }],
    "fontLinks": ["https://fonts.googleapis.com/css2?family=Roboto:wght@300..900&display=swap"],
    "oldInk": "#fafafa", "newInk": "#1f2328",
    "corner": "superellipse(2)", "radiusCap": 28,
    "ease": { "move": [0.16, 1, 0.3, 1], "exit": [0.4, 0, 1, 1] },
    "oldSkin": { "auto": "dark", "map": { "#ffffff": "#1c1c1c" }, "text": { "#1f2328": "#fafafa" } }
  },
  "sound": { "theme": "bubble", "mute": { "h.badge": "a counter that ticks every frame of its act; its cue would be noise" } },
  "acts": ["home", "library", "editor"]
}
```

- **title** ends with `Design Morph`; a re-run finds the film by it (SKILL.md step 2).
- **stage**: the after-project's primary breakpoint, in CSS px (`1440 × 900` desktop, `390 × 844` phone). Every coordinate in the acts is in this space. Portrait works in the player and the MP4.
- **timing**: the title card and one act at 1×, in seconds. Fixed defaults; never asked.
- **langs**: the project's language and English, or `["en"]` for an English project. Every caption and title carries each.
- **theme.accent** / **onAccent** / **ui**: the after-project's accent, the ink on it, and its UI font: guides and spec tags use them. Never a mono font.
- **oldFont** / **newFont**: the families text swaps between with the skin. Fonts come from `fonts` (files in `assets/`) or `fontLinks` (Google Fonts only; other hosts are blocked in an Artifact).
- **oldInk** / **newInk**: the default text color of an old and a new state.
- **corner**: the after-UI's `corner-shape` (`superellipse(2)`), or `null` when it uses plain radii. Where the browser lacks it, radii above `radiusCap` are capped.
- **ease**: the after-project's motion tokens when it has them; otherwise ease-out-expo for moves and enters, ease-in for exits.
- **sound**: optional. The film sounds by the Cue map in `engine/sound.js` with no field at all; the agent never picks sounds. `theme` is a cuelume theme (`bubble` by default; `default`, `mech` or `press` only when the user asks). `mute` silences a few elements, each with its reason, for a cue the map gets wrong in this film; it is listed in the hand-over like any exemption. `"off": true` makes a silent film, only when the user asks.
- **oldSkin**: how the new structure looks before the skin turns (the middle state). `map` gives a new color's old-skin color; `text` the same for text colors (dark ink must stay light on a dark old skin). Unmapped neutrals flip by `auto`: `dark` (the old app was dark), `light`, or `none`.

## acts/<key>.json

```json
{
  "key": "library",
  "title": { "en": "Library", "zh": "作品库" },
  "pages": { "before": "https://app.fieldnote.example/library", "after": "http://localhost:3000/library" },
  "page": { "o": "#121212", "n": "#e9e6e0" },
  "layers": [{ "id": "base", "z": 0 }, { "id": "main", "clip": "m.pane", "z": 1 }, { "id": "side", "clip": "s.pane", "z": 2 }, { "id": "top", "z": 4 }],
  "win": { "grid": [0.04, 0.12], "chrome": [0.12, 0.27], "nav": [0.26, 0.42], "tiles": [0.48, 0.66], "panel": [0.64, 0.82], "skin": [0.8, 0.93] },
  "grid": { "cols": [[8, 288, "288"], [304, 1128, "1128"]], "gutters": [0, 296, 1432] },
  "room": { "from": [208, 48, 1232, 852], "to": [304, 8, 1128, 884], "layers": ["main"], "g": "nav", "at": [0.05, 0.38] },
  "pageBg": [0.8, 0.88],
  "chapters": [{ "k": "start", "t": 0, "en": ["Old library", "One plain sentence: what the viewer sees."], "zh": ["…", "…"] }],
  "els": []
}
```

- **key**: the `#<key>` deep link. ASCII letters, digits and hyphens; not `settings`, `sidebar`, `customize`, `upgrade` or `downloads` (claude.ai reserves them).
- **pages**: the page pair this act morphs (step 3), so a re-run can measure it again.
- **layers**: stacking and clipping. A layer with `clip` is a rounded box that follows that element's box and corner every frame, so its content clips to the pane's shape (lesson 8). Elements name their layer in `ly`; the default is `main`. Within a layer, elements draw in `els` order, later ones on top: list a container before what it holds (lesson 15).
- **win**: one window per group, as fractions of the act, plus `grid` (the column trace) and `skin` (the turn to the new skin). Story order is skeleton first: grid and layout, then content, then skin. Windows must step forward and stay inside 0..1.
- **grid**: the after-UI's columns `[x, w, label]` and gutter positions, traced in the grid chapter and retracted when the skin turns.
- **room**: lesson 2. While a new pane takes room, every old element in `layers` scales from `from` into `to` in one move (group `g`, window `at`); give the pane elements the same `at`.
- **stagger**: optional, `{ "<group>": ms }`: the gap between items of that group in reading order, for a group that wants other than the default 60 ms (a grid of tiles reads well at 100). The engine tightens a long group toward 40 ms; past that, `check.mjs` reports a time finding (lesson 13).
- **chapters**: one caption per chapter, `t` strictly increasing from 0. `[heading, sentence]` per language: the sentence says what changed and why, in plain words.

## Elements

```json
{ "id": "l.title", "ly": "main", "g": "header", "k": 1, "at": [0, 0.5], "spec": "title 20 / 600",
  "o": { "x": 760, "y": 112, "w": 140, "h": 40, "fs": 32, "fw": 600 },
  "n": { "x": 318, "y": 20, "w": 90, "h": 28, "fs": 20, "fw": 600, "c": "#1f2328" },
  "to": "LIBRARY", "tn": "Library" }
```

| Field | Meaning |
|---|---|
| `id` | unique in the act; prefixes by area help (`s.` shell, `l.` library) |
| `ly` | layer id |
| `g` | group: its window in `win` times the element's layout change |
| `k` | stagger order inside its group and role (then top to bottom, left to right) |
| `at` | `[start, end]` inside the group window, overriding the stagger |
| `o` / `n` | the old and new state (below). No `o`: an **enter**. `n` absent or `n.op: 0`: an **exit**. Both: a **move** |
| `to` / `tn` | old and new content (HTML, as text the scene controls). `tn` defaults to `to` |
| `ico` | `{ o, n }` icon names in `assets/icons.json` (mask icons, take `c`), or `img:assets/x.png` for a picture icon |
| `img` | `{ o, n }` media paths: photos and video frames as crops (lesson 10) |
| `plate` | `{ o, n }` each `{ src, crop: [x, y, w, h], size: [w, h] }`: a crop of a full screenshot, scaled to cover the box |
| `html` | extra markup inside the element (`.sk-o` / `.sk-n` children swap with the skin, `.n-html` fades in with the layout) |
| `type` | a custom element type from `types/` (Extending) |
| `cls` | classes: `center`, `centerN` (new text centered), `right`, `wrap`, `contain`, `pad4` `pad6` `pad8` `pad9` (icon inset), `fadeleft`, plus `x-` classes from `scene.css` |
| `via` / `via2` | waypoints `{ g, at, x, y, … }` that park an element out of the way first (lesson 3). `via2` may give `dx`, `dy` from the first waypoint |
| `spec` | the spec tag: free text, on a few key elements per act only, the ones that best explain the change (`card 400 × 480 · r28`). `specAt`: `below` or `inside` |
| `skinTag` | a token tag shown while the element's color turns |
| `skinWith` | the pane whose skin window this element shares (a traveller that lands on that pane). Content of a clipped layer already shares its pane's |
| `swapAt` | `[a, b]` of the layout progress over which `to` swaps to `tn` (default `[0.2, 0.62]`) |
| `plateAt` | the same for plates |
| `travel` | the most an exit drifts toward its new box, px (default 28; `0` fades in place) |
| `shrink` / `grow` / `rise` | exit scale, enter scale, enter rise in px |
| `fadeTo` | an element whose current fill the `.plfade` overlay fades into (lesson 7) |
| `ok` | ids this element may overlap on purpose; say why in a comment in the generator |
| `clipOk` | its pane is meant to crop it (a plate wider than the pane) |
| `keep` | it stays as it is; the leftover rule skips it |
| `snapOk` | a one-frame change the design wants (a hard cut inside the element); the snap rule skips it. Say why in a comment in the generator |
| `driftOk` | it may pull away from the box that holds it in flight; the drift rule skips its pairs. Say why |
| `iconOk` | its old icon art may scale with the box (a mark meant to change size, such as a logo settling to the new header); the icon rule skips it. Say why |

A state: `x y w h` (px), `r` radius, `bg` fill, `bd` border color, `bw` border width, `bs` border style, `c` text and icon color, `fs` `fw` `ls` `lh` type, `pl` text inset, `op` opacity. An enter's old state is its new state in the old skin; an exit's new state is its old state at `op: 0`.

## Assets

- `assets/icons.json`: `{ "<name>": "data:image/svg+xml;…" }`, every icon of both apps, pulled from their DOM or source (lesson 11). Names say the side: `old/material-symbols:home`.
- Fonts: the after-project's UI font file. Media: the curated set, the same files on both sides so tiles travel one to one.
- Tokens inside strings, expanded by `build.mjs` and kept as tokens in the stored scene: `{{svg:assets/x.svg}}` (inline markup, so it takes `currentColor`) and `{{icon:<name>}}` (an icon's data URI, for `<i class="mi" style="--m:url(&quot;{{icon:…}}&quot;)">`).
- Images load only as the Artifact's own files or `data:` URIs: no remote URLs.

## Extending

When a component cannot be expressed with the fields above, extend the film, never the engine:

- **`scene.css`**: every selector names an `x-` class (`.x-seg3 b { … }`); `build.mjs` puts each under `.world` so it cannot reach the player, and refuses every at-rule. It also refuses `@keyframes`, `transition` and `animation`: they run on the browser's wall clock, which the player's seek and the frame tools cannot reach, so stills and the MP4 would catch them at random points. Motion goes in a type's `frame()`.
- **`types/<name>.js`**: registers an element type, used with `"type": "<name>"`:

  ```js
  Morph.type('meter', {
    html: (e, A) => '<span class="x-meter"><b></b></span>',             // markup, once
    frame: (e, now, node) => node.querySelector('b').style.width = `${now.L * 100}%`,   // every frame
  });
  ```

  `now` has the box (`x y w h r fs pl`), `op`, `L` (layout progress), `S` (skin progress), `bg`, `bd`, `c`.

A type changes only how its element draws; its box is still the engine's, so `check.mjs` covers it. If an extension cannot do what a film needs, the engine needs a feature: change it in the skill, with an eval, for every film.
