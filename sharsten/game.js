/**
 * گوندی شارستێن — Sharsten Village.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 */
import {
  COSTS, MAP_BOUND, SAVE_KEY, SETTINGS_KEY, SEASONS,
  advanceHours, assignJob, cameraBasis, cameraEyeY, canPlace, celebrateNewroz,
  cellToWorld, clamp, clampToMap, cleanMosque, createState, demolish, fixSpring, worldToCell,
  harvest, parseSave, phaseOf, place, plant, select, serialize, setEasy, setHour, setSeason, setStock,
  acceptQuest, advanceTutorial, animalCap, astarRoute, carryBudget, completeGoal, dismissNotice, DONKEY_SPEED,
  driveVehicle, enterAnimal, enterVehicle, isUnlocked, jobUnlocked, setRank, TUTORIAL_STEPS, unlocks,
  exitAnimal, exitVehicle, herdSpot, moveGoods, nearestAnimal, nearestVehicle, npcActiveCap, npcSchedule, rideAnimal,
  stepAnimals as stepAnimalAi, stepNpcs as stepNpcAi, stepVehicles as stepVehicleAi, turnInQuest, vehicleCap,
  LAYOUT, isRoad, metersToUnits, playable, reachExit, renderRadiusUnits, secondsThisHour, snapshot, stickVector, suggestCell, tick, upgrade, viewAxes, walkStep,
  craft, dismissStage, equipTool, gather, nearestNode, recipeList, stageSnapshot,
  cleanSpot, repairNear, helpDeed, refuseDeed, shove, acceptFine, dismissConfront, tradeList, tradeWith, setRaids, bonk, settleQuarrel, holdPrayer, prayerClock,
  plough, sow, waterField, millGrain, bakeBread,
} from './sim.js';
import { formatClock, formatNum, i18nAudit, linePairs, npcLine, t } from './i18n.js';
import { createView } from './world.js';

const canvas = document.getElementById('c');
const testMode = new URLSearchParams(location.search).has('test');
const coarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const RES = ['wood', 'stone', 'clay', 'water', 'food', 'money', 'grain', 'flour', 'wool', 'fibre', 'ore', 'eggs'];
const RES_ICON = {
  wood: '🪵', stone: '🪨', clay: '🫙', water: '💧', food: '🍞', money: '🪙',
  grain: '🌾', flour: '⚪', wool: '🐑', fibre: '🌿', ore: '⛏️', eggs: '🥚',
};
const JOBS = ['idle', 'farmer', 'shepherd', 'baker', 'miller', 'weaver', 'smith', 'builder', 'teacher', 'healer', 'host'];
const PANELS = ['help', 'credits', 'quests', 'people', 'build', 'craft', 'detail', 'pause'];

let lang = 'ckb';
let quality = coarse ? 'mid' : 'high';
if (navigator.deviceMemory && navigator.deviceMemory <= 2) quality = 'low';
let stickPref = !!coarse;
let adhanOn = true;
let raidsOn = true;
let alwaysDay = true;
let quarrelsOn = true;
let easy = false;
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  if (saved) {
    if (saved.lang === 'ckb' || saved.lang === 'en') lang = saved.lang;
    if (saved.quality === 'low' || saved.quality === 'mid' || saved.quality === 'high') quality = saved.quality;
    if (typeof saved.sticks === 'boolean') stickPref = saved.sticks;
    if (typeof saved.easy === 'boolean') easy = saved.easy;
    if (typeof saved.adhan === 'boolean') adhanOn = saved.adhan;
    if (typeof saved.raids === 'boolean') raidsOn = saved.raids;
    if (typeof saved.alwaysDay === 'boolean') alwaysDay = saved.alwaysDay;
    if (typeof saved.quarrels === 'boolean') quarrelsOn = saved.quarrels;
  }
} catch { /* keep defaults */ }
const lowQ = () => quality === 'low';

let state = parseSave(localStorage.getItem(SAVE_KEY)) || createState();
state.easy = easy;
state.raids = raidsOn;
state.quarrelsOn = quarrelsOn;
let playing = false;
let buildType = null;
let peopleSig = '';
let questSig = '';
let goalSig = '';
let toastLeft = 0;
let edgeLeft = 0;
let saveLeft = 0;
const keys = new Set();
const sticks = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 };
const mosqueView = cellToWorld(LAYOUT.mosque.gx, LAYOUT.mosque.gz);
const buildCam = { yaw: 0.62, pitch: 1.02, dist: 8.5, x: mosqueView.x, z: mosqueView.z };
let ps1 = true;
let riding = false;
const walkCam = { yaw: -1.2, pitch: 0.42 };

const view = createView(canvas);
view.setQuality(quality);
view.setDaylight(alwaysDay);
view.resize();

const resbar = document.getElementById('resbar');
RES.forEach((key) => {
  const chip = document.createElement('span');
  chip.className = 'res-chip';
  chip.title = '';
  chip.innerHTML = `<i aria-hidden="true">${RES_ICON[key] || ''}</i><em data-i18n="${key}"></em><b id="res-${key}" dir="ltr"></b>`;
  resbar.appendChild(chip);
});

const buildList = document.getElementById('buildList');
Object.keys(COSTS).forEach((type) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'build-btn';
  btn.dataset.build = type;
  btn.innerHTML = `<span data-i18n="${type}"></span><small dir="ltr"></small>`;
  btn.addEventListener('click', () => {
    buildType = type;
    paint();
  });
  buildList.appendChild(btn);
});

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      lang,
      quality,
      adhan: adhanOn,
      raids: raidsOn,
      alwaysDay,
      quarrels: quarrelsOn,
      sticks: stickPref,
      easy,
    }));
  } catch { /* ignore */ }
}

function persist() {
  try { localStorage.setItem(SAVE_KEY, serialize(state)); } catch { /* ignore */ }
}

function player() {
  return state.villagers.find((v) => v.player) || state.villagers[0];
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.hidden = !msg;
  el.textContent = msg || '';
  toastLeft = msg ? 2.4 : 0;
}

function applyLang() {
  document.documentElement.lang = lang === 'ckb' ? 'ckb' : 'en';
  document.documentElement.dir = lang === 'ckb' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.getElementById('langEn').classList.toggle('on', lang === 'en');
  document.getElementById('langCkb').classList.toggle('on', lang === 'ckb');
  document.getElementById('langEn').setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  document.getElementById('langCkb').setAttribute('aria-pressed', lang === 'ckb' ? 'true' : 'false');
  document.getElementById('title').textContent = t(lang, 'title');
  document.getElementById('subtitle').textContent = t(lang, 'subtitle');
  document.title = `${t(lang, 'title')} — ${t(lang, 'studio')}`;
  const logo = document.querySelector('.logo-row img');
  if (logo) logo.alt = t(lang, 'studio');
  ['zoomIn', 'zoomOut', 'rotLeft', 'rotRight'].forEach((id) => {
    document.getElementById(id).setAttribute('aria-label', t(lang, id));
  });
  peopleSig = '';
  paint();
  saveSettings();
}

function panelOpen() {
  return PANELS.some((id) => !document.getElementById(id).hidden);
}

function showControls() {
  const on = playing && !panelOpen();
  document.getElementById('hud').hidden = !playing;
  document.getElementById('camBtns').hidden = !(on && state.mode === 'build');
  document.getElementById('walkControls').hidden = !(on && state.mode === 'walk');
  document.getElementById('buildSticks').hidden = !(on && state.mode === 'build' && stickPref);
  document.body.dataset.mode = state.mode;
}

function openPanel(id) {
  PANELS.forEach((key) => { document.getElementById(key).hidden = key !== id; });
  showControls();
  paint();
}

