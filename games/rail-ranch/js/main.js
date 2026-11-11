import { createAudio } from './audio.js';
import {
  LAYOUT,
  applyOffline,
  autoplay as runAutoplay,
  buildingInfo,
  buy,
  createState,
  goalView,
  hitTest,
  hydrate,
  catalog as craftCatalog,
  preview,
  place,
  claimDaily,
  dailyInfo,
  offers,
  serialize,
  step,
  summary,
  view,
} from './sim.js';

const SAVE_KEY = 'rail-ranch-v1';
const MUTE_KEY = 'rail-ranch-mute';

const canvas = document.getElementById('view');
const fx = document.getElementById('fx');
const cashEl = document.getElementById('cash');
const bestEl = document.getElementById('best');
const goalLabel = document.getElementById('goalLabel');
const goalFill = document.getElementById('goalFill');
const muteBtn = document.getElementById('mute');
const toastEl = document.getElementById('toast');
const sheet = document.getElementById('sheet');
const sheetTitle = document.getElementById('sheetTitle');
const sheetLine = document.getElementById('sheetLine');
const sheetDetail = document.getElementById('sheetDetail');
const sheetActions = document.getElementById('sheetActions');
const confirmBox = document.getElementById('confirm');
const offlineBox = document.getElementById('offline');
const offlineAmount = document.getElementById('offlineAmount');
const offlineNote = document.getElementById('offlineNote');

const audio = createAudio();
let world = null;
let buildId = null;
let buildRot = 0;
let ghost = null;
const floats = [];
const coins = [];
const confetti = [];
const pops = [];
const ptrs = new Map();

let state;
let cam = { x: LAYOUT.focus.x, y: LAYOUT.focus.y, z: 0.7 };
let savedCam = null;
let camReady = false;
let ease = null;
let pinch = null;
let skipSave = false;
let heard = false;
let bestMem = 0;
let toastTimer = 0;
let shake = { id: '', life: 0 };
let selected = '';
let puffAcc = 0;
let whistleAcc = 2.4;
let lastTruckSound = 0;
let viewW = 1;
let viewH = 1;
let dprNow = 1;
let last = performance.now();
let saveStamp = 0;

function money(n) {
  return Math.max(0, Math.round(n)).toLocaleString('en-US');
}

function fmtDur(sec) {
  if (sec >= 5400) return '2 hours';
  if (sec >= 90) return Math.round(sec / 60) + ' min';
  return Math.round(sec) + 's';
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || (data.v !== 1 && data.v !== 2)) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function forceWrite() {
  const data = serialize(state);
  data.wall = state.wall || Date.now();
  data.cam = { x: cam.x, y: cam.y, z: cam.z };
  data.mute = !audio.enabled;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) { /* private mode */ }
}

function saveNow() {
  if (skipSave) return;
  if (typeof document === 'undefined' || !document.hidden) state.wall = Date.now();
  forceWrite();
  maybeScore();
}

function maybeScore() {
  const n = Math.floor(state.lifetime);
  if (n <= bestMem) return;
  bestMem = n;
  if (window.HappyScores) HappyScores.record('rail-ranch', n);
}

function boot() {
  const data = readSave();
  let earned = 0;
  let away = 0;
  if (data) {
    state = hydrate(data);
    away = (Date.now() - (Number(data.wall) || Date.now())) / 1000;
    earned = applyOffline(state, away);
    if (data.cam && Number.isFinite(data.cam.x)) savedCam = data.cam;
    if (typeof data.mute === 'boolean') audio.setEnabled(!data.mute);
  } else {
    state = createState();
    try {
      if (localStorage.getItem(MUTE_KEY) === '1') audio.setEnabled(false);
    } catch (err) { /* ignore */ }
  }
  state.wall = Date.now();
  if (window.HappyScores) bestMem = HappyScores.getBest('rail-ranch') || 0;
  maybeScore();
  syncMute();
  syncHud(true);
  if (earned > 0) showOffline(earned, away);
}

