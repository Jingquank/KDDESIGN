#!/usr/bin/env node
// Page snapshots for passive Deltas (ADR 0042): a page of the running product, frozen as one
// MHTML file (markup, CSS, images and fonts, no scripts), kept under <git dir>/kddesign/ and
// never in the work tree. A snapshot is named by the commit the page was rendered from, so the
// After of one Delta is the Before of the next. Needs Node 22+ and any Chromium browser; it
// starts its own headless one with an empty profile and never touches the user's.
//
//   snap.mjs world --root <repo> --at <sha> [--only <file>] [--hint <url>] [--max-ms <n>] [--keep <sha,sha>]
//       Save every known route as it renders now, under <sha>. Refused unless no UI file differs
//       from <sha>, since then the dev server is not showing that commit. With --only, just the
//       routes that file is known or guessed to render on (the Nudge, before a first edit).
//   snap.mjs pair --root <repo> --base <sha> --after <sha> --folder <delta folder> --route "/path=file,file" ...
//       For each route a Change is on: make sure its After exists, remember which files render
//       there, and copy Before and After into kept/<delta folder>/. Prints where they are.
//   snap.mjs outline --from <page.mhtml> [--width 1440]
//       The page's parts, each with a selector, its first words and its box.
//   snap.mjs still --from <page.mhtml> --out <file.png> [--selector <css>] [--width 1440]
//       A picture of one part (or the page) at that width, rendered from the snapshot.
//   snap.mjs save --url <url> --out <dir> [--width 1440]
//       One page into <dir>/page.mhtml and page.png, wherever it is served.
//   snap.mjs adopt --root <repo> --at <sha> --route </path> --from <page.mhtml>
//       Take in a page saved elsewhere (a signed-in page, saved through the user's own browser
//       with the protocol call Page.captureSnapshot) as that route at that commit.
//   snap.mjs sweep --root <repo> [--keep <sha,sha>]
//
// Every command prints one line of JSON. Nothing here fails a caller: a page that cannot be
// reached is reported as skipped with the reason.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// The same two tests as hooks/register.tsx (UI_FILE, NOT_UI).
const UI_FILE = /\.(tsx|jsx|vue|svelte|astro|css|scss|sass|less|styl|html?|mdx|swift|kt|dart|svg)$/i
const NOT_UI = /(^|\/)(node_modules|dist|build|\.next|coverage|__tests__|docs\/deltas)\/|\.(test|spec|stories|generated)\.[a-z]+$/i
const SIGN_IN = /(^|[/._-])(log-?in|sign-?in|sso|auth|oauth|session\/new)([/._?-]|$)/i
const MAX_ROUTES = 16
const MAX_HEIGHT = 12_000
const KEEP_DAYS = 14
const CAP_BYTES = 300 * 1024 * 1024

const sleep = ms => new Promise(r => setTimeout(r, ms))
const out = value => console.log(JSON.stringify(value))

function args(argv) {
  const a = { route: [] }
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const value = argv[i + 1] === undefined || argv[i + 1].startsWith('--') ? 'true' : argv[++i]
    if (key === 'route') a.route.push(value)
    else a[key] = value
  }
  return a
}

// ---------- git and the store ----------

const git = (root, ...a) => {
  try {
    return execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

const store = root => {
  const dir = git(root, 'rev-parse', '--git-common-dir')
  return dir === null ? null : path.resolve(root, dir, 'kddesign')
}

const slug = route => (route.replace(/^\/+|\/+$/g, '').replace(/[^\w.-]+/g, '__') || '_').slice(0, 120)

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

// rooms.json: where the dev server answered last, the routes worth saving, and which files
// render on which route (learned from Deltas, so the Nudge knows where to look before an edit).
const rooms = dir => ({ server: null, routes: [], files: {}, ...readJson(path.join(dir, 'rooms.json'), {}) })
const saveRooms = (dir, r) => {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'rooms.json'), JSON.stringify(r, null, 1))
}

