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
    }
  | {
      kind: 'pick'
      skill: Skill
      lang: Lang
      root: string
      branch: string
      base: string
      fingerprint: string
      options: string[]
    }
  | {
      kind: 'running'
      skill: Skill
      lang: Lang
      root: string
      agentId: string
      turnId: string | null
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
