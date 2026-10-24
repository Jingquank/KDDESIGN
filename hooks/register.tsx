// The Nudge: a question in the band above the prompt, asked when it is time to run
// design-delta or design-lessons, which then run in a background subagent (ADR 0011).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Lang, Skill, View } from '../types'

const view = atom({ plugin: 'kddesign', key: 'view' } as const, null)

const RED = '#fc3b34'
const STONE = '#a6a195'
const JUDGE_MODEL = 'claude-haiku-5-5'
const IDLE_MS = 30_000
// A run's rule fills over this long; it is an estimate, never a promise.
const EXPECTED_RUN_MS = 6 * 60_000
const LESSONS_DUE = 5

const UI_FILE = /\.(tsx|jsx|vue|svelte|astro|css|scss|sass|less|styl|html?|mdx|swift|kt|dart|svg)$/i
const NOT_UI = /(^|\/)(node_modules|dist|build|\.next|coverage|__tests__|docs\/deltas)\/|\.(test|spec|stories|generated)\.[a-z]+$/i
const UI_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/

const COPY = {
  zh: {
    tag: { delta: 'design-delta', lessons: 'design-lessons' },
    ask: {
      delta: '要在后台跑 design-delta，记一次 Design Changelog 吗？',
      lessons: '要在后台跑 design-lessons，做一次 Design Lessons Review 吗？',
    },
    askShort: { delta: '后台记一次 Design Changelog？', lessons: '后台做一次 Design Lessons Review？' },
    lessonsDid: (n: number, last: string) => `刚记下 ${last} · 自上次 Design Lessons Review 起攒了 ${n} 个 Delta`,
    lessonsDidShort: (n: number) => `攒了 ${n} 个 Delta`,
    whyRange: (base: string) => `范围：${base} → 按 1 那一刻的快照`,
    whyRun: '后台运行：截图用 Ego lite 自己的标签页，写 docs/deltas/，不 commit',
    whyLessons: (n: number, since: string) => [
      `${since} 之后来了 ${n} 个 Delta，够做一次 Design Lessons Review`,
      '后台运行：只发布 Review 页面；贴回 Verdicts 之前不改任何规则',
    ],
    keys: ['做', '为什么', '暂时不做'],
    keysOpen: ['做', '收起', '暂时不做'],
    never: '这个项目不要问',
    pick: 'Design rules 写进哪个文件？每个项目只问这一次。',
    cancel: '取消',
    running: { delta: '正在后台记录 Design Changelog', lessons: '正在后台准备 Design Lessons Review' },
    runningSub: (time: string, tools: number) => `已运行 ${time} · ${tools} 次工具调用`,
    stop: '停止',
    done: (title: string, n: number | null) => `跑完了：${title}${n === null ? '' : ` · ${n} 个 Change`}`,
    doneShort: (title: string) => `跑完了：${title}`,
    failed: '没跑完，详情在后台任务里',
    doneKeys: ['打开', '细节', '关掉'],
    doneKeysOpen: ['打开', '收起', '关掉'],
    notesHow: '不回复就保持 Round 1；想改 Kind 或写 Note，在页面上 Copy Notes，贴到任意对话',
    verdictsHow: '每条选 Accept / Reject / Watch，Copy Verdicts，贴到任意对话；不贴不改规则',
    notify: (title: string) => `${title} 好了`,
  },
  en: {
    tag: { delta: 'design-delta', lessons: 'design-lessons' },
    ask: {
      delta: 'Run design-delta in the background to record a Design Changelog?',
      lessons: 'Run design-lessons in the background for a Design Lessons Review?',
    },
    askShort: { delta: 'Record a Design Changelog in the background?', lessons: 'Run a Design Lessons Review in the background?' },
    lessonsDid: (n: number, last: string) => `Just recorded ${last} · ${n} Deltas since the last Design Lessons Review`,
    lessonsDidShort: (n: number) => `${n} Deltas piled up`,
    whyRange: (base: string) => `Range: ${base} → a snapshot taken when you press 1`,
    whyRun: 'In the background: stills in an Ego lite tab of its own, writes docs/deltas/, never commits',
    whyLessons: (n: number, since: string) => [
      `${n} Deltas arrived after ${since}, enough for a Design Lessons Review`,
      'In the background: it only publishes the Review page; no rule changes until you paste Verdicts',
    ],
    keys: ['Do it', 'Why', 'Not now'],
    keysOpen: ['Do it', 'Collapse', 'Not now'],
    never: 'Never in this project',
    pick: 'Which file holds the design rules? Asked once per project.',
    cancel: 'Cancel',
    running: { delta: 'Recording a Design Changelog in the background', lessons: 'Preparing a Design Lessons Review in the background' },
    runningSub: (time: string, tools: number) => `${time} so far · ${tools} tool calls`,
    stop: 'Stop',
    done: (title: string, n: number | null) => `Finished: ${title}${n === null ? '' : ` · ${n} Changes`}`,
    doneShort: (title: string) => `Finished: ${title}`,
    failed: 'Did not finish; the background task has the details',
    doneKeys: ['Open', 'Details', 'Close'],
    doneKeysOpen: ['Open', 'Collapse', 'Close'],
    notesHow: 'No reply keeps Round 1; to fix a Kind or add a Note, Copy Notes on the page and paste into any conversation',
    verdictsHow: 'Give each item Accept / Reject / Watch, Copy Verdicts, paste into any conversation; nothing pasted changes no rule',
    notify: (title: string) => `${title} is ready`,
  },
} as const

