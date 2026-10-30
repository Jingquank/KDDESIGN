/* Morph engine: flat elements on one stage, each with an old and a new state.
   L (layout) moves boxes, radii, sizes and swaps content; S (skin) moves colors, weights,
   font family and icon art. Skeleton first: L happens chapter by chapter, S at the end.
   A film changes the engine only through configure(scene) and Morph.type(); a run never edits
   this file. The state math (prepareAct, frameAct, filmClock) touches no DOM, so check.mjs runs
   it in Node exactly as the page does. */

/* ---------- easing ---------- */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
let EXPO = bezier(0.16, 1, 0.3, 1);      // moves and enters: ease-out-expo unless the project has its own token
let EASE_IN = bezier(0.4, 0, 1, 1);      // exits
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const span = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));

/* ---------- config: one film's stage, theme and old skin, from scene.json ---------- */
const CFG = { W: 1440, H: 900, gutter: 8, acc: '#00e05a', onAcc: '#002b12', ui: 'system-ui, sans-serif',
  oldInk: '#fafafa', newInk: '#1d1a15', skin: {}, textSkin: {}, skinAuto: 'dark', corner: null, radiusCap: 28 };
const TYPES = {};
// the extension point: a scene's types/<name>.js calls Morph.type(name, { html(e, A), frame(e, now, node) })
const Morph = { type: (name, hooks) => { TYPES[name] = hooks; } };
let SQUIRCLE = false;
let BASE;
const lowerKeys = (m) => Object.fromEntries(Object.entries(m || {}).map(([k, v]) => [k.toLowerCase(), v]));
function configure(scene) {
  const st = scene.stage || {}, th = scene.theme || {}, sk = th.oldSkin || {};
  Object.assign(CFG, {
    W: st.w ?? 1440, H: st.h ?? 900, gutter: st.gutter ?? 8,
    acc: th.accent ?? CFG.acc, onAcc: th.onAccent ?? CFG.onAcc, ui: th.ui ?? CFG.ui,
    oldInk: th.oldInk ?? CFG.oldInk, newInk: th.newInk ?? CFG.newInk,
    skin: lowerKeys(sk.map), textSkin: lowerKeys(sk.text), skinAuto: sk.auto ?? 'dark',
    corner: th.corner ?? null, radiusCap: th.radiusCap ?? 28,
  });
  const ease = th.ease || {};
  EXPO = bezier(...(ease.move || [0.16, 1, 0.3, 1]));
  EASE_IN = bezier(...(ease.exit || [0.4, 0, 1, 1]));
  SQUIRCLE = !!CFG.corner && typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('corner-shape', CFG.corner);
  BASE = { op: 1, r: 0, bg: 'transparent', bd: 'transparent', bw: 0, bs: 'solid', c: CFG.oldInk,
    fs: 13.2, fw: 400, ls: 0, pl: 0, pr: 0, lh: 1.25, rot: 0 };
  _rgb.clear();
}

/* ---------- color ---------- */
const _rgb = new Map();
function rgba(c) {
  if (_rgb.has(c)) return _rgb.get(c);
  let v;
  if (c == null || c === 'none' || c === 'transparent') v = [0, 0, 0, 0];
  else if (c.startsWith('rgb')) { const n = c.match(/[\d.]+/g).map(Number); v = [n[0], n[1], n[2], n[3] ?? 1]; }
  else { let h = c.slice(1); if (h.length <= 4) h = h.split('').map((x) => x + x).join(''); if (h.length === 6) h += 'ff';
    v = [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16) / (i === 6 ? 255 : 1)); }
  _rgb.set(c, v); return v;
}
function mixc(a, b, t) {
  if (t <= 0) return a ?? 'transparent'; if (t >= 1) return b ?? 'transparent';
  const A = rgba(a), B = rgba(b);
  // fade from or to transparent keeps the other color's hue
  const src = A[3] === 0 ? [...B.slice(0, 3), 0] : A, dst = B[3] === 0 ? [...A.slice(0, 3), 0] : B;
  const r = src.map((v, i) => lerp(v, dst[i], t));
  return `rgba(${r[0] | 0},${r[1] | 0},${r[2] | 0},${r[3].toFixed(3)})`;
}

