# crazy-prototype has a working floor

crazy-prototype trades polish for speed, quantity and variety, and the user's Picks are its review (ADR 0032). That trade covers Ideas that are rough, not a page that is broken: a mock that does not render, a layout that collapses or overflows, or a switch or tick that does nothing leaves the user unable to judge the Idea at all.

So the skill sets a floor: every Idea renders, sits in its layout at its intended size, and its controls do what they show. Anything below the floor is a bug to fix before publishing. Above it the skill still asks for no polishing and no review pass. The floor sits among the rules the drawing subagents receive, so each one holds its own fragment to it.

The main agent also waits for every drawing subagent to report back before it assembles and publishes. The subagents run in the background, so publishing early leaves empty sections, and ending the turn after starting them ends the Round with nothing handed over.

Not chosen: a time budget for the subagents, as Anthropic's Opus 5.5 prompting guide suggests for multiagent harnesses, since it makes the model check its work less and speed is not worth a broken page.
