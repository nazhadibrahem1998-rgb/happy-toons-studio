/**
 * بورجی خشت — Block Tower
 * © 2026 Nazhad Ibrahem – Happy Toons Studio
 * Made with AI assistance (code and graphics).
 */
import * as THREE from './vendor/three.module.min.js';
import { COMMUNITY_LINKS, COSMETICS } from './config.js';
import { t } from './i18n.js';
import { FLOOR_COUNT, FLOOR_NAMES } from './levels.js';
import { createState, hazardPose, placeAtCheckpoint, snapshot, solidPose, step, stepRivals } from './physics.js';
import { createRivals, decideRivals, placeWord, raceRows, rivalModeName } from './rivals.js';
import { submitFeedback } from './feedback.js';
import { UPGRADES, applyProgress, buyUpgrade, loadProgress, saveProgress, upgradeCost } from './upgrades.js';
import { isMuted, playCheckpoint, playDeath, playJump, playWin, setMuted, tone } from './audio.js';

const canvas = document.getElementById('c');
const perfEl = document.getElementById('perf');
const testMode = new URLSearchParams(location.search).has('test');

const ui = {
  menu: document.getElementById('menu'),
  help: document.getElementById('help'),
  feedback: document.getElementById('feedback'),
  pause: document.getElementById('pause'),
  finish: document.getElementById('finish'),
  leave: document.getElementById('leave'),
  hud: document.getElementById('hud'),
  touch: document.getElementById('touch'),
  rotate: document.getElementById('rotate'),
  toast: document.getElementById('toast'),
  flash: document.getElementById('flash'),
  floorLabel: document.getElementById('floorLabel'),
  floorName: document.getElementById('floorName'),
  timer: document.getElementById('timer'),
  timerLabel: document.getElementById('timerLabel'),
  menuBest: document.getElementById('menuBest'),
  menuHighest: document.getElementById('menuHighest'),
  finishTime: document.getElementById('finishTime'),
  finishBest: document.getElementById('finishBest'),
  finishHighest: document.getElementById('finishHighest'),
  qualityBtn: document.getElementById('qualityBtn'),
  swatches: document.getElementById('swatches'),
  fbText: document.getElementById('fbText'),
  fbStatus: document.getElementById('fbStatus'),
  fbCount: document.getElementById('fbCount'),
  langCkb: document.getElementById('langCkb'),
  langEn: document.getElementById('langEn'),
};

let lang = localStorage.getItem('bt-lang') === 'ckb' ? 'ckb' : 'en';
let rivalMode = rivalModeName(localStorage.getItem('bt-rivals') || 'easy');
let quality = localStorage.getItem('bt-quality') || (mobileUI() ? 'low' : 'high');
let colorId = localStorage.getItem('bt-color') || 'cyan';
let mode = 'menu';
let progress = loadProgress();
let world = createState();
applyProgress(world, progress);
world.rivals = createRivals(rivalMode, world);
let seenSerial = world.checkpointSerial;
let seenHighest = world.highest;
let lastDeaths = 0;
let winHandled = false;
let yaw = 0;
let pitch = 0.38;
let joyX = 0;
let joyY = 0;
let touchJump = false;
let touchDash = false;
let gemMesh = null;
let score = 0;
let toastTimer = 0;
let holdRivals = false;
let menuAng = 0.6;
const keys = new Set();
const cam = { x: 30, y: 16, z: 24 };
const look = new THREE.Vector3();
const dummy = new THREE.Object3D();
const meshById = new Map();

function mobileUI() {
  return window.matchMedia('(pointer: coarse)').matches
    || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900);
}

function pixelCap() {
  const dpr = window.devicePixelRatio || 1;
  return quality === 'low' ? Math.min(1, dpr) : Math.min(1.5, dpr);
}

function fmt(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function highestRecord() {
  return Number(localStorage.getItem('bt-highest') || 0);
}

function cosmeticById(id) {
  return COSMETICS.find((c) => c.id === id) || COSMETICS[0];
}

function cosmeticUnlocked(item) {
  if (item.floor <= 1) return true;
  return item.floor <= Math.max(highestRecord(), mode === 'play' ? world.highest : 0);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070812);
scene.fog = new THREE.Fog(0x070812, 16, 82);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 140);
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'default',
    stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x070812, 1);
} catch (err) {
  renderer = null;
}

const PALETTE = {
  cyan: { color: 0x123844, emissive: 0x0e6c78 },
  magenta: { color: 0x3a1632, emissive: 0x7a1858 },
  lime: { color: 0x243214, emissive: 0x4c7c16 },
  amber: { color: 0x3a2812, emissive: 0x8a5410 },
  gold: { color: 0x3a3014, emissive: 0x8a6820 },
  stone: { color: 0x1a1e2c, emissive: 0x101426 },
  checkpoint: { color: 0x0c343c, emissive: 0x1c9aaa },
};
const materials = {};
function matFor(name) {
  if (!materials[name]) {
    const p = PALETTE[name] || PALETTE.cyan;
    materials[name] = new THREE.MeshLambertMaterial({ color: p.color, emissive: p.emissive });
  }
  return materials[name];
}

const box = new THREE.BoxGeometry(1, 1, 1);
let buildings = null;
let windows = null;
let lava = null;

