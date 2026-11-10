export type Lang = 'zh' | 'en'

export type Skill = 'delta' | 'lessons'

// What the heads-up display reads off the branch (ADR 0046): the range a run covers, the Deltas
// since the last Design Lessons Review, the newest Delta's title, and the pages saved at each end.
export type Hud = {
  branch: string
  base: string
  after: string
  count: number
  prev: string | null
  commits: number
  pages: Array<{ route: string; before: boolean; after: boolean }>
  // this session holds the claim on the pushed range
  isClaimed: boolean
}

// What the Nudge shows in the band above the prompt; null shows nothing.
export type View =
  | {
      kind: 'offer'
      skill: Skill
      lang: Lang
      did: string
      didShort: string
      why: string[]
      isExpanded: boolean
      root: string
      branch: string
      base: string
      fingerprint: string
      deltas: number
      // the pushed commit to record up to
      after?: string
      // the engine refused the mod's own start, so this offer stands in for it
      isRefused?: boolean
      hud?: Hud
    }
  | {
      kind: 'pick'
      skill: Skill
      lang: Lang
      root: string
      branch: string
      base: string
      fingerprint: string
      after?: string
      options: string[]
      hud?: Hud
    }
  | {
      // pressed 1: the request is in the conversation, and Claude has not started the agent yet
      kind: 'starting'
      skill: Skill
      lang: Lang
      root: string
      // the description the Agent call carries, which the Nudge knows its run by
      label: string
      startedAt: number
      branch?: string
      isPassive?: boolean
      hud?: Hud
    }
  | {
      kind: 'running'
      skill: Skill
      lang: Lang
      root: string
      agentId: string
      turnId: string | null
      // the branch the run records, and whether the mod started it without asking (ADR 0041)
      branch?: string
      isPassive?: boolean
      startedAt: number
      tools: number
      // the milestone reached (0-4), read from the subagent's own tool calls, and when
      leg: number
      legAt: number
      stills: number
      // the action it is taking now, typed out in the band from actionAt
      action: string
      actionAt: number
      hud?: Hud
      // folded to one row in the status line
      isFolded?: boolean
    }
  | {
      kind: 'done'
      skill: Skill
      lang: Lang
      isOk: boolean
      title: string
      page: string | null
      review: string | null
      delta: string | null
      changes: number | null
      note: string | null
      isExpanded: boolean
      hud?: Hud
    }

declare module 'claude-code' {
  interface PluginState {
    kddesign: { view: View | null }
  }
}
