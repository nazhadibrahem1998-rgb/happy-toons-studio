import { createAudio } from './audio.js';
import { createRenderer, unproject } from './draw.js';
import { digits, t } from './i18n.js';
import { COURT, createMatchState, paddleLimit, step } from './sim.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();
const menu = document.getElementById('menu');
const pausePanel = document.getElementById('pause');
const matchPanel = document.getElementById('match');
const hud = document.getElementById('hud');
const banner = document.getElementById('banner');
const touch = document.getElementById('touch');

const SAVE_KEY = 'paddle-ball-settings';

function loadSettings() {
  const base = { mode: 'cpu', difficulty: 'normal', target: 7, lang: 'en', sound: true };
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!saved) return base;
    return {
      mode: saved.mode === 'local' ? 'local' : 'cpu',
      difficulty: ['easy', 'normal', 'hard'].includes(saved.difficulty) ? saved.difficulty : 'normal',
      target: saved.target === 11 ? 11 : 7,
      lang: saved.lang === 'ckb' ? 'ckb' : 'en',
      sound: saved.sound !== false,
    };
  } catch {
    return base;
  }
}

let settings = loadSettings();
let phase = 'menu';
let seed = 4;
let state = createMatchState({ mode: 'demo', difficulty: 'normal', target: 7, seed });
const keys = new Set();
const goto = [null, null];

function saveSettings() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}

function applyLang() {
  const lang = settings.lang;
  document.documentElement.lang = lang === 'ckb' ? 'ckb' : 'en';
  document.documentElement.dir = lang === 'ckb' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.getElementById('lang-en').classList.toggle('on', lang === 'en');
  document.getElementById('lang-ckb').classList.toggle('on', lang === 'ckb');
  document.getElementById('lang-en').setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  document.getElementById('lang-ckb').setAttribute('aria-pressed', lang === 'ckb' ? 'true' : 'false');
  const ku = document.getElementById('credit-ku');
  ku.hidden = lang !== 'ckb';
  ku.textContent = t('ckb', 'creditKu');
  syncButtons();
  updateHud();
}

function syncButtons() {
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    const on = btn.dataset.mode === settings.mode;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    const on = btn.dataset.diff === settings.difficulty;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-len]').forEach((btn) => {
    const on = Number(btn.dataset.len) === settings.target;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.getElementById('diff-row').hidden = settings.mode !== 'cpu';
  const soundLabel = `${t(settings.lang, 'sound')}: ${t(settings.lang, settings.sound ? 'on' : 'off')}`;
  document.querySelectorAll('[data-sound]').forEach((btn) => {
    btn.textContent = soundLabel;
    btn.setAttribute('aria-pressed', settings.sound ? 'true' : 'false');
  });
  document.querySelectorAll('[data-hint]').forEach((el) => {
    const zone = Number(el.dataset.hint);
    el.textContent = settings.mode === 'local'
      ? t(settings.lang, zone === 0 ? 'p1' : 'p2')
      : t(settings.lang, 'drag');
  });
}

function names() {
  const lang = settings.lang;
  if (settings.mode === 'local') return [t(lang, 'p1'), t(lang, 'p2')];
  return [t(lang, 'you'), t(lang, 'cpu')];
}

function updateHud() {
  const playing = phase === 'play' || phase === 'pause';
  hud.hidden = !playing;
  const [n0, n1] = names();
  document.getElementById('name0').textContent = n0;
  document.getElementById('name1').textContent = n1;
  document.getElementById('games0').textContent = digits(settings.lang, state.score.points[0]);
  document.getElementById('games1').textContent = digits(settings.lang, state.score.points[1]);
  document.getElementById('goal').textContent = `${t(settings.lang, 'to')} ${digits(settings.lang, state.score.goal)}`;
  let text = '';
  if (playing) {
    if (state.stage === 'match') text = `${names()[state.score.winner] || ''} ${t(settings.lang, 'wins')}`.trim();
    else if (state.message?.timer > 0 && state.message.key) {
      text = state.message.key === 'serve'
        ? `${names()[state.message.winner]} ${t(settings.lang, 'serve')}`
        : t(settings.lang, state.message.key);
    }
  }
  banner.hidden = !text;
  banner.textContent = text;
  matchPanel.hidden = !(phase === 'play' && state.stage === 'match');
  if (!matchPanel.hidden) document.getElementById('match-title').textContent = text;
  menu.hidden = phase !== 'menu';
  pausePanel.hidden = phase !== 'pause';
  const showTouch = playing && touchWanted();
  touch.classList.toggle('is-on', showTouch);
  touch.setAttribute('aria-hidden', showTouch ? 'false' : 'true');
}

