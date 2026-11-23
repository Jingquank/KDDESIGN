# KDDESIGN

KD's design skills for coding agents. Four skills that help you explore a design wide, bring it closer to the real product, keep it tidy, and find where it breaks.

## The skills

| Skill | What it does |
|---|---|
| `/kddesign:crazy-prototype <brief>` | Turns a brief into one Artifact page full of pickable Ideas. Tick the Ideas you mean and paste the Pick sheet back with what to do; the next Round applies it. |
| `/kddesign:iterate-it [lower] [link \| path] [Ideas]` | Moves one prototype's fidelity in one direction and redeploys it to the same link. By default it raises it toward the real product: the project's own design tokens, components, icons, fonts, copy, believable data and every control's states. Told to lower it ("lower", "more abstract", "faux ui"), it turns content into faux UI that keeps the look, the information architecture and every interaction. |
| `/kddesign:whip-it [scope]` | Checks this conversation's UI changes (else this branch's, or the scope you name) against nine fixed rules: no labels nobody asked for, consistency and reuse, keep together what belongs together, animate only for context, keep removing, no jargon, as few words as possible, show don't tell, align the text, not the box. It fixes every violation on the spot and lists what changed by rule. |
| `/kddesign:break-it [scope]` | Opens the surfaces you just built in the running app and plays the craziest real person of the product against them: endless titles, 100 uploads, another language, double clicks, a dead network. What broke lands on one Artifact page, the Break Report. Tick the Breaks to fix and paste the Fix Brief into `/kddesign:crazy-prototype`. |

Each skill runs only when you call it.

## What it runs, writes and sends

KDDESIGN has no server of its own, ships no scripts and collects no telemetry. The skills are instructions for Claude, and they work only through tools Claude already has in your session.

- **Artifact pages.** `/crazy-prototype`, `/iterate-it` and `/break-it` publish their pages as Artifacts in your own claude.ai account. They are private until you share them. The pages may load fonts from Google Fonts, and `/iterate-it` may use stock photos from public image sites, checking each one is reachable before publishing.
- **Files in your project.** `/whip-it` and `/iterate-it` edit the UI code or the prototype they are run on.
- **Browsers.** `/break-it` opens your pages with the browser tool Claude is using, and answers every write with a fake reply in the browser, so nothing it does reaches a backend.

## More

The full KDDESIGN, with three more skills (`/design-delta`, `/design-lessons`, `/design-morph`) and the Nudge that records what you push, is at [github.com/Jingquank/KDDESIGN](https://github.com/Jingquank/KDDESIGN).