function buildScenery() {
  scene.add(new THREE.AmbientLight(0x24344a, 0.62));
  scene.add(new THREE.HemisphereLight(0x243060, 0x12080c, 0.42));
  const sun = new THREE.DirectionalLight(0xd0dcff, 0.8);
  sun.position.set(24, 48, 16);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(640, 90),
    new THREE.MeshLambertMaterial({ color: 0x0c1018 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(260, -1.6, 0);
  scene.add(ground);

  lava = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({ color: 0xc81f12 }),
  );
  lava.rotation.x = -Math.PI / 2;
  scene.add(lava);

  const count = 48;
  buildings = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x141824 }), count);
  windows = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff }), count);
  const neon = [0x3ef0ff, 0xff3ec8, 0xc6ff4a];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = (i * 19) % 500;
    const z = side * (18 + (i * 5) % 18);
    const h = 8 + (i * 7) % 28;
    const w = 3 + (i % 4);
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, w);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, h * 0.62, z + side * (w / 2 + 0.06));
    dummy.scale.set(0.55, 1.6, 0.1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    windows.setMatrixAt(i, dummy.matrix);
    windows.setColorAt(i, new THREE.Color(neon[i % 3]));
  }
  buildings.frustumCulled = false;
  windows.frustumCulled = false;
  scene.add(buildings);
  scene.add(windows);

  const column = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x12151e }), 18);
  const bands = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xff3ec8 }), 9);
  for (let i = 0; i < 18; i++) {
    dummy.position.set(-7.2, i * 3.1 + 1.4, 0);
    dummy.scale.set(2.2, 2.9, 2.2);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    column.setMatrixAt(i, dummy.matrix);
    if (i % 2 === 0) {
      dummy.position.set(-7.2, i * 3.1 + 2.7, 0);
      dummy.scale.set(2.5, 0.18, 2.5);
      dummy.updateMatrix();
      bands.setMatrixAt(i / 2, dummy.matrix);
    }
  }
  column.frustumCulled = false;
  bands.frustumCulled = false;
  scene.add(column);
  scene.add(bands);
}

function buildLevelMeshes(ents) {
  const buckets = new Map();
  for (const ent of ents) {
    if (ent.kind === 'gem') continue;
    if (ent.kind === 'solid' && !ent.move && !ent.crumble) {
      if (!buckets.has(ent.color)) buckets.set(ent.color, []);
      buckets.get(ent.color).push(ent);
      continue;
    }
    let mesh;
    if (ent.kind === 'solid') {
      mesh = new THREE.Mesh(box, matFor(ent.color));
    } else if (ent.hazard === 'laser') {
      mesh = new THREE.Mesh(box, new THREE.MeshBasicMaterial({
        color: 0xff3ec8,
        transparent: true,
        opacity: 0.9,
      }));
    } else {
      mesh = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xff3ec8 }));
    }
    mesh.frustumCulled = false;
    scene.add(mesh);
    meshById.set(ent.id, mesh);
  }
  for (const [color, list] of buckets) {
    const mesh = new THREE.InstancedMesh(box, matFor(color), list.length);
    list.forEach((ent, index) => {
      dummy.position.set(ent.cx, ent.top - ent.h / 2, ent.cz);
      dummy.scale.set(ent.w, ent.h, ent.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
}

function buildGems(ents) {
  const gems = ents.filter((ent) => ent.kind === 'gem');
  if (!gems.length) return;
  gemMesh = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xc6ff4a }), gems.length);
  gemMesh.frustumCulled = false;
  gemMesh.userData.gems = gems;
  scene.add(gemMesh);
  syncGems();
}

function syncGems() {
  if (!gemMesh) return;
  const gems = gemMesh.userData.gems;
  for (let i = 0; i < gems.length; i++) {
    const gem = gems[i];
    const got = progress.found.includes(gem.id);
    dummy.position.set(gem.x, gem.y + Math.sin(world.time * 3 + i) * 0.08, gem.z);
    dummy.rotation.set(world.time, world.time * 0.6, 0);
    const s = got ? 0.001 : 0.36;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    gemMesh.setMatrixAt(i, dummy.matrix);
  }
  gemMesh.instanceMatrix.needsUpdate = true;
}

function collectGems() {
  if (!gemMesh || mode !== 'play') return;
  const p = world.player;
  let picked = false;
  for (const gem of gemMesh.userData.gems) {
    if (progress.found.includes(gem.id)) continue;
    const dx = gem.x - p.x;
    const dy = gem.y - (p.y + 0.8);
    const dz = gem.z - p.z;
    if (dx * dx + dy * dy + dz * dz > 0.7 * 0.7) continue;
    progress.found.push(gem.id);
    progress.gems += 1;
    picked = true;
  }
  if (!picked) return;
  saveProgress(progress);
  updateGemButton();
  toast(lang === 'en' ? 'Gem' : 'گەوهەر');
}

function updateGemButton() {
  const count = document.getElementById('gemCount');
  if (count) count.textContent = String(progress.gems);
  const pip = document.getElementById('shieldPip');
  if (pip) pip.hidden = !world.shieldReady;
  const dashBtn = document.getElementById('dashBtn');
  if (dashBtn) {
    dashBtn.hidden = !world.hasDash;
    dashBtn.textContent = (progress.dash || 0) > 1 ? 'Dash+' : 'Dash';
  }
}

function renderUpgrades() {
  const list = document.getElementById('upgradeList');
  const line = document.getElementById('gemLine');
  if (!list || !line) return;
  line.textContent = lang === 'en'
    ? `Gems: ${progress.gems}`
    : `گەوهەر: ${progress.gems}`;
  list.replaceChildren();
  for (const item of UPGRADES) {
    const rank = progress[item.id] || 0;
    const card = document.createElement('div');
    card.className = 'upgrade';
    const title = document.createElement('strong');
    title.textContent = lang === 'en' ? item.en : item.ckb;
    const sub = document.createElement('p');
    sub.className = 'sub';
    sub.dir = lang === 'en' ? 'rtl' : 'ltr';
    sub.textContent = lang === 'en' ? item.ckb : item.en;
    const detail = document.createElement('p');
    detail.textContent = lang === 'en' ? item.enDetail : item.ckbDetail;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    if (rank >= item.max) {
      btn.disabled = true;
      btn.textContent = lang === 'en' ? 'Owned' : 'کراوە';
    } else {
      const cost = upgradeCost(progress, item.id);
      btn.textContent = `${lang === 'en' ? 'Buy' : 'کڕین'} · ${cost}`;
      btn.disabled = progress.gems < cost;
      btn.addEventListener('click', () => {
        if (!buyUpgrade(progress, item.id)) return;
        applyProgress(world, progress);
        if (item.id === 'shield') world.shieldReady = true;
        updateGemButton();
        renderUpgrades();
      });
    }
    card.append(title, sub, detail, btn);
    list.appendChild(card);
  }
}

function openUpgrades() {
  renderUpgrades();
  showPanel('upgrades');
}

