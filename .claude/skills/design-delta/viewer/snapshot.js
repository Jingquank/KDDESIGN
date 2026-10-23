// Run inside the built page (a browser tool's evaluate) with the piece loaded:
//   (<this file's text>)(cfg) → JSON, saved as cap.json for rebuilt.py.
// cfg = {
//   roots:  ['#quickstart'],          the piece; several roots render as siblings
//   groups: [{ match: 'start'|'exact', values: ['Mix / Remix', 'A>B'] }, …]
//           each group is one control set (workflow, language); a value is the
//           button text to press, 'A>B' presses A then B; every combination is saved
//   video:  'poster' | 'keep',        a <video> becomes its poster image, or stays (playback Changes)
//   wait:   60,                       ms after each press (keep it short: one evaluate has ~15 s)
// }
// Returns { init, states, initKey, chain, rules, missing }: the markup of every
// state with absolute media URLs, the wrapper chain up to <body>, and only the CSS
// rules that match something in the piece in any state (pseudo-classes ignored when
// matching), each with its path and @media/@supports wrappers so rebuilt.py can merge
// several pieces of one state into one stylesheet.
async (cfg) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const abs = (u, base) => { try { return new URL(u, base || document.baseURI).href } catch (e) { return u } };
  const absCss = (text, base) => text.replace(/url\(["']?([^"')]+)["']?\)/g, (m, u) => u.startsWith('data:') ? m : `url("${abs(u, base)}")`);
  const roots = () => cfg.roots.map((sel) => document.querySelector(sel));
  const missing = [];

  function snap(el) {
    const live = [el, ...el.querySelectorAll('*')];
    const c = el.cloneNode(true);
    const copy = [c, ...c.querySelectorAll('*')];
    live.forEach((l, i) => {
      const k = copy[i];
      if (l.tagName === 'IMG') { k.setAttribute('src', abs(l.currentSrc || l.src)); k.removeAttribute('srcset'); k.removeAttribute('sizes'); k.removeAttribute('loading') }
      if (l.tagName === 'VIDEO') {
        const src = abs(l.currentSrc || l.src || (l.querySelector('source') || {}).src || '');
        const poster = l.poster ? abs(l.poster) : '';
        if (cfg.video === 'keep') { k.setAttribute('src', src); if (poster) k.setAttribute('poster', poster); k.setAttribute('data-dd-clip', ''); k.innerHTML = '' }
        else { const im = document.createElement('img'); im.className = l.className; im.setAttribute('src', poster); im.setAttribute('alt', ''); im.setAttribute('style', (l.getAttribute('style') || '') + ';object-fit:cover'); k.replaceWith(im) }
      }
      if (k.hasAttribute && k.hasAttribute('style')) k.setAttribute('style', absCss(k.getAttribute('style')));
      if (k.removeAttribute) k.removeAttribute('data-hk');
    });
    c.querySelectorAll('source,script,noscript').forEach((n) => n.remove());
    return c.outerHTML;
  }

  // CSS rules in use, collected after every state renders.
  const anc = []; for (let p = roots()[0].parentElement; p; p = p.parentElement) anc.push(p);
  const test = (s) => { try { return roots().some((r) => r.matches(s) || r.querySelector(s)) || anc.some((a) => a.matches(s)) } catch (e) { return false } };
  const hit = (sel) => test(sel) || sel.replace(/::?[\w-]+(\((?:[^()]|\([^()]*\))*\))?/g, '').split(',').some((s) => test(s.trim() || '*'));
  const used = new Map();
  function walk(list, path, wrap, base) {
    [...list].forEach((r, i) => {
      const k = [...path, i];
      if (r instanceof CSSStyleRule) { if (!used.has(k.join('.')) && hit(r.selectorText)) used.set(k.join('.'), { k, wrap, text: absCss(r.cssText, base) }) }
      else if (r instanceof CSSGroupingRule && !(r instanceof CSSStyleRule)) walk(r.cssRules, k, [...wrap, r.cssText.slice(0, r.cssText.indexOf('{')).trim()], base);
      else if (!used.has(k.join('.'))) used.set(k.join('.'), { k, wrap, text: absCss(r.cssText, base) });
    });
  }
  function collect() {
    [...document.styleSheets].forEach((sh, i) => {
      if (sh.ownerNode && sh.ownerNode.id === 'dd-isolate') return;
      try { walk(sh.cssRules, [i], [], sh.href || document.baseURI) } catch (e) { missing.push('css:' + sh.href) }
    });
  }

  const html = () => roots().map(snap).join('\n');
  const btns = () => roots().flatMap((r) => [...r.querySelectorAll('button')]);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  async function press(group, value) {
    for (const step of value.split('>')) {
      const m = btns().find((b) => group.match === 'start' ? norm(b.textContent).startsWith(step) : norm(b.textContent) === step);
      if (!m) return false;
      m.click(); await sleep(cfg.wait || 60);
    }
    return true;
  }

  const out = { init: html(), states: {} };
  collect();
  const groups = cfg.groups || [];
  const combos = groups.reduce((acc, g) => acc.flatMap((a) => g.values.map((v) => [...a, v])), [[]]);
  if (groups.length) for (const combo of combos) {
    for (let i = 0; i < combo.length; i++) if (!(await press(groups[i], combo[i]))) missing.push(combo[i]);
    out.states[combo.join('|')] = html();
    collect();
  }
  else out.states[''] = out.init;
  out.initKey = Object.keys(out.states).find((k) => out.states[k] === out.init) ?? null;
  out.chain = []; for (let p = roots()[0].parentElement; p && p !== document.documentElement; p = p.parentElement) out.chain.unshift({ tag: p.tagName.toLowerCase(), id: p.id, cls: p.getAttribute('class') || '' });
  out.rules = [...used.values()];
  out.missing = missing;
  return out;
}