// The UI files that differ from the commit, untracked ones included; null when it is no commit.
function dirtyAt(root, sha) {
  if (git(root, 'rev-parse', '--verify', '--quiet', `${sha}^{commit}`) === null) return null
  const changed = (git(root, 'diff', '--name-only', sha) ?? '').split('\n')
  const fresh = (git(root, 'ls-files', '--others', '--exclude-standard') ?? '').split('\n')
  return [...new Set([...changed, ...fresh])].filter(f => f && UI_FILE.test(f) && !NOT_UI.test(f)).sort()
}

// No UI file differs from the commit, so the dev server shows that commit's pages.
const isAt = (root, sha) => dirtyAt(root, sha)?.length === 0

// A route file names its own route in the common routers; a component does not.
function routeOf(file) {
  const f = file.replace(/\\/g, '/')
  let m
  if ((m = f.match(/(?:^|\/)app\/(.*?)\/?page\.(?:tsx|jsx|mdx)$/))) return clean(m[1].replace(/\([^)]*\)\/?/g, ''))
  if ((m = f.match(/(?:^|\/)src\/routes\/(.*?)\/?\+page\.svelte$/))) return clean(m[1].replace(/\([^)]*\)\/?/g, ''))
  if ((m = f.match(/(?:^|\/)pages\/(.+)\.(?:tsx|jsx|mdx|astro|html|vue)$/)) && !/^(_|api\/)/.test(m[1])) return clean(m[1].replace(/(^|\/)index$/, ''))
  if ((m = f.match(/^(?:public\/)?([^/]+)\.html$/))) return m[1] === 'index' ? '/' : `/${m[1]}.html`
  return null
}
const clean = p => (/[[\]*]/.test(p) ? null : `/${p.replace(/^\/+|\/+$/g, '')}`)

// Local servers started from inside the repo, newest guess first.
async function servers(root, r, hint) {
  const found = []
  if (hint) try { found.push(new URL(hint).origin) } catch {}
  if (process.env.KDDESIGN_DEV_URL) found.push(process.env.KDDESIGN_DEV_URL.replace(/\/+$/, ''))
  if (r.server) found.push(r.server)
  try {
    const real = fs.realpathSync(root)
    const listening = execFileSync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fpn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    let pid = null
    for (const line of listening.split('\n')) {
      if (line[0] === 'p') pid = line.slice(1)
      const port = line[0] === 'n' ? line.match(/:(\d+)$/)?.[1] : null
      if (!pid || !port) continue
      let cwd = ''
      try {
        cwd = execFileSync('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').find(l => l[0] === 'n')?.slice(1) ?? ''
      } catch {}
      if (cwd === real || cwd.startsWith(`${real}/`)) found.push(`http://localhost:${port}`)
    }
  } catch {}
  const alive = []
  for (const origin of [...new Set(found)]) {
    try {
      const res = await fetch(origin, { signal: AbortSignal.timeout(1500), redirect: 'manual' })
      if (res.status < 500) alive.push(origin)
    } catch {}
  }
  return alive
}

// ---------- the browser ----------

function browserPath() {
  const named = process.env.KDDESIGN_BROWSER
  if (named && fs.existsSync(named)) return named
  const mac = ['Google Chrome', 'Chromium', 'Google Chrome Canary', 'Microsoft Edge', 'Brave Browser']
    .map(n => `/Applications/${n}.app/Contents/MacOS/${n}`)
  const win = ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']
    .flatMap(p => [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).map(base => path.join(base, p)))
  for (const p of [...mac, ...win]) if (fs.existsSync(p)) return p
  for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      return execFileSync('which', [n], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    } catch {}
  }
  return null
}