// ---------- width ----------

const cw = (text: string) => Array.from(text).reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0)

const cut = (text: string, width: number) => {
  if (cw(text) <= width) return text
  let out = ''
  for (const ch of text) {
    if (cw(out + ch) > width - 1) break
    out += ch
  }
  return out + '…'
}

const fit = (long: string, short: string, width: number) =>
  cw(long) <= width ? long : cw(short) <= width ? short : cut(short, width)

// CJK breaks anywhere, Latin at spaces.
function wrap(text: string, width: number): string[] {
  const tokens = text.match(new RegExp(`${WIDE.source}|[^\\s${WIDE.source.slice(1, -1)}]+\\s*|\\s+`, 'g')) ?? []
  const lines: string[] = []
  let line = ''
  for (const token of tokens) {
    if (cw(line + token.trimEnd()) > width && line.trim()) {
      lines.push(line.trimEnd())
      line = token.trimStart()
    } else line += token
  }
  if (line.trim()) lines.push(line.trimEnd())
  return lines
}

// The whole question when it fits one row, else the short one, wrapping only as a last resort.
function question(long: string, short: string, width: number): string[] {
  const full = wrap(long, width)
  if (full.length === 1) return full
  const brief = wrap(short, width)
  return brief.length === 1 || full.length > 2 ? brief.slice(0, 2) : full
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const langOf = (text: string): Lang => (WIDE.test(text) ? 'zh' : 'en')

// FNV-1a: a fingerprint of the unrecorded diff, so the same work is never asked about twice.
const hash = (text: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16)
}

const isUiFile = (path: string) => UI_FILE.test(path) && !NOT_UI.test(path)

// ---------- the Nudge's work ----------

// The module's own state: it starts over on a reload; the view (in $.state) and the store do not.
let sessionHead: string | null = null
let turnTouchedUi = false
let isTurnRunning = false
let hasNudgedThisTurn = false
let isEvaluating = false
let idle: { cancel: () => void } | null = null
let ticker: { cancel: () => void } | null = null
const judged = new Map<string, Judgement | null>()

type Judgement = { isVisible: boolean; isSettled: boolean; isUiOngoing: boolean; did: string; didShort: string; why: string; lang: Lang }

