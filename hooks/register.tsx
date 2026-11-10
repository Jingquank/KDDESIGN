// The Nudge: a question in the band above the prompt, asked when it is time to run
// design-delta or design-lessons, which then run in a background subagent (ADR 0011). In a
// project whose Design deltas line says (auto), what is pushed is recorded without asking, and
// the Nudge commits the Delta (ADR 0041); the pages are saved as snapshots at the commits a
// Delta compares, so it has a Before and an After to show (ADR 0042). What it draws is a
// heads-up display: the branch as a strip, readouts around it, one state word (ADR 0046).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Hud, Lang, Skill, View } from '../types'
import { foldRow, hudRows } from './hud'
import type { HudModel, Seg, Tone } from './hud'

const view = atom({ plugin: 'kddesign', key: 'view' } as const, null)

const RED = '#fc3b34'
const STONE = '#a6a195'
const JUDGE_MODEL = 'claude-haiku-5-5'
const IDLE_MS = 30_000
// Within a milestone the bar creeps by time, never past 80% of that leg; reaching the next
// milestone is what moves it on. Typical leg lengths of a run, in ms.
const LEG_MS = [40_000, 150_000, 40_000, 30_000, 30_000]
const SHINE = '#ff9a93'
const SCAN = '#2b1514'
const FRAME_MS = 150
const LESSONS_DUE = 5
// How long one session's claim on a pushed range keeps the others from recording or asking.
const CLAIM_MS = 30 * 60_000
// This session, among the others that share the store.
const ME = Math.random().toString(36).slice(2, 10)

const UI_FILE = /\.(tsx|jsx|vue|svelte|astro|css|scss|sass|less|styl|html?|mdx|swift|kt|dart|svg)$/i
const NOT_UI = /(^|\/)(node_modules|dist|build|\.next|coverage|__tests__|docs\/deltas)\/|\.(test|spec|stories|generated)\.[a-z]+$/i
const UI_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/