async function browser() {
  const bin = browserPath()
  if (!bin) throw new Error('no Chromium browser found (set KDDESIGN_BROWSER to one)')
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kddesign-snap-'))
  const child = spawn(bin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const ws = await new Promise((resolve, reject) => {
    let text = ''
    const timer = setTimeout(() => reject(new Error('the browser did not start')), 15_000)
    child.stderr.on('data', chunk => {
      text += chunk
      const m = text.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) { clearTimeout(timer); resolve(m[1]) }
    })
    child.on('exit', () => { clearTimeout(timer); reject(new Error('the browser exited')) })
  })
  const socket = new WebSocket(ws)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('no connection to the browser')) })
  let id = 0
  const waiting = new Map()
  const listeners = new Set()
  socket.onmessage = event => {
    const msg = JSON.parse(event.data)
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id)
      waiting.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else for (const fn of listeners) fn(msg)
  }
  // Every call has a deadline: a page that never answers must not hold up an edit.
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const mine = ++id
    const timer = setTimeout(() => { waiting.delete(mine); reject(new Error(`${method} got no answer`)) }, 30_000)
    waiting.set(mine, { resolve: v => { clearTimeout(timer); resolve(v) }, reject: e => { clearTimeout(timer); reject(e) } })
    socket.send(JSON.stringify({ id: mine, method, params, sessionId }))
  })
  return {
    async tab(width) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
      const cdp = (method, params) => send(method, params, sessionId)
      const state = { inflight: new Set(), quietAt: Date.now(), status: null, isLoaded: false }
      const listen = msg => {
        if (msg.sessionId !== sessionId) return
        const p = msg.params ?? {}
        if (msg.method === 'Network.requestWillBeSent') state.inflight.add(p.requestId)
        if (msg.method === 'Network.loadingFinished' || msg.method === 'Network.loadingFailed') { state.inflight.delete(p.requestId); state.quietAt = Date.now() }
        if (msg.method === 'Network.responseReceived' && p.type === 'Document' && state.status === null) state.status = p.response.status
        if (msg.method === 'Page.loadEventFired') state.isLoaded = true
      }
      listeners.add(listen)
      await cdp('Page.enable')
      await cdp('Network.enable')
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
      const evaluate = async (fn, arg) => {
        const r = await cdp('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg ?? null)})`, awaitPromise: true, returnByValue: true })
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
        return r.result.value
      }
      return {
        cdp, evaluate, state,
        // Load, then wait until the page has stopped asking for things, every lazy image has
        // been scrolled past and the fonts are in.
        // A snapshot runs no scripts and no timers, so it is only waited for, never scrolled.
        async open(url, timeout = 20_000, isSnapshot = false) {
          Object.assign(state, { status: null, isLoaded: false, quietAt: Date.now() })
          state.inflight.clear()
          const nav = await cdp('Page.navigate', { url })
          if (nav.errorText) throw new Error(nav.errorText)
          const until = Date.now() + timeout
          const rest = async () => {
            while (Date.now() < until && !(state.isLoaded && state.inflight.size === 0 && Date.now() - state.quietAt > 400)) await sleep(60)
          }
          await rest()
          if (isSnapshot) return
          await evaluate(async () => {
            const step = innerHeight * 0.8
            for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 30000); y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)) }
            scrollTo(0, 0)
            document.querySelectorAll('img[loading=lazy]').forEach(i => i.removeAttribute('loading'))
            await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))])
          })
          state.quietAt = Date.now()
          await rest()
        },
        async shot(file, clip) {
          const size = await evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))
          const box = clip ?? { x: 0, y: 0, width: Math.max(width, 1), height: Math.min(size.h, MAX_HEIGHT) }
          const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...box, scale: 1 } })
          fs.mkdirSync(path.dirname(file), { recursive: true })
          fs.writeFileSync(file, Buffer.from(data, 'base64'))
        },
        async close() {
          listeners.delete(listen)
          await send('Target.closeTarget', { targetId }).catch(() => {})
        },
      }
    },
    async close() {
      try { await send('Browser.close') } catch {}
      socket.close()
      child.kill()
      await sleep(150)
      fs.rmSync(profile, { recursive: true, force: true })
    },
  }
}

