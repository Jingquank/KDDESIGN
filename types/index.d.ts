export type Lang = 'zh' | 'en'

export type Skill = 'delta' | 'lessons'

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
      // set when the offer stands in for a passive run the engine refused: the pushed commit to record up to
      after?: string
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
    }

declare module 'claude-code' {
  interface PluginState {
    kddesign: { view: View | null }
  }
}