function syncMute() {
  const muted = !audio.enabled;
  muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  muteBtn.classList.toggle('is-off', muted);
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (err) { /* ignore */ }
}

function toggleMute() {
  audio.unlock();
  heard = true;
  audio.setEnabled(!audio.enabled);
  syncMute();
  saveNow();
}

function syncHud(quiet) {
  const next = money(state.cash);
  if (cashEl.textContent !== next) {
    cashEl.textContent = next;
    if (!quiet) {
      cashEl.classList.remove('pop');
      void cashEl.offsetWidth;
      cashEl.classList.add('pop');
    }
  }
  const goal = goalView(state);
  const snap = summary(state);
  goalLabel.textContent = 'Lv ' + snap.level + ' · ' + goal.text;
  goalFill.style.width = Math.round(goal.ratio * 100) + '%';
  const best = Math.max(bestMem, window.HappyScores ? HappyScores.getBest('rail-ranch') : 0);
  let label = best > 0 ? 'Best $' + money(best) : 'Best —';
  if (state.prestige > 0) label += ' · Region ' + (state.prestige + 1);
  bestEl.textContent = label;
}

function toast(text) {
  toastEl.hidden = false;
  toastEl.textContent = text;
  toastTimer = 1.8;
}

function spawnFloat(x, y, text) {
  floats.push({ x: x + (floats.length % 3 - 1) * 10, y, text, age: 0, life: 1 });
  if (floats.length > 14) floats.shift();
}

function cashPoint() {
  const box = cashEl.getBoundingClientRect();
  return { x: box.left + box.width * 0.35, y: box.top + box.height / 2 };
}

function spawnCoins(wx, wy) {
  const from = worldToClient(wx, wy);
  const to = cashPoint();
  const count = 6;
  for (let i = 0; i < count; i++) {
    coins.push({
      x: from.x + (i - 2.5) * 7,
      y: from.y + (i % 2) * 6,
      tx: to.x,
      ty: to.y,
      age: i * 0.025,
      life: 0.62,
    });
  }
  if (coins.length > 24) coins.splice(0, coins.length - 24);
}

function spawnConfetti() {
  const colors = ['#ffe56a', '#ff8eb8', '#7ec8e8', '#ffffff', '#e23b3b', '#7dce54'];
  for (let i = 0; i < 26; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 90 + Math.random() * 150;
    confetti.push({
      x: viewW * 0.5 + (Math.random() - 0.5) * 40,
      y: 130,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      age: 0,
      life: 0.85 + Math.random() * 0.35,
      color: colors[i % colors.length],
      rot: Math.random() * 6,
    });
  }
  if (confetti.length > 40) confetti.splice(0, confetti.length - 40);
}

function spawnPop(point, id) {
  if (!point) return;
  pops.push({ x: point.x, y: point.y, id: id || '', age: 0, life: 0.42 });
  if (pops.length > 4) pops.shift();
}

function handleEvents(events) {
  if (!events || !events.length) return;
  let sold = 0;
  let picked = false;
  let goal = null;
  let trucks = 0;
  let truckX = LAYOUT.truck.x;
  let truckY = LAYOUT.truck.y;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'sale') {
      sold += e.amount;
      spawnFloat(e.x, e.y, '+$' + money(e.amount));
      spawnCoins(e.x, e.y - 10);
    } else if (e.type === 'pickup') picked = true;
    else if (e.type === 'goal') goal = e;
    else if (e.type === 'order') {
      toast('Order filled +$' + money(e.reward));
      audio.play('goal');
      spawnConfetti();
    } else if (e.type === 'truck') {
      trucks += e.amount;
      truckX = e.x;
      truckY = e.y;
    }
  }
  if (sold) audio.play('sale');
  else if (picked) audio.play('pickup');
  if (goal) {
    audio.play('goal');
    spawnConfetti();
    toast(goal.reward ? 'Goal complete +$' + goal.reward : 'Goal complete');
    if (goal.reward) spawnFloat(LAYOUT.market.x, LAYOUT.market.y - 36, '+$' + goal.reward);
  }
  if (trucks > 0) {
    spawnFloat(truckX, truckY, '+$' + money(trucks));
    const now = performance.now();
    if (now - lastTruckSound > 450) {
      audio.play('truck');
      lastTruckSound = now;
    }
  }
  if (sold || trucks || goal) maybeScore();
}

