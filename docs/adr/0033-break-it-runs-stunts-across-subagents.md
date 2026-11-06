# break-it runs its Stunts across subagents, and its stills get a fresh eye

A Break Report is built from Stunts run one after another in one browser tab, and no Stunt depends on another, so the run grows with its list. So with 8 or more Stunts the run splits them across up to 4 runners, 3 to 5 Stunts each, every runner in a browser context of its own. The main agent keeps what needs the whole run: the app, the list, every question to the user, every Must and Files line, the page and every rerun. A runner proves the write layer in its own context before its first Stunt, because a layer proved in one context says nothing about another.

The main agent keeps writing the Musts. A Must is what `/crazy-prototype` designs against, and four runners would word them four ways. Runners never ask the user: a Stunt that needs what the layer cannot hold comes back as not run, and the main agent asks once per kind, as before.

The stills also get the fresh eye design-delta's stills got in ADR 0030. The agent that saw a Break happen sees it in any still; a reviewer given only each Break's stills and what was seen must point to it, and a still it cannot read is shot again or its text rewritten once.

Not chosen: runners sharing one browser context, since a Stunt that reloads, opens a second tab or stores a filter would change what another runner sees; when the browser has only shared tabs, the main agent keeps those Stunts. Runners writing their own Musts, for the voice above. Letting runners grow the list themselves, since agents that cannot see each other's Stunts repeat them (ADR 0032); they suggest, the main agent adds.