/* The new structure shown in the old skin: what each new color looks like before the skin turns.
   The film's map wins; otherwise neutrals flip toward the old theme (auto: dark | light | none)
   and real hues stay themselves. */
function oldSkin(c) {
  if (c == null) return c;
  const k = c.toLowerCase();
  if (CFG.skin[k]) return CFG.skin[k];
  if (CFG.skinAuto === 'none') return c;
  const [r, g, b, a] = rgba(c);
  if (a === 0) return c;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (Math.max(r, g, b) - Math.min(r, g, b) > 60) return c;
  let v;
  if (CFG.skinAuto === 'light') { if (l > 0.94) return c; v = l < 0.5 ? lerp(250, 225, l * 2) : lerp(40, 70, (1 - l) * 2); }
  else { if (l < 0.06) return c; v = l > 0.5 ? lerp(20, 40, (1 - l) * 2) : lerp(250, 200, l * 2); }   // media wells stay dark
  return `rgba(${v | 0},${v | 0},${v | 0},${a})`;
}
// text keeps its color unless the film maps it (dark ink must stay light on the dark old skin)
function skinOf(s) { return { bg: oldSkin(s.bg), bd: oldSkin(s.bd), c: CFG.textSkin[(s.c || '').toLowerCase()] || s.c }; }

/* ---------- corners: the after-UI's corner shape where the browser has it ---------- */
const shapeAt = (L) => (SQUIRCLE && L > 0.5 ? CFG.corner : 'round');
const radius = (r) => (SQUIRCLE || !CFG.corner || r <= CFG.radiusCap ? r : CFG.radiusCap);

/* ---------- elements: the fields are in SCENE.md ---------- */
function makeEl(d) {
  const e = { ...d, nIn: d.n || null };
  const oIn = d.o || null, nIn = d.n || null;
  e.role = d.role || (!oIn ? 'enter' : !nIn || nIn.op === 0 ? 'exit' : 'move');
  if (e.role === 'enter') {
    e.n = { ...BASE, c: CFG.newInk, ...nIn };
    e.o = { ...e.n, ...skinOf(e.n), op: 0, ...(oIn || {}) };
  } else if (e.role === 'exit') {
    e.o = { ...BASE, ...oIn };
    e.n = { ...e.o, ...(nIn || {}), op: 0 };
  } else {
    e.o = { ...BASE, ...oIn };
    e.n = { ...BASE, c: CFG.newInk, ...nIn };
  }
  for (const k of ['x', 'y', 'w', 'h']) { if (e.n[k] == null) e.n[k] = e.o[k]; if (e.o[k] == null) e.o[k] = e.n[k]; }
  e.oS = skinOf(e.n);   // the new state in old colors
  if (e.via) e.via = { ...e.o, ...e.via };
  return e;
}

/* While a new pane takes room, the old page area scales into the space it will own, in one move.
   room: { from: [x, y, w, h], to: [x, y, w, h], layers: [...], g, at, skip: [ids] } */
const KEYS = ['x', 'y', 'w', 'h', 'r', 'fs', 'pl'];
function makeRoom(act, room) {
  const { from, to } = room;
  const s = Math.min(to[2] / from[2], to[3] / from[3]);
  const fit = (b) => ({ x: to[0] + (b.x - from[0]) * s, y: to[1] + (b.y - from[1]) * s, w: b.w * s, h: b.h * s, r: b.r * s, fs: b.fs * s, pl: b.pl * s });
  const layers = room.layers || ['main'], skip = room.skip || [];
  for (const e of act.els) {
    if (e.role === 'enter' || e.via || e.noRoom || skip.includes(e.id)) continue;
    if (!layers.includes(e.ly || 'main')) continue;
    e.via = { ...e.o, ...fit(e.o), g: room.g || 'nav', at: room.at || [0.02, 0.36] };
    // an exit that stays put leaves from where the room put it
    if (e.role === 'exit') for (const k of KEYS) if (e.n[k] === e.o[k]) e.n[k] = e.via[k];
  }
}

