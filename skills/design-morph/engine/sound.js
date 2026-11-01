/* Morph sound: the Cue map. One fixed table from the moments of a Morph film to cuelume cues, read
   from the prepared acts, so every film sounds by the same rules (CONTEXT.md, Cue map). A run never
   edits this file; a film changes it only through scene.json `sound` (SCENE.md). Touches no DOM and
   plays nothing: player.js plays the list, and the evals check it in Node.

   What sounds:
   - every element outside a stagger, as it lands (an exit halfway out): enters open, exits close,
     moves tap. Volume and weight follow its salience (how much of the stage it covers, how far it
     travels, how much it resizes, each ranked across the film); pitch follows its size, big low.
     The faintest fifth make no sound.
   - each item of a staggered group (6 or more start times), as rain: tap, select and a keystroke
     in turn, pitch wandering by up to a minor third, volume 60 to 100% of its salience.
   - the Guides, quietly: the grid traced (ready) and each spec tag appearing (attention).
   - the skin turn: one toggle, strong.
   Silent: the title card and the act's end.
   Then two passes over the whole film: the crowd mix (a cue among n within 150 ms plays at 1/√n,
   so a busy stagger is no louder than one big landing) and the repeat rule (a cue never sounds as
   its last play did, however long ago: a semitone or more apart, and softer when the volumes are
   close; never louder). */

const SOUND_VERSION = 1;

function soundCues(acts, clock, stage, opts = {}) {
  const W = stage.W, H = stage.H, DIAG = Math.hypot(W, H);
  const mute = opts.mute || {};
  const at = (i, t) => clock.actStart(i) + clock.card + t * clock.act;
  const box = (s) => (s && s.w > 0 && s.h > 0 ? s : null);
  const semi = (k) => 2 ** (k / 12);
  const rnd = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };   // steady, so a replay sounds the same

  // salience, ranked across the film so one act's huge cover does not mute the rest
  const all = [];
  acts.forEach((a, i) => a.els.forEach((e) => {
    if (!e.wL) return;
    const o = box(e.o) || box(e.n), n = box(e.n) || o;
    if (!o) return;
    const ao = o.w * o.h, an = n.w * n.h;
    all.push({ e, area: Math.max(ao, an) / (W * H),
      travel: e.role === 'move' ? Math.hypot(n.x + n.w / 2 - o.x - o.w / 2, n.y + n.h / 2 - o.y - o.h / 2) / DIAG : 0,
      resize: Math.min(2, Math.abs(Math.log((an + 1) / (ao + 1)))) });
  }));
  for (const k of ['area', 'travel', 'resize']) {
    const v = all.map((x) => x[k]).sort((p, q) => p - q);
    all.forEach((x) => (x[k + 'R'] = v.findIndex((y) => y >= x[k]) / Math.max(1, v.length - 1)));
  }
  const SAL = new Map();
  for (const x of all) {
    // a fade in place reads less than a move, an arrival more than a departure
    const role = x.e.role === 'exit' ? 0.75 : x.e.role === 'enter' ? 0.95 : 1;
    SAL.set(x.e, { sal: Math.min(1, (0.55 * x.areaR + 0.35 * x.travelR + 0.1 * x.resizeR) * role), size: x.areaR });
  }
  const sal = (e) => (SAL.get(e) || { sal: 0 }).sal, size = (e) => (SAL.get(e) || { size: 0.5 }).size;
  const weight = (s) => (s > 0.72 ? 'strong' : s > 0.35 ? 'normal' : 'subtle');
  const ROLE = { enter: 'open', exit: 'close', move: 'tap' };

  // cues closer than `gap` s inside one layer merge into the loudest of them
  const thin = (cs, gap) => {
    const out = [];
    for (const c of cs.sort((x, y) => x.s - y.s)) {
      const p = out[out.length - 1];
      if (p && c.s - p.s < gap) { if ((c.volume ?? 1) > (p.volume ?? 1)) out[out.length - 1] = c; } else out.push(c);
    }
    return out;
  };

  const cues = [];
  acts.forEach((a, i) => {
    const els = a.els.filter((e) => e.wL && !mute[e.id]);
    const landAt = (e) => at(i, e.role === 'exit' ? e.wL[0] + 0.5 * (e.wL[1] - e.wL[0]) : e.wL[1]);
    const staggers = Object.keys(a.win || {}).filter((g) => g !== 'skin' && g !== 'grid').map((g) => els.filter((e) => e.g === g))
      .filter((g) => new Set(g.map((e) => e.wL[0].toFixed(3))).size >= 6);
    const inStagger = new Set(staggers.flat());

    // single elements, by salience
    thin(els.filter((e) => !inStagger.has(e) && sal(e) >= 0.2).map((e) => ({ s: landAt(e), name: ROLE[e.role], emphasis: weight(sal(e)),
      volume: 0.08 + 0.92 * sal(e), pitch: 1.45 - 0.83 * size(e), id: e.id, act: i })), 0.04).forEach((c) => cues.push(c));

    // staggers, as rain
    const KINDS = ['tap', 'select', 'type'];
    for (const g of staggers) {
      thin(g.map((e) => ({ s: landAt(e), id: e.id, e })), 0.055).forEach((c, k) => {
        const r1 = rnd(k + 1 + i * 97), r2 = rnd(k + 51 + i * 31), name = KINDS[k % 3];
        cues.push({ s: c.s, name, emphasis: 'subtle', key: name === 'type' ? (r1 > 0.8 ? 'space' : 'letter') : undefined,
          pitch: semi((r1 - 0.5) * 6), volume: (0.6 + 0.4 * r2) * (0.35 + 0.65 * sal(c.e)), id: c.id, act: i });
      });
    }

    // the Guides, quietly
    if (a.win && a.win.grid) cues.push({ s: at(i, a.win.grid[1]), name: 'ready', emphasis: 'subtle', volume: 0.4, act: i, guide: true });
    for (const e of els) if (e.spec && e.role !== 'exit') cues.push({ s: at(i, e.wL[0] + 0.33 * (e.wL[1] - e.wL[0])), name: 'attention', emphasis: 'subtle', volume: 0.4, id: e.id, act: i, guide: true });

    // the skin turn
    const sk = (a.win && a.win.skin) || [0.8, 0.93];
    cues.push({ s: at(i, sk[0] + 0.3 * (sk[1] - sk[0])), name: 'toggle', emphasis: 'strong', act: i });
  });
  cues.sort((x, y) => x.s - y.s);

  // the crowd mix
  let lo = 0;
  const vols = cues.map((c, k) => {
    while (cues[lo].s < c.s - 0.15) lo++;
    let n = 0; for (let j = lo; j < cues.length && cues[j].s <= c.s + 0.15; j++) n++;
    return (c.volume ?? 1) / Math.sqrt(n);
  });
  cues.forEach((c, k) => (c.volume = vols[k]));
  return varyRepeats(cues);
}

