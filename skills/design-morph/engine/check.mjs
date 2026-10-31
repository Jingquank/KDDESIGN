// Check a design-morph film by stepping through every act with the engine's own state, in Node.
//
//   node check.mjs <film-folder> [--act <key>] [--samples 200]
//
// Prints one line per finding and a total; exits 1 while any finding is open. Kinds:
//   overlap   two visible elements in one layer intersect at some instant, though they are apart
//             at both the start and the end (so neither is the other's container)
//   outside   an element crosses the edge of a box that holds it at the start or the end (its card,
//             its pane), or of its clipped layer, while both are visible
//   leftover  visible at the act's end with a new state that gives only x, y, w, h: it was meant to
//             leave (op: 0) or to be described
//   time      a window, an `at`, a waypoint or a chapter that steps backwards or leaves 0..1; a group
//             with no window; or the player clock failing at negative or out-of-range time
//   snap      at 60 fps, an element moves, resizes or changes opacity in one frame by far more than
//             in the frames either side: a jump the eye reads as a glitch (a waypoint hand-off, a
//             window edge, a content swap that pops)
//   drift     two elements that sit the same way relative to each other at the start and the end
//             (a card and its label, or a group given one `at`) pull apart in between, because
//             they run on different windows or curves
// An element may list partners in `ok: [ids]` (an intended overlap, its reason in a comment
// next to it in the generator) and set `clipOk: true` when its pane is meant to crop it.
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadFilm } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIS = 0.15;     // opacity from which an element counts as seen
const TOL = 2;        // px of slack before a crossing or an overlap counts
const FPS = 60;       // the frame rate of the snap and drift pass, the MP4's rate
const SNAP_PX = 2;    // a one-frame change above this, and SNAP_X times its neighbors' change, is a snap
const SNAP_X = 3;
const SNAP_OP = 0.25; // a one-frame opacity change above this is a snap (a pop)
const DRIFT_PX = 3;   // two elements pulling apart by more than this in flight drift