function closePanels() {
  PANELS.forEach((key) => { document.getElementById(key).hidden = true; });
  showControls();
}

function setMode(mode) {
  const next = mode === 'walk' ? 'walk' : 'build';
  const enterWalk = next === 'walk' && state.mode !== 'walk';
  state.mode = next;
  if (enterWalk) {
    const p = player();
    p.tx = p.gx;
    p.tz = p.gz;
    faceMosque();
    walkCam.pitch = 0.42;
  }
  showControls();
  paint();
  persist();
}

function panBuild(dt) {
  const basis = cameraBasis(buildCam.yaw);
  let mx = sticks.panX + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let my = sticks.panY + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  const spd = 16 * dt * (buildCam.dist / 80);
  buildCam.x += (basis.right.x * mx - basis.forward.x * my) * spd;
  buildCam.z += (basis.right.z * mx - basis.forward.z * my) * spd;
  buildCam.yaw += (sticks.orbitX + (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0)) * dt * 1.3;
  buildCam.pitch = clamp(buildCam.pitch - sticks.orbitY * dt * 0.7, 0.45, 1.25);
  const lo = cellToWorld(MAP_BOUND.minGx, MAP_BOUND.minGz);
  const hi = cellToWorld(MAP_BOUND.maxGx, MAP_BOUND.maxGz);
  buildCam.x = clamp(buildCam.x, Math.min(lo.x, hi.x), Math.max(lo.x, hi.x));
  buildCam.z = clamp(buildCam.z, Math.min(lo.z, hi.z), Math.max(lo.z, hi.z));
  buildCam.dist = clamp(buildCam.dist, 6, 10);
}

function applyDrive(dt) {
  const v = state.vehicles.find((item) => item.id === state.drivenId);
  if (!v) {
    state.drivenId = 0;
    applyWalkBody(dt);
    return;
  }
  let mx = sticks.moveX + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let my = sticks.moveY + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  const result = driveVehicle(state, v.id, mx, my, dt);
  walkCam.yaw = v.yaw;
  if (result.hit && edgeLeft <= 0) {
    toast(t(lang, 'edge'));
    edgeLeft = 2.4;
  }
}

function applyRide(dt) {
  const a = state.animals.find((item) => item.id === state.riddenId);
  if (!a) {
    state.riddenId = 0;
    riding = false;
    applyWalkBody(dt);
    return;
  }
  let mx = sticks.moveX + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let my = sticks.moveY + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  const result = rideAnimal(state, a.id, mx, my, dt);
  walkCam.yaw = a.yaw || 0;
  if (result.hit && edgeLeft <= 0) {
    toast(t(lang, 'edge'));
    edgeLeft = 2.4;
  }
}

function applyWalk(dt) {
  if (state.drivenId) {
    applyDrive(dt);
    return;
  }
  if (state.riddenId) {
    applyRide(dt);
    return;
  }
  applyWalkBody(dt);
}

