/** Procedural sounds. Master gain plus a compressor keep peaks from clipping. */
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
    master.gain.value = enabled ? 0.28 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.14;
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
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, peak, freq) {
    const ac = ensure();
    if (!ac || !enabled) return;
    const length = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ac.createGain();
    const t = ac.currentTime;
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    setEnabled(on) {
      enabled = !!on;
      if (master) master.gain.value = enabled ? 0.28 : 0;
    },
    get enabled() {
      return enabled;
    },
    play(name) {
      if (name === 'hit') {
        tone(620, 0.09, 'square', 0.12, 220);
        noise(0.05, 0.05, 1800);
      } else if (name === 'bounce') {
        tone(210, 0.07, 'sine', 0.1, 90);
      } else if (name === 'net') {
        noise(0.09, 0.08, 400);
        tone(90, 0.12, 'triangle', 0.08, 50);
      } else if (name === 'fault' || name === 'doublefault') {
        tone(140, 0.16, 'sawtooth', 0.06, 70);
      } else if (name === 'out') {
        tone(180, 0.12, 'triangle', 0.07, 80);
      } else if (name === 'point' || name === 'game' || name === 'deuce' || name === 'adv' || name === 'match') {
        tone(523, 0.1, 'triangle', 0.08);
        tone(659, 0.12, 'triangle', 0.07);
        tone(784, 0.16, 'triangle', 0.07);
      } else if (name === 'let' || name === 'serve-in') {
        tone(480, 0.08, 'sine', 0.06, 640);
      } else if (name === 'ui') {
        tone(700, 0.05, 'sine', 0.05);
      }
    },
  };
}