function afterBuy(res) {
  if (!res || !res.ok) {
    audio.play('deny');
    if (res && res.reason === 'cash') toast('Need $' + money(res.cost));
    else if (res && res.reason === 'locked') toast('Lay more track first');
    else toast('Not yet');
    return;
  }
  audio.play('buy');
  toast(res.title);
  if (res.focus) {
    ease = { x: res.focus.x, y: res.focus.y };
    spawnPop(res.focus, res.id && res.id.indexOf('p:') === 0 ? res.id.slice(2) : '');
  } else if (res.id === 'w') spawnPop(LAYOUT.wagon, '');
  else if (res.id === 'e') spawnPop(LAYOUT.engine, '');
  if (res.goals) {
    for (let i = 0; i < res.goals.length; i++) {
      const g = res.goals[i];
      if (g.reward) spawnFloat(LAYOUT.market.x, LAYOUT.market.y - 28, '+$' + g.reward);
      toast('Goal complete +$' + (g.reward || 0));
      audio.play('goal');
      spawnConfetti();
    }
  }
  maybeScore();
  syncHud(false);
  saveNow();
}

function closeSheet() {
  sheet.hidden = true;
  selected = '';
}

function pips(level, max) {
  const row = document.createElement('span');
  row.className = 'dots';
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('span');
    if (i < level) pip.className = 'on';
    row.appendChild(pip);
  }
  return row;
}

function press(el, fn) {
  el.addEventListener('pointerup', (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    audio.unlock();
    heard = true;
    fn();
  });
}

function openSheet(id) {
  const info = buildingInfo(state, id);
  if (!info) return;
  selected = id;
  sheet.hidden = false;
  sheetTitle.textContent = info.name;
  sheetLine.textContent = info.line;
  sheetDetail.textContent = info.detail;
  sheetActions.replaceChildren();
  for (let i = 0; i < info.actions.length; i++) {
    const action = info.actions[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    const afford = state.cash >= action.cost;
    btn.className = afford ? 'buy ok' : 'buy';
    const name = document.createElement('span');
    name.textContent = action.name;
    const cost = document.createElement('b');
    cost.textContent = '$' + money(action.cost);
    btn.append(name, pips(action.level, action.max), cost);
    press(btn, () => {
      const res = buy(state, action.id);
      if (!res.ok) shake = { id: action.id, life: 0.3 };
      afterBuy(res);
      if (!sheet.hidden) openSheet(id);
    });
    sheetActions.appendChild(btn);
  }
  if (info.canPrestige) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'buy ok';
    btn.textContent = 'Open a new region';
    press(btn, () => { confirmBox.hidden = false; });
    sheetActions.appendChild(btn);
  }
}

function showOffline(amount, away) {
  offlineBox.hidden = false;
  offlineAmount.textContent = '+$' + money(amount);
  offlineNote.textContent = away >= 2 * 60 * 60 - 1
    ? 'Your ranch kept working for 2 hours.'
    : 'Your ranch kept working for ' + fmtDur(away) + '.';
}

function toWorld(clientX, clientY) {
  if (!world) return { x: cam.x, y: cam.y };
  return world.groundAt(clientX, clientY, cam);
}

function zoomAt(clientX, clientY, factor) {
  const before = toWorld(clientX, clientY);
  cam.z = Math.max(0.45, Math.min(2.1, cam.z * factor));
  const after = toWorld(clientX, clientY);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCam();
}

function clampCam() {
  cam.x = Math.max(20, Math.min(LAYOUT.worldW - 20, cam.x));
  cam.y = Math.max(20, Math.min(LAYOUT.worldH - 20, cam.y));
  cam.z = Math.max(0.45, Math.min(2.1, cam.z));
}

