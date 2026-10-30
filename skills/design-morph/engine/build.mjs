// Build a design-morph film folder into its Artifact page.
//
//   node build.mjs <film-folder>
//
// <film-folder> holds scene.json, acts/<key>.json, assets/ and, only when a component needs them,
// scene.css and types/<name>.js (SCENE.md, Extending). This writes index.html (the template with
// the scene inlined, tokens expanded), copies morph-engine.js and morph-player.js next to it, and
// prints the `files` list for publish_files. It exits 1, naming each problem, when a referenced
// asset or icon is missing or scene.css is not scoped. The stored scene files keep their tokens:
//   {{svg:assets/x.svg}}  the SVG's markup, inline (so it can take currentColor)
//   {{icon:<name>}}       the data URI of an icon in assets/icons.json (for .mi spans)
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// local work folders a run may keep beside the film; never published
const LOCAL = new Set(['frames', 'render', 'gen', 'measure', 'sheets', 'node_modules']);

export function loadFilm(folder) {
  const scene = JSON.parse(readFileSync(join(folder, 'scene.json'), 'utf8'));
  const acts = (scene.acts || []).map((a) => (typeof a === 'string' ? JSON.parse(readFileSync(join(folder, 'acts', a + '.json'), 'utf8')) : a));
  const iconsFile = join(folder, 'assets', 'icons.json');
  const icons = existsSync(iconsFile) ? JSON.parse(readFileSync(iconsFile, 'utf8')) : {};
  return { scene, acts, icons };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// scene.css: every selector must name an .x- class; each is put under .world so it cannot reach the player
export function scopeCss(css, errors) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '', i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) { if (css.slice(i).trim()) errors.push(`scene.css: text after the last rule: "${css.slice(i).trim().slice(0, 40)}"`); break; }
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (head.startsWith('@keyframes')) {
      if (!/^@keyframes\s+x-/.test(head)) errors.push(`scene.css: keyframes must be named x-…: "${head}"`);
      out += `${head}{${body}}\n`;
    } else if (head.startsWith('@')) {
      errors.push(`scene.css: at-rule not allowed: "${head}"`);
    } else {
      const sels = head.split(',').map((s) => s.trim());
      for (const s of sels) if (!/\.x-[a-z0-9-]+/i.test(s) || /(^|\s)(html|body|:root)\b/.test(s)) errors.push(`scene.css: selector must name an .x- class inside the film: "${s}"`);
      out += sels.map((s) => '.world ' + s).join(',') + `{${body}}\n`;
    }
    i = j;
  }
  return out;
}

function expand(value, folder, icons, errors) {
  if (typeof value === 'string') {
    return value
      .replace(/\{\{svg:([^}]+)\}\}/g, (_, p) => {
        const f = join(folder, p);
        if (!existsSync(f)) { errors.push(`missing ${p} (svg token)`); return ''; }
        return readFileSync(f, 'utf8').replace(/<\?xml[^>]*\?>/, '').trim();
      })
      .replace(/\{\{icon:([^}]+)\}\}/g, (_, n) => { if (!icons[n]) errors.push(`missing icon ${n} (icon token)`); return icons[n] || ''; });
  }
  if (Array.isArray(value)) return value.map((v) => expand(v, folder, icons, errors));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v, folder, icons, errors)]));
  return value;
}

// every file an element names must exist, and every mask icon must be in icons.json
function checkRefs(acts, folder, icons, errors) {
  const file = (p, where) => { if (p && !/^(data:|https?:)/.test(p) && !existsSync(join(folder, p))) errors.push(`${where}: missing ${p}`); };
  for (const a of acts) for (const e of a.els || []) {
    const where = `${a.key}/${e.id}`;
    for (const s of ['o', 'n']) {
      if (e.img?.[s]) file(e.img[s], where);
      if (e.plate?.[s]) file(e.plate[s].src, where);
      const ic = e.ico?.[s];
      if (ic) { if (ic.startsWith('img:')) file(ic.slice(4), where); else if (!icons[ic]) errors.push(`${where}: icon ${ic} is not in assets/icons.json`); }
    }
    for (const h of [e.html, e.to, e.tn]) if (typeof h === 'string') for (const m of h.matchAll(/src="([^"]+)"/g)) file(m[1], where);
  }
}

function walk(dir, root = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name), rel = relative(root, p);
    if (statSync(p).isDirectory()) { if (!LOCAL.has(name) || dir !== root) out.push(...walk(p, root)); }
    else if (!/\.(mp4|mov|zip)$/i.test(name)) out.push(rel);
  }
  return out;
}

export function build(folder) {
  folder = resolve(folder);
  const errors = [];
  const { scene, acts, icons } = loadFilm(folder);
  checkRefs(acts, folder, icons, errors);
  const th = scene.theme || {};
  const data = expand({ ...scene, acts, icons }, folder, icons, errors);
  for (const f of th.fonts || []) if (f.src && !/^(data:|https?:)/.test(f.src) && !existsSync(join(folder, f.src))) errors.push(`theme.fonts: missing ${f.src}`);
  const cssFile = join(folder, 'scene.css');
  const css = existsSync(cssFile) ? scopeCss(readFileSync(cssFile, 'utf8'), errors) : '';
  const typesDir = join(folder, 'types');
  const types = existsSync(typesDir) ? readdirSync(typesDir).filter((f) => f.endsWith('.js')).sort() : [];

  const fonts = (th.fonts || []).map((f) => `@font-face{font-family:'${f.family}';src:url("${f.src}") format('${f.format || 'woff2'}');font-weight:${f.weight || '100 900'};font-style:${f.style || 'normal'};font-display:block}`).join('\n');
  const head = [
    ...(th.fontLinks || []).map((u) => `<link rel="stylesheet" href="${esc(u)}">`),
    `<style>${fonts}\n:root{--ui:${th.ui || 'system-ui,sans-serif'};--f-old:${th.oldFont || 'system-ui,sans-serif'};--f-new:${th.newFont || th.ui || 'system-ui,sans-serif'}}</style>`,
  ].join('\n');
  const blob = JSON.stringify(data).replace(/</g, '\\u003c');
  const page = readFileSync(join(HERE, 'index.html'), 'utf8')
    .replaceAll('__TITLE__', esc(scene.title))
    .replace('__SUB__', esc(scene.sub || ''))
    .replace('__ARIA__', esc(scene.aria || `Animated walkthrough: ${scene.title}`))
    .replace('__HEAD__', () => head)
    .replace('__CSS__', () => css)
    .replace('__TYPES__', () => types.map((f) => `<script src="types/${f}"></script>`).join('\n'))
    .replace('__DATA__', () => blob);
  if (errors.length) { for (const e of errors) console.error('ERROR ' + e); process.exitCode = 1; return null; }
  writeFileSync(join(folder, 'index.html'), page);
  copyFileSync(join(HERE, 'engine.js'), join(folder, 'morph-engine.js'));
  copyFileSync(join(HERE, 'player.js'), join(folder, 'morph-player.js'));
  const files = walk(folder).sort().map((p) => ({ as: p, path: join(folder, p) }));
  const mb = files.reduce((s, f) => s + statSync(f.path).size, 0) / 1e6;
  return { files, mb };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = process.argv[2];
  if (!folder) { console.error('usage: node build.mjs <film-folder>'); process.exit(2); }
  const r = build(folder);
  if (r) { console.error(`built ${r.files.length} files, ${r.mb.toFixed(2)} MB`); console.log(JSON.stringify(r.files)); }
}
