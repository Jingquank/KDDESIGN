/* Theater player: one clock across the acts, each opened by a title card. Fed by the inlined scene. */
const SCENE = JSON.parse(document.getElementById('dm-scene').textContent);
configure(SCENE);
const ACTS = SCENE.acts.map(prepareAct);
const TIMING = SCENE.timing || {};
const CLOCK = filmClock(ACTS.length, TIMING.card ?? 0.8, TIMING.act ?? 20 / 1.5);
const { FILM, actStart } = CLOCK, CARD = CLOCK.card, ACT = CLOCK.act;
const SPEEDS = [0.5, 1, 2];
const LANGS = SCENE.langs && SCENE.langs.length ? SCENE.langs : ['en'];
const LANG_LABEL = { en: 'EN', zh: '中', ja: '日', ko: '한', de: 'DE', fr: 'FR', es: 'ES', pt: 'PT', it: 'IT', ru: 'RU' };
const STR = {
  en: { speed: 'Speed', guides: 'Guides', act: 'ACT' },
  zh: { speed: '速度', guides: '辅助线', act: '第' },
  ...(SCENE.strings || {}),
};
const str = (l, k) => (STR[l] && STR[l][k]) || STR.en[k];
const ASSETS = { icons: SCENE.icons || {} };

const $ = (id) => document.getElementById(id);
const stage = $('stage'), world = $('world'), titleCard = $('card'), cap = $('caption');
const track = $('track'), fill = $('fill'), knob = $('knob'), tc = $('tc'), tlabel = $('tlabel'), play = $('play');
const root = document.documentElement.style;
root.setProperty('--sw', CFG.W); root.setProperty('--sh', CFG.H); root.setProperty('--arn', (CFG.W / CFG.H).toFixed(4));
root.setProperty('--accent', CFG.acc);
let scale = 0.5, current = -1;
let time = 0, speed = 1, lang = LANGS[0], last = performance.now();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduce;
// per-viewer settings, one set per film; storage can be blocked, so every access is guarded
const KEY = 'dm:' + (SCENE.id || 'film') + ':';
const store = { get: (k) => { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(KEY + k, v); } catch (e) {} } };
const T = (o) => (o && (o[lang] ?? o.en ?? Object.values(o)[0])) || '';

function useAct(i) {
  if (current === i) return;
  current = i; buildAct(ACTS[i], world, ASSETS);
}
function chapterAt(act, t) { let c = act.chapters[0]; for (const x of act.chapters) if (t >= x.t) c = x; return c; }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const num = (i) => String(i + 1).padStart(2, '0');

function render() {
  const { i, card, t } = CLOCK.where(time), act = ACTS[i];
  useAct(i);
  renderAct(act, card ? 0 : t, scale);
  const pg = act.page || SCENE.page || {};
  stage.style.background = mixc(pg.o, pg.n, EXPO(span(card ? 0 : t, ...(act.pageBg || [0.8, 0.88]))));
  // title card: a hard cut in, a short fade out into the old page
  const local = time - actStart(i);
  titleCard.style.opacity = card ? 1 : 1 - span(local, CARD, CARD + 0.25);
  titleCard.style.visibility = +titleCard.style.opacity > 0 ? 'visible' : 'hidden';
  titleCard.querySelector('.n').textContent = lang === 'zh' ? `第 ${i + 1} 幕` : `${str(lang, 'act')} ${num(i)}`;
  titleCard.querySelector('.t').textContent = T(act.title);
  const c = card ? null : chapterAt(act, t), key = (c ? c.k : 'card') + i + lang;
  if (cap._k !== key) {
    cap._k = key;
    const line = c && (c[lang] || c.en);
    cap.innerHTML = line ? `<span class="ch">${num(i)} · ${line[0]}</span>${line[1]}` : `<span class="ch">${num(i)}</span>${T(act.title)}`;
    tlabel.innerHTML = `<b>${T(act.title)}</b>${line ? ' · ' + line[0] : ''}`;
  }
  const p = (time / FILM) * 100; fill.style.width = p + '%'; knob.style.left = p + '%';
  tc.textContent = `${fmt(time)} / ${fmt(FILM)}`;
  track.setAttribute('aria-valuenow', time.toFixed(1));
  track.setAttribute('aria-valuetext', c ? `${T(act.title)}, ${(c[lang] || c.en)[0]}` : T(act.title));
  setSeg(actSeg, i);
}

/* ----- segmented controls with a sliding pill ----- */
function setSeg(seg, idx) {
  const btns = [...seg.querySelectorAll('button')];
  if (seg._idx === idx && seg._w === seg.clientWidth) return;
  seg._idx = idx; seg._w = seg.clientWidth;
  btns.forEach((b, j) => b.setAttribute('aria-pressed', j === idx));
  const b = btns[idx], pill = seg.querySelector('.pill');
  if (b) { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; }
}
const actSeg = $('actSeg'), speedSeg = $('speedSeg'), langSeg = $('langSeg');
// with reduced motion an act opens on its finished frame and does not play
const openAct = (i) => (reduce ? actStart(i) + CARD + ACT : actStart(i));
function buildSegs() {
  actSeg.querySelectorAll('button').forEach((b) => b.remove());
  ACTS.forEach((a, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = T(a.title);
    b.onclick = () => { playing = !reduce; syncPlay(); seek(openAct(i)); }; actSeg.appendChild(b); });
  actSeg._idx = -1;
  $('speedCap').textContent = str(lang, 'speed');
  $('guidesLbl').textContent = str(lang, 'guides');
}
SPEEDS.forEach((v) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v + '×';
  b.onclick = () => { speed = v; setSeg(speedSeg, SPEEDS.indexOf(v)); store.set('speed', v); }; speedSeg.appendChild(b); });
