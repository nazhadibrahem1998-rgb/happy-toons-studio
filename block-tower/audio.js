/** Short original tones made in the browser. No sample files. */

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function tone(freq, dur = 0.08, type = 'square', gain = 0.035) {
  if (muted) return;
  let ac;
  try {
    ac = context();
  } catch {
    return;
  }
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp);
  amp.connect(ac.destination);
  const t0 = ac.currentTime;
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playJump() { tone(540, 0.06, 'square', 0.03); }
export function playCheckpoint() { tone(660, 0.07, 'square', 0.03); setTimeout(() => tone(880, 0.09, 'square', 0.03), 70); }
export function playDeath() { tone(140, 0.12, 'sawtooth', 0.03); }
export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'square', 0.03), i * 90));
}
