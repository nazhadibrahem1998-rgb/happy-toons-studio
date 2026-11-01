/**
 * گوندی شارستێن — Sharsten Village.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 */
import {
  COSTS, MAP_BOUND, SAVE_KEY, SETTINGS_KEY, SEASONS,
  advanceHours, assignJob, cameraBasis, cameraEyeY, canPlace, celebrateNewroz,
  cellToWorld, clamp, clampToMap, cleanMosque, createState, demolish, fixSpring, worldToCell,
  harvest, parseSave, phaseOf, place, plant, select, serialize, setHour, setSeason, setStock,
  LAYOUT, isRoad, playable, reachExit, renderRadiusUnits, snapshot, stickVector, suggestCell, tick, upgrade, walkStep,
} from './sim.js';
import { formatClock, formatNum, t } from './i18n.js';
import { createView } from './world.js';

const canvas = document.getElementById('c');
const testMode = new URLSearchParams(location.search).has('test');
const coarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const RES = ['wood', 'stone', 'water', 'food', 'money', 'grain', 'flour', 'wool', 'eggs'];
const JOBS = ['idle', 'farmer', 'shepherd', 'baker', 'miller', 'weaver', 'smith', 'builder', 'teacher', 'healer', 'host'];
const PANELS = ['help', 'credits', 'quests', 'people', 'build', 'detail', 'pause'];

let lang = 'en';
let low = !!coarse;
let stickPref = !!coarse;
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  if (saved) {
    if (saved.lang === 'ckb' || saved.lang === 'en') lang = saved.lang;
    if (saved.quality) low = saved.quality === 'low';
    if (typeof saved.sticks === 'boolean') stickPref = saved.sticks;
  }
} catch { /* keep defaults */ }

let state = parseSave(localStorage.getItem(SAVE_KEY)) || createState();
let playing = false;
let buildType = null;
let peopleSig = '';
let toastLeft = 0;
let edgeLeft = 0;
let saveLeft = 0;
const keys = new Set();
const sticks = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, panX: 0, panY: 0, orbitX: 0, orbitY: 0 };
const mosqueView = cellToWorld(LAYOUT.mosque.gx, LAYOUT.mosque.gz);
const buildCam = { yaw: 0.62, pitch: 1.02, dist: 8.5, x: mosqueView.x, z: mosqueView.z };
let ps1 = true;
let riding = false;
const walkCam = { yaw: 0.35, pitch: 0.48 };

const view = createView(canvas);
view.setQuality(low);
view.resize();

