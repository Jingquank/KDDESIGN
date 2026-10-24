// Design Changelog viewer. Fixed across runs: everything a run varies lives in the
// <script id="dd-data" type="application/json"> block of index.html (delta.json).
(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('dd-data').textContent);
  const FINAL = D.round === 'final';
  const KEY = 'dd:' + D.folder + ':r1';
  const S = Object.assign({
    round1: 'Round 1', final: 'Final', changes: 'Changes', new: 'New', fix: 'Fix', skipped: 'Skipped', all: 'All',
    before: 'Before', after: 'After', kind: 'Kind', note: 'Note', notePlaceholder: 'Why it changed, what to repeat or avoid; or merge, split, drop',
    source: 'Source', commits: 'commits', files: 'files', live: 'Open live',
    notPresent: 'Not present at', removed: 'Removed', loading: 'Loading', tall: 'px tall',
    noEdits: 'No edits yet', edited: 'Changes edited', clear: 'Clear', clearConfirm: 'Clear all edits? Click again',
    cleared: 'Edits cleared', showNotes: 'Show Notes', hideNotes: 'Hide Notes', copyNotes: 'Copy Notes', copied: 'Copied',
    selectCopy: 'Select and copy', theme: 'Theme', system: 'system', light: 'light', dark: 'dark', fidelity: 'fidelity',
    fid_real: ['Real', 'The project’s own code at each commit, running here. Click and hover as on the product. Final keeps the stills.'],
    fid_rebuilt: ['Rebuilt', 'Re-implemented from each commit’s source, scoped to what this Change is about. Final keeps the stills.'],
    fid_screenshot: ['Screenshot', 'Captured from the running product at each commit.'],
  }, D.strings || {});

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const pad = (n) => String(n).padStart(2, '0');
  const kindWord = (k) => (k === 'new' ? S.new : S.fix);

  /* ---------- theme tokens from the project's design system ---------- */
  const T = D.theme || {};
  const vars = (o) => Object.entries(o || {}).map(([k, v]) => `--dd-${k}: ${v};`).join(' ');
  let css = '';
  if (T.font && T.font.src) css += `@font-face { font-family: "${T.font.family}"; src: url(${T.font.src}) format("woff2"); font-weight: 300 900; font-display: swap; }\n`;
  css += `:root { ${vars(T.light)} ${T.font ? `--dd-font: "${T.font.family}", ui-sans-serif, system-ui, sans-serif;` : ''} ${T.radius ? `--dd-radius: ${T.radius}px;` : ''} }\n`;
  if (T.dark) {
    css += `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars(T.dark)} color-scheme: dark } }\n`;
    css += `:root[data-theme="dark"] { ${vars(T.dark)} color-scheme: dark }\n`;
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- Round 1 edits, per viewer, in browser storage ---------- */
  let edits = {};
  if (!FINAL) { try { edits = JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch (e) { edits = {} } }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(edits)) } catch (e) {} };
  const kindOf = (c) => (edits[c.id] && edits[c.id].kind) || c.kind;
  function setEdit(c, field, value) {
    const cur = edits[c.id] || {};
    if (field === 'kind') { if (value === c.kind) delete cur.kind; else cur.kind = value }
    if (field === 'note') { if (value.trim()) cur.note = value; else delete cur.note }
    if (Object.keys(cur).length) edits[c.id] = cur; else delete edits[c.id];
    save(); totals();
  }

  /* ---------- per-Change view state (not saved) ---------- */
  const view = {};
  for (const c of D.changes) view[c.id] = { width: (c.widths || [null])[0] };
  let filter = 'all';

  /* ---------- theme toggle (only when the system has both themes) ---------- */
  let theme = null;
  if (T.dark) { try { theme = localStorage.getItem('dd:theme') } catch (e) {} }
  function applyTheme() {
    if (theme) document.documentElement.setAttribute('data-theme', theme); else document.documentElement.removeAttribute('data-theme');
    const b = $('dd-theme'); if (b) b.textContent = `${S.theme}: ${S[theme || 'system']}`;
    for (const f of document.querySelectorAll('.dd-clip iframe')) post(f, { dd: 'theme', value: theme });
  }
  function post(f, msg) { try { f.contentWindow && f.contentWindow.postMessage(msg, '*') } catch (e) {} }

  /* ---------- skeleton ---------- */
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="dd-wrap">
      <header class="dd-top">
        <div class="dd-top-row"><span class="dd-round">${FINAL ? S.final : S.round1}</span>${T.dark ? '<button class="dd-pill-btn dd-hover" type="button" id="dd-theme"></button>' : ''}</div>
        <h1>${esc(D.title)}</h1>
        <div class="dd-scope" id="dd-scope"></div>
        <div class="dd-counts" id="dd-counts"></div>
      </header>
      <nav aria-label="${esc(S.changes)}"><ul class="dd-index" id="dd-index"></ul></nav>
      <main id="dd-changes" style="display:grid;gap:28px"></main>
      ${(D.skipped || []).length ? `<section class="dd-skipped" aria-labelledby="dd-sk"><h2 id="dd-sk">${esc(S.skipped)}</h2><ul id="dd-skipped"></ul></section>` : ''}
    </div>
    ${FINAL ? '' : `<div class="dd-bar"><div class="dd-bar-in">
      <span class="dd-edits" id="dd-edits"></span>
      <button class="dd-ghost dd-hover" type="button" id="dd-clear">${esc(S.clear)}</button>
      <button class="dd-ghost dd-hover" type="button" id="dd-show">${esc(S.showNotes)}</button>
      <button class="dd-copy" type="button" id="dd-copy">${esc(S.copyNotes)}</button>
    </div><div class="dd-sheet" id="dd-sheet-out" hidden><textarea id="dd-sheet" readonly aria-label="Notes"></textarea></div></div>`}
    <div class="dd-toast" id="dd-toast" role="status" hidden></div>`);

  const sc = D.scope || {};
  $('dd-scope').innerHTML = [
    sc.branch ? `<span>Branch <b class="dd-mono">${esc(sc.branch)}</b></span>` : sc.label ? `<span><b>${esc(sc.label)}</b></span>` : '',
    sc.baseline ? `<span>${esc(S.before)} <b class="dd-mono">${esc(sc.baseline.sha)}</b>${sc.baseline.date ? ' · ' + esc(sc.baseline.date) : ''}${sc.baseline.note ? ', ' + esc(sc.baseline.note) : ''}</span>` : '',
    sc.after ? `<span>${esc(S.after)} <b class="dd-mono">${esc(sc.after.sha)}</b>${sc.after.date ? ' · ' + esc(sc.after.date) : ''}${sc.after.note ? ', ' + esc(sc.after.note) : ''}</span>` : '',
    D.project ? `<span>${esc(D.project)}</span>` : '',
  ].join('');
  if ($('dd-skipped')) $('dd-skipped').innerHTML = D.skipped.map((s) => `<li>${s.what ? `<span class="dd-mono">${esc(s.what)}</span><br>` : ''}${esc(s.why)}</li>`).join('');

  /* ---------- index + changes ---------- */
  // Every side has stills; Rebuilt and Real sides also have a frame, used in Round 1 only. Final is static.
  const frameOf = (c, side) => (!FINAL && c[side] && c[side].frame) || null;

  function renderIndex() {
    $('dd-index').innerHTML = D.changes.map((c, i) => `<li><a class="dd-hover" href="#${c.id}"><span class="dd-num">${pad(i + 1)}</span><span>${esc(c.title)}</span><span class="dd-kind" data-k="${kindOf(c)}" data-ix="${c.id}">${kindWord(kindOf(c))}</span></a></li>`).join('');
  }

  function renderChanges() {
    $('dd-changes').innerHTML = D.changes.map((c, i) => {
      const k = kindOf(c), fk = FINAL ? 'screenshot' : c.fidelity, fid = S['fid_' + fk] || [fk, ''];
      const note = (edits[c.id] && edits[c.id].note) || '';
      const widths = c.widths || [];
      const live = [c.before && c.before.live ? `<a href="${esc(c.before.live)}" target="_blank" rel="noopener">${esc(S.live)} ${esc(S.before)} ↗</a>` : '', c.after && c.after.live ? `<a href="${esc(c.after.live)}" target="_blank" rel="noopener">${esc(S.live)} ${esc(S.after)} ↗</a>` : ''].filter(Boolean).join(' · ');
      return `<section class="dd-change" id="${c.id}" data-kind="${k}" aria-labelledby="${c.id}-h">
        <div class="dd-head">
          <div class="dd-title">
            <h2 id="${c.id}-h"><span class="dd-num">${pad(i + 1)} / ${pad(D.changes.length)}</span>${esc(c.title)}</h2>
            <p class="dd-desc">${esc(c.desc)}</p>
            ${c.surface ? `<p class="dd-surface">${esc(c.surface)}</p>` : ''}
            ${FINAL && c.caption ? `<p class="dd-caption">${esc(c.caption)}</p>` : ''}
          </div>
          <div class="dd-ctrls">
            <div class="dd-row">${FINAL ? `<span class="dd-kind" data-k="${k}">${kindWord(k)}</span>` : `
              <span class="dd-label">${esc(S.kind)}</span>
              <div class="dd-seg" role="group" aria-label="${esc(S.kind)}: ${esc(c.title)}">
                <button type="button" id="${c.id}-kind-new" data-kind="new" aria-pressed="${k === 'new'}">${esc(S.new)}</button>
                <button type="button" id="${c.id}-kind-fix" data-kind="fix" aria-pressed="${k === 'fix'}">${esc(S.fix)}</button>
              </div>`}
            </div>
            <div class="dd-row">
              <span class="dd-fid" title="${esc(fid[1])}"><b>${esc(fid[0])}</b> ${esc(S.fidelity)}</span>
              ${widths.length > 1 ? `<div class="dd-seg" role="group" aria-label="Width">${widths.map((w) => `<button type="button" data-width="${w}" aria-pressed="${w === view[c.id].width}">${w}</button>`).join('')}</div>` : ''}
            </div>
            ${live ? `<div class="dd-row dd-live">${live}</div>` : ''}
          </div>
        </div>
        <div class="dd-stage-host" data-id="${c.id}"></div>
        <div class="dd-foot">
          ${FINAL ? '<div></div>' : `<div class="dd-note"><label for="${c.id}-note">${esc(S.note)}</label><textarea id="${c.id}-note" placeholder="${esc(S.notePlaceholder)}">${esc(note)}</textarea></div>`}
          <details><summary>${esc(S.source)} · ${(c.commits || []).length} ${esc(S.commits)}, ${(c.files || []).length} ${esc(S.files)}</summary>
            <ul>${(c.commits || []).map((m) => `<li><span class="dd-mono">${esc(m.sha)}</span> ${esc(m.subject)}</li>`).join('')}${(c.files || []).map((f) => `<li class="dd-mono">${esc(f)}</li>`).join('')}${c.fidelityNote ? `<li>${esc(c.fidelityNote)}</li>` : ''}</ul></details>
        </div>
      </section>`;
    }).join('');
    for (const c of D.changes) wire(c);
  }

  /* ---------- stage ---------- */
  const frames = new Map(); // contentWindow -> record
  const srcOf = (c, side) => { const s = c[side]; if (!s) return null; return frameOf(c, side) || (s.src || {})[view[c.id].width]; };
  function placeholder(c, side) {
    return `<div class="dd-empty">${side === 'before' ? `${esc(S.notPresent)} ${esc((sc.baseline || {}).sha || '')}` : esc(S.removed)}</div>`;
  }
  function clip(c, side, cls) {
    const src = srcOf(c, side);
    if (!src) return `<div class="dd-clip ${cls}">${placeholder(c, side)}</div>`;
    if (frameOf(c, side)) return `<div class="dd-clip ${cls}" data-src="${esc(src)}" data-side="${side}"><div class="dd-wait">${esc(S.loading)}</div></div>`;
    const narrow = view[c.id].width && view[c.id].width < 600 ? ' dd-narrow' : '';
    return `<div class="dd-clip ${cls}${narrow}" data-side="${side}"><img src="${esc(src)}" alt="${esc(c.title)}, ${side}" loading="lazy" decoding="async"></div>`;
  }
  function stageHTML(c) {
    const b = `${esc(S.before)} · <span class="dd-mono">${esc((sc.baseline || {}).sha || '')}</span>`, a = `${esc(S.after)} · <span class="dd-mono">${esc((sc.after || {}).sha || '')}</span>`;
    return `<div class="dd-stage">
      <div class="dd-pane"><div class="dd-pane-h"><b>${b}</b><span class="dd-px" data-px="before"></span></div>${clip(c, 'before', 'dd-b')}</div>
      <div class="dd-pane"><div class="dd-pane-h"><b>${a}</b><span class="dd-px" data-px="after"></span></div>${clip(c, 'after', 'dd-a')}</div>
    </div>`;
  }
  const hostOf = (c) => document.querySelector(`.dd-stage-host[data-id="${c.id}"]`);
  function mountStage(c) {
    const host = hostOf(c);
    unload(host);
    host.innerHTML = stageHTML(c);
    for (const img of host.querySelectorAll('img')) img.addEventListener('load', () => { const px = host.querySelector(`[data-px="${img.parentNode.dataset.side}"]`); if (px && view[c.id].width) px.textContent = `${fmt(img.naturalHeight * (view[c.id].width / img.naturalWidth))} ${S.tall}`; layout(c) });
    if (host.dataset.near === '1') load(c);
    layout(c);
  }
  function load(c) {
    const host = hostOf(c);
    if (!host.querySelector('.dd-clip[data-src]') || host.dataset.loaded === '1') return;
    host.dataset.loaded = '1';
    const W = view[c.id].width || 760;
    for (const el of host.querySelectorAll('.dd-clip[data-src]')) {
      const f = document.createElement('iframe');
      f.title = `${c.title}, ${el.dataset.side}`;
      f.style.width = W + 'px'; f.style.height = '1000px';
      el.appendChild(f);
      frames.set(f.contentWindow, { c, el, f, W, top: 0, h: 0, n: 0, side: el.dataset.side });
      f.addEventListener('load', () => { post(f, { dd: 'theme', value: theme }); post(f, { dd: 'ping' }) });
      f.src = el.dataset.src;
    }
  }
  function unload(host) {
    for (const f of host.querySelectorAll('iframe')) { for (const [w, r] of frames) if (r.f === f) frames.delete(w); f.src = 'about:blank'; f.remove() }
    host.dataset.loaded = '';
  }
  addEventListener('message', (e) => {
    const m = e.data || {};
    if (m.dd !== 'size') return;
    const r = frames.get(e.source);
    if (!r) return;
    if (r.n > 8 && m.h > r.h) return; // a vh-sized sheet grows with its frame; stop following it
    r.n++; r.top = Math.max(0, m.top || 0); r.h = Math.min(m.h, 9000);
    r.f.style.height = r.h + 'px';
    const w = r.el.querySelector('.dd-wait'); if (w) w.remove();
    const px = hostOf(r.c).querySelector(`[data-px="${r.side}"]`); if (px) px.textContent = `${fmt(r.h - r.top)} ${S.tall}`;
    layout(r.c);
  });
  function layout(c) {
    for (const r of frames.values()) {
      if (r.c !== c) continue;
      const s = Math.min(1, r.el.clientWidth / r.W);
      r.f.style.transform = `scale(${s}) translateY(${-r.top}px)`;
      r.f.style.marginLeft = Math.max(0, (r.el.clientWidth - r.W * s) / 2) + 'px';
      r.el.style.height = Math.max(120, (r.h - r.top) * s) + 'px';
    }
  }
  function wire(c) {
    const sec = $(c.id);
    sec.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => {
      setEdit(c, 'kind', b.dataset.kind);
      sec.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.kind === kindOf(c))));
      const pill = document.querySelector(`[data-ix="${c.id}"]`); pill.dataset.k = kindOf(c); pill.textContent = kindWord(kindOf(c));
    }));
    const note = $(c.id + '-note'); if (note) note.addEventListener('input', (e) => setEdit(c, 'note', e.target.value));
    sec.querySelectorAll('[data-width]').forEach((b) => b.addEventListener('click', () => {
      const w = +b.dataset.width; if (view[c.id].width === w) return;
      view[c.id].width = w;
      sec.querySelectorAll('[data-width]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      mountStage(c);
    }));
  }

  // Frames load near the viewport and unload far from it, so the page never holds
  // more live scenes (WebGL contexts) than a browser allows.
  const near = new IntersectionObserver((es) => { for (const e of es) {
    if (!e.isIntersecting) continue;
    const c = D.changes.find((x) => x.id === e.target.dataset.id); e.target.dataset.near = '1'; load(c); layout(c);
  } }, { rootMargin: '900px 0px' });
  const far = new IntersectionObserver((es) => { for (const e of es) {
    if (e.isIntersecting || e.target.dataset.loaded !== '1') continue;
    const c = D.changes.find((x) => x.id === e.target.dataset.id); e.target.dataset.near = ''; e.target.style.minHeight = e.target.offsetHeight + 'px'; mountStage(c);
  } }, { rootMargin: '3200px 0px' });

  /* ---------- counts, filter, Notes ---------- */
  function totals() {
    const k = { new: 0, fix: 0 }; for (const c of D.changes) k[kindOf(c)]++;
    const cell = (key, n, label) => FINAL
      ? `<button type="button" class="dd-count dd-hover" data-filter="${key}" aria-pressed="${filter === key}"><span class="dd-n">${n}</span><span class="dd-k">${esc(label)}</span></button>`
      : `<div class="dd-count"><span class="dd-n">${n}</span><span class="dd-k">${esc(label)}</span></div>`;
    $('dd-counts').innerHTML = cell('all', D.changes.length, FINAL ? S.all : S.changes) + cell('new', k.new, S.new) + cell('fix', k.fix, S.fix) + ((D.skipped || []).length ? `<div class="dd-count"><span class="dd-n">${D.skipped.length}</span><span class="dd-k">${esc(S.skipped)}</span></div>` : '');
    if (FINAL) $('dd-counts').querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; for (const c of D.changes) $(c.id).hidden = filter !== 'all' && kindOf(c) !== filter; totals() }));
    if (FINAL) return;
    const n = Object.keys(edits).length;
    $('dd-edits').textContent = n ? `${n} / ${D.changes.length} ${S.edited}` : S.noEdits;
    if (!$('dd-sheet-out').hidden) $('dd-sheet').value = notes();
  }
  function notes() {
    const ed = D.changes.filter((c) => edits[c.id]);
    const out = [`# Notes · ${D.title} · Round 1`, `Delta: ${D.path || D.folder}`];
    if (!ed.length) return out.concat(['No edits', '', 'Make it Final as is.']).join('\n');
    out.push(`${ed.length} of ${D.changes.length} Changes edited`, '');
    for (const c of ed) {
      const e = edits[c.id], from = c.kind === 'new' ? 'New' : 'Fix';
      out.push(`## ${c.id} · ${c.title} · ${e.kind ? `${from} → ${e.kind === 'new' ? 'New' : 'Fix'}` : from}`);
      if (e.note) out.push(`- Note: ${e.note.trim().replace(/\n+/g, ' / ')}`);
      out.push('');
    }
    out.push('Every other Change keeps the agent’s Kind.');
    return out.join('\n');
  }
  let toastT;
  const toast = (msg) => { const t = $('dd-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 1800) };
  if (!FINAL) {
    $('dd-copy').addEventListener('click', () => {
      const text = notes(); $('dd-sheet').value = text;
      const fallback = () => { $('dd-sheet-out').hidden = false; $('dd-show').textContent = S.hideNotes; $('dd-sheet').focus(); $('dd-sheet').select(); toast(S.selectCopy) };
      try { navigator.clipboard.writeText(text).then(() => toast(S.copied), fallback) } catch (e) { fallback() }
    });
    $('dd-show').addEventListener('click', () => { const o = $('dd-sheet-out'); o.hidden = !o.hidden; $('dd-show').textContent = o.hidden ? S.showNotes : S.hideNotes; if (!o.hidden) $('dd-sheet').value = notes() });
    let armed = false;
    $('dd-clear').addEventListener('click', () => {
      if (!armed) { armed = true; $('dd-clear').textContent = S.clearConfirm; setTimeout(() => { armed = false; $('dd-clear').textContent = S.clear }, 3000); return }
      armed = false; edits = {}; save(); $('dd-clear').textContent = S.clear; boot(); toast(S.cleared);
    });
  }
  if ($('dd-theme')) $('dd-theme').addEventListener('click', () => {
    theme = theme === null ? 'light' : theme === 'light' ? 'dark' : null;
    try { theme ? localStorage.setItem('dd:theme', theme) : localStorage.removeItem('dd:theme') } catch (e) {}
    applyTheme();
  });

  function boot() {
    renderIndex(); renderChanges();
    for (const c of D.changes) { mountStage(c); near.observe(hostOf(c)); far.observe(hostOf(c)) }
    totals(); applyTheme();
  }
  // The page is built after load, so the browser's own jump to #c3 found nothing. (claude.ai's viewer does not pass the anchor through; local previews do.)
  const jump = () => { const el = location.hash && document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView() };
  new ResizeObserver(() => { for (const c of D.changes) layout(c) }).observe(document.body);
  boot(); jump();
  addEventListener('hashchange', jump);
})();