/* One act's data → a playable act: elements, room, waypoints, timing. Pure; no DOM. */
function prepareAct(data) {
  const act = { ...data, els: data.els.map(makeEl) };
  act.byId = Object.fromEntries(act.els.map((e) => [e.id, e]));
  if (act.room) makeRoom(act, act.room);
  // a second waypoint may be given relative to the first (dx, dy), e.g. a row parked out of the way
  for (const e of act.els) {
    if (!e.via2 || (e.via2.dx == null && e.via2.dy == null)) continue;
    const b = e.via || e.o;
    e.via2 = { ...e.via2, x: b.x + (e.via2.dx ?? 0), y: b.y + (e.via2.dy ?? 0) };
  }
  planAct(act);
  return act;
}

/* ---------- timing ---------- */
// fractions of a group window per role: exits leave first, moves travel, entries settle last
const ROLE_WIN = { exit: [0, 0.3], move: [0.2, 0.92], enter: [0.6, 1] };
function planAct(act) {
  const groups = {};
  for (const e of act.els) {
    for (const g of [e.g, e.via?.g, e.via2?.g].filter(Boolean)) (groups[g] ||= []).push(e);
  }
  for (const [g, list] of Object.entries(groups)) {
    const [a, b] = act.win[g] || [0, 0];
    const byRole = { exit: [], move: [], enter: [] };
    // a waypoint (via, via2) in this group is a move here
    const wp = (e) => (e.via && e.via.g === g ? 'via' : e.via2 && e.via2.g === g ? 'via2' : null);
    for (const e of list) byRole[wp(e) ? 'move' : e.role].push(e);
    for (const [role, items] of Object.entries(byRole)) {
      items.sort((p, q) => (p.k ?? 0) - (q.k ?? 0) || p.o.y - q.o.y || p.o.x - q.o.x);
      const [f0, f1] = ROLE_WIN[role];
      const n = items.length, len = (f1 - f0), stag = n > 1 ? Math.min(0.32, 0.04 * (n - 1)) * len : 0;
      items.forEach((e, i) => {
        const s = f0 + (n > 1 ? (stag * i) / (n - 1) : 0), en = s + len - stag;
        const k = wp(e), at = k ? e[k].at : e.at;
        const w = [a + (b - a) * (at?.[0] ?? s), a + (b - a) * (at?.[1] ?? en)];
        if (k === 'via') e.wVia = w; else if (k === 'via2') e.wVia2 = w; else e.wL = w;
      });
    }
  }
  // skin: a soft sweep from top to bottom across the whole stage
  const [s0, s1] = act.win.skin;
  for (const e of act.els) {
    const y = clamp((e.n.y + e.n.h / 2) / CFG.H), x = clamp(e.n.x / CFG.W);
    const s = s0 + (s1 - s0) * 0.45 * (y * 0.75 + x * 0.25);
    e.wS = [s, s + (s1 - s0) * 0.55];
  }
  // text and its ground turn together: what sits in a clipped pane (or names one in skinWith)
  // takes that pane's skin window, or for a moment dark text would sit on a still-dark pane
  const paneOf = Object.fromEntries(act.layers.filter((l) => l.clip).map((l) => [l.id, l.clip]));
  for (const e of act.els) {
    const p = act.byId[e.skinWith ?? paneOf[e.ly]];
    if (p && p !== e) e.wS = p.wS;
  }
}

/* ---------- per-frame state (pure) ---------- */
function stateAt(e, t) {
  const pL = e.wL ? span(t, ...e.wL) : (t > 0.5 ? 1 : 0);
  let base = e.o;
  if (e.via) { const pV = EXPO(span(t, ...e.wVia)); base = {}; for (const k of KEYS) base[k] = lerp(e.o[k], e.via[k], pV); }
  if (e.via2) { const pV = EXPO(span(t, ...e.wVia2)), b0 = base; base = {}; for (const k of KEYS) base[k] = lerp(b0[k], e.via2[k] ?? b0[k], pV); }
  const box = {};
  let L;
  if (e.role === 'exit') {
    // leave quickly, drifting a short way toward where it folds into
    L = EASE_IN(pL);
    for (const k of KEYS) box[k] = base[k];
    let dx = e.n.x - base.x, dy = e.n.y - base.y; const d = Math.hypot(dx, dy), cap = e.travel ?? 28;
    if (d > cap) { dx *= cap / d; dy *= cap / d; }
    box.x += dx * L; box.y += dy * L;
  } else {
    L = EXPO(pL);
    for (const k of KEYS) box[k] = lerp(base[k], e.n[k], L);
  }
  const S = EXPO(e.wS ? span(t, ...e.wS) : 0);
  return { pL, L, S, box };
}

