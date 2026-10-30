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
  if (!c.patch && !build(join(HERE, c.dir))) { console.log(`FAIL ${name}: build failed`); failed++; continue; }
  const { findings } = check(join(HERE, c.dir), { patch: c.patch });
  const missing = c.expect.filter(([kind, re]) => !findings.some((f) => f.kind === kind && re.test(f.text)));
  const ok = c.expect.length ? !missing.length : !findings.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${findings.length} finding${findings.length === 1 ? '' : 's'}` +
    (findings.length ? ' · ' + findings.map((f) => `${f.kind} ${f.text.split('  ')[0]}`).join(' | ') : '') +
    (missing.length ? ` · missing: ${missing.map(([k, r]) => `${k} ${r}`).join(', ')}` : ''));
}
console.log(failed ? `${failed} of ${CASES.length} failed` : `All ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
