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
  isFirst: false,
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
