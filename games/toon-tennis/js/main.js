import { createAudio } from './audio.js';
import { createRenderer, unproject } from './draw.js';
import { digits, pointText, t } from './i18n.js';
import { addPoint, scoreNames } from './scoring.js';
import { createMatchState, playerLimits, step } from './sim.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();

const menu = document.getElementById('menu');
const creditsPanel = document.getElementById('credits');
let showCredits = false;
const pausePanel = document.getElementById('pause');
const matchPanel = document.getElementById('match');
const hud = document.getElementById('hud');
const banner = document.getElementById('banner');
const touch = document.getElementById('touch');
const rotate = document.getElementById('rotate');

const SAVE_KEY = 'toon-tennis-en';

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
const fingers = new Map();
const hover = [null, null];
let latency = null;
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
  menu.hidden = phase !== 'menu' || showCredits;
  creditsPanel.hidden = !(phase === 'menu' && showCredits);
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
  showCredits = false;
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
  showCredits = false;
  startMatch();
});
document.getElementById('btn-credits').addEventListener('click', () => {
  showCredits = true;
  updateHud();
  audio.play('ui');
});
document.getElementById('btn-credits-close').addEventListener('click', () => {
  showCredits = false;
  updateHud();
  audio.play('ui');
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

function worldFromClient(clientX, clientY, who) {
  const p = layoutPoint(clientX, clientY);
  const world = unproject(renderer.layout(), p.x, p.y);
  const limits = playerLimits(who);
  return {
    x: Math.max(limits.x0, Math.min(limits.x1, world.x)),
    z: Math.max(limits.z0, Math.min(limits.z1, world.z)),
  };
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
  for (const rec of fingers.values()) goto[rec.who] = worldFromClient(rec.clientX, rec.clientY, rec.who);
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
    z: null,
    expectedX: null,
    expectedZ: null,
  };
}

function pointerZone(event) {
  return event.clientX < window.innerWidth / 2 ? 0 : 1;
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
  const hit = event.target && event.target.closest ? event.target.closest('.hitbtn') : null;
  if (hit && fresh) {
    if (event.cancelable) event.preventDefault();
    swingEdge[controlIndex(Number(hit.dataset.hit))] = true;
    audio.unlock();
    return;
  }
  if (event.cancelable) event.preventDefault();
  const pt = samplePoint(event);
  let rec = fingers.get(event.pointerId);
  if (!rec && !fresh && event.pointerType === 'mouse' && !event.buttons) {
    const who = assignWho(event);
    if (who == null) return;
    if ([...fingers.values()].some((item) => item.who === who)) return;
    hover[who] = worldFromClient(pt.x, pt.y, who);
    syncGoto();
    noteLatency(who, pt.x, pt.y);
    audio.unlock();
    return;
  }
  if (!rec) {
    if (!fresh) return;
    const who = assignWho(event);
    if (who == null) return;
    hover[who] = null;
    rec = { who, clientX: pt.x, clientY: pt.y, moved: false, originX: pt.x, originY: pt.y };
  } else if (Math.hypot(pt.x - rec.originX, pt.y - rec.originY) > 12) {
    rec.moved = true;
  }
  rec.clientX = pt.x;
  rec.clientY = pt.y;
  fingers.set(event.pointerId, rec);
  syncGoto();
  noteLatency(rec.who, pt.x, pt.y);
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
  el.addEventListener('pointermove', (event) => {
    if (fingers.has(event.pointerId)) mouseOn = true;
    trackPointer(event, false);
  }, pointerOpts);
  const end = (event) => {
    const rec = fingers.get(event.pointerId);
    if (rec) hover[rec.who] = worldFromClient(rec.clientX, rec.clientY, rec.who);
    fingers.delete(event.pointerId);
    syncGoto();
    if (rec && !rec.moved && phase === 'play') swingEdge[rec.who] = true;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
document.querySelectorAll('.half').forEach(bindPointer);
bindPointer(canvas);

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
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      goto[0] = null;
      hover[0] = null;
    }
    if (event.code.startsWith('Arrow')) {
      goto[1] = null;
      hover[1] = null;
    }
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
  syncGoto();
  const p1x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const p1z = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const p2x = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  const p2z = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
  const g0 = p1x || p1z ? null : goto[0];
  const g1 = p2x || p2z ? null : goto[1];
  return [
    { mx: p1x, mz: p1z, swing: swingEdge[0], snap: !!g0, gotoX: g0?.x, gotoZ: g0?.z },
    { mx: p2x, mz: p2z, swing: swingEdge[1], snap: !!g1, gotoX: g1?.x, gotoZ: g1?.z },
  ];
}

function placeSnapped() {
  if (phase !== 'play') return;
  const inputs = readInputs();
  for (let i = 0; i < 2; i++) {
    const input = inputs[i];
    if (!input.snap || !Number.isFinite(input.gotoX) || !Number.isFinite(input.gotoZ)) continue;
    const player = state.players[i];
    const limits = playerLimits(player.side);
    player.x = Math.max(limits.x0, Math.min(limits.x1, input.gotoX));
    player.z = Math.max(limits.z0, Math.min(limits.z1, input.gotoZ));
    player.vx = 0;
    player.vz = 0;
  }
  if (latency && !latency.applied) {
    latency.applied = performance.now();
    latency.lag = latency.applied - latency.eventTime;
    const who = latency.who;
    const expected = worldFromClient(latency.clientX, latency.clientY, who);
    latency.x = state.players[who].x;
    latency.z = state.players[who].z;
    latency.expectedX = expected.x;
    latency.expectedZ = expected.z;
  }
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
  swingEdge[0] = false;
  swingEdge[1] = false;
  renderer.frame(state, now / 1000);
  if (latency && latency.applied && !latency.rendered) latency.rendered = performance.now();
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
      message: state.message?.key || '',
      time: state.time,
    };
  },
  latency() { return latency; },
  worldFromClient,
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