// the repeat rule: each play of a cue moves at least a semitone from its last play (trying steps up
// and down in turn, also clear of the play before that) and, when the volumes are within 10%, plays
// 14% softer. Never louder.
function varyRepeats(cues) {
  const NUDGE = [1.5, -1.25, 2, -1.75, 1, -2.25];
  const semi = (k) => 2 ** (k / 12), fit = (x) => Math.max(0.58, Math.min(1.75, x));
  const near = (a, b) => b && Math.abs(12 * Math.log2(a / b)) < 1;
  const lastOf = new Map(), runs = new Map();
  for (const c of cues) {
    const p = lastOf.get(c.name);
    if (p) {
      const run = (runs.get(c.name) || 0) + 1; runs.set(c.name, run);
      const pc = p.pitch || 1, before = p.prevPitch;
      if (near(c.pitch || 1, pc) || near(c.pitch || 1, before)) {
        const tries = NUDGE.map((_, k) => fit(pc * semi(NUDGE[(run + k) % NUDGE.length])));
        c.pitch = tries.find((x) => !near(x, pc) && !near(x, before)) || tries.find((x) => !near(x, pc)) || fit(pc * semi(-2));
      }
      const pv = p.volume ?? 1, cv = c.volume ?? 1;
      if (Math.abs(cv - pv) < 0.1 * Math.max(pv, 0.1)) c.volume = Math.max(0.02, cv * 0.86);
      c.prevPitch = pc;
    }
    lastOf.set(c.name, c);
  }
  return cues;
}
