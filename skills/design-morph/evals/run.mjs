// The engine-layer evals: the clean scene must check clean, and each broken scene must be caught
// with the finding it was built to reproduce. No browser, about a second.
//
//   node evals/run.mjs
import { check } from '../engine/check.mjs';
import { build } from '../engine/build.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES = [
  { dir: 'clean', expect: [] },
  { dir: 'broken/exit-without-op', expect: [['leftover', /^r\.settings /]] },
  { dir: 'broken/label-leaves-card', expect: [['outside', /^c\.oneL crosses the edge of c\.one/]] },
  { dir: 'broken/siblings-overlap', expect: [['overlap', /^c\.one × c\.two /]] },
  { dir: 'broken/time-backwards', expect: [['time', /^window "panel" steps backwards/], ['time', /^chapter "cards" .* steps backwards/]] },
  // a waypoint in the element's own group: the engine once gave it no layout window, so it jumped at t 0.5
  { dir: 'clean-own-group-via', expect: [] },
  { dir: 'broken/snap', expect: [['snap', /^h\.title jumps /]] },
  { dir: 'broken/drift', expect: [['drift', /^c\.oneL pulls .* away from c\.one /]] },
  { dir: 'broken/row-drift', expect: [['drift', /^r\.homeI pulls .* away from r\.home .* side by side/]] },
  { dir: 'broken/tag', expect: [['tag', /^the tag "row 120 × 20" on r\.gallery covers r\.home /]] },
  { dir: 'broken/orphan', expect: [['orphan', /^p\.head lands .* before p\.card/]] },
  { dir: 'broken/void', expect: [['void', /^pane m\.pane is /]] },
  { dir: 'broken/icon-grows', expect: [['icon', /^h\.search's old icon is drawn at /]] },
  // CSS animation runs on the wall clock, out of reach of a seek: build refuses it
  { dir: 'broken/css-animation', buildErrors: [/@keyframes is not allowed/, /"animation" is not allowed/, /"transition" is not allowed/] },
  // the reference player's clock, before it was clamped: a negative dt and an early seek reached ACTS[-1]
  { dir: 'clean', name: 'clock without clamps', expect: [['time', /^player clock leaves the film/]],
    patch: `filmClock = function (n, card, actLen) { const per = card + actLen, FILM = n * per;
      return { FILM, card, act: actLen, actStart: (i) => i * per,
        where: (s) => { const i = Math.min(n - 1, Math.floor(s / per)); return { i, card: false, t: 0 }; },
        step: (time, dt, speed) => time + dt * speed }; };` },
];

let failed = 0;
for (const c of CASES) {
  const name = c.name || c.dir;
  if (c.buildErrors) {
    const said = [], err = console.error;
    console.error = (m) => said.push(String(m));
    const built = build(join(HERE, c.dir));
    console.error = err; process.exitCode = 0;
    const missing = c.buildErrors.filter((re) => !said.some((m) => re.test(m)));
    const ok = !built && !missing.length;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: build ${built ? 'passed' : `refused (${said.length} error${said.length === 1 ? '' : 's'})`}` +
      (missing.length ? ` · missing: ${missing.join(', ')}` : ''));
    continue;
  }
  if (!c.patch && !build(join(HERE, c.dir))) { console.log(`FAIL ${name}: build failed`); failed++; continue; }
  const { findings } = check(join(HERE, c.dir), { patch: c.patch });
  const missing = c.expect.filter(([kind, re]) => !findings.some((f) => f.kind === kind && re.test(f.text)));
  const ok = c.expect.length ? !missing.length : !findings.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${findings.length} finding${findings.length === 1 ? '' : 's'}` +
    (findings.length ? ' · ' + findings.map((f) => `${f.kind} ${f.text.split('  ')[0]}`).join(' | ') : '') +
    (missing.length ? ` · missing: ${missing.map(([k, r]) => `${k} ${r}`).join(', ')}` : ''));
}
// color: the skin turn keeps a near hue's chroma and never routes far hues through a third one
{
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const ctx = vm.createContext({ console });
  vm.runInContext(readFileSync(join(HERE, '../engine/engine.js'), 'utf8'), ctx);
  ctx.configure({});
  const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const [r1, g1, b1] = rgb(ctx.mixc('#f5a524', '#2f6fed', 0.5));      // amber to blue
  const [r2, g2, b2] = rgb(ctx.mixc('#b8ff38', '#00e05a', 0.5));      // two greens
  const violet = b1 > g1 + 20 && r1 > g1 + 20;   // a third hue, both red and blue well over green
  const ok = !violet && g2 > r2 + 40 && g2 > b2 + 40;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} color mixing: amber to blue mid rgb(${r1},${g1},${b1}), green to green mid rgb(${r2},${g2},${b2})`);
  CASES.push({});
}
// sound: the Cue map stays silent on the title card and after the skin turn, never repeats a cue as
// it last sounded, and drops a muted element
{
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const { loadFilm } = await import('../engine/build.mjs');
  const ctx = vm.createContext({ console });
  for (const f of ['engine.js', 'sound.js']) vm.runInContext(readFileSync(join(HERE, '../engine', f), 'utf8'), ctx, { filename: f });
  const { scene, acts: raw } = loadFilm(join(HERE, 'clean'));
  ctx.configure(scene);
  const acts = raw.map((a) => ctx.prepareAct(a));
  const clock = ctx.filmClock(acts.length, scene.timing?.card ?? 0.8, scene.timing?.act ?? 20 / 1.5);
  const stage = { W: scene.stage?.w ?? 1440, H: scene.stage?.h ?? 900 };
  const cues = ctx.soundCues(acts, clock, stage, {});
  const bad = [];
  if (cues.length < 3) bad.push(`only ${cues.length} cues`);
  acts.forEach((a, i) => {
    const mine = cues.filter((c) => c.act === i), turn = mine.find((c) => c.name === 'toggle');
    if (!turn || turn.emphasis !== 'strong') bad.push(`act ${a.key}: no strong skin turn`);
    if (mine.some((c) => c.s < clock.actStart(i) + clock.card)) bad.push(`act ${a.key}: a cue on the title card`);
    if (turn && mine.some((c) => c.s > turn.s)) bad.push(`act ${a.key}: a cue after the skin turn`);
  });
  const last = {};
  for (const c of cues) {
    const p = last[c.name];
    if (p && Math.abs(12 * Math.log2((c.pitch || 1) / (p.pitch || 1))) < 1 && Math.abs((c.volume ?? 1) - (p.volume ?? 1)) < 0.1 * Math.max(p.volume ?? 1, 0.1))
      bad.push(`${c.name} at ${c.s.toFixed(2)} s sounds as its last play did`);
    if (!(c.volume > 0 && c.volume <= 1)) bad.push(`${c.name} at ${c.s.toFixed(2)} s has volume ${c.volume}`);
    last[c.name] = c;
  }
  const muted = cues.find((c) => c.id && !c.guide);
  if (muted && ctx.soundCues(acts, clock, stage, { mute: { [muted.id]: 'eval' } }).some((c) => c.id === muted.id && !c.guide))
    bad.push(`muting ${muted.id} left its cue`);
  if (bad.length) failed++;
  console.log(`${bad.length ? 'FAIL' : 'PASS'} sound: ${cues.length} cues` + (bad.length ? ' · ' + bad.slice(0, 4).join(' | ') : ''));
  CASES.push({});
}
console.log(failed ? `${failed} of ${CASES.length} failed` : `All ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