// One page into <base>.mhtml, .png and .json. Returns why it was not saved, or null.
async function savePage(b, url, base, dirty = []) {
  const width = 1440
  const tab = await b.tab(width)
  try {
    await tab.open(url)
    const at = await tab.evaluate(() => ({ url: location.href, title: document.title, links: [...document.querySelectorAll('a[href]')].map(a => a.href) }))
    if ((tab.state.status ?? 200) >= 400) return { why: `HTTP ${tab.state.status}` }
    const [asked, got] = [new URL(url), new URL(at.url)]
    if (got.origin !== asked.origin || (got.pathname !== asked.pathname && SIGN_IN.test(got.pathname))) return { why: `redirected to ${got.origin}${got.pathname}, a sign-in this empty browser cannot pass` }
    const { data } = await tab.cdp('Page.captureSnapshot', { format: 'mhtml' })
    fs.mkdirSync(path.dirname(base), { recursive: true })
    fs.writeFileSync(`${base}.mhtml`, data)
    await tab.shot(`${base}.png`)
    fs.writeFileSync(`${base}.json`, JSON.stringify({ url: at.url, title: at.title, width, at: new Date().toISOString(), links: at.links, ...(dirty.length ? { dirty } : {}) }))
    return { why: null, links: at.links }
  } catch (e) {
    return { why: String(e.message ?? e) }
  } finally {
    await tab.close()
  }
}

// ---------- commands ----------

async function world(a) {
  const dir = store(a.root)
  if (!dir) return { saved: [], skipped: 'not a git repo' }
  const sha = git(a.root, 'rev-parse', '--verify', '--quiet', `${a.at}^{commit}`)
  if (!sha) return { saved: [], skipped: `no commit ${a.at}` }
  const r = rooms(dir)
  const set = path.join(dir, 'world', sha)
  // Other files may already be edited, here or in another session on this branch. The page of a
  // file that is itself untouched is still worth saving before its first edit: it is kept with
  // the list of what had changed, and `pair` gives it only to a Change none of those files are in.
  const dirty = dirtyAt(a.root, sha) ?? []
  const isClean = dirty.length === 0
  if (!isClean && (!a.only || dirty.includes(a.only))) return { saved: [], skipped: 'UI files differ from that commit, so the pages no longer show it' }
  // A page saved from a clean tree replaces one saved beside other edits.
  const has = route => fs.existsSync(path.join(set, `${slug(route)}.mhtml`)) && !(isClean && readJson(path.join(set, `${slug(route)}.json`), {}).dirty?.length)
  let hinted = null
  try { hinted = a.hint ? new URL(a.hint).pathname : null } catch {}
  // Before a first edit: the routes this file renders on, else its own route, else the page
  // Claude was last looking at. Otherwise everything known, and whatever the home page links to.
  const wanted = a.only
    ? (r.files[a.only]?.length ? r.files[a.only] : [routeOf(a.only) ?? hinted].filter(Boolean)).slice(0, 3)
    : [...new Set(['/', ...r.routes, ...Object.values(r.files).flat()])]
  const missing = wanted.filter(route => !has(route))
  if (a.only && missing.length === 0) return { saved: [], skipped: wanted.length ? 'already saved' : 'no route is known for this file' }
  const origin = (await servers(a.root, r, a.hint))[0]
  if (!origin) return { saved: [], skipped: 'no dev server is running from this repo' }
  const until = Date.now() + Number(a['max-ms'] ?? 120_000)
  const saved = []
  const skipped = []
  let b
  try {
    const queue = [...missing]
    const seen = new Set(wanted)
    // What the home page links to is worth saving too, up to a cap.
    const follow = links => {
      for (const href of links ?? []) {
        let u
        try { u = new URL(href) } catch { continue }
        const next = u.pathname.replace(/\/+$/, '') || '/'
        if (u.origin !== origin || seen.has(next) || /\.(?!html?$)[a-z0-9]{2,5}$/i.test(next) || seen.size >= MAX_ROUTES) continue
        seen.add(next)
        if (!has(next)) queue.push(next)
      }
    }
    if (!a.only && has('/')) follow(readJson(path.join(set, `${slug('/')}.json`), {}).links)
    if (queue.length === 0) return { saved: [], skipped: 'already saved' }
    b = await browser()
    const work = async () => {
      for (let route; (route = queue.shift()) !== undefined;) {
        if (Date.now() > until) { skipped.push({ route, why: 'out of time' }); continue }
        const res = await savePage(b, origin + route, path.join(set, slug(route)), dirty)
        if (res.why) { skipped.push({ route, why: res.why }); continue }
        saved.push(route)
        if (!a.only && route === '/') follow(res.links)
      }
    }
    // The home page first, since its links name the rest; then three at a time.
    if (queue[0] === '/') { const rest = queue.splice(1); await work(); queue.push(...rest) }
    await Promise.all([work(), work(), work()])
  } catch (e) {
    return { saved, skipped: String(e.message ?? e) }
  } finally {
    await b?.close()
  }
  // An edit that landed while the pages were being saved makes them a picture of nothing.
  if ((dirtyAt(a.root, sha) ?? ['?']).join('\n') !== dirty.join('\n')) {
    for (const route of saved) for (const ext of ['mhtml', 'png', 'json']) fs.rmSync(path.join(set, `${slug(route)}.${ext}`), { force: true })
    return { saved: [], skipped: 'UI files changed while the pages were being saved' }
  }
  if (saved.length) {
    fs.writeFileSync(path.join(set, 'at.json'), JSON.stringify({ sha, branch: git(a.root, 'rev-parse', '--abbrev-ref', 'HEAD'), at: new Date().toISOString() }))
    saveRooms(dir, { ...r, server: origin, routes: [...new Set([...r.routes, ...saved])].slice(0, MAX_ROUTES * 2) })
  }
  sweep({ root: a.root, keep: [a.keep, sha].filter(Boolean).join(',') })
  return { saved, skipped: skipped.length ? skipped : null, set, ...(dirty.length ? { dirty } : {}) }
}

