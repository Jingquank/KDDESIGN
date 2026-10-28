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
// Within a milestone the bar creeps by time, never past 80% of that leg; reaching the next
// milestone is what moves it on. Typical leg lengths of a run, in ms.
const LEG_MS = [40_000, 150_000, 40_000, 30_000, 30_000]
const SHINE = '#ff9a93'
const FRAME_MS = 150
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
    whyRun: (dir: string, isIgnored: boolean) =>
      `后台运行：截图用 Ego lite 自己的标签页，写 ${dir}/${isIgnored ? '（git 忽略了这个文件夹）' : ''}，不 commit`,
    whyLessons: (n: number, since: string) => [
      `${since} 之后来了 ${n} 个 Delta，够做一次 Design Lessons Review`,
      '后台运行：只发布 Review 页面；贴回 Verdicts 之前不改任何规则',
    ],
    keys: ['做', '为什么', '暂时不做'],
    keysOpen: ['做', '收起', '暂时不做'],
    pick: 'Design rules 写进哪个文件？每个项目只问这一次。',
    parked: (text: string) => `■ ${text}`,
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
    noSnapshot: '没能给工作区拍快照（git 出错）',
    noAnswer: '后台任务没有留下回答',
    starting: (tag: string) => `已请 Claude 在后台启动 ${tag}`,
    noAgent: 'Claude 没有启动后台任务；对话里有原因',
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
    whyRun: (dir: string, isIgnored: boolean) =>
      `In the background: stills in an Ego lite tab of its own, writes ${dir}/${isIgnored ? ' (which git ignores)' : ''}, never commits`,
    whyLessons: (n: number, since: string) => [
      `${n} Deltas arrived after ${since}, enough for a Design Lessons Review`,
      'In the background: it only publishes the Review page; no rule changes until you paste Verdicts',
    ],
    keys: ['Do it', 'Why', 'Not now'],
    keysOpen: ['Do it', 'Collapse', 'Not now'],
    pick: 'Which file holds the design rules? Asked once per project.',
    parked: (text: string) => `■ ${text}`,
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
    noSnapshot: 'Could not snapshot the working tree (git failed)',
    noAnswer: 'The background run left no answer',
    starting: (tag: string) => `Asked Claude to start ${tag} in the background`,
    noAgent: 'Claude did not start the background run; the conversation says why',
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
let parkedAs: string | undefined
// A design-delta or design-lessons run the user started by hand, until the turn it runs in ends.
let handRun: Skill | null = null
// The turn running now carries the Nudge's request to start a run.
let isAskInTurn = false
const judged = new Map<string, Judgement | null>()

type Judgement = { isVisible: boolean; isSettled: boolean; isUiOngoing: boolean; did: string; didShort: string; why: string; lang: Lang }

// isOn: the user has run design-delta by hand in this project (ADR 0012).
type Prefs = { isOn?: boolean; rulesFile?: string }

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
  const isIgnored = !isLocal && (await git($, root, ['check-ignore', '-q', `${dir}/0000-00-00-probe.md`])) !== null
  return { dir, isIgnored }
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

// The Baseline design-delta itself uses: this branch's newest Delta's After, else where the
// branch left the default branch, else (on the default branch) where this session started.
async function baseline($: $, p: Project): Promise<{ base: string; label: string } | null> {
  const { dir } = await deltasDir($, p.root)
  for (const name of (await deltaFiles($, p.root)).slice(0, 30)) {
    const text = await readText($, `${p.root}/${dir}/${name}`)
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

// Returns why it did not ask, for /nudge to say; null when the Nudge is up.
async function evaluate($: $, trigger: 'start' | 'idle' | 'working' | 'command'): Promise<string | null> {
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
    if (trigger === 'idle' && (await $.prompt.read()).text.trim()) {
      schedule($)
      return 'the prompt holds a draft'
    }

    const found = await baseline($, p)
    const work = found ? await unrecorded($, p.root, found.base) : null
    if (found && work) {
      const declined = (await $.store.get(declinedKey(p.root, p.branch, 'delta'))) as { fingerprint: string } | undefined
      if (isAsked || declined?.fingerprint !== work.fingerprint) {
        const key = `${work.fingerprint}:${(await $.session.messages()).length}`
        const verdict = judged.has(key) ? judged.get(key)! : await judge($, work.summary)
        judged.set(key, verdict)
        // Asked by hand, only the copy is needed from the judgement; otherwise every gate holds.
        const isDue = verdict !== null && (isAsked || (verdict.isVisible && verdict.isSettled && !verdict.isUiOngoing && !turnTouchedUi))
        if (verdict && isDue) {
          const c = COPY[verdict.lang]
          const deltas = await deltasDir($, p.root)
          await update($, view, (): View => ({
            kind: 'offer',
            skill: 'delta',
            lang: verdict.lang,
            did: verdict.did,
            didShort: verdict.didShort,
            why: [verdict.why, c.whyRange(found.label), c.whyRun(deltas.dir, deltas.isIgnored)].filter(Boolean),
            isExpanded: false,
            root: p.root,
            branch: p.branch,
            base: found.base,
            fingerprint: work.fingerprint,
            deltas: 0,
          }))
          return null
        }
        // Visible work that has not settled: the delta comes first, so lessons wait too.
        if (verdict?.isVisible) return 'design work has not Settled yet'
      }
    }

    const deltas = await deltaFiles($, p.root)
    const rules = await rulesState($, p.root)
    const since = deltas.filter(name => !rules.lastRun || name.slice(0, 10) > rules.lastRun)
    if (since.length === 0 || (!isAsked && since.length < LESSONS_DUE)) return work ? 'nothing to record yet' : 'no unrecorded UI changes, no Deltas due'
    const declined = (await $.store.get(declinedKey(p.root, '*', 'lessons'))) as { count: number } | undefined
    if (!isAsked && declined && declined.count >= since.length) return 'you said not now to these Deltas'
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
      root: p.root,
      branch: p.branch,
      base: '',
      fingerprint: String(since.length),
      deltas: since.length,
    }))
    return null
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
  await update($, view, () => null)
}

