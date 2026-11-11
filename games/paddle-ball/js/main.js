import { createAudio } from './audio.js';
import { createRenderer, unproject } from './draw.js';
import { digits, t } from './i18n.js';
import { addPoint } from './scoring.js';
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

const SAVE_KEY = 'paddle-ball-en';

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

function applyDailyLaunch() {
  const HS = window.HappyScores;
  if (!HS) return;
  let daily = false;
  try { daily = new URLSearchParams(location.search).has('daily'); } catch (err) { daily = false; }
  if (!daily) return;
  const ch = HS.challenge();
  if (ch.id !== 'paddle-ball') return;
  if (ch.level === 7 || ch.level === 11) settings.target = ch.level;
  saveSettings();
}
applyDailyLaunch();

let phase = 'menu';
let seed = 4;
let state = createMatchState({ mode: 'demo', difficulty: 'normal', target: 7, seed });
const keys = new Set();
const goto = [null, null];
const fingers = new Map();
const hover = [null, null];
let latency = null;

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
  if (window.HappyScores) window.HappyScores.paintNote('paddle-ball', document.getElementById('dailyNote'));
  paintPaddleBest();
}

function paintPaddleBest() {
  const n = window.HappyScores ? window.HappyScores.getBest('paddle-ball') : 0;
  const text = 'Best: ' + (n > 0 ? n : '—');
  const menu = document.getElementById('menuBest');
  const hud = document.getElementById('hudBest');
  if (menu) menu.textContent = text;
  if (hud) hud.textContent = text;
}

let endShown = false;
let endIsNew = false;
let notedPoints = -1;

function syncPaddleScore() {
  const HS = window.HappyScores;
  if (!HS || (phase !== 'play' && phase !== 'pause')) return;
  const points = state.score.points[0];
  const atEnd = state.stage === 'match';
  if (points !== notedPoints) {
    notedPoints = points;
    const result = HS.record('paddle-ball', points, state.score.goal);
    if (result.isNew && points > 0) endIsNew = true;
    paintPaddleBest();
  }
  if (atEnd && !endShown && phase === 'play') {
    endShown = true;
    const best = HS.getBest('paddle-ball');
    HS.showEnd({
      scoreEl: document.getElementById('matchScore'),
      tryEl: document.getElementById('matchTry'),
      id: 'paddle-ball',
      from: 'games/paddle-ball',
      score: points,
      best: Math.max(best, points),
      isNew: endIsNew,
    });
  }
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
    if (state.stage === 'match') {
      const who = names()[state.score.winner] || '';
      const youWon = settings.lang === 'en' && settings.mode !== 'local' && state.score.winner === 0;
      text = youWon ? 'You win!' : `${who} ${t(settings.lang, 'wins')}`.trim();
    }
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
  document.body.classList.toggle('hts-over', !matchPanel.hidden);
  syncPaddleScore();
  menu.hidden = phase !== 'menu';
  pausePanel.hidden = phase !== 'pause';
  const showTouch = playing && matchPanel.hidden && touchWanted();
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
  armBack();
  seed += 1;
  state = createMatchState({
    mode: settings.mode,
    difficulty: settings.difficulty,
    target: settings.target,
    seed,
  });
  phase = 'play';
  endShown = false;
  endIsNew = false;
  notedPoints = -1;
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
  else if (phase === 'pause') { phase = 'play'; armBack(); }
  updateHud();
  audio.play('ui');
}

let backArmed = false;
function armBack() {
  if (backArmed) return;
  try { history.pushState({ hts: 'play' }, ''); backArmed = true; } catch (err) {}
}
function guarded(el, fn) {
  if (!el) return;
  let last = 0;
  let sx = 0;
  let sy = 0;
  let moved = false;
  const run = (fromPointer) => {
    if (fromPointer && moved) return;
    const now = performance.now();
    if (now - last < 350) return;
    last = now;
    fn();
  };
  // iOS drops the click when a touchend called preventDefault. pointerup still arrives.
  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    sx = event.clientX;
    sy = event.clientY;
    moved = false;
  });
  el.addEventListener('pointermove', (event) => {
    if (Math.hypot(event.clientX - sx, event.clientY - sy) > 16) moved = true;
  });
  el.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    run(true);
  });
  el.addEventListener('click', () => run(false));
}

guarded(document.getElementById('play'), () => { audio.unlock(); startMatch(); });
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
  guarded(btn, () => {
    audio.unlock();
    setSound(!settings.sound);
    audio.play('ui');
  });
});
guarded(document.getElementById('btn-pause'), togglePause);
guarded(document.getElementById('btn-resume'), togglePause);
guarded(document.getElementById('btn-restart'), startMatch);
document.getElementById('btn-menu').addEventListener('click', goMenu);
guarded(document.getElementById('btn-again'), startMatch);
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

function layoutPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const sx = canvas.width / Math.max(1, rect.width);
  const sy = canvas.height / Math.max(1, rect.height);
  return {
    x: (clientX - rect.left) * sx / dpr,
    y: (clientY - rect.top) * sy / dpr,
  };
}

function worldFromClient(clientX, clientY) {
  const p = layoutPoint(clientX, clientY);
  const world = unproject(renderer.layout(), p.x, p.y);
  return { x: paddleLimit(world.x, COURT.paddleW) };
}

function samplePoint(event) {
  let x = event.clientX;
  let y = event.clientY;
  if (typeof event.getCoalescedEvents === 'function') {
    try {
      const extra = event.getCoalescedEvents();
      if (extra && extra.length) {
        const last = extra[extra.length - 1];
        if (Number.isFinite(last.clientX) && Number.isFinite(last.clientY)) {
          x = last.clientX;
          y = last.clientY;
        }
      }
    } catch { /* some browsers throw if the event is already gone */ }
  }
  return { x, y };
}

