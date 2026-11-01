// Frames of a built film, for the visual pass (stills and the text check) and the MP4 (every frame at 60 fps).
// Browser-neutral: give it the page object of whichever browser the user chose, as long as it has
// evaluate(fn, arg) and cdp(method, params) (Ego lite's page does; adapt the two calls for another).
//
//   const { stills, render } = await import('<skill>/tools/frames.mjs');
//   await stills(page, { url, out: '<film>/frames', times: [4.2, 7.9], width: 1440 });
//   await render(page, { url, out: '<film>/render', width: 1920, from: 0, to: null });
//   const { findings } = await texts(page, { url, width: 1440 });   // text clipped by its own box
//
// url is the film served over http (python3 -m http.server <port> -d <film>), not file://.
// Each frame is: seek, wait two requestAnimationFrames, CDP screenshot clipped to the stage.
import { mkdir, writeFile } from 'node:fs/promises';

async function open(page, { url, width, guides = true }) {
  if (page.goto) await page.goto(url);
  for (let i = 0; i < 150 && !(await page.evaluate(() => !!window.__film)); i++) await new Promise((r) => setTimeout(r, 100));
  const size = await page.evaluate(() => ({ w: CFG.W, h: CFG.H, FILM: window.__film.FILM }));
  const w = Math.round(width || size.w), h = Math.round((w * size.h) / size.w);
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const rect = await page.evaluate(async ([w, g]) => { await document.fonts.ready; window.__film.guides(g); return window.__film.chrome(false, w); }, [w, guides]);
  await new Promise((r) => setTimeout(r, 600));
  return { ...size, rect, w, h };
}

async function shot(page, rect, s, format) {
  await page.evaluate((s) => window.__film.frame(s), s);
  const r = await page.cdp('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 95 } : {}),
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 } });
  return Buffer.from(r.data, 'base64');
}

// stills at film times (seconds), named <prefix>-<time>.png, for tools/sheet.py
export async function stills(page, { url, out, times, width, guides = true, prefix = 'f' }) {
  const f = await open(page, { url, width, guides });
  await mkdir(out, { recursive: true });
  for (const s of times) await writeFile(`${out}/${prefix}-${s.toFixed(2).replace('.', '_')}.png`, await shot(page, f.rect, s, 'png'));
  return { count: times.length, ...f };
}

// every frame from `from` to `to` seconds at fps, as f00000.jpg…, for tools/encode.sh
export async function render(page, { url, out, width = 1920, fps = 60, from = 0, to = null }) {
  const f = await open(page, { url, width, guides: true });
  await mkdir(out, { recursive: true });
  const end = Math.round((to ?? f.FILM) * fps);
  for (let i = Math.round(from * fps); i <= end; i++)
    await writeFile(`${out}/f${String(i).padStart(5, '0')}.jpg`, await shot(page, f.rect, i / fps, 'jpeg'));
  return { frames: end - Math.round(from * fps) + 1, ...f };
}

// The text check: seek through the film (30 times a second by default) and measure, in the page,
// the ink of every visible text layer against its element's box. Text wider or taller than its box
// is clipped by it (the box is overflow: hidden), most often mid-swap, when the old and the new
// string share one box (LESSONS.md, lesson 6). Geometry in Node cannot see letters; this can.
// Returns one finding per element and string: { id, text, act, first, last, px } in seconds and
// stage px; nothing is written to disk.
export async function texts(page, { url, width, from = 0, to = null, fps = 30, min = 1 }) {
  const f = await open(page, { url, width, guides: false });
  const end = to ?? f.FILM;
  const times = [];
  for (let i = Math.round(from * fps); i <= Math.round(end * fps); i++) times.push(i / fps);
  const found = await page.evaluate(([times, min]) => {
    const out = new Map();
    const stage = document.querySelector('.world');
    const scale = stage.getBoundingClientRect().width / CFG.W;
    const opOf = (el) => { let o = 1; for (let n = el; n && n !== stage; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none') return 0; o *= +cs.opacity; } return o; };
    const range = document.createRange();
    for (const s of times) {
      window.__film.seek(s);
      const act = window.__film.acts.findLast((a) => a.start <= s + 1e-6);
      for (const t of document.querySelectorAll('.world .el .t')) {
        if (!t.textContent.trim()) continue;
        const el = t.closest('.el'), op = opOf(t);
        if (op < 0.15) continue;
        // a box that lets its text show past it clips nothing, and an ellipsis is a cut the design chose
        if (getComputedStyle(el).overflow === 'visible') continue;
        if ([t, ...t.querySelectorAll('*')].some((n) => getComputedStyle(n).textOverflow === 'ellipsis')) continue;
        range.selectNodeContents(t);
        const ink = range.getBoundingClientRect(), box = el.getBoundingClientRect();
        if (!ink.width || !box.width) continue;
        const px = Math.max(box.left - ink.left, ink.right - box.right, box.top - ink.top, ink.bottom - box.bottom) / scale;
        if (px <= min) continue;
        const key = el.dataset.id + '|' + t.textContent.trim();
        const r = out.get(key);
        if (r) { r.last = s; r.px = Math.max(r.px, px); }
        else out.set(key, { id: el.dataset.id, text: t.textContent.trim().slice(0, 40), act: act?.key, first: s, last: s, px });
      }
    }
    return [...out.values()];
  }, [times, min]);
  return { findings: found, frames: times.length, ...f };
}