async function pair(a) {
  const dir = store(a.root)
  if (!dir) return { routes: [], note: 'not a git repo' }
  const [base, after] = [a.base, a.after].map(s => git(a.root, 'rev-parse', '--verify', '--quiet', `${s}^{commit}`))
  if (!base || !after) return { routes: [], note: 'unknown commit' }
  const r = rooms(dir)
  const named = a.route.map(spec => {
    const [route, files] = spec.split('=')
    return { route: route.replace(/\/+$/, '') || '/', files: (files ?? '').split(',').filter(Boolean) }
  })
  const file = (sha, route, ext) => path.join(dir, 'world', sha, `${slug(route)}.${ext}`)
  // An After must show its commit and nothing more: a page saved beside other edits does not count.
  const isWhole = (sha, route) => fs.existsSync(file(sha, route, 'mhtml')) && !readJson(file(sha, route, 'json'), {}).dirty?.length
  const lacking = named.filter(n => !isWhole(after, n.route))
  let note = null
  if (lacking.length) {
    const origin = isAt(a.root, after) ? (await servers(a.root, r))[0] : null
    if (!origin) note = isAt(a.root, after) ? 'no dev server is running from this repo, so no After could be saved' : 'the work tree has moved past the After, so no After could be saved'
    else {
      const b = await browser().catch(e => { note = String(e.message ?? e); return null })
      if (b) {
        try {
          for (const n of lacking) {
            const res = await savePage(b, origin + n.route, file(after, n.route, 'mhtml').replace(/\.mhtml$/, ''))
            if (res.why) n.why = res.why
          }
        } finally {
          await b.close()
        }
        if (!isAt(a.root, after)) for (const n of lacking) { for (const ext of ['mhtml', 'png', 'json']) fs.rmSync(file(after, n.route, ext), { force: true }); n.why = 'UI files changed while the page was being saved' }
      }
    }
  }
  const routes = named.map(n => {
    const sides = {}
    for (const [side, sha] of [['before', base], ['after', after]]) {
      sides[side] = null
      if (!fs.existsSync(file(sha, n.route, 'mhtml')) || (side === 'after' && !isWhole(sha, n.route))) continue
      // A Before saved while other files were already edited shows this Change only if none of
      // them is one of its own files.
      const edited = side === 'before' ? (readJson(file(sha, n.route, 'json'), {}).dirty ?? []) : []
      const own = edited.filter(f => n.files.includes(f))
      if (own.length) { n.why = `the Before was saved after ${own.join(', ')} had already been edited`; continue }
      if (edited.length) n.beside = edited
      const to = path.join(dir, 'kept', a.folder, slug(n.route))
      fs.mkdirSync(to, { recursive: true })
      for (const ext of ['mhtml', 'png']) if (fs.existsSync(file(sha, n.route, ext))) fs.copyFileSync(file(sha, n.route, ext), path.join(to, `${side}.${ext}`))
      sides[side] = path.join(to, `${side}.mhtml`)
    }
    return { route: n.route, ...sides, why: n.why ?? null, ...(n.beside ? { beforeSavedBeside: n.beside } : {}) }
  })
  // Only a route that was seen is remembered, with the files that render on it.
  for (const n of named) {
    if (!routes.find(x => x.route === n.route)?.after) continue
    if (!r.routes.includes(n.route)) r.routes.push(n.route)
    for (const f of n.files) r.files[f] = [...new Set([...(r.files[f] ?? []), n.route])]
  }
  saveRooms(dir, r)
  sweep({ root: a.root, keep: `${base},${after}` })
  return { routes, note }
}

