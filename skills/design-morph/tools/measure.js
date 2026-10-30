/* Measure a page for scene data: every visible box with text, a fill, a border, media or an icon,
   at the viewport the page is open at (set it to the stage size first). Paste this whole function
   into the browser's evaluate and call it with the stage size: measure({ w: 1440, h: 900 }).
   Returns { viewport, fonts, items }; each item has a CSS path, so a pair can be named in the
   mapping and found again on a re-run. Icons come back as SVG markup or an icon class, ready to
   become data URIs in assets/icons.json. */
(opts) => {
  const W = opts?.w ?? innerWidth, H = opts?.h ?? innerHeight;
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
  return { viewport: { w: innerWidth, h: innerHeight }, url: location.href, fonts, items };
}