function makePlayer() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd5e4f2, emissive: 0x102028 });
  const accent = new THREE.MeshLambertMaterial({ color: 0x3ef0ff, emissive: 0x3ef0ff });
  const dark = new THREE.MeshLambertMaterial({ color: 0x141820 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.36), bodyMat);
  torso.position.y = 0.98;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.38), accent);
  strip.position.y = 1.08;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.38), bodyMat);
  head.position.y = 1.54;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), dark);
  visor.position.set(0, 1.54, 0.18);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.14), bodyMat);
  armL.position.set(-0.42, 0.98, 0);
  const armR = armL.clone();
  armR.position.x = 0.42;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), dark);
  legL.position.set(-0.15, 0.28, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;
  group.add(torso, strip, head, visor, armL, armR, legL, legR);
  scene.add(group);
  const trails = [];
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x3ef0ff, transparent: true, opacity: 0.6 }),
    );
    mesh.visible = false;
    scene.add(mesh);
    trails.push(mesh);
  }
  return { group, bodyMat, accent, arms: [armL, armR], legs: [legL, legR], trails, trailCursor: 0 };
}

const rivalGeo = {
  torso: new THREE.BoxGeometry(0.56, 0.64, 0.32),
  head: new THREE.BoxGeometry(0.34, 0.3, 0.32),
  arm: new THREE.BoxGeometry(0.12, 0.42, 0.12),
  leg: new THREE.BoxGeometry(0.14, 0.4, 0.14),
};
const rivalDark = new THREE.MeshLambertMaterial({ color: 0x141820 });
const rivalMeshes = [];

function nameSprite(label, css) {
  const board = document.createElement('canvas');
  board.width = 128;
  board.height = 32;
  const ctx = board.getContext('2d');
  ctx.clearRect(0, 0, 128, 32);
  ctx.fillStyle = css;
  ctx.font = '700 22px Segoe UI, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 16);
  const tex = new THREE.CanvasTexture(board);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.position.y = 2.05;
  sprite.scale.set(1.8, 0.46, 1);
  sprite.frustumCulled = false;
  return sprite;
}

function makeRivalMesh(color, label) {
  const group = new THREE.Group();
  const css = `#${color.toString(16).padStart(6, '0')}`;
  const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.22 });
  const torso = new THREE.Mesh(rivalGeo.torso, mat);
  torso.position.y = 0.96;
  const head = new THREE.Mesh(rivalGeo.head, mat);
  head.position.y = 1.48;
  const armL = new THREE.Mesh(rivalGeo.arm, mat);
  armL.position.set(-0.38, 0.96, 0);
  const armR = new THREE.Mesh(rivalGeo.arm, mat);
  armR.position.set(0.38, 0.96, 0);
  const legL = new THREE.Mesh(rivalGeo.leg, rivalDark);
  legL.position.set(-0.14, 0.26, 0);
  const legR = new THREE.Mesh(rivalGeo.leg, rivalDark);
  legR.position.set(0.14, 0.26, 0);
  group.add(torso, head, armL, armR, legL, legR, nameSprite(label, css));
  group.traverse((obj) => { obj.frustumCulled = false; });
  group.visible = false;
  scene.add(group);
  return group;
}

let player = null;
let glLost = false;
let signsReady = false;
if (renderer) {
  buildScenery();
  buildLevelMeshes(world.ents);
  buildGems(world.ents);
  player = makePlayer();
  for (const who of [
    { color: 0xff3ec8, en: 'Nari' },
    { color: 0xc6ff4a, en: 'Peko' },
    { color: 0x7aa2ff, en: 'Vilo' },
  ]) rivalMeshes.push(makeRivalMesh(who.color, who.en));
  buildStudioSigns(world.ents);
  applyCosmetic(colorId, false);
  applyQuality();
}

function wordmarkTexture() {
  const board = document.createElement('canvas');
  board.width = 256;
  board.height = 64;
  const ctx = board.getContext('2d');
  ctx.fillStyle = '#071018';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#3ef0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#3ef0ff';
  ctx.font = '700 20px Segoe UI, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HAPPY TOONS STUDIO', 128, 32);
  const tex = new THREE.CanvasTexture(board);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function buildStudioSigns(ents) {
  const byId = new Map(ents.map((ent) => [ent.id, ent]));
  const wordTex = wordmarkTexture();
  const wordMat = new THREE.MeshBasicMaterial({ map: wordTex });
  const wordGeo = new THREE.PlaneGeometry(3.6, 0.95);
  const wordFrameGeo = new THREE.BoxGeometry(3.85, 1.15, 0.1);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x10141e, emissive: 0x0c1020 });
  const logoTex = new THREE.TextureLoader().load('./assets/studio-logo.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    signsReady = true;
  });
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.generateMipmaps = false;
  logoTex.minFilter = THREE.LinearFilter;
  logoTex.magFilter = THREE.LinearFilter;
  const logoMat = new THREE.MeshBasicMaterial({ map: logoTex });
  const logoGeo = new THREE.PlaneGeometry(2.3, 2.3);
  const logoFrameGeo = new THREE.BoxGeometry(2.55, 2.55, 0.1);

  function mount(ent, side, faceGeo, faceMat, frameGeo, lift) {
    if (!ent) return;
    const group = new THREE.Group();
    const frame = new THREE.Mesh(frameGeo, frameMat);
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.07;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(faceGeo.parameters.width + 0.5, faceGeo.parameters.height + 0.9, 0.28),
      wallMat,
    );
    wall.position.z = -0.16;
    wall.frustumCulled = false;
    frame.frustumCulled = false;
    face.frustumCulled = false;
    group.add(wall, frame, face);
    group.position.set(
      ent.cx,
      ent.top + lift,
      ent.cz + side * (ent.d * 0.5 + 1.15),
    );
    group.rotation.y = -Math.PI / 2;
    group.frustumCulled = false;
    scene.add(group);
  }

  mount(byId.get('f8-island'), 1, wordGeo, wordMat, wordFrameGeo, 1.7);
  mount(byId.get('f9-start'), -1, wordGeo, wordMat, wordFrameGeo, 1.7);
  mount(byId.get('f10-start'), 1, wordGeo, wordMat, wordFrameGeo, 1.7);

  const crown = byId.get('finish');
  if (crown) {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(logoFrameGeo, new THREE.MeshBasicMaterial({ color: 0xff3ec8 }));
    const face = new THREE.Mesh(logoGeo, logoMat);
    face.position.z = 0.07;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.3, 0.3), wallMat);
    wall.position.z = -0.16;
    wall.frustumCulled = false;
    frame.frustumCulled = false;
    face.frustumCulled = false;
    group.add(wall, frame, face);
    group.position.set(crown.cx + crown.w * 0.35, crown.top + 2.35, crown.cz + crown.d * 0.5 + 1.7);
    group.rotation.y = -Math.PI / 2;
    group.frustumCulled = false;
    scene.add(group);
  }
}