// A world set is worth its space while a branch may still be compared against its commit: the
// ones named in --keep (the Baseline and the pushed tip) stay, the rest go after two weeks
// untouched, and the oldest go first when the store passes its cap.
function sweep(a) {
  const dir = store(a.root)
  if (!dir) return { removed: 0 }
  const keep = String(a.keep ?? '').split(',').filter(Boolean)
  const size = p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).reduce((n, f) => n + size(path.join(p, f)), 0) : fs.statSync(p).size
  const sets = []
  for (const kind of ['world', 'kept']) {
    const at = path.join(dir, kind)
    if (!fs.existsSync(at)) continue
    for (const name of fs.readdirSync(at)) {
      const p = path.join(at, name)
      sets.push({ p, kind, isKept: kind === 'world' && keep.some(k => name.startsWith(k) || k.startsWith(name)), mtime: fs.statSync(p).mtimeMs, bytes: size(p) })
    }
  }
  let removed = 0
  const drop = s => { fs.rmSync(s.p, { recursive: true, force: true }); s.bytes = 0; removed++ }
  const old = Date.now() - KEEP_DAYS * 864e5
  for (const s of sets) if (s.kind === 'world' && !s.isKept && s.mtime < old) drop(s)
  const byAge = sets.filter(s => s.bytes && !s.isKept).sort((x, y) => (x.kind === y.kind ? x.mtime - y.mtime : x.kind === 'world' ? -1 : 1))
  let total = sets.reduce((n, s) => n + s.bytes, 0)
  for (const s of byAge) {
    if (total <= CAP_BYTES) break
    total -= s.bytes
    drop(s)
  }
  return { removed }
}

const fileUrl = p => `file://${path.resolve(p).split(path.sep).map(encodeURIComponent).join('/')}`

