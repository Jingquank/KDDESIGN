# KDDESIGN

KD's design skills for coding agents. `crazy-prototype` turns a design brief or idea into one artifact page full of pickable prototypes. `DesignDelta` lays a branch's or a conversation's design changes out before-and-after on one artifact page.

## Language

### crazy-prototype

**Design**:
One prototyped direction on the page, rendered as its own section. A page holds several Designs.
_Avoid_: variant, concept, direction, option

**Idea**:
One pickable unit inside a Design: a variation, feature or detail, rendered on its own with a checkbox beneath it.
_Avoid_: option, sub-variant, feature

**Pick**:
An Idea whose checkbox is ticked.
_Avoid_: selection, vote, choice

**Pick sheet**:
The text the page's copy CTA produces: every Pick, grouped by Design, ready to paste back to the agent.
_Avoid_: summary, export, selections

**Brief**:
The context a run starts from: the user's prompt plus whatever the gate's interview added. Shown at the top of the page so every Design can be read against it.
_Avoid_: spec, requirements, context

**Round**:
One published state of the page. Round 1 is the first full set of Designs; each pasted Pick sheet starts the next Round on the same URL.
_Avoid_: version, iteration, revision

**Gate**:
The opening question of a run: grill-me, grill-with-docs, or skip straight to Designs.
_Avoid_: intake, kickoff, onboarding

### DesignDelta

**DesignDelta**:
One artifact page that lays out a set of Changes, each as a Before and an After, and the Record it leaves at Final.
_Avoid_: changelog, diff page, release notes

**Change**:
One intent carried out on one surface (a part of the product a user can name: a section, a screen, a dialog), however many elements and commits it took. A second intent on the same surface is a second Change; a shared component, token or rename used on many surfaces is one Change.
_Avoid_: delta, update, diff, commit

**Before** / **After**:
The two states of a Change: the surface as it was, and as it is now.
_Avoid_: old/new, original/updated

**Fidelity**:
How a Change's Before and After are carried on the page, chosen by what the Change is about: **Screenshot** (a still pair, for anything seen), **Rebuilt** (re-implemented from each state's source) or **Real** (the project's own code), the last two only for a piece the user must operate.
_Avoid_: mode, render type, quality

**Baseline**:
The moment whose state every Before shows. It is the start of the current conversation; or, for a whole branch, the previous DesignDelta's After when there is one, else the point where the branch left the default branch; or, on the default branch itself, a point the user picks (the previous DesignDelta's After, the latest tag, the start of today, or any commit).
_Avoid_: base, starting point, since

**Kind**:
What a Change is: **New** (something a user can point to that was not there, even inside an existing surface: a component, indicator, card, option or visual treatment) or **Fix** (something that existed and was changed, merged or removed). A Change takes the Kind of its main intent; an element added inside a Fix is named in its description. The agent sets every Kind in Round 1; the user's edits override it.
_Avoid_: type, tag, category, label

**Note**:
The user's free text on one Change, written on the page.
_Avoid_: comment, annotation, remark

**Notes**:
The text the page's copy CTA produces: every Change's Kind and Note, ready to paste back to the agent. Pasting it, or saying the page is final with nothing to paste, turns the page into its Final.
_Avoid_: Pick sheet, mark sheet, export

**Final**:
The Round a DesignDelta ends on: Kinds and Notes baked in as fixed content, no editing controls, ready to share.
_Avoid_: Round 2, published version, locked

**Skipped**:
A diff in the DesignDelta's range with no visible effect, listed at the page foot with its reason instead of becoming a Change.
_Avoid_: ignored, excluded, non-design change

**Record**:
The Final of a DesignDelta written as text in the project: each Change's Kind, description, the user's Note as its why, its commits, and small thumbnails. The only part of a DesignDelta that goes into git.
_Avoid_: export, archive, changelog