const resbar = document.getElementById('resbar');
RES.forEach((key) => {
  const chip = document.createElement('span');
  chip.className = 'chip tiny';
  chip.innerHTML = `<span data-i18n="${key}"></span> <b id="res-${key}" dir="ltr"></b>`;
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
      quality: low ? 'low' : 'high',
      sticks: stickPref,
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
    walkCam.yaw = buildCam.yaw;
    walkCam.pitch = 0.48;
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
  buildCam.x += (basis.right.x * mx + basis.forward.x * my) * spd;
  buildCam.z += (basis.right.z * mx + basis.forward.z * my) * spd;
  buildCam.yaw += (sticks.orbitX + (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0)) * dt * 1.3;
  buildCam.pitch = clamp(buildCam.pitch - sticks.orbitY * dt * 0.7, 0.45, 1.25);
  const lo = cellToWorld(MAP_BOUND.minGx, MAP_BOUND.minGz);
  const hi = cellToWorld(MAP_BOUND.maxGx, MAP_BOUND.maxGz);
  buildCam.x = clamp(buildCam.x, Math.min(lo.x, hi.x), Math.max(lo.x, hi.x));
  buildCam.z = clamp(buildCam.z, Math.min(lo.z, hi.z), Math.max(lo.z, hi.z));
  buildCam.dist = clamp(buildCam.dist, 6, 10);
}

function applyWalk(dt) {
  const p = player();
  let mx = sticks.moveX + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let my = sticks.moveY + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  const lookX = sticks.lookX + (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  const lookY = sticks.lookY + (keys.has('KeyR') ? 1 : 0) - (keys.has('KeyF') ? 1 : 0);
  const step = walkStep({ x: p.gx, z: p.gz }, walkCam.yaw, walkCam.pitch, mx, my, lookX, lookY, dt * (riding ? 1.75 : 1));
  const bounded = clampToMap(step.x, step.z);
  p.gx = bounded.gx;
  p.gz = bounded.gz;
  p.tx = bounded.gx;
  p.tz = bounded.gz;
  walkCam.yaw = step.yaw;
  walkCam.pitch = step.pitch;
  if (bounded.hit && edgeLeft <= 0) {
    toast(t(lang, 'edge'));
    edgeLeft = 3;
  }
}

function doAction() {
  const p = player();
  let best = null;
  let bestD = 1.8;
  state.buildings.forEach((b) => {
    const d = Math.hypot(b.gx - p.gx, b.gz - p.gz);
    if (d < bestD) { best = b; bestD = d; }
  });
  if (!best) { toast(t(lang, 'closer')); return; }
  state.selectedId = best.id;
  openPanel('detail');
}

function paint() {
  RES.forEach((key) => {
    const el = document.getElementById(`res-${key}`);
    if (el) el.textContent = formatNum(state.resources[key], lang);
  });
  const wood = document.getElementById('stockWood');
  if (wood) wood.textContent = formatNum(state.resources.wood, lang);
  document.getElementById('clockTime').textContent = formatClock(state.hour, state.acc || 0, lang);
  const season = t(lang, SEASONS[state.season]);
  const phase = t(lang, phaseOf(state.hour));
  document.getElementById('clockMeta').textContent = `${t(lang, 'day')} ${formatNum(state.day, lang)} · ${season} · ${phase}`;
  document.getElementById('modeBtn').textContent = state.mode === 'walk' ? t(lang, 'modeToBuild') : t(lang, 'modeToWalk');
  document.getElementById('qualityBtn').textContent = low ? t(lang, 'qualityLow') : t(lang, 'qualityHigh');
  document.getElementById('stickPref').textContent = stickPref ? t(lang, 'sticksOn') : t(lang, 'sticksOff');
  document.getElementById('levelNum').textContent = formatNum(state.level, lang);
  document.getElementById('happyNum').textContent = formatNum(snapshot(state).happiness, lang);
  document.getElementById('qSpring').textContent = state.quests.spring ? t(lang, 'qDone') : t(lang, 'qTodo');
  document.getElementById('qSchool').textContent = state.quests.school ? t(lang, 'qDone') : t(lang, 'qTodo');
  document.getElementById('qNewroz').textContent = state.quests.newroz ? t(lang, 'qDone') : t(lang, 'qTodo');
  document.querySelectorAll('#buildList .build-btn').forEach((btn) => {
    const type = btn.dataset.build;
    const cost = COSTS[type];
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
        name.textContent = `${lang === 'ckb' ? v.nameCkb : v.name} · ${formatNum(v.happiness, lang)}`;
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

bindStick(document.getElementById('moveZone'), 'moveX', 'moveY');
bindStick(document.getElementById('lookZone'), 'lookX', 'lookY');
bindStick(document.getElementById('panZone'), 'panX', 'panY');
bindStick(document.getElementById('orbitZone'), 'orbitX', 'orbitY');

document.getElementById('playBtn').addEventListener('click', () => {
  playing = true;
  document.getElementById('menu').hidden = true;
  closePanels();
});
document.getElementById('freshBtn').addEventListener('click', () => {
  state = createState();
  buildType = null;
  playing = false;
  persist();
  peopleSig = '';
  paint();
  toast(t(lang, 'fresh'));
});
document.getElementById('helpBtn').addEventListener('click', () => openPanel('help'));
document.getElementById('helpClose').addEventListener('click', closePanels);
document.getElementById('creditsBtn').addEventListener('click', () => openPanel('credits'));
document.getElementById('creditsClose').addEventListener('click', closePanels);
document.getElementById('hudQuests').addEventListener('click', () => openPanel('quests'));
document.getElementById('questsClose').addEventListener('click', closePanels);
document.getElementById('hudPeople').addEventListener('click', () => openPanel('people'));
document.getElementById('peopleClose').addEventListener('click', closePanels);
document.getElementById('hudBuild').addEventListener('click', () => openPanel('build'));
document.getElementById('buildClose').addEventListener('click', closePanels);
document.getElementById('detailClose').addEventListener('click', closePanels);
document.getElementById('hudPause').addEventListener('click', () => openPanel('pause'));
document.getElementById('resumeBtn').addEventListener('click', closePanels);
document.getElementById('pauseHelp').addEventListener('click', () => openPanel('help'));
document.getElementById('pauseMenu').addEventListener('click', () => {
  playing = false;
  closePanels();
  document.getElementById('menu').hidden = false;
  showControls();
  persist();
});
document.getElementById('modeBtn').addEventListener('click', () => setMode(state.mode === 'walk' ? 'build' : 'walk'));
document.getElementById('langEn').addEventListener('click', () => { lang = 'en'; applyLang(); });
document.getElementById('langCkb').addEventListener('click', () => { lang = 'ckb'; applyLang(); });
document.getElementById('qualityBtn').addEventListener('click', () => {
  low = !low;
  view.setQuality(low);
  saveSettings();
  paint();
});
document.getElementById('ps1Btn').addEventListener('click', () => {
  ps1 = !ps1;
  view.setSnap(ps1);
  const btn = document.getElementById('ps1Btn');
  btn.textContent = ps1 ? 'On' : 'Off';
  btn.classList.toggle('on', ps1);
});
document.getElementById('rideBtn').addEventListener('click', () => {
  riding = !riding;
  document.getElementById('rideBtn').classList.toggle('on', riding);
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
  if (!ptr.moved) return;
  if (playing && state.mode === 'walk') {
    walkCam.yaw += dx * 0.007;
    walkCam.pitch = clamp(walkCam.pitch + dy * 0.005, 0.18, 1.15);
  } else {
    const basis = cameraBasis(buildCam.yaw);
    const scale = 0.012 * (buildCam.dist / 30);
    buildCam.x -= (basis.right.x * dx + basis.forward.x * dy) * scale;
    buildCam.z -= (basis.right.z * dx + basis.forward.z * dy) * scale;
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

window.addEventListener('resize', () => view.resize());
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => view.resize());
}

if (!testMode && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

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
      focus: { gx: focusHere.gx, gz: focusHere.gz, r: renderRadiusUnits(low) / 2 },
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
  const radius = renderRadiusUnits(low);
  const camDist = walking ? 5.2 : buildCam.dist;
  view.setFog(Math.max(1.5, camDist * 0.35), camDist + radius * 0.92);
  view.sync(state, now / 1000, { x: here.x, z: here.z, radius });
  const boot = document.getElementById('boot');
  if (boot) boot.hidden = true;
  view.render();
  if (playing) {
    document.getElementById('clockTime').textContent = formatClock(state.hour, state.acc || 0, lang);
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
  renderRadius: () => renderRadiusUnits(low),
  setRiding(on) { riding = !!on; },
  isRiding: () => riding,
  tickNear(dt) {
    const who = player();
    tick(state, dt, {
      skipPlayer: true,
      focus: { gx: who.gx, gz: who.gz, r: renderRadiusUnits(low) / 2 },
    });
    const here = cellToWorld(who.gx, who.gz);
    const radius = renderRadiusUnits(low);
    view.setFog(2, 5.2 + radius * 0.92);
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
  advanceHours(n) { advanceHours(state, n); persist(); paint(); },
  setStock(key, value) { return setStock(state, key, value); },
  setHour(h) { setHour(state, h); paint(); },
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
    const basis = cameraBasis(walkCam.yaw);
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
  projectCell(gx, gz) {
    if (state.mode === 'walk') view.lookAtWalk(player().gx, player().gz, walkCam.yaw, walkCam.pitch);
    else view.lookAtBuild(buildCam);
    return view.project(gx, gz);
  },
};
document.body.dataset.ready = '1';
document.body.dataset.mode = state.mode;
