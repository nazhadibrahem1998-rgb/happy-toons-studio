export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let unlocked = false;
  let musicTimer = 0;
  let step = 0;
  const bass = [110, 110, 130.81, 164.81, 98, 110, 87.31, 130.81];

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.22;
        master.connect(ctx.destination);
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      const pending = ctx.resume();
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    unlocked = true;
    try {
      const c = ac();
      if (!c) return;
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      src.start(0);
    } catch { /* autoplay lock */ }
  }

  function envGain(t, attack, dur, peak) {
    const g = ctx.createGain();
    g.connect(master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  function tone(freq, dur, type, peak, slide) {
    const c = ac();
    if (!c || muted) return;
    try {
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    const g = envGain(t, 0.008, dur, peak);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
    } catch { /* device busy */ }
  }

  function noise(dur, peak) {
    const c = ac();
    if (!c || muted) return;
    try {
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const g = envGain(c.currentTime, 0.005, dur, peak);
    src.connect(filter);
    filter.connect(g);
    src.start();
    } catch { /* device busy */ }
  }

  function music(dt) {
    if (!unlocked) return;
    const c = ac();
    if (!c || muted) return;
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 0.34;
    const f = bass[step % bass.length];
    step += 1;
    tone(f, 0.28, 'triangle', 0.045, f * 0.99);
    if (step % 2 === 0) noise(0.04, 0.02);
  }

  return {
    unlock,
    music,
    setMuted(v) {
      muted = v;
      if (master) master.gain.value = muted ? 0 : 0.22;
    },
    get muted() { return muted; },
    jump() { tone(420, 0.09, 'square', 0.06, 720); },
    stomp() { noise(0.08, 0.08); tone(140, 0.1, 'square', 0.07, 70); },
    shard() { tone(880, 0.07, 'sine', 0.06); tone(1320, 0.09, 'sine', 0.05); },
    crate() { noise(0.07, 0.07); tone(220, 0.08, 'square', 0.05, 90); },
    power() {
      tone(440, 0.08, 'square', 0.05);
      setTimeout(() => tone(554, 0.08, 'square', 0.05), 70);
      setTimeout(() => tone(659, 0.1, 'square', 0.05), 140);
    },
    shoot() { tone(640, 0.06, 'square', 0.04, 180); },
    hurt() { tone(300, 0.14, 'sawtooth', 0.05, 80); },
    die() { tone(360, 0.28, 'sawtooth', 0.06, 55); noise(0.16, 0.05); },
    clear() {
      [311, 392, 466, 622].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.05), i * 70));
    },
    check() { tone(660, 0.08, 'sine', 0.05); },
    gate() { tone(240, 0.12, 'square', 0.04, 720); },
    boss() { noise(0.1, 0.08); tone(90, 0.16, 'square', 0.07, 50); },
    down() { tone(80, 0.4, 'sawtooth', 0.07, 40); noise(0.25, 0.06); },
  };
}