function syncGoto() {
  goto[0] = hover[0];
  goto[1] = hover[1];
  for (const rec of fingers.values()) goto[rec.who] = worldFromClient(rec.clientX, rec.clientY);
}

function noteLatency(who, clientX, clientY) {
  latency = {
    eventTime: performance.now(),
    who,
    clientX,
    clientY,
    applied: 0,
    rendered: 0,
    lag: 0,
    x: null,
    expectedX: null,
  };
}

function assignWho(event) {
  const half = event.target && event.target.closest ? event.target.closest('.half') : null;
  if (half) return controlIndex(Number(half.dataset.zone));
  const zone = pointerZone(event);
  if (event.pointerType === 'mouse' && settings.mode === 'local' && zone === 1) return null;
  return controlIndex(zone);
}

function trackPointer(event, fresh) {
  if (phase !== 'play') return;
  if (event.cancelable) event.preventDefault();
  const pt = samplePoint(event);
  let who = fingers.get(event.pointerId)?.who;
  if (who == null && !fresh && event.pointerType === 'mouse' && !event.buttons && settings.mode !== 'local') {
    who = assignWho(event);
    if (who == null) return;
    if ([...fingers.values()].some((item) => item.who === who)) return;
    hover[who] = worldFromClient(pt.x, pt.y);
    syncGoto();
    noteLatency(who, pt.x, pt.y);
    audio.unlock();
    return;
  }
  if (who == null) {
    if (!fresh) return;
    who = assignWho(event);
    if (who == null) return;
    hover[who] = null;
  }
  fingers.set(event.pointerId, { who, clientX: pt.x, clientY: pt.y });
  syncGoto();
  noteLatency(who, pt.x, pt.y);
  audio.unlock();
}

const pointerOpts = { passive: false };
function bindPointer(el) {
  el.addEventListener('pointerdown', (event) => {
    trackPointer(event, true);
    if (el.setPointerCapture && fingers.has(event.pointerId)) {
      try { el.setPointerCapture(event.pointerId); } catch { /* some browsers reject capture */ }
    }
  }, pointerOpts);
  el.addEventListener('pointermove', (event) => trackPointer(event, false), pointerOpts);
  const end = (event) => {
    const rec = fingers.get(event.pointerId);
    if (rec) hover[rec.who] = worldFromClient(rec.clientX, rec.clientY);
    fingers.delete(event.pointerId);
    syncGoto();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
document.querySelectorAll('.half').forEach(bindPointer);
bindPointer(canvas);

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
    hover[0] = null;
    event.preventDefault();
  } else if (event.code.startsWith('Arrow')) {
    goto[1] = null;
    hover[1] = null;
    event.preventDefault();
  }
  audio.unlock();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  keys.clear();
  if (phase === 'play') {
    phase = 'pause';
    updateHud();
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || phase !== 'play') return;
  keys.clear();
  phase = 'pause';
  updateHud();
});
window.addEventListener('popstate', () => {
  backArmed = false;
  if (phase !== 'play') return;
  keys.clear();
  phase = 'pause';
  updateHud();
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function axis(neg, pos) {
  return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
}

function readInputs() {
  syncGoto();
  const p1 = axis('KeyA', 'KeyD') || axis('KeyS', 'KeyW');
  const p2 = axis('ArrowLeft', 'ArrowRight') || axis('ArrowDown', 'ArrowUp');
  const g0 = p1 ? null : goto[0];
  const g1 = p2 ? null : goto[1];
  return [
    { mx: p1, snap: !!g0, gotoX: g0 ? g0.x : undefined },
    { mx: p2, snap: !!g1, gotoX: g1 ? g1.x : undefined },
  ];
}

function placeSnapped() {
  if (phase !== 'play') return;
  const inputs = readInputs();
  for (let i = 0; i < 2; i++) {
    const input = inputs[i];
    if (!input.snap || !Number.isFinite(input.gotoX)) continue;
    const paddle = state.paddles[i];
    paddle.x = paddleLimit(input.gotoX, paddle.w);
    paddle.vx = 0;
  }
  if (latency && !latency.applied) {
    latency.applied = performance.now();
    latency.lag = latency.applied - latency.eventTime;
    const who = latency.who;
    latency.x = state.paddles[who].x;
    latency.expectedX = worldFromClient(latency.clientX, latency.clientY).x;
  }
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
  placeSnapped();
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
  if (latency && latency.applied && !latency.rendered) latency.rendered = performance.now();
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
      ball: state.ball ? { x: state.ball.x, y: state.ball.y, vx: state.ball.vx, vy: state.ball.vy, inPlay: state.ball.inPlay } : null,
      time: state.time,
    };
  },
  latency() { return latency; },
  worldFromClient,
  award(winner) {
    const result = addPoint(state.score, winner);
    if (result.type === 'match' || state.score.over) {
      state.stage = 'match';
      state.message = { key: 'match', winner: state.score.winner, timer: 0 };
      if (state.ball) state.ball.inPlay = false;
    } else {
      state.stage = 'between';
      state.betweenT = 0.45;
      state.server = winner;
      state.message = { key: 'point', winner, timer: 0.45 };
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
window.addEventListener('orientationchange', () => { setTimeout(resize, 60); setTimeout(resize, 280); });
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
if (window.__htsBoot) window.__htsBoot(() => { audio.unlock(); startMatch(); });
requestAnimationFrame(frame);
