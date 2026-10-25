import { expect, test } from 'claude-code/testing'

import type { View } from '../types'

const OFFER: View = {
  kind: 'offer',
  skill: 'delta',
  lang: 'zh',
  did: '刚完成：结账页 3 个改动定下来了 · 支付按钮、优惠码、订单摘要',
  didShort: '刚完成：结账页 3 个改动',
  why: ['你说了“就这样”，之后转去写测试', '范围：main (4c3b2af) → 按 1 那一刻的快照'],
  isExpanded: false,
  root: '/repo',
  branch: 'feat/checkout',
  base: '4c3b2af',
  fingerprint: 'abc',
  deltas: 0,
}

const band = (bodyColumns: number) =>
  ({
    plugin: 'kddesign',
    component: 'AbovePrompt',
    requestId: 'band',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns, scroll: { offset: 0, bodyRows: 20 }, view: {} },
  }) as const

test('the offer names the skill, says what finished, asks, at any width', async ($, on) => {
  on('state.get', () => ({ value: { value: OFFER, version: 1 } }))
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))

  for (const cols of [120, 80, 48]) {
    const ui = await $.ui.mount(band(cols))
    expect((await ui.find({ type: 'Text', text: /design-delta/ }))?.text).toContain('╡ design-delta ╞')
    expect(await ui.find({ type: 'Text', text: /刚完成/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Design Changelog/ })).toBeDefined()
    expect(await ui.find({ key: 'k1' })).toBeDefined()
    expect(await ui.find({ key: 'k3' })).toBeDefined()
    await ui.unmount()
  }
})

test('a survey holds the band, so the Nudge draws nothing of its own', async ($, on) => {
  on('state.get', () => ({ value: { value: OFFER, version: 1 } }))
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  const target = band(80)
  const ui = await $.ui.mount({ ...target, props: { ...target.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /design-delta/ })).toBeUndefined()
  await ui.unmount()
})

test('another band beneath: the Nudge parks in the status line instead of drawing', async ($, on) => {
  on('state.get', () => ({ value: { value: OFFER, version: 1 } }))
  on('clock.now', () => ({ value: 1_000 }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>Heads up · something else</Text>
  })
  const lines: unknown[] = []
  on('ui.status', (_, e) => {
    lines.push(e)
    return { value: undefined }
  })
  const ui = await $.ui.mount(band(80))
  expect(await ui.find({ type: 'Text', text: /Heads up/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /╡ design-delta ╞/ })).toBeUndefined()
  expect(JSON.stringify(lines)).toContain('■ design-delta · 刚完成：结账页 3 个改动')
  await ui.unmount()
})

const RUNNING: View = {
  kind: 'running',
  skill: 'delta',
  lang: 'zh',
  root: '/repo',
  agentId: 'a1',
  turnId: null,
  startedAt: 0,
  tools: 14,
  leg: 1,
  legAt: 40_000,
  stills: 3,
  action: 'ego-browser · c2 Before · 1440px',
  actionAt: 60_000,
}

test('a run draws a block bar, the milestone, the action it is taking, and Stop', async ($, on) => {
  on('state.get', () => ({ value: { value: RUNNING, version: 1 } }))
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 105_000 }))
  for (const cols of [80, 48]) {
    const ui = await $.ui.mount(band(cols))
    const rule = (await ui.find({ type: 'Text', text: /╡ design-delta ╞/ }))?.text ?? ''
    expect(rule).toContain('█')
    expect(rule).toContain('░')
    expect(await ui.find({ type: 'Text', text: /截图 3/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /ego-browser/ })).toBeDefined()
    expect(await ui.find({ key: 'stop' })).toBeDefined()
    await ui.unmount()
  }
})

const REFUSED: View = {
  kind: 'done',
  skill: 'delta',
  lang: 'en',
  isOk: false,
  title: 'Could not start the background run',
  page: null,
  review: null,
  delta: null,
  changes: null,
  note: 'Agent refused by auto mode',
  isExpanded: true,
}

test('a run that did not start says so, and Details shows why', async ($, on) => {
  on('state.get', () => ({ value: { value: REFUSED, version: 1 } }))
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  const ui = await $.ui.mount(band(80))
  expect(await ui.find({ type: 'Text', text: /Could not start the background run/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /refused by auto mode/ })).toBeDefined()
  await ui.unmount()
})

const STARTING: View = {
  kind: 'starting',
  skill: 'delta',
  lang: 'en',
  root: '/repo',
  label: 'design-delta (KDDESIGN Nudge k3f9)',
  startedAt: 1_000,
}

test('after 1, the band says the request is with Claude until the agent starts', async ($, on) => {
  on('state.get', () => ({ value: { value: STARTING, version: 1 } }))
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 2_000 }))
  const ui = await $.ui.mount(band(80))
  expect(await ui.find({ type: 'Text', text: /Asked Claude to start design-delta in the background/ })).toBeDefined()
  expect(await ui.find({ key: 'k1' })).toBeUndefined()
  await ui.unmount()
})

// A small stand-in for the session's $.state, so a test can watch the view change.
type On = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

function stateFrom(on: On, first: View | null) {
  let current: View | null = first
  let version = 1
  on('state.get', () => ({ value: { value: current, version } }))
  on('state.set', (_, e) => {
    current = (e as unknown as { value: View | null }).value
    version += 1
    return { value: { isSet: true, version } }
  })
  return () => current
}

const LESSONS_OFFER: View = { ...OFFER, skill: 'lessons', lang: 'en', base: '', fingerprint: '5', deltas: 5 }

test('1 puts the request into the conversation in the user\'s name, and waits for Claude to start the agent', async ($, on) => {
  const view = stateFrom(on, LESSONS_OFFER)
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('fs.exists', () => ({ value: false }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  const asked: Array<{ text: string; origin?: unknown }> = []
  on('prompt.submit', (_, e) => {
    asked.push(e as never)
    return { text: e.text }
  })

  const ui = await $.ui.mount(band(80))
  await ui.press({ key: 'k1' })
  await ui.unmount()

  expect(asked).toHaveLength(1)
  expect(JSON.stringify(asked[0]!.origin)).toContain('"asUser":true')
  const now = view()
  expect(now?.kind).toBe('starting')
  expect(asked[0]!.text).toContain(`description "${(now as Extract<View, { kind: 'starting' }>).label}"`)
  expect(asked[0]!.text).toContain('skills/design-lessons/SKILL.md')
})

// An Agent call as the engine raises it, with the description that tells the runs apart.
const spawnOf = (description: string) => ({
  prompt: 'run it',
  description,
  tool_use_id: 't1',
  subagentType: 'general-purpose',
  provider: { plugin: 'engine', tier: 'core' as const },
  parentModel: 'claude-opus-5-5',
  background: true,
  fork: false,
})

test('the agent Claude starts for the request is the run the band follows', async ($, on) => {
  const view = stateFrom(on, STARTING)
  on('clock.now', () => ({ value: 2_000 }))
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a9' }))
  await $.agent.spawn(spawnOf(STARTING.kind === 'starting' ? STARTING.label : ''))
  expect(view()?.kind).toBe('running')
  expect((view() as Extract<View, { kind: 'running' }>).agentId).toBe('a9')
})

test('another agent with another description leaves the request waiting', async ($, on) => {
  const view = stateFrom(on, STARTING)
  on('clock.now', () => ({ value: 2_000 }))
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a7' }))
  await $.agent.spawn(spawnOf('Explore the repo'))
  expect(view()?.kind).toBe('starting')
})