// The parts of a page a person would name: landmarks, sections and anything with an id, down a
// few levels, each with a selector that finds it again in this snapshot and in its pair.
const OUTLINE = () => {
  const sel = el => {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`
    const parts = []
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.id && document.querySelectorAll(`#${CSS.escape(n.id)}`).length === 1) { parts.unshift(`#${CSS.escape(n.id)}`); break }
      const same = [...n.parentElement.children].filter(c => c.tagName === n.tagName)
      parts.unshift(n.tagName.toLowerCase() + (same.length > 1 ? `:nth-of-type(${same.indexOf(n) + 1})` : ''))
    }
    return (parts[0]?.startsWith('#') ? '' : 'body > ') + parts.join(' > ')
  }
  const rows = []
  const walk = (el, depth) => {
    for (const child of el.children) {
      const box = child.getBoundingClientRect()
      if (box.width < 40 || box.height < 24 || ['SCRIPT', 'STYLE', 'TEMPLATE'].includes(child.tagName)) continue
      const isPart = /^(HEADER|NAV|MAIN|SECTION|ARTICLE|ASIDE|FOOTER|FORM|DIALOG|TABLE|UL|OL)$/.test(child.tagName) || child.id || child.getAttribute('role')
      if (isPart && rows.length < 120) rows.push({ selector: sel(child), text: child.innerText.replace(/\s+/g, ' ').trim().slice(0, 70), x: Math.round(box.x), y: Math.round(box.y + scrollY), w: Math.round(box.width), h: Math.round(box.height) })
      if (depth < 6) walk(child, depth + 1)
    }
  }
  walk(document.body, 0)
  return rows
}

async function fromSnapshot(a, fn) {
  if (!a.from || !fs.existsSync(a.from)) return { error: `no snapshot at ${a.from}` }
  const width = Number(a.width ?? 1440)
  const b = await browser()
  try {
    const tab = await b.tab(width)
    await tab.open(fileUrl(a.from), 15_000, true)
    return await fn(tab, width)
  } catch (e) {
    return { error: String(e.message ?? e) }
  } finally {
    await b.close()
  }
}

async function adopt(a) {
  const dir = store(a.root)
  const sha = dir && git(a.root, 'rev-parse', '--verify', '--quiet', `${a.at}^{commit}`)
  const route = a.route[0]
  if (!sha || !route || !a.from || !fs.existsSync(a.from)) return { saved: null, skipped: 'needs --at <commit>, --route and --from <page.mhtml>' }
  if (!isAt(a.root, sha)) return { saved: null, skipped: 'UI files differ from that commit, so the page does not show it' }
  const to = path.join(dir, 'world', sha, `${slug(route)}.mhtml`)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(a.from, to)
  return { saved: to }
}

const COMMANDS = {
  world,
  pair,
  adopt,
  sweep: async a => sweep(a),
  outline: a => fromSnapshot(a, async tab => ({ parts: await tab.evaluate(OUTLINE) })),
  still: a => fromSnapshot(a, async (tab, width) => {
    let clip
    if (a.selector) {
      const box = await tab.evaluate(s => {
        const el = document.querySelector(s)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: Math.max(0, r.x + scrollX), y: Math.max(0, r.y + scrollY), width: r.width, height: r.height }
      }, a.selector)
      if (!box || box.width < 1 || box.height < 1) return { error: `nothing matches ${a.selector} at ${width}px` }
      clip = { ...box, height: Math.min(box.height, MAX_HEIGHT) }
    }
    await tab.shot(a.out, clip)
    return { out: a.out, width: Math.round(clip?.width ?? width), height: Math.round(clip?.height ?? 0) || null }
  }),
  save: async a => {
    const b = await browser()
    try {
      const res = await savePage(b, a.url, path.join(a.out, 'page'), Number(a.width ?? 1440))
      return res.why ? { saved: null, skipped: res.why } : { saved: path.join(a.out, 'page.mhtml') }
    } finally {
      await b.close()
    }
  },
}

const [command, ...rest] = process.argv.slice(2)
if (!COMMANDS[command]) {
  console.error('usage: snap.mjs world|pair|adopt|outline|still|save|sweep (see the head of this file)')
  process.exit(2)
}
COMMANDS[command](args(rest)).then(out, e => out({ error: String(e.message ?? e) })).finally(() => process.exit(0))