if (LANGS.length < 2) langSeg.hidden = true;
LANGS.forEach((l) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = LANG_LABEL[l] || l.toUpperCase();
  b.onclick = () => setLang(l); langSeg.appendChild(b); });
function setLang(l) {
  lang = LANGS.includes(l) ? l : LANGS[0]; document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang; store.set('lang', lang);
  setSeg(langSeg, LANGS.indexOf(lang)); buildSegs(); cap._k = ''; render();
}

/* ----- timeline: a DialKit slider with act and chapter hashmarks ----- */
track.setAttribute('aria-valuemax', FILM.toFixed(1));
ACTS.forEach((a, i) => {
  const mk = (s, cls) => { const m = document.createElement('div'); m.className = 'dk-mark' + (cls ? ' ' + cls : ''); m.style.left = (s / FILM) * 100 + '%'; track.insertBefore(m, knob); };
  if (i) mk(actStart(i), 'act');
  a.chapters.slice(1).forEach((c) => mk(actStart(i) + CARD + c.t * ACT));
});
function seek(s) { time = clamp(Number.isFinite(+s) ? +s : 0, 0, FILM); render(); }
function fromPointer(ev) { const r = track.getBoundingClientRect(); seek(clamp((ev.clientX - r.left) / r.width) * FILM); }
track.addEventListener('pointerdown', (ev) => { playing = false; syncPlay(); track.classList.add('on'); track.setPointerCapture(ev.pointerId); fromPointer(ev); track.onpointermove = fromPointer; });
track.addEventListener('pointerup', () => { track.onpointermove = null; track.classList.remove('on'); });
track.addEventListener('keydown', (ev) => {
  const step = { ArrowRight: 1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[ev.key];
  if (step) { ev.preventDefault(); playing = false; syncPlay(); seek(time + step); }
  if (ev.key === 'Home') { ev.preventDefault(); seek(0); }
  if (ev.key === 'End') { ev.preventDefault(); seek(FILM); }
});

/* ----- buttons ----- */
function syncPlay() { play.innerHTML = playing ? '<span class="pz"></span>' : '<span class="pl"></span>'; play.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
play.onclick = () => { if (!playing && time >= FILM) time = 0; playing = !playing; syncPlay(); };
const guidesBtn = $('guides');
function setGuides(on) { GUIDES = on; guidesBtn.setAttribute('aria-checked', on); store.set('guides', on ? '1' : '0'); render(); }
guidesBtn.onclick = () => setGuides(!GUIDES);
$('fs').onclick = () => {
  const el = $('stagewrap');
  if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => {});
};
addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input,textarea')) return;
  if (ev.code === 'Space' && !ev.target.closest('button,[role=slider]')) { ev.preventDefault(); play.click(); }
  if (ev.key === 'g' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) setGuides(!GUIDES);
});
function tick(now) {
  const dt = (now - last) / 1000; last = now;
  if (playing) { time = CLOCK.step(time, dt, speed); if (time >= FILM) { playing = false; syncPlay(); } render(); }
  requestAnimationFrame(tick);
}
function fit() { scale = stage.clientWidth / CFG.W; world.style.transform = `scale(${scale})`; render(); }
new ResizeObserver(fit).observe(stage);
new ResizeObserver(() => { [actSeg, speedSeg, langSeg].forEach((s) => { const k = s._idx; s._idx = -1; setSeg(s, k); }); }).observe(document.body);

/* ----- start ----- */
const savedSpeed = +store.get('speed'); if (SPEEDS.includes(savedSpeed)) speed = savedSpeed;
GUIDES = store.get('guides') !== '0'; guidesBtn.setAttribute('aria-checked', GUIDES);
// a #<act key> link opens on that act
const hashAct = ACTS.findIndex((a) => a.key === decodeURIComponent(location.hash.slice(1)));
if (hashAct > 0) time = actStart(hashAct);
if (reduce) time = openAct(Math.max(0, hashAct));  // show the finished page, no motion
buildSegs();
setSeg(speedSeg, SPEEDS.indexOf(speed));
setLang(store.get('lang') || LANGS[0]);
syncPlay(); render(); requestAnimationFrame(tick);

/* ----- for the tools (capture.js): seek and wait for paint, chrome off for frames ----- */
window.__film = {
  FILM, CARD, ACT, actStart, render,
  acts: ACTS.map((a, i) => ({ key: a.key, start: actStart(i), chapters: a.chapters.map((c) => ({ k: c.k, s: actStart(i) + CARD + c.t * ACT })) })),
  seek: (s) => { playing = false; syncPlay(); seek(s); },
  frame: (s) => new Promise((res) => { playing = false; syncPlay(); seek(s); requestAnimationFrame(() => requestAnimationFrame(() => res(time))); }),
  guides: (on) => setGuides(!!on),
  rect: () => { const b = stage.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; },
  // the stage alone at an exact pixel width: no header, caption, transport, radius or shadow
  chrome: (on, width) => {
    document.body.classList.toggle('bare', !on);
    if (!on && width) document.documentElement.style.setProperty('--bare-w', width + 'px');
    fit();
    return window.__film.rect();
  },
};
