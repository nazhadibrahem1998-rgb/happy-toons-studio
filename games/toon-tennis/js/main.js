import { createAudio } from './audio.js';
import { createRenderer, unproject } from './draw.js';
import { digits, pointText, t } from './i18n.js';
import { addPoint, scoreNames } from './scoring.js';
import { createMatchState, playerLimits, step } from './sim.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();

const menu = document.getElementById('menu');
const pausePanel = document.getElementById('pause');
const matchPanel = document.getElementById('match');
const hud = document.getElementById('hud');
const banner = document.getElementById('banner');
const touch = document.getElementById('touch');
const rotate = document.getElementById('rotate');

const SAVE_KEY = 'toon-tennis-settings';

function loadSettings() {
  const base = { mode: 'cpu', difficulty: 'normal', gamesToWin: 3, lang: 'en', sound: true };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return {
      mode: saved.mode === 'local' ? 'local' : 'cpu',
      difficulty: ['easy', 'normal', 'hard'].includes(saved.difficulty) ? saved.difficulty : 'normal',
      gamesToWin: saved.gamesToWin === 5 ? 5 : 3,
      lang: saved.lang === 'ckb' ? 'ckb' : 'en',
      sound: saved.sound !== false,
    };
  } catch {
    return base;
  }
}

let settings = loadSettings();
let phase = 'menu';
let seed = 7;
let state = createMatchState({ mode: 'demo', difficulty: 'normal', seed });

const keys = new Set();
const swingEdge = [false, false];
const goto = [null, null];
let mouseOn = false;

function saveSettings() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(settings));
  } catch {
    /* private mode */
  }
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
    btn.classList.toggle('on', btn.dataset.mode === settings.mode);
    btn.setAttribute('aria-pressed', btn.dataset.mode === settings.mode ? 'true' : 'false');
  });
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.diff === settings.difficulty);
    btn.setAttribute('aria-pressed', btn.dataset.diff === settings.difficulty ? 'true' : 'false');
  });
  document.querySelectorAll('[data-len]').forEach((btn) => {
    const on = Number(btn.dataset.len) === settings.gamesToWin;
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
  const games = state.match.games;
  document.getElementById('games0').textContent = digits(settings.lang, games[0]);
  document.getElementById('games1').textContent = digits(settings.lang, games[1]);
  const [a, b] = scoreNames(state.match);
  const pts = document.getElementById('pts');
  if (a === 'deuce' && b === 'deuce') pts.textContent = t(settings.lang, 'deuce');
  else pts.textContent = `${pointText(settings.lang, a)}  –  ${pointText(settings.lang, b)}`;

  let text = '';
  if (phase === 'play' || phase === 'pause') {
    if (state.stage === 'match') {
      text = `${names()[state.match.winner] || ''} ${t(settings.lang, 'wins')}`.trim();
    } else if (state.stage === 'serve') {
      const server = state.match.server;
      text = `${names()[server]} ${t(settings.lang, 'serve')}`;
    } else if (state.message && state.message.timer > 0 && state.message.key) {
      text = t(settings.lang, state.message.key);
    }
  }
  banner.hidden = !text;
  banner.textContent = text;

  matchPanel.hidden = !(phase === 'play' && state.stage === 'match');
  if (!matchPanel.hidden) {
    document.getElementById('match-title').textContent = text;
  }
  menu.hidden = phase !== 'menu';
  pausePanel.hidden = phase !== 'pause';
  touch.classList.toggle('is-on', playing && touchWanted());
  touch.setAttribute('aria-hidden', playing ? 'false' : 'true');
}

function touchWanted() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse || navigator.maxTouchPoints > 0;
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
    gamesToWin: settings.gamesToWin,
    seed,
  });
  phase = 'play';
  swingEdge[0] = false;
  swingEdge[1] = false;
  goto[0] = null;
  goto[1] = null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  updateHud();
  audio.play('ui');
}

function restartMatch() {
  startMatch();
}

function goMenu() {
  seed += 1;
  state = createMatchState({ mode: 'demo', difficulty: 'normal', seed });
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

document.getElementById('play').addEventListener('click', () => {
  audio.unlock();
  startMatch();
});
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
    settings.gamesToWin = Number(btn.dataset.len) === 5 ? 5 : 3;
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
document.getElementById('btn-restart').addEventListener('click', restartMatch);
document.getElementById('btn-menu').addEventListener('click', goMenu);
document.getElementById('btn-again').addEventListener('click', restartMatch);
document.getElementById('btn-match-menu').addEventListener('click', goMenu);

function controlIndex(zone) {
  if (settings.mode !== 'local') return 0;
  return zone === 1 ? 1 : 0;
}

function zoneToWorld(index, localX, localY) {
  const limits = playerLimits(index);
  return {
    x: limits.x0 + clamp01(localX) * (limits.x1 - limits.x0),
    z: limits.z1 - clamp01(localY) * (limits.z1 - limits.z0),
  };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

const pointers = new Map();
document.querySelectorAll('.half').forEach((half) => {
  half.addEventListener('pointerdown', (event) => {
    if (phase !== 'play') return;
    audio.unlock();
    const hit = event.target.closest('.hitbtn');
    if (hit) {
      swingEdge[controlIndex(Number(hit.dataset.hit))] = true;
      event.preventDefault();
      return;
    }
    half.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, {
      zone: Number(half.dataset.zone),
      x: event.clientX,
      y: event.clientY,
      moved: false,
    });
    event.preventDefault();
  });
  half.addEventListener('pointermove', (event) => {
    const rec = pointers.get(event.pointerId);
    if (!rec || phase !== 'play') return;
    if (Math.hypot(event.clientX - rec.x, event.clientY - rec.y) > 12) rec.moved = true;
    const rect = half.getBoundingClientRect();
    const who = controlIndex(rec.zone);
    goto[who] = zoneToWorld(
      who,
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    );
  });
  const end = (event) => {
    const rec = pointers.get(event.pointerId);
    if (!rec) return;
    pointers.delete(event.pointerId);
    if (!rec.moved && phase === 'play') swingEdge[controlIndex(rec.zone)] = true;
  };
  half.addEventListener('pointerup', end);
  half.addEventListener('pointercancel', end);
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' || phase !== 'play') return;
  audio.unlock();
  const who = mousePlayer(event);
  if (who == null) return;
  swingEdge[who] = true;
  aimMouse(event, who);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || phase !== 'play') return;
  const who = mousePlayer(event);
  if (who == null) return;
  mouseOn = true;
  aimMouse(event, who);
});