function applyWalkBody(dt) {
  const p = player();
  let mx = sticks.moveX + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let my = sticks.moveY + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  const lookX = sticks.lookX + (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  const lookY = sticks.lookY + (keys.has('KeyR') ? 1 : 0) - (keys.has('KeyF') ? 1 : 0);
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.65 : 1;
  const step = walkStep({ x: p.gx, z: p.gz }, walkCam.yaw, walkCam.pitch, mx, my, lookX, lookY, dt * run);
  const bounded = clampToMap(step.x, step.z);
  p.gx = bounded.gx;
  p.gz = bounded.gz;
  p.tx = bounded.gx;
  p.tz = bounded.gz;
  walkCam.yaw = step.yaw;
  walkCam.pitch = step.pitch;
  const held = holdPrayer(state);
  if (held.held) {
    p.gx = held.gx;
    p.gz = held.gz;
    p.tx = held.gx;
    p.tz = held.gz;
    p.ry = held.yaw;
  } else p.ry = walkCam.yaw;
  if (bounded.hit && edgeLeft <= 0) {
    toast(t(lang, 'edge'));
    edgeLeft = 3;
  }
}

function talkTo(v) {
  const q = (state.npcQuests || []).find((item) => item.giverId === v.id && item.status !== 'done');
  if (q && q.status === 'open') {
    acceptQuest(state, q.id);
    toast(npcLine(lang, q.offer));
    persist();
    questSig = '';
    paint();
    return;
  }
  if (q && q.status === 'active') {
    const result = turnInQuest(state, q.id);
    v.line = result.ok ? q.done : q.offer;
    v.sayLeft = 4;
    toast(npcLine(lang, v.line));
    if (result.ok) persist();
    questSig = '';
    paint();
    return;
  }
  v.line = `greet${v.id % 4}`;
  v.sayLeft = 2.5;
  v.greeting = true;
  completeGoal(state, 'greet');
  paint();
}

function faceMosque() {
  const p = player();
  walkCam.yaw = Math.atan2(LAYOUT.mosque.gx - p.gx, LAYOUT.mosque.gz - p.gz);
  p.ry = walkCam.yaw;
}

let adhanCtx = null;
let adhanBuf = null;
let adhanLive = null;
function loadAdhan() {
  if (adhanBuf || adhanCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  adhanCtx = new Ctx();
  fetch('audio/adhan.mp3').then((r) => r.arrayBuffer()).then((b) => adhanCtx.decodeAudioData(b)).then((buf) => { adhanBuf = buf; }).catch(() => {});
}
function playAdhan() {
  if (!adhanOn || !adhanCtx || !adhanBuf) return;
  if (adhanCtx.state === 'suspended') adhanCtx.resume();
  const src = adhanCtx.createBufferSource();
  src.buffer = adhanBuf;
  const gain = adhanCtx.createGain();
  gain.gain.value = 0.55;
  const panner = adhanCtx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'linear';
  panner.refDistance = 8;
  panner.maxDistance = 70;
  const mp = cellToWorld(LAYOUT.mosque.gx, LAYOUT.mosque.gz);
  if (panner.positionX) {
    panner.positionX.value = mp.x;
    panner.positionY.value = 2;
    panner.positionZ.value = mp.z;
  }
  src.connect(gain).connect(panner).connect(adhanCtx.destination);
  src.start();
  adhanLive = src;
}
function placeTags() {
  const you = document.getElementById('tagYou');
  const his = document.getElementById('tagMullah');
  if (!you || !his) return;
  const show = (el, b) => {
    if (!playing || !b) { el.hidden = true; return; }
    const pos = view.project(b.gx, b.gz);
    el.hidden = pos.y < 0 || pos.y > window.innerHeight;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
  };
  show(you, state.buildings.find((b) => b.tag === 'player'));
  show(his, state.buildings.find((b) => b.tag === 'mullah'));
  you.textContent = t(lang, 'yourHouse');
  his.textContent = t(lang, 'mullahHouse');
}
function openTrade(id) {
  const panel = document.getElementById('trade');
  if (!panel) return;
  panel.hidden = false;
  const list = document.getElementById('tradeList');
  list.innerHTML = '';
  tradeList(state, id).forEach((row) => {
    const line = document.createElement('div');
    line.className = 'quest';
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.textContent = formatNum(row.buy, lang);
    buy.addEventListener('click', () => {
      const result = tradeWith(state, id, row.key, 'buy');
      if (!result.ok) toast(t(lang, 'needCost'));
      openTrade(id);
      paint();
    });
    const sell = document.createElement('button');
    sell.type = 'button';
    sell.textContent = formatNum(row.sell, lang);
    sell.addEventListener('click', () => {
      const result = tradeWith(state, id, row.key, 'sell');
      if (!result.ok) toast(t(lang, 'needCost'));
      openTrade(id);
      paint();
    });
    const name = document.createElement('span');
    name.textContent = t(lang, row.key);
    line.append(name, buy, sell);
    list.appendChild(line);
  });
}
function openTalk(v) {
  const box = document.getElementById('talk');
  if (!box) return;
  box.hidden = false;
  box.dataset.who = String(v.id);
  const deed = (state.deeds || []).find((d) => d.giverId === v.id && d.status === 'open');
  document.getElementById('talkHelp').hidden = !deed;
  document.getElementById('talkNo').hidden = !deed;
  const low = (state.rep || 0) < -40 || v.angry || v.child;
  document.getElementById('talkTrade').disabled = !!low;
  document.getElementById('talkHit').hidden = !!(v.child || v.role === 'child');
}
function openQuarrel() {
  const box = document.getElementById('quarrel');
  const q = state.quarrel;
  if (!box || !q) return;
  box.hidden = false;
  const title = document.getElementById('quarrelTitle');
  const key = { land: 'qLand', property: 'qProperty', house: 'qHouse', trade: 'qTrade' }[q.topic] || 'qLand';
  if (title) title.textContent = t(lang, key);
  const a = state.villagers.find((v) => v.id === q.a);
  const b = state.villagers.find((v) => v.id === q.b);
  const name = (v) => (v ? (lang === 'ckb' ? v.nameCkb : v.name) : '');
  document.getElementById('sideA').textContent = `${t(lang, 'sideA')} · ${name(a)}`;
  document.getElementById('sideB').textContent = `${t(lang, 'sideB')} · ${name(b)}`;
}
function doAction() {
  const q = state.quarrel;
  if (q && playing) {
    const p = player();
    const near = state.villagers.some((v) => (v.id === q.a || v.id === q.b) && Math.hypot(v.gx - p.gx, v.gz - p.gz) < 2.4);
    if (near) { openQuarrel(); return; }
  }
  const cleaned = cleanSpot(state);
  if (cleaned.ok) { toast(t(lang, 'cleanAct')); persist(); paint(); return; }
  const fixed = repairNear(state);
  if (fixed.ok) { toast(t(lang, 'repairAct')); persist(); paint(); return; }
  const scared = bonk(state);
  if (scared.ok) { toast(t(lang, 'gdefend')); persist(); paint(); return; }
  const node = nearestNode(state);
  if (node && state.mode === 'walk') {
    const result = gather(state);
    if (!result.ok) toast(t(lang, result.reason === 'needAxe' || result.reason === 'needPick' ? result.reason : 'closer'));
    else toast(`+${formatNum(result.n, lang)} ${t(lang, result.key)}`);
    persist();
    paint();
    return;
  }
  const p = player();
  let npc = null;
  let npcD = 1.7;
  state.villagers.forEach((v) => {
    if (v.player) return;
    const d = Math.hypot(v.gx - p.gx, v.gz - p.gz);
    if (d < npcD) { npc = v; npcD = d; }
  });
  let best = null;
  let bestD = 1.8;
  state.buildings.forEach((b) => {
    const d = Math.hypot(b.gx - p.gx, b.gz - p.gz);
    if (d < bestD) { best = b; bestD = d; }
  });
  if (npc && (!best || npcD <= bestD)) {
    openTalk(npc);
    return;
  }
  if (!best) { toast(t(lang, 'closer')); return; }
  state.selectedId = best.id;
  openPanel('detail');
}

function paintStage() {
  const bar = document.getElementById('stageBar');
  if (!bar) return;
  const snap = stageSnapshot(state);
  bar.hidden = !playing;
  const title = document.getElementById('stageTitle');
  if (title) title.textContent = `${t(lang, 'stageWord')} ${formatNum(snap.stage, lang)} – ${t(lang, 'stageGoals')}`;
  const list = document.getElementById('stageGoals');
  if (list) {
    list.innerHTML = '';
    snap.goals.forEach((g) => {
      const li = document.createElement('li');
      li.textContent = `${g.done ? '✓' : '○'} ${t(lang, `g${g.id}`)}`;
      list.appendChild(li);
    });
  }
  const pop = document.getElementById('stagePop');
  if (pop) {
    pop.hidden = !snap.notice;
    const head = document.getElementById('stagePopTitle');
    if (head) head.textContent = t(lang, 'stageDone');
  }
}

function paintCraft() {
  const root = document.getElementById('craftList');
  if (!root) return;
  const rows = recipeList(state);
  const sig = JSON.stringify(rows.map((r) => [r.id, r.open, r.have, state.craftJob && state.craftJob.id]));
  if (root.dataset.sig === sig) {
    const bar = document.getElementById('craftBar');
    if (bar && state.craftJob) bar.style.width = `${Math.max(8, 100 - state.craftJob.left * 70)}%`;
    return;
  }
  root.dataset.sig = sig;
  root.innerHTML = '';
  rows.forEach((r) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'build-btn';
    btn.disabled = !r.open;
    const needs = Object.entries(r.need).map(([k, v]) => `${formatNum(v, lang)} ${t(lang, k)}`).join(' + ');
    const name = t(lang, r.out);
    btn.innerHTML = `<span>${r.open ? name : `${name} · ${t(lang, 'stageNeed')}`}</span><small dir="ltr">${needs}</small>`;
    btn.addEventListener('click', () => {
      if (!r.open) return;
      root.dataset.pick = r.id;
      document.getElementById('craftGo').dataset.recipe = r.id;
    });
    root.appendChild(btn);
  });
  const bar = document.getElementById('craftBar');
  if (bar) bar.style.width = state.craftJob ? '40%' : '0%';
}

function paintTutorial() {
  const box = document.getElementById('tutorial');
  if (!box) return;
  const step = state.tutorial == null ? 0 : state.tutorial;
  const show = playing && step >= 0;
  box.hidden = !show;
  if (!show) return;
  document.getElementById('tutorialText').textContent = t(lang, TUTORIAL_STEPS[Math.min(step, TUTORIAL_STEPS.length - 1)]);
  document.getElementById('tutorialNext').textContent = t(lang, 'tutNext');
}

function paintUnlock() {
  const box = document.getElementById('unlockPop');
  if (!box) return;
  const rank = state.notice || 0;
  box.hidden = !(playing && rank >= 1);
  if (box.hidden) return;
  document.getElementById('unlockTitle').textContent = t(lang, 'unlocked');
  document.getElementById('unlockText').textContent = t(lang, `unlock${rank}`);
}

function paintGoals() {
  const root = document.getElementById('goalList');
  if (!root) return;
  const goals = state.goals || [];
  const sig = `${lang}:${state.day}:${goals.map((g) => (g.done ? 1 : 0)).join('')}`;
  if (sig === goalSig) return;
  goalSig = sig;
  root.replaceChildren();
  const names = { place: 'gPlace', gather: 'gGather', greet: 'gGreet' };
  goals.forEach((g) => {
    const row = document.createElement('div');
    row.className = 'quest';
    const label = document.createElement('span');
    label.textContent = t(lang, names[g.id] || g.id);
    const mark = document.createElement('b');
    mark.textContent = g.done ? t(lang, 'qDone') : t(lang, 'qTodo');
    row.append(label, mark);
    root.appendChild(row);
  });
}

function paintQuestBoard() {
  const board = document.getElementById('questBoard');
  if (!board) return;
  const sig = `${lang}:${state.rev}:${(state.npcQuests || []).map((q) => `${q.id}:${q.status}`).join(',')}`;
  if (sig === questSig) return;
  questSig = sig;
  board.replaceChildren();
  (state.npcQuests || []).forEach((q) => {
    const row = document.createElement('div');
    row.className = 'quest';
    row.dataset.quest = q.id;
    const label = document.createElement('span');
    label.textContent = t(lang, q.titleKey);
    const status = document.createElement('b');
    const key = q.status === 'done' ? 'qDone' : q.status === 'active' ? 'qActive' : 'qOpen';
    status.textContent = t(lang, key);
    row.append(label, status);
    board.appendChild(row);
  });
}

function updateBoard() {
  const btn = document.getElementById('boardBtn');
  if (!btn) return;
  const show = playing && state.mode === 'walk' && !panelOpen();
  if (!show) { btn.hidden = true; return; }
  if (state.drivenId || state.riddenId) {
    btn.hidden = false;
    btn.textContent = t(lang, 'exit');
    return;
  }
  const who = player();
  const vehicle = nearestVehicle(state, who.gx, who.gz, 1.7);
  const donkey = nearestAnimal(state, 'donkey', who.gx, who.gz, 1.7);
  const near = vehicle || donkey;
  btn.hidden = !near;
  if (near) btn.textContent = t(lang, 'enter');
}

function villagerTitle(v) {
  const name = lang === 'ckb' ? v.nameCkb : v.name;
  if (v.role === 'mullah') return name;
  const key = { water: 'waterJob', child: 'childJob', faithful: 'neighbour', woodcutter: 'woodJob', stonecutter: 'stoneJob', player: 'you' }[v.role] || v.role || 'neighbour';
  const job = t(lang, key);
  return lang === 'ckb' ? `${name} – ${job}` : `${name}, ${job}`;
}
function updateSpeech() {
  const el = document.getElementById('speech');
  if (!el) return;
  const elder = document.getElementById('elder');
  if (!playing || (elder && !elder.hidden)) { el.hidden = true; return; }
  const p = player();
  let best = null;
  let bestD = 1.75;
  state.villagers.forEach((v) => {
    if (v.player || !v.line) return;
    const d = Math.hypot(v.gx - p.gx, v.gz - p.gz);
    if (d < bestD) { best = v; bestD = d; }
  });
  if (!best) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = `${villagerTitle(best)}\n${npcLine(lang, best.line)}`;
}

function paint() {
  RES.forEach((key) => {
    const el = document.getElementById(`res-${key}`);
    if (el) el.textContent = formatNum(state.resources[key], lang);
  });
  const wood = document.getElementById('stockWood');
  if (wood) wood.textContent = formatNum(state.resources.wood, lang);
  document.getElementById('clockTime').textContent = formatClock(state.hour, state.acc || 0, lang, secondsThisHour(state.hour));
  const season = t(lang, SEASONS[state.season]);
  const phase = t(lang, phaseOf(state.hour));
  document.getElementById('clockMeta').textContent = `${t(lang, 'day')} ${formatNum(state.day, lang)} · ${season} · ${phase}`;
  document.getElementById('modeBtn').textContent = state.mode === 'walk' ? t(lang, 'modeToBuild') : t(lang, 'modeToWalk');
  const qKey = quality === 'low' ? 'qualityLow' : quality === 'high' ? 'qualityHigh' : 'qualityMid';
  document.getElementById('qualityBtn').textContent = t(lang, qKey);
  paintStage();
  paintCraft();
  const repFill = document.getElementById('repFill');
  if (repFill) {
    const rep = Math.max(-100, Math.min(100, state.rep || 0));
    repFill.style.width = `${(rep + 100) / 2}%`;
  }
  const deedNum = document.getElementById('deedNum');
  if (deedNum) deedNum.textContent = formatNum(state.deedCount || 0, lang);
  const adhanBtn = document.getElementById('adhanBtn');
  if (adhanBtn) adhanBtn.textContent = adhanOn ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  const raidBtn = document.getElementById('raidBtn');
  if (raidBtn) raidBtn.textContent = raidsOn ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  const dayBtn = document.getElementById('dayBtn');
  if (dayBtn) dayBtn.textContent = alwaysDay ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  const quarrelBtn = document.getElementById('quarrelBtn');
  if (quarrelBtn) quarrelBtn.textContent = quarrelsOn ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  const act = document.getElementById('actionBtn');
  if (act && playing && state.mode === 'walk') {
    const node = nearestNode(state);
    act.textContent = node ? t(lang, node.kind === 'rock' ? 'mine' : 'chop') : t(lang, 'act');
  }
  document.getElementById('stickPref').textContent = stickPref ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  document.getElementById('ps1Btn').textContent = ps1 ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  const easyBtn = document.getElementById('easyBtn');
  if (easyBtn) {
    easyBtn.classList.toggle('on', !!state.easy);
    easyBtn.setAttribute('aria-pressed', state.easy ? 'true' : 'false');
  }
  document.getElementById('levelNum').textContent = formatNum(state.rank || state.level, lang);
  document.getElementById('happyNum').textContent = formatNum(snapshot(state).happiness, lang);
  paintQuestBoard();
  paintGoals();
  paintTutorial();
  paintUnlock();
  document.getElementById('qSpring').textContent = state.quests.spring ? t(lang, 'qDone') : t(lang, 'qTodo');
  document.getElementById('qSchool').textContent = state.quests.school ? t(lang, 'qDone') : t(lang, 'qTodo');
  document.getElementById('qNewroz').textContent = state.quests.newroz ? t(lang, 'qDone') : t(lang, 'qTodo');
  document.querySelectorAll('#buildList .build-btn').forEach((btn) => {
    const type = btn.dataset.build;
    const cost = state.easy
      ? Object.fromEntries(Object.entries(COSTS[type]).map(([k, v]) => [k, Math.max(1, Math.ceil(v / 2))]))
      : COSTS[type];
    btn.querySelector('small').textContent = Object.entries(cost).map(([k, v]) => `${formatNum(v, lang)} ${t(lang, k)}`).join(' ');
    btn.classList.toggle('on', buildType === type);
    const cell = suggestCell(state, type);
    btn.disabled = !cell || !canPlace(state, type, cell.gx, cell.gz);
  });
  const selected = state.buildings.find((b) => b.id === state.selectedId);
  if (selected && !document.getElementById('detail').hidden) {
    document.getElementById('detailTitle').textContent = t(lang, selected.type === 'spring' ? 'springB' : selected.type);
    document.getElementById('detailMeta').textContent = `${t(lang, 'level')} ${formatNum(selected.level, lang)}`;
    const sacred = selected.type === 'mosque' || selected.type === 'spring';
    document.getElementById('demolishBtn').hidden = sacred;
    document.getElementById('cleanBtn').hidden = selected.type !== 'mosque' || state.mosqueClean;
    document.getElementById('detailFix').hidden = selected.type !== 'spring' || state.springFixed;
    document.getElementById('fixBtn').hidden = state.springFixed;
    document.getElementById('plantBtn').hidden = !(selected.type === 'field' && selected.stage === 0);
    document.getElementById('harvestBtn').hidden = !(selected.type === 'field' && selected.stage === 3);
    document.getElementById('detailNote').textContent = sacred ? t(lang, 'cantRemove') : '';
    if (selected.type === 'field') {
      document.getElementById('detailMeta').textContent += ` · ${formatNum(selected.growth, lang)}%`;
    }
  }
  if (!document.getElementById('people').hidden) {
    const sig = `${lang}:${state.rev}:${state.villagers.map((v) => `${v.id}:${v.job}`).join(',')}`;
    if (sig !== peopleSig) {
      peopleSig = sig;
      const root = document.getElementById('peopleList');
      root.replaceChildren();
      state.villagers.forEach((v) => {
        const row = document.createElement('div');
        row.className = 'vrow';
        const name = document.createElement('span');
        name.textContent = `${villagerTitle(v)} · ${formatNum(v.happiness, lang)}`;
        const selEl = document.createElement('select');
        selEl.setAttribute('aria-label', t(lang, 'job'));
        JOBS.forEach((job) => {
          const opt = document.createElement('option');
          opt.value = job;
          opt.textContent = t(lang, job);
          if (v.job === job) opt.selected = true;
          selEl.appendChild(opt);
        });
        selEl.addEventListener('change', () => {
          const result = assignJob(state, v.id, selEl.value);
          if (!result.ok) {
            toast(t(lang, 'needWork'));
            selEl.value = v.job;
            return;
          }
          persist();
          peopleSig = '';
          paint();
        });
        row.append(name, selEl);
        root.appendChild(row);
      });
    }
  }
  const cell = buildType ? suggestCell(state, buildType) : null;
  view.setGhost(playing && state.mode === 'build' ? cell : null);
  const selB = state.buildings.find((b) => b.id === state.selectedId);
  view.setSelect(selB ? { gx: selB.gx, gz: selB.gz } : null);
}

function bindStick(el, xKey, yKey) {
  let pid = null;
  const origin = { x: 0, y: 0 };
  const knob = el.querySelector('.knob');
  const apply = (e) => {
    const radius = el.clientWidth * 0.42;
    const v = stickVector(e.clientX - origin.x, e.clientY - origin.y, radius);
    sticks[xKey] = v.x;
    sticks[yKey] = v.y;
    knob.style.transform = `translate(${v.x * radius * 0.55}px, ${-v.y * radius * 0.55}px)`;
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pid = e.pointerId;
    const rect = el.getBoundingClientRect();
    origin.x = rect.left + rect.width / 2;
    origin.y = rect.top + rect.height / 2;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    apply(e);
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === pid) apply(e); });
  const end = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    sticks[xKey] = 0;
    sticks[yKey] = 0;
    knob.style.transform = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

