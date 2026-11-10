# prototype-fidelity drops Figma and AI images, keeps a working floor and splits big pages

An audit against Anthropic's Opus 5.5 prompting guide changed several parts of prototype-fidelity. Parts of ADR 0036 no longer hold.

**No Figma, no AI images.** The skill no longer reads Figma files or calls `generate_image` on the Figma MCP. Raise reads the repo and, when the user gives one, a live URL. When the project has no media that fits, it uses a product screenshot or a stock photo instead.

**A live URL is read in a browser.** Its rendered look, states and images are what Raise matches, and raw HTML does not show them. "No browser" now means only that nothing is checked in a browser before publishing.

**A working floor.** Every part renders, keeps its layout and its controls still work. Inlining compiled components is where a prototype breaks most often, and a broken page cannot be judged. This is a standard for the work, not a review pass.

**Finish the list.** The run lists the parts in scope first and hands over only when all are done, since a page raised halfway reads as two products.

**The page may be reshaped.** On a page of many prototypes, the layout and grouping may change to suit what the prototypes have become. Each Idea keeps its number and tick and the copy button keeps working, so the Pick sheet still runs.

**Big pages split across subagents.** With 6 or more Ideas in scope, the main agent reads the sources once into a source sheet, and subagents rewrite 2 to 4 Ideas each as scoped fragments, as in ADR 0032. One reading keeps every Idea on the same sources; agents reading the repo on their own would choose differently.