function applyCosmetic(id, save) {
  const item = cosmeticById(id);
  if (!cosmeticUnlocked(item)) return;
  colorId = item.id;
  if (save !== false) localStorage.setItem('bt-color', colorId);
  if (!player) return;
  player.bodyMat.color.set(item.body);
  player.accent.color.set(item.accent);
  player.accent.emissive.set(item.accent);
  renderSwatches();
}

function applyQuality() {
  const low = quality === 'low';
  if (buildings) buildings.count = low ? 20 : 48;
  if (windows) windows.count = low ? 0 : 48;
  scene.fog.far = low ? 46 : 82;
  camera.far = low ? 90 : 140;
  if (ui.qualityBtn) ui.qualityBtn.textContent = t(lang, low ? 'qualityLow' : 'qualityHigh');
  resize();
}

function resize() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
  updateRotate();
  if (!renderer) return;
  const vv = window.visualViewport;
  const w = Math.max(1, Math.floor(vv ? vv.width : window.innerWidth));
  const h = Math.max(1, Math.floor(vv ? vv.height : window.innerHeight));
  renderer.setPixelRatio(pixelCap());
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

function updateRotate() {
  const portrait = window.innerHeight > window.innerWidth + 40;
  const phone = mobileUI() && Math.min(window.innerWidth, window.innerHeight) < 920;
  ui.rotate.classList.toggle('show', portrait && phone && mode === 'play');
}

function renderSwatches() {
  ui.swatches.replaceChildren();
  for (const item of COSMETICS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch' + (item.id === colorId ? ' on' : '');
    btn.style.background = item.accent;
    const open = cosmeticUnlocked(item);
    btn.disabled = !open;
    btn.title = open
      ? item.id
      : `${t(lang, 'locked')} · ${t(lang, 'floor')} ${item.floor}`;
    btn.setAttribute('aria-label', btn.title);
    btn.addEventListener('click', () => applyCosmetic(item.id));
    ui.swatches.appendChild(btn);
  }
}

function renderLinks() {
  const list = document.getElementById('community');
  list.replaceChildren();
  for (const link of COMMUNITY_LINKS) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.dataset.link = link.id;
    a.textContent = `${link.ckb} · ${link.en}`;
    li.appendChild(a);
    list.appendChild(li);
  }
}

function applyLang(next) {
  lang = next === 'en' ? 'en' : 'ckb';
  localStorage.setItem('bt-lang', lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'ckb';
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.getAttribute('data-i18n'));
  });
  ui.langCkb.classList.toggle('on', lang === 'ckb');
  ui.langEn.classList.toggle('on', lang === 'en');
  ui.langCkb.setAttribute('aria-pressed', lang === 'ckb' ? 'true' : 'false');
  ui.langEn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  applyQuality();
  updateHud();
  updateRecords();
  renderSwatches();
  const upLabel = lang === 'en' ? 'Upgrades' : 'باشترکردن';
  const upBtn = document.getElementById('upgradeBtn');
  const pauseUp = document.getElementById('pauseUpgrades');
  if (upBtn) upBtn.textContent = upLabel;
  if (pauseUp) pauseUp.textContent = upLabel;
  renderUpgrades();
  document.querySelectorAll('[data-rival]').forEach((btn) => {
    const on = btn.dataset.rival === rivalMode;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (document.getElementById('finish') && !document.getElementById('finish').hidden) fillResults();
}

function updateRecords() {
  const best = Number(localStorage.getItem('bt-best-ms') || 0);
  const high = highestRecord();
  ui.menuBest.textContent = best ? fmt(best / 1000) : '—';
  ui.menuHighest.textContent = high ? String(high) : '—';
}

function updateHud() {
  const floor = world.spawn.floor;
  const name = FLOOR_NAMES[floor] || FLOOR_NAMES[1];
  const num = document.getElementById('floorNum');
  if (num) num.textContent = `${floor} / ${FLOOR_COUNT}`;
  ui.floorName.textContent = lang === 'en' ? name.en : name.ckb;
  ui.timer.textContent = fmt(world.playTime);
  ui.timerLabel.textContent = t(lang, 'time');
  const placeRow = document.getElementById('placeRow');
  if (placeRow) {
    const rivals = world.rivals || [];
    if (!rivals.length || mode !== 'play') {
      placeRow.hidden = true;
    } else {
      placeRow.hidden = false;
      const rows = raceRows(world);
      const index = Math.max(0, rows.findIndex((row) => row.id === 'you'));
      const num = document.getElementById('placeNum');
      if (num) num.textContent = placeWord(lang, index);
    }
  }
}

function fillResults() {
  const list = document.getElementById('raceResults');
  if (!list) return;
  const rivals = world.rivals || [];
  list.replaceChildren();
  if (!rivals.length) {
    list.hidden = true;
    return;
  }
  list.hidden = false;
  raceRows(world).forEach((row, index) => {
    const li = document.createElement('li');
    if (row.id === 'you') li.className = 'me';
    const who = document.createElement('span');
    who.className = 'who';
    const swatch = document.createElement('i');
    swatch.style.background = `#${row.color.toString(16).padStart(6, '0')}`;
    const name = document.createElement('span');
    name.textContent = `${placeWord(lang, index)}  ${lang === 'ckb' ? row.ckb : row.en}`;
    who.append(swatch, name);
    const time = document.createElement('b');
    time.dir = 'ltr';
    time.textContent = row.finished ? fmt(row.time) : t(lang, 'racing');
    li.append(who, time);
    list.appendChild(li);
  });
}

function setMode(next) {
  mode = next;
  ui.menu.hidden = next !== 'menu';
  ui.pause.hidden = next !== 'pause';
  ui.finish.hidden = next !== 'finish';
  const playing = next === 'play';
  ui.hud.hidden = !playing;
  ui.touch.hidden = !playing || !mobileUI();
  if (playing) keys.clear();
  updateHud();
  updateRotate();
  updateGemButton();
}

function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('on');
  toastTimer = 1.4;
}