async function savePrefs($: $, root: string, change: Prefs) {
  const prefs = ((await $.store.get(prefsKey(root))) as Prefs | undefined) ?? {}
  await $.store.set(prefsKey(root), { ...prefs, ...change })
}

async function accept($: $, v: Extract<View, { kind: 'offer' | 'pick' }>, rulesFile?: string) {
  const prefs = ((await $.store.get(prefsKey(v.root))) as Prefs | undefined) ?? {}
  let rules = rulesFile ?? prefs.rulesFile
  if (!rules) {
    const state = await rulesState($, v.root)
    if (state.options.length > 1) {
      await update($, view, (): View => ({ kind: 'pick', skill: v.skill, lang: v.lang, root: v.root, branch: v.branch, base: v.base, fingerprint: v.fingerprint, options: state.options.slice(0, 3) }))
      return
    }
  }
  if (rulesFile) await savePrefs($, v.root, { rulesFile })

  const skillMd = `${$.plugin.root}/skills/design-${v.skill}/SKILL.md`
  const rulesArg = rules ? ` --rules ${rules}` : ''
  let args = `--background${rulesArg}`
  if (v.skill === 'delta') {
    const snapshot = await snapshotTree($, v.root)
    if (!snapshot) return fail($, v, COPY[v.lang].noSnapshot)
    args = `--range ${v.base}..${snapshot} ${args}`
  }
  // The run starts as a request in the conversation, in the user's name, and Claude starts the agent:
  // a spawn of the mod's own is one auto mode's classifier refuses, as it cannot see the keypress.
  const startedAt = await $.clock.now()
  const label = `${c(v).tag[v.skill]} (KDDESIGN Nudge ${startedAt.toString(36).slice(-4)})`
  const task =
    `The user pressed 1 on the KDDESIGN Nudge. Read ${skillMd} and carry out that skill in ${v.root} with these arguments: ${args}\n` +
    'You run in the background and nobody watches: ask nothing, follow the skill\'s --background rules, and end with its one line of JSON and nothing else. ' +
    'A message without a tool call ends the run, so put status notes in the same message as your next tool call; the JSON line is the only message that may stand alone.'
  const asked = await $.prompt.submit({
    asUser: true,
    text:
      `Run ${c(v).tag[v.skill]} in the background now (KDDESIGN Nudge). Start one background general-purpose agent with the Agent tool, ` +
      `description "${label}", and exactly this prompt:\n\n${task}\n\nThen carry on with what we were doing; do not wait for it.`,
  })
  if (asked.drop !== undefined) return fail($, v, asked.drop || COPY[v.lang].notStarted)
  // This work is being recorded now: the Nudge does not offer it again once the run is done.
  await markTaken($, v)
  await update($, view, (): View => ({ kind: 'starting', skill: v.skill, lang: v.lang, root: v.root, label, startedAt }))
}

const c = (v: { lang: Lang }) => COPY[v.lang]