function frameEl(e, t) {
  const { pL, L, S, box } = stateAt(e, t), o = e.o, n = e.n;
  let op, ty = 0, sc = 1;
  if (e.role === 'exit') { op = (1 - pL) * (1 - pL); sc = lerp(1, e.shrink ?? 0.96, EASE_IN(pL)); }
  else if (e.role === 'enter') { const p = EXPO(pL); op = p; ty = (1 - p) * (e.rise ?? 8); sc = lerp(e.grow ?? 0.98, 1, p); }
  else op = lerp(o.op, n.op, L);
  // colors: old → old-skinned new (with L) → new (with S)
  // text flips in the middle of its skin turn, while its ground turns slowly, so the two never sit
  // at the same grey for more than a moment
  const col = (k, s = S) => mixc(mixc(o[k], e.oS[k], e.role === 'exit' ? 0 : L), n[k], e.role === 'exit' ? 0 : s);
  return { ...box, op, ty, sc, L, S, pL, bg: col('bg'), bd: col('bd'), c: col('c', span(S, 0.4, 0.6)) };
}

// every element's state at act time t (0..1), and each clipped layer's pane box
function frameAct(act, t) {
  for (const e of act.els) e.now = frameEl(e, t);
  for (const l of act.layers) l.now = l.clip && act.byId[l.clip] ? act.byId[l.clip].now : null;
}

/* ---------- the film clock: clamped both ways, so a lookup is never out of range ---------- */
function filmClock(n, card, actLen) {
  const per = card + actLen, FILM = n * per;
  const actStart = (i) => clamp(i, 0, Math.max(0, n - 1)) * per;
  function where(s) {
    s = clamp(Number.isFinite(+s) ? +s : 0, 0, FILM);
    const i = clamp(Math.floor(s / per), 0, Math.max(0, n - 1)), local = s - i * per;
    return { i, card: local < card, t: clamp((local - card) / actLen) };
  }
  // dt in seconds: never negative (a stale timestamp), never a jump of more than a tenth of a second
  function step(time, dt, speed) { dt = Number.isFinite(dt) ? clamp(dt, 0, 0.1) : 0; return clamp(time + dt * speed, 0, FILM); }
  return { FILM, card, act: actLen, actStart, where, step };
}

