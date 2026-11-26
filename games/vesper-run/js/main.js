import { createGame } from './sim.js';
import { createAudio } from './audio.js';
import { render } from './draw.js';

const STEP = 1 / 60;
const DESKTOP_VIEW_H = 432;
const TOUCH_VIEW_H = 380;
const audio = createAudio();
const game = createGame({ sfx: audio });

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d', { alpha: false });
const touchRoot = document.getElementById('touch');
const toastEl = document.getElementById('toast');

const keys = { left: false, right: false, jump: false, run: false };
const touch = { left: false, right: false, jump: false, run: false };
const ptr = new Map();
let jumpEdge = false;
let runEdge = false;
let jumpQueue = 0;
let jumpArm = false;
let published = { left: false, right: false, jump: false, run: false };
let acc = 0;
let last = performance.now();
let cssW = 1;
let cssH = 1;
let dpr = 1;
let padJumpWas = false;
let padRunWas = false;

const MUTE_KEY = 'vesper-run-mute';
try {
  if (localStorage.getItem(MUTE_KEY) === '1') audio.setMuted(true);
} catch { /* ignore */ }

function publish() {
  published = {
    left: keys.left || touch.left,
    right: keys.right || touch.right,
    jump: keys.jump || touch.jump,
    run: keys.run || touch.run,
  };
  for (const btn of touchRoot.querySelectorAll('[data-act]')) {
    btn.classList.toggle('held', !!touch[btn.dataset.act]);
  }
}

function actAt(x, y) {
  const nodes = touchRoot.querySelectorAll('[data-act]');
  for (const n of nodes) {
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return n.dataset.act;
  }
  return null;
}

function syncTouch() {
  const next = { left: false, right: false, jump: false, run: false };
  for (const a of ptr.values()) if (a) next[a] = true;
  if (next.jump && !touch.jump) jumpEdge = true;
  if (next.run && !touch.run) runEdge = true;
  touch.left = next.left;
  touch.right = next.right;
  touch.jump = next.jump;
  touch.run = next.run;
  publish();
}

window.addEventListener('pointerdown', (e) => {
  audio.unlock();
  const act = actAt(e.clientX, e.clientY);
  if (!act) return;
  if (e.cancelable) e.preventDefault();
  ptr.set(e.pointerId, act);
  try { e.target.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
  syncTouch();
}, { passive: false });

window.addEventListener('pointermove', (e) => {
  if (!ptr.has(e.pointerId)) return;
  ptr.set(e.pointerId, actAt(e.clientX, e.clientY));
  syncTouch();
}, { passive: false });

function endPointer(e) {
  if (!ptr.has(e.pointerId)) return;
  ptr.delete(e.pointerId);
  syncTouch();
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
window.addEventListener('blur', () => {
  ptr.clear();
  keys.left = keys.right = keys.jump = keys.run = false;
  touch.left = touch.right = touch.jump = touch.run = false;
  publish();
});

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyZ: 'jump', KeyW: 'jump', ArrowUp: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run',
};

window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (e.code === 'Space' || e.code.startsWith('Arrow') || KEYS[e.code]) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.phase === 'play') game.pause();
    else if (game.phase === 'pause') game.resume();
    paintPhase();
    return;
  }
  if ((e.code === 'Enter' || e.code === 'Space') && game.phase === 'title') {
    startRun();
    return;
  }
  if (game.phase !== 'play' || e.repeat) return;
  const act = KEYS[e.code];
  if (!act) return;
  if (act === 'jump') {
    if (!keys.jump) jumpEdge = true;
    keys.jump = true;
  } else if (act === 'run') {
    if (!keys.run) runEdge = true;
    keys.run = true;
  } else keys[act] = true;
  publish();
}, true);

window.addEventListener('keyup', (e) => {
  const act = KEYS[e.code];
  if (!act) return;
  keys[act] = false;
  publish();
});

function readPad() {
  const out = { left: false, right: false, jump: false, run: false, jumpPressed: false, runPressed: false };
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of pads) {
    if (!g) continue;
    const ax = g.axes[0] || 0;
    if (ax < -0.35 || g.buttons[14]?.pressed) out.left = true;
    if (ax > 0.35 || g.buttons[15]?.pressed) out.right = true;
    if (g.buttons[0]?.pressed || g.buttons[12]?.pressed) out.jump = true;
    if (g.buttons[1]?.pressed || g.buttons[7]?.pressed || g.buttons[5]?.pressed) out.run = true;
  }
  if (out.jump && !padJumpWas) out.jumpPressed = true;
  if (out.run && !padRunWas) out.runPressed = true;
  padJumpWas = out.jump;
  padRunWas = out.run;
  return out;
}

function isTouchLayout() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 520;
  return coarse || (navigator.maxTouchPoints > 0 && landscape);
}

function currentView() {
  const touch = isTouchLayout();
  const viewH = touch ? TOUCH_VIEW_H : DESKTOP_VIEW_H;
  return { w: cssW * (viewH / cssH), h: viewH, touch };
}

function resize() {
  cssW = window.innerWidth;
  cssH = Math.max(1, window.innerHeight);
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const view = currentView();
  game.viewW = view.w;
  game.viewH = view.h;
  game.touchLayout = view.touch;
  syncPads();
}

function syncPads() {
  const show = isTouchLayout();
  touchRoot.classList.toggle('on', show);
}

function pad(n, w) {
  const s = String(Math.max(0, Math.floor(n)));
  return s.length >= w ? s : '0'.repeat(w - s.length) + s;
}
function clock(t) {
  const s = Math.floor(t);
  return `${pad(Math.floor(s / 60), 2)}:${pad(s % 60, 2)}`;
}