type Project = {
  root: string
  branch: string
  defaultBranch: string
  isKnown: boolean
  prefs: { never?: boolean; seenFirst?: boolean; rulesFile?: string }
}

// ----- git and files -----

type $ = EngineInterface

const git = async ($: $, root: string, args: string[], env?: Record<string, string>) => {
  const ran = await $.process.run(['git', ...args], { cwd: root, timeoutMs: 20_000, env })
  return ran.exitCode === 0 ? ran.stdout.trim() : null
}

const readText = async ($: $, path: string) => {
  try {
    return (await $.fs.exists(path)) ? String(await $.fs.read(path)) : null
  } catch {
    return null
  }
}

const prefsKey = (root: string) => `project:${root}`
const declinedKey = (root: string, branch: string, skill: Skill) => `declined:${skill}:${root}:${branch}`

async function project($: $): Promise<Project | null> {
  const repo = await $.session.repo()
  if (!repo) return null
  const root = repo.root
  const branch = (await git($, root, ['rev-parse', '--abbrev-ref', 'HEAD'])) ?? 'HEAD'
  const originHead = await git($, root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  const defaultBranch = originHead
    ? originHead.replace(/^origin\//, '')
    : (await git($, root, ['rev-parse', '--verify', '--quiet', 'main'])) !== null ? 'main' : 'master'
  const hasDeltas = await $.fs.exists(`${root}/docs/deltas`)
  const isKnown = hasDeltas || (await pointer($, root)) !== null
  const prefs = ((await $.store.get(prefsKey(root))) as Project['prefs'] | undefined) ?? {}
  return { root, branch, defaultBranch, isKnown, prefs }
}

async function pointer($: $, root: string): Promise<string | null> {
  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const text = await readText($, `${root}/${file}`)
    const line = text?.match(/^Design rules:\s*(\S+)/m)
    if (line?.[1]) return line[1]
  }
  return null
}

async function deltaFiles($: $, root: string): Promise<string[]> {
  if (!(await $.fs.exists(`${root}/docs/deltas`))) return []
  const entries = await $.fs.list(`${root}/docs/deltas`)
  return entries
    .filter(entry => entry.kind === 'file' && /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name))
    .map(entry => entry.name)
    .sort()
    .reverse()
}

// The Baseline design-delta itself uses: this branch's newest Delta's After, else where the
// branch left the default branch, else (on the default branch) where this session started.
async function baseline($: $, p: Project): Promise<{ base: string; label: string } | null> {
  for (const name of (await deltaFiles($, p.root)).slice(0, 30)) {
    const text = await readText($, `${p.root}/docs/deltas/${name}`)
    const after = text?.match(/^After:\s*([0-9a-f]{7,40})/m)?.[1]
    const branch = text?.match(/^Branch\s+(\S+)/m)?.[1]
    if (!after || branch !== p.branch) continue
    if ((await git($, p.root, ['merge-base', '--is-ancestor', after, 'HEAD'])) !== null) {
      return { base: after, label: `${name.replace(/\.md$/, '')} (${after.slice(0, 7)})` }
    }
  }
  if (p.branch !== p.defaultBranch) {
    const base = await git($, p.root, ['merge-base', 'HEAD', p.defaultBranch])
    if (base) return { base, label: `${p.defaultBranch} (${base.slice(0, 7)})` }
  }
  return sessionHead ? { base: sessionHead, label: sessionHead.slice(0, 7) } : null
}

async function unrecorded($: $, root: string, base: string) {
  const tracked = ((await git($, root, ['diff', '--name-only', base])) ?? '').split('\n')
  const untracked = ((await git($, root, ['ls-files', '--others', '--exclude-standard'])) ?? '').split('\n')
  const files = [...new Set([...tracked, ...untracked])].filter(f => f && isUiFile(f))
  if (files.length === 0) return null
  const diff = (await git($, root, ['diff', '-U1', base, '--', ...files])) ?? ''
  const stat = (await git($, root, ['diff', '--stat', base, '--', ...files])) ?? ''
  const fresh = untracked.filter(f => f && isUiFile(f))
  return { files, fingerprint: hash(diff + fresh.join('\n')), summary: `${stat}\nNew files: ${fresh.join(', ') || 'none'}\n\n${diff.slice(0, 6000)}` }
}

