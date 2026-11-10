// The Nudge's heads-up display (ADR 0046): the branch as a strip with the Nudge's marks on it,
// inside a frame of corner brackets with readouts at fixed places and one state word. Pure
// layout: a model in, rows of segments out, each row at most `cols` cells, so it can be drawn
// by the band and tested without one. A terminal has no layout but cells, so every row is
// measured and padded here.

export type Tone = 'red' | 'shine' | 'stone' | 'green' | 'yellow' | 'blue'
// key: the index of the key this segment is (the band draws a button there)
export type Seg = { t: string; tone?: Tone; bold?: boolean; dim?: boolean; key?: number; alts?: string[] }
export type Row = Seg[]
export type Page = { route: string; before: boolean; after: boolean | 'saving' }

export type HudModel = {
  // the state word (ARMED, REC, SAVED, HOLD, NO IMG, FAIL, STBY) and its color
  word: string
  tone?: Tone
  // Deltas since the last Design Lessons Review, out of 5, and whether the Review is due
  n: number
  due?: boolean
  toReview: string
  branch: string
  range: string
  project?: string
  // what to say beside the word, longest wording first
  note: string[]
  strip: {
    // Deltas before the newest one (blocks), the newest one's title, the commits in the range
    history: number
    prev: string | null
    commits: number
    // how much of the range is covered (0..1), and by what: a run under way, a broken run, another session's run
    done?: number
    cover?: 'run' | 'red' | 'stone'
    cross?: boolean
    // a Review: five Deltas in a row, the fifth in its own tone
    five?: boolean
  }
  mark?: { at: 'start' | 'commits' | 'cover' | 'tip'; bracket?: boolean; tone: Tone; text: Seg[] }
  pages: Page[]
  pagesNote?: string[]
  claim?: string
  lines?: Array<{ text: string; dim?: boolean; bold?: boolean }>
  // the labels of the keys along the bottom edge, or a hint when there is no key
  keys?: string[]
  hint?: string[]
}

const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/
export const cw = (text: string) => Array.from(text).reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0)
const cut = (text: string, width: number) => {
  if (cw(text) <= width) return text
  if (width <= 1) return width === 1 ? '…' : ''
  let out = ''
  let n = 0
  for (const ch of Array.from(text)) {
    const c = WIDE.test(ch) ? 2 : 1
    if (n + c > width - 1) break
    out += ch
    n += c
  }
  return `${out}…`
}
const wrap = (text: string, width: number) => {
  const lines: string[] = []
  let line = ''
  let n = 0
  for (const ch of Array.from(text)) {
    const c = WIDE.test(ch) ? 2 : 1
    if (n + c > width) {
      const at = /\s/.test(ch) ? -1 : line.lastIndexOf(' ')
      if (at > width / 2) {
        lines.push(line.slice(0, at))
        line = line.slice(at + 1)
        n = cw(line)
      } else {
        lines.push(line)
        line = ''
        n = 0
      }
      if (/\s/.test(ch)) continue
    }
    line += ch
    n += c
  }
  if (line.trim()) lines.push(line)
  return lines
}
const rep = (ch: string, n: number) => ch.repeat(Math.max(0, Math.floor(n)))
const sp = (n: number): Seg => ({ t: ' '.repeat(Math.max(0, Math.floor(n))) })
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const T = (t: string | string[], o: Omit<Seg, 't'> = {}): Seg => (Array.isArray(t) ? { t: t[0] ?? '', alts: t, ...o } : { t, ...o })
const wd = (segs: Seg[]) => segs.reduce((n, x) => n + cw(x.t), 0)

// As many segments as fit in `width` cells; text that runs over is cut, a key is dropped whole.
function clip(segs: Seg[], width: number) {
  const out: Seg[] = []
  let n = 0
  for (const x of segs) {
    const c = cw(x.t)
    if (n + c <= width) {
      out.push(x)
      n += c
      continue
    }
    if (x.key === undefined && width - n >= 1) out.push({ ...x, t: cut(x.t, width - n) })
    break
  }
  return out
}

// Each segment may carry shorter wordings; take the first round of them that fits.
function resolve(segs: Seg[], width: number) {
  const rounds = Math.max(1, ...segs.map(x => x.alts?.length ?? 1))
  let now = segs
  for (let i = 0; i < rounds; i++) {
    now = segs.map(x => (x.alts ? { ...x, t: x.alts[Math.min(i, x.alts.length - 1)] ?? '' } : x)).filter(x => x.t !== '')
    if (wd(now) <= width) return now
  }
  return clip(now, width)
}