let flashHandle = 0;
function flash() {
  ui.flash.classList.add('on');
  clearTimeout(flashHandle);
  flashHandle = setTimeout(() => ui.flash.classList.remove('on'), 120);
}

function showFinish() {
  ui.toast.classList.remove('on');
  toastTimer = 0;
  const ms = Math.round(world.playTime * 1000);
  const prev = Number(localStorage.getItem('bt-best-ms') || 0);
  if (!prev || ms < prev) localStorage.setItem('bt-best-ms', String(ms));
  ui.finishTime.textContent = fmt(world.playTime);
  ui.finishBest.textContent = fmt(Number(localStorage.getItem('bt-best-ms')) / 1000);
  ui.finishHighest.textContent = String(Math.max(world.highest, highestRecord()));
  fillResults();
  setMode('finish');
  updateRecords();
}

function poll() {
  if (mode === 'play' && world.highest > highestRecord()) {
    localStorage.setItem('bt-highest', String(world.highest));
    updateRecords();
    renderSwatches();
  }
  if (world.checkpointSerial !== seenSerial) {
    seenSerial = world.checkpointSerial;
    if (mode === 'play') {
      playCheckpoint();
      toast(t(lang, 'checkpoint'));
    }
  }
  if (world.highest > seenHighest) {
    const reached = world.highest;
    seenHighest = reached;
    if (mode === 'play' && COSMETICS.some((c) => c.floor === reached && c.floor > 1)) {
      toast(t(lang, 'unlocked'));
    }
  }
  if (world.deaths > lastDeaths) {
    if (mode === 'play') {
      playDeath();
      flash();
    }
    lastDeaths = world.deaths;
  } else {
    lastDeaths = world.deaths;
  }
  if (world.won && !winHandled) {
    winHandled = true;
    playWin();
    showFinish();
  }
}

function restart() {
  world = createState();
  applyProgress(world, progress);
  world.rivals = createRivals(rivalMode, world);
  holdRivals = false;
  if (world.shieldOwned) world.shieldReady = true;
  seenSerial = 0;
  seenHighest = world.highest;
  lastDeaths = 0;
  winHandled = false;
  yaw = 0;
  pitch = 0.38;
  setMode('play');
  syncGems();
}

function readInput() {
  let forward = 0;
  let strafe = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
  if (Math.abs(joyY) > 0.12) forward = joyY;
  if (Math.abs(joyX) > 0.12) strafe = joyX;
  return { forward, strafe, jump: keys.has('Space') || touchJump, dash: keys.has('ShiftLeft') || keys.has('ShiftRight') || touchDash, yaw, timing: true };
}

function syncDynamics() {
  for (const ent of world.ents) {
    const mesh = meshById.get(ent.id);
    if (!mesh) continue;
    if (ent.kind === 'solid') {
      const pose = solidPose(ent, world.time, 0);
      mesh.visible = pose.alive;
      mesh.position.set(pose.cx, (pose.minY + pose.maxY) / 2, pose.cz);
      mesh.scale.set(pose.w, pose.h, pose.d);
    } else if (ent.hazard === 'laser') {
      const pose = hazardPose(ent, world.time);
      mesh.visible = pose.active;
      mesh.position.set(pose.cx, (pose.minY + pose.maxY) / 2, pose.cz);
      mesh.scale.set(pose.w, pose.h, pose.d);
    } else {
      const pose = hazardPose(ent, world.time);
      mesh.position.set(pose.cx, pose.pivot, pose.cz);
      mesh.scale.set(pose.radius * 2, pose.thick, pose.depth);
      mesh.rotation.z = pose.ang;
      mesh.visible = true;
    }
  }
}

function syncPlayer(dt) {
  if (!player) return;
  const p = world.player;
  player.group.position.set(p.x, p.y, p.z);
  player.group.rotation.y = Math.PI / 2 - yaw;
  const speed = Math.hypot(p.vx, p.vz);
  const swing = Math.sin(world.playTime * 10) * Math.min(0.7, speed * 0.09);
  player.legs[0].rotation.x = swing;
  player.legs[1].rotation.x = -swing;
  player.arms[0].rotation.x = -swing * 0.6;
  player.arms[1].rotation.x = swing * 0.6;
  const item = cosmeticById(colorId);
  const max = quality === 'low' ? 6 : 12;
  if (!item.trail || mode !== 'play' || speed < 1) {
    if (!item.trail || mode !== 'play') player.trails.forEach((mesh) => { mesh.visible = false; });
  } else if (Math.floor(world.playTime * 18) !== Math.floor((world.playTime - dt) * 18)) {
    const mesh = player.trails[player.trailCursor % max];
    mesh.visible = true;
    mesh.position.set(p.x, p.y + 0.85, p.z);
    mesh.material.color.set(item.trail);
    mesh.userData.life = 1;
    player.trailCursor += 1;
  }
  for (let i = 0; i < player.trails.length; i++) {
    const mesh = player.trails[i];
    if (i >= max) {
      mesh.visible = false;
      continue;
    }
    if (!mesh.visible) continue;
    mesh.userData.life = (mesh.userData.life || 0) - dt * 1.6;
    mesh.material.opacity = Math.max(0, mesh.userData.life) * 0.75;
    if (mesh.userData.life <= 0) mesh.visible = false;
  }
}

