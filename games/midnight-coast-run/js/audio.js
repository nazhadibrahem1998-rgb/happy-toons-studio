/* Midnight Coast Run — original synthesized score and effects. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MCRAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const BPM = 102;
  const STEP = 60 / BPM / 4;
  const LOOP = 64;

  function midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function create() {
    let ctx = null;
    let dead = false;
    let master = null;
    let musicBus = null;
    let sfxBus = null;
    let comp = null;
    let engine = null;
    let engineGain = null;
    let engineFilter = null;
    let noiseBuf = null;
    let nextTime = 0;
    let stepIndex = 0;
    let started = false;
    let musicVol = 0.7;
    let sfxVol = 0.8;
    const chords = [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62]
    ];
    const lead = [
      76, 0, 79, 0, 76, 81, 0, 79,
      0, 77, 0, 74, 0, 72, 0, 0,
      72, 0, 76, 0, 79, 0, 76, 0,
      74, 0, 72, 0, 71, 0, 72, 0,
      76, 0, 0, 79, 0, 81, 84, 0,
      0, 79, 0, 76, 0, 74, 0, 0,
      67, 0, 72, 0, 74, 0, 76, 0,
      79, 0, 76, 0, 74, 72, 0, 0
    ];

    function fail() {
      dead = true;
      try { if (ctx && ctx.close) ctx.close(); } catch (err) {}
      ctx = null;
    }

    function ensure() {
      if (dead) return false;
      if (ctx) return true;
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
      } catch (err) {
        fail();
        return false;
      }
      try {
        master = ctx.createGain();
        master.gain.value = 0.9;
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 10;
        comp.ratio.value = 2.6;
        comp.attack.value = 0.008;
        comp.release.value = 0.18;
        musicBus = ctx.createGain();
        sfxBus = ctx.createGain();
        musicBus.gain.value = musicVol;
        sfxBus.gain.value = sfxVol;
        musicBus.connect(comp);
        sfxBus.connect(comp);
        comp.connect(master);
        master.connect(ctx.destination);
        const len = Math.min(ctx.sampleRate, 48000);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        }
      } catch (err2) {
        fail();
        return false;
      }
      return true;
    }

    function resume() {
      if (!ensure()) return;
      try {
        if (ctx.state === 'closed') { fail(); return; }
        if (ctx.state !== 'running') {
          const p = ctx.resume();
          if (p && p.catch) p.catch(function () { fail(); });
        }
        if (!started) {
          started = true;
          nextTime = ctx.currentTime + 0.06;
          stepIndex = 0;
        }
        if (ctx.currentTime + 0.05 > nextTime + 0.5) nextTime = ctx.currentTime + 0.05;
      } catch (err) {
        fail();
      }
    }

    function setMusic(v) {
      musicVol = Math.max(0, Math.min(1, v));
      if (musicBus) musicBus.gain.value = musicVol;
    }

    function setSfx(v) {
      sfxVol = Math.max(0, Math.min(1, v));
      if (sfxBus) sfxBus.gain.value = sfxVol;
    }

    function envGain(t, peak, attack, dur, dest) {
      const g = ctx.createGain();
      g.connect(dest || musicBus);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      return g;
    }

    function tone(t, freq, dur, type, peak, dest, slide) {
      if (!ctx || dead || peak <= 0) return;
      let o;
      try {
        o = ctx.createOscillator();
      } catch (err) {
        fail();
        return;
      }
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
      const g = envGain(t, peak, 0.012, dur, dest);
      try {
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.02);
      } catch (err) {
        fail();
      }
    }

    function noiseHit(t, dur, peak, freq, q, dest) {
      if (!ctx || !noiseBuf) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = envGain(t, peak, 0.005, dur, dest || sfxBus);
      src.connect(filter);
      filter.connect(g);
      src.start(t);
      src.stop(t + dur + 0.02);
    }

    function schedule(step, time) {
      if (!ctx || musicVol <= 0.001) return;
      const bar = Math.floor(step / 16) % 4;
      const inBar = step % 16;
      const chord = chords[bar];
      const rootN = chord[0] - 12;

      if (inBar % 4 === 0) {
        tone(time, midi(36), 0.18, 'sine', 0.22, musicBus, 52);
        noiseHit(time, 0.09, 0.08, 180, 0.7, musicBus);
      }
      if (inBar === 4 || inBar === 12) {
        noiseHit(time, 0.14, 0.07, 1800, 0.6, musicBus);
        tone(time, 220, 0.1, 'triangle', 0.04, musicBus);
      }
      if (inBar % 2 === 1) {
        noiseHit(time, 0.03, 0.025, 7000, 0.5, musicBus);
      }
      if (inBar === 0 || inBar === 3 || inBar === 7 || inBar === 8 || inBar === 10 || inBar === 14) {
        const bassNote = inBar === 10 ? rootN + 7 : rootN;
        tone(time, midi(bassNote), 0.16, 'sawtooth', 0.045, musicBus);
        tone(time, midi(bassNote), 0.18, 'square', 0.02, musicBus);
      }
      if (inBar === 0) {
        for (let i = 0; i < chord.length; i++) {
          tone(time, midi(chord[i]), STEP * 15.5, 'triangle', 0.012, musicBus);
          tone(time, midi(chord[i]) * 1.005, STEP * 15.5, 'sine', 0.01, musicBus);
        }
      }
      const leadN = lead[step % lead.length];
      if (leadN) tone(time, midi(leadN), 0.22, 'square', 0.02, musicBus);
    }

    function tick() {
      if (dead || !ctx || ctx.state !== 'running' || !started) return;
      try {
        let guard = 0;
        while (nextTime < ctx.currentTime + 0.22 && guard++ < 8) {
          schedule(stepIndex, nextTime);
          stepIndex = (stepIndex + 1) % LOOP;
          nextTime += STEP;
        }
      } catch (err) {
        fail();
      }
    }

    function ensureEngine() {
      if (dead || engine || !ctx) return;
      try {
      engine = ctx.createOscillator();
      engine.type = 'triangle';
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 280;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engine.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(sfxBus);
      engine.start();
      } catch (err) {
        engine = null;
        fail();
      }
    }

    function setEngine(speed, nitro, on) {
      if (dead || !ctx || ctx.state !== 'running') return;
      try {
        ensureEngine();
        if (!engine || !engineGain || !engineFilter) return;
        const sp = Math.abs(speed || 0);
        const target = on ? Math.min(0.05, 0.008 + sp / 7000) : 0;
        engineGain.gain.setTargetAtTime(target * (0.35 + sfxVol), ctx.currentTime, 0.08);
        const freq = 48 + sp * 0.42 + (nitro ? 30 : 0);
        engine.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
        engineFilter.frequency.setTargetAtTime(220 + sp * 1.4 + (nitro ? 400 : 0), ctx.currentTime, 0.05);
      } catch (err) {
        fail();
      }
    }

    function blip(freq, dur, type, peak) {
      if (!ctx || ctx.state !== 'running') return;
      tone(ctx.currentTime, freq, dur, type, peak * sfxVol, sfxBus);
    }

    function play(ev) {
      if (!ev) return;
      if (!ensure()) return;
      if (!ctx || ctx.state !== 'running') {
        resume();
        if (ctx && !ev._retried) {
          ev._retried = true;
          const p = ctx.resume();
          if (p && p.then) p.then(function () { play(ev); }, function () { fail(); });
        }
        return;
      }
      const now = ctx.currentTime;
      if (ev.t === 'deliver') {
        tone(now, midi(76), 0.12, 'triangle', 0.08 * sfxVol, sfxBus);
        tone(now + 0.09, midi(79), 0.12, 'triangle', 0.07 * sfxVol, sfxBus);
        tone(now + 0.18, midi(84), 0.2, 'triangle', 0.08 * sfxVol, sfxBus);
      } else if (ev.t === 'bump') {
        noiseHit(now, 0.18, 0.12 * sfxVol, 240, 0.8, sfxBus);
        tone(now, 90, 0.2, 'sine', 0.08 * sfxVol, sfxBus, 50);
      } else if (ev.t === 'nearmiss') {
        tone(now, midi(88), 0.08, 'square', 0.04 * sfxVol, sfxBus);
        tone(now + 0.06, midi(93), 0.1, 'square', 0.035 * sfxVol, sfxBus);
      } else if (ev.t === 'fuel' || ev.t === 'refuel') {
        tone(now, midi(67), 0.1, 'sawtooth', 0.04 * sfxVol, sfxBus);
        tone(now + 0.08, midi(74), 0.14, 'sawtooth', 0.04 * sfxVol, sfxBus);
      } else if (ev.t === 'time') {
        tone(now, midi(86), 0.09, 'sine', 0.05 * sfxVol, sfxBus);
        tone(now + 0.07, midi(91), 0.12, 'sine', 0.05 * sfxVol, sfxBus);
      } else if (ev.t === 'boost') {
        noiseHit(now, 0.16, 0.06 * sfxVol, 900, 0.5, sfxBus);
        tone(now, 180, 0.18, 'sawtooth', 0.04 * sfxVol, sfxBus, 520);
      } else if (ev.t === 'side' || ev.t === 'load') {
        tone(now, midi(72), 0.1, 'triangle', 0.05 * sfxVol, sfxBus);
      } else if (ev.t === 'clear') {
        [72, 76, 79, 84].forEach(function (n, i) {
          tone(now + i * 0.09, midi(n), 0.18, 'triangle', 0.06 * sfxVol, sfxBus);
        });
      } else if (ev.t === 'fail') {
        tone(now, midi(64), 0.2, 'sawtooth', 0.04 * sfxVol, sfxBus);
        tone(now + 0.16, midi(60), 0.28, 'sawtooth', 0.04 * sfxVol, sfxBus);
      } else if (ev.t === 'tick') {
        blip(880, 0.05, 'square', 0.03);
      } else if (ev.t === 'lowfuel') {
        blip(196, 0.12, 'square', 0.04);
      } else if (ev.t === 'ui') {
        blip(660, 0.04, 'square', 0.03);
      }
    }

    function state() {
      if (dead) return 'closed';
      return ctx ? ctx.state : 'none';
    }

    return {
      resume: resume,
      tick: tick,
      setMusic: setMusic,
      setSfx: setSfx,
      setEngine: setEngine,
      play: play,
      state: state
    };
  }

  return { create: create };
});