export function check(folder, { act: only, samples = 200, patch } = {}) {
  const ctx = vm.createContext({ console });
  vm.runInContext(readFileSync(join(HERE, 'engine.js'), 'utf8'), ctx, { filename: 'engine.js' });
  if (patch) vm.runInContext(patch, ctx, { filename: 'patch.js' });   // evals only: swap in a known-bad piece
  const { scene, acts: raw } = loadFilm(resolve(folder));
  ctx.configure(scene);
  const timing = scene.timing || {};
  const clock = ctx.filmClock(raw.length, timing.card ?? 0.8, timing.act ?? 20 / 1.5);
  const findings = [];
  const add = (f) => findings.push(f);

  // the player clock: a stale timestamp or an out-of-range seek must never pick an act that is not there
  const probes = [clock.where(-5).i, clock.where(clock.FILM + 5).i, clock.where(NaN).i];
  const stepped = [clock.step(5, -0.5, 1), clock.step(clock.FILM - 0.01, 5, 2), clock.step(-3, 0.016, 1)];
  if (probes.some((i) => !(i >= 0 && i < raw.length)) || stepped[0] < 5 || stepped[1] > clock.FILM || stepped[2] < 0)
    add({ act: '*', kind: 'time', text: `player clock leaves the film: where() gave acts ${probes.join(', ')}, step() gave ${stepped.map((s) => s.toFixed(2)).join(', ')}` });

  raw.forEach((data, ai) => {
    if (only && data.key !== only) return;
    const A = data.key;
    timeChecks(data, (text) => add({ act: A, kind: 'time', text }));
    let act;
    try { act = ctx.prepareAct(data); } catch (err) { add({ act: A, kind: 'time', text: `the engine cannot prepare this act: ${err.message}` }); return; }
    for (const note of act.notes || []) add({ act: A, kind: 'time', text: note });
    const toSec = (t) => clock.actStart(ai) + clock.card + t * clock.act;
    const layerOf = Object.fromEntries(act.layers.map((l) => [l.id, l]));
    const layer = (e) => layerOf[e.ly] || layerOf.main || act.layers[0];
    const panes = new Set(act.layers.map((l) => l.clip).filter(Boolean));

    // where each element is, as the eye reads it: scaled about its center, risen, and for bare text
    // only as wide as its letters
    const ink = (e, n) => {
      let x = n.x + (n.w * (1 - n.sc)) / 2, y = n.y + n.ty + (n.h * (1 - n.sc)) / 2, w = n.w * n.sc, h = n.h * n.sc;
      if (isBareText(e)) {
        const len = Math.max(textLen(e.to), textLen(e.tn ?? e.to));
        const tw = Math.min(w, len * n.fs * 0.56 + (n.pl || 0)), th = Math.min(h, n.fs * 1.3);
        const cls = ' ' + (e.cls || '') + ' ';
        x = cls.includes(' center ') ? x + (w - tw) / 2 : cls.includes(' right ') ? x + w - tw : x;
        y += (h - th) / 2; w = tw; h = th;
      }
      return { x, y, w, h };
    };
    const snap = (t) => { ctx.frameAct(act, t); return act.els.map((e) => ({ e, op: e.now.op, b: ink(e, e.now), clip: layer(e).now && { ...layer(e).now } })); };
    const s0 = snap(0), s1 = snap(1);

    // relations, from the two ends: who holds whom, and who already touches whom
    const n = act.els.length, holds = new Set(), touch = new Set(), key = (i, j) => i * n + j;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j || layer(act.els[i]) !== layer(act.els[j])) continue;
      for (const s of [s0, s1]) {
        if (contains(s[i].b, s[j].b)) holds.add(key(i, j));
        if (overlap(s[i].b, s[j].b)) touch.add(key(i, j));
      }
    }
    const inClipAtEnds = (i) => [s0, s1].every((s) => !s[i].clip || contains(s[i].clip, s[i].b));
    const okPair = (a, b) => (a.ok || []).includes(b.id) || (b.ok || []).includes(a.id);

    const open = new Map();   // finding key → { first, last, max }
    const note = (k, base, t, px) => {
      const f = open.get(k);
      if (f) { f.last = t; f.max = Math.max(f.max, px); } else open.set(k, { ...base, first: t, last: t, max: px });
    };
    for (let s = 0; s <= samples; s++) {
      const t = s / samples, st = snap(t);
      const seen = st.map((x) => x.op > VIS && !(x.clip && !overlap(x.clip, x.b)));
      for (let i = 0; i < n; i++) {
        if (!seen[i]) continue;
        const a = st[i];
        // a clipped layer cuts what crosses its pane's edge
        if (a.clip && !a.e.clipOk && !panes.has(a.e.id) && inClipAtEnds(i) && !contains(a.clip, a.b, TOL))
          note(`clip ${a.e.id}`, { act: A, kind: 'outside', text: `${a.e.id} crosses the edge of its layer "${layer(a.e).id}" (pane ${layer(a.e).clip})` }, t, spill(a.clip, a.b));
        for (let j = i + 1; j < n; j++) {
          if (!seen[j] || layer(a.e) !== layer(st[j].e) || okPair(a.e, st[j].e)) continue;
          const b = st[j];
          const hold = holds.has(key(i, j)) ? [i, j] : holds.has(key(j, i)) ? [j, i] : null;
          if (hold) {
            const [bi, ii] = hold, box = st[bi], item = st[ii];
            const when = contains(s1[bi].b, s1[ii].b) ? 'end' : 'start';
            if (overlap(box.b, item.b) && !contains(box.b, item.b, TOL) && !panes.has(item.e.id))
              note(`out ${item.e.id} ${box.e.id}`, { act: A, kind: 'outside', text: `${item.e.id} crosses the edge of ${box.e.id}, which holds it at the ${when}` }, t, spill(box.b, item.b));
            continue;
          }
          if (touch.has(key(i, j)) || touch.has(key(j, i))) continue;
          const px = overlapPx(a.b, b.b);
          if (px) note(`ov ${a.e.id} ${b.e.id}`, { act: A, kind: 'overlap', text: `${a.e.id} × ${b.e.id}` }, t, px);
        }
      }
    }
    for (const f of open.values()) add({ ...f, text: `${f.text}  t ${f.first.toFixed(3)}–${f.last.toFixed(3)} (${toSec(f.first).toFixed(1)}–${toSec(f.last).toFixed(1)} s)  max ${Math.round(f.max)} px` });

    // snap and drift: every frame at 60 fps, as the MP4 shows it
    frameChecks(A, act, snap, layer, holds, key, n, Math.max(2, Math.round(clock.act * FPS)), toSec, add);

    // leftovers: still seen at the end, though the data never said what it becomes
    s1.forEach((x) => {
      if (x.op <= 0.01 || (x.clip && !overlap(x.clip, x.b)) || x.e.keep || x.e.role !== 'move') return;
      const given = Object.keys(x.e.nIn || {});
      if (given.every((k) => ['x', 'y', 'w', 'h'].includes(k)))
        add({ act: A, kind: 'leftover', text: `${x.e.id} is still visible at the end; its new state gives only ${given.join(', ') || 'nothing'}. Give it op: 0 to leave, or describe the new look` });
    });
  });
  return { title: scene.title, acts: raw.length, samples, findings };
}