let lastTap = { t: 0, el: null };
document.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest && e.target.closest('button, a, select');
  if (!btn) return;
  e.stopPropagation();
}, true);
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('#hudMenu');
  if (!btn) return;
  const now = performance.now();
  if (now - lastTap.t < 350) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
  lastTap = { t: now, el: btn };
}, true);

bindStick(document.getElementById('moveZone'), 'moveX', 'moveY');
bindStick(document.getElementById('lookZone'), 'lookX', 'lookY');
bindStick(document.getElementById('panZone'), 'panX', 'panY');
bindStick(document.getElementById('orbitZone'), 'orbitX', 'orbitY');

document.getElementById('playBtn').addEventListener('click', () => {
  playing = true;
  document.getElementById('menu').hidden = true;
  closePanels();
  faceMosque();
});
document.getElementById('freshBtn').addEventListener('click', () => {
  state = createState();
  buildType = null;
  playing = false;
  persist();
  peopleSig = '';
  questSig = '';
  paint();
  toast(t(lang, 'fresh'));
});
document.getElementById('helpBtn').addEventListener('click', () => openPanel('help'));
document.getElementById('helpClose').addEventListener('click', closePanels);
document.getElementById('creditsBtn').addEventListener('click', () => openPanel('credits'));
document.getElementById('creditsClose').addEventListener('click', closePanels);
function closeHud() {
  const pop = document.getElementById('hudPop');
  if (pop) pop.hidden = true;
  const btn = document.getElementById('hudMenu');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
document.getElementById('hudMenu').addEventListener('click', () => {
  const pop = document.getElementById('hudPop');
  pop.hidden = !pop.hidden;
  document.getElementById('hudMenu').setAttribute('aria-expanded', pop.hidden ? 'false' : 'true');
});
document.getElementById('tutorialNext').addEventListener('click', () => {
  advanceTutorial(state);
  persist();
  paintTutorial();
});
document.getElementById('unlockOk').addEventListener('click', () => {
  dismissNotice(state);
  persist();
  paintUnlock();
});
document.getElementById('easyBtn').addEventListener('click', () => {
  easy = !easy;
  setEasy(state, easy);
  saveSettings();
  paint();
});
document.getElementById('hudQuests').addEventListener('click', () => { closeHud(); openPanel('quests'); });
document.getElementById('questsClose').addEventListener('click', closePanels);
document.getElementById('hudPeople').addEventListener('click', () => { closeHud(); openPanel('people'); });
document.getElementById('peopleClose').addEventListener('click', closePanels);
document.getElementById('hudBuild').addEventListener('click', () => { closeHud(); openPanel('build'); });
document.getElementById('hudCraft').addEventListener('click', () => { closeHud(); openPanel('craft'); });
document.getElementById('craftClose').addEventListener('click', closePanels);
document.getElementById('craftGo').addEventListener('click', () => {
  const id = document.getElementById('craftGo').dataset.recipe || 'axe';
  const result = craft(state, id);
  if (!result.ok) toast(t(lang, result.reason === 'place' ? 'closer' : result.reason === 'locked' ? 'stageNeed' : 'needCost'));
  paint();
});
document.getElementById('adhanBtn').addEventListener('click', () => {
  adhanOn = !adhanOn;
  saveSettings();
  paint();
});
document.getElementById('raidBtn').addEventListener('click', () => {
  raidsOn = !raidsOn;
  setRaids(state, raidsOn);
  saveSettings();
  paint();
});
document.getElementById('dayBtn').addEventListener('click', () => {
  alwaysDay = !alwaysDay;
  view.setDaylight(alwaysDay);
  saveSettings();
  paint();
});
document.getElementById('quarrelBtn').addEventListener('click', () => {
  quarrelsOn = !quarrelsOn;
  state.quarrelsOn = quarrelsOn;
  if (!quarrelsOn) state.quarrel = null;
  saveSettings();
  paint();
});
function closeQuarrel(how) {
  const result = settleQuarrel(state, how);
  document.getElementById('quarrel').hidden = true;
  if (result.ok) toast(t(lang, how === 'mullah' ? 'judge' : 'peace'));
  persist();
  paint();
}
function syncNotices() {
  const note = document.getElementById('adhanNote');
  const elder = document.getElementById('elder');
  if (!note || !elder) return;
  if (state.adhan) {
    state.adhan = 0;
    state.adhanQueued = 1;
    playAdhan();
  }
  if (prayerClock(state)?.phase === 'salah') state.adhanQueued = 0;
  const adhanOn = !!state.adhanQueued;
  note.hidden = !adhanOn;
  if (adhanOn) {
    if (!elder.hidden) elder.hidden = true;
    return;
  }
  if (state.confront === 1) {
    elder.hidden = false;
    state.confront = 2;
  }
}

function closeElder() {
  dismissConfront(state);
  const elder = document.getElementById('elder');
  if (elder) elder.hidden = true;
}
document.getElementById('quarrelClose').addEventListener('click', () => { document.getElementById('quarrel').hidden = true; });
document.getElementById('quarrelX').addEventListener('click', () => { document.getElementById('quarrel').hidden = true; });
document.getElementById('talkX').addEventListener('click', () => { document.getElementById('talk').hidden = true; });
document.getElementById('tradeX').addEventListener('click', () => { document.getElementById('trade').hidden = true; });
document.getElementById('adhanClose').addEventListener('click', () => {
  state.adhanQueued = 0;
  const note = document.getElementById('adhanNote');
  if (note) note.hidden = true;
  syncNotices();
});
document.getElementById('elderX').addEventListener('click', closeElder);
document.getElementById('elderLater').addEventListener('click', closeElder);
document.getElementById('peaceBtn').addEventListener('click', () => closeQuarrel('peace'));
document.getElementById('judgeBtn').addEventListener('click', () => closeQuarrel('mullah'));
document.getElementById('sideA').addEventListener('click', () => closeQuarrel('sideA'));
document.getElementById('sideB').addEventListener('click', () => closeQuarrel('sideB'));
document.getElementById('talkClose').addEventListener('click', () => { document.getElementById('talk').hidden = true; });
document.getElementById('tradeClose').addEventListener('click', () => { document.getElementById('trade').hidden = true; });
document.getElementById('talkTrade').addEventListener('click', () => {
  const id = Number(document.getElementById('talk').dataset.who);
  document.getElementById('talk').hidden = true;
  openTrade(id);
});
document.getElementById('talkHelp').addEventListener('click', () => {
  const id = Number(document.getElementById('talk').dataset.who);
  const deed = (state.deeds || []).find((d) => d.giverId === id && d.status === 'open');
  const result = deed ? helpDeed(state, deed.id) : { ok: false };
  if (!result.ok) toast(t(lang, 'needCost'));
  document.getElementById('talk').hidden = true;
  paint();
});
document.getElementById('talkNo').addEventListener('click', () => {
  const id = Number(document.getElementById('talk').dataset.who);
  const deed = (state.deeds || []).find((d) => d.giverId === id && d.status === 'open');
  if (deed) refuseDeed(state, deed.id);
  document.getElementById('talk').hidden = true;
  paint();
});
document.getElementById('talkHit').addEventListener('click', () => {
  const id = Number(document.getElementById('talk').dataset.who);
  const result = shove(state, id);
  document.getElementById('talk').hidden = true;
  if (result.reason === 'child') toast(npcLine(lang, 'childRun'));
  syncNotices();
  paint();
});
function settleFine(how) {
  const result = acceptFine(state, how);
  document.getElementById('elder').hidden = true;
  if (result.deed) toast(t(lang, 'amendsDeed'));
  paint();
}
document.getElementById('fineBtn').addEventListener('click', () => settleFine('pay'));
document.getElementById('elderDeed').addEventListener('click', () => settleFine('deed'));
document.getElementById('stageOk').addEventListener('click', () => {
  dismissStage(state);
  paintStage();
});
document.getElementById('buildClose').addEventListener('click', closePanels);
document.getElementById('detailClose').addEventListener('click', closePanels);
document.getElementById('hudPause').addEventListener('click', () => { closeHud(); openPanel('pause'); });
document.getElementById('resumeBtn').addEventListener('click', closePanels);
document.getElementById('pauseHelp').addEventListener('click', () => openPanel('help'));
document.getElementById('pauseMenu').addEventListener('click', () => {
  playing = false;
  closePanels();
  document.getElementById('menu').hidden = false;
  showControls();
  persist();
});
document.getElementById('modeBtn').addEventListener('click', () => { closeHud(); setMode(state.mode === 'walk' ? 'build' : 'walk'); });
document.getElementById('langEn').addEventListener('click', () => { lang = 'en'; applyLang(); });
document.getElementById('langCkb').addEventListener('click', () => { lang = 'ckb'; applyLang(); });
document.getElementById('qualityBtn').addEventListener('click', () => {
  quality = quality === 'low' ? 'mid' : quality === 'mid' ? 'high' : 'low';
  view.setQuality(quality);
  saveSettings();
  paint();
});
document.getElementById('ps1Btn').addEventListener('click', () => {
  ps1 = !ps1;
  view.setSnap(ps1);
  const btn = document.getElementById('ps1Btn');
  btn.textContent = ps1 ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  btn.classList.toggle('on', ps1);
});
function mountDonkey(id) {
  const result = enterAnimal(state, id);
  if (!result.ok) return result;
  riding = true;
  document.getElementById('rideBtn').classList.toggle('on', true);
  const a = state.animals.find((item) => item.id === state.riddenId);
  if (a) walkCam.yaw = a.yaw || 0;
  return result;
}

function dismount() {
  if (state.drivenId) exitVehicle(state);
  if (state.riddenId) exitAnimal(state);
  riding = false;
  document.getElementById('rideBtn').classList.toggle('on', false);
}

document.getElementById('rideBtn').addEventListener('click', () => {
  if (state.drivenId) return;
  if (state.riddenId) {
    dismount();
    paint();
    return;
  }
  const near = nearestAnimal(state, 'donkey', player().gx, player().gz, 1.7);
  if (!near) { toast(t(lang, 'closer')); return; }
  mountDonkey(near.id);
  paint();
});
document.getElementById('boardBtn').addEventListener('click', () => {
  if (state.drivenId || state.riddenId) {
    dismount();
    paint();
    return;
  }
  const who = player();
  const vehicle = nearestVehicle(state, who.gx, who.gz, 1.7);
  const donkey = nearestAnimal(state, 'donkey', who.gx, who.gz, 1.7);
  if (vehicle && (!donkey || Math.hypot(vehicle.gx - who.gx, vehicle.gz - who.gz) <= Math.hypot(donkey.gx - who.gx, donkey.gz - who.gz))) {
    const result = enterVehicle(state, vehicle.id);
    if (!result.ok) return;
    riding = false;
    document.getElementById('rideBtn').classList.toggle('on', false);
    walkCam.yaw = vehicle.yaw;
    paint();
    return;
  }
  if (!donkey) return;
  mountDonkey(donkey.id);
  paint();
});
view.setSnap(true);
document.getElementById('stickPref').addEventListener('click', () => {
  stickPref = !stickPref;
  saveSettings();
  showControls();
  paint();
});
document.getElementById('zoomIn').addEventListener('click', () => { buildCam.dist = clamp(buildCam.dist - 1.2, 6, 10); });
document.getElementById('zoomOut').addEventListener('click', () => { buildCam.dist = clamp(buildCam.dist + 1.2, 6, 10); });
document.getElementById('rotLeft').addEventListener('click', () => { buildCam.yaw += 0.4; });
document.getElementById('rotRight').addEventListener('click', () => { buildCam.yaw -= 0.4; });
document.getElementById('placeSuggest').addEventListener('click', () => {
  if (!buildType) return;
  const cell = suggestCell(state, buildType);
  if (!cell) { toast(t(lang, 'noPlot')); return; }
  const result = place(state, buildType, cell.gx, cell.gz);
  if (!result.ok) { toast(t(lang, 'needCost')); return; }
  buildType = null;
  persist();
  openPanel('detail');
});
document.getElementById('cancelBuild').addEventListener('click', () => { buildType = null; paint(); });
document.getElementById('upgradeBtn').addEventListener('click', () => {
  const result = upgrade(state, state.selectedId);
  if (!result.ok) toast(t(lang, result.reason === 'cost' ? 'needCost' : 'cantRemove'));
  else persist();
  paint();
});
document.getElementById('demolishBtn').addEventListener('click', () => {
  const result = demolish(state, state.selectedId);
  if (!result.ok) toast(t(lang, 'cantRemove'));
  else { persist(); closePanels(); }
  paint();
});
document.getElementById('cleanBtn').addEventListener('click', () => {
  const result = cleanMosque(state);
  if (!result.ok) toast(t(lang, 'needCost'));
  else { persist(); toast(t(lang, 'cleaned')); }
  paint();
});
function onFix() {
  const result = fixSpring(state);
  if (!result.ok) toast(t(lang, 'needCost'));
  else { persist(); toast(t(lang, 'fixed')); }
  paint();
}
document.getElementById('fixBtn').addEventListener('click', onFix);
document.getElementById('detailFix').addEventListener('click', onFix);
document.getElementById('plantBtn').addEventListener('click', () => {
  const result = plant(state, state.selectedId);
  if (!result.ok) toast(t(lang, result.reason === 'winter' ? 'winterNo' : 'needCost'));
  else { persist(); toast(t(lang, 'planted')); }
  paint();
});
document.getElementById('harvestBtn').addEventListener('click', () => {
  const result = harvest(state, state.selectedId);
  if (!result.ok) toast(t(lang, 'needCost'));
  else { persist(); toast(t(lang, 'harvested')); }
  paint();
});
document.getElementById('newrozBtn').addEventListener('click', () => {
  const result = celebrateNewroz(state);
  if (!result.ok) toast(t(lang, 'needCost'));
  else { persist(); toast(t(lang, 'welcomed')); }
  paint();
});
document.getElementById('viewMosque').addEventListener('click', () => {
  const mosque = state.buildings.find((b) => b.type === 'mosque');
  if (!mosque) return;
  select(state, mosque.id);
  openPanel('detail');
});
document.getElementById('actionBtn').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  doAction();
});