function mousePlayer(event) {
  if (settings.mode === 'local' && event.clientX > window.innerWidth / 2) return null;
  return 0;
}

function aimMouse(event, who) {
  const rect = canvas.getBoundingClientRect();
  const world = unproject(renderer.layout(), event.clientX - rect.left, event.clientY - rect.top);
  const limits = playerLimits(who);
  goto[who] = {
    x: Math.max(limits.x0, Math.min(limits.x1, world.x)),
    z: Math.max(limits.z0, Math.min(limits.z1, world.z)),
  };
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  keys.add(event.code);
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (phase === 'play' || phase === 'pause') {
      event.preventDefault();
      togglePause();
    }
    return;
  }
  if (phase !== 'play') return;
  if (event.code === 'Space') {
    swingEdge[0] = true;
    event.preventDefault();
  } else if (event.code === 'Enter') {
    swingEdge[settings.mode === 'local' ? 1 : 0] = true;
    event.preventDefault();
  } else if (event.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    event.preventDefault();
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) goto[0] = null;
    if (event.code.startsWith('Arrow')) goto[1] = null;
  }
  audio.unlock();
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});
window.addEventListener('blur', () => {
  keys.clear();
});

function readInputs() {
  const p1x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const p1z = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const p2x = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  const p2z = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
  const g0 = p1x || p1z ? null : goto[0];
  const g1 = p2x || p2z ? null : goto[1];
  return [
    { mx: p1x, mz: p1z, swing: swingEdge[0], gotoX: g0?.x, gotoZ: g0?.z },
    { mx: p2x, mz: p2z, swing: swingEdge[1], gotoX: g1?.x, gotoZ: g1?.z },
  ];
}

const SOUND_EVENTS = new Set([
  'hit', 'bounce', 'net', 'fault', 'doublefault', 'let', 'out', 'point', 'game', 'match', 'deuce', 'adv', 'serve-in',
]);

function tick(dt) {
  if (phase === 'pause') return;
  if (phase === 'menu') {
    step(state, null, dt);
    if (state.stage === 'match') {
      seed += 1;
      state = createMatchState({ mode: 'demo', difficulty: 'normal', seed });
    }
    return;
  }
  const events = step(state, readInputs(), dt);
  for (const name of events) {
    if (SOUND_EVENTS.has(name)) audio.play(name);
  }
  if (state.stage === 'match') matchPanel.hidden = false;
}

function resize() {
  const vv = window.visualViewport;
  const w = vv ? vv.width : window.innerWidth;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', `${h}px`);
  renderer.resize(w, h);
  const portrait = h > w + 40;
  rotate.hidden = !(touchWanted() && portrait && phase === 'play');
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
  swingEdge[0] = false;
  swingEdge[1] = false;
  renderer.frame(state, now / 1000);
  if (phase !== 'menu') updateHud();
  document.body.dataset.phase = phase;
  document.body.dataset.ready = '1';
  requestAnimationFrame(frame);
}

window.__TT = {
  get() {
    return {
      phase,
      stage: state.stage,
      mode: settings.mode,
      difficulty: settings.difficulty,
      gamesToWin: state.match.gamesToWin,
      points: state.match.points.slice(),
      games: state.match.games.slice(),
      server: state.match.server,
      lang: settings.lang,
      sound: settings.sound,
      players: state.players.map((p) => ({ x: p.x, z: p.z, side: p.side })),
      ball: state.ball ? { x: state.ball.x, y: state.ball.y, z: state.ball.z, inPlay: state.ball.inPlay } : null,
      time: state.time,
    };
  },
  award(winner) {
    const result = addPoint(state.match, winner);
    if (result.type === 'game') {
      state.stage = 'between';
      state.betweenT = 0.45;
      state.message = { key: 'game', winner, timer: 0.45 };
    }
    if (result.type === 'match' || state.match.over) {
      state.stage = 'match';
      state.message = { key: 'match', winner: state.match.winner, timer: 0 };
      if (state.ball) state.ball.inPlay = false;
    }
    updateHud();
    return this.get();
  },
};

audio.setEnabled(settings.sound);
applyLang();
resize();
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
requestAnimationFrame(frame);