function paintPhase() {
  document.body.dataset.phase = game.phase;
  const snap = game.snapshot();
  const best = pad(snap.best, 6);
  document.getElementById('title-best').textContent = best;
  document.getElementById('hud-best').textContent = best;
  document.getElementById('hud-score').textContent = pad(snap.score, 6);
  document.getElementById('hud-shards').textContent = String(snap.shards);
  document.getElementById('hud-time').textContent = clock(snap.time);
  document.getElementById('hud-level').textContent = (snap.levelName || 'VESPER').toUpperCase();
  const lives = document.getElementById('hud-lives');
  lives.replaceChildren();
  for (let i = 0; i < 6; i++) {
    const pip = document.createElement('i');
    if (i < snap.lives) pip.className = 'on';
    lives.appendChild(pip);
  }
  const forms = [];
  if (snap.player?.bulk) forms.push('FRAME');
  if (snap.player?.arc) forms.push('SPOOL');
  document.getElementById('hud-forms').textContent = forms.join('  ');
  if (game.phase === 'play' && game.toastT > 0 && game.toast) {
    toastEl.textContent = game.toast;
    toastEl.classList.add('on');
    toastEl.style.opacity = game.toastT < 0.4 ? String(game.toastT / 0.4) : '1';
  } else {
    toastEl.classList.remove('on');
    toastEl.style.opacity = '0';
  }
  if (game.phase === 'clear' || game.phase === 'victory' || game.phase === 'over') {
    document.getElementById('clear-name').textContent = snap.levelName.toUpperCase();
    document.getElementById('clear-time').textContent = clock(snap.time);
    document.getElementById('clear-score').textContent = pad(snap.score, 6);
    document.getElementById('clear-best').textContent = best;
    document.getElementById('clear-new').classList.toggle('on', !!game.freshBest);
    document.getElementById('over-score').textContent = pad(snap.score, 6);
    document.getElementById('over-best').textContent = best;
    document.getElementById('win-score').textContent = pad(snap.score, 6);
    document.getElementById('win-best').textContent = best;
    document.getElementById('win-new').classList.toggle('on', !!game.freshBest);
  }
  document.getElementById('btn-mute').textContent = audio.muted ? 'OFF' : 'SND';
}

function startRun() {
  if (game.phase === 'play') return;
  audio.unlock();
  game.startRun();
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  paintPhase();
}

function wire(id, fn) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', (e) => {
    if (e.cancelable) e.preventDefault();
    audio.unlock();
    fn();
  });
}

wire('btn-start', startRun);
wire('btn-resume', () => { game.resume(); paintPhase(); });
wire('btn-retry', () => { game.retryLevel(); paintPhase(); });
wire('btn-quit', () => { game.toTitle(); paintPhase(); });
wire('btn-next', () => { game.nextLevel(); paintPhase(); });
wire('btn-again', startRun);
wire('btn-over-title', () => { game.toTitle(); paintPhase(); });
wire('btn-win-again', startRun);
wire('btn-pause', () => { game.pause(); paintPhase(); });
wire('btn-mute', () => {
  audio.setMuted(!audio.muted);
  try { localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0'); } catch { /* ignore */ }
  paintPhase();
});

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  if (dt < 0) dt = 0;
  const view = currentView();
  game.viewW = view.w;
  game.viewH = view.h;
  game.touchLayout = view.touch;
  if (game.phase === 'play') audio.music(dt);
  else if (game.phase === 'title') {
    game.tickTitle(dt);
    audio.music(dt * 0.5);
  }
  const pad = game.phase === 'play' ? readPad() : { left: false, right: false, jump: false, run: false, jumpPressed: false, runPressed: false };
  if (game.phase === 'play') {
    acc += dt;
    let first = true;
    let n = 0;
    while (acc >= STEP && n < 6) {
      const input = {
        left: keys.left || touch.left || pad.left,
        right: keys.right || touch.right || pad.right,
        jumpHeld: keys.jump || touch.jump || pad.jump,
        run: keys.run || touch.run || pad.run,
        jumpPressed: first && (jumpEdge || pad.jumpPressed),
        runPressed: first && (runEdge || pad.runPressed),
      };
      if (jumpQueue > 0) {
        input.jumpHeld = true;
        if (jumpArm) input.jumpPressed = true;
        jumpArm = false;
        jumpQueue -= 1;
      }
      if (typeof window.__VR_DRIVER === 'function') {
        const driven = window.__VR_DRIVER(game.sensors(), game.snapshot().player) || {};
        input.left = input.left || !!driven.left;
        input.right = input.right || !!driven.right;
        input.jumpHeld = input.jumpHeld || !!driven.jumpHeld;
        input.run = input.run || !!driven.run;
        input.jumpPressed = input.jumpPressed || !!driven.jumpPressed;
        input.runPressed = input.runPressed || !!driven.runPressed;
      }
      game.step(STEP, input, view);
      first = false;
      acc -= STEP;
      n += 1;
    }
    if (n === 6) acc = 0;
  } else acc = 0;
  jumpEdge = false;
  runEdge = false;
  render(ctx, game, cssW, cssH, dpr);
  paintPhase();
}

window.__VR = {
  state: () => game.snapshot(),
  sensors: () => game.sensors(),
  input: () => ({ ...published }),
  cam: () => ({ x: game.cam.x, y: game.cam.y }),
  view: () => ({ w: game.viewW, h: game.viewH, touch: game.touchLayout }),
  queueJump(frames) {
    jumpQueue = frames;
    jumpArm = true;
  },
};

resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
document.body.dataset.ready = '1';
document.body.dataset.phase = game.phase;
paintPhase();
requestAnimationFrame(frame);
