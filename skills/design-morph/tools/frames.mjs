// Frames of a built film, for the visual pass (stills) and the MP4 (every frame at 60 fps).
// Browser-neutral: give it the page object of whichever browser the user chose, as long as it has
// evaluate(fn, arg) and cdp(method, params) (Ego lite's page does; adapt the two calls for another).
//
//   const { stills, render } = await import('<skill>/tools/frames.mjs');
//   await stills(page, { url, out: '<film>/frames', times: [4.2, 7.9], width: 1440 });
//   await render(page, { url, out: '<film>/render', width: 1920, from: 0, to: null });
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