async function rulesState($: $, root: string) {
  const pointed = await pointer($, root)
  let options: string[] = []
  if (pointed) options = [pointed]
  else {
    const listed = ((await git($, root, ['ls-files', '-co', '--exclude-standard'])) ?? '').split('\n')
    const named = listed.filter(f => /^(DESIGN\.md|docs\/design[^/]*\.md|\.(agents|claude)\/skills\/[^/]+\/references\/design[^/]*\.md)$/i.test(f))
    const sectioned = ((await git($, root, ['grep', '-l', '^## Design rules', '--', '*.md'])) ?? '').split('\n').filter(Boolean)
    options = [...new Set([...sectioned, ...named])]
  }
  const file = options.length === 1 ? (options[0] ?? null) : null
  const lastRun = file ? ((await readText($, `${root}/${file}`))?.match(/Last run:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null) : null
  return { options, file, lastRun }
}

// ----- the side judgement -----

async function judge($: $, summary: string): Promise<Judgement | null> {
  const messages = (await $.session.messages()).slice(-10)
  const talk = messages
    .map(m => `${m.role.toUpperCase()}: ${m.text.slice(0, 700)}${m.toolUses.length ? ` [tools: ${m.toolUses.map(t => t.tool).join(', ')}]` : ''}`)
    .join('\n\n')
  const answer = await $.model.complete({
    model: JUDGE_MODEL,
    maxTokens: 400,
    timeoutMs: 20_000,
    system:
      'You watch a coding session for KDDESIGN, which records shipped UI design changes. Answer with one JSON object only, no prose:\n' +
      '{"visible": bool, "settled": bool, "ui_ongoing": bool, "did": string, "did_short": string, "why": string, "lang": "zh"|"en"}\n' +
      '- visible: the diff changes something a user of the product can see or operate (layout, visuals, copy, motion, states), not only logic, tests or types.\n' +
      '- settled: the user has finished with this stretch of design work: they approved it, moved to another surface or to non-UI work, or began to commit or ship. Still iterating on the same surface is not settled.\n' +
      '- ui_ongoing: the latest turns are still changing UI.\n' +
      '- did: one line naming what was just finished, in the language the user writes in, starting "刚完成：" in Chinese or "Just finished: " in English, at most 60 columns (a CJK character is 2), naming the surface and the changes.\n' +
      '- did_short: the same in at most 30 columns.\n' +
      '- why: one short line, same language, on why the work counts as settled.\n' +
      '- lang: the language the user writes in.',
    prompt: `Recent conversation:\n${talk}\n\nUnrecorded UI diff since the last Delta:\n${summary}`,
  })
  if (!answer.isAnswered) return null
  try {
    const raw = JSON.parse(answer.text.slice(answer.text.indexOf('{'), answer.text.lastIndexOf('}') + 1))
    return {
      isVisible: raw.visible === true,
      isSettled: raw.settled === true,
      isUiOngoing: raw.ui_ongoing === true,
      did: String(raw.did ?? ''),
      didShort: String(raw.did_short ?? raw.did ?? ''),
      why: String(raw.why ?? ''),
      lang: raw.lang === 'zh' ? 'zh' : 'en',
    }
  } catch {
    return null
  }
}

// ----- deciding to ask -----

async function evaluate($: $, trigger: 'start' | 'idle' | 'working') {
  if (isEvaluating || (await read($, view)) !== null) return
  isEvaluating = true
  try {
    const p = await project($)
    if (!p || p.prefs.never) return
    if (trigger === 'working' && turnTouchedUi) return
    if (trigger === 'idle' && (await $.prompt.read()).text.trim()) return schedule($)

    const found = await baseline($, p)
    const work = found ? await unrecorded($, p.root, found.base) : null
    if (found && work) {
      const declined = (await $.store.get(declinedKey(p.root, p.branch, 'delta'))) as { fingerprint: string } | undefined
      if (declined?.fingerprint !== work.fingerprint) {
        const key = `${work.fingerprint}:${(await $.session.messages()).length}`
        const verdict = judged.has(key) ? judged.get(key)! : await judge($, work.summary)
        judged.set(key, verdict)
        if (verdict && verdict.isVisible && verdict.isSettled && !verdict.isUiOngoing && !turnTouchedUi) {
          const c = COPY[verdict.lang]
          await update($, view, (): View => ({
            kind: 'offer',
            skill: 'delta',
            lang: verdict.lang,
            did: verdict.did,
            didShort: verdict.didShort,
            why: [verdict.why, c.whyRange(found.label), c.whyRun].filter(Boolean),
            isExpanded: false,
            isFirst: !p.isKnown && !p.prefs.seenFirst,
            root: p.root,
            branch: p.branch,
            base: found.base,
            fingerprint: work.fingerprint,
            deltas: 0,
          }))
          return
        }
        // Visible work that has not settled: the delta comes first, so lessons wait too.
        if (verdict?.isVisible) return
      }
    }
    if (!p.isKnown) return

    const deltas = await deltaFiles($, p.root)
    const rules = await rulesState($, p.root)
    const since = deltas.filter(name => !rules.lastRun || name.slice(0, 10) > rules.lastRun)
    if (since.length < LESSONS_DUE) return
    const declined = (await $.store.get(declinedKey(p.root, '*', 'lessons'))) as { count: number } | undefined
    if (declined && declined.count >= since.length) return
    const lang = langOf((await $.session.messages()).filter(m => m.role === 'user').slice(-3).map(m => m.text).join(' '))
    const c = COPY[lang]
    const last = since[0]!.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
    await update($, view, (): View => ({
      kind: 'offer',
      skill: 'lessons',
      lang,
      did: c.lessonsDid(since.length, last),
      didShort: c.lessonsDidShort(since.length),
      why: c.whyLessons(since.length, rules.lastRun ?? (lang === 'zh' ? '第一个 Delta' : 'the first Delta')),
      isExpanded: false,
      isFirst: false,
      root: p.root,
      branch: p.branch,
      base: '',
      fingerprint: String(since.length),
      deltas: since.length,
    }))
  } finally {
    isEvaluating = false
  }
}

function schedule($: $) {
  idle?.cancel()
  idle = $.clock.after(IDLE_MS, () => void evaluate($, 'idle'))
}

// ----- answering the Nudge -----

async function decline($: $, v: Extract<View, { kind: 'offer' | 'pick' }>) {
  if (v.skill === 'delta') await $.store.set(declinedKey(v.root, v.branch, 'delta'), { fingerprint: v.fingerprint })
  else await $.store.set(declinedKey(v.root, '*', 'lessons'), { count: Number(v.fingerprint) })
  await markSeen($, v.root)
  await update($, view, () => null)
}

async function markSeen($: $, root: string, extra: Partial<Project['prefs']> = {}) {
  const prefs = ((await $.store.get(prefsKey(root))) as Project['prefs'] | undefined) ?? {}
  await $.store.set(prefsKey(root), { ...prefs, seenFirst: true, ...extra })
}

async function accept($: $, v: Extract<View, { kind: 'offer' | 'pick' }>, rulesFile?: string) {
  const prefs = ((await $.store.get(prefsKey(v.root))) as Project['prefs'] | undefined) ?? {}
  let rules = rulesFile ?? prefs.rulesFile
  if (!rules) {
    const state = await rulesState($, v.root)
    if (state.options.length > 1) {
      await update($, view, (): View => ({ kind: 'pick', skill: v.skill, lang: v.lang, root: v.root, branch: v.branch, base: v.base, fingerprint: v.fingerprint, options: state.options.slice(0, 3) }))
      return
    }
  }
  if (rulesFile) await markSeen($, v.root, { rulesFile })
  else await markSeen($, v.root)

  const skillMd = `${$.plugin.root}/skills/design-${v.skill}/SKILL.md`
  const rulesArg = rules ? ` --rules ${rules}` : ''
  let args = `--background${rulesArg}`
  if (v.skill === 'delta') {
    const snapshot = await snapshotTree($, v.root)
    if (!snapshot) return fail($, v)
    args = `--range ${v.base}..${snapshot} ${args}`
  }
  const spawned = await $.agent.spawn({
    description: `${v.skill === 'delta' ? 'design-delta' : 'design-lessons'} (KDDESIGN Nudge)`,
    subagentType: 'general-purpose',
    cwd: v.root,
    prompt:
      `The user pressed 1 on the KDDESIGN Nudge. Read ${skillMd} and carry out that skill in ${v.root} with these arguments: ${args}\n` +
      'You run in the background and nobody watches: ask nothing, follow the skill\'s --background rules, and end with its one line of JSON and nothing else.',
  })
  if (!spawned.agentId) return fail($, v)
  const startedAt = await $.clock.now()
  await update($, view, (): View => ({ kind: 'running', skill: v.skill, lang: v.lang, root: v.root, agentId: spawned.agentId!, turnId: null, startedAt, tools: 0 }))
  ticker?.cancel()
  ticker = $.clock.every(1000, () => $.ui.invalidate('ui.render'))
}

// The working tree as a commit, untracked files included, so the main agent can keep editing.
async function snapshotTree($: $, root: string): Promise<string | null> {
  const index = await git($, root, ['rev-parse', '--git-path', 'kddesign-nudge.index'])
  if (!index) return null
  const env = { GIT_INDEX_FILE: index.startsWith('/') ? index : `${root}/${index}` }
  await git($, root, ['read-tree', 'HEAD'], env)
  await git($, root, ['add', '-A'], env)
  const tree = await git($, root, ['write-tree'], env)
  await $.process.run(['rm', '-f', env.GIT_INDEX_FILE])
  if (!tree) return null
  const sha = await git($, root, ['commit-tree', tree, '-p', 'HEAD', '-m', 'design-delta snapshot (KDDESIGN Nudge)'])
  if (!sha) return null
  const stamp = new Date(await $.clock.now()).toISOString().replace(/[-:]/g, '').slice(0, 15)
  await git($, root, ['update-ref', `refs/design-delta/nudge-${stamp}`, sha])
  return sha
}

async function fail($: $, v: { skill: Skill; lang: Lang }) {
  await update($, view, (): View => ({ kind: 'done', skill: v.skill, lang: v.lang, isOk: false, title: COPY[v.lang].failed, page: null, review: null, delta: null, changes: null, note: null, isExpanded: false }))
}

async function finish($: $, v: Extract<View, { kind: 'running' }>, answer: string) {
  ticker?.cancel()
  ticker = null
  let out: Record<string, unknown> = {}
  try {
    out = JSON.parse(answer.slice(answer.lastIndexOf('{'), answer.lastIndexOf('}') + 1))
  } catch {}
  const page = typeof out.page === 'string' ? out.page : null
  const review = typeof out.review === 'string' ? out.review : null
  const isOk = page !== null || review !== null || (v.skill === 'lessons' && typeof out.rules === 'string')
  const title = isOk ? (typeof out.title === 'string' ? out.title : 'Design Lessons Review') : COPY[v.lang].failed
  await update($, view, (): View => ({
    kind: 'done',
    skill: v.skill,
    lang: v.lang,
    isOk,
    title,
    page,
    review,
    delta: typeof out.delta === 'string' ? out.delta : null,
    changes: typeof out.changes === 'number' ? out.changes : null,
    note: typeof out.note === 'string' ? out.note : null,
    isExpanded: false,
  }))
  if (isOk) await $.ui.notify(COPY[v.lang].notify(title), { title: 'KDDESIGN' })
}

async function openUrl($: $, url: string | null) {
  if (!url) return
  const uname = await $.process.run(['uname'])
  await $.process.run([uname.stdout.trim() === 'Darwin' ? 'open' : 'xdg-open', url])
}

// ---------- the hooks ----------

export const register: Register = on => {
  // ----- events -----

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const repo = await $.session.repo()
    if (repo) sessionHead = await git($, repo.root, ['rev-parse', 'HEAD'])
    // A reload keeps a running view; its ticker does not survive, so restart it.
    if ((await read($, view))?.kind === 'running') ticker = $.clock.every(1000, () => $.ui.invalidate('ui.render'))
    $.clock.after(3000, () => void evaluate($, 'start'))
    return started
  })

  on('turn.start', async ($, e, next) => {
    const v = await read($, view)
    if (e.agentId !== undefined) {
      if (v?.kind === 'running' && v.agentId === e.agentId && v.turnId === null) await update($, view, (): View => ({ ...v, turnId: e.turnId }))
      return next(e)
    }
    isTurnRunning = true
    turnTouchedUi = false
    hasNudgedThisTurn = false
    idle?.cancel()
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const v = await read($, view)
    if (e.agentId !== undefined) {
      if (v?.kind === 'running' && v.agentId === e.agentId) await update($, view, (): View => ({ ...v, tools: v.tools + 1 }))
      return next(e)
    }
    const input = e as unknown as { file_path?: string; notebook_path?: string }
    const path = input.file_path ?? input.notebook_path
    if (UI_TOOLS.has(e.tool) && path && isUiFile(path)) turnTouchedUi = true
    // Claude is running commands in a turn that has not touched UI (tests, a commit, a push):
    // a moment the Nudge may ask while it works.
    else if (isTurnRunning && !turnTouchedUi && !hasNudgedThisTurn && e.tool === 'Bash') {
      hasNudgedThisTurn = true
      $.clock.after(0, () => void evaluate($, 'working'))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const v = await read($, view)
    if (e.agentId !== undefined) {
      if (v?.kind === 'running' && v.agentId === e.agentId) await finish($, v, e.answer)
      return next(e)
    }
    isTurnRunning = false
    if (!turnTouchedUi) schedule($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const v = await read($, view)
    if (v === null || e.props.hasSurvey) return next(e)
    // Another mod's band goes first; the Nudge can wait.
    const beneath = await next(e)
    if ((beneath as { type?: string }).type !== 'engine') return beneath

    const { Box, Button, Text } = $.ui.resolve(e)
    const c = COPY[v.lang]
    const cols = Math.max(24, e.props.bodyColumns)
    const now = await $.clock.now()

    const isDone = v.kind === 'done'
    const tag = c.tag[v.skill] + (isDone ? (v.isOk ? ' ✓' : ' ✗') : '')
    const ruleLen = Math.max(0, cols - cw(`█══╡ ${tag} ╞`))
    const progress = v.kind === 'running' ? Math.min(0.95, (now - v.startedAt) / EXPECTED_RUN_MS) : isDone && v.isOk ? 1 : 0
    const red = Math.round(progress * ruleLen)
    const rule = (
      <Text wrap="truncate-end">
        <Text color={RED}>█</Text>
        <Text color={STONE}>══╡ </Text>
        <Text color={RED} bold>{tag}</Text>
        <Text color={STONE}> ╞</Text>
        <Text color={RED}>{'═'.repeat(red)}</Text>
        <Text color={STONE}>{'═'.repeat(ruleLen - red)}</Text>
      </Text>
    )
    const w = cols - 1
    const row = (text: string, opts: { bold?: boolean; dim?: boolean } = {}) => (
      <Text wrap="truncate-end" bold={opts.bold} dimColor={opts.dim}>{` ${text}`}</Text>
    )
    const keys = (labels: readonly string[], presses: Array<() => void>, extra?: JSX.Element) => (
      <Box flexDirection="row" columnGap={3} paddingLeft={1} flexWrap="wrap">
        {labels.map((label, i) => (
          <Button key={`k${i + 1}`} hotkey={String(i + 1)} plain label={label} onPress={presses[i]!} />
        ))}
        {extra}
      </Box>
    )

    if (v.kind === 'offer') {
      const ask = question(c.ask[v.skill], c.askShort[v.skill], w)
      const toggle = () => void update($, view, x => (x?.kind === 'offer' ? { ...x, isExpanded: !x.isExpanded } : x))
      return (
        <Box flexDirection="column">
          {rule}
          {row(fit(v.did, v.didShort, w))}
          {ask.map(line => row(line, { bold: true }))}
          {v.isExpanded ? v.why.flatMap(line => wrap(`· ${line}`, w - 2)).map(line => row(line, { dim: true })) : null}
          {keys(
            v.isExpanded ? c.keysOpen : c.keys,
            [() => void accept($, v), toggle, () => void decline($, v)],
            v.isFirst ? (
              <Button key="never" plain dimColor label={c.never} onPress={() => void markSeen($, v.root, { never: true }).then(() => update($, view, () => null))} />
            ) : undefined,
          )}
        </Box>
      )
    }

    if (v.kind === 'pick') {
      return (
        <Box flexDirection="column">
          {rule}
          {wrap(c.pick, w).map(line => row(line, { bold: true }))}
          <Box flexDirection="row" columnGap={3} paddingLeft={1} flexWrap="wrap">
            {v.options.map((file, i) => (
              <Button key={`f${i + 1}`} hotkey={String(i + 1)} plain label={cut(file, 36)} onPress={() => void accept($, v, file)} />
            ))}
            <Button key="cancel" hotkey="0" plain label={c.cancel} onPress={() => void update($, view, () => null)} />
          </Box>
        </Box>
      )
    }

    if (v.kind === 'running') {
      const stop = async () => {
        if (v.turnId) await $.turn.abort({ turnId: v.turnId })
        ticker?.cancel()
        await update($, view, () => null)
      }
      return (
        <Box flexDirection="column">
          {rule}
          {row(fit(c.running[v.skill], c.running[v.skill], w))}
          {row(c.runningSub(clock(now - v.startedAt), v.tools), { dim: true })}
          <Box paddingLeft={1}>
            <Button key="stop" plain dimColor label={`[ ${c.stop} ]`} onPress={() => void stop()} />
          </Box>
        </Box>
      )
    }

    const head = v.isOk ? fit(c.done(v.title, v.changes), c.doneShort(v.title), w) : c.failed
    const details = [
      v.delta ? `Delta: ${v.delta}` : null,
      v.page ? `Design Changelog: ${v.page}` : null,
      v.review ? `Design Lessons Review: ${v.review}` : null,
      v.page ? c.notesHow : null,
      v.review ? c.verdictsHow : null,
      v.note,
    ].filter((line): line is string => Boolean(line))
    const close = () => void update($, view, () => null)
    const toggle = () => void update($, view, x => (x?.kind === 'done' ? { ...x, isExpanded: !x.isExpanded } : x))
    return (
      <Box flexDirection="column">
        {rule}
        {row(head, { bold: true })}
        {v.isExpanded ? details.flatMap(line => wrap(`· ${line}`, w - 2)).map(line => row(line, { dim: true })) : null}
        {keys(v.isExpanded ? c.doneKeysOpen : c.doneKeys, [
          () => void openUrl($, v.page ?? v.review).then(() => (v.page && v.review ? openUrl($, v.review) : undefined)),
          toggle,
          close,
        ])}
      </Box>
    )
  })
}