const COPY = {
  zh: {
    tag: { delta: 'design-delta', lessons: 'design-lessons' },
    ask: {
      delta: '要在后台跑 design-delta，把刚 push 的记成 Design Changelog 吗？',
      lessons: '要在后台跑 design-lessons，做一次 Design Lessons Review 吗？',
    },
    askShort: { delta: '记下刚 push 的改动？', lessons: '后台做一次 Design Lessons Review？' },
    lessonsDid: (n: number, last: string) => `刚记下 ${last} · 自上次 Design Lessons Review 起攒了 ${n} 个 Delta`,
    lessonsDidShort: (n: number) => `攒了 ${n} 个 Delta`,
    whyLessons: (n: number, since: string) => [
      `${since} 之后来了 ${n} 个 Delta，够做一次 Design Lessons Review`,
      '后台运行：只发布 Review 页面；贴回 Verdicts 之前不改任何规则',
    ],
    keys: ['做', '为什么', '暂时不做'],
    keysOpen: ['做', '收起', '暂时不做'],
    pick: 'Design rules 写进哪个文件？每个项目只问这一次。',
    parked: (text: string) => `■ ${text}`,
    hud: {
      toReview: '到 REVIEW', reviewDue: 'REVIEW 到了', claim: '认领',
      fold: '收到状态行', started: '刚 push，自己开始记', noKeys: ['没有键要按 · 记完自己收回状态行', '没有键要按'],
      unrecorded: (n: number) => [`这 ${n} 个 commit push 了，还没记`, `${n} 个没记`],
      blocked: ['想从这里开始记，被挡住了', '在这被挡住'],
      review: (n: number) => [`Design Lessons Review 好了 · 自上次起攒了 ${n} 个 Delta`, 'Design Lessons Review 好了', 'Review 好了'],
      five: (n: number) => [`自上次 Review 起攒了 ${n} 个 Delta`, `${n} 个 Delta`],
      saving: (route: string) => [`正在存 ${route} 当 Before，编辑等一下`, '正在存 Before'],
      saved: (route: string) => [`存了 ${route} 当 Before`, '已存 Before'],
      standby: ['另一个会话在记这次 push，这里不记也不问', '另一个会话在记'],
      recorded: (title: string, how: string, page: string | null) => [`已记下 ${title} · ${how}${page ? ` · ${page}` : ''}`, `已记下 ${title} · ${how}`, `已记下 ${title}`, title],
      noImg: '○ 无图',
      judge: '在这里逐条判', openPage: '打开页面', approveAll: '全部通过', back: '返回',
      candidate: (i: number, n: number, id: string) => [`候选 ${i}/${n} · ${id}`, `候选 ${i}/${n}`],
      noDev: ['没有 dev server 在跑：这份 Delta 不会有图', '没有 dev server：不会有图'],
      noDevMark: ['push 之后的页面存不了', 'After 存不了'],
      retry: '我开好了，再存', anyway: '不配图也记',
      folded: ['/nudge 展开', ''],
      unfolded: 'KDDESIGN Nudge：面板展开了。',
    },
    cancel: '取消',
    running: { delta: '正在后台记录 Design Changelog', lessons: '正在后台准备 Design Lessons Review' },
    runningShort: { delta: '正在后台记录', lessons: '正在后台准备' },
    runningSub: (time: string, tools: number) => `${time} · ${tools} 次工具调用`,
    legs: {
      delta: ['读 diff', '截图', '搭页面', '发布', '写 Delta'],
      lessons: ['读 Delta', '拿截图', '搭页面', '发布', '记录'],
    },
    stills: (n: number) => `截图 ${n}`,
    stop: '停止',
    done: (title: string, n: number | null) => `跑完了：${title}${n === null ? '' : ` · ${n} 个 Change`}`,
    doneShort: (title: string) => `跑完了：${title}`,
    failed: '没跑完',
    notStarted: '后台任务没能启动',
    noAnswer: '后台任务没有留下回答',
    starting: (tag: string) => `已请 Claude 在后台启动 ${tag}`,
    noAgent: 'Claude 没有启动后台任务；对话里有原因',
    doneKeys: { open: '打开', approve: '通过', change: '带修改通过', dismiss: '关掉' },
    failedKeys: ['细节', '收起', '关掉'],
    pasteHere: (what: string) => `我在页面上改过了，${what}贴在下面：\n`,
    notify: (title: string) => `${title} 好了`,
    recorded: (title: string, how: string, page: string | null) => `已记下 ${title} · ${how}${page ? ` · 页面 ${page}` : ''}`,
    committed: 'Delta 已 commit',
    pushed: 'Delta 已 commit 并 push',
    uncommitted: 'Delta 写好了，没有 commit',
    refused: (reason: string) => `没能自动开始：${reason}`,
    pushedDid: '刚 push 的 UI 改动还没记录',
    whyPushed: (base: string, after: string) => `范围：${base} → 已 push 的 ${after}`,
    whyPassive: (dir: string, isIgnored: boolean) =>
      isIgnored ? `后台运行：Delta 写到 ${dir}/（git 忽略了这个文件夹，所以不 commit）；图取自已存的页面快照，有图才发布页面` : `后台运行：Delta 写到 ${dir}/，写完单独 commit 这一个文件；图取自已存的页面快照，有图才发布页面`,
  },
  en: {
    tag: { delta: 'design-delta', lessons: 'design-lessons' },
    ask: {
      delta: 'Run design-delta in the background to record what was pushed as a Design Changelog?',
      lessons: 'Run design-lessons in the background for a Design Lessons Review?',
    },
    askShort: { delta: 'Record what was pushed?', lessons: 'Run a Design Lessons Review in the background?' },
    lessonsDid: (n: number, last: string) => `Just recorded ${last} · ${n} Deltas since the last Design Lessons Review`,
    lessonsDidShort: (n: number) => `${n} Deltas piled up`,
    whyLessons: (n: number, since: string) => [
      `${n} Deltas arrived after ${since}, enough for a Design Lessons Review`,
      'In the background: it only publishes the Review page; no rule changes until you paste Verdicts',
    ],
    keys: ['Do it', 'Why', 'Not now'],
    keysOpen: ['Do it', 'Collapse', 'Not now'],
    pick: 'Which file holds the design rules? Asked once per project.',
    parked: (text: string) => `■ ${text}`,
    hud: {
      toReview: 'to REVIEW', reviewDue: 'REVIEW due', claim: 'claim',
      fold: 'Fold to status line', started: 'Just pushed: recording by itself', noKeys: ['No key to press · folds back to the status line when done', 'No key to press'],
      unrecorded: (n: number) => [`${n === 1 ? 'this commit is' : `these ${n} commits are`} pushed, not recorded`, `${n} unrecorded`],
      blocked: ['it tried to start here and was blocked', 'blocked here'],
      review: (n: number) => [`Design Lessons Review is ready · ${n} Deltas since the last one`, 'Design Lessons Review is ready', 'Review is ready'],
      five: (n: number) => [`${n} Deltas since the last Review`, `${n} Deltas`],
      saving: (route: string) => [`saving ${route} as Before; the edit waits`, 'saving Before'],
      saved: (route: string) => [`saved ${route} as Before`, 'Before saved'],
      standby: ['another session is recording this push; nothing to do here', 'another session records'],
      recorded: (title: string, how: string, page: string | null) => [`Recorded ${title} · ${how}${page ? ` · ${page}` : ''}`, `Recorded ${title} · ${how}`, `Recorded ${title}`, title],
      noImg: '○ no img',
      judge: 'Judge here', openPage: 'Open the page', approveAll: 'Approve all', back: 'Back',
      candidate: (i: number, n: number, id: string) => [`candidate ${i}/${n} · ${id}`, `candidate ${i}/${n}`],
      noDev: ['No dev server is running: this Delta will have no pictures', 'No dev server: no pictures'],
      noDevMark: ['the pages after the push cannot be saved', 'After cannot be saved'],
      retry: 'It is running now, save again', anyway: 'Record without pictures',
      folded: ['/nudge opens it', ''],
      unfolded: 'KDDESIGN Nudge: the panel is open.',
    },
    cancel: 'Cancel',
    running: { delta: 'Recording a Design Changelog in the background', lessons: 'Preparing a Design Lessons Review in the background' },
    runningShort: { delta: 'Recording', lessons: 'Preparing' },
    runningSub: (time: string, tools: number) => `${time} · ${tools} tool calls`,
    legs: {
      delta: ['Diff', 'Stills', 'Page', 'Publish', 'Delta'],
      lessons: ['Deltas', 'Stills', 'Page', 'Publish', 'Record'],
    },
    stills: (n: number) => `Stills ${n}`,
    stop: 'Stop',
    done: (title: string, n: number | null) => `Finished: ${title}${n === null ? '' : ` · ${n} Changes`}`,
    doneShort: (title: string) => `Finished: ${title}`,
    failed: 'Did not finish',
    notStarted: 'Could not start the background run',
    noAnswer: 'The background run left no answer',
    starting: (tag: string) => `Asked Claude to start ${tag} in the background`,
    noAgent: 'Claude did not start the background run; the conversation says why',
    doneKeys: { open: 'Open', approve: 'Approve', change: 'Approve with Changes', dismiss: 'Dismiss' },
    failedKeys: ['Details', 'Collapse', 'Dismiss'],
    pasteHere: (what: string) => `I made changes on the page; my ${what} are pasted below:\n`,
    notify: (title: string) => `${title} is ready`,
    recorded: (title: string, how: string, page: string | null) => `Recorded ${title} · ${how}${page ? ` · page ${page}` : ''}`,
    committed: 'Delta committed',
    pushed: 'Delta committed and pushed',
    uncommitted: 'Delta written, not committed',
    refused: (reason: string) => `Could not start by itself: ${reason}`,
    pushedDid: 'Pushed UI changes are not recorded yet',
    whyPushed: (base: string, after: string) => `Range: ${base} → ${after}, as pushed`,
    whyPassive: (dir: string, isIgnored: boolean) =>
      isIgnored ? `In the background: a Delta in ${dir}/ (which git ignores, so it is not committed); stills from saved page snapshots, and a page only when there are stills` : `In the background: a Delta in ${dir}/, committed on its own; stills from saved page snapshots, and a page only when there are stills`,
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
let isAccepting = false
let idle: { cancel: () => void } | null = null
let ticker: { cancel: () => void } | null = null
let parkedAs: string | undefined
// One row for the status line while the band shows nothing: a page being saved, a Delta just
// recorded, another session recording. Words, longest first; the next prompt clears it.
let aside: { word: string; hud: Hud | null; rest: string[] } | null = null
// A design-delta or design-lessons run the user started by hand, until the turn it runs in ends.
let handRun: Skill | null = null
// The turn running now carries the Nudge's request to start a run.
let isAskInTurn = false
const judged = new Map<string, Judgement | null>()
// The last local page a tool call named: where Claude was looking when it started to edit.
let lastLocalUrl: string | null = null
// Commits whose pages this session has already tried to save, whole or before a first edit.
const snapped = new Set<string>()
const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/[^\s"'\\<>)]*)?/

type Judgement = { isVisible: boolean; did: string; didShort: string; lang: Lang }

// isOn: the user has run design-delta by hand in this project (ADR 0012).
// isHudFolded: the user folded the display during a run, so the next run starts folded.
type Prefs = { isOn?: boolean; rulesFile?: string; isHudFolded?: boolean }

type Project = {
  root: string
  branch: string
  defaultBranch: string
  prefs: Prefs
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
const claimKey = (root: string, branch: string) => `claim:delta:${root}:${branch}`

async function project($: $): Promise<Project | null> {
  const repo = await $.session.repo()
  if (!repo) return null
  const root = repo.root
  const branch = (await git($, root, ['rev-parse', '--abbrev-ref', 'HEAD'])) ?? 'HEAD'
  const originHead = await git($, root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  const defaultBranch = originHead
    ? originHead.replace(/^origin\//, '')
    : (await git($, root, ['rev-parse', '--verify', '--quiet', 'main'])) !== null ? 'main' : 'master'
  const prefs = ((await $.store.get(prefsKey(root))) as Prefs | undefined) ?? {}
  return { root, branch, defaultBranch, prefs }
}

// The rest of a pointer line. The Deltas folder may be kept on one machine, so its line may
// sit in CLAUDE.local.md too.
async function pointer($: $, root: string, key: 'Design rules' | 'Design deltas'): Promise<string | null> {
  const files = key === 'Design deltas' ? ['AGENTS.md', 'CLAUDE.md', 'CLAUDE.local.md'] : ['AGENTS.md', 'CLAUDE.md']
  for (const file of files) {
    const text = await readText($, `${root}/${file}`)
    const line = text?.match(new RegExp(`^${key}:[ \\t]*(\\S.*)$`, 'm'))
    if (line?.[1]) return line[1]
  }
  return null
}

// Where design-delta writes Deltas (its PAGE.md, Where Deltas live), relative to the root, no
// trailing slash. isIgnored: git ignores it and the pointer line does not mark it (local).
async function deltasDir($: $, root: string) {
  const line = await pointer($, root, 'Design deltas')
  const dir = (line?.split(/\s/)[0] ?? 'docs/deltas').replace(/[./]+$/, '')
  const isLocal = /^\S+\s+\(local\)/.test(line ?? '')
  // (auto): the user asked for pushed work to be recorded without asking (ADR 0041).
  const isAuto = /^\S+\s+\(auto\)/.test(line ?? '')
  const isIgnored = !isLocal && (await git($, root, ['check-ignore', '-q', `${dir}/0000-00-00-probe.md`])) !== null
  return { dir, isIgnored, isAuto }
}

async function deltaFiles($: $, root: string): Promise<string[]> {
  const { dir } = await deltasDir($, root)
  if (!(await $.fs.exists(`${root}/${dir}`))) return []
  const entries = await $.fs.list(`${root}/${dir}`)
  return entries
    .filter(entry => entry.kind === 'file' && /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name))
    .map(entry => entry.name)
    .sort()
    .reverse()
}

// A Delta's After is in this checkout's history, or is a snapshot of a dirty tree (the Nudge's,
// or FIDELITY.md's Recording a dirty After): a commit off the HEAD of its day, never in HEAD's
// history itself, so it counts when its parent is.
async function isRecordedHere($: $, root: string, after: string) {
  if ((await git($, root, ['merge-base', '--is-ancestor', after, 'HEAD'])) !== null) return true
  const subject = await git($, root, ['log', '-1', '--format=%s', after])
  return !!subject?.startsWith('design-delta ') && (await git($, root, ['merge-base', '--is-ancestor', `${after}^`, 'HEAD'])) !== null
}

// The Baseline design-delta itself uses: this branch's newest Delta's After, else where the
// branch left the default branch, else (on the default branch) where this session started.
async function baseline($: $, p: Project): Promise<{ base: string; label: string } | null> {
  const { dir } = await deltasDir($, p.root)
  for (const name of (await deltaFiles($, p.root)).slice(0, 30)) {
    const text = await readText($, `${p.root}/${dir}/${name}`)
    const after = text?.match(/^After:\s*([0-9a-f]{7,40})/m)?.[1]
    const branch = text?.match(/^Branch\s+(\S+)/m)?.[1]
    if (!after || branch !== p.branch) continue
    if (await isRecordedHere($, p.root, after)) {
      return { base: after, label: `${name.replace(/\.md$/, '')} (${after.slice(0, 7)})` }
    }
  }
  if (p.branch !== p.defaultBranch) {
    const base = await git($, p.root, ['merge-base', 'HEAD', p.defaultBranch])
    if (base) return { base, label: `${p.defaultBranch} (${base.slice(0, 7)})` }
  }
  return sessionHead ? { base: sessionHead, label: sessionHead.slice(0, 7) } : null
}

// With an After, the work between two commits; without, up to the working tree, untracked included.
async function unrecorded($: $, root: string, base: string, after?: string) {
  const range = after ? [base, after] : [base]
  const tracked = ((await git($, root, ['diff', '--name-only', ...range])) ?? '').split('\n')
  const untracked = after ? [] : ((await git($, root, ['ls-files', '--others', '--exclude-standard'])) ?? '').split('\n')
  const files = [...new Set([...tracked, ...untracked])].filter(f => f && isUiFile(f))
  if (files.length === 0) return null
  const diff = (await git($, root, ['diff', '-U1', ...range, '--', ...files])) ?? ''
  const stat = (await git($, root, ['diff', '--stat', ...range, '--', ...files])) ?? ''
  const fresh = untracked.filter(f => f && isUiFile(f))
  return { files, fingerprint: hash(diff + fresh.join('\n')), summary: `${stat}\nNew files: ${fresh.join(', ') || 'none'}\n\n${diff.slice(0, 6000)}` }
}

async function rulesState($: $, root: string) {
  const pointed = (await pointer($, root, 'Design rules'))?.split(/\s/)[0]
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

// ----- what the display reads off the branch -----

const titleOf = (file: string) =>
  file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '').split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const slugOf = (route: string) => (route.replace(/^\/+|\/+$/g, '').replace(/[^\w.-]+/g, '__') || '_').slice(0, 120)

// The pages snap.mjs knows, and whether each is saved at the Baseline and at the pushed commit.
async function pagesOf($: $, root: string, base: string, after: string): Promise<Hud['pages']> {
  try {
    const dir = await git($, root, ['rev-parse', '--git-common-dir'])
    if (!dir || !base || !after) return []
    const store = `${dir.startsWith('/') ? dir : `${root}/${dir}`}/kddesign`
    const rooms = JSON.parse((await readText($, `${store}/rooms.json`)) ?? '{}') as { routes?: string[] }
    const [b, a] = [await git($, root, ['rev-parse', base]), await git($, root, ['rev-parse', after])]
    const has = async (sha: string | null, route: string) => !!sha && (await $.fs.exists(`${store}/world/${sha}/${slugOf(route)}.mhtml`))
    const pages: Hud['pages'] = []
    for (const route of (rooms.routes ?? []).slice(0, 2)) pages.push({ route, before: await has(b, route), after: await has(a, route) })
    return pages
  } catch {
    return []
  }
}

async function hudOf($: $, p: { root: string; branch: string }, base: string, after: string): Promise<Hud> {
  const files = await deltaFiles($, p.root)
  const rules = await rulesState($, p.root)
  const count = files.filter(name => !rules.lastRun || name.slice(0, 10) > rules.lastRun).length
  const commits = base && after ? Number(await git($, p.root, ['rev-list', '--count', `${base}..${after}`])) || 1 : 1
  const claim = (await $.store.get(claimKey(p.root, p.branch))) as { owner: string } | undefined
  return { branch: p.branch, base, after, count, prev: files[0] ? titleOf(files[0]) : null, commits, pages: await pagesOf($, p.root, base, after), isClaimed: claim?.owner === ME }
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
      '{"visible": bool, "did": string, "did_short": string, "lang": "zh"|"en"}\n' +
      '- visible: the diff changes something a user of the product can see or operate (layout, visuals, copy, motion, states), not only logic, tests or types.\n' +
      '- did: one line naming what was just pushed, in the language the user writes in, starting "刚 push：" in Chinese or "Just pushed: " in English, at most 60 columns (a CJK character is 2), naming the surface and the changes.\n' +
      '- did_short: the same in at most 30 columns.\n' +
      '- lang: the language the user writes in.',
    prompt: `Recent conversation:\n${talk}\n\nPushed UI diff since the last Delta:\n${summary}`,
  })
  if (!answer.isAnswered) return null
  try {
    const raw = JSON.parse(answer.text.slice(answer.text.indexOf('{'), answer.text.lastIndexOf('}') + 1))
    return {
      isVisible: raw.visible === true,
      did: String(raw.did ?? ''),
      didShort: String(raw.did_short ?? raw.did ?? ''),
      lang: raw.lang === 'zh' ? 'zh' : 'en',
    }
  } catch {
    return null
  }
}

// ----- deciding to ask -----

// Returns why it did not ask, for /nudge to say; null when the Nudge is up.
async function evaluate($: $, trigger: 'start' | 'idle' | 'working' | 'push' | 'command'): Promise<string | null> {
  if ((await read($, view)) !== null) return null
  if (isEvaluating) return 'busy'
  isEvaluating = true
  const isAsked = trigger === 'command'
  try {
    const p = await project($)
    if (!p) return 'not in a git repo'
    if (!p.prefs.isOn) return 'off here until you run /design-delta by hand in this project'
    if (handRun) return `design-${handRun} is running by hand`
    if (trigger === 'working' && turnTouchedUi) return 'UI work in this turn'
    // What is pushed is what gets recorded (ADR 0044): by itself with (auto), after one question
    // otherwise. A question waits for an empty prompt; a run of its own does not.
    const isAuto = (await deltasDir($, p.root)).isAuto
    const hasDraft = trigger === 'idle' && !!(await $.prompt.read()).text.trim()
    if ((isAuto || !hasDraft) && (await pushed($, p, isAuto, isAsked))) return null
    // Nothing pushed to record: a quiet moment to save the Baseline's pages, if the tree is there.
    if (trigger === 'start') {
      const at = await baseline($, p)
      if (at) saveWorld($, p.root, at.base, [at.base])
    }
    if (hasDraft) {
      schedule($)
      return 'the prompt holds a draft'
    }

    const deltas = await deltaFiles($, p.root)
    const rules = await rulesState($, p.root)
    const since = deltas.filter(name => !rules.lastRun || name.slice(0, 10) > rules.lastRun)
    if (since.length === 0 || (!isAsked && since.length < LESSONS_DUE)) return 'no pushed UI changes to record, no Deltas due'
    const declined = (await $.store.get(declinedKey(p.root, '*', 'lessons'))) as { count: number } | undefined
    if (!isAsked && declined && declined.count >= since.length) return 'you said not now to these Deltas'
    const lang = langOf((await $.session.messages()).filter(m => m.role === 'user').slice(-3).map(m => m.text).join(' '))
    const c = COPY[lang]
    const last = since[0]!.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
    const lessonsHud = await hudOf($, p, '', '')
    await update($, view, (): View => ({
      kind: 'offer',
      skill: 'lessons',
      lang,
      did: c.lessonsDid(since.length, last),
      didShort: c.lessonsDidShort(since.length),
      why: c.whyLessons(since.length, rules.lastRun ?? (lang === 'zh' ? '第一个 Delta' : 'the first Delta')),
      isExpanded: false,
      root: p.root,
      branch: p.branch,
      base: '',
      fingerprint: String(since.length),
      deltas: since.length,
      hud: lessonsHud,
    }))
    return null
  } finally {
    isEvaluating = false
  }
}

// ----- page snapshots (ADR 0042) -----

// viewer/snap.mjs saves pages of the running product under the git dir, named by the commit
// they show. It answers one line of JSON and never fails its caller.
async function snap($: $, root: string, args: string[], timeoutMs: number) {
  try {
    const ran = await $.process.run(['node', `${$.plugin.root}/skills/design-delta/viewer/snap.mjs`, ...args, '--root', root], { cwd: root, timeoutMs })
    return ran.exitCode === 0 ? (JSON.parse(ran.stdout.trim().split('\n').pop() ?? 'null') as { saved?: string[]; servers?: string[]; known?: boolean } | null) : null
  } catch {
    return null
  }
}

// Every known page as it stands at a commit the tree is at: right after a push that page is the
// After of the Delta being written and the Before of the next one. Nobody waits for it.
function saveWorld($: $, root: string, at: string, keep: string[]) {
  if (snapped.has(`world:${root}:${at}`)) return
  snapped.add(`world:${root}:${at}`)
  void snap($, root, ['world', '--at', at, '--keep', keep.join(',')], 180_000)
}

// The first edit of a UI file since the Baseline: its page still shows the Baseline, and will not
// once this edit lands, so what the file renders on is saved now, before the tool runs. Once per
// file and Baseline in a session. Other files may already be edited, by this session or another
// on the same branch; snap.mjs keeps the page with that list (ADR 0045).
async function beforeFirstEdit($: $, file: string) {
  const p = await project($)
  if (!p?.prefs.isOn) return
  const found = await baseline($, p)
  const relative = file.startsWith(`${p.root}/`) ? file.slice(p.root.length + 1) : file
  if (!found || snapped.has(`first:${p.root}:${found.base}:${relative}`)) return
  snapped.add(`first:${p.root}:${found.base}:${relative}`)
  const hint = lastLocalUrl ? ['--hint', lastLocalUrl] : []
  const saved = await snap($, p.root, ['world', '--at', found.base, '--only', relative, ...hint, '--max-ms', '8000'], 12_000)
  // A page really was saved: say so in one row, since it is why the edit waited.
  const route = saved?.saved?.[0]
  if (route && (await read($, view)) === null) {
    const lang = langOf((await $.session.messages()).filter(m => m.role === 'user').slice(-3).map(m => m.text).join(' '))
    await say($, { word: 'ARMED', hud: null, rest: COPY[lang].hud.saved(route) })
  }
}

// ----- recording without asking -----

// What has been pushed since the last Delta is recorded in a background run (ADR 0041, 0044).
// With (auto) the mod starts it itself; otherwise, or when that spawn is refused, one question
// goes up for the same pushed range. True when it took the moment.
async function pushed($: $, p: Project, isAuto: boolean, isAsked: boolean): Promise<boolean> {
  const upstream = await git($, p.root, ['rev-parse', '--verify', '--quiet', '@{upstream}'])
  const found = await baseline($, p)
  if (!upstream || !found || found.base === upstream) return false
  if ((await git($, p.root, ['merge-base', '--is-ancestor', found.base, upstream])) === null) return false
  const work = await unrecorded($, p.root, found.base, upstream)
  if (!work) return false
  const taken = (await $.store.get(declinedKey(p.root, p.branch, 'delta'))) as { fingerprint: string } | undefined
  if (taken?.fingerprint === work.fingerprint && !(isAsked && !isAuto)) return false
  // Several sessions may be open on this branch, and each sees the same push. The first to look
  // claims it before the slow steps, so one run records it and one band asks (ADR 0045). A claim
  // lapses, in case its session went away before the run or the answer.
  const now = await $.clock.now()
  const claim = (await $.store.get(claimKey(p.root, p.branch))) as { fingerprint: string; owner: string; at: number } | undefined
  if (claim && claim.fingerprint === work.fingerprint && claim.owner !== ME && now - claim.at < CLAIM_MS && !isAsked) {
    const lang = langOf((await $.session.messages()).filter(m => m.role === 'user').slice(-3).map(m => m.text).join(' '))
    await say($, { word: 'STBY', hud: await hudOf($, p, found.base, upstream), rest: [...COPY[lang].hud.standby] })
    return false
  }
  await $.store.set(claimKey(p.root, p.branch), { fingerprint: work.fingerprint, owner: ME, at: now })
  saveWorld($, p.root, upstream, [found.base, upstream])
  // One reading per pushed diff: an offer left standing is not judged again at every quiet moment.
  const verdict = judged.has(work.fingerprint) ? judged.get(work.fingerprint)! : await judge($, work.summary)
  judged.set(work.fingerprint, verdict)
  const lang = verdict?.lang ?? langOf((await $.session.messages()).filter(m => m.role === 'user').slice(-3).map(m => m.text).join(' '))
  const at = { skill: 'delta' as const, lang, root: p.root, branch: p.branch, fingerprint: work.fingerprint }
  // Nothing a user can see: there is no Delta to write, and the same diff is not judged again.
  if (verdict && !verdict.isVisible) {
    await markTaken($, at)
    return false
  }
  const c = COPY[lang]
  const deltas = await deltasDir($, p.root)
  const hud = await hudOf($, p, found.base, upstream)
  // Pictures have worked in this clone before and no dev server answers now: recording at once
  // would give a Delta without them, so the user gets the choice first (ADR 0046).
  const dev = await snap($, p.root, ['servers'], 8_000)
  const isNoImg = dev?.known === true && (dev.servers ?? []).length === 0
  const offer = (reason?: string): View => ({
    hud, isRefused: reason !== undefined, isNoImg,
    kind: 'offer', skill: 'delta', lang,
    did: verdict?.did || c.pushedDid,
    didShort: verdict?.didShort || c.pushedDid,
    why: [reason, c.whyPushed(found.label, upstream.slice(0, 7)), c.whyPassive(deltas.dir, deltas.isIgnored)].filter((x): x is string => !!x),
    isExpanded: false, root: p.root, branch: p.branch, base: found.base, after: upstream, fingerprint: work.fingerprint, deltas: 0,
  })
  if (!isAuto || isNoImg) {
    await update($, view, () => offer())
    return true
  }
  const prefs = ((await $.store.get(prefsKey(p.root))) as Prefs | undefined) ?? {}
  const startedAt = await $.clock.now()
  const label = `${c.tag.delta} (KDDESIGN Nudge ${startedAt.toString(36).slice(-4)})`
  const started = await $.agent.spawn({
    description: label,
    subagentType: 'general-purpose',
    prompt: taskOf($, 'delta', p.root, passiveArgs(found.base, upstream, p.branch, prefs.rulesFile)),
  })
  // Core sets the id; where an answer came back without one, the agent list names it.
  const agentId = started.deny === undefined ? (started.agentId ?? (await $.agent.list()).find(a => a.description === label)?.id) : undefined
  if (!agentId) {
    // The engine or a hook refused the spawn (auto mode may): ask, with one key.
    await update($, view, () => offer(c.refused(started.deny ?? '')))
    return true
  }
  await markTaken($, at)
  await follow($, { skill: 'delta', lang, root: p.root, branch: p.branch, isPassive: true, hud }, agentId)
  return true
}

const passiveArgs = (base: string, after: string, branch: string, rules?: string) =>
  `--range ${base}..${after} --passive --branch ${branch}${rules ? ` --rules ${rules}` : ''}`

// What the background agent is told: the same words whether Claude or the mod starts it.
const taskOf = ($: $, skill: Skill, root: string, args: string) =>
  `The user ${args.includes('--passive') ? 'has KDDESIGN record pushed design changes by itself' : 'pressed 1 on the KDDESIGN Nudge'}. ` +
  `Read ${$.plugin.root}/skills/design-${skill}/SKILL.md and carry out that skill in ${root} with these arguments: ${args}\n` +
  'You run in the background and nobody watches: ask nothing, follow the skill\'s --background rules, and end with its one line of JSON and nothing else. ' +
  'A message without a tool call ends the run, so put status notes in the same message as your next tool call; the JSON line is the only message that may stand alone.'

function schedule($: $) {
  idle?.cancel()
  idle = $.clock.after(IDLE_MS, () => void evaluate($, 'idle'))
}

// ----- answering the Nudge -----

async function decline($: $, v: Extract<View, { kind: 'offer' | 'pick' }>) {
  if (v.skill === 'delta') await $.store.set(declinedKey(v.root, v.branch, 'delta'), { fingerprint: v.fingerprint })
  else await $.store.set(declinedKey(v.root, '*', 'lessons'), { count: Number(v.fingerprint) })
  await update($, view, () => null)
}

async function savePrefs($: $, root: string, change: Prefs) {
  const prefs = ((await $.store.get(prefsKey(root))) as Prefs | undefined) ?? {}
  await $.store.set(prefsKey(root), { ...prefs, ...change })
}

// Only the first press counts: the offer stays up through the submit, and
// every press in that time would start a run of its own.
async function accept($: $, v: Extract<View, { kind: 'offer' | 'pick' }>, rulesFile?: string) {
  if (isAccepting) return
  isAccepting = true
  try {
    await startRun($, v, rulesFile)
  } finally {
    isAccepting = false
  }
}

async function startRun($: $, v: Extract<View, { kind: 'offer' | 'pick' }>, rulesFile?: string) {
  const prefs = ((await $.store.get(prefsKey(v.root))) as Prefs | undefined) ?? {}
  let rules = rulesFile ?? prefs.rulesFile
  if (!rules) {
    const state = await rulesState($, v.root)
    if (state.options.length > 1) {
      await update($, view, (): View => ({ kind: 'pick', skill: v.skill, lang: v.lang, root: v.root, branch: v.branch, base: v.base, fingerprint: v.fingerprint, after: v.after, options: state.options.slice(0, 3), hud: v.hud }))
      return
    }
  }
  if (rulesFile) await savePrefs($, v.root, { rulesFile })

  const rulesArg = rules ? ` --rules ${rules}` : ''
  let args = `--background${rulesArg}`
  // A design-delta offer always names a pushed range, and its run is the passive one.
  const isPassive = v.skill === 'delta'
  if (isPassive) {
    if (v.after === undefined) return fail($, v, COPY[v.lang].notStarted)
    args = passiveArgs(v.base, v.after, v.branch, rules)
  }
  // The run starts as a request in the conversation, in the user's name, and Claude starts the agent:
  // a spawn of the mod's own is one auto mode's classifier refuses, as it cannot see the keypress.
  const startedAt = await $.clock.now()
  const label = `${c(v).tag[v.skill]} (KDDESIGN Nudge ${startedAt.toString(36).slice(-4)})`
  const task = taskOf($, v.skill, v.root, args)
  const asked = await $.prompt.submit({
    asUser: true,
    text:
      `Run ${c(v).tag[v.skill]} in the background now (KDDESIGN Nudge). Start one background general-purpose agent with the Agent tool, ` +
      `description "${label}", and exactly this prompt:\n\n${task}\n\nThen carry on with what we were doing; do not wait for it.`,
  })
  if (asked.drop !== undefined) return fail($, v, asked.drop || COPY[v.lang].notStarted)
  // This work is being recorded now: the Nudge does not offer it again once the run is done.
  await markTaken($, v)
  await update($, view, (): View => ({ kind: 'starting', skill: v.skill, lang: v.lang, root: v.root, branch: v.branch, isPassive, label, startedAt, hud: v.hud }))
}

const c = (v: { lang: Lang }) => COPY[v.lang]

// Claude has started the agent the Nudge asked for: from here the band follows it.
const run = ($: $, v: Extract<View, { kind: 'starting' }>, agentId: string) => follow($, v, agentId)

async function follow($: $, v: { skill: Skill; lang: Lang; root: string; branch?: string; isPassive?: boolean; hud?: Hud }, agentId: string) {
  const startedAt = await $.clock.now()
  const prefs = ((await $.store.get(prefsKey(v.root))) as Prefs | undefined) ?? {}
  await update($, view, (): View => ({
    kind: 'running', skill: v.skill, lang: v.lang, root: v.root, branch: v.branch, isPassive: v.isPassive, agentId, turnId: null,
    startedAt, tools: 0, leg: 0, legAt: startedAt, stills: 0, action: '', actionAt: startedAt,
    hud: v.hud, isFolded: prefs.isHudFolded === true,
  }))
  ticker?.cancel()
  ticker = $.clock.every(FRAME_MS, () => $.ui.invalidate('ui.render'))
}

// The working tree as a commit, untracked files included, so the main agent can keep editing.
// The run did not start; the reason is what Details shows.
async function fail($: $, v: { skill: Skill; lang: Lang }, reason: string) {
  await update($, view, (): View => ({ kind: 'done', skill: v.skill, lang: v.lang, isOk: false, title: COPY[v.lang].notStarted, page: null, review: null, delta: null, changes: null, note: reason, isExpanded: false }))
}

// Work a run has taken on is not offered again, as after Not now: the Nudge waits for new work.
async function markTaken($: $, v: { skill: Skill; root: string; branch: string; fingerprint: string }) {
  if (v.skill === 'delta') await $.store.set(declinedKey(v.root, v.branch, 'delta'), { fingerprint: v.fingerprint })
  else await $.store.set(declinedKey(v.root, '*', 'lessons'), { count: Number(v.fingerprint) })
}

// A hand run just ended: it recorded what it saw (and ran design-lessons if that was due), so the
// state it left counts as taken.
async function markHandRun($: $) {
  const p = await project($)
  if (!p) return
  const found = await baseline($, p)
  const work = found ? await unrecorded($, p.root, found.base) : null
  if (work) await markTaken($, { skill: 'delta', root: p.root, branch: p.branch, fingerprint: work.fingerprint })
  const rules = await rulesState($, p.root)
  const since = (await deltaFiles($, p.root)).filter(name => !rules.lastRun || name.slice(0, 10) > rules.lastRun)
  await markTaken($, { skill: 'lessons', root: p.root, branch: p.branch, fingerprint: String(since.length) })
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
  const delta = typeof out.delta === 'string' ? out.delta : null
  // A passive run may publish no page: its Delta, or finding no Changes, is result enough.
  const isPassiveOk = v.isPassive === true && (delta !== null || out.changes === 0)
  const isOk = page !== null || review !== null || isPassiveOk || (v.skill === 'lessons' && typeof out.rules === 'string')
  const title = isOk ? (typeof out.title === 'string' ? out.title : 'Design Lessons Review') : COPY[v.lang].failed
  const how = v.isPassive && delta ? await commitDelta($, v, delta, title) : null
  // Nothing for the user to decide: the band stays empty, and one toast says what was kept and
  // where its page is, when snapshots gave it one.
  if (isPassiveOk && review === null) {
    await update($, view, () => null)
    if (delta && how) {
      await $.ui.toast(COPY[v.lang].recorded(title, how, page))
      const h = v.hud ? { ...v.hud, count: v.hud.count + 1, prev: title } : null
      await say($, { word: 'SAVED', hud: h, rest: COPY[v.lang].hud.recorded(title, page ? how : `${how} ${COPY[v.lang].hud.noImg}`, page) })
    }
    return
  }
  await update($, view, (): View => ({
    kind: 'done',
    skill: v.skill,
    lang: v.lang,
    isOk,
    title,
    page,
    review,
    delta,
    changes: typeof out.changes === 'number' ? out.changes : null,
    note: typeof out.note === 'string' ? out.note : isOk ? how : answer.trim().slice(-300) || COPY[v.lang].noAnswer,
    isExpanded: false,
    hud: v.hud ? { ...v.hud, count: v.hud.count + (isOk && delta ? 1 : 0), prev: isOk && delta ? title : v.hud.prev } : undefined,
    candidates: review && Array.isArray(out.candidates)
      ? (out.candidates as Array<Record<string, unknown>>)
          .filter(x => x && typeof x.id === 'string' && typeof x.rule === 'string')
          .slice(0, 12)
          .map(x => ({ id: String(x.id), rule: String(x.rule), said: typeof x.said === 'string' ? x.said : null }))
      : undefined,
  }))
  if (isOk) await $.ui.notify(COPY[v.lang].notify(title), { title: 'KDDESIGN' })
}

// A passive run's Delta goes into git by the mod's hand: one commit holding that file alone,
// whatever else is staged, and a push on any branch but the default one (ADR 0041).
async function commitDelta($: $, v: { root: string; branch?: string; lang: Lang }, delta: string, title: string) {
  const c = COPY[v.lang]
  const p = await project($)
  if (!p || p.root !== v.root || p.branch !== v.branch || (await deltasDir($, v.root)).isIgnored) return c.uncommitted
  if ((await git($, v.root, ['add', '--', delta])) === null) return c.uncommitted
  if ((await git($, v.root, ['commit', '-m', `design-delta: ${title} [skip ci]`, '--', delta])) === null) return c.uncommitted
  if (p.branch === p.defaultBranch) return c.committed
  return (await git($, v.root, ['push'])) !== null ? c.pushed : c.committed
}

// Approve: every item on the Design Lessons Review is accepted as drafted. It goes into the
// conversation in the user's name. A Design Changelog has nothing to approve (ADR 0043).
async function approve($: $, v: Extract<View, { kind: 'done' }>) {
  if (!v.review) return
  await $.prompt.submit({
    asUser: true,
    text:
      `I approve (KDDESIGN Nudge). Apply Verdicts to the Design Lessons Review ${v.review}: Accept every item as drafted, with no Notes. ` +
      `Follow step 6 of ${$.plugin.root}/skills/design-lessons/SKILL.md.`,
  })
  await update($, view, () => null)
}

// Judged in the display, one item at a time: the Verdicts go into the conversation in the
// user's name, one per item, as pasted Verdicts would.
async function judged$($: $, v: Extract<View, { kind: 'done' }>, verdicts: string[]) {
  if (!v.review || !v.candidates) return
  const list = v.candidates.map((x, i) => `${x.id}: ${verdicts[i] ?? 'Watch'}`).join('; ')
  await $.prompt.submit({
    asUser: true,
    text:
      `I gave Verdicts on the KDDESIGN Nudge for the Design Lessons Review ${v.review}, with no Notes: ${list}. ` +
      `Apply them: follow step 6 of ${$.plugin.root}/skills/design-lessons/SKILL.md.`,
  })
  await update($, view, () => null)
}

// Approve with Changes: the user's Verdicts live on the Review page until Copy Verdicts, and no
// hook can read the clipboard, so the prompt box gets a line to paste them under.
async function approveWithChanges($: $, v: Extract<View, { kind: 'done' }>) {
  const filled = await $.prompt.fill({ text: COPY[v.lang].pasteHere('Verdicts') })
  if (filled.isFilled) await update($, view, () => null)
}

async function openUrl($: $, url: string | null) {
  if (!url) return
  const uname = await $.process.run(['uname'])
  await $.process.run([uname.stdout.trim() === 'Darwin' ? 'open' : 'xdg-open', url])
}

// ---------- reading a run ----------

// Which milestone a subagent's tool call shows, and the action to type out in the band.
function readStep(skill: Skill, call: Record<string, unknown> & { tool: string }): { leg?: number; isStill?: boolean; action: string } {
  const cmd = typeof call.command === 'string' ? (call.command.split('\n')[0] ?? '').trim() : ''
  const path = typeof call.file_path === 'string' ? call.file_path : ''
  const tool = call.tool
  const action = cmd || (path ? `${tool} ${path}` : tool === 'Skill' && typeof call.skill === 'string' ? `Skill ${call.skill}` : tool === 'Artifact' ? `Artifact · ${typeof call.action === 'string' ? call.action : 'publish'}` : tool)
  const isBrowser = /browser|chrome|playwright|puppeteer|screenshot/i.test(tool) || /\b(playwright|puppeteer|still\.py|snapshot\.js|screenshot)\b/i.test(cmd)
  // A passive run takes its stills from saved pages (ADR 0042): pairing them opens the leg, each crop counts.
  const snapStep = cmd.match(/\bsnap\.mjs\s+(pair|outline|still|adopt)\b/)?.[1]
  const isPublish = tool === 'Artifact' && (call.action === undefined || call.action === 'publish')
  if (skill === 'delta') {
    if (/\bgit\s+(diff|log|show)\b/.test(cmd)) return { leg: 0, action }
    if (snapStep) return { leg: 1, isStill: snapStep === 'still', action }
    if (isBrowser) return { leg: 1, isStill: true, action }
    if (/(build|validate)\.py/.test(cmd)) return { leg: 2, action }
    if (isPublish) return { leg: 3, action }
    if (/\/\d{4}-\d{2}-\d{2}-[^/]+\.md$/.test(path) && tool !== 'Read') return { leg: 4, action }
    return { action }
  }
  if (tool === 'Read' && /\/\d{4}-\d{2}-\d{2}-[^/]+\.md$/.test(path)) return { leg: 0, action }
  if (tool === 'Artifact' && !isPublish) return { leg: 1, action }
  if (/review\/build\.py/.test(cmd)) return { leg: 2, action }
  if (isPublish) return { leg: 3, action }
  if ((tool === 'Write' || tool === 'Edit') && path && !/\/\d{4}-\d{2}-\d{2}-[^/]+\.md$/.test(path)) return { leg: 4, action }
  return { action }
}

// Milestones move the bar; within one it creeps by time, never past 80% of the leg.
function runProgress(v: Extract<View, { kind: 'running' }>, now: number) {
  const sub = Math.min(0.8, (now - v.legAt) / (LEG_MS[v.leg] ?? 60_000))
  return Math.min(0.97, (v.leg + sub) / 5)
}

function legLabel(v: Extract<View, { kind: 'running' }>) {
  const c = COPY[v.lang]
  return v.skill === 'delta' && v.leg === 1 && v.stills > 0 ? c.stills(v.stills) : (c.legs[v.skill][v.leg] ?? '')
}

// ---------- parking ----------

// When a survey or another mod holds the band, the Nudge waits as one status line (ADR 0012).
const STATUS_COLS = 100

// The display's model for a range: what every state shares.
function baseModel(v: { lang: Lang; hud?: Hud; branch?: string }): Pick<HudModel, 'n' | 'toReview' | 'branch' | 'range' | 'strip' | 'pages' | 'claim'> {
  const c = COPY[v.lang].hud
  const h = v.hud
  return {
    n: h?.count ?? 0,
    toReview: c.toReview,
    branch: h?.branch ?? v.branch ?? '',
    range: h?.base && h.after ? `${h.base.slice(0, 7)}‥${h.after.slice(0, 7)}` : '',
    strip: { history: Math.min(3, Math.max(0, (h?.count ?? 0) - 1)), prev: h?.prev ?? null, commits: h?.commits ?? 1 },
    pages: h?.pages ?? [],
    claim: h?.isClaimed ? c.claim : undefined,
  }
}

// When a survey or another mod holds the band, or the display is folded, the Nudge is one row
// in the status line (ADR 0012): the same word, a small strip and the count.
function parkedText(v: View, now: number): string {
  const c = COPY[v.lang]
  const m = baseModel(v)
  if (v.kind === 'offer') return foldRow('HOLD', m, [v.didShort, ''], STATUS_COLS)
  if (v.kind === 'pick') return foldRow('HOLD', m, [c.askShort[v.skill], ''], STATUS_COLS)
  if (v.kind === 'starting') return foldRow('ARMED', m, [c.starting(c.tag[v.skill]), ''], STATUS_COLS)
  if (v.kind === 'running') {
    const leg = legLabel(v)
    return foldRow('REC', { ...m, strip: { ...m.strip, done: runProgress(v, now) } }, [`${leg} · ${clock(now - v.startedAt)}${v.isFolded ? ` · ${c.hud.folded[0]}` : ''}`, `${leg} · ${clock(now - v.startedAt)}`, leg, ''], STATUS_COLS)
  }
  return foldRow(v.isOk ? (v.review ? 'HOLD' : 'SAVED') : 'FAIL', m, [v.title, ''], STATUS_COLS)
}

// One row beside the band, when the band shows nothing.
async function say($: $, row: NonNullable<typeof aside>) {
  aside = row
  await $.ui.invalidate('ui.render')
}

function park($: $, text: string | undefined) {
  if (text === parkedAs) return
  parkedAs = text
  $.ui.status(text)
}

// ---------- the hooks ----------

export const register: Register = on => {
  // ----- events -----

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({ name: 'nudge', description: 'Ask now whether to run design-delta or design-lessons in the background (KDDESIGN Nudge)' })
    const repo = await $.session.repo()
    if (repo) sessionHead = await git($, repo.root, ['rev-parse', 'HEAD'])
    // A reload keeps a running view; its ticker does not survive, so restart it.
    if ((await read($, view))?.kind === 'running') ticker = $.clock.every(FRAME_MS, () => $.ui.invalidate('ui.render'))
    $.clock.after(3000, () => void evaluate($, 'start'))
    return started
  })

  // A hand run of design-delta turns the Nudge on for this project; it never asks before that.
  on('prompt.submit', async ($, e, next) => {
    const v = await read($, view)
    aside = null
    if (v?.kind === 'starting' && e.text.includes(v.label)) isAskInTurn = true
    const skill = e.command?.name.match(/^(?:kddesign:)?design-(delta|lessons)$/)?.[1] as Skill | undefined
    if (skill) handRun = skill
    if (skill === 'delta') {
      const repo = await $.session.repo()
      if (repo) await savePrefs($, repo.root, { isOn: true })
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'nudge' }, async $ => {
    const repo = await $.session.repo()
    if (!repo) return { text: 'KDDESIGN Nudge: not in a git repo.' }
    // Asking for it by hand is the same as a hand run: it turns the Nudge on here.
    await savePrefs($, repo.root, { isOn: true })
    const open = await read($, view)
    if (open?.kind === 'running' && open.isFolded) {
      await savePrefs($, repo.root, { isHudFolded: false })
      await update($, view, x => (x?.kind === 'running' ? { ...x, isFolded: false } : x))
      return { text: COPY[open.lang].hud.unfolded }
    }
    const reason = await evaluate($, 'command')
    return { text: reason === null ? 'KDDESIGN Nudge: it is up above the prompt.' : `KDDESIGN Nudge: nothing to ask (${reason}).` }
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
    const isOwnRun = v?.kind === 'running' && v.agentId === e.agentId
    const edited = (e as unknown as { file_path?: string }).file_path
    if (!isOwnRun) {
      lastLocalUrl = JSON.stringify(e).match(LOCAL_URL)?.[0] ?? lastLocalUrl
      if (UI_TOOLS.has(e.tool) && edited && isUiFile(edited)) await beforeFirstEdit($, edited).catch(() => {})
    }
    if (e.agentId !== undefined) {
      if (v?.kind === 'running' && v.agentId === e.agentId) {
        const step = readStep(v.skill, e as unknown as Record<string, unknown> & { tool: string })
        const now = await $.clock.now()
        const leg = step.leg !== undefined && step.leg > v.leg ? step.leg : v.leg
        await update($, view, (): View => ({
          ...v,
          tools: v.tools + 1,
          leg,
          legAt: leg === v.leg ? v.legAt : now,
          stills: v.stills + (step.isStill ? 1 : 0),
          action: step.action,
          actionAt: now,
        }))
      }
      return next(e)
    }
    const input = e as unknown as { file_path?: string; notebook_path?: string; skill?: string }
    const started = e.tool === 'Skill' ? input.skill?.match(/^(?:kddesign:)?design-(delta|lessons)$/)?.[1] : undefined
    if (started) handRun = started as Skill
    const path = input.file_path ?? input.notebook_path
    if (UI_TOOLS.has(e.tool) && path && isUiFile(path)) turnTouchedUi = true
    // Claude is running commands in a turn that has not touched UI (tests, a commit, a push):
    // a moment the Nudge may ask while it works.
    else if (isTurnRunning && !turnTouchedUi && !hasNudgedThisTurn && e.tool === 'Bash') {
      hasNudgedThisTurn = true
      $.clock.after(0, () => void evaluate($, 'working'))
    }
    // A push is what passive recording waits for: look again once it has landed.
    if (e.tool !== 'Bash' || !/\bgit\s+push\b/.test(String((e as unknown as { command?: string }).command ?? ''))) return next(e)
    const pushed = await next(e)
    $.clock.after(0, () => void evaluate($, 'push'))
    return pushed
  }).catch(($, e, next) => next(e))

  // The agent Claude starts for the Nudge's request, known by its description.
  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const v = await read($, view)
    if (v?.kind === 'starting' && e.description === v.label && started.agentId) await run($, v, started.agentId)
    return started
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const v = await read($, view)
    if (e.agentId !== undefined) {
      if (v?.kind === 'running' && v.agentId === e.agentId) await finish($, v, e.answer)
      return next(e)
    }
    // The turn that took the Nudge's request ended without starting the agent.
    if (v?.kind === 'starting' && isAskInTurn) await fail($, v, COPY[v.lang].noAgent)
    isAskInTurn = false
    isTurnRunning = false
    if (handRun) {
      handRun = null
      await markHandRun($)
    }
    if (!turnTouchedUi) schedule($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const v = await read($, view)
    if (v === null) {
      park($, aside ? foldRow(aside.word, aside.hud ? baseModel({ lang: 'en', hud: aside.hud }) : null, aside.rest, STATUS_COLS) : undefined)
      return next(e)
    }
    // Folded by the user: the run is one row in the status line until /nudge opens it again.
    if (v.kind === 'running' && v.isFolded) {
      park($, parkedText(v, await $.clock.now()))
      return next(e)
    }
    // A survey or another mod holds the band: no queue, the Nudge waits in the status line.
    if (e.props.hasSurvey) {
      park($, parkedText(v, await $.clock.now()))
      return next(e)
    }
    const beneath = await next(e)
    if ((beneath as { type?: string }).type !== 'engine') {
      park($, parkedText(v, await $.clock.now()))
      return beneath
    }
    park($, undefined)

    const { Box, Button, Text } = $.ui.resolve(e)
    const c = COPY[v.lang]
    const cols = Math.max(24, e.props.bodyColumns)
    const now = await $.clock.now()
    const base = baseModel(v)
    const close = () => void update($, view, () => null)
    let model: HudModel
    let presses: Array<() => void> = []

    if (v.kind === 'offer' && v.skill === 'delta') {
      const toggle = () => void update($, view, x => (x?.kind === 'offer' ? { ...x, isExpanded: !x.isExpanded } : x))
      presses = [() => void accept($, v), toggle, () => void decline($, v)]
      if (v.isNoImg) {
        // 1 looks again (the user has started the server), 2 records anyway, 3 leaves it.
        const again = async () => {
          await update($, view, () => null)
          await evaluate($, 'command')
        }
        presses = [() => void again(), () => void accept($, v), () => void decline($, v)]
      }
      model = v.isNoImg ? {
        ...base, word: 'NO IMG', tone: 'yellow',
        note: [...c.hud.noDev],
        mark: { at: 'tip', tone: 'yellow', text: [{ t: c.hud.noDevMark[0], alts: [...c.hud.noDevMark] }] },
        keys: [c.hud.retry, c.hud.anyway, c.keys[2]],
      } : {
        ...base, word: 'HOLD', tone: 'red',
        note: [c.ask.delta, c.askShort.delta],
        strip: { ...base.strip, cross: v.isRefused },
        mark: v.isRefused
          ? { at: 'commits', tone: 'red', text: [{ t: c.hud.blocked[0], alts: [...c.hud.blocked] }] }
          : { at: 'commits', bracket: true, tone: 'red', text: [{ t: v.did, alts: [v.did, v.didShort, ...c.hud.unrecorded(v.hud?.commits ?? 1)] }] },
        lines: v.isExpanded ? v.why.map(text => ({ text: `· ${text}`, dim: true })) : [],
        keys: [...(v.isExpanded ? c.keysOpen : c.keys)],
      }
    } else if (v.kind === 'offer') {
      const toggle = () => void update($, view, x => (x?.kind === 'offer' ? { ...x, isExpanded: !x.isExpanded } : x))
      presses = [() => void accept($, v), toggle, () => void decline($, v)]
      model = {
        ...base, word: 'HOLD', tone: 'red', n: v.deltas, due: v.deltas >= LESSONS_DUE, toReview: v.deltas >= LESSONS_DUE ? c.hud.reviewDue : c.hud.toReview,
        note: [c.ask.lessons, c.askShort.lessons],
        strip: { ...base.strip, five: true },
        mark: { at: 'start', bracket: true, tone: 'red', text: [{ t: v.did, alts: [v.did, v.didShort] }] },
        lines: v.isExpanded ? v.why.map(text => ({ text: `· ${text}`, dim: true })) : [],
        keys: [...(v.isExpanded ? c.keysOpen : c.keys)],
      }
    } else if (v.kind === 'pick') {
      presses = [...v.options.map(file => () => void accept($, v, file)), close]
      model = { ...base, word: 'HOLD', tone: 'red', note: [c.pick], keys: [...v.options.map(file => cut(file, 36)), c.cancel] }
    } else if (v.kind === 'starting') {
      model = { ...base, word: 'ARMED', note: [c.starting(c.tag[v.skill])], hint: [''] }
    } else if (v.kind === 'running') {
      const typed = Array.from(v.action).slice(0, Math.floor((now - v.actionAt) / 35)).join('')
      const stop = async () => {
        if (v.turnId) await $.turn.abort({ turnId: v.turnId })
        ticker?.cancel()
        await update($, view, () => null)
      }
      const fold = async () => {
        await savePrefs($, v.root, { isHudFolded: true })
        await update($, view, x => (x?.kind === 'running' ? { ...x, isFolded: true } : x))
      }
      presses = [() => void fold(), () => void stop()]
      const text: Seg[] = [{ t: '› ', tone: 'red' }, { t: cut(typed, Math.max(8, cols - 30)), dim: true }, { t: typed.length < v.action.length ? '▌' : '', tone: 'red' }]
      model = {
        ...base, word: 'REC', tone: 'red',
        note: [`${c.running[v.skill]} · ${legLabel(v)}`, `${c.runningShort[v.skill]} · ${legLabel(v)}`, legLabel(v)],
        strip: v.skill === 'delta' ? { ...base.strip, done: runProgress(v, now), cover: 'run' } : { ...base.strip, five: true },
        mark: { at: v.skill === 'delta' ? 'commits' : 'start', tone: 'red', text: text.filter(x => x.t !== '') },
        pagesNote: [c.runningSub(clock(now - v.startedAt), v.tools), clock(now - v.startedAt)],
        keys: [c.hud.fold, c.stop],
      }
    } else if (!v.isOk) {
      const toggle = () => void update($, view, x => (x?.kind === 'done' ? { ...x, isExpanded: !x.isExpanded } : x))
      const [details, collapse, dismiss] = c.failedKeys
      presses = [toggle, close]
      model = {
        ...base, word: 'FAIL', tone: 'red',
        note: [v.title],
        strip: { ...base.strip, done: 0.45, cover: 'red', cross: true },
        lines: v.isExpanded && v.note ? [{ text: `· ${v.note}`, dim: true }] : [],
        keys: [v.isExpanded ? collapse : details, dismiss],
      }
    } else {
      // A Review with nothing to decide leaves no page: nothing to open. Only a Review is approved;
      // a Design Changelog is read or not, and stands either way (ADR 0043).
      const hasPage = v.page !== null || v.review !== null
      const k = c.doneKeys
      const actions: Array<[string, () => void]> = [
        ...(hasPage
          ? ([[k.open, () => void openUrl($, v.page ?? v.review).then(() => (v.page && v.review ? openUrl($, v.review) : undefined))]] as Array<[string, () => void]>)
          : []),
        ...(v.review
          ? ([
              [k.approve, () => void approve($, v)],
              [k.change, () => void approveWithChanges($, v)],
            ] as Array<[string, () => void]>)
          : []),
        [k.dismiss, close],
      ]
      presses = actions.map(([, press]) => press)
      const n = v.hud?.count ?? LESSONS_DUE
      const items = v.review ? (v.candidates ?? []) : []
      const judge = (verdicts: string[] | undefined) => void update($, view, x => (x?.kind === 'done' ? { ...x, judging: verdicts } : x))
      if (items.length && v.judging === undefined) {
        // With the items in hand the first key judges them here; the page is one key further.
        presses = [() => judge([]), () => void openUrl($, v.review), () => void approve($, v), close]
      }
      const at = v.judging?.length ?? 0
      const give = (verdict: string) => () => {
        const given = [...(v.judging ?? []), verdict]
        if (given.length >= items.length) void judged$($, v, given)
        else judge(given)
      }
      if (items.length && v.judging !== undefined) presses = [give('Accept'), give('Reject'), give('Watch'), () => judge(at ? v.judging!.slice(0, -1) : undefined)]
      model = items.length && v.judging !== undefined
        ? {
            ...base, word: 'HOLD', tone: 'red', n: Math.max(n, LESSONS_DUE), due: true, toReview: c.hud.reviewDue,
            note: [...c.hud.candidate(at + 1, items.length, items[at]!.id)],
            strip: { ...base.strip, five: true },
            lines: [{ text: items[at]!.rule, bold: true }, ...(items[at]!.said ? [{ text: `“${items[at]!.said}”`, dim: true }] : [])],
            keys: ['Accept', 'Reject', 'Watch', c.hud.back],
          }
        : v.review
        ? {
            ...base, word: 'HOLD', tone: 'red', n: Math.max(n, LESSONS_DUE), due: true, toReview: c.hud.reviewDue,
            note: [...c.hud.review(Math.max(n, LESSONS_DUE))],
            strip: { ...base.strip, five: true },
            mark: { at: 'start', bracket: true, tone: 'red', text: [{ t: c.hud.five(n)[0]!, alts: c.hud.five(n) }] },
            lines: v.note ? [{ text: `· ${v.note}`, dim: true }] : [],
            keys: items.length ? [c.hud.judge, c.hud.openPage, c.hud.approveAll, c.doneKeys.dismiss] : actions.map(([label]) => label),
          }
        : {
            ...base, word: 'SAVED', tone: 'green',
            note: [c.done(v.title, v.changes), c.doneShort(v.title)],
            lines: v.note ? [{ text: `· ${v.note}`, dim: true }] : [],
            keys: actions.map(([label]) => label),
          }
    }

    const COLOR: Record<Tone, string> = { red: RED, shine: SHINE, stone: STONE, green: '#57c98a', yellow: '#e5c15a', blue: '#6fa8ff' }
    const rows = hudRows(model, cols, now)
    // While a run is under way a faint scanline steps down the rows: the ground changes, no character moves.
    const scan = v.kind === 'running' ? Math.floor(now / 300) % (rows.length + 5) : -1
    const text = (x: Seg, i: number, lit: boolean) => (
      <Text key={`t${i}`} color={x.tone ? COLOR[x.tone] : undefined} backgroundColor={lit ? SCAN : undefined} bold={x.bold} dimColor={x.dim}>{x.t}</Text>
    )
    return (
      <Box flexDirection="column">
        {rows.map((row, r) => (
          <Box key={`r${r}`} flexDirection="row">
            {row.map((x, i) =>
              x.key === undefined ? text(x, i, r === scan) : (
                <Button key={`k${x.key + 1}`} hotkey={String(x.key + 1)} plain label={x.t.replace(/^\d+: /, '')} onPress={presses[x.key] ?? close} />
              ),
            )}
          </Box>
        ))}
      </Box>
    )
  })
}