/* ---------- build DOM ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function buildAct(act, world, A) {
  world.innerHTML = '';
  act.layers.forEach((l) => {
    // a clipped layer is a rounded box at its pane, so content clips to the same corner shape as the pane
    const d = document.createElement('div'); d.className = 'layer'; d.style.zIndex = l.z ?? 0;
    const inner = document.createElement('div'); inner.className = 'layer-in'; d.appendChild(inner);
    l.node = d; l.inner = inner; world.appendChild(d);
  });
  const layerOf = Object.fromEntries(act.layers.map((l) => [l.id, l]));
  for (const e of act.els) {
    const d = document.createElement('div'); d.className = 'el ' + (e.cls || '');
    let h = '';
    if (e.plate) h += `<div class="pl o"><div></div></div><div class="pl n"><div></div></div>`;
    if (e.img) h += `<img class="m o" alt="" src="${esc(e.img.o || e.img.n)}">` + (e.img.n && e.img.n !== e.img.o ? `<img class="m n" alt="" src="${esc(e.img.n)}">` : '');
    if (e.ico) {
      // an icon is a mask from icons.json, or a picture when its name starts with img:
      const art = (name) => name.startsWith('img:')
        ? `<img alt="" src="${esc(name.slice(4))}">`
        : `<i style="--m:url(&quot;${(A.icons || {})[name] || ''}&quot;)"></i>`;
      h += `<span class="ic o">${art(e.ico.o || e.ico.n)}</span>` + (e.ico.n && e.ico.n !== e.ico.o ? `<span class="ic n">${art(e.ico.n)}</span>` : '');
    }
    if (e.type && TYPES[e.type]?.html) h += TYPES[e.type].html(e, A);
    if (e.html) h += e.html;
    const to = e.to, tn = e.tn ?? e.to;
    if (to != null && tn !== to) h += `<div class="t to">${to}</div>`;
    if (tn != null) h += `<div class="t nO">${tn}</div><div class="t nN">${tn}</div>`;
    d.innerHTML = h;
    (layerOf[e.ly] || layerOf.main || act.layers[0]).inner.appendChild(d);
    e.dom = { d, to: d.querySelector('.t.to'), nO: d.querySelector('.t.nO'), nN: d.querySelector('.t.nN'),
      icO: d.querySelector('.ic.o'), icN: d.querySelector('.ic.n'), mO: d.querySelector('.m.o'), mN: d.querySelector('.m.n'),
      pO: d.querySelector('.pl.o > div'), pN: d.querySelector('.pl.n > div'), pOw: d.querySelector('.pl.o'), pNw: d.querySelector('.pl.n'),
      skO: [...d.querySelectorAll('.sk-o')], skN: [...d.querySelectorAll('.sk-n')], nh: d.querySelector('.n-html') };
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'guides'); svg.setAttribute('viewBox', `0 0 ${CFG.W} ${CFG.H}`); svg.setAttribute('preserveAspectRatio', 'none');
  world.appendChild(svg); act.svg = svg;
}

/* ---------- render one frame ---------- */
function renderAct(act, t, scale) {
  const sw = 1 / scale;
  frameAct(act, t);
  for (const e of act.els) {
    const now = e.now, o = e.o, n = e.n, st = e.dom.d.style, { op, L, S } = now;
    st.opacity = op;
    st.visibility = op <= 0.001 ? 'hidden' : 'visible';
    st.transform = `translate(${now.x}px,${now.y + now.ty}px)` + (now.sc !== 1 ? ` scale(${now.sc})` : '');
    st.width = now.w + 'px'; st.height = now.h + 'px';
    st.borderRadius = radius(now.r) + 'px';
    // pills and circles stay round, as in the app, and so do exits
    st.cornerShape = e.role === 'exit' || n.r * 2 >= Math.min(n.w, n.h) - 1 ? 'round' : shapeAt(L);
    st.background = now.bg;
    if (e.fadeTo) st.setProperty('--fade', act.byId[e.fadeTo]?.now?.bg || 'transparent');
    st.borderColor = now.bd;
    st.borderWidth = lerp(o.bw, n.bw, L) + 'px';
    st.borderStyle = L > 0.5 ? n.bs : o.bs;
    st.color = now.c;
    st.fontSize = now.fs + 'px';
    st.fontWeight = Math.round(lerp(o.fw, n.fw, S));
    st.letterSpacing = lerp(o.ls, n.ls, L) + 'em';
    st.setProperty('--pl', now.pl + 'px');
    // content swap with L, family swap with S
    const { to, nO, nN } = e.dom;
    const swap = e.swapAt || [0.2, 0.62];
    const a = to ? 1 - span(L, swap[0], (swap[0] + swap[1]) / 2) : 1, b = to ? span(L, (swap[0] + swap[1]) / 2, swap[1]) : 1;
    if (to) to.style.opacity = a;
    if (nO) { nO.style.opacity = b * (1 - span(S, 0.45, 0.62)); nN.style.opacity = b * span(S, 0.33, 0.5); }
    // icons: art swap with S (skin)
    if (e.dom.icO) {
      const icS = e.ico.o && e.ico.n && e.ico.o !== e.ico.n ? span(S, 0.25, 0.75) : (e.ico.o ? 0 : 1);
      e.dom.icO.style.opacity = e.dom.icN ? 1 - icS : 1;
      if (e.dom.icN) e.dom.icN.style.opacity = icS;
    }
    // media: content swap with L
    if (e.dom.mN) e.dom.mN.style.opacity = span(L, 0.3, 0.75);
    if (e.plate) {
      setPlate(e.dom.pO, e.plate.o, now.w, now.h); setPlate(e.dom.pN, e.plate.n, now.w, now.h);
      const m = span(L, e.plateAt?.[0] ?? 0.2, e.plateAt?.[1] ?? 0.7);
      e.dom.pOw.style.opacity = e.plate.o ? 1 - m : 0; e.dom.pNw.style.opacity = e.plate.n ? m : 0;
    }
    if (e.dom.skO.length || e.dom.skN.length) { const k = span(S, 0.3, 0.7); e.dom.skO.forEach((x) => (x.style.opacity = 1 - k)); e.dom.skN.forEach((x) => (x.style.opacity = k)); }
    if (e.dom.nh) e.dom.nh.style.opacity = span(L, 0.3, 0.75);
    if (e.type && TYPES[e.type]?.frame) TYPES[e.type].frame(e, now, e.dom.d);
  }
  // layers clip to their pane's current box and corner
  for (const l of act.layers) {
    if (!l.now) continue;
    const st = l.node.style, c = l.now;
    st.left = c.x + 'px'; st.top = c.y + 'px'; st.width = c.w + 'px'; st.height = c.h + 'px';
    st.borderRadius = radius(c.r) + 'px'; st.cornerShape = shapeAt(c.L); st.overflow = 'hidden';
    l.inner.style.transform = `translate(${-c.x}px,${-c.y}px)`;
  }
  drawGuides(act, t, sw);
}