// One row of exactly `cols` cells when it has a right part: left, spaces, [centre], spaces, right.
function line(cols: number, left: Seg[], right: Seg[] = [], centre: Seg[][] = []): Row {
  const rw = wd(right)
  const l = resolve(left, cols - rw - (rw ? 1 : 0))
  const out = [...l]
  let used = wd(l)
  for (const c of centre) {
    const mw = wd(c)
    if (used + 2 + mw + 2 + rw > cols) continue
    const start = Math.min(Math.max(used + 2, Math.floor((cols - mw) / 2)), cols - rw - 2 - mw)
    out.push(sp(start - used), ...c)
    used = start + mw
    break
  }
  if (rw) out.push(sp(cols - used - rw), ...right)
  return out.filter(x => x.t !== '')
}

// Two-row digits for the countdown.
const BIG: Record<string, [string, string]> = {
  0: ['█▀█', '█▄█'], 1: ['▄█ ', ' █ '], 2: ['▀▀█', '█▄▄'], 3: ['▀▀█', '▄▄█'], 4: ['█ █', '▀▀█'], 5: ['█▀▀', '▄▄█'], '/': [' ▄▀', '▄▀ '],
}
const big = (n: number, row: 0 | 1, due: boolean): Seg =>
  T(`${BIG[clamp(n, 0, 5)]![row]} ${BIG['/']![row]} ${BIG[5]![row]}`, { bold: true, tone: due ? 'red' : undefined })

export const spaced = (word: string) => word.split(' ').map(w => w.split('').join(' ')).join('  ')

type Mode = 'tiny' | 'mid' | 'full' | 'wide'
export const modeOf = (cols: number): Mode => (cols < 56 ? 'tiny' : cols < 80 ? 'mid' : cols < 120 ? 'full' : 'wide')

// The strip and the columns its marks hang from.
function strip(m: HudModel, mode: Mode, avail: number, now: number) {
  const s = m.strip
  const tiny = mode === 'tiny'
  const tip: Seg[] = [T('▲', { tone: 'blue' }), T(' now', { bold: true })]
  if (s.five) {
    const bw = clamp(Math.floor((avail - 9) / 5), 2, mode === 'wide' ? 20 : 8)
    const four = [0, 1, 2, 3].map(() => rep('█', bw)).join('─')
    return { row: [T(`${four}─`, { tone: 'stone' }), T(rep('█', bw), { tone: 'green' }), ...tip], c0: 0, span: 5 * bw + 4, done: 0, tip: 5 * bw + 4 }
  }
  const hist = tiny ? '' : rep('███─', s.history)
  const prev = s.prev ? (tiny ? '████' : `██ ${cut(s.prev, 18)} ██`) : ''
  const k = clamp(s.commits, 1, 6)
  const u = clamp(Math.floor((avail - cw(hist) - cw(prev) - 6) / k), 2, tiny || mode === 'mid' ? 4 : mode === 'full' ? 8 : 24)
  const c0 = cw(hist) + cw(prev)
  const done = clamp(Math.round(k * u * (s.done ?? 0)), 0, k * u - (s.cross ? 1 : 0))
  const row: Seg[] = [T(hist, { tone: 'stone' }), T(prev, { tone: 'stone' })]
  if (done && s.cover === 'run') {
    // a shine three cells long travels through the red block
    const at = (Math.floor(now / 150) % (done + 6)) - 3
    const from = clamp(at, 0, done)
    const to = clamp(at + 3, 0, done)
    row.push(T(rep('█', from), { tone: 'red' }), T(rep('█', to - from), { tone: 'shine' }), T(rep('█', done - to), { tone: 'red' }))
  } else if (done) row.push(T(rep('█', done), { tone: s.cover === 'stone' ? 'stone' : 'red' }))
  if (s.cross) row.push(T('╳', { tone: 'red' }))
  let run = ''
  for (let i = done + (s.cross ? 1 : 0); i < k * u; i++) {
    if ((i + 1) % u === 0) {
      if (run) row.push(T(run, { dim: true }))
      run = ''
      row.push(T('┼'))
    } else run += '─'
  }
  if (run) row.push(T(run, { dim: true }))
  row.push(...tip)
  return { row: row.filter(x => x.t !== ''), c0, span: k * u, done, tip: c0 + k * u }
}

// A mark under the strip at cell `off`: its words go on whichever side has room.
function markRow(inner: number, off: number, glyph: string, tone: Tone, text: Seg[]): Seg[] {
  const right = inner - off - cw(glyph) - 1
  const left = off - 1
  const longest = wd(text.map(x => (x.alts ? { ...x, t: x.alts[0] ?? '' } : x)))
  if (longest <= right || right >= left) return [sp(off), T(glyph, { tone }), sp(1), ...resolve(text, right)]
  const words = resolve(text, left)
  return [sp(left - wd(words)), ...words, sp(1), T(glyph === '╰' ? '╯' : glyph, { tone })]
}