// Claude has started the agent the Nudge asked for: from here the band follows it.
async function run($: $, v: Extract<View, { kind: 'starting' }>, agentId: string) {
  const startedAt = await $.clock.now()
  await update($, view, (): View => ({
    kind: 'running', skill: v.skill, lang: v.lang, root: v.root, agentId, turnId: null,
    startedAt, tools: 0, leg: 0, legAt: startedAt, stills: 0, action: '', actionAt: startedAt,
  }))
  ticker?.cancel()
  ticker = $.clock.every(FRAME_MS, () => $.ui.invalidate('ui.render'))
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
    note: typeof out.note === 'string' ? out.note : isOk ? null : answer.trim().slice(-300) || COPY[v.lang].noAnswer,
    isExpanded: false,
  }))
  if (isOk) await $.ui.notify(COPY[v.lang].notify(title), { title: 'KDDESIGN' })
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
  const isBrowser = /browser|chrome|ego|screenshot/i.test(tool) || /\b(ego|still\.py|snapshot\.js|screenshot)\b/i.test(cmd)
  const isPublish = tool === 'Artifact' && (call.action === undefined || call.action === 'publish')
  if (skill === 'delta') {
    if (/\bgit\s+(diff|log|show)\b/.test(cmd)) return { leg: 0, action }
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
function parkedText(v: View, now: number): string {
  const c = COPY[v.lang]
  const tag = c.tag[v.skill]
  if (v.kind === 'offer') return c.parked(`${tag} · ${v.didShort}`)
  if (v.kind === 'pick') return c.parked(`${tag} · ${c.askShort[v.skill]}`)
  if (v.kind === 'starting') return c.parked(c.starting(tag))
  if (v.kind === 'running') {
    const filled = Math.round(runProgress(v, now) * 10)
    return c.parked(`${tag} ${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${legLabel(v)}`)
  }
  return c.parked(`${tag} ${v.isOk ? '✓' : '✗'} ${v.title}`)
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
    return next(e)
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
      park($, undefined)
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

    const isDone = v.kind === 'done'
    const tag = c.tag[v.skill] + (isDone ? (v.isOk ? ' ✓' : ' ✗') : '')
    const ruleLen = Math.max(0, cols - cw(`█══╡ ${tag} ╞`))
    let line = <Text color={STONE}>{'═'.repeat(ruleLen)}</Text>
    if (v.kind === 'running') {
      const red = Math.max(3, Math.floor(runProgress(v, now) * ruleLen))
      const at = (Math.floor(now / FRAME_MS) * 2) % (red + 8) - 4
      const from = Math.max(0, Math.min(red, at - 1))
      const to = Math.max(0, Math.min(red, at + 2))
      line = (
        <Text>
          <Text color={RED}>{'█'.repeat(from)}</Text>
          <Text color={SHINE}>{'█'.repeat(to - from)}</Text>
          <Text color={RED}>{'█'.repeat(red - to)}</Text>
          <Text color={STONE}>{'░'.repeat(Math.max(0, ruleLen - red))}</Text>
        </Text>
      )
    } else if (isDone && v.isOk) line = <Text color={RED}>{'█'.repeat(ruleLen)}</Text>
    const rule = (
      <Text wrap="truncate-end">
        <Text color={RED}>█</Text>
        <Text color={STONE}>══╡ </Text>
        <Text color={RED} bold>{tag}</Text>
        <Text color={STONE}> ╞</Text>
        {line}
      </Text>
    )
    const w = cols - 1
    const row = (text: string, opts: { bold?: boolean; dim?: boolean } = {}) => (
      <Text wrap="truncate-end" bold={opts.bold} dimColor={opts.dim}>{` ${text}`}</Text>
    )
    const keys = (labels: readonly string[], presses: Array<() => void>) => (
      <Box flexDirection="row" columnGap={3} paddingLeft={1} flexWrap="wrap">
        {labels.map((label, i) => (
          <Button key={`k${i + 1}`} hotkey={String(i + 1)} plain label={label} onPress={presses[i]!} />
        ))}
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

    if (v.kind === 'starting') {
      return (
        <Box flexDirection="column">
          {rule}
          {row(c.starting(c.tag[v.skill]), { dim: true })}
        </Box>
      )
    }

    if (v.kind === 'running') {
      const typed = Array.from(v.action).slice(0, Math.floor((now - v.actionAt) / 35)).join('')
      const stop = async () => {
        if (v.turnId) await $.turn.abort({ turnId: v.turnId })
        ticker?.cancel()
        await update($, view, () => null)
      }
      return (
        <Box flexDirection="column">
          {rule}
          {row(fit(`${c.running[v.skill]} · ${legLabel(v)}`, `${c.runningShort[v.skill]} · ${legLabel(v)}`, w))}
          <Text wrap="truncate-end">
            <Text color={RED}>{' › '}</Text>
            <Text dimColor>{cut(typed, Math.max(8, w - 4))}</Text>
            <Text color={RED}>{typed.length < v.action.length ? '▌' : ''}</Text>
          </Text>
          <Box flexDirection="row" columnGap={3} paddingLeft={1}>
            <Text dimColor>{c.runningSub(clock(now - v.startedAt), v.tools)}</Text>
            <Button key="stop" plain dimColor label={`[ ${c.stop} ]`} onPress={() => void stop()} />
          </Box>
        </Box>
      )
    }

    const head = v.isOk ? fit(c.done(v.title, v.changes), c.doneShort(v.title), w) : v.title
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