let freezeCam = false;
function placeCamera(dt, snap) {
  if (freezeCam && mode === 'play') return;
  const p = world.player;
  let tx;
  let ty;
  let tz;
  if (mode === 'menu') {
    menuAng += dt * 0.15;
    tx = 22 + Math.cos(menuAng) * 28;
    tz = Math.sin(menuAng) * 28;
    ty = 15;
    look.set(16, 6, 0);
  } else {
    const dist = 7.6;
    tx = p.x - Math.cos(yaw) * Math.cos(pitch) * dist;
    tz = p.z - Math.sin(yaw) * Math.cos(pitch) * dist;
    ty = p.y + 1.5 + Math.sin(pitch) * dist * 0.45;
    look.set(p.x, p.y + 1.25, p.z);
  }
  const k = snap ? 1 : 1 - Math.exp(-7 * dt);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  cam.z += (tz - cam.z) * k;
  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(look);
  if (lava) {
    lava.position.set(p.x, world.spawn.y - 3.45, p.z);
  }
}

function syncRivals() {
  const list = world.rivals || [];
  for (let i = 0; i < rivalMeshes.length; i++) {
    const mesh = rivalMeshes[i];
    const rival = list[i];
    if (!mesh) continue;
    if (!rival) {
      mesh.visible = false;
      continue;
    }
    mesh.visible = true;
    mesh.position.set(rival.x, rival.y, rival.z);
    mesh.rotation.y = Math.PI / 2 - (rival.yaw || 0);
  }
}

function paint() {
  syncDynamics();
  syncPlayer(0);
  syncRivals();
  placeCamera(1 / 60, true);
  if (renderer) renderer.render(scene, camera);
  updateHud();
}

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (mode === 'play') setMode('pause');
    else if (mode === 'pause') setMode('play');
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  tone(660, 0.02, 'square', 0.0001);
  if (!testMode && e.pointerType === 'mouse' && mode === 'play' && canvas.requestPointerLock) {
    const lock = canvas.requestPointerLock();
    if (lock && lock.catch) lock.catch(() => {});
  }
});
canvas.addEventListener('pointermove', (e) => {
  const locked = document.pointerLockElement === canvas;
  if (!dragging && !locked) return;
  const dx = locked ? e.movementX : e.clientX - lastX;
  const dy = locked ? e.movementY : e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  yaw += dx * 0.005;
  pitch = Math.max(0.18, Math.min(1.05, pitch + dy * 0.0035));
});
function endDrag(e) {
  dragging = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const stickZone = document.getElementById('stickZone');
const knob = document.getElementById('knob');
let stickId = null;
let stickOrigin = { x: 0, y: 0 };
function stickMove(e) {
  const dx = e.clientX - stickOrigin.x;
  const dy = e.clientY - stickOrigin.y;
  const max = 46;
  const mag = Math.hypot(dx, dy) || 1;
  const scale = Math.min(mag, max) / mag;
  knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  joyX = (dx * scale) / max;
  joyY = -(dy * scale) / max;
}
stickZone.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId;
  const rect = stickZone.getBoundingClientRect();
  stickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  try { stickZone.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  stickMove(e);
  e.preventDefault();
});
stickZone.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stickId) return;
  stickMove(e);
});
function stickEnd(e) {
  if (e.pointerId !== stickId) return;
  stickId = null;
  joyX = 0;
  joyY = 0;
  knob.style.transform = 'translate(0px, 0px)';
}
stickZone.addEventListener('pointerup', stickEnd);
stickZone.addEventListener('pointercancel', stickEnd);

const jumpBtn = document.getElementById('jumpBtn');
function jumpDown(e) {
  touchJump = true;
  try { jumpBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  e.preventDefault();
}
function jumpUp() { touchJump = false; }
jumpBtn.addEventListener('pointerdown', jumpDown);
jumpBtn.addEventListener('pointerup', jumpUp);
jumpBtn.addEventListener('pointercancel', jumpUp);
const dashBtn = document.getElementById('dashBtn');
function dashDown(e) {
  touchDash = true;
  try { dashBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  e.preventDefault();
}
function dashUp() { touchDash = false; }
dashBtn.addEventListener('pointerdown', dashDown);
dashBtn.addEventListener('pointerup', dashUp);
dashBtn.addEventListener('pointercancel', dashUp);
document.getElementById('upgradeBtn').addEventListener('click', openUpgrades);
document.getElementById('pauseUpgrades').addEventListener('click', openUpgrades);
document.getElementById('gemBtn').addEventListener('click', openUpgrades);
document.getElementById('upgradeClose').addEventListener('click', () => {
  document.getElementById('upgrades').hidden = true;
});

function toggleMute() {
  setMuted(!isMuted());
  localStorage.setItem('bt-mute', isMuted() ? '1' : '0');
  document.getElementById('muteBtn').setAttribute('aria-pressed', isMuted() ? 'true' : 'false');
}
if (localStorage.getItem('bt-mute') === '1') setMuted(true);

document.getElementById('playBtn').addEventListener('click', () => setMode('play'));
document.getElementById('pauseBtn').addEventListener('click', () => setMode('pause'));
document.getElementById('resumeBtn').addEventListener('click', () => setMode('play'));
document.getElementById('restartBtn').addEventListener('click', restart);
document.getElementById('finishAgain').addEventListener('click', restart);
document.getElementById('pauseMenu').addEventListener('click', () => setMode('menu'));
document.getElementById('finishMenu').addEventListener('click', () => setMode('menu'));
function showPanel(id) {
  const root = document.getElementById(id);
  const panel = root && root.querySelector('.panel');
  if (panel) panel.scrollTop = 0;
  if (root) root.hidden = false;
}
document.getElementById('helpBtn').addEventListener('click', () => { showPanel('help'); });
document.getElementById('pauseHelp').addEventListener('click', () => { showPanel('help'); });
document.getElementById('helpClose').addEventListener('click', () => { ui.help.hidden = true; });
document.getElementById('feedbackBtn').addEventListener('click', () => { showPanel('feedback'); });
document.getElementById('fbClose').addEventListener('click', () => { ui.feedback.hidden = true; });
document.getElementById('muteBtn').addEventListener('click', toggleMute);
document.getElementById('fullBtn').addEventListener('click', () => {
  const req = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen?.();
  if (req && req.catch) req.catch(() => {});
});
document.getElementById('rivalModes').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-rival]');
  if (!btn) return;
  rivalMode = rivalModeName(btn.dataset.rival);
  localStorage.setItem('bt-rivals', rivalMode);
  if (mode !== 'play') world.rivals = createRivals(rivalMode, world);
  applyLang(lang);
  updateHud();
  syncRivals();
});
document.getElementById('qualityBtn').addEventListener('click', () => {
  quality = quality === 'low' ? 'high' : 'low';
  localStorage.setItem('bt-quality', quality);
  applyQuality();
});
ui.langCkb.addEventListener('click', () => applyLang('ckb'));
ui.langEn.addEventListener('click', () => applyLang('en'));
document.getElementById('iosDismiss').addEventListener('click', () => {
  localStorage.setItem('bt-ios-ok', '1');
  document.getElementById('iosHint').hidden = true;
});