function handleTap(clientX, clientY) {
  const spot = toWorld(clientX, clientY);
  const hit = hitTest(state, spot.x, spot.y);
  if (!hit) {
    closeSheet();
    return;
  }
  if (hit.type === 'sign') {
    const res = buy(state, hit.id);
    if (!res.ok) shake = { id: hit.id, life: 0.45 };
    afterBuy(res);
    return;
  }
  openSheet(hit.id);
  audio.play('ui');
}

function onDown(e) {
  if (e.button != null && e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, moved: false });
  ease = null;
  heard = true;
  audio.unlock();
  if (ptrs.size >= 2) {
    const vals = Array.from(ptrs.values());
    pinch = { dist: Math.hypot(vals[0].x - vals[1].x, vals[0].y - vals[1].y) || 1 };
  }
  if (e.cancelable) e.preventDefault();
}

function onMove(e) {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  if (e.cancelable) e.preventDefault();
  const prevX = p.x;
  const prevY = p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (Math.hypot(p.x - p.ox, p.y - p.oy) > 12) p.moved = true;
  if (ptrs.size >= 2 && pinch) {
    const vals = Array.from(ptrs.values());
    const dist = Math.hypot(vals[0].x - vals[1].x, vals[0].y - vals[1].y) || 1;
    const midX = (vals[0].x + vals[1].x) / 2;
    const midY = (vals[0].y + vals[1].y) / 2;
    zoomAt(midX, midY, dist / (pinch.dist || 1));
    pinch.dist = dist;
    return;
  }
  if (buildId && world) {
    const spot = world.groundAt(p.x, p.y, cam);
    const plan = preview(state, buildId, spot.x, spot.y);
    ghost = { x: plan.x, y: plan.y, ok: plan.ok, rot: buildRot };
  }
  if (p.moved && world) {
    const a = world.groundAt(prevX, prevY, cam);
    const b = world.groundAt(p.x, p.y, cam);
    cam.x -= b.x - a.x;
    cam.y -= b.y - a.y;
    clampCam();
  }
}

function onUp(e) {
  const p = ptrs.get(e.pointerId);
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (!p || p.moved || ptrs.size > 0 || e.type === 'pointercancel') return;
  if (buildId) {
    const spot = toWorld(e.clientX, e.clientY);
    const res = place(state, buildId, spot.x, spot.y, buildRot);
    if (!res.ok) {
      audio.play('deny');
      toast(res.reason === 'cash' ? 'Need $' + money(res.cost) : 'Can’t build there');
    } else {
      afterBuy(res);
      if (res.extended) toast('Track extended');
    }
    return;
  }
  handleTap(e.clientX, e.clientY);
}

function fitCam() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const z = w < 800
    ? Math.max(0.55, Math.min(0.92, (w - 16) / 640))
    : Math.max(0.85, Math.min(1.45, Math.min((w - 32) / 860, (h - 32) / 680)));
  return { x: LAYOUT.focus.x, y: LAYOUT.focus.y, z };
}

function resize() {
  dprNow = Math.min(3, window.devicePixelRatio || 1);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  if (!camReady) {
    const fit = fitCam();
    if (savedCam && Number.isFinite(savedCam.x) && Number.isFinite(savedCam.y) && Number.isFinite(savedCam.z)) {
      cam = { x: savedCam.x, y: savedCam.y, z: savedCam.z };
    } else {
      cam = fit;
    }
    clampCam();
    camReady = true;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.5, (now - last) / 1000);
  last = now;
  if (document.hidden) return;
  if (ease) {
    cam.x += (ease.x - cam.x) * Math.min(1, dt * 3.2);
    cam.y += (ease.y - cam.y) * Math.min(1, dt * 3.2);
    if (Math.hypot(ease.x - cam.x, ease.y - cam.y) < 1.5) ease = null;
  }
  const events = step(state, dt, true);
  handleEvents(events);
  if (shake.life > 0) shake.life -= dt;
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].age += dt;
    if (floats[i].age >= floats[i].life) floats.splice(i, 1);
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    coins[i].age += dt;
    if (coins[i].age >= coins[i].life) coins.splice(i, 1);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const bit = confetti[i];
    bit.age += dt;
    bit.vy += 320 * dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    if (bit.age >= bit.life) confetti.splice(i, 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    pops[i].age += dt;
    if (pops[i].age >= pops[i].life) pops.splice(i, 1);
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.hidden = true;
  }
  if (heard && audio.enabled) {
    puffAcc -= dt;
    if (puffAcc <= 0) {
      puffAcc = 0.46;
      audio.puff();
      audio.play('chug');
    }
    whistleAcc -= dt;
    if (whistleAcc <= 0) {
      whistleAcc = 9;
      audio.play('whistle');
    }
  }
  syncHud(false);
  saveStamp += dt;
  if (saveStamp > 2) {
    saveStamp = 0;
    saveNow();
  }
  if (world) world.draw({
    view: view(state),
    cam,
    w: viewW,
    h: viewH,
    dpr: dprNow,
    time: now / 1000,
    dt,
    floats,
    shake,
    selected,
    ghost,
    coins,
    confetti,
    pops,
  });
}

