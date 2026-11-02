/* Measure a page for scene data: every visible box with text, a fill, a border, media or an icon,
   at the viewport the page is open at (set it to the stage size first). Paste this whole function
   into the browser's evaluate and call it with the stage size and the page's web UI font:
   measure({ w: 1440, h: 900, fonts: ['Inter'] }).
   It first waits, up to `timeout` ms (default 8000), for the page to come to rest: fonts loaded
   and each family in `fonts` among them, images in view decoded, no animation with an end moving
   or fading anything, nothing busy (aria-busy, a skeleton), the layout still for 300 ms. A box
   measured in a fallback font or mid-entrance is the wrong box for the whole film.
   Returns { ready, viewport, url, fonts, items }: `ready` is { status: 'ready' | 'inconclusive',
   waited, reasons, notes }, notes naming animations that never end. Each item has a CSS path, so
   a pair can be named in the mapping and found again on a re-run. Icons come back as SVG markup
   or an icon class, ready to become data URIs in assets/icons.json. */
async (opts) => {
  const W = opts?.w ?? innerWidth, H = opts?.h ?? innerHeight;
  const ready = await (async () => {
    const want = opts?.fonts || [], timeout = opts?.timeout ?? 8000, t0 = performance.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
      (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.right > 0 && r.top < H && r.left < W; };
    const moves = /^(transform|translate|rotate|scale|opacity|width|height|top|left|right|bottom|inset|margin.*|padding.*|clipPath|filter)$/;
    const BUSY = '[aria-busy="true"], [class*="skeleton" i], [class*="shimmer" i]';
    const look = () => {
      const reasons = [], notes = [], endless = [];
      if (document.fonts.status !== 'loaded') reasons.push('fonts are still loading');
      const loaded = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
      for (const family of want) if (!loaded.has(family)) reasons.push(`font "${family}" is not loaded`);
      for (const img of document.querySelectorAll('img')) if (inView(img) && !(img.complete && img.naturalWidth)) reasons.push(`${label(img)} has not loaded`);
      for (const a of document.getAnimations()) {
        const el = a.effect?.target;
        if (a.playState !== 'running' || !(el instanceof Element) || !inView(el)) continue;
        const props = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((p) => moves.test(p)))];
        if (!props.length) continue;
        if (a.effect.getComputedTiming().endTime === Infinity) { notes.push(`${label(el)} animates ${props.join(', ')} without end`); endless.push(el); }
        else reasons.push(`${label(el)} is still animating ${props.join(', ')}`);
      }
      for (const el of document.querySelectorAll(BUSY)) if (inView(el)) reasons.push(`${label(el)} is busy`);
      const shape = [...document.body.querySelectorAll('*')].filter((el) => !endless.some((e) => e.contains(el)) && inView(el))
        .slice(0, 600).map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }).join(' ');
      return { reasons, notes, shape };
    };
    await Promise.race([document.fonts.ready, sleep(timeout)]);
    for (let last = null; ;) {
      const { reasons, notes, shape } = look();
      const still = shape === last, waited = Math.round(performance.now() - t0);
      last = shape;
      if (!reasons.length && still) return { status: 'ready', waited, reasons, notes };
      if (waited > timeout) return { status: 'inconclusive', waited, reasons: still ? reasons : [...reasons, 'the layout is still moving'], notes };
      await sleep(300);
    }
  })();
  const path = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.body; e = e.parentElement) {
      if (e.id) { parts.unshift('#' + CSS.escape(e.id)); break; }
      const sib = [...(e.parentElement?.children || [])].filter((s) => s.tagName === e.tagName);
      parts.unshift(e.tagName.toLowerCase() + (sib.length > 1 ? `:nth-of-type(${sib.indexOf(e) + 1})` : ''));
    }
    return parts.join('>');
  };
  const items = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.y >= H || r.x >= W || r.bottom <= 0 || r.right <= 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const svg = el.tagName.toLowerCase() === 'svg';
    const iconClass = [...el.classList].find((c) => /^i-[a-z0-9-]+:/.test(c));
    const media = ['IMG', 'VIDEO', 'CANVAS', 'PICTURE'].includes(el.tagName);
    const fill = cs.backgroundColor !== 'rgba(0, 0, 0, 0)', border = cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none';
    const bgImg = cs.backgroundImage !== 'none' ? cs.backgroundImage : null;
    if (!own && !fill && !border && !bgImg && !media && !svg && !iconClass && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) continue;
    items.push({
      path: path(el), tag: el.tagName.toLowerCase(), txt: own.slice(0, 80) || el.getAttribute('aria-label') || el.placeholder || undefined,
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      fs: parseFloat(cs.fontSize), fw: +cs.fontWeight, ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''), ls: cs.letterSpacing, c: cs.color,
      bg: fill ? cs.backgroundColor : undefined, bgImg: bgImg && !bgImg.startsWith('linear') ? bgImg.slice(0, 300) : bgImg || undefined,
      bd: border ? `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}` : undefined,
      r: cs.borderRadius !== '0px' ? cs.borderRadius : undefined, corner: cs.cornerShape && cs.cornerShape !== 'round' ? cs.cornerShape : undefined,
      op: +cs.opacity !== 1 ? +cs.opacity : undefined, shadow: cs.boxShadow !== 'none' ? cs.boxShadow : undefined,
      src: media ? (el.currentSrc || el.src || el.poster || '').slice(0, 300) : undefined,
      icon: iconClass || undefined, svg: svg && r.width <= 64 ? el.outerHTML.slice(0, 4000) : undefined,
    });
  }
  const fonts = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')))];
  return { ready, viewport: { w: innerWidth, h: innerHeight }, url: location.href, fonts, items };
}
