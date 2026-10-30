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