function frameChecks(A, act, snap, layer, holds, key, n, frames, toSec, add) {
  const box = (x) => [x.b.x, x.b.y, x.b.w, x.b.h];
  const st = [];
  for (let f = 0; f <= frames; f++) st.push(snap(f / frames));
  const at = (f) => (f / frames);
  const where = (f) => `t ${at(f).toFixed(3)} (${toSec(at(f)).toFixed(2)} s)`;

  // snap: per element, the change from one frame to the next
  for (let i = 0; i < n; i++) {
    const e = act.els[i];
    if (e.snapOk) continue;
    const move = [0], fade = [0];
    for (let f = 1; f <= frames; f++) {
      const a = st[f - 1][i], b = st[f][i];
      const seen = Math.max(a.op, b.op) > VIS;
      const [ax, ay, aw, ah] = box(a), [bx, by, bw, bh] = box(b);
      move.push(seen ? Math.max(Math.abs(bx - ax), Math.abs(by - ay), Math.abs(bx + bw - ax - aw), Math.abs(by + bh - ay - ah)) : 0);
      fade.push(Math.abs(b.op - a.op));
    }
    let worst = null;
    for (let f = 1; f <= frames; f++) {
      const side = Math.max(move[f - 1] ?? 0, move[f + 1] ?? 0);
      if (move[f] > SNAP_PX && move[f] > SNAP_X * side && (!worst || move[f] > worst.px)) worst = { f, px: move[f], what: 'jumps' };
      if (fade[f] > SNAP_OP && (!worst || worst.what !== 'jumps')) worst = { f, px: fade[f], what: 'pops' };
    }
    if (worst) add({ act: A, kind: 'snap', text: worst.what === 'jumps'
      ? `${e.id} jumps ${worst.px.toFixed(1)} px in one frame at ${where(worst.f)}, against ${Math.max(move[worst.f - 1] ?? 0, move[worst.f + 1] ?? 0).toFixed(1)} px in the frames beside it`
      : `${e.id} pops: opacity changes by ${worst.px.toFixed(2)} in one frame at ${where(worst.f)}` });
  }

  // drift: pairs that hold the same offset at both ends but pull apart in flight. A container and
  // what it holds at both ends, or two elements given the same group and `at`, are meant to travel as one.
  const sameAt = (a, b) => a.g && a.g === b.g && a.at && b.at && a.at[0] === b.at[0] && a.at[1] === b.at[1];
  const okPair = (a, b) => (a.ok || []).includes(b.id) || (b.ok || []).includes(a.id) || a.driftOk || b.driftOk;
  const off = (s, i, j) => [s[j].b.x - s[i].b.x, s[j].b.y - s[i].b.y];
  const s0 = st[0], s1 = st[frames];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j) continue;
    const a = act.els[i], b = act.els[j];
    if (layer(a) !== layer(b) || okPair(a, b) || a.role === 'exit' || b.role === 'exit' || a.role === 'enter' || b.role === 'enter') continue;
    const held = holds.has(key(i, j)) && holds.has(key(j, i)) === false
      && [s0, s1].every((s) => contains(s[i].b, s[j].b));
    if (!held && !(i < j && sameAt(a, b))) continue;
    // on the very same windows the two follow one curve: a shared waypoint or room scales their
    // offset, which is a layout move, not a drift
    const same = (k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null);
    if (same('wL') && same('wVia') && same('wVia2')) continue;
    const [x0, y0] = off(s0, i, j), [x1, y1] = off(s1, i, j);
    if (Math.abs(x0 - x1) > 1 || Math.abs(y0 - y1) > 1) continue;   // the offset itself changes: that is a layout move
    let worst = { px: 0, f: 0 };
    for (let f = 1; f < frames; f++) {
      if (st[f][i].op <= VIS || st[f][j].op <= VIS) continue;
      const [x, y] = off(st[f], i, j);
      const px = Math.max(Math.abs(x - x0), Math.abs(y - y0));
      if (px > worst.px) worst = { px, f };
    }
    if (worst.px > DRIFT_PX)
      add({ act: A, kind: 'drift', text: `${b.id} pulls ${worst.px.toFixed(1)} px away from ${a.id} at ${where(worst.f)}; they ${held ? `sit the same way in ${a.id}` : 'share one `at`'} at both ends. Give them one window (the same g and at)` });
  }
}

