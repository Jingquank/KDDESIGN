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
  action: 'browser screenshot · c2 Before · 1440px',
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
    expect(await ui.find({ type: 'Text', text: /browser screenshot/ })).toBeDefined()
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

test('1 pressed again while the first press is still starting the run asks only once', async ($, on) => {
  stateFrom(on, OFFER)
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  on('store.get', () => ({ value: { rulesFile: 'DESIGN.md' } }))
  on('store.set', () => ({ value: undefined }))
  on('fs.exists', () => ({ value: false }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'abc', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  const asked: unknown[] = []
  on('prompt.submit', (_, e) => {
    asked.push(e)
    return { text: e.text }
  })

  const ui = await $.ui.mount(band(80))
  await Promise.all([ui.press({ key: 'k1' }), ui.press({ key: 'k1' }), ui.press({ key: 'k1' })])
  await ui.unmount()

  expect(asked).toHaveLength(1)
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

test('the Deltas are counted where the Design deltas line points, not in docs/deltas', async ($, on) => {
  const view = stateFrom(on, null)
  const files: Record<string, string> = {
    '/repo/CLAUDE.md': '# Repo\n\nDesign deltas: design/deltas/ — one Delta per /design-delta run.\n',
  }
  const deltas = ['2026-10-01-a.md', '2026-10-02-b.md', '2026-10-03-c.md', '2026-10-04-d.md', '2026-10-05-checkout-polish.md']
  on('session.repo', () => ({ value: { root: '/repo', remote: null } as never }))
  on('store.get', () => ({ value: { isOn: true } }))
  on('store.set', () => ({ value: undefined }))
  on('session.messages', () => ({ value: [] }))
  on('fs.exists', (_, e) => ({ value: e.path in files || e.path === '/repo/design/deltas' }))
  on('fs.read', (_, e) => ({ value: files[e.path] ?? '' }))
  on('fs.list', (_, e) => ({ value: e.path === '/repo/design/deltas' ? deltas.map(name => ({ name, kind: 'file' }) as never) : [] }))
  on('process.run', (_, e) => {
    const args = e.argv.slice(1).join(' ')
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (args === 'rev-parse --abbrev-ref HEAD') return ok('main')
    if (args.startsWith('rev-parse --verify')) return ok('abc')
    if (args.startsWith('ls-files') || args.startsWith('grep')) return ok('')
    return { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const ran = await $.command.run({ command: 'nudge', args: '' } as never)
  expect(ran.text).toContain('it is up above the prompt')
  const now = view() as Extract<View, { kind: 'offer' }>
  expect(now.skill).toBe('lessons')
  expect(now.deltas).toBe(5)
  expect(now.did).toContain('checkout-polish')
})

test('a Delta whose After is a snapshot of a dirty tree is the Baseline, so its work is not offered again', async ($, on) => {
  stateFrom(on, null)
  const files: Record<string, string> = {
    '/repo/docs/deltas/2026-10-05-checkout-polish.md':
      '# Checkout Polish\nBranch feat/checkout · 4c3b2af (4 Oct) → 97fc928 (5 Oct) · Page: x\nAfter: 97fc928 · snapshot commit "design-delta snapshot (KDDESIGN Nudge)"\n',
  }
  const diffs: string[] = []
  on('session.repo', () => ({ value: { root: '/repo', remote: null } as never }))
  on('store.get', () => ({ value: { isOn: true } }))
  on('store.set', () => ({ value: undefined }))
  on('session.messages', () => ({ value: [] }))
  on('fs.exists', (_, e) => ({ value: e.path in files || e.path === '/repo/docs/deltas' }))
  on('fs.read', (_, e) => ({ value: files[e.path] ?? '' }))
  on('fs.list', (_, e) => ({ value: e.path === '/repo/docs/deltas' ? [{ name: '2026-10-05-checkout-polish.md', kind: 'file' } as never] : [] }))
  on('process.run', (_, e) => {
    const args = e.argv.slice(1).join(' ')
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (args === 'rev-parse --abbrev-ref HEAD') return ok('feat/checkout')
    if (args.startsWith('rev-parse --verify')) return ok('abc')
    if (args === 'merge-base --is-ancestor 97fc928^ HEAD') return ok('')
    if (args === 'log -1 --format=%s 97fc928') return ok('design-delta snapshot (KDDESIGN Nudge)')
    if (args.startsWith('diff')) diffs.push(args)
    if (args.startsWith('ls-files') || args.startsWith('grep') || args.startsWith('diff')) return ok('')
    return { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.command.run({ command: 'nudge', args: '' } as never)
  expect(diffs[0]).toBe('diff --name-only 97fc928')
})

const FINISHED: View = {
  kind: 'done',
  skill: 'delta',
  lang: 'en',
  isOk: true,
  title: 'Checkout Polish',
  page: 'https://claude.ai/artifact/abc',
  review: null,
  delta: 'docs/deltas/2026-10-28-checkout-polish.md',
  changes: 3,
  note: null,
  isExpanded: false,
}

const REVIEWED: View = { ...FINISHED, review: 'https://claude.ai/artifact/rev' } as View

test('a finished run with only a Design Changelog offers Open and Dismiss, nothing to approve', async ($, on) => {
  stateFrom(on, FINISHED)
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  const ui = await $.ui.mount(band(120))
  for (const [key, label] of [['k1', 'Open'], ['k2', 'Dismiss']]) {
    expect((await ui.find({ key: key! })) as unknown as { props: { label: string } }).toMatchObject({ props: { label } })
  }
  await ui.unmount()
})

test('a finished run with a Design Lessons Review offers Open, Approve, Approve with Changes and Dismiss', async ($, on) => {
  stateFrom(on, REVIEWED)
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  const ui = await $.ui.mount(band(120))
  for (const [key, label] of [['k1', 'Open'], ['k2', 'Approve'], ['k3', 'Approve with Changes'], ['k4', 'Dismiss']]) {
    expect((await ui.find({ key: key! })) as unknown as { props: { label: string } }).toMatchObject({ props: { label } })
  }
  await ui.unmount()
})

test('Approve asks in the user\'s name to accept every Review item, never to change the Changelog, and the band goes', async ($, on) => {
  const view = stateFrom(on, REVIEWED)
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  const asked: Array<{ text: string }> = []
  on('prompt.submit', (_, e) => {
    asked.push(e as never)
    return { text: e.text }
  })
  const ui = await $.ui.mount(band(120))
  await ui.press({ key: 'k2' })
  await ui.unmount()
  expect(asked).toHaveLength(1)
  expect(asked[0]!.text).toContain('Accept every item as drafted')
  expect(asked[0]!.text).toContain('https://claude.ai/artifact/rev')
  expect(asked[0]!.text).not.toContain('Final')
  expect(view()).toBeNull()
})

test('Approve with Changes puts a line to paste the Verdicts under into the prompt box', async ($, on) => {
  const view = stateFrom(on, REVIEWED)
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 1_000 }))
  const filled: string[] = []
  on('prompt.fill', (_, e) => {
    filled.push(e.text)
    return { isFilled: true }
  })
  const ui = await $.ui.mount(band(120))
  await ui.press({ key: 'k3' })
  await ui.unmount()
  expect(filled).toEqual(['I made changes on the page; my Verdicts are pasted below:\n'])
  expect(view()).toBeNull()
})

// ----- passive recording (ADR 0041) -----

// A repo on feat/checkout whose Design deltas line says (auto), with one Delta ending at aaa1111
// and a UI file pushed after it, up to up1.
function autoRepo(on: On, mark = ' (auto)') {
  const files: Record<string, string> = {
    '/repo/CLAUDE.md': `# Repo\n\nDesign deltas: docs/deltas/${mark} — recorded when pushed.\n`,
    '/repo/docs/deltas/2026-10-05-checkout-polish.md': '# Checkout Polish\nBranch feat/checkout · 4c3b2af → aaa1111\nAfter: aaa1111\n',
  }
  const ran: string[] = []
  on('session.repo', () => ({ value: { root: '/repo', remote: null } as never }))
  on('store.get', () => ({ value: { isOn: true } }))
  on('store.set', () => ({ value: undefined }))
  on('session.messages', () => ({ value: [] }))
  on('clock.now', () => ({ value: 5_000 }))
  on('ui.toast', (_, e) => {
    ran.push(`toast: ${(e as unknown as { text: string }).text}`)
    return { value: undefined } as never
  })
  on('model.complete', () => ({ value: { isAnswered: true, text: '{"visible":true,"settled":false,"ui_ongoing":true,"did":"Just finished: pay button","did_short":"pay button","why":"w","lang":"en"}' } }) as never)
  on('fs.exists', (_, e) => ({ value: e.path in files || e.path === '/repo/docs/deltas' }))
  on('fs.read', (_, e) => ({ value: files[e.path] ?? '' }))
  on('fs.list', (_, e) => ({ value: e.path === '/repo/docs/deltas' ? [{ name: '2026-10-05-checkout-polish.md', kind: 'file' } as never] : [] }))
  on('process.run', (_, e) => {
    const args = e.argv.slice(1).join(' ')
    ran.push(args)
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (args === 'rev-parse --abbrev-ref HEAD') return ok('feat/checkout')
    if (args === 'rev-parse --verify --quiet @{upstream}') return ok('up1')
    if (args.startsWith('rev-parse --verify')) return ok('abc')
    if (args.startsWith('merge-base --is-ancestor')) return ok('')
    if (args === 'diff --name-only aaa1111 up1') return ok('src/checkout/PayButton.tsx')
    if (args.startsWith('diff') || args.startsWith('add') || args.startsWith('commit') || args === 'push') return ok('x')
    return { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return ran
}

test('with (auto), pushed UI work starts a passive run by itself, though the work has not Settled', async ($, on) => {
  const view = stateFrom(on, null)
  autoRepo(on)
  const spawned: Array<{ prompt: string; description: string }> = []
  on('agent.spawn', (_, e) => {
    spawned.push(e as never)
    return { model: 'claude-opus-5-5', agentId: 'p1' }
  })
  on('agent.list', () => ({ value: spawned.map(s => ({ id: 'p1', description: s.description })) }) as never)
  const asked: unknown[] = []
  on('prompt.submit', (_, e) => {
    asked.push(e)
    return { text: e.text }
  })

  await $.command.run({ command: 'nudge', args: '' } as never)

  expect(asked).toHaveLength(0)
  expect(spawned).toHaveLength(1)
  expect(spawned[0]!.prompt).toContain('--range aaa1111..up1 --passive --branch feat/checkout')
  const now = view() as Extract<View, { kind: 'running' }>
  expect(now.kind).toBe('running')
  expect(now.isPassive).toBe(true)
  expect(now.agentId).toBe('p1')
})

test('a refused passive spawn falls back to the one-key offer for the same pushed range', async ($, on) => {
  const view = stateFrom(on, null)
  autoRepo(on)
  on('agent.spawn', () => ({ deny: 'not asked for in the conversation' }))

  await $.command.run({ command: 'nudge', args: '' } as never)

  const now = view() as Extract<View, { kind: 'offer' }>
  expect(now.kind).toBe('offer')
  expect(now.after).toBe('up1')
  expect(now.why.join(' ')).toContain('not asked for in the conversation')
})

const PASSIVE: View = { ...RUNNING, lang: 'en', branch: 'feat/checkout', isPassive: true }

test('a passive run never takes the band: one status line', async ($, on) => {
  on('state.get', () => ({ value: { value: PASSIVE, version: 1 } }))
  on('ui.render', $ => ({ type: 'engine', ref: 0 }) as never)
  on('clock.now', () => ({ value: 61_000 }))
  const lines: unknown[] = []
  on('ui.status', (_, e) => {
    lines.push(e)
    return { value: undefined }
  })
  const ui = await $.ui.mount(band(80))
  expect(await ui.find({ type: 'Text', text: /╡ design-delta ╞/ })).toBeUndefined()
  expect(JSON.stringify(lines)).toContain('■ design-delta')
  await ui.unmount()
})

test('a finished passive run commits the Delta alone, pushes it, and leaves the band empty', async ($, on) => {
  const view = stateFrom(on, PASSIVE)
  const ran = autoRepo(on)
  on('turn.complete', () => ({ text: '' }) as never)
  await $.turn.complete({ agentId: 'a1', answer: '{"delta": "docs/deltas/2026-11-09-pay-button.md", "title": "Pay Button", "changes": 2, "review": null, "note": null}' } as never)

  expect(view()).toBeNull()
  expect(ran).toContain('add -- docs/deltas/2026-11-09-pay-button.md')
  expect(ran).toContain('commit -m design-delta: Pay Button [skip ci] -- docs/deltas/2026-11-09-pay-button.md')
  expect(ran).toContain('push')
})

test('a finished passive run with a page says where the page is', async ($, on) => {
  const view = stateFrom(on, PASSIVE)
  const ran = autoRepo(on)
  on('turn.complete', () => ({ text: '' }) as never)
  await $.turn.complete({ agentId: 'a1', answer: '{"page": "https://claude.ai/artifact/pay", "delta": "docs/deltas/2026-11-09-pay-button.md", "title": "Pay Button", "changes": 2, "review": null, "note": null}' } as never)

  expect(view()).toBeNull()
  expect(ran).toContain('toast: Recorded Pay Button · Delta committed and pushed · page https://claude.ai/artifact/pay')
})

test('stills cropped from saved pages move a passive run to the stills leg and are counted', async ($, on) => {
  const view = stateFrom(on, { ...PASSIVE, leg: 0, stills: 0 } as View)
  on('clock.now', () => ({ value: 9_000 }))
  on('tool.call', () => ({ result: '' }) as never)
  await $.tool.call({ tool: 'Bash', agentId: 'a1', command: 'node /p/skills/design-delta/viewer/snap.mjs pair --root /repo --base aaa1111 --after up1' } as never)
  await $.tool.call({ tool: 'Bash', agentId: 'a1', command: 'node /p/skills/design-delta/viewer/snap.mjs still --from x.mhtml --out c1.png' } as never)
  const now = view() as Extract<View, { kind: 'running' }>
  expect(now.leg).toBe(1)
  expect(now.stills).toBe(1)
})

test('on another branch than the run recorded, the Delta is left uncommitted', async ($, on) => {
  const view = stateFrom(on, { ...PASSIVE, branch: 'feat/other' } as View)
  const ran = autoRepo(on)
  on('turn.complete', () => ({ text: '' }) as never)
  await $.turn.complete({ agentId: 'a1', answer: '{"delta": "docs/deltas/2026-11-09-pay-button.md", "title": "Pay Button", "changes": 2, "review": null, "note": null}' } as never)

  expect(view()).toBeNull()
  expect(ran.some(args => args.startsWith('commit'))).toBe(false)
  expect(ran).not.toContain('push')
})

// ----- page snapshots (ADR 0042) -----

test('the first UI edit since the Baseline saves the page before the edit runs, once', async ($, on) => {
  stateFrom(on, null)
  const ran = autoRepo(on)
  on('tool.call', (_, e) => {
    ran.push(`tool ${e.tool}`)
    return { result: '' } as never
  })

  await $.tool.call({ tool: 'Bash', command: 'curl http://localhost:3000/checkout' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/checkout/PayButton.tsx' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/checkout/Coupon.tsx' } as never)

  const snaps = ran.filter(args => args.includes('snap.mjs'))
  expect(snaps).toHaveLength(1)
  expect(snaps[0]).toContain('world --at aaa1111 --only src/checkout/PayButton.tsx --hint http://localhost:3000/checkout')
  expect(ran.indexOf(snaps[0]!)).toBeLessThan(ran.indexOf('tool Edit'))
})

test('without (auto), an edit saves nothing', async ($, on) => {
  stateFrom(on, null)
  const ran = autoRepo(on, '')
  on('tool.call', () => ({ result: '' }) as never)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/checkout/PayButton.tsx' } as never)
  expect(ran.some(args => args.includes('snap.mjs'))).toBe(false)
})

test('pushed UI work has every known page saved at the pushed commit', async ($, on) => {
  stateFrom(on, null)
  const ran = autoRepo(on)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'p1' }))
  on('agent.list', () => ({ value: [] }) as never)
  await $.command.run({ command: 'nudge', args: '' } as never)
  expect(ran.some(args => args.includes('snap.mjs world --at up1 --keep aaa1111,up1'))).toBe(true)
})