/** The HUD in the band: rows of segments, each at most `cols` cells. */
export function hudRows(m: HudModel, cols: number, now: number): Row[] {
  const mode = modeOf(cols)
  const tiny = mode === 'tiny'
  const isBig = mode === 'full' || mode === 'wide'
  const inner = cols - 4
  const corner = (t: string): Seg => T(t, { tone: 'stone' })
  const count = T(`${clamp(m.n, 0, 5)}/5`, { bold: true, tone: m.due ? 'red' : undefined })
  const word = T(spaced(m.word), { bold: true, tone: m.tone })
  const note = m.note.length ? [T(m.note, m.tone === 'red' && !m.keys ? { dim: true } : {})] : []
  const rightW = isBig ? Math.max(cw(m.toReview), 11) + 2 : 0
  const s = strip(m, mode, inner - rightW - (rightW ? 1 : 0), now)
  const pages: Seg[] = m.pages.slice(0, tiny ? 0 : mode === 'mid' ? 1 : 2).flatMap((p, i) => [
    ...(i ? [sp(2)] : []),
    T(p.route, { dim: true }),
    T(' B'),
    p.before ? T('●', { tone: 'green' }) : T('○', { tone: 'yellow' }),
    T(' A'),
    p.after === 'saving' ? T('◌', { tone: 'green' }) : p.after ? T('●', { tone: 'green' }) : T('○', { tone: 'yellow' }),
  ])
  if (m.pagesNote?.length) pages.push(T(m.pagesNote.map(x => (x ? `  ${x}` : '')), { dim: true }))

  const rows: Row[] = []
  if (tiny) {
    rows.push(line(cols, [corner('┌ '), word], [count, corner(' ┐')]))
    rows.push(line(cols, [sp(2), ...s.row]))
    if (note.length) rows.push(line(cols, [sp(2), ...note]))
  } else {
    rows.push(line(
      cols,
      [corner('┌ '), T(m.branch, { bold: true }), sp(1), T(m.range, { dim: true })],
      isBig ? [big(m.n, 0, !!m.due), corner(' ┐')] : [T('REVIEW ', m.due ? { tone: 'red' } : { dim: true }), count, corner(' ┐')],
      mode === 'wide' && m.project ? [[T(m.project, { dim: true })]] : [],
    ))
    rows.push(line(cols, [sp(2), word, sp(3), ...note], isBig ? [big(m.n, 1, !!m.due), sp(2)] : []))
    rows.push(line(cols, [sp(2), ...s.row], isBig ? [T(m.toReview, m.due ? { tone: 'red' } : { dim: true }), sp(2)] : []))
    if (m.mark) {
      const off = m.mark.at === 'start' ? 0 : m.mark.at === 'commits' ? s.c0 : m.mark.at === 'cover' ? s.c0 + s.done : s.tip
      const glyph = m.mark.bracket ? `╰${rep('─', s.span - 2)}╯` : '╰'
      rows.push(line(cols, [sp(2), ...markRow(inner, m.mark.bracket ? s.c0 : off, glyph, m.mark.tone, m.mark.text)]))
    }
    if (pages.length || (isBig && m.claim)) rows.push(line(cols, [sp(2), ...pages], isBig && m.claim ? [T('◆ ', { bold: true }), T(m.claim), sp(2)] : []))
  }
  for (const l of m.lines ?? []) for (const text of wrap(l.text, inner)) rows.push([sp(2), T(text, { dim: l.dim, bold: l.bold })])

  // the bottom edge: keys packed by their measured widths; the last row carries the corners
  const packs: Seg[][] = [[]]
  if (m.keys?.length) {
    const gap = tiny ? 2 : 3
    m.keys.forEach((label, i) => {
      // a label longer than the frame is cut: a key is never dropped
      const key: Seg = { t: `${i + 1}: ${cut(label, Math.max(4, inner - 3))}`, key: i }
      const last = packs[packs.length - 1]!
      if (last.length && wd(last) + gap + cw(key.t) > inner) packs.push([key])
      else {
        if (last.length) last.push(sp(gap))
        last.push(key)
      }
    })
  } else packs[0]!.push(T(m.hint ?? [''], { dim: true }))
  packs.forEach((p, i) => rows.push(i < packs.length - 1 ? [sp(2), ...p] : line(cols, [corner('└ '), ...p], [corner(' ┘')])))
  return rows
}

/** Folded: the HUD as one row for the status line. `rest` holds wordings, longest first. */
export function foldRow(word: string, m: Pick<HudModel, 'n' | 'strip'> | null, rest: string[], cols: number): string {
  const head = `┌ ${word} ┘ `
  let mini = ''
  if (m) {
    const s = m.strip
    const blocks = s.five ? '█─█─█─█─█' : `${rep('█', clamp(s.history + (s.prev ? 1 : 0), 1, 4))}${s.done ? rep('▓', 2) : ''}${rep('┼', clamp(s.commits, 1, 3))}`
    mini = `${blocks}▲ now  ${clamp(m.n, 0, 5)}/5`
  }
  const room = cols - cw(head) - cw(mini)
  const tail = rest.map(r => (r ? `${mini ? ' · ' : ''}${r}` : '')).find(r => cw(r) <= room) ?? ''
  return cut(`${head}${mini}${tail}`, cols)
}