document.getElementById('community').addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  e.preventDefault();
  document.getElementById('leaveUrl').textContent = link.getAttribute('href');
  ui.leave.dataset.url = link.href;
  ui.leave.hidden = false;
});
document.getElementById('community').addEventListener('auxclick', (e) => {
  if (e.target.closest('a')) e.preventDefault();
});
document.getElementById('leaveStay').addEventListener('click', () => { ui.leave.hidden = true; });
document.getElementById('leaveGo').addEventListener('click', () => {
  const url = ui.leave.dataset.url;
  ui.leave.hidden = true;
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
});

document.querySelectorAll('[data-score]').forEach((btn) => {
  btn.addEventListener('click', () => {
    score = Number(btn.dataset.score);
    document.querySelectorAll('[data-score]').forEach((other) => {
      const on = Number(other.dataset.score) === score;
      other.classList.toggle('on', on);
      other.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });
});
ui.fbText.addEventListener('input', () => {
  ui.fbCount.textContent = `${ui.fbText.value.length} / 500`;
});
document.getElementById('fbSend').addEventListener('click', async () => {
  const result = await submitFeedback(score, ui.fbText.value);
  const other = lang === 'ckb' ? 'en' : 'ckb';
  if (!result.ok) {
    ui.fbStatus.textContent = `${t(lang, 'needRating')}\n${t(other, 'needRating')}`;
    return;
  }
  const key = result.sent ? 'sent' : 'saved';
  let msg = `${t(lang, key)}\n${t(other, key)}`;
  if (result.stripped) msg += `\n${t(lang, 'stripped')} · ${t(other, 'stripped')}`;
  ui.fbStatus.textContent = msg;
  ui.fbText.value = '';
  ui.fbCount.textContent = '0 / 500';
  score = 0;
  document.querySelectorAll('[data-score]').forEach((other) => {
    other.classList.remove('on');
    other.setAttribute('aria-pressed', 'false');
  });
});

const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;
if (ios && !standalone && !localStorage.getItem('bt-ios-ok')) {
  document.getElementById('iosHint').hidden = false;
}

renderLinks();
applyLang(lang);
setMode('menu');
updateRotate();
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  glLost = true;
  const banner = document.getElementById('glLost');
  if (banner) banner.hidden = false;
}, false);
canvas.addEventListener('webglcontextrestored', () => {
  glLost = false;
  const banner = document.getElementById('glLost');
  if (banner) banner.hidden = true;
  placeAtCheckpoint(world);
  paint();
}, false);

window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

let last = performance.now();
let frames = 0;
let fpsWindow = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (document.hidden) return;
  if (mode === 'play' && !world.won) {
    const beforeY = world.player.vy;
    const input = readInput();
    if (!holdRivals) decideRivals(world, dt);
    step(world, input, dt);
    if (!holdRivals) stepRivals(world, dt);
    if (input.jump && world.player.vy > beforeY + 1) playJump();
    collectGems();
    poll();
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) ui.toast.classList.remove('on');
  }
  if (glLost) return;
  syncGems();
  syncDynamics();
  syncPlayer(dt);
  syncRivals();
  placeCamera(dt, false);
  if (renderer && mode === 'play') updateHud();
  if (renderer) {
    try { renderer.render(scene, camera); } catch { /* context dropped mid-frame */ }
  }
  frames += 1;
  fpsWindow += dt;
  if (fpsWindow >= 0.5) {
    perfEl.textContent = String(Math.round(frames / fpsWindow));
    frames = 0;
    fpsWindow = 0;
  }
}
requestAnimationFrame(frame);