// a plate is a crop of a full screenshot (stage-sized unless it says otherwise), scaled to cover the box
function setPlate(div, p, w, h) {
  if (!div || !p) return;
  const [cx, cy, cw, ch] = p.crop, [pw, ph] = p.size || [CFG.W, CFG.H], s = Math.max(w / cw, h / ch);
  if (div._src !== p.src) { div.style.backgroundImage = `url("${p.src}")`; div._src = p.src; }
  div.style.width = pw * s + 'px'; div.style.height = ph * s + 'px';
  div.style.left = -cx * s + (w - cw * s) / 2 + 'px'; div.style.top = -cy * s + (h - ch * s) / 2 + 'px';
}

/* ---------- guides in the after-project's accent and UI font, drawn as line traces ---------- */
let _ctx;
const textW = (t) => { _ctx ||= document.createElement('canvas').getContext('2d'); _ctx.font = `600 11px ${CFG.ui}`; return _ctx.measureText(t).width; };
let GUIDES = true;
function tag(x, y, txt, sw, a = 1) {
  const w = (textW(txt) + 12) * sw, h = 17 * sw;
  x = clamp(x, 2 * sw, CFG.W - w - 2 * sw); y = clamp(y, 2 * sw, CFG.H - h - 2 * sw);
  return `<g opacity="${a.toFixed(3)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${5 * sw}" fill="${CFG.acc}"/>` +
    `<text x="${x + 6 * sw}" y="${y + 12 * sw}" font-family="${esc(CFG.ui)}" font-weight="600" font-size="${11 * sw}" fill="${CFG.onAcc}">${txt}</text></g>`;
}
function drawGuides(act, t, sw) {
  if (!GUIDES) { act.svg.innerHTML = ''; return; }
  const W = CFG.W, H = CFG.H, G = CFG.gutter, ACC = CFG.acc;
  let g = '';
  const da = `${4 * sw} ${4 * sw}`;
  // the grid: column outlines trace down from the top, then retract upward when the skin turns
  const gw = act.win.grid, gOut = act.win.skin[0];
  const gin = gw ? span(t, gw[0], gw[1]) : 0, gout = span(t, gOut - 0.03, gOut + 0.04);
  if (gin > 0 && gout < 1 && act.grid) {
    (act.grid.cols || []).forEach(([x, w, lab], i) => {
      const d = EXPO(clamp(gin * 1.5 - i * 0.18)) * (1 - EASE_IN(clamp(gout * 1.3 - i * 0.1)));
      if (d <= 0) return;
      // the outline is one path traced clockwise from the top-left corner
      const path = `M${x} ${G}H${x + w}V${H - G}H${x}Z`;
      g += `<path d="${path}" fill="${ACC}" fill-opacity="${(0.06 * d).toFixed(3)}" stroke="none"/>`;
      g += `<path d="${path}" pathLength="1" fill="none" stroke="${ACC}" stroke-width="${sw}" stroke-dasharray="${d.toFixed(4)} 1"/>`;
      if (d > 0.45 && lab) g += tag(x + w / 2 - (textW(lab) + 12) * sw / 2, 14 * sw, lab, sw, span(d, 0.45, 0.8));
    });
    const gut = act.grid.gutters || [];
    const gd = EXPO(clamp(gin * 1.3 - 0.25)) * (1 - EASE_IN(gout));
    gut.forEach((x) => { g += `<rect x="${x}" y="0" width="${G}" height="${(H * gd).toFixed(1)}" fill="${ACC}" fill-opacity="0.32"/>`; });
    if (gut.length > 1 && gd > 0.6) g += tag(gut[1] - 2 * sw, 42 * sw, String(G), sw, span(gd, 0.6, 1));
  }
  // per element: extension lines grow out from the target box, its outline traces round,
  // the tag comes last, and everything retracts once the element has landed
  for (const e of act.els) {
    if (!e.spec || e.role === 'exit' || !e.wL) continue;
    const p = e.now.pL, n = e.n;
    if (p <= 0) continue;
    const grow = EXPO(span(p, 0, 0.4));
    const back = EASE_IN(span(t, e.wL[1], e.wL[1] + 0.03));
    const k = grow * (1 - back);
    if (k <= 0.005) continue;
    const r = radius(n.r), x0 = n.x, x1 = n.x + n.w, y0 = n.y, y1 = n.y + n.h;
    const up = y0 * k, down = (H - y1) * k, left = x0 * k, right = (W - x1) * k;
    g += `<g stroke="${ACC}" stroke-width="${sw}" stroke-dasharray="${da}" fill="none">` +
      `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 - up}"/><line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y1 + down}"/>` +
      `<line x1="${x1}" y1="${y0}" x2="${x1}" y2="${y0 - up}"/><line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1 + down}"/>` +
      `<line x1="${x0}" y1="${y0}" x2="${x0 - left}" y2="${y0}"/><line x1="${x1}" y1="${y0}" x2="${x1 + right}" y2="${y0}"/>` +
      `<line x1="${x0}" y1="${y1}" x2="${x0 - left}" y2="${y1}"/><line x1="${x1}" y1="${y1}" x2="${x1 + right}" y2="${y1}"/></g>`;
    const ol = EXPO(span(p, 0.08, 0.55)) * (1 - back);
    g += `<rect x="${x0}" y="${y0}" width="${n.w}" height="${n.h}" rx="${r}" pathLength="1" fill="none" stroke="${ACC}" stroke-width="${1.6 * sw}" stroke-dasharray="${ol.toFixed(4)} 1"/>`;
    const a = span(p, 0.2, 0.45) * (1 - back);
    const above = e.specAt !== 'below' && n.y - 21 * sw > 4 * sw;
    g += tag(n.x + (e.specAt === 'inside' ? 8 * sw : 0), e.specAt === 'inside' ? n.y + 8 * sw : above ? n.y - 21 * sw : n.y + n.h + 4 * sw, e.spec, sw, a);
  }
  // skin: token tags on a few elements while their color turns
  for (const e of act.els) {
    if (!e.skinTag) continue;
    const p = span(t, ...e.wS);
    if (p <= 0 || p >= 1) continue;
    g += tag(e.n.x + (e.skinTagAt?.[0] ?? 0), e.n.y + (e.skinTagAt?.[1] ?? e.n.h + 6 * sw), e.skinTag, sw, Math.sin(Math.PI * p));
  }
  act.svg.innerHTML = g;
}

if (typeof globalThis !== 'undefined') Object.assign(globalThis, { Morph, configure, prepareAct, frameAct, filmClock, CFG });