const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
let iosDismissed = false;
try { iosDismissed = localStorage.getItem('sharsten-ios-a2hs') === '1'; } catch { /* ignore */ }
if (ios && !standalone && !iosDismissed) document.getElementById('iosHint').hidden = false;
document.getElementById('iosDismiss').addEventListener('click', () => {
  document.getElementById('iosHint').hidden = true;
  try { localStorage.setItem('sharsten-ios-a2hs', '1'); } catch { /* ignore */ }
});

window.addEventListener('keydown', (e) => {
  if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE' || e.code === 'Enter') doAction();
  if (e.code === 'Escape') {
    if (panelOpen()) closePanels();
    else if (playing) openPanel('pause');
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

let ptr = null;
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x;
  const dy = e.clientY - ptr.y;
  if (Math.hypot(dx, dy) > 6) ptr.moved = true;
  if (playing && state.mode === 'build' && buildType) {
    const cell = view.pick(e.clientX, e.clientY);
    view.setGhost(cell, !!(cell && canPlace(state, buildType, cell.gx, cell.gz)));
  }
  if (!ptr.moved) return;
  if (playing && state.mode === 'walk') {
    walkCam.yaw -= dx * 0.007;
    walkCam.pitch = clamp(walkCam.pitch + dy * 0.005, 0.18, 1.15);
  } else {
    buildCam.yaw -= dx * 0.006;
    buildCam.pitch = clamp(buildCam.pitch + dy * 0.004, 0.45, 1.25);
  }
  ptr.x = e.clientX;
  ptr.y = e.clientY;
});
function endPtr(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (!ptr.moved && playing && state.mode === 'build' && !panelOpen()) {
    const cell = view.pick(e.clientX, e.clientY);
    if (cell) {
      if (buildType) {
        const result = place(state, buildType, cell.gx, cell.gz);
        if (!result.ok) toast(t(lang, 'needCost'));
        else {
          buildType = null;
          persist();
          openPanel('detail');
        }
      } else {
        const hit = state.buildings.find((b) => b.gx === cell.gx && b.gz === cell.gz);
        if (hit) {
          select(state, hit.id);
          openPanel('detail');
        }
      }
    }
  }
  ptr = null;
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', (e) => { if (ptr && e.pointerId === ptr.id) ptr = null; });

function syncOrient() {
  const vv = window.visualViewport;
  const w = vv ? vv.width : window.innerWidth;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.dataset.orient = w >= h ? 'landscape' : 'portrait';
  view.resize();
}
syncOrient();
window.addEventListener('resize', syncOrient);
window.addEventListener('orientationchange', syncOrient);
if (window.visualViewport) window.visualViewport.addEventListener('resize', syncOrient);

if (!testMode && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

loadAdhan();
applyLang();
showControls();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  toastLeft -= dt;
  edgeLeft -= dt;
  if (toastLeft <= 0) document.getElementById('toast').hidden = true;
  if (playing && !panelOpen()) {
    if (state.mode === 'walk') applyWalk(dt);
    else panBuild(dt);
    const focusHere = state.mode === 'walk' ? player() : worldToCell(buildCam.x, buildCam.z);
    tick(state, dt, {
      skipPlayer: state.mode === 'walk',
      focus: { gx: focusHere.gx, gz: focusHere.gz, r: renderRadiusUnits(quality) / 2 },
    });
    saveLeft += dt;
    if (saveLeft > 5) { saveLeft = 0; persist(); }
  } else if (!playing) {
    buildCam.yaw += dt * 0.08;
  }
  const walking = playing && state.mode === 'walk';
  if (walking) view.lookAtWalk(player().gx, player().gz, walkCam.yaw, walkCam.pitch);
  else view.lookAtBuild(buildCam);
  const here = walking ? cellToWorld(player().gx, player().gz) : { x: buildCam.x, z: buildCam.z };
  const radius = renderRadiusUnits(quality);
  const camDist = walking ? 5.2 : buildCam.dist;
  const haze = metersToUnits(40);
  view.setFog(camDist + haze, camDist + haze + metersToUnits(55));
  view.setPreview(!playing);
  view.sync(state, now / 1000, { x: here.x, z: here.z, radius });
  const boot = document.getElementById('boot');
  if (boot) boot.hidden = true;
  if (state.prayerThanks) {
    state.prayerThanks = 0;
    toast(t(lang, 'prayerJoin'));
  }
  if (state.raidWarn) {
    state.raidWarn = 0;
    toast(t(lang, 'raidWarn'));
  }
  syncNotices();
  placeTags();
  if (adhanCtx && adhanCtx.listener && adhanCtx.listener.positionX && view.camera) {
    adhanCtx.listener.positionX.value = view.camera.position.x;
    adhanCtx.listener.positionY.value = view.camera.position.y;
    adhanCtx.listener.positionZ.value = view.camera.position.z;
  }
  view.render();
  updateSpeech();
  updateBoard();
  paintTutorial();
  paintUnlock();
  if (playing) {
    document.getElementById('clockTime').textContent = formatClock(state.hour, state.acc || 0, lang, secondsThisHour(state.hour));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__SV = {
  ready: true,
  SAVE_KEY,
  getState: () => snapshot(state),
  layout: () => LAYOUT,
  mapBound: () => MAP_BOUND,
  isRoad,
  reachExits: () => LAYOUT.exits.map((exit) => reachExit(exit)),
  playable,
  propKinds: () => view.propKinds(),
  cullReport: () => view.cullReport(),
  renderRadius: () => renderRadiusUnits(quality),
  setRiding(on) { riding = !!on; },
  isRiding: () => riding,
  tickNear(dt) {
    const who = player();
    tick(state, dt, {
      skipPlayer: true,
      focus: { gx: who.gx, gz: who.gz, r: renderRadiusUnits(quality) / 2 },
    });
    const here = cellToWorld(who.gx, who.gz);
    const radius = renderRadiusUnits(quality);
    const haze = metersToUnits(40);
    view.setFog(5.2 + haze, 5.2 + haze + metersToUnits(55));
    view.sync(state, 0, { x: here.x, z: here.z, radius });
  },
  suggest(type) { return suggestCell(state, type); },
  place(type, gx, gz) {
    const result = place(state, type, gx, gz);
    if (result.ok) persist();
    paint();
    return result;
  },
  upgrade(id) {
    const result = upgrade(state, id ?? state.selectedId);
    if (result.ok) persist();
    paint();
    return result;
  },
  demolish(id) {
    const result = demolish(state, id);
    if (result.ok) persist();
    paint();
    return result;
  },
  assignJob(id, job) {
    const result = assignJob(state, id, job);
    if (result.ok) persist();
    peopleSig = '';
    paint();
    return result;
  },
  plant(id) {
    const result = plant(state, id);
    if (result.ok) persist();
    paint();
    return result;
  },
  harvest(id) {
    const result = harvest(state, id);
    if (result.ok) persist();
    paint();
    return result;
  },
  plough(id) {
    const result = plough(state, id);
    paint();
    return result;
  },
  sow(id, crop) {
    const result = sow(state, id, crop);
    paint();
    return result;
  },
  waterField(id) {
    const result = waterField(state, id);
    paint();
    return result;
  },
  millGrain() {
    const result = millGrain(state);
    paint();
    return result;
  },
  bakeBread() {
    const result = bakeBread(state);
    paint();
    return result;
  },
  advanceHours(n) { advanceHours(state, n); persist(); paint(); },
  setStock(key, value) { return setStock(state, key, value); },
  setHour(h) { setHour(state, h); paint(); },
  forceConfront() {
    state.rep = -40;
    state.offences = 3;
    state.confront = 1;
    state.resources.money = 0;
  },
  openNotices() {
    syncNotices();
    const note = document.getElementById('adhanNote');
    const elder = document.getElementById('elder');
    return {
      adhan: !!(note && !note.hidden),
      elder: !!(elder && !elder.hidden),
      confront: state.confront || 0,
      money: state.resources.money || 0,
    };
  },
  setSeason(name) {
    const result = setSeason(state, name);
    view.sync(state, 0);
    paint();
    return result;
  },
  setMode,
  reset() {
    state = createState();
    buildType = null;
    peopleSig = '';
    questSig = '';
    persist();
    paint();
    view.sync(state, 0);
  },
  selectLandmark(type) {
    const b = state.buildings.find((x) => x.type === type);
    if (!b) return null;
    select(state, b.id);
    openPanel('detail');
    return b.id;
  },
  setWalkPose(pose) {
    setMode('walk');
    const p = player();
    p.gx = pose.x;
    p.gz = pose.z;
    p.tx = pose.x;
    p.tz = pose.z;
    if (pose.yaw != null) walkCam.yaw = pose.yaw;
    if (pose.pitch != null) walkCam.pitch = pose.pitch;
  },
  setSticks(next) { Object.assign(sticks, next); },
  getSticks: () => ({ ...sticks }),
  stepWalk(dt) { applyWalk(dt); },
  stickAxes: (dx, dy, radius) => stickVector(dx, dy, radius),
  cameraEyeY: () => cameraEyeY(walkCam.pitch),
  getWalkDebug() {
    const p = player();
    const basis = viewAxes(walkCam.yaw);
    return {
      x: p.gx,
      z: p.gz,
      yaw: walkCam.yaw,
      pitch: walkCam.pitch,
      forward: basis.forward,
      right: basis.right,
      eyeY: cameraEyeY(walkCam.pitch),
      mode: state.mode,
    };
  },
  getHillColor: () => view.getHillColor(),
  lookReport: () => view.lookReport(),
  i18nAudit,
  stepKeys(dt, codes) {
    (codes || []).forEach((code) => keys.add(code));
    applyWalk(dt);
    (codes || []).forEach((code) => keys.delete(code));
  },
  lookDrag(dx) {
    walkCam.yaw -= dx * 0.007;
    const p = player();
    p.ry = walkCam.yaw;
  },
  gather() {
    const result = gather(state);
    paint();
    return result;
  },
  craft(id) {
    const result = craft(state, id);
    paint();
    return result;
  },
  setRank(n) {
    const result = setRank(state, n);
    persist();
    paint();
    return result;
  },
  unlocks,
  isUnlocked: (type) => isUnlocked(state, type),
  jobUnlocked: (job) => jobUnlocked(state, job),
  advanceTutorial() {
    const result = advanceTutorial(state);
    persist();
    paintTutorial();
    return result;
  },
  astarRoute,
  npcSchedule,
  npcActiveCap: () => npcActiveCap(lowQ()),
  vehicleCap: () => vehicleCap(lowQ()),
  animalCap: () => animalCap(lowQ()),
  herdSpot: (kind, phase) => herdSpot(state, kind, phase),
  carryBudget: () => carryBudget(state),
  moveGoods: (key, amount) => moveGoods(state, key, amount),
  donkeySpeed: () => DONKEY_SPEED,
  stepAnimals(dt) {
    const who = player();
    stepAnimalAi(state, dt ?? 0.2, { low: false, focus: { gx: who.gx, gz: who.gz, r: 99 } });
  },
  enterAnimal(id) {
    const result = mountDonkey(id);
    return result;
  },
  exitAnimal() {
    const result = exitAnimal(state);
    riding = false;
    document.getElementById('rideBtn').classList.toggle('on', false);
    return result;
  },
  rideAnimal(id, steer, throttle, dt) { return rideAnimal(state, id, steer, throttle, dt); },
  placeAnimal(id, gx, gz, yaw) {
    const a = state.animals.find((item) => item.id === id);
    if (!a) return false;
    a.gx = gx;
    a.gz = gz;
    a.tx = gx;
    a.tz = gz;
    if (yaw != null) a.yaw = yaw;
    if (a.ridden) {
      const p = player();
      p.gx = gx;
      p.gz = gz;
      p.tx = gx;
      p.tz = gz;
    }
    return true;
  },
  linePairs,
  stepVehicles(dt) {
    const who = player();
    stepVehicleAi(state, dt ?? 0.2, {
      low: false,
      focus: { gx: who.gx, gz: who.gz, r: 99 },
    });
  },
  shiftVillagers(gx, gz) {
    state.villagers.forEach((v) => {
      v.gx = gx;
      v.gz = gz;
      v.tx = gx;
      v.tz = gz;
    });
  },
  placeVehicle(id, gx, gz, yaw) {
    const v = state.vehicles.find((item) => item.id === id);
    if (!v) return false;
    v.gx = gx;
    v.gz = gz;
    if (yaw != null) v.yaw = yaw;
    v.path = null;
    v.pathI = 0;
    const p = player();
    if (v.occupied && p) {
      p.gx = gx;
      p.gz = gz;
      p.tx = gx;
      p.tz = gz;
    }
    return true;
  },
  enterVehicle(id) {
    const result = enterVehicle(state, id);
    if (result.ok) {
      riding = false;
      const v = state.vehicles.find((item) => item.id === state.drivenId);
      if (v) walkCam.yaw = v.yaw;
    }
    return result;
  },
  exitVehicle() { return exitVehicle(state); },
  driveVehicle(id, steer, throttle, dt) { return driveVehicle(state, id, steer, throttle, dt); },
  stepNpcs(dt) {
    const who = player();
    stepNpcAi(state, dt ?? 0.2, {
      low: lowQ(),
      focus: { gx: who.gx, gz: who.gz, r: 99 },
    });
    paint();
  },
  acceptQuest(id) {
    const result = acceptQuest(state, id);
    questSig = '';
    paint();
    return result;
  },
  turnInQuest(id) {
    const result = turnInQuest(state, id);
    questSig = '';
    if (result.ok) persist();
    paint();
    return result;
  },
  projectCell(gx, gz) {
    if (state.mode === 'walk') view.lookAtWalk(player().gx, player().gz, walkCam.yaw, walkCam.pitch);
    else view.lookAtBuild(buildCam);
    return view.project(gx, gz);
  },
};
document.body.dataset.ready = '1';
document.body.dataset.mode = state.mode;
