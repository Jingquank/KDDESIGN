---
name: iterate-it
description: Raise a prototype's Fidelity toward the real product (the project's design system values, its own components, icons, fonts, media, copy, data and states), or, with "lower", "more abstract" or "faux ui", lower it to faux UI that keeps its look, its information architecture and every interaction. Redeploys to the same link.
disable-model-invocation: true
argument-hint: [lower] [link | path] [Idea numbers | Pick sheet] [focus]
---

# /iterate-it

Move one prototype's **Fidelity** (how close it is to the shipped product) in one direction, then redeploy it where it was. There are no levels: how far to go is your call, as far as the sources allow, unless the user's words narrow it.

## Direction and target

- **Direction**: **Raise** by default. Any word in any language that means less real ("lower", "more abstract", "faux ui", "降低", "更抽象") makes it **Lower**. Every other word in `$ARGUMENTS` narrows the scope or adds a wish.
- **Target**: a claude.ai Artifact link in the arguments, else a local HTML or component path in them, else the Artifact last published in this conversation. With none, ask for the link in one line and stop.
- **Many prototypes on one page** (a `/crazy-prototype` page and the like): with Idea numbers or a Pick sheet, change only those; otherwise the whole page. The page's layout and grouping may change to suit what the prototypes have become: regroup, resize or reorder them when that shows them better. Each Idea keeps its number and tick, and the copy button keeps working, since the Pick sheet still runs on them.

Before changing anything, list the parts in scope (each Idea, or each region of a single prototype) and work through all of them. Hand over only when every part on the list is done: a page raised halfway reads as two products.

## Raise

**Sources.** Read the repo first: its tokens (CSS variables, Tailwind or theme config), its components and their styles, its icon set, its fonts, its assets, its copy. Use a live URL only when the user gave one; read it in a browser, since its rendered look, states and images are what you are matching and the raw HTML does not show them. With neither, ask in one line which to use. Never invent a design system: a made-up one looks real and is not the product, so it misleads everyone who reviews the prototype.

- **Values**: every color, size, weight, line height, radius, spacing and shadow becomes the system's own value, by its token name when the page can hold variables.
- **Components**: where the repo has the component, rebuild it from its source with the same markup, states and styles. An Artifact is one HTML page and cannot import the project, so copy or compile and inline; never draw a lookalike. Build your own only where the repo has none.
- **Icons and fonts**: the project's icon set (inline its SVGs from source or the package) and its font files. No hand-drawn icons.
- **Media**: the project's own media first, and only where it fits the content: never an asset placed because it happens to exist. Only when the project has none that fits, look outside: a screenshot of the real product or a stock photo, whichever fits best. No SVG drawn to imitate a photo, a chart's data, a map or a screenshot, because a viewer takes it for the real thing. Images travel with the page (`publish_files`, `upload_asset`) or by a stable URL.
- **Copy and data**: the product's own words and voice, in its copy language. Believable names and numbers, uneven lengths, one long one somewhere. No lorem, no gray bars.
- **States**: every control gets the system's hover, focus, pressed and disabled, and does what it says when clicked. Add the empty, loading and error states the surface has.

Motion values and real viewport sizes stay as they are.

## Lower

Faux UI: it still reads as the same product, simplified to what the viewer needs.

- **Keep the look**: layout, grid, sizes, hierarchy, palette and type.
- **Keep the information architecture**: every region, nav item and control, in the same order.
- **Keep every interaction**: what clicked still clicks, every state still switches.
- **Abstract the content**: text becomes bars at the text's own size and line count, images become tinted blocks at their own aspect, charts become their silhouette in quiet tones, avatars become circles. Grays come from the palette; one accent stays only where it marks the focus.
- **3 to 7 real strings** on the whole screen, all spent on the focus: what the prototype is about, read from the conversation or named in the arguments. Controls may turn to bars too; a bar stays clickable.

Three ways it fails. **Wireframe**: two gray blocks and a button; keep the chrome, the icons and the structure, simplify the words, not the context. **Too much**: real text in every row. **Empty**: a void where content was; bars fill a pane the way its content did.

## The floor

Either way, the result has to work: every part renders, keeps its layout at its intended size, and every control that clicked before still does what it shows. Inlined components are where this breaks most often. A blank part, a collapsed or overflowing layout, or a dead control is a bug to fix before publishing. Above that floor there is no review pass.

## Many Ideas in parallel

With 6 or more Ideas in scope, split the work. Read the sources once yourself and write a source sheet to the scratchpad: the token values, the inlined component markup and styles, the icons, the fonts and the media chosen, or on Lower the palette's grays and each Idea's focus. Agents that each read the repo on their own would pick different sources and the page would stop reading as one product.

Then start subagents in one message with the Agent tool, 2 to 4 Ideas each. Each gets the direction, the source sheet, its Ideas' current markup, the section for its direction (Raise or Lower) and the floor. It writes one fragment file per Idea to the scratchpad, every CSS rule and script scoped to `#idea-N`. It never touches the page around its Ideas and never publishes. Wait until every subagent has reported back (they run in the background, so starting them does not end the turn), then drop each fragment into place, reshape the page if it calls for it, and publish.

Fewer Ideas, a single prototype, or no Agent tool: do the work yourself.

## Publish and hand over

Overwrite in place: the same slug with the live version as base (the Artifact's history keeps the old one), or the same local file. Before publishing, `curl -sI` every external image and font URL and replace any that fails. Check nothing in a browser before publishing: speed is the point, and the floor is held while building, not by a review.

Hand over in the user's language: the link, then a short list of only two things: where media came from outside the project, and which parts were built without a repo component to copy. On Lower, the link alone. End the turn.