function touchWanted() {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function setLang(lang) {
  settings.lang = lang === 'ckb' ? 'ckb' : 'en';
  saveSettings();
  applyLang();
  audio.play('ui');
}

function setSound(on) {
  settings.sound = !!on;
  audio.setEnabled(settings.sound);
  saveSettings();
  syncButtons();
}

function startMatch() {
  seed += 1;
  state = createMatchState({
    mode: settings.mode,
    difficulty: settings.difficulty,
    target: settings.target,
    seed,
  });
  phase = 'play';
  goto[0] = null;
  goto[1] = null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  updateHud();
  audio.play('ui');
}

function goMenu() {
  seed += 1;
  state = createMatchState({ mode: 'demo', difficulty: 'normal', target: settings.target, seed });
  phase = 'menu';
  updateHud();
  audio.play('ui');
}

function togglePause() {
  if (phase === 'play') phase = 'pause';
  else if (phase === 'pause') phase = 'play';
  updateHud();
  audio.play('ui');
}

document.getElementById('play').addEventListener('click', () => { audio.unlock(); startMatch(); });
document.querySelectorAll('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.mode = btn.dataset.mode === 'local' ? 'local' : 'cpu';
    saveSettings();
    syncButtons();
    audio.play('ui');
  });
});
document.querySelectorAll('[data-diff]').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.difficulty = btn.dataset.diff;
    saveSettings();
    syncButtons();
    audio.play('ui');
  });
});
document.querySelectorAll('[data-len]').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.target = Number(btn.dataset.len) === 11 ? 11 : 7;
    saveSettings();
    syncButtons();
    audio.play('ui');
  });
});
document.querySelectorAll('[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});
document.querySelectorAll('[data-sound]').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.unlock();
    setSound(!settings.sound);
    audio.play('ui');
  });
});
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-restart').addEventListener('click', startMatch);
document.getElementById('btn-menu').addEventListener('click', goMenu);
document.getElementById('btn-again').addEventListener('click', startMatch);
document.getElementById('btn-match-menu').addEventListener('click', goMenu);

function portraitNow() {
  return window.innerHeight >= window.innerWidth;
}

function controlIndex(zone) {
  if (settings.mode !== 'local') return 0;
  return zone === 1 ? 1 : 0;
}

function pointerZone(event) {
  if (portraitNow()) return event.clientY > window.innerHeight / 2 ? 0 : 1;
  return event.clientX < window.innerWidth / 2 ? 0 : 1;
}

function pointerToX(event) {
  const rect = canvas.getBoundingClientRect();
  const world = unproject(renderer.layout(), event.clientX - rect.left, event.clientY - rect.top);
  return paddleLimit(world.x, COURT.paddleW);
}

document.querySelectorAll('.half').forEach((half) => {
  half.addEventListener('pointerdown', (event) => {
    if (phase !== 'play') return;
    audio.unlock();
    const zone = Number(half.dataset.zone);
    const who = controlIndex(zone);
    goto[who] = pointerToX(event);
    half.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  half.addEventListener('pointermove', (event) => {
    if (phase !== 'play' || !half.hasPointerCapture(event.pointerId)) return;
    goto[controlIndex(Number(half.dataset.zone))] = pointerToX(event);
  });
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' || phase !== 'play') return;
  audio.unlock();
  aimMouse(event);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || phase !== 'play') return;
  if (event.buttons === 0 && settings.mode === 'local') return;
  aimMouse(event);
});

function aimMouse(event) {
  const zone = pointerZone(event);
  if (settings.mode === 'local' && zone === 1 && event.pointerType === 'mouse') return;
  const who = settings.mode === 'local' ? zone : 0;
  goto[who] = pointerToX(event);
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  keys.add(event.code);
  if ((event.code === 'Escape' || event.code === 'KeyP') && (phase === 'play' || phase === 'pause')) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (phase !== 'play') return;
  if (['KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(event.code)) {
    goto[0] = null;
    event.preventDefault();
  } else if (event.code.startsWith('Arrow')) {
    goto[1] = null;
    event.preventDefault();
  }
  audio.unlock();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function axis(neg, pos) {
  return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
}

function readInputs() {
  const p1 = axis('KeyA', 'KeyD') || axis('KeyS', 'KeyW');
  const p2 = axis('ArrowLeft', 'ArrowRight') || axis('ArrowDown', 'ArrowUp');
  return [
    { mx: p1, gotoX: p1 ? undefined : goto[0] },
    { mx: p2, gotoX: p2 ? undefined : goto[1] },
  ];
}

function tick(dt) {
  if (phase === 'pause') return;
  if (phase === 'menu') {
    step(state, null, dt);
    if (state.stage === 'match') {
      seed += 1;
      state = createMatchState({ mode: 'demo', difficulty: 'normal', target: 7, seed });
    }
    return;
  }
  const events = step(state, readInputs(), dt);
  const rally = state.ball?.rally || 0;
  for (const name of events) {
    if (name === 'hit' || name === 'wall' || name === 'point' || name === 'match' || name === 'serve') {
      audio.play(name, rally);
    }
  }
}

function resize() {
  const vv = window.visualViewport;
  const w = vv ? vv.width : window.innerWidth;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', `${h}px`);
  renderer.resize(w, h);
  touch.classList.toggle('portrait', h >= w);
  touch.classList.toggle('landscape', w > h);
  updateHud();
}

let acc = 0;
let last = 0;
function frame(now) {
  if (!last) last = now;
  let delta = now - last;
  last = now;
  if (delta > 250) delta = 250;
  acc += delta;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 5) {
    tick(1 / 60);
    acc -= 1000 / 60;
    steps += 1;
  }
  renderer.frame(state);
  if (phase !== 'menu') updateHud();
  document.body.dataset.phase = phase;
  document.body.dataset.ready = '1';
  requestAnimationFrame(frame);
}

window.__PB = {
  get() {
    return {
      phase,
      stage: state.stage,
      mode: settings.mode,
      difficulty: settings.difficulty,
      goal: state.score.goal,
      points: state.score.points.slice(),
      lang: settings.lang,
      sound: settings.sound,
      portrait: portraitNow(),
      paddles: state.paddles.map((p) => ({ x: p.x, y: p.y, side: p.side })),
      ball: state.ball ? { x: state.ball.x, y: state.ball.y, vx: state.ball.vx, vy: state.ball.vy } : null,
    };
  },
};

audio.setEnabled(settings.sound);
applyLang();
resize();
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
requestAnimationFrame(frame);
