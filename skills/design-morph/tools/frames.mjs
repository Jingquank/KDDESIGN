// Frames of a built film, for the visual pass (stills and the text check) and the MP4 (every frame at 60 fps).
// Browser-neutral: give it the page object of whichever browser the user chose, as long as it has
// evaluate(fn, arg) and cdp(method, params); adapt the two calls for a browser whose page names them otherwise.
//
//   const { stills, render } = await import('<skill>/tools/frames.mjs');
//   await stills(page, { url, out: '<film>/frames', times: [4.2, 7.9], width: 1440 });
//   await render(page, { url, out: '<film>/render', width: 1920, from: 0, to: null });
//   const { findings } = await texts(page, { url, width: 1440 });   // text clipped by its own box
//   await audio(page, { url, out: '<film>/audio.wav' });              // the Cue map, for the MP4
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

// The film's sound as a WAV (48 kHz, 16-bit stereo), for tools/encode.sh. It plays the player's own
// cue list (window.__film.cues, from sound.js) through cuelume into an offline audio context that
// keeps film time, so each cue lands on its frame and sounds as it does live. Uses evaluate only.
// It patches the page's audio, so give it a fresh load (it reloads the url when the page can goto).
// Returns { cues, seconds, peak } (peak 0..1), or { cues: 0 } for a silent film, writing nothing.
export async function audio(page, { url, out, rate = 48000 }) {
  if (page.goto) await page.goto(url);
  for (let i = 0; i < 150 && !(await page.evaluate(() => !!window.__film)); i++) await new Promise((r) => setTimeout(r, 100));
  const r = await page.evaluate(async (SR) => {
    const cues = window.__film.cues;
    if (!cues || !cues.length || !window.Cuelume) return { cues: 0 };
    const L = Math.ceil((window.__film.FILM + 0.6) * SR);
    window.__T = 0;
    // cuelume makes its context lazily: hand it an offline one whose clock is the film's
    class FilmAudio extends OfflineAudioContext {
      constructor() { super({ numberOfChannels: 2, length: L, sampleRate: SR }); window.__octx = this; }
      get state() { return 'running'; }
      get currentTime() { return window.__T; }
      resume() { return Promise.resolve(); }
    }
    window.AudioContext = FilmAudio; window.webkitAudioContext = FilmAudio;
    try { Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: true, isActive: true }, configurable: true }); } catch (e) {}
    const now = performance.now, timeout = window.setTimeout;
    performance.now = () => window.__T * 1000;   // cuelume softens quick repeats by this clock
    window.setTimeout = () => 0;                 // and its cleanup timers would cut voices mid-render
    const scene = JSON.parse(document.getElementById('dm-scene').textContent);
    Cuelume.setTheme((scene.sound && scene.sound.theme) || 'bubble'); Cuelume.setEnabled(true);
    for (const c of cues) {                      // the options player.js passes
      window.__T = c.s;
      const o = { emphasis: c.emphasis, volume: Math.max(0.02, Math.min(1, c.volume ?? 1)) };
      if (c.pitch) o.pitch = c.pitch;
      if (c.key) o.key = c.key;
      Cuelume.play(c.name, o);
    }
    window.setTimeout = timeout; performance.now = now;
    if (!window.__octx) return { cues: 0, error: 'cuelume made no audio context' };
    const buf = await window.__octx.startRendering(), ch = [buf.getChannelData(0), buf.getChannelData(1)], n = buf.length;
    let peak = 0;
    const v = new DataView(new ArrayBuffer(44 + n * 4)), tag = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    tag(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); tag(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); tag(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0, p = 44; i < n; i++) for (const d of ch) { const x = Math.max(-1, Math.min(1, d[i])); peak = Math.max(peak, Math.abs(x)); v.setInt16(p, x * 32767, true); p += 2; }
    const bytes = new Uint8Array(v.buffer); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    window.__wav = btoa(bin);
    return { cues: cues.length, seconds: n / SR, peak, size: window.__wav.length };
  }, rate);
  if (!r.cues) return r;
  let b64 = '';
  for (let i = 0; i < r.size; i += 2e6) b64 += await page.evaluate(([a, b]) => window.__wav.slice(a, b), [i, i + 2e6]);
  await writeFile(out, Buffer.from(b64, 'base64'));
  const { size, ...rest } = r;
  return rest;
}