async function installTestHook() {
  if (!testMode || !renderer) {
    window.__BT = { ready: false };
    return;
  }
  const bot = await import('./bot.js');
  const after = () => {
    poll();
    paint();
  };
  window.__BT = {
    ready: true,
    getState: () => snapshot(world),
    simulate(untilFloor = 100) {
      const result = bot.run(world, step, { untilFloor, maxSteps: 40000 });
      after();
      return result;
    },
    runUntil(pred) {
      if (mode !== 'play') setMode('play');
      for (let i = 0; i < 40000; i++) {
        const snap = snapshot(world);
        if (pred(snap) || world.won) {
          after();
          return snap;
        }
        step(world, { ...bot.plan(world), timing: true }, 1 / 60);
      }
      after();
      return snapshot(world);
    },
    kill() {
      world.player.y = world.spawn.y - 8;
      world.player.vy = -1;
      step(world, { forward: 0, strafe: 0, jump: false, yaw: 0, timing: true }, 1 / 60);
      after();
      return snapshot(world);
    },
    restart() {
      restart();
      paint();
    },
    stats() {
      paint();
      const mem = renderer.info.memory;
      const drawn = renderer.info.render;
      return {
        geometries: mem.geometries,
        textures: mem.textures,
        calls: drawn.calls,
        triangles: drawn.triangles,
        heap: performance.memory ? performance.memory.usedJSHeapSize : null,
        signsReady,
      };
    },
    get signsReady() { return signsReady; },
    setYaw(value) {
      yaw = value;
      pitch = 0.38;
      const held = freezeCam;
      freezeCam = false;
      placeCamera(1, true);
      freezeCam = held;
    },
    project(x, y, z) {
      camera.updateMatrixWorld(true);
      const v = new THREE.Vector3(x, y, z);
      v.project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
      };
    },
    strafeStep(strafe, frames) {
      const camNow = { x: cam.x, y: cam.y, z: cam.z };
      const lookNow = look.clone();
      for (let i = 0; i < frames; i++) {
        step(world, { forward: 0, strafe, jump: false, yaw, timing: false }, 1 / 60);
      }
      cam.x = camNow.x;
      cam.y = camNow.y;
      cam.z = camNow.z;
      camera.position.set(cam.x, cam.y, cam.z);
      camera.lookAt(lookNow);
      camera.updateMatrixWorld(true);
      return snapshot(world);
    },
    resetFeet() {
      const spawn = world.spawn;
      world.player.x = spawn.x;
      world.player.y = spawn.y;
      world.player.z = spawn.z;
      world.player.vx = 0;
      world.player.vy = 0;
      world.player.vz = 0;
      world.player.onGround = true;
      paint();
      return snapshot(world);
    },
    giveGems(count) {
      progress.gems += count;
      saveProgress(progress);
      updateGemButton();
      return progress.gems;
    },
    resetProgress() {
      progress.gems = 0;
      progress.found = [];
      progress.jump = 0;
      progress.run = 0;
      progress.doubleJump = 0;
      progress.dash = 0;
      progress.shield = 0;
      progress.glide = 0;
      saveProgress(progress);
      restart();
      paint();
    },
    shieldHit() {
      const hazard = world.ents.find((ent) => ent.hazard === 'spinner');
      world.player.x = hazard.cx;
      world.player.y = hazard.pivot;
      world.player.z = hazard.cz;
      world.player.vx = 0;
      world.player.vy = 0;
      world.player.vz = 0;
      world.invuln = 0;
      const before = world.deaths;
      step(world, { forward: 0, strafe: 0, jump: false, yaw, timing: false }, 1 / 60);
      paint();
      return { before, deaths: world.deaths, shieldReady: !!world.shieldReady, shieldOwned: !!world.shieldOwned };
    },
    airJump() {
      const p = world.player;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.onGround = true;
      world.coyote = 0.14;
      world.airJumps = world.doubleJump ? 1 : 0;
      const input = { forward: 0, strafe: 0, yaw, timing: false };
      step(world, { ...input, jump: true }, 1 / 60);
      step(world, { ...input, jump: false }, 1 / 60);
      step(world, { ...input, jump: true }, 1 / 60);
      paint();
      return { airJumps: world.airJumps, vy: p.vy, doubleJump: !!world.doubleJump };
    },
    glideFall() {
      const p = world.player;
      p.onGround = false;
      p.groundId = null;
      p.vy = -20;
      world.coyote = 0;
      step(world, { forward: 0, strafe: 0, jump: true, yaw, timing: false }, 1 / 30);
      paint();
      return { vy: p.vy, hasGlide: !!world.hasGlide };
    },
    freezeCam(on) { freezeCam = !!on; },
    cameraInfo() {
      return {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        aspect: camera.aspect,
        yaw,
        px: world.player.x,
        pz: world.player.z,
      };
    },
    setRivals(next) {
      rivalMode = rivalModeName(next);
      localStorage.setItem('bt-rivals', rivalMode);
      world.rivals = createRivals(rivalMode, world);
      applyLang(lang);
      syncRivals();
      return rivalMode;
    },
    frameRivals() {
      holdRivals = true;
      const feet = world.player;
      const spots = [[1.7, -1.55], [1.7, 1.55], [2.5, 0]];
      const list = world.rivals || [];
      for (let i = 0; i < list.length; i++) {
        const rival = list[i];
        const spot = spots[i] || spots[0];
        rival.x = feet.x + spot[0];
        rival.y = feet.y;
        rival.z = feet.z + spot[1];
        rival.vx = 0;
        rival.vy = 0;
        rival.vz = 0;
        rival.onGround = true;
      }
      yaw = 0;
      pitch = 0.42;
      const held = freezeCam;
      freezeCam = false;
      placeCamera(1, true);
      freezeCam = held;
      paint();
      return list.map((rival) => ({ id: rival.id, x: rival.x, z: rival.z }));
    },
    warmupRivals(frames = 150) {
      if (mode !== 'play') setMode('play');
      const count = Math.max(0, frames);
      for (let i = 0; i < count; i++) {
        decideRivals(world, 1 / 60);
        stepRivals(world, 1 / 60);
      }
      paint();
      return (world.rivals || []).map((rival) => ({
        id: rival.id, x: rival.x, y: rival.y, z: rival.z, deaths: rival.deaths, blunders: rival.blunders,
      }));
    },
    simulateRace() {
      if (mode !== 'play') setMode('play');
      let steps = 0;
      for (; steps < 40000; steps++) {
        if (world.won) break;
        decideRivals(world, 1 / 60);
        step(world, { ...bot.plan(world), timing: true }, 1 / 60);
        stepRivals(world, 1 / 60);
      }
      after();
      const rows = raceRows(world);
      return {
        won: world.won,
        deaths: world.deaths,
        steps,
        place: placeWord('en', Math.max(0, rows.findIndex((row) => row.id === 'you'))),
        rows: rows.map((row) => ({ id: row.id, finished: row.finished, time: row.time, x: +row.x.toFixed(2) })),
        blunders: (world.rivals || []).reduce((sum, rival) => sum + rival.blunders, 0),
        rivalDeaths: (world.rivals || []).reduce((sum, rival) => sum + rival.deaths, 0),
      };
    },
    focusGem() {
      const gem = world.ents.find((ent) => ent.kind === 'gem' && !progress.found.includes(ent.id));
      if (!gem) return null;
      world.player.x = gem.x - 2.2;
      world.player.y = gem.y - 0.95;
      world.player.z = 0;
      world.player.vx = world.player.vy = world.player.vz = 0;
      yaw = Math.atan2(gem.z - world.player.z, gem.x - world.player.x);
      setMode('play');
      paint();
      return { x: gem.x, y: gem.y, z: gem.z };
    },
  };
}
installTestHook().then(() => {
  document.body.dataset.ready = '1';
});
