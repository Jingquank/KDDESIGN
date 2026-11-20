/* cuelume 0.2.8 (https://github.com/danielwh2/cuelume), bundled for design-morph with esbuild as the
   global Cuelume. One change from the release: play(name, { pitch }) scales a cue's pitch (0.5 to 2),
   which the Cue map uses for size and the repeat rule (sounds/context.js: contextFrom and shapeFor;
   the layer pitch clamp widened from 0.75–1.25 to 0.55–1.8). To rebuild: npm i cuelume@0.2.8, make that
   change in dist/sounds/context.js, then esbuild dist/index.js --bundle --format=iife
   --global-name=Cuelume (not minified, so it stays readable), and put this header back on top.

   MIT License
   
   Copyright (c) 2026 Daniel Belyi
   
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:
   
   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.
   
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
*/
var Cuelume = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/cuelume/dist/index.js
  var index_exports = {};
  __export(index_exports, {
    bind: () => bind,
    play: () => play,
    press: () => press,
    release: () => release,
    setEnabled: () => setEnabled,
    setTheme: () => setTheme,
    setVolume: () => setVolume,
    sounds: () => sounds,
    themes: () => themes,
    unlock: () => unlock
  });

  // node_modules/cuelume/dist/sounds/layers.js
  var LANDED = 2;
  var KNOCK_DROP = 1.6;
  var KNOCK_DROP_TIME = 0.018;
  var knock = (frequency, decay, peak, more = {}) => ({
    kind: "tone",
    waveform: "sine",
    frequency: frequency * KNOCK_DROP,
    glideTo: frequency,
    glideTime: KNOCK_DROP_TIME,
    attack: 1e-3,
    decay,
    peak,
    ...more
  });
  var BAR = [[1, 1], [2.76, 0.3], [5.4, 0.1]];
  var MALLET = [[1, 1], [3.99, 0.2]];
  var MODE_CEILING = 5e3;
  var STRIKE_ATTACK = 3e-3;
  var SHORTEST_MODE = 0.028;
  var MODE_DAMPING = 0.75;
  function struck(frequency, decay, peak, material, { from } = {}) {
    return material.filter(([ratio]) => frequency * ratio <= MODE_CEILING).map(([ratio, level], mode) => {
      const layerFrom = mode === 0 ? from : from ?? "normal";
      return {
        kind: "tone",
        waveform: "sine",
        frequency: frequency * ratio,
        attack: STRIKE_ATTACK,
        decay: Math.max(SHORTEST_MODE, decay / ratio ** MODE_DAMPING),
        peak: peak * level,
        ...layerFrom ? { from: layerFrom } : {}
      };
    });
  }
  var FLAT_Q = -3;
  var contact = (hardness, peak, more = {}) => ({
    kind: "noise",
    filterType: "lowpass",
    filterFrequency: hardness,
    filterQ: FLAT_Q,
    attack: 1e-3,
    decay: 35e-4,
    peak,
    ...more
  });
  var ring = (frequency, peak, more = {}) => ({
    kind: "noise",
    filterType: "bandpass",
    filterFrequency: frequency,
    filterQ: 8,
    attack: 1e-3,
    decay: 55e-4,
    peak,
    ...more
  });
  var CLICK_BODY = 0.675;
  var click = (frequency, peak, more = {}) => [
    ring(frequency, peak, more),
    ring(frequency * CLICK_BODY, peak * 0.5, { filterQ: 2, ...more })
  ];
  var air = (from, to, decay, peak, more = {}) => ({
    kind: "noise",
    filterType: "bandpass",
    filterFrequency: from,
    glideTo: to,
    glideTime: decay,
    filterQ: 1.5,
    attack: 8e-3,
    decay,
    peak,
    ...more
  });
  var thud = (frequency, decay, peak, more = {}) => ({
    kind: "noise",
    filterType: "lowpass",
    filterFrequency: frequency,
    filterQ: 0.7,
    attack: 1e-3,
    decay,
    peak,
    ...more
  });
  var NOTE_PARTIALS = [[1, 1, 1], [2, 0.9, 0.5], [3, 1, 0.04], [4, 0.73, 0.056]];
  var NOTE_SHARP = 1.09;
  var NOTE_SETTLE = 0.015;
  var NOTE_SWELL = 0.11;
  function note(frequency, decay, peak, { from } = {}) {
    const attack = Math.min(NOTE_SWELL, decay / 2);
    return NOTE_PARTIALS.map(([multiple, length, level], partial) => {
      const layerFrom = partial < 2 ? from : from ?? "normal";
      return {
        note: true,
        kind: "tone",
        waveform: "sine",
        frequency: frequency * multiple * NOTE_SHARP,
        glideTo: frequency * multiple,
        glideTime: NOTE_SETTLE,
        attack,
        decay: decay * length,
        peak: peak * level,
        ...layerFrom ? { from: layerFrom } : {}
      };
    });
  }

  // node_modules/cuelume/dist/sounds/bubble.js
  var slide = (from, to, time, decay, peak, more = {}) => ({
    kind: "tone",
    waveform: "sine",
    frequency: from,
    glideTo: to,
    glideTime: time,
    attack: 2e-3,
    decay,
    peak,
    ...more
  });
  var bloop = (frequency, decay, peak, more = {}) => slide(frequency, frequency * 1.5, 0.04, decay, peak, more);
  var drip = (frequency, decay, peak, more = {}) => slide(frequency, frequency * 1.5, 0.012, decay, peak, { attack: 1e-3, ...more });
  var pop = (filterFrequency, peak, more = {}) => ({
    kind: "noise",
    filterType: "lowpass",
    filterFrequency,
    filterQ: 0.9,
    attack: 1e-3,
    decay: 32e-4,
    peak,
    ...more
  });
  var LIVELY = { pitch: 0.06, level: 0.1 };
  var STEADY = { pitch: 0, level: 0.08 };
  var BUBBLE = {
    /** A keycap landing on water: a soft knock that blooms into a small bubble. A little different every time. */
    tap: {
      masterGain: 0.411,
      layers: [
        knock(300, 0.0216, 0.06),
        bloop(600, 0.0489, 0.014, { attack: 0.012 }),
        knock(600, 0.0165, 0.015, { from: "normal" }),
        knock(150, 0.0389, 0.05, { from: "strong" })
      ],
      vary: { pitch: 0.08, level: 0.1 }
    },
    /** A keycap popping up: a higher, shorter knock, pitched differently every stroke. */
    type: {
      masterGain: 0.383,
      layers: [
        knock(415, 0.0151, 0.06),
        pop(2500, 0.03, { from: "normal" }),
        knock(208, 0.0278, 0.05, { from: "strong" })
      ],
      vary: { pitch: 0.1, level: 0.2 }
    },
    /** A drip: the only quick flick upward. A later option drips higher, an earlier one lower. */
    select: {
      masterGain: 0.214,
      layers: [
        drip(700, 0.0278, 0.05),
        pop(3e3, 0.075, { from: "normal" }),
        bloop(350, 0.0606, 0.03, { from: "strong" })
      ],
      vary: { pitch: 0.03, level: 0.1 }
    },
    /** A cork: a soft thup as the air rushes up an octave. Switching off sinks it. */
    toggle: {
      masterGain: 0.175,
      layers: [
        { kind: "noise", filterType: "lowpass", filterFrequency: 900, filterQ: 0.9, attack: 1e-3, decay: 779e-5, peak: 0.12 },
        slide(330, 660, 0.06, 0.0791, 0.045, { attack: 3e-3 }),
        slide(990, 1485, 0.02, 0.045, 0.01, { from: "normal", attack: 0.03 }),
        slide(165, 330, 0.06, 0.0969, 0.03, { from: "strong" })
      ],
      vary: { pitch: 0.04, level: 0.1 }
    },
    /** A balloon filling: one slow swell that rises a ninth. */
    open: {
      masterGain: 0.221,
      layers: [
        slide(220, 520, 0.14, 0.0692, 0.04, { attack: 0.1 }),
        slide(330, 780, 0.14, 0.0866, 0.012, { from: "normal", attack: 0.1 }),
        slide(110, 260, 0.14, 0.0969, 0.03, { from: "strong", attack: 0.1 })
      ],
      vary: LIVELY
    },
    /** A gulp: one fast fall. */
    close: {
      masterGain: 0.357,
      layers: [
        slide(700, 220, 0.07, 0.0905, 0.045, { attack: 4e-3 }),
        pop(1200, 0.06, { from: "normal" }),
        slide(350, 110, 0.07, 0.121, 0.03, { from: "strong", attack: 4e-3 })
      ],
      vary: LIVELY
    },
    /** One bubble rising a fifth, C to G, in a small room. */
    success: {
      masterGain: 0.52,
      layers: [
        slide(523.25, 783.99, 0.08, 0.323, 0.04, { attack: 3e-3 }),
        slide(1046.5, 1567.98, 0.08, 0.12, 0.01, { from: "normal", attack: 3e-3 }),
        slide(261.63, 392, 0.08, 0.391, 0.02, { from: "strong", attack: 3e-3 })
      ],
      room: LANDED,
      vary: STEADY
    },
    /** One bubble sinking a fourth, F to C: a soft "uh-oh". */
    error: {
      masterGain: 0.387,
      layers: [
        slide(349.23, 261.63, 0.14, 0.226, 0.045, { attack: 4e-3 }),
        pop(900, 0.12, { from: "normal" }),
        knock(147, 0.0556, 0.05, { from: "strong" })
      ],
      vary: STEADY
    },
    /** A zip: one bubble shooting up through fizz. Going back, it dives. */
    navigate: {
      masterGain: 0.554,
      layers: [
        slide(300, 1500, 0.09, 0.0943, 0.035, { attack: 0.01 }),
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1500, glideTo: 3e3, glideTime: 0.09, filterQ: 1, attack: 0.02, decay: 0.0778, peak: 0.05 },
        slide(150, 600, 0.1, 0.125, 0.025, { from: "strong", attack: 0.01 })
      ],
      vary: LIVELY
    },
    /** One round note with a small wobble, settling where it started: level. */
    warning: {
      masterGain: 0.436,
      layers: [
        slide(500, 440, 0.05, 0.181, 0.045),
        pop(1800, 0.09, { from: "normal" }),
        { from: "strong", kind: "tone", waveform: "sine", frequency: 220, attack: 3e-3, decay: 0.225, peak: 0.025 }
      ],
      vary: STEADY
    },
    /** A simmer: one slow bubble rising through soft fizz, gone within about a second. Nothing lands. */
    loading: {
      masterGain: 0.194,
      layers: [
        { kind: "noise", filterType: "lowpass", filterFrequency: 900, filterQ: 0.7, attack: 0.35, decay: 0.727, peak: 0.03 },
        slide(400, 600, 0.35, 0.953, 0.016, { attack: 0.35 }),
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1800, filterQ: 1.5, attack: 0.35, decay: 0.749, peak: 4e-3 },
        { from: "strong", kind: "noise", filterType: "lowpass", filterFrequency: 400, filterQ: 0.7, attack: 0.35, decay: 0.807, peak: 0.04 }
      ],
      vary: STEADY
    },
    /** A drop into water: the plip and the round bubble it leaves, one sound, in a small room. */
    ready: {
      masterGain: 0.532,
      layers: [
        slide(1400, 700, 0.012, 0.0242, 0.03, { attack: 1e-3 }),
        slide(392, 587.33, 0.06, 0.288, 0.04, { attack: 0.012 }),
        pop(2e3, 0.03, { from: "normal" }),
        slide(196, 294, 0.08, 0.391, 0.02, { from: "strong", attack: 0.012 })
      ],
      room: LANDED,
      vary: STEADY
    },
    /** "Hm?": one note that bends up a fourth like a question. */
    attention: {
      masterGain: 0.666,
      layers: [
        slide(659.25, 880, 0.14, 0.295, 0.035, { attack: 3e-3 }),
        pop(2200, 0.12, { from: "normal" }),
        bloop(329.63, 0.261, 0.02, { from: "strong" })
      ],
      vary: STEADY
    },
    /** A number rolling: fizz and one bubble rising together for as long as the roll (sinking counting down). */
    count: {
      masterGain: 0.267,
      layers: [
        { stretch: true, kind: "noise", filterType: "lowpass", filterFrequency: 900, glideTo: 1800, glideTime: 0.6, filterQ: 0.7, attack: 0.15, decay: 0.634, peak: 0.04 },
        { ...slide(587.33, 880, 0.6, 0.717, 0.02, { attack: 0.15 }), stretch: true },
        pop(1600, 0.05, { from: "normal" }),
        { ...slide(293.66, 440, 0.6, 0.717, 0.02, { attack: 0.15, from: "strong" }), stretch: true }
      ],
      vary: LIVELY
    }
  };

  // node_modules/cuelume/dist/sounds/mech.js
  var MECH = {
    /** A machined click, like a camera's shutter button, over the short knock of its housing. */
    tap: {
      masterGain: 0.964,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 2650, filterQ: 1.5, attack: 1e-3, decay: 413e-5, peak: 0.08 },
        knock(455, 0.0156, 0.02),
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 4600, filterQ: 2, attack: 1e-3, decay: 222e-5, peak: 0.05 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 215, filterQ: 2, attack: 1e-3, decay: 0.0216, peak: 0.3 }
      ],
      vary: { pitch: 0.02, level: 0.1 }
    },
    /** A tight low-profile switch: shorter and drier than a keycap, almost no body. */
    type: {
      masterGain: 0.484,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 3e3, filterQ: 1.2, attack: 1e-3, decay: 3e-3, peak: 0.1 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 2150, filterQ: 5, attack: 1e-3, decay: 737e-5, peak: 0.18 },
        { kind: "noise", filterType: "bandpass", filterFrequency: 750, filterQ: 3, attack: 1e-3, decay: 898e-5, peak: 0.22 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 330, filterQ: 2.5, attack: 1e-3, decay: 0.0173, peak: 0.3 }
      ],
      vary: { pitch: 0.05, level: 0.15 }
    },
    /** A ratchet detent: a precision dial clicking over one tooth, with a faint ring of the metal. */
    select: {
      masterGain: 0.295,
      layers: [
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 3650, filterQ: 3, attack: 1e-3, decay: 273e-5, peak: 0.2 },
        { kind: "noise", filterType: "bandpass", filterFrequency: 1500, filterQ: 8, attack: 1e-3, decay: 762e-5, peak: 0.35 },
        { kind: "tone", waveform: "sine", frequency: 1480, attack: 1e-3, decay: 0.0433, peak: 0.012 },
        knock(250, 0.0188, 0.025, { from: "strong" })
      ]
    },
    /** A toggle switch's throw: the lever snaps over centre with the knock of its housing. */
    toggle: {
      masterGain: 0.293,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 1650, filterQ: 2, attack: 1e-3, decay: 381e-5, peak: 0.14 },
        knock(330, 0.0288, 0.04),
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 2650, filterQ: 3, attack: 1e-3, decay: 553e-5, peak: 0.18 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 250, filterQ: 2, attack: 1e-3, decay: 0.0259, peak: 0.3 }
      ]
    },
    /** A latch releasing: the catch lets go as the bolt slides back, in one motion. */
    open: {
      masterGain: 0.869,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 2150, filterQ: 3, attack: 1e-3, decay: 375e-5, peak: 0.16 },
        { kind: "noise", filterType: "bandpass", filterFrequency: 1160, glideTo: 2150, glideTime: 0.05, filterQ: 2, attack: 0.02, decay: 0.031, peak: 0.08 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1330, filterQ: 5, attack: 1e-3, decay: 763e-5, peak: 0.14 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 290, filterQ: 2, attack: 1e-3, decay: 0.0265, peak: 0.25 }
      ]
    },
    /** A latch catching: the bolt slides home into the catch, in one motion. */
    close: {
      masterGain: 0.96,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 2150, glideTo: 1080, glideTime: 0.04, filterQ: 2, attack: 0.015, decay: 0.0288, peak: 0.04 },
        { kind: "noise", filterType: "bandpass", filterFrequency: 1e3, filterQ: 4, attack: 1e-3, decay: 898e-5, peak: 0.22 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 3300, filterQ: 2, attack: 1e-3, decay: 3e-3, peak: 0.1 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 180, filterQ: 2, attack: 1e-3, decay: 0.0302, peak: 0.3 }
      ]
    },
    /** One dry struck bar, F, C and A at once, spread so no two notes rub, hit with something hard: a short chord, not a bell. */
    success: {
      masterGain: 0.662,
      layers: [
        contact(2200, 0.05),
        ...struck(698.46, 0.121, 0.03, BAR),
        ...struck(1046.5, 0.149, 0.026, BAR),
        ...struck(1760, 0.106, 0.018, BAR),
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 4150, filterQ: 2, attack: 1e-3, decay: 324e-5, peak: 0.06 }
      ]
    },
    /** One firm low knock with a dull D in it and the F a tenth above, like a handle that is locked. */
    error: {
      masterGain: 0.59,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 430, filterQ: 4, attack: 1e-3, decay: 0.0173, peak: 0.3 },
        ...struck(293.66, 0.0678, 0.045, BAR),
        ...struck(698.46, 0.0522, 0.02, BAR),
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1830, filterQ: 3, attack: 1e-3, decay: 6e-3, peak: 0.1 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 150, filterQ: 2, attack: 1e-3, decay: 0.0345, peak: 0.3 }
      ]
    },
    /** A short carriage slide, rising as it passes. */
    navigate: {
      masterGain: 0.804,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 750, glideTo: 1400, glideTime: 0.13, filterQ: 1.8, attack: 0.05, decay: 0.096, peak: 0.1 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 2500, filterQ: 4, attack: 1e-3, decay: 3e-3, peak: 0.1 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 250, filterQ: 1.5, attack: 0.04, decay: 0.109, peak: 0.12 }
      ]
    },
    /** One dry struck fifth, D and A: between success and error. */
    warning: {
      masterGain: 0.484,
      layers: [
        contact(2e3, 0.05),
        ...struck(587.33, 0.0922, 0.04, BAR),
        ...struck(880, 0.0969, 0.03, BAR),
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 300, filterQ: 2, attack: 1e-3, decay: 0.0265, peak: 0.25 }
      ]
    },
    /** A small motor spinning up and winding down: one soft, low whirr over about a second. */
    loading: {
      masterGain: 0.223,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 500, filterQ: 1, attack: 0.35, decay: 0.848, peak: 0.03 },
        { kind: "tone", waveform: "sine", frequency: 233.08, attack: 0.35, decay: 0.965, peak: 0.015 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1e3, filterQ: 2, attack: 0.35, decay: 0.883, peak: 5e-3 },
        { from: "strong", kind: "noise", filterType: "lowpass", filterFrequency: 250, filterQ: 0.7, attack: 0.35, decay: 0.807, peak: 0.04 }
      ]
    },
    /** One dry struck bar, lower than success: a result is there. */
    ready: {
      masterGain: 0.546,
      layers: [
        contact(2e3, 0.05),
        ...struck(523.25, 0.178, 0.05, BAR),
        ...struck(261.63, 0.242, 0.03, BAR, { from: "strong" })
      ]
    },
    /** One metal bell, A and E struck together, ringing longer than the rest. */
    attention: {
      masterGain: 0.481,
      layers: [
        contact(2500, 0.04),
        ...struck(880, 0.231, 0.04, BAR),
        ...struck(1318.51, 0.242, 0.03, BAR),
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 300, filterQ: 2, attack: 1e-3, decay: 0.0265, peak: 0.25 }
      ]
    },
    /** An odometer drum turning: one dry slide that rises with the count and lasts as long as the roll. */
    count: {
      masterGain: 0.654,
      layers: [
        { stretch: true, kind: "noise", filterType: "bandpass", filterFrequency: 500, glideTo: 900, glideTime: 0.6, filterQ: 2, attack: 0.1, decay: 0.648, peak: 0.06 },
        { stretch: true, from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1900, glideTo: 3300, glideTime: 0.6, filterQ: 4, attack: 0.1, decay: 0.606, peak: 0.03 },
        { stretch: true, from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 220, filterQ: 2, attack: 0.1, decay: 0.5, peak: 0.1 }
      ],
      vary: { pitch: 0.03, level: 0.1 }
    }
  };

  // node_modules/cuelume/dist/sounds/press.js
  var C2 = 65.41;
  var E2 = 82.41;
  var A2 = 110;
  var G3 = 196;
  var A3 = 220;
  var C4 = 261.63;
  var E4 = 329.63;
  var G4 = 392;
  var A4 = 440;
  var C5 = 523.25;
  var E5 = 659.25;
  var A5 = 880;
  var PRESS_HZ = 4e3;
  var RELEASE_HZ = 4800;
  var WALK = [0, 4, 9];
  var STEADY2 = { pitch: 0, level: 0.08 };
  var PRESS = {
    /** The Subscribe press: a click over a deep C that swells in and rings, and a lighter click letting go. Quick taps walk C, E, A. */
    tap: {
      masterGain: 0.0431,
      layers: [...click(PRESS_HZ, 0.53), ...note(C2, 1.36, 0.12), thud(200, 0.0472, 0.15, { from: "strong" })],
      release: click(RELEASE_HZ, 0.28, { from: "normal" }),
      walk: WALK,
      vary: STEADY2
    },
    /** A keycap landing, and lifting off quieter as the key comes up. Every stroke a slightly different key. */
    type: {
      masterGain: 0.297,
      layers: [...click(4200, 0.25), knock(305, 0.0288, 0.04), knock(150, 0.0424, 0.03, { from: "strong" })],
      release: [ring(4100, 0.08, { from: "normal" }), ring(1e3, 0.06, { filterQ: 2, from: "normal" }), knock(414, 0.0216, 0.012, { from: "normal" })],
      vary: { pitch: 0.08, level: 0.15 }
    },
    /** A detent: only the light click, over a small, high knock. A later option knocks higher, an earlier one lower. */
    select: {
      masterGain: 0.442,
      layers: [...click(RELEASE_HZ, 0.12), knock(700, 0.0196, 0.02), knock(350, 0.0326, 0.02, { from: "strong" })],
      release: [ring(RELEASE_HZ, 0.03, { from: "normal" })],
      vary: { pitch: 0.02, level: 0.1 }
    },
    /** A switch thrown: the press and a firm knock over a short, deep E, letting go lighter. Switching off knocks upward. */
    toggle: {
      masterGain: 0.0571,
      layers: [...click(PRESS_HZ, 0.245), knock(330, 0.0389, 0.05), ...note(E2, 0.324, 0.06), knock(165, 0.05, 0.05, { from: "strong" })],
      release: click(RELEASE_HZ, 0.1, { from: "normal" }),
      vary: STEADY2
    },
    /** A lid lifting: the light click, a knock, air drawn upward and an A swelling in under it. Quick opens walk. */
    open: {
      masterGain: 0.0857,
      layers: [
        ...click(RELEASE_HZ, 0.15),
        knock(440, 0.0363, 0.03),
        air(1600, 3200, 0.035, 0.1),
        ...note(A2, 0.827, 0.08),
        thud(260, 0.039, 0.12, { from: "strong" })
      ],
      release: [ring(RELEASE_HZ, 0.05, { from: "normal" })],
      walk: WALK,
      vary: STEADY2
    },
    /** A lid shutting: a lower, duller click, air pushed out and down, and a low C, damped short, as it seats. */
    close: {
      masterGain: 0.099,
      layers: [
        ...click(3200, 0.204),
        knock(130.81, 0.0432, 0.06),
        air(1800, 700, 0.04, 0.1, { from: "normal" }),
        ...note(C2, 0.258, 0.08),
        thud(180, 0.0364, 0.2, { from: "strong" })
      ],
      vary: STEADY2
    },
    /** No click: C, G and E struck at once, swelling in and ringing long into a small room. */
    success: {
      masterGain: 0.102,
      layers: [...note(C4, 1.47, 0.072), ...note(G4, 1.51, 0.06), ...note(E5, 1.36, 0.045), ...note(C4 / 2, 1.64, 0.036, { from: "strong" })],
      room: LANDED
    },
    /** No click: a low A with the C an octave and a third above, minor and spread, over a soft thump. A calm refusal. */
    error: {
      masterGain: 0.0708,
      layers: [
        ...note(A2, 0.487, 0.12),
        ...note(C5, 0.461, 0.04),
        thud(200, 0.0545, 0.2, { attack: 0.01 }),
        thud(120, 0.0727, 0.2, { from: "strong" })
      ]
    },
    /** A swipe: the light click with air sliding past it. Going back, the air falls. */
    navigate: {
      masterGain: 0.837,
      layers: [
        ...click(RELEASE_HZ, 0.15),
        air(600, 1400, 0.0877, 0.12, { filterQ: 1 }),
        knock(587.33, 0.0207, 0.015, { from: "normal" }),
        thud(300, 0.0487, 0.12, { from: "strong" })
      ],
      vary: STEADY2
    },
    /** No click: a plain fifth, A and E, between success and error. Heads up, nothing broke. */
    warning: {
      masterGain: 0.0716,
      layers: [...note(A3, 0.905, 0.096), ...note(E4, 0.84, 0.072), ...note(A3 / 2, 1.01, 0.048, { from: "strong" })]
    },
    /** No click: one warm, low G that swells in softly and fades within about a second. Work has begun. */
    loading: {
      masterGain: 0.0661,
      layers: [
        { kind: "tone", waveform: "sine", frequency: G3, attack: 0.35, decay: 0.889, peak: 0.05 },
        { from: "normal", kind: "tone", waveform: "sine", frequency: G3 * 2, attack: 0.35, decay: 0.9, peak: 0.01 },
        { from: "strong", kind: "tone", waveform: "sine", frequency: G3 / 2, attack: 0.35, decay: 0.969, peak: 0.03 }
      ]
    },
    /** No click: one long, warm G below success, ringing into a small room. A result is there. */
    ready: {
      masterGain: 0.0983,
      layers: [...note(G3, 1.78, 0.108), ...note(G3 / 2, 1.98, 0.054, { from: "strong" })],
      room: LANDED
    },
    /** No click: A and E over A, high and bell-like, ringing longest. Blocked until the user answers. */
    attention: {
      masterGain: 0.125,
      layers: [...note(A4, 2.34, 0.067), ...note(E5, 2.24, 0.048), ...note(A5, 1.89, 0.024), ...note(A4 / 2, 2.61, 0.034, { from: "strong" })]
    },
    /** A number rolling: a dial spun, air rising with it for as long as the roll (falling counting down). */
    count: {
      masterGain: 0.362,
      layers: [
        { stretch: true, kind: "noise", filterType: "bandpass", filterFrequency: 900, glideTo: 1800, glideTime: 0.6, filterQ: 2, attack: 0.15, decay: 0.568, peak: 0.08 },
        { stretch: true, kind: "noise", filterType: "lowpass", filterFrequency: 200, glideTo: 500, glideTime: 0.6, filterQ: 0.7, attack: 0.15, decay: 0.594, peak: 0.06 },
        { stretch: true, from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 2600, glideTo: 3600, glideTime: 0.6, filterQ: 4, attack: 0.15, decay: 0.587, peak: 0.02 },
        { stretch: true, from: "strong", kind: "noise", filterType: "lowpass", filterFrequency: 150, glideTo: 300, glideTime: 0.6, filterQ: 0.7, attack: 0.15, decay: 0.568, peak: 0.08 }
      ],
      vary: { pitch: 0.02, level: 0.1 }
    }
  };

  // node_modules/cuelume/dist/sounds/recipes.js
  var RECIPES = {
    /**
     * A small glassy tap — buttons, links, nav. A nail's tick, a soft knock of
     * body, then the glass ringing briefly: the fundamental is two near-identical modes that beat
     * slowly, as real glass shimmers, and the upper mode sits at the glass-bar
     * ratio 2.76x, dying faster than the fundamental.
     */
    tap: {
      masterGain: 0.39,
      layers: [
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 4500, filterQ: 1.2, attack: 1e-3, decay: 242e-5, peak: 0.03 },
        { kind: "tone", waveform: "sine", frequency: 1174.66, attack: 1e-3, decay: 0.18, peak: 0.0135 },
        { kind: "tone", waveform: "sine", frequency: 1180, attack: 1e-3, decay: 0.164, peak: 8e-3 },
        { kind: "tone", waveform: "sine", frequency: 3242, attack: 1e-3, decay: 0.0827, peak: 55e-4 },
        knock(300, 0.0261, 0.02, { from: "normal" }),
        { from: "strong", kind: "tone", waveform: "sine", frequency: 587.33, attack: 2e-3, decay: 0.246, peak: 9e-3 },
        knock(150, 0.0489, 0.014, { from: "strong" })
      ],
      vary: { pitch: 0.012, level: 0.12 }
    },
    /**
     * One keyboard keystroke — the switch's click, the keycap's clack, and the
     * thock of bottoming out, all in one strike. Every stroke
     * lands at a slightly different pitch and weight, like different keys.
     */
    type: {
      masterGain: 0.375,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 3900, filterQ: 0.8, attack: 1e-3, decay: 517e-5, peak: 0.08 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 1550, filterQ: 3.5, attack: 1e-3, decay: 0.0144, peak: 0.22 },
        { kind: "noise", filterType: "bandpass", filterFrequency: 310, filterQ: 2.5, attack: 2e-3, decay: 0.0254, peak: 0.35 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 140, filterQ: 2, attack: 2e-3, decay: 0.037, peak: 0.45 }
      ],
      vary: { pitch: 0.07, level: 0.2 }
    },
    /** A crisp detent over a small wooden knock — dropdowns, menus, lists. */
    select: {
      masterGain: 0.306,
      layers: [
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 2800, filterQ: 2.2, attack: 1e-3, decay: 749e-5, peak: 0.16 },
        knock(415, 0.0194, 0.03),
        knock(208, 0.0313, 0.025, { from: "strong" })
      ]
    },
    /** A switch snapping over: one crisp click with a small knock of body. Switching off knocks upward. */
    toggle: {
      masterGain: 0.24,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 1830, filterQ: 1.6, attack: 1e-3, decay: 0.0156, peak: 0.12 },
        knock(330, 0.0339, 0.045),
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 3150, filterQ: 1.6, attack: 1e-3, decay: 0.0124, peak: 0.08 },
        knock(165, 0.0375, 0.025, { from: "strong" })
      ]
    },
    /** Air drawing upward with a light note swelling inside it: one breath as a panel opens — menus, drawers, dialogs. */
    open: {
      masterGain: 0.335,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 600, glideTo: 1500, glideTime: 0.1, filterQ: 1.4, attack: 0.05, decay: 0.0558, peak: 0.168 },
        { kind: "tone", waveform: "sine", frequency: 659.25, attack: 0.05, decay: 0.165, peak: 0.015 },
        { from: "normal", kind: "tone", waveform: "sine", frequency: 1318.51, attack: 0.05, decay: 0.0883, peak: 5e-3 },
        { from: "strong", kind: "noise", filterType: "lowpass", filterFrequency: 250, filterQ: 0.7, attack: 0.04, decay: 0.0779, peak: 0.12 }
      ]
    },
    /** The same air falling shut over a low, damped mallet note — closing and dismissing. */
    close: {
      masterGain: 0.258,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 1400, glideTo: 540, glideTime: 0.07, filterQ: 1.4, attack: 0.02, decay: 0.054, peak: 0.216 },
        { kind: "tone", waveform: "sine", frequency: 261.63, attack: 3e-3, decay: 0.104, peak: 0.02 },
        { from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 350, filterQ: 2, attack: 1e-3, decay: 0.0273, peak: 0.2 },
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 165, filterQ: 2, attack: 1e-3, decay: 0.0345, peak: 0.3 }
      ]
    },
    /** One soft mallet chord, C, G and E spread wide so no two notes rub, struck with felt in a small room — confirmed completion. */
    success: {
      masterGain: 0.566,
      layers: [
        contact(1500, 0.04),
        ...struck(523.25, 0.333, 0.022, MALLET),
        ...struck(783.99, 0.391, 0.02, MALLET),
        ...struck(1318.51, 0.335, 0.014, MALLET),
        ...struck(261.63, 0.469, 0.02, MALLET, { from: "strong" })
      ],
      room: LANDED
    },
    /** One muted low mallet chord, D with the F a tenth above, spread so it never rubs, short — a calm, recoverable refusal. */
    error: {
      masterGain: 0.501,
      layers: [
        contact(900, 0.05),
        ...struck(293.66, 0.138, 0.04, MALLET),
        ...struck(698.46, 0.106, 0.018, MALLET),
        { from: "strong", kind: "noise", filterType: "bandpass", filterFrequency: 250, filterQ: 1.5, attack: 1e-3, decay: 0.0273, peak: 0.2 }
      ]
    },
    /** A soft whoosh whose air rises as it passes — routes, pages, galleries, carousels. */
    navigate: {
      masterGain: 0.322,
      layers: [
        { kind: "noise", filterType: "bandpass", filterFrequency: 400, glideTo: 1100, glideTime: 0.21, filterQ: 1.2, attack: 0.12, decay: 0.111, peak: 0.18 },
        { from: "normal", kind: "noise", filterType: "lowpass", filterFrequency: 540, filterQ: 0.7, attack: 0.09, decay: 0.109, peak: 0.045 },
        { from: "strong", kind: "noise", filterType: "lowpass", filterFrequency: 230, filterQ: 0.7, attack: 0.1, decay: 0.144, peak: 0.1 }
      ]
    },
    /** One mallet fifth, A and E, neither bright nor low: between success and error. */
    warning: {
      masterGain: 0.437,
      layers: [
        contact(1200, 0.04),
        ...struck(440, 0.163, 0.038, MALLET),
        ...struck(659.25, 0.145, 0.03, MALLET),
        ...struck(220, 0.261, 0.02, MALLET, { from: "strong" })
      ]
    },
    /** One low, muted note that swells in and fades away over about a second, never struck: work has begun, nothing has landed. */
    loading: {
      masterGain: 0.106,
      layers: [
        { kind: "tone", waveform: "sine", frequency: 196, attack: 0.35, decay: 0.969, peak: 0.03 },
        { kind: "tone", waveform: "sine", frequency: 392, attack: 0.35, decay: 0.9, peak: 0.01 },
        { from: "normal", kind: "noise", filterType: "lowpass", filterFrequency: 500, filterQ: 0.7, attack: 0.35, decay: 0.844, peak: 6e-3 },
        { from: "strong", kind: "tone", waveform: "sine", frequency: 98, attack: 0.35, decay: 1.04, peak: 0.02 }
      ]
    },
    /**
     * One warm glass note, G, below success, in its small room: a result is
     * there. A second mode a hertz sharp lets the glass shimmer once as it
     * rings, too slow to be heard as a wobble.
     */
    ready: {
      masterGain: 0.467,
      layers: [
        contact(1500, 0.02),
        ...struck(392, 0.497, 0.026, BAR),
        { kind: "tone", waveform: "sine", frequency: 393.2, attack: 3e-3, decay: 0.462, peak: 0.012 },
        ...struck(196, 0.612, 0.016, BAR, { from: "strong" })
      ],
      room: LANDED
    },
    /**
     * One high glass bell, A and E struck together, ringing longest: blocked
     * until the user answers. The A's twin sits 2 Hz sharp, so the bell swells
     * once rather than warbling.
     */
    attention: {
      masterGain: 0.551,
      layers: [
        contact(2500, 0.02),
        ...struck(880, 0.599, 0.018, BAR),
        { kind: "tone", waveform: "sine", frequency: 882, attack: 3e-3, decay: 0.57, peak: 0.01 },
        ...struck(1318.51, 0.559, 0.014, BAR),
        ...struck(440, 0.649, 0.012, BAR, { from: "strong" })
      ]
    },
    /**
     * A number rolling to a new value: one breath of air that rises with the
     * count (and falls counting down) over a soft glass note, lasting as long
     * as the roll.
     */
    count: {
      masterGain: 0.336,
      layers: [
        { stretch: true, kind: "noise", filterType: "bandpass", filterFrequency: 700, glideTo: 1400, glideTime: 0.6, filterQ: 1.2, attack: 0.15, decay: 0.611, peak: 0.05 },
        { stretch: true, kind: "tone", waveform: "sine", frequency: 1046.5, attack: 0.15, decay: 0.721, peak: 0.012 },
        { stretch: true, from: "normal", kind: "noise", filterType: "bandpass", filterFrequency: 2e3, glideTo: 3200, glideTime: 0.6, filterQ: 2, attack: 0.15, decay: 0.652, peak: 0.02 },
        { stretch: true, from: "strong", kind: "tone", waveform: "sine", frequency: 261.63, attack: 0.15, decay: 0.758, peak: 0.015 }
      ],
      vary: { pitch: 0.02, level: 0.12 }
    }
  };
  var sounds = Object.keys(RECIPES);
  var ALIASES = {
    chime: "success",
    sparkle: "success",
    droplet: "close",
    bloom: "open",
    whisper: "select",
    tick: "select",
    press: "tap",
    release: "tap",
    page: "navigate",
    pulse: "tap",
    scan: "select",
    arrival: "navigate"
  };
  var own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function resolveSound(value) {
    if (typeof value !== "string")
      return null;
    if (own(RECIPES, value))
      return value;
    return own(ALIASES, value) ? ALIASES[value] : null;
  }

  // node_modules/cuelume/dist/sounds/themes.js
  var THEMES = {
    default: RECIPES,
    mech: MECH,
    bubble: BUBBLE,
    press: PRESS
  };
  var themes = Object.keys(THEMES);
  function isThemeName(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(THEMES, value);
  }

  // node_modules/cuelume/dist/sounds/context.js
  var IDENTITY = { pitch: 1, level: 1, length: 1, bright: 1, tail: 1, sweep: 1, time: 1 };
  var BRIGHT_HZ = 2500;
  var EMPHASIS = {
    subtle: { level: 0.8, length: 0.85, bright: 0.75 },
    normal: {},
    strong: { pitch: 0.98, level: 1.08, length: 1.2, bright: 1.1 }
  };
  var RANK = { subtle: 0, normal: 1, strong: 2 };
  var KEYS = {
    printable: {},
    space: { pitch: 0.86, level: 1.08, length: 1.15 },
    delete: { pitch: 0.92, level: 0.9, bright: 0.8 },
    enter: { pitch: 0.8, level: 1.12, length: 1.25 }
  };
  var INPUTS = {
    mouse: {},
    touch: { pitch: 0.97, level: 0.92, bright: 0.45 },
    pen: { pitch: 1.02, bright: 1.3 },
    keyboard: { pitch: 0.94, length: 0.85, bright: 0.7 }
  };
  var DIRECTION_STEP = 0.05;
  var FAST_MS = 70;
  var SLOW_MS = 220;
  var CADENCE_CUES = /* @__PURE__ */ new Set(["type", "select", "tap", "toggle", "navigate"]);
  var COUNT_MS = 800;
  var COUNT_MIN_MS = 300;
  var COUNT_MAX_MS = 2e3;
  var REVERSIBLE = /* @__PURE__ */ new Set(["navigate", "toggle", "count"]);
  function arrangement(layers, emphasis) {
    return layers.filter((layer) => RANK[emphasis] >= RANK[layer.from ?? "subtle"]);
  }
  var own2 = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function resolveEmphasis(value) {
    return typeof value === "string" && own2(EMPHASIS, value) ? value : "normal";
  }
  var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  var DIRECTIONS = { forward: 1, back: -1 };
  function contextFrom(options) {
    const context = {};
    if (!options)
      return context;
    const { direction, key, input, duration } = options;
    if (typeof direction === "string" && own2(DIRECTIONS, direction))
      context.direction = DIRECTIONS[direction];
    if (typeof key === "string" && own2(KEYS, key))
      context.key = key;
    if (typeof input === "string" && own2(INPUTS, input))
      context.input = input;
    if (typeof duration === "number" && Number.isFinite(duration))
      context.duration = clamp(duration, COUNT_MIN_MS, COUNT_MAX_MS);
    if (typeof options.pitch === "number" && Number.isFinite(options.pitch))
      context.pitch = clamp(options.pitch, 0.5, 2);
    return context;
  }
  function cadence(sinceLastMs) {
    const speed = Math.min(1, Math.max(0, (SLOW_MS - sinceLastMs) / (SLOW_MS - FAST_MS)));
    return { level: 1 - 0.22 * speed, length: 1 - 0.25 * speed, bright: 1 - 0.2 * speed, tail: 1 - 0.8 * speed };
  }
  function shapeFor(sound, context, emphasis, sinceLastMs) {
    const parts = [EMPHASIS[emphasis]];
    if (CADENCE_CUES.has(sound))
      parts.push(cadence(sinceLastMs));
    if (sound === "type" && context.key)
      parts.push(KEYS[context.key]);
    if (sound === "tap" && context.input)
      parts.push(INPUTS[context.input]);
    if (sound === "select" && context.direction)
      parts.push({ pitch: 1 + DIRECTION_STEP * context.direction });
    if (context.pitch)
      parts.push({ pitch: context.pitch });
    if (sound === "count" && context.duration)
      parts.push({ time: context.duration / COUNT_MS });
    if (REVERSIBLE.has(sound) && context.direction === -1)
      parts.push({ sweep: -1 });
    const shape = { ...IDENTITY };
    for (const part of parts) {
      for (const key of Object.keys(part))
        shape[key] *= part[key];
    }
    return shape;
  }
  function layerFactors(layer, shape) {
    const frequency = layer.kind === "tone" ? layer.frequency : layer.filterFrequency;
    const gain = shape.level * (frequency >= BRIGHT_HZ ? shape.bright : 1) * ((layer.offset ?? 0) > 0 ? shape.tail : 1);
    return {
      pitch: clamp(shape.pitch, 0.55, 1.8),
      gain: clamp(gain, 0, 1.5),
      length: clamp(shape.length, 0.6, 1.6)
    };
  }

  // node_modules/cuelume/dist/audio/output.js
  var OUTPUT_GAIN = 5.8;
  var CLIP_KNEE = 0.7;
  var CLIP_CURVE_POINTS = 1025;
  var SUBSONIC_HZ = 40;
  var NOISE_SECONDS = 2;
  var SILENCE_FADE = 0.015;
  function silence(context, bus) {
    const now = context.currentTime;
    for (const { gain } of bus.live) {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0, now + SILENCE_FADE);
    }
    bus.live.clear();
  }
  var NOISE_SEED = 1;
  function seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let mixed = Math.imul(state ^ state >>> 15, 1 | state);
      mixed = mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed) ^ mixed;
      return ((mixed ^ mixed >>> 14) >>> 0) / 2 ** 32;
    };
  }
  function fillNoise(data) {
    const random = seeded(NOISE_SEED);
    for (let i = 0; i < data.length; i++)
      data[i] = 2 * random() - 1;
  }
  function getNoise(context, bus) {
    if (bus.noise)
      return bus.noise;
    const length = Math.max(1, Math.floor(NOISE_SECONDS * context.sampleRate));
    bus.noise = context.createBuffer(1, length, context.sampleRate);
    fillNoise(bus.noise.getChannelData(0));
    return bus.noise;
  }
  var ROOM_SECONDS = 0.25;
  var ROOM_PREDELAY = 8e-3;
  var ROOM_LOWPASS = 3500;
  var ROOM_SEND = 0.08;
  var ROOM_DECAY_DB = 60;
  var ROOM_SEEDS = [3110, 5639];
  var ROOM_REFLECTIONS_PER_SECOND = 48e3;
  function fillRoom(data, rate, seed) {
    const random = seeded(seed);
    const fall = ROOM_DECAY_DB / 20 * Math.LN10;
    const reflections = new Float32Array(Math.floor(ROOM_SECONDS * ROOM_REFLECTIONS_PER_SECOND));
    let energy = 0;
    for (let i = 0; i < reflections.length; i++) {
      const t = i / ROOM_REFLECTIONS_PER_SECOND;
      reflections[i] = t < ROOM_PREDELAY ? 0 : (2 * random() - 1) * Math.exp(-fall * t / ROOM_SECONDS);
      energy += reflections[i] * reflections[i];
    }
    const scale = 1 / Math.sqrt(energy);
    for (let i = 0; i < reflections.length; i++) {
      const at = i / ROOM_REFLECTIONS_PER_SECOND * rate;
      const sample = Math.floor(at);
      const late = at - sample;
      if (sample < data.length)
        data[sample] += reflections[i] * scale * (1 - late);
      if (sample + 1 < data.length)
        data[sample + 1] += reflections[i] * scale * late;
    }
  }
  function buildRoom(context, output) {
    const rate = context.sampleRate;
    const length = Math.max(1, Math.floor(ROOM_SECONDS * rate));
    const impulse = context.createBuffer(2, length, rate);
    ROOM_SEEDS.forEach((seed, channel) => fillRoom(impulse.getChannelData(channel), rate, seed));
    const convolver = context.createConvolver();
    convolver.normalize = false;
    convolver.buffer = impulse;
    const walls = context.createBiquadFilter();
    walls.type = "lowpass";
    walls.frequency.value = ROOM_LOWPASS;
    walls.Q.value = FLAT_Q;
    walls.connect(convolver).connect(output);
    return walls;
  }
  function softClip(level) {
    const over = Math.abs(level) - CLIP_KNEE;
    if (over <= 0)
      return level;
    const shoulder = 1 - CLIP_KNEE;
    return Math.sign(level) * (CLIP_KNEE + over - over * over / (2 * shoulder));
  }
  function createOutput(context) {
    const output = context.createGain();
    output.gain.value = OUTPUT_GAIN;
    const clip = context.createWaveShaper();
    clip.curve = Float32Array.from({ length: CLIP_CURVE_POINTS }, (_, i) => softClip(2 * i / (CLIP_CURVE_POINTS - 1) - 1));
    const subsonic = context.createBiquadFilter();
    subsonic.type = "highpass";
    subsonic.frequency.value = SUBSONIC_HZ;
    subsonic.Q.value = FLAT_Q;
    output.connect(subsonic).connect(clip).connect(context.destination);
    return { output, room: buildRoom(context, output), noise: null, live: /* @__PURE__ */ new Set() };
  }

  // node_modules/cuelume/dist/audio/render.js
  var SOURCE_STOP_PADDING = 0.05;
  var DECAY_DB = 60;
  var fallTime = (decay) => decay / (DECAY_DB / 20 * Math.LN10);
  var CLEANUP_MARGIN = 0.05;
  function glide(param, from, layer, startTime) {
    param.setValueAtTime(from, startTime);
    if (layer.glideTo === void 0)
      return;
    param.exponentialRampToValueAtTime(layer.glideTo, startTime + (layer.glideTime ?? layer.attack + layer.decay));
  }
  function envelope(param, layer, startTime) {
    param.setValueAtTime(0, startTime);
    param.linearRampToValueAtTime(layer.peak, startTime + layer.attack);
    param.setTargetAtTime(0, startTime + layer.attack, fallTime(layer.decay));
  }
  function renderTone(context, destination, layer, startTime) {
    const oscillator = context.createOscillator();
    oscillator.type = layer.waveform;
    glide(oscillator.frequency, layer.frequency, layer, startTime);
    if (layer.detune)
      oscillator.detune.value = layer.detune;
    const gain = context.createGain();
    envelope(gain.gain, layer, startTime);
    oscillator.connect(gain).connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + layer.attack + layer.decay + SOURCE_STOP_PADDING);
  }
  function renderNoise(context, bus, destination, layer, startTime) {
    const duration = layer.attack + layer.decay + SOURCE_STOP_PADDING;
    const source = context.createBufferSource();
    source.buffer = getNoise(context, bus);
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = layer.filterType;
    glide(filter.frequency, layer.filterFrequency, layer, startTime);
    if (layer.filterQ !== void 0)
      filter.Q.value = layer.filterQ;
    const gain = context.createGain();
    envelope(gain.gain, layer, startTime);
    source.connect(filter).connect(gain).connect(destination);
    source.start(startTime, Math.random() * NOISE_SECONDS);
    source.stop(startTime + duration);
  }
  function sourceEnd(layers) {
    return Math.max(...layers.map((layer) => (layer.offset ?? 0) + layer.attack + layer.decay + SOURCE_STOP_PADDING));
  }
  var nudge = (amount) => 1 + (Math.random() * 2 - 1) * amount;
  var STEADY_STRIKE = { pitch: 1, force: 1 };
  var DECAY_JITTER = 0.1;
  var MODE_JITTER = 5e-3;
  var HANDOFF_TIME = 0.08;
  var NOTE_HANDOFF_TIME = 0.4;
  var RELEASE_GAP = 0.09;
  function shaped(layer, shape, strike, vary, walk) {
    const factors = layerFactors(layer, shape);
    const tune = layer.kind === "tone" ? vary ? nudge(MODE_JITTER) : 1 : strike.force;
    const pitch = factors.pitch * strike.pitch * tune * (layer.note ? walk : 1);
    const peak = layer.peak * factors.gain * strike.force;
    const stretch = layer.stretch ? shape.time : 1;
    const decay = layer.decay * factors.length * stretch * (vary ? nudge(DECAY_JITTER) : 1);
    const start = layer.kind === "tone" ? layer.frequency : layer.filterFrequency;
    const [from, to] = shape.sweep < 0 && layer.glideTo !== void 0 ? [layer.glideTo, start] : [start, layer.glideTo];
    const glideTo = to === void 0 ? void 0 : to * pitch;
    const timing = {
      offset: (layer.offset ?? 0) * shape.time,
      attack: layer.attack * stretch,
      glideTime: layer.glideTime === void 0 ? void 0 : layer.glideTime * stretch
    };
    return layer.kind === "tone" ? { ...layer, ...timing, frequency: from * pitch, glideTo, peak, decay } : { ...layer, ...timing, filterFrequency: from * pitch, glideTo, peak, decay };
  }
  function layersFor({ recipe, emphasis, shape, step }, part) {
    const parts = [];
    if (part !== "release")
      parts.push([recipe.layers, 0]);
    if (part !== "press" && recipe.release)
      parts.push([recipe.release, part === "both" ? RELEASE_GAP : 0]);
    const walk = 2 ** ((recipe.walk?.[step] ?? 0) / 12);
    const { vary } = recipe;
    const strike = vary ? { pitch: nudge(vary.pitch), force: nudge(vary.level) } : STEADY_STRIKE;
    return parts.flatMap(([partLayers, delay]) => arrangement(partLayers, emphasis).map((layer) => {
      const bent = shaped(layer, shape, strike, vary, walk);
      return { ...bent, offset: (bent.offset ?? 0) + delay };
    }));
  }
  function renderRecipe(context, getBus, voices2, sound, played, part) {
    const { recipe, volume } = played;
    const layers = layersFor(played, part);
    if (layers.length === 0)
      return;
    const now = context.currentTime;
    const bus = getBus();
    const { output, room } = bus;
    const master = context.createGain();
    master.gain.value = recipe.masterGain * volume;
    master.connect(output);
    const send = context.createGain();
    send.gain.value = ROOM_SEND * (recipe.room ?? 1);
    master.connect(send).connect(room);
    bus.live.add(master);
    if (part !== "release") {
      const last = voices2.get(sound);
      if (last) {
        last.gain.gain.setValueAtTime(last.gain.gain.value, now);
        last.gain.gain.exponentialRampToValueAtTime(1e-4, now + last.fade);
      }
      const fade = recipe.layers.some((layer) => layer.note) ? NOTE_HANDOFF_TIME : HANDOFF_TIME;
      voices2.set(sound, { gain: master, fade });
    }
    for (const layer of layers) {
      const startTime = now + (layer.offset ?? 0);
      if (layer.kind === "tone")
        renderTone(context, master, layer, startTime);
      else
        renderNoise(context, bus, master, layer, startTime);
    }
    const cleanupAfterMs = (sourceEnd(layers) + CLEANUP_MARGIN) * 1e3;
    setTimeout(() => {
      if (voices2.get(sound)?.gain === master)
        voices2.delete(sound);
      bus.live.delete(master);
      master.disconnect();
      send.disconnect();
    }, cleanupAfterMs);
  }

  // node_modules/cuelume/dist/audio/engine.js
  var WALK_GAP_MS = 1e3;
  var sharedContext = null;
  var sharedBus = null;
  var voices = /* @__PURE__ */ new Map();
  var enabled = true;
  var globalVolume = 1;
  var activeTheme = "default";
  function normalizeVolume(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
  }
  function setEnabled(value) {
    if (typeof value !== "boolean")
      return;
    enabled = value;
    if (value)
      return;
    held.clear();
    voices.clear();
    if (sharedContext && sharedBus)
      silence(sharedContext, sharedBus);
  }
  function setTheme(theme) {
    if (isThemeName(theme))
      activeTheme = theme;
  }
  function setVolume(value) {
    globalVolume = normalizeVolume(value, globalVolume);
  }
  function isBlocked() {
    return typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive === false;
  }
  function unlock() {
    const context = isBlocked() ? null : getAudioContext();
    if (!context)
      return Promise.resolve(false);
    if (context.state === "running")
      return Promise.resolve(true);
    try {
      return context.resume().then(() => context.state === "running", () => false);
    } catch {
      return Promise.resolve(false);
    }
  }
  function getAudioContext() {
    if (sharedContext)
      return sharedContext;
    if (typeof window === "undefined")
      return null;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor)
      return null;
    try {
      sharedContext = new Ctor();
    } catch {
      return null;
    }
    return sharedContext;
  }
  var lastPlayedAt = /* @__PURE__ */ new Map();
  var steps = /* @__PURE__ */ new Map();
  var held = /* @__PURE__ */ new Map();
  function sinceLastPlay(sound) {
    const now = performance.now();
    const since = now - (lastPlayedAt.get(sound) ?? -Infinity);
    lastPlayedAt.set(sound, now);
    return since;
  }
  function play(sound = "tap", options) {
    playInContext(sound, options, contextFrom(options));
  }
  function stepFor(sound, recipe, sinceLastMs) {
    const length = recipe.walk?.length ?? 0;
    const step = length > 0 && sinceLastMs < WALK_GAP_MS ? ((steps.get(sound) ?? -1) + 1) % length : 0;
    steps.set(sound, step);
    return step;
  }
  function press(sound = "tap", options) {
    playInContext(sound, options, contextFrom(options), "press");
  }
  function release(sound = "tap") {
    playInContext(sound, void 0, {}, "release");
  }
  function playInContext(sound, options, interaction, part = "both", gesture) {
    const name = resolveSound(sound);
    if (!enabled || !name)
      return;
    if (isBlocked())
      return;
    const holding = gesture ? `${name}:${gesture}` : name;
    let played;
    if (part === "release") {
      const pressed2 = held.get(holding);
      if (!pressed2)
        return;
      held.delete(holding);
      played = pressed2;
    } else {
      held.delete(holding);
      const volume = globalVolume * normalizeVolume(options?.volume, 1);
      if (volume === 0)
        return;
      const requested = options?.theme;
      const recipe = THEMES[isThemeName(requested) ? requested : activeTheme][name];
      const emphasis = resolveEmphasis(options?.emphasis);
      const since = sinceLastPlay(name);
      played = { recipe, volume, emphasis, shape: shapeFor(name, interaction, emphasis, since), step: stepFor(name, recipe, since) };
      if (part === "press")
        held.set(holding, played);
    }
    const context = getAudioContext();
    if (!context)
      return;
    const getBus = () => sharedBus ?? (sharedBus = createOutput(context));
    if (context.state === "running") {
      renderRecipe(context, getBus, voices, name, played, part);
    } else {
      try {
        void context.resume().then(() => {
          if (enabled && context.state === "running")
            renderRecipe(context, getBus, voices, name, played, part);
        }, () => {
        });
      } catch {
      }
    }
  }

  // node_modules/cuelume/dist/interactions/bind.js
  var HOVER_GAP_MS = 150;
  var TYPE_GAP_MS = 40;
  var IME_KEY_CODE = 229;
  var CLICK_CUES = {
    "data-cuelume-tap": "tap",
    "data-cuelume-select": "select",
    "data-cuelume-toggle": "toggle",
    "data-cuelume-open": "open",
    "data-cuelume-close": "close",
    "data-cuelume-navigate": "navigate"
  };
  var CLICK_SELECTOR = Object.keys(CLICK_CUES).map((attr) => `[${attr}]`).join();
  var bound = /* @__PURE__ */ new WeakMap();
  var handledEvents = /* @__PURE__ */ new WeakSet();
  var lastPlayed = { hover: -Infinity, type: -Infinity };
  var lastSelected = /* @__PURE__ */ new WeakMap();
  var pressed = null;
  var typed = /* @__PURE__ */ new Set();
  function throttled(kind, gapMs) {
    const now = performance.now();
    if (now - lastPlayed[kind] < gapMs)
      return true;
    lastPlayed[kind] = now;
    return false;
  }
  function isMouse(event) {
    return event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }
  function isNativeControl(element) {
    return element.tagName === "SELECT" || element.tagName === "INPUT";
  }
  function deletes(event, field) {
    const { selectionStart: start, selectionEnd: end, value } = field;
    if (typeof start !== "number" || typeof end !== "number")
      return true;
    if (start !== end)
      return true;
    return event.key === "Backspace" ? start > 0 : end < value.length;
  }
  function keyRole(key) {
    if (key === " ")
      return "space";
    if (key === "Enter")
      return "enter";
    return key === "Backspace" || key === "Delete" ? "delete" : "printable";
  }
  function inputMethod(event) {
    const { detail, pointerType } = event;
    if (detail === 0)
      return "keyboard";
    return pointerType === "mouse" || pointerType === "touch" || pointerType === "pen" ? pointerType : void 0;
  }
  function moved(group, index, keep = true) {
    const previous = lastSelected.get(group);
    if (!(index >= 0))
      return void 0;
    if (keep)
      lastSelected.set(group, index);
    if (previous === void 0 || previous === index)
      return void 0;
    return index > previous ? 1 : -1;
  }
  function isChosen(option) {
    return option.getAttribute("aria-checked") === "true" || option.getAttribute("aria-selected") === "true";
  }
  function siblingDirection(option, keep = true) {
    const group = option.parentElement;
    if (!group)
      return void 0;
    const options = Array.from(group.children).filter((child) => child.hasAttribute("data-cuelume-select"));
    if (!lastSelected.has(group)) {
      const chosen = options.findIndex(isChosen);
      if (chosen >= 0)
        lastSelected.set(group, chosen);
    }
    return moved(group, options.indexOf(option), keep);
  }
  function switched(element, beforeClick = false) {
    const { type, checked } = element;
    if (type === "radio")
      return beforeClick || checked ? 1 : -1;
    if (type === "checkbox")
      return checked !== beforeClick ? 1 : -1;
    const state = element.getAttribute("aria-checked") ?? element.getAttribute("aria-pressed");
    if (state === "true")
      return -1;
    return state === "false" ? 1 : void 0;
  }
  function isTypingKey(event, field) {
    if (event.isComposing || event.keyCode === IME_KEY_CODE)
      return false;
    if (field.type === "password")
      return false;
    if (event.key === "Backspace" || event.key === "Delete")
      return deletes(event, field);
    if (event.repeat)
      return false;
    if (event.metaKey || event.ctrlKey && !event.altKey)
      return false;
    if (event.key === "Enter")
      return field.tagName !== "INPUT";
    return event.key.length === 1;
  }
  function match(root, event, attr, fallback) {
    if (!(event.target instanceof Element))
      return null;
    const element = event.target.closest(`[${attr}]`);
    return element && root.contains(element) ? [element, attr, fallback] : null;
  }
  function listen(root, signal, eventName, find) {
    root.addEventListener(eventName, (event) => {
      if (handledEvents.has(event))
        return;
      const found = find(event);
      if (!found)
        return;
      handledEvents.add(event);
      const [element, attr, fallback, context = {}, part] = found;
      const emphasis = element.closest("[data-cuelume-emphasis]")?.getAttribute("data-cuelume-emphasis");
      const theme = element.closest("[data-cuelume-theme]")?.getAttribute("data-cuelume-theme");
      playInContext(
        resolveSound(element.getAttribute(attr)) ?? fallback,
        { emphasis, theme },
        context,
        part,
        // a key holds its own press, so keys that overlap each let go; a pointer has no code
        event.code
      );
    }, { capture: true, signal });
  }
  function bind(root) {
    if (typeof document === "undefined")
      return () => {
      };
    const scope = root ?? document;
    const binding = bound.get(scope) ?? { holders: 0, listeners: new AbortController() };
    let holding = true;
    const unbind = () => {
      if (!holding)
        return;
      holding = false;
      if (--binding.holders > 0)
        return;
      binding.listeners.abort();
      bound.delete(scope);
    };
    if (binding.holders++ > 0)
      return unbind;
    bound.set(scope, binding);
    const { signal } = binding.listeners;
    const clicked = (event) => {
      if (!(event.target instanceof Element))
        return null;
      const element = event.target.closest(CLICK_SELECTOR);
      if (!element || !scope.contains(element))
        return null;
      const control = element.tagName === "LABEL" ? element.control : null;
      const inside = control && element.contains(control) ? control : null;
      if ((inside ?? element).matches(":disabled"))
        return null;
      const attr = Object.keys(CLICK_CUES).find((name) => element.hasAttribute(name));
      if (attr === "data-cuelume-select" && isNativeControl(element))
        return null;
      return { element, attr, inside };
    };
    const direction = (element, attr, inside, beforeClick) => attr === "data-cuelume-select" ? siblingDirection(element, !beforeClick) : attr === "data-cuelume-toggle" ? switched(inside ?? element, beforeClick) : void 0;
    listen(scope, signal, "click", (event) => {
      const found = clicked(event);
      if (!found)
        return null;
      const { element, attr, inside } = found;
      if (inside && event.target !== inside)
        return null;
      if (pressed === element) {
        pressed = null;
        direction(element, attr, inside, false);
        return [element, attr, CLICK_CUES[attr], {}, "release"];
      }
      return [element, attr, CLICK_CUES[attr], { input: inputMethod(event), direction: direction(element, attr, inside, false) }];
    });
    listen(scope, signal, "pointerdown", (event) => {
      pressed = null;
      const { pointerType, button } = event;
      const found = pointerType === "mouse" && !(button > 0) ? clicked(event) : null;
      if (found) {
        const { element, attr, inside } = found;
        pressed = element;
        return [element, attr, CLICK_CUES[attr], { input: "mouse", direction: direction(element, attr, inside, true) }, "press"];
      }
      const legacy = match(scope, event, "data-cuelume-press", "tap");
      return legacy && [legacy[0], legacy[1], legacy[2], { input: inputMethod(event) }];
    });
    scope.addEventListener("pointercancel", () => pressed = null, { capture: true, signal });
    listen(scope, signal, "change", (event) => {
      const found = match(scope, event, "data-cuelume-select", "select");
      if (!found || !isNativeControl(found[0]))
        return null;
      const [element, attr, fallback] = found;
      return [element, attr, fallback, { direction: moved(element, element.selectedIndex) }];
    });
    listen(scope, signal, "keydown", (event) => {
      pressed = null;
      const found = match(scope, event, "data-cuelume-type", "type");
      if (!found || found[0] !== event.target)
        return null;
      const key = event;
      if (!isTypingKey(key, found[0]) || throttled("type", TYPE_GAP_MS))
        return null;
      typed.add(key.code);
      const [element, attr, fallback] = found;
      return [element, attr, fallback, { key: keyRole(key.key) }, "press"];
    });
    listen(scope, signal, "keyup", (event) => {
      if (!typed.delete(event.code))
        return null;
      const found = match(scope, event, "data-cuelume-type", "type");
      return found && found[0] === event.target ? [found[0], found[1], found[2], {}, "release"] : null;
    });
    listen(scope, signal, "pointerenter", (event) => {
      const found = match(scope, event, "data-cuelume-hover", "select");
      if (!found || !isMouse(event))
        return null;
      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && found[0].contains(relatedTarget))
        return null;
      return throttled("hover", HOVER_GAP_MS) ? null : found;
    });
    listen(scope, signal, "pointerup", (event) => {
      const found = match(scope, event, "data-cuelume-release", "tap");
      return found && !found[0].hasAttribute("data-cuelume-press") ? found : null;
    });
    return unbind;
  }
  return __toCommonJS(index_exports);
})();
