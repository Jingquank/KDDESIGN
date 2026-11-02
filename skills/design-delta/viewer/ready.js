/* Wait until a surface is at rest before its still is taken, or say why it is not. Paste this
   whole function into the browser's evaluate and call it with the surface:
   ready({ selector: '#rate', fonts: ['Inter'], timeout: 8000 }).
   Ready means: the page's fonts have loaded, and each family in `fonts` among them (web fonts
   only; a system font is never in the list); every image and video in view under the selector
   has its pixels; no animation with an end is moving, resizing or fading anything there; nothing
   there is busy (aria-busy, a skeleton, a shimmer); and its layout holds still for 300 ms.
   Returns { status: 'ready' | 'inconclusive', waited, reasons, notes }. Notes name endless
   animations (a spinner, a marquee): they never end, so a still catches them at one moment. */
async (opts = {}) => {
  const root = (opts.selector && document.querySelector(opts.selector)) || document.body;
  const fonts = opts.fonts || [], timeout = opts.timeout ?? 8000, t0 = performance.now();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  };
  const near = (el) => root.contains(el) || el.contains(root);
  const moves = /^(transform|translate|rotate|scale|opacity|width|height|top|left|right|bottom|inset|margin.*|padding.*|clipPath|filter)$/;
  const BUSY = '[aria-busy="true"], [class*="skeleton" i], [class*="shimmer" i]';

  const look = () => {
    const reasons = [], notes = [], endless = [];
    if (document.fonts.status !== 'loaded') reasons.push('fonts are still loading');
    const loaded = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
    for (const family of fonts) if (!loaded.has(family)) reasons.push(`font "${family}" is not loaded`);
    for (const img of root.querySelectorAll('img')) {
      if (inView(img) && !(img.complete && img.naturalWidth)) reasons.push(`${name(img)} has not loaded`);
    }
    for (const v of root.querySelectorAll('video')) {
      if (inView(v) && v.readyState < 2 && !v.poster) reasons.push(`${name(v)} has no frame yet`);
    }
    for (const a of document.getAnimations()) {
      const el = a.effect?.target;
      if (a.playState !== 'running' || !(el instanceof Element) || !near(el)) continue;
      const props = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((p) => moves.test(p)))];
      if (!props.length) continue;
      if (a.effect.getComputedTiming().endTime === Infinity) {
        notes.push(`${name(el)} animates ${props.join(', ')} without end`);
        endless.push(el);
      } else reasons.push(`${name(el)} is still animating ${props.join(', ')}`);
    }
    for (const el of [root, ...root.querySelectorAll(BUSY)]) {
      if (el.matches(BUSY) && inView(el)) reasons.push(`${name(el)} is busy`);
    }
    // Where everything in view sits, minus what moves for ever: two equal readings 300 ms apart
    // mean the layout has stopped.
    const shape = [...root.querySelectorAll('*')].filter((el) => !endless.some((e) => e.contains(el)) && inView(el))
      .slice(0, 400).map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }).join(' ');
    return { reasons, notes, shape };
  };

  await Promise.race([document.fonts.ready, sleep(timeout)]);
  let last = null;
  for (;;) {
    const { reasons, notes, shape } = look();
    const still = shape === last;
    last = shape;
    const waited = Math.round(performance.now() - t0);
    if (!reasons.length && still) return { status: 'ready', waited, reasons, notes };
    if (waited > timeout) return { status: 'inconclusive', waited, reasons: still ? reasons : [...reasons, 'the layout is still moving'], notes };
    await sleep(300);
  }
}
