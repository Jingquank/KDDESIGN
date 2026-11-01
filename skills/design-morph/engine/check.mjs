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
//   drift     parts of one object pull apart in flight because they run on different windows or
//             curves: a moving card and its label, a group given one `at`, or row neighbours such as
//             an icon and the label beside it (also while they enter or leave)
//   tag       a spec tag sits over a visible string other than its own element's
//   orphan    an item lands inside where its container will be and waits alone more than 0.6 s
//   void      a large pane is covered under 40% as much as at its sparser end (and under 25%) for
//             more than 0.5 s before the skin turns
//   icon      a mask icon's art, still the old one, drawn over 1.5 times larger or smaller than at
//             the start: the glyph scales with its box, a size neither product uses
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
const ORPHAN_S = 0.6; // longest a landed item may wait for the container that holds it
const VOID_SHARE = 0.25, VOID_REL = 0.4, VOID_S = 0.5;   // a pane this little covered for this long is a void
const ICON_X = 1.5;   // an old icon drawn this many times larger or smaller than at the start has swelled

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

  // drift: parts of one object pulling apart in flight. A container and what it holds, two elements
  // given the same group and `at`, or row neighbours (an icon and its label, side by side on one line)
  // are meant to travel as one. A move must sit the same way at both ends; an exit is held to its
  // start and an enter to its end, while both are visible.
  const sameAt = (a, b) => a.g && a.g === b.g && a.at && b.at && a.at[0] === b.at[0] && a.at[1] === b.at[1];
  const okPair = (a, b) => (a.ok || []).includes(b.id) || (b.ok || []).includes(a.id) || a.driftOk || b.driftOk;
  const off = (s, i, j) => [s[j].b.x - s[i].b.x, s[j].b.y - s[i].b.y];
  const rowMates = (A, B) => { const ca = A.y + A.h / 2, cb = B.y + B.h / 2, gap = Math.max(A.x, B.x) - Math.min(A.x + A.w, B.x + B.w);
    return Math.abs(ca - cb) <= 4 && gap >= -2 && gap <= 24 && Math.max(A.h, B.h) <= 48; };
  const s0 = st[0], s1 = st[frames];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j) continue;
    const a = act.els[i], b = act.els[j];
    if (layer(a) !== layer(b) || okPair(a, b) || a.role !== b.role) continue;
    // the ends the pair is judged at: both for a move, the start for exits, the end for enters
    const ends = a.role === 'move' ? [s0, s1] : a.role === 'exit' ? [s0] : [s1];
    // a container and its contents are judged on moves only: cards and labels that enter or leave
    // one after another are a stagger (lesson 4), each with its own rise or drift
    const held = a.role === 'move' && holds.has(key(i, j)) && !holds.has(key(j, i)) && ends.every((s) => contains(s[i].b, s[j].b));
    const mates = i < j && ends.every((s) => rowMates(s[i].b, s[j].b));
    if (!held && !mates && !(i < j && a.role === 'move' && sameAt(a, b))) continue;
    // on the very same windows the two follow one curve: a shared waypoint or room scales their
    // offset, which is a layout move, not a drift
    const same = (k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null);
    if (same('wL') && same('wVia') && same('wVia2')) continue;
    const [x0, y0] = off(ends[0], i, j), [x1, y1] = off(ends[ends.length - 1], i, j);
    if (Math.abs(x0 - x1) > 1 || Math.abs(y0 - y1) > 1) continue;   // the offset itself changes: that is a layout move
    let worst = { px: 0, f: 0 };
    for (let f = 1; f < frames; f++) {
      if (st[f][i].op <= VIS || st[f][j].op <= VIS) continue;
      const [x, y] = off(st[f], i, j);
      const px = Math.max(Math.abs(x - x0), Math.abs(y - y0));
      if (px > worst.px) worst = { px, f };
    }
    const how = held ? `sit the same way in ${a.id}` : mates ? 'sit side by side on one row' : 'share one `at`';
    if (worst.px > DRIFT_PX)
      add({ act: A, kind: 'drift', text: `${b.id} pulls ${worst.px.toFixed(1)} px away from ${a.id} at ${where(worst.f)}; they ${how}${a.role === 'move' ? ' at both ends' : ''}. Give them one window (the same g and at)` });
  }

  // tag: a spec tag over text that is on screen at that moment. Tags are drawn at screen size, so
  // this measures them at 1x (the player at 1440 px); the text is any visible string but the tag's own.
  const texts = act.els.filter((e) => (typeof e.to === 'string' && e.to.replace(/<[^>]+>/g, '').trim()) || (typeof e.tn === 'string' && e.tn.replace(/<[^>]+>/g, '').trim()));
  const tIdx = texts.map((e) => act.els.indexOf(e));
  const lin = (t, a0, a1) => Math.min(1, Math.max(0, (t - a0) / (a1 - a0)));
  for (const [ei, e] of act.els.entries()) {
    if (!e.spec || e.role === 'exit' || !e.wL) continue;
    const nb = e.n, w = String(e.spec).replace(/&[a-z#0-9]+;/gi, 'x').length * 6.3 + 12, h = 17;
    const above = e.specAt !== 'below' && nb.y - 21 > 4;
    let x = nb.x + (e.specAt === 'inside' ? 8 : 0), y = e.specAt === 'inside' ? nb.y + 8 : above ? nb.y - 21 : nb.y + nb.h + 4;
    x = Math.min(Math.max(x, 2), (act.stage?.w ?? 1440) - w - 2); y = Math.max(y, 2);
    const tagBox = { x, y, w, h };
    let hit = null;
    for (let f = 0; f <= frames && !hit; f += 3) {
      const t = f / frames, p = lin(t, e.wL[0], e.wL[1]);
      const back = Math.max(lin(t, e.wL[1], e.wL[1] + 0.03), lin(t, act.win.skin[0] - 0.03, act.win.skin[0]));
      if (lin(p, 0.2, 0.45) * (1 - back) < 0.5) continue;
      for (const k of tIdx) {
        if (k === ei || st[f][k].op < 0.5) continue;
        const b = st[f][k].b, ow = Math.min(x + w, b.x + b.w) - Math.max(x, b.x), oh = Math.min(y + h, b.y + b.h) - Math.max(y, b.y);
        if (ow > 4 && oh > 4) { hit = { f, id: act.els[k].id }; break; }
      }
    }
    if (hit) add({ act: A, kind: 'tag', text: `the tag "${e.spec}" on ${e.id} covers ${hit.id} at ${where(hit.f)}. Set specAt to place it clear of text, or drop the spec` });
  }

  // orphan: something lands where a container will hold it, and sits there alone for longer than a
  // beat before the container shows (lesson 4 wants the card right after its travellers, not seconds later)
  const sec = (dt) => dt * frames / FPS;
  for (let ci = 0; ci < n; ci++) {
    const c = act.els[ci];
    if (!c.n || c.role === 'exit' || !c.n.bg || /^(transparent|none)$/.test(c.n.bg) || /^#[0-9a-f]{6}00$/i.test(c.n.bg)) continue;
    for (let ii = 0; ii < n; ii++) {
      if (ii === ci || layer(act.els[ii]) !== layer(c) || !holds.has(key(ci, ii)) || !contains(s1[ci].b, s1[ii].b)) continue;
      const e = act.els[ii];
      if (e.role === 'exit' || !e.wL || okPair(c, e)) continue;
      const land = Math.ceil((e.wL[0] + 0.9 * (e.wL[1] - e.wL[0])) * frames);
      let f = land;
      while (f <= frames && st[f][ci].op < 0.5) f++;
      const alone = f > land && st[Math.min(land, frames)][ii].op > VIS ? sec((f - land) / frames) : 0;
      if (alone > ORPHAN_S) add({ act: A, kind: 'orphan', text: `${e.id} lands at ${where(land)} and waits ${alone.toFixed(1)} s before ${c.id}, which holds it, shows. Bring ${c.id} in right after it (lesson 4)` });
    }
  }

  // icon: a mask icon fills its box, so while the old art shows (the first half of the skin's icon
  // swap) a box that grows or shrinks draws the old glyph at a size neither product uses. Picture
  // icons (img:) scale as pictures do and are left alone.
  const skin = act.win.skin, oldArt = skin[0] + 0.5 * (skin[1] - skin[0]);
  for (let i = 0; i < n; i++) {
    const e = act.els[i];
    if (!e.ico?.o || String(e.ico.o).startsWith('img:') || e.role === 'enter' || e.iconOk) continue;
    const side = (b) => Math.max(b.w, b.h), base = side(s0[i].b);
    if (!base) continue;
    let worst = { x: 1, f: 0 };
    for (let f = 1; f <= frames && f / frames < oldArt; f++) {
      if (st[f][i].op <= VIS) continue;
      const x = side(st[f][i].b) / base;
      if (Math.max(x, 1 / x) > Math.max(worst.x, 1 / worst.x)) worst = { x, f };
    }
    if (Math.max(worst.x, 1 / worst.x) > ICON_X)
      add({ act: A, kind: 'icon', text: `${e.id}'s old icon is drawn at ${Math.round(side(st[worst.f][i].b))} px, ${worst.x.toFixed(1)}× its ${Math.round(base)} px, at ${where(worst.f)}, before its art swaps. Start it in the new box and inset the art to the old glyph size (a pad class or a padded viewBox), or swap the art before the box changes (lesson 16)` });
  }

  // void: the content area mostly empty for longer than a beat. Measured on a 24 px grid over each
  // clipped pane: the share covered by visible elements that are not backdrops (a box over half the pane).
  for (const l of act.layers) {
    const pane = l.clip && act.byId[l.clip];
    if (!pane || !pane.n || pane.n.w * pane.n.h < 200000) continue;
    const pi = act.els.indexOf(pane);
    let run = 0, worst = { len: 0, f: 0, cov: 1 };
    const covs = [];
    for (let f = 0; f <= frames; f += 2) {
      const P = st[f][pi].b, cells = [], G = 24;
      let on = 0, all = 0;
      const vis = act.els.map((e, k) => k).filter((k) => k !== pi && layer(act.els[k]) === l && st[f][k].op > 0.5
        && st[f][k].b.w * st[f][k].b.h < 0.5 * P.w * P.h);
      for (let y = P.y + G / 2; y < P.y + P.h; y += G) for (let x = P.x + G / 2; x < P.x + P.w; x += G) {
        all++;
        if (vis.some((k) => { const b = st[f][k].b; return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; })) on++;
      }
      covs.push([f, all ? on / all : 1]);
    }
    // a void is relative to the page's own fill: under 40% of the sparser end, and under 25% outright
    const floor = Math.min(VOID_SHARE, VOID_REL * Math.min(covs[0][1], covs[covs.length - 1][1]));
    for (const [f, cov] of covs) {
      const t = f / frames;
      if (cov < floor && t > 0.02 && t < act.win.skin[0]) { run += 2; if (run > worst.len) worst = { len: run, f: f - run + 2, cov }; } else run = 0;
    }
    if (sec(worst.len / frames) > VOID_S)
      add({ act: A, kind: 'void', text: `pane ${pane.id} is ${Math.round(worst.cov * 100)}% covered for ${sec(worst.len / frames).toFixed(1)} s from ${where(worst.f)}: the old content has left and the new has not come. Overlap the arrivals with the exits` });
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
