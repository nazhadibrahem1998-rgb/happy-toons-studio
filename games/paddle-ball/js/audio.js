/** Procedural sounds through a master gain and a compressor. */
export function createAudio() {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = enabled ? 0.26 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, type, peak, slide) {
    const ac = ensure();
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    setEnabled(on) {
      enabled = !!on;
      if (master) master.gain.value = enabled ? 0.26 : 0;
    },
    play(name, rally = 0) {
      if (name === 'hit') {
        const f = 420 + Math.min(18, rally) * 28;
        tone(f, 0.07, 'square', 0.09, f * 0.55);
      } else if (name === 'wall') {
        tone(240, 0.05, 'sine', 0.05, 140);
      } else if (name === 'point' || name === 'match') {
        tone(523, 0.09, 'triangle', 0.08);
        tone(659, 0.11, 'triangle', 0.07);
        tone(784, 0.15, 'triangle', 0.07);
      } else if (name === 'serve') {
        tone(360, 0.08, 'sine', 0.06, 520);
      } else if (name === 'ui') {
        tone(680, 0.05, 'sine', 0.045);
      }
    },
  };
}