function resume() {
  const away = (Date.now() - (state.wall || Date.now())) / 1000;
  last = performance.now();
  if (away > 8) {
    const earned = applyOffline(state, away);
    if (earned > 0) showOffline(earned, away);
  }
  state.wall = Date.now();
  saveNow();
  syncHud(true);
}

function worldToClient(x, y) {
  if (!world) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 + (x - cam.x) * cam.z,
      y: rect.top + rect.height / 2 + (y - cam.y) * cam.z,
    };
  }
  return world.project(x, y, 6, cam);
}

canvas.addEventListener('pointerdown', onDown, { passive: false });
canvas.addEventListener('pointermove', onMove, { passive: false });
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0011));
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('touchmove', (e) => {
  if (e.cancelable) e.preventDefault();
}, { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
  document.addEventListener(type, (e) => {
    if (e.target === canvas && e.cancelable) e.preventDefault();
  }, { passive: false });
});

const buildbar = document.getElementById('buildbar');
const buildList = document.getElementById('buildList');
const ordersBox = document.getElementById('orders');

function todayIso() {
  const d = new Date();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function paintBuild() {
  buildList.replaceChildren();
  craftCatalog(state).forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = item.locked || item.done;
    const name = document.createElement('span');
    name.textContent = item.name + '  $' + item.cost;
    const small = document.createElement('small');
    small.textContent = item.locked ? 'Unlocks at level ' + item.level : item.blurb;
    btn.append(name, small);
    press(btn, () => {
      if (item.locked) return;
      buildId = item.id;
      toast('Tap a tile to place ' + item.name);
    });
    buildList.appendChild(btn);
  });
}

function paintOrders() {
  const info = summary(state);
  document.getElementById('orderMeta').textContent = 'Level ' + info.level + ' · Storage ' + info.warehouseUsed + '/' + info.warehouseCap;
  const box = document.getElementById('orderList');
  box.replaceChildren();
  const goodNames = { milk: 'Milk', eggs: 'Eggs', wheat: 'Wheat', flour: 'Flour', cheese: 'Cheese', bread: 'Bread' };
  info.orders.forEach((order) => {
    const row = document.createElement('div');
    row.className = 'order';
    const name = goodNames[order.good] || 'Goods';
    row.textContent = name + '  ' + order.have + '/' + order.need + '   +$' + order.reward + '   ' + order.left + 's';
    box.appendChild(row);
  });
}