function timeChecks(a, bad) {
  const win = a.win || {};
  for (const [g, w] of Object.entries(win)) {
    if (!Array.isArray(w) || w.length !== 2 || !(w[0] >= 0 && w[1] <= 1)) bad(`window "${g}" ${JSON.stringify(w)} is not inside 0..1`);
    else if (!(w[0] < w[1])) bad(`window "${g}" steps backwards: ${w[0]} → ${w[1]}`);
  }
  if (!win.skin) bad('no "skin" window');
  const ids = new Set();
  for (const e of a.els || []) {
    if (ids.has(e.id)) bad(`id ${e.id} is used twice`);
    ids.add(e.id);
    for (const [label, g, at] of [['', e.g, e.at], [' via', e.via?.g, e.via?.at], [' via2', e.via2?.g, e.via2?.at]]) {
      if (g && !win[g]) bad(`${e.id}${label} is in group "${g}", which has no window`);
      if (at && !(at[0] >= 0 && at[1] <= 1 && at[0] < at[1])) bad(`${e.id}${label} at ${JSON.stringify(at)} steps backwards or leaves 0..1`);
    }
  }
  const ch = a.chapters || [];
  if (!ch.length || ch[0].t !== 0) bad('the first chapter must start at t 0');
  for (let i = 1; i < ch.length; i++)
    if (!(ch[i].t > ch[i - 1].t) || ch[i].t >= 1) bad(`chapter "${ch[i].k}" at t ${ch[i].t} steps backwards from "${ch[i - 1].k}" at t ${ch[i - 1].t}`);
}

const transparent = (c) => c == null || c === 'transparent' || c === 'none' || /^#[0-9a-f]{6}00$/i.test(c) || /^#[0-9a-f]{3}0$/i.test(c) || /rgba\([^)]*,\s*0\)$/.test(c);
function isBareText(e) {
  if (e.img || e.ico || e.plate || e.html || e.type || (e.to == null && e.tn == null)) return false;
  return [e.o, e.n].every((s) => transparent(s.bg) && (!s.bw || transparent(s.bd)));
}
const textLen = (s) => (s == null ? 0 : String(s).replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, 'x').length);
const contains = (A, B, tol = 1) => B.x >= A.x - tol && B.y >= A.y - tol && B.x + B.w <= A.x + A.w + tol && B.y + B.h <= A.y + A.h + tol;
const overlap = (A, B) => Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > TOL && Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > TOL;
const overlapPx = (A, B) => { const w = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), h = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y); return w > TOL && h > TOL ? Math.min(w, h) : 0; };
const spill = (A, B) => Math.max(A.x - B.x, A.y - B.y, B.x + B.w - A.x - A.w, B.y + B.h - A.y - A.h, 0);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), folder = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--act' && args[args.indexOf(a) - 1] !== '--samples');
  if (!folder) { console.error('usage: node check.mjs <film-folder> [--act <key>] [--samples 200]'); process.exit(2); }
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const r = check(folder, { act: opt('--act'), samples: +(opt('--samples') || 200) });
  console.log(`design-morph check · ${r.title} · ${r.acts} act${r.acts === 1 ? '' : 's'} · ${r.samples} samples per act`);
  for (const f of r.findings) console.log(`${f.act.padEnd(10)} ${f.kind.padEnd(9)} ${f.text}`);
  const by = {};
  for (const f of r.findings) by[f.kind] = (by[f.kind] || 0) + 1;
  console.log(`Findings: ${r.findings.length}` + (r.findings.length ? ` (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''));
  process.exit(r.findings.length ? 1 : 0);
}
