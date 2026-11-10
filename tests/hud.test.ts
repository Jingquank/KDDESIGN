import { expect, test } from 'claude-code/testing'

import { cw, foldRow, hudRows } from '../hooks/hud'
import type { HudModel } from '../hooks/hud'

const WIDTHS = [24, 40, 56, 80, 100, 120, 160]
const base = {
  n: 4, toReview: 'to REVIEW', branch: 'feat/checkout', range: '1f0d1e5‥9c2e4b1', project: 'acme-web',
  strip: { history: 3, prev: 'Coupon Fix', commits: 3 },
  pages: [{ route: '/checkout', before: true, after: true }, { route: '/pricing', before: true, after: false }],
  claim: 'claim',
}
const ASK: HudModel = {
  ...base, word: 'HOLD', tone: 'red',
  note: ['要在后台跑 design-delta，把刚 push 的记成 Design Changelog 吗？', '记下刚 push 的改动？'],
  mark: { at: 'commits', bracket: true, tone: 'red', text: [{ t: '刚 push：结账页 3 处改动 · 支付按钮、优惠券、摘要', alts: ['刚 push：结账页 3 处改动 · 支付按钮、优惠券、摘要', '3 个没记'] }] },
  keys: ['做', '为什么', '暂时不做'],
}
const REC: HudModel = {
  ...base, word: 'REC', tone: 'red',
  note: ['Recording a Design Changelog in the background · Stills 4', 'Recording · Stills 4', 'Stills 4'],
  strip: { ...base.strip, done: 0.55, cover: 'run' },
  mark: { at: 'commits', tone: 'red', text: [{ t: '› ', tone: 'red' }, { t: 'python3 still.py c3/after-1440.avif', dim: true }] },
  pagesNote: ['4:12 · 37 tool calls', '4:12'],
  keys: ['Fold to status line', 'Stop'],
}
const REVIEW: HudModel = {
  ...base, word: 'HOLD', tone: 'red', n: 5, due: true, toReview: 'REVIEW due',
  note: ['Design Lessons Review is ready · 5 Deltas since the last one', 'Review is ready'],
  strip: { ...base.strip, five: true },
  mark: { at: 'start', bracket: true, tone: 'red', text: [{ t: '5 Deltas since the last Review', alts: ['5 Deltas since the last Review', '5 Deltas'] }] },
  lines: [{ text: '· a long explanation that has to wrap when the terminal is narrow, because nothing may run past the edge', dim: true }],
  keys: ['Open', 'Approve', 'Approve with Changes', 'Dismiss'],
}
const text = (row: Array<{ t: string }>) => row.map(x => x.t).join('')

test('no row of the display is wider than the terminal, at any width, in either script', () => {
  for (const model of [ASK, REC, REVIEW]) for (const cols of WIDTHS) for (const row of hudRows(model, cols, 1_000)) {
    expect(cw(text(row))).toBeLessThanOrEqual(cols)
  }
})

test('the frame closes on the right edge: the first and the last row are exactly the terminal wide', () => {
  for (const model of [ASK, REC, REVIEW]) for (const cols of WIDTHS) {
    const rows = hudRows(model, cols, 1_000).map(text)
    expect(cw(rows[0]!)).toBe(cols)
    expect(rows[0]!.endsWith('┐')).toBe(true)
    expect(cw(rows[rows.length - 1]!)).toBe(cols)
    expect(rows[rows.length - 1]!.endsWith('┘')).toBe(true)
  }
})

test('every key survives every width', () => {
  for (const model of [ASK, REC, REVIEW]) for (const cols of WIDTHS) {
    const keys = hudRows(model, cols, 1_000).flat().filter(x => x.key !== undefined).map(x => x.key)
    expect(keys).toEqual(model.keys!.map((_, i) => i))
  }
})

test('narrow drops the readouts and keeps the word, the strip and the count; wide adds the big countdown', () => {
  const tiny = hudRows(ASK, 40, 0).map(text)
  expect(tiny[0]).toContain('H O L D')
  expect(tiny[0]).toContain('4/5')
  expect(tiny.join('\n')).not.toContain('feat/checkout')
  expect(tiny.join('\n')).toContain('▲ now')
  const full = hudRows(ASK, 100, 0).map(text).join('\n')
  expect(full).toContain('feat/checkout 1f0d1e5‥9c2e4b1')
  expect(full).toContain('█ █  ▄▀ █▀▀')
  expect(full).toContain('/checkout B● A●')
  expect(full).toContain('◆ claim')
})

test('a run covers the commits from the left, and the cover moves with its progress', () => {
  const at = (done: number) => text(hudRows({ ...REC, strip: { ...REC.strip, done } }, 100, 0)[2]!)
  const blocks = (row: string) => (row.split('Coupon Fix ██')[1]!.match(/^█*/) ?? [''])[0].length
  expect(blocks(at(0.2))).toBeLessThan(blocks(at(0.8)))
})

test('folded, the display is one row no wider than asked', () => {
  for (const cols of [40, 60, 100]) {
    const row = foldRow('REC', { n: 4, strip: { ...base.strip, done: 0.5 } }, ['Stills 4 · 4:12 · /nudge opens it', 'Stills 4', ''], cols)
    expect(cw(row)).toBeLessThanOrEqual(cols)
    expect(row.startsWith('┌ REC ┘')).toBe(true)
  }
  expect(foldRow('ARMED', null, ['saved /checkout as Before'], 100)).toBe('┌ ARMED ┘ saved /checkout as Before')
})