press(muteBtn, toggleMute);
press(document.getElementById('buildBtn'), () => {
  buildbar.hidden = !buildbar.hidden;
  ordersBox.hidden = true;
  if (buildbar.hidden) {
    buildId = null;
    ghost = null;
  } else paintBuild();
});
press(document.getElementById('buildCancel'), () => {
  buildbar.hidden = true;
  buildId = null;
  ghost = null;
});
press(document.getElementById('buildRotate'), () => {
  buildRot = (buildRot + 1) % 4;
});
press(document.getElementById('ordersBtn'), () => {
  ordersBox.hidden = !ordersBox.hidden;
  buildbar.hidden = true;
  buildId = null;
  ghost = null;
  if (!ordersBox.hidden) paintOrders();
});
press(document.getElementById('ordersClose'), () => { ordersBox.hidden = true; });
press(document.getElementById('dailyBtn'), () => {
  const res = claimDaily(state, todayIso());
  if (!res.ok) toast('Already claimed today');
  else {
    toast('Daily +$' + res.reward);
    audio.play('goal');
    spawnConfetti();
    syncHud(false);
    saveNow();
  }
});
press(document.getElementById('sheetClose'), closeSheet);
press(document.getElementById('dim'), closeSheet);
press(document.getElementById('offlineOk'), () => { offlineBox.hidden = true; });
press(document.getElementById('confirmNo'), () => { confirmBox.hidden = true; });
press(document.getElementById('confirmYes'), () => {
  confirmBox.hidden = true;
  const res = buy(state, 'prestige');
  closeSheet();
  afterBuy(res);
  const fit = fitCam();
  cam.x = fit.x;
  cam.y = fit.y;
  ease = null;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    confirmBox.hidden = true;
    closeSheet();
  } else if (e.key === 'm' || e.key === 'M') toggleMute();
  else if (e.key === 'ArrowLeft') cam.x -= 36;
  else if (e.key === 'ArrowRight') cam.x += 36;
  else if (e.key === 'ArrowUp') cam.y -= 36;
  else if (e.key === 'ArrowDown') cam.y += 36;
  else if (e.key === '+' || e.key === '=') zoomAt(viewW / 2, viewH / 2, 1.08);
  else if (e.key === '-' || e.key === '_') zoomAt(viewW / 2, viewH / 2, 1 / 1.08);
  else return;
  clampCam();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.wall = Date.now();
    last = performance.now();
    saveNow();
  } else resume();
});
window.addEventListener('pagehide', () => {
  state.wall = Date.now();
  saveNow();
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) resume();
});
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

boot();
resize();

import('./world3d.js').then(({ createWorld }) => {
  world = createWorld(canvas, fx);
  resize();
  requestAnimationFrame(frame);
  const loading = document.getElementById('loading');
  if (loading) loading.hidden = true;
  document.body.dataset.ready = '1';
}).catch((err) => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Could not start the ranch.';
});

window.RR = {
  summary: () => summary(state),
  offers: () => offers(state),
  step(dt) {
    const events = step(state, Number(dt) || 0, true);
    handleEvents(events);
    syncHud(false);
    return summary(state);
  },
  buy(id) {
    const res = buy(state, id);
    afterBuy(res);
    return res;
  },
  autoplay(seconds) {
    const report = runAutoplay(state, seconds);
    syncHud(true);
    saveNow();
    return report;
  },
  save: () => saveNow(),
  screenPos(id) {
    const snapshot = view(state);
    let point = null;
    const sign = snapshot.signs.find((s) => s.buyId === id);
    if (sign) point = sign;
    else if (id === 'market') point = LAYOUT.market;
    else point = snapshot.buildings.find((b) => b.id === id) || null;
    if (!point) return null;
    return worldToClient(point.x, point.y);
  },
  cam: () => ({ x: cam.x, y: cam.y, z: cam.z }),
  openSheet,
  sheetOpen: () => !sheet.hidden,
  isPaused: () => document.hidden,
  armOffline(msAgo) {
    skipSave = true;
    state.wall = Date.now() - msAgo;
    forceWrite();
  },
  hold() { skipSave = true; },
  look(x, y, z) {
    if (Number.isFinite(x)) cam.x = x;
    if (Number.isFinite(y)) cam.y = y;
    if (Number.isFinite(z)) cam.z = z;
    clampCam();
    ease = null;
  },
  trainPos() {
    const poses = view(state).poses;
    const head = poses[poses.length - 1];
    return head ? { x: head.x, y: head.y } : { x: cam.x, y: cam.y };
  },
  wipe() {
    skipSave = true;
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(MUTE_KEY);
    } catch (err) { /* ignore */ }
  },
};
