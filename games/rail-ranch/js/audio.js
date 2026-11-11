export function createAudio() {
  let ctx = null;
  let master = null;
  let enabled = true;
  let noise = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (err) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = enabled ? 0.22 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.005;
    comp.release.value = 0.12;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, type, peak, slide) {
    const ac = ensure();
    if (!ac || !enabled) return;
    let t;
    try { t = ac.currentTime; } catch (err) { return; }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    try {
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (err) { /* no audio device */ }
  }

  return {
    unlock() {
      const ac = ensure();
      if (!ac) return;
      const pending = ac.resume && ac.resume();
      if (pending && pending.catch) {
        pending.catch(() => {
          enabled = false;
          if (master) master.gain.value = 0;
        });
      }
    },
    get enabled() { return enabled; },
    setEnabled(on) {
      enabled = !!on;
      if (master) master.gain.value = enabled ? 0.22 : 0;
    },
    puff() {
      const ac = ensure();
      if (!ac || !enabled) return;
      try {
      if (!noise) {
        noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const src = ac.createBufferSource();
      src.buffer = noise;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      const gain = ac.createGain();
      const t = ac.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.035, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      src.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        src.start(t);
        src.stop(t + 0.14);
      } catch (err) {
        enabled = false;
      }
    },
    play(name) {
      if (!enabled) return;
      if (name === 'sale') {
        tone(880, 0.08, 'triangle', 0.08);
        tone(1180, 0.12, 'triangle', 0.06);
      } else if (name === 'pickup') {
        tone(620, 0.06, 'sine', 0.05, 420);
      } else if (name === 'buy') {
        tone(523, 0.08, 'triangle', 0.07);
        tone(659, 0.1, 'triangle', 0.06);
        tone(784, 0.14, 'triangle', 0.06);
      } else if (name === 'goal') {
        tone(523, 0.09, 'triangle', 0.07);
        tone(659, 0.1, 'triangle', 0.06);
        tone(784, 0.12, 'triangle', 0.06);
        tone(1046, 0.16, 'triangle', 0.05);
      } else if (name === 'deny') {
        tone(150, 0.1, 'square', 0.04, 90);
      } else if (name === 'ui') {
        tone(720, 0.05, 'sine', 0.04);
      } else if (name === 'truck') {
        tone(280, 0.07, 'sine', 0.04, 180);
      }
    },
  };
}
