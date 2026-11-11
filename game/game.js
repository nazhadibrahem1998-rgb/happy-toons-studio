// Happy Toons: Toonblade — © 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.
import * as THREE from './vendor/three.module.min.js';

const $ = id => document.getElementById(id);
// Primary input is touch (phones/tablets). Hybrid laptops start in mouse mode and switch per event.
const isTouch = matchMedia('(pointer: coarse)').matches
  || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
let touchUI = isTouch;
if (isTouch) document.body.classList.add('touch');

// ---------- Renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const maxDPR = Math.min(devicePixelRatio || 1, isTouch ? 1.25 : 1.75);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDPR));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1f45);
scene.fog = new THREE.Fog(0x2a1f45, 22, 60);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);

const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a3020, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
sun.position.set(14, 26, 10);
sun.castShadow = true;
let SM = isTouch ? 512 : 1024;
sun.shadow.mapSize.set(SM, SM);
const SHADOW_SPAN = 60; // ortho shadow camera width (left..right)
const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 70;
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9a7bff, 0.8);
rim.position.set(-12, 10, -16);
scene.add(rim);

function resize() {
  const vv = window.visualViewport;
  const w = vv ? vv.width : innerWidth;
  const h = vv ? vv.height : innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
if (window.visualViewport) {
  visualViewport.addEventListener('resize', resize);
  visualViewport.addEventListener('scroll', resize);
}
addEventListener('orientationchange', () => { setTimeout(resize, 60); setTimeout(resize, 280); });
resize();

// ---------- Helpers ----------
const matCache = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts });
  return matCache[key];
}
function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
  if (parent) parent.add(o);
  return o;
}
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ---------- Arena ----------
const ARENA_R = 26;
{
  const g = new THREE.CircleGeometry(ARENA_R + 30, 64);
  const ground = new THREE.Mesh(g, mat(0x5b8a3c, { roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 64), mat(0xc9a877, { roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA_R - 0.6, ARENA_R, 64), mat(0x8a6a4a));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.receiveShadow = true; scene.add(ring);
  // inner decorative circle
  const r2 = new THREE.Mesh(new THREE.RingGeometry(5, 5.5, 48), mat(0xa88658));
  r2.rotation.x = -Math.PI / 2; r2.position.y = 0.025; scene.add(r2);
  // star emblem in centre
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.2 : 2.8, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? starShape.lineTo(x, y) : starShape.moveTo(x, y); }
  const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), mat(0xffcc33, { emissive: 0x553300, roughness: 0.5 }));
  star.rotation.x = -Math.PI / 2; star.position.y = 0.03; star.receiveShadow = true; scene.add(star);
}
// colliders: {x,z,r}
const obstacles = [];
const pillarGeo = new THREE.CylinderGeometry(0.9, 1.1, 7, 10);
const capGeo = new THREE.BoxGeometry(2.6, 0.6, 2.6);
const torches = [];
for (let i = 0; i < 10; i++) {
  const a = i / 10 * Math.PI * 2;
  const x = Math.cos(a) * (ARENA_R - 2), z = Math.sin(a) * (ARENA_R - 2);
  const p = mesh(pillarGeo, mat(0xd8cdb8, { roughness: 0.85 }), x, 3.5, z); scene.add(p);
  mesh(capGeo, mat(0xbfb29a), x, 7.2, z, scene);
  mesh(capGeo, mat(0xbfb29a), x, 0.3, z, scene);
  if (i % 2 === 0) { // broken top variant
    const fl = mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa630 }), x, 7.9, z, scene);
    fl.castShadow = false; torches.push(fl);
  }
  obstacles.push({ x, z, r: 1.3 });
}
const rockGeo = new THREE.DodecahedronGeometry(1, 0);
const rockSpots = [[8, 6, 1.4], [-9, 4, 1.1], [3, -11, 1.6], [-6, -9, 1.0], [13, -4, 1.2], [-14, -3, 1.5], [6, 15, 1.0], [-4, 14, 1.3]];
for (const [x, z, s] of rockSpots) {
  const r = mesh(rockGeo, mat(0x7d7a86, { roughness: 1, flatShading: true }), x, s * 0.55, z);
  r.scale.set(s, s * 0.8, s); r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); scene.add(r);
  obstacles.push({ x, z, r: s * 0.95 });
}
// two warm point lights (cheap)
for (const [x, z] of [[ARENA_R - 2, 0], [-(ARENA_R - 2), 0]]) {
  const l = new THREE.PointLight(0xff9a3c, 30, 22, 2); l.position.set(x, 8, z); scene.add(l);
}
// distant hills / trees ring for depth
{
  const tGeo = new THREE.ConeGeometry(1.6, 5, 7), trunk = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 6);
  const leaf = mat(0x2f6b3a, { flatShading: true }), wood = mat(0x5a3a22);
  const tm = new THREE.InstancedMesh(tGeo, leaf, 60), trm = new THREE.InstancedMesh(trunk, wood, 60);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < 60; i++) {
    const a = rand(0, Math.PI * 2), d = rand(ARENA_R + 4, ARENA_R + 20), k = rand(0.8, 1.6);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    m4.compose(new THREE.Vector3(x, 1.2 * k + 2.5 * k, z), q, s.set(k, k, k)); tm.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, 0.6 * k, z), q, s.set(k, k, k)); trm.setMatrixAt(i, m4);
  }
  tm.castShadow = false; scene.add(tm, trm);
}

// ---------- Particles (pooled) ----------
const PCOUNT = 160;
const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const particles = [];
const pMats = {};
function pMat(c) { return pMats[c] || (pMats[c] = new THREE.MeshBasicMaterial({ color: c })); }
for (let i = 0; i < PCOUNT; i++) {
  const m = new THREE.Mesh(pGeo, pMat(0xffffff));
  m.visible = false; m.castShadow = false; m.receiveShadow = false; scene.add(m);
  particles.push({ m, v: new THREE.Vector3(), life: 0 });
}
let pIdx = 0;
function burst(pos, color, n = 12, speed = 5) {
  for (let i = 0; i < n; i++) {
    const p = particles[pIdx++ % PCOUNT];
    p.m.material = pMat(color); p.m.visible = true; p.m.position.copy(pos);
    p.v.set(rand(-1, 1), rand(0.2, 1.4), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
    p.life = rand(0.35, 0.7); p.m.scale.setScalar(rand(0.7, 1.6));
  }
}
function updateParticles(dt) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.m.visible = false; continue; }
    p.v.y -= 14 * dt; p.m.position.addScaledVector(p.v, dt);
    if (p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.multiplyScalar(0.5); }
    p.m.scale.multiplyScalar(Math.pow(0.97, dt * 60)); p.m.rotation.x += dt * 8;
  }
}
// slash trail arc
const slashMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
const slash = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.5, 24, 1, -Math.PI * 0.45, Math.PI * 0.9), slashMat);
slash.rotation.x = -Math.PI / 2; slash.castShadow = false; slash.receiveShadow = false; scene.add(slash);

// Pooled cartoon arrows (chunky and bright so they read on grass and can be dodged).
const ARROW_N = 16;
const arrowMat = {
  shaft: new THREE.MeshBasicMaterial({ color: 0xf4e2b0 }),
  head: new THREE.MeshBasicMaterial({ color: 0xff9a1f }),
  fletch: new THREE.MeshBasicMaterial({ color: 0xff4455 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.5, depthWrite: false }),
};
const arrowGeo = {
  shaft: new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6),
  head: new THREE.ConeGeometry(0.16, 0.42, 7),
  fletch: new THREE.BoxGeometry(0.36, 0.22, 0.16),
  glow: new THREE.SphereGeometry(0.26, 8, 6),
};
const arrows = [];
function killArrow(a) { a.alive = false; a.g.visible = false; }
for (let i = 0; i < ARROW_N; i++) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(arrowGeo.shaft, arrowMat.shaft); shaft.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(arrowGeo.head, arrowMat.head); head.rotation.x = Math.PI / 2; head.position.z = 0.72;
  const fletch = new THREE.Mesh(arrowGeo.fletch, arrowMat.fletch); fletch.position.z = -0.5;
  const glow = new THREE.Mesh(arrowGeo.glow, arrowMat.glow); glow.position.z = 0.78; glow.scale.setScalar(0.72);
  g.add(shaft, head, fletch, glow); g.scale.setScalar(1.35);
  g.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  g.visible = false; scene.add(g);
  arrows.push({ g, alive: false, x: 0, y: 1.55, z: 0, vx: 0, vz: 0, yaw: 0, life: 0, dmg: 8 });
}
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
function fireArrow(e) {
  let a = null;
  for (let i = 0; i < ARROW_N; i++) if (!arrows[i].alive) { a = arrows[i]; break; }
  if (!a) return;
  const p = e.g.root.position, yaw = e.facing;
  const sx = Math.sin(yaw), sz = Math.cos(yaw);
  a.alive = true;
  a.x = p.x + sx * 0.9; a.z = p.z + sz * 0.9; a.y = 1.55;
  const dx = player.pos.x - a.x, dz = player.pos.z - a.z;
  const dist = Math.hypot(dx, dz) || 1;
  const sp = 7.1;
  a.vx = dx / dist * sp; a.vz = dz / dist * sp;
  a.yaw = Math.atan2(a.vx, a.vz);
  a.life = 2.8; a.dmg = ETYPES.archer.dmg;
  a.g.visible = true; a.g.position.set(a.x, a.y, a.z); a.g.rotation.set(0, a.yaw, 0);
  burst(tmpA.set(a.x, a.y, a.z), 0xffe08a, 5, 3);
  sfx.shoot();
}
function updateArrows(dt) {
  const hitR2 = 0.62 * 0.62;
  const edge = (ARENA_R + 1) * (ARENA_R + 1);
  for (let i = 0; i < ARROW_N; i++) {
    const a = arrows[i];
    if (!a.alive) continue;
    a.life -= dt; a.x += a.vx * dt; a.z += a.vz * dt;
    a.g.position.set(a.x, a.y + Math.sin((2.8 - a.life) * 16) * 0.05, a.z);
    a.g.rotation.y = a.yaw;
    if (a.life <= 0 || a.x * a.x + a.z * a.z > edge) { killArrow(a); continue; }
    let hitObs = false;
    for (let j = 0; j < obstacles.length; j++) {
      const o = obstacles[j];
      const dx = a.x - o.x, dz = a.z - o.z, rr = o.r + 0.15;
      if (dx * dx + dz * dz < rr * rr) { hitObs = true; break; }
    }
    if (hitObs) { burst(tmpA.set(a.x, a.y, a.z), 0xf4e2b0, 6, 3); killArrow(a); continue; }
    const tipX = a.x + Math.sin(a.yaw) * 1.15, tipZ = a.z + Math.cos(a.yaw) * 1.15;
    const pdx = player.pos.x - tipX, pdz = player.pos.z - tipZ;
    if (pdx * pdx + pdz * pdz < hitR2) {
      tmpA.set(tipX - Math.sin(a.yaw) * 2, 1.55, tipZ - Math.cos(a.yaw) * 2);
      const hit = damagePlayer(a.dmg, tmpA);
      burst(tmpB.set(tipX, a.y, tipZ), hit === 'blocked' ? 0xfff0a0 : 0xffcc66, 8, 4);
      killArrow(a);
    }
  }
}

// Ground circles for slams and lobs. Each one keeps its own material so overlapping telegraphs stay readable.
const WARN_N = 8;
const warnFillGeo = new THREE.CircleGeometry(1, 40);
const warnRingGeo = new THREE.RingGeometry(0.78, 1, 40);
const warns = [];
for (let i = 0; i < WARN_N; i++) {
  const g = new THREE.Group();
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  const fill = new THREE.Mesh(warnFillGeo, fillMat);
  const ring = new THREE.Mesh(warnRingGeo, ringMat);
  fill.rotation.x = ring.rotation.x = -Math.PI / 2;
  fill.position.y = 0.05; ring.position.y = 0.07;
  fill.castShadow = ring.castShadow = false;
  fill.receiveShadow = ring.receiveShadow = false;
  g.add(fill, ring); g.visible = false; scene.add(g);
  warns.push({ g, fillMat, ringMat, alive: false, life: 0, max: 1, x: 0, z: 0, radius: 2.6 });
}
function acquireWarn() {
  for (let i = 0; i < WARN_N; i++) if (!warns[i].alive) return warns[i];
  return null;
}
function releaseWarn(e) {
  if (!e || !e.warn) return;
  e.warn.alive = false; e.warn.g.visible = false; e.warn = null;
}
function beginWarn(e, x, z, radius, maxT) {
  releaseWarn(e);
  e.slamX = x; e.slamZ = z;
  const w = acquireWarn();
  if (!w) return;
  w.alive = true; w.g.visible = true; w.life = 0; w.max = maxT;
  w.x = x; w.z = z; w.radius = radius;
  w.g.position.set(x, 0, z); w.g.scale.setScalar(radius);
  e.warn = w; e.slamX = x; e.slamZ = z;
}
function updateWarns(dt) {
  for (let i = 0; i < WARN_N; i++) {
    const w = warns[i];
    if (!w.alive) continue;
    w.life += dt;
    const u = w.max > 0 ? Math.min(1, w.life / w.max) : 1;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(w.life * (10 + u * 24)) * (0.035 + u * 0.05);
    w.g.scale.setScalar(w.radius * pulse);
    w.fillMat.opacity = 0.2 + u * 0.42;
    w.ringMat.color.setHex(u > 0.72 ? 0xff6a3c : 0xfff3b0);
  }
}

// Straight-line telegraphs for dashes and the chief's charge. The group's origin is the start of the lane.
const LANE_N = 4;
const laneGeo = new THREE.PlaneGeometry(1, 1);
const lanes = [];
for (let i = 0; i < LANE_N; i++) {
  const g = new THREE.Group();
  const matL = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  const meshL = new THREE.Mesh(laneGeo, matL);
  meshL.rotation.x = -Math.PI / 2;
  meshL.position.y = 0.06;
  meshL.position.z = 0.5; // extends from the owner toward +Z (their facing)
  meshL.castShadow = meshL.receiveShadow = false;
  g.add(meshL); g.visible = false; scene.add(g);
  lanes.push({ g, mat: matL, alive: false, life: 0, length: 6, width: 1.6 });
}
function acquireLane() {
  for (let i = 0; i < LANE_N; i++) if (!lanes[i].alive) return lanes[i];
  return null;
}
function releaseLane(e) {
  if (!e || !e.lane) return;
  e.lane.alive = false; e.lane.g.visible = false; e.lane = null;
}
function beginLane(e, length, width) {
  releaseLane(e);
  const lane = acquireLane();
  if (!lane) return;
  lane.alive = true; lane.g.visible = true; lane.life = 0;
  lane.length = length; lane.width = width;
  e.lane = lane;
}
function placeLane(e) {
  const lane = e.lane; if (!lane) return;
  const p = e.g.root.position;
  lane.g.position.set(p.x, 0, p.z);
  lane.g.rotation.y = e.facing;
}
function updateLanes(dt) {
  for (let i = 0; i < LANE_N; i++) {
    const lane = lanes[i];
    if (!lane.alive) continue;
    lane.life += dt;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(lane.life * 14) * 0.05;
    lane.g.scale.set(lane.width * pulse, 1, lane.length);
    lane.mat.opacity = 0.26 + Math.min(0.4, lane.life * 0.35);
    lane.mat.color.setHex(lane.life > 0.55 ? 0xff6a3c : 0xffc24a);
  }
}

// Lobbed rocks for the thrower. The landing circle stays up until the rock arrives.
const ROCK_N = 8;
const lobGeo = new THREE.DodecahedronGeometry(0.22, 0);
const lobMat = new THREE.MeshStandardMaterial({ color: 0xb7aa9a, roughness: 0.92, flatShading: true });
const rocks = [];
for (let i = 0; i < ROCK_N; i++) {
  const m = new THREE.Mesh(lobGeo, lobMat);
  m.castShadow = false; m.receiveShadow = false; m.visible = false; scene.add(m);
  rocks.push({ m, alive: false, x0: 0, z0: 0, x1: 0, z1: 0, t: 0, dur: 0.68, dmg: 9, warn: null });
}
function detachWarn(e) {
  const w = e && e.warn;
  if (e) e.warn = null;
  return w || null;
}
function dropWarn(w) {
  if (!w) return;
  w.alive = false; w.g.visible = false;
}
function launchRock(e) {
  let r = null;
  for (let i = 0; i < ROCK_N; i++) if (!rocks[i].alive) { r = rocks[i]; break; }
  if (!r) { dropWarn(detachWarn(e)); return; }
  const p = e.g.root.position;
  r.alive = true; r.t = 0; r.dur = 0.68; r.dmg = ETYPES.thrower.dmg;
  r.x0 = p.x; r.z0 = p.z; r.x1 = e.aimX; r.z1 = e.aimZ;
  r.warn = detachWarn(e);
  r.m.visible = true;
  r.m.position.set(r.x0, 1.1, r.z0);
  sfx.lob();
}
function killRock(r) {
  dropWarn(r.warn); r.warn = null; r.alive = false; r.m.visible = false;
}
function updateRocks(dt) {
  for (let i = 0; i < ROCK_N; i++) {
    const r = rocks[i];
    if (!r.alive) continue;
    r.t += dt;
    const u = Math.min(1, r.t / r.dur);
    const x = r.x0 + (r.x1 - r.x0) * u;
    const z = r.z0 + (r.z1 - r.z0) * u;
    const y = 0.4 + Math.sin(u * Math.PI) * 2.35;
    r.m.position.set(x, y, z);
    r.m.rotation.x += dt * 6; r.m.rotation.y += dt * 4;
    if (u < 1) continue;
    burst(tmpA.set(r.x1, 0.35, r.z1), 0xe4d8c4, 8, 4);
    const dx = player.pos.x - r.x1, dz = player.pos.z - r.z1;
    if (dx * dx + dz * dz < 1.45 * 1.45) damagePlayer(r.dmg, tmpA.set(r.x1, 0.45, r.z1));
    sfx.lobLand();
    killRock(r);
  }
}

// ---------- Audio ----------
let actx = null, master = null;
let muted = false; try { muted = localStorage.getItem('toonblade_muted') === '1'; } catch (_) {}
let audioGen = 0;
function audio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = muted ? 0 : 0.32;
      const comp = actx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 10;
      comp.ratio.value = 8;
      comp.attack.value = 0.004;
      comp.release.value = 0.16;
      master.connect(comp);
      comp.connect(actx.destination);
    } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') {
    const pending = actx.resume();
    if (pending && pending.catch) pending.catch(() => {});
  }
  return actx;
}
function later(ms, fn) {
  const gen = audioGen;
  setTimeout(() => { if (gen === audioGen) fn(); }, ms);
}
function setMuted(m) {
  muted = m;
  try { localStorage.setItem('toonblade_muted', m ? '1' : '0'); } catch (_) {}
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.42, actx.currentTime, 0.02);
  updateMuteUI();
}
let noiseBuf = null;
function noise(dur, f0, f1, vol = 0.3, type = 'bandpass') {
  const a = actx; if (!a || muted) return;
  try {
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(); s.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = type; f.Q.value = 1.2;
    f.frequency.setValueAtTime(Math.max(20, f0), a.currentTime); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + dur);
    const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    s.connect(f).connect(g).connect(master); s.start(); s.stop(a.currentTime + dur);
  } catch (_) {}
}
function tone(dur, f0, f1, vol = 0.2, type = 'square') {
  const a = actx; if (!a || muted) return;
  try {
    const o = a.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + dur);
    const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g).connect(master); o.start(); o.stop(a.currentTime + dur);
  } catch (_) {}
}
const sfx = {
  swing: () => noise(0.18, 600, 3000, 0.22),
  hit: () => { noise(0.12, 900, 200, 0.32, 'lowpass'); tone(0.12, 180, 60, 0.18, 'triangle'); },
  clang: () => { tone(0.25, 1400, 1200, 0.1, 'square'); tone(0.3, 2100, 1900, 0.06, 'sine'); },
  hurt: () => tone(0.25, 300, 90, 0.16, 'sawtooth'),
  dodge: () => noise(0.22, 300, 1200, 0.14),
  heavy: () => { noise(0.24, 360, 70, 0.28, 'lowpass'); tone(0.2, 108, 40, 0.16, 'triangle'); tone(0.14, 68, 34, 0.12, 'sine'); },
  dry: () => tone(0.09, 168, 92, 0.07, 'square'),
  die: () => tone(0.4, 400, 50, 0.16, 'square'),
  wave: () => { tone(0.15, 440, 440, 0.1, 'square'); later(150, () => tone(0.3, 660, 660, 0.1, 'square')); },
  heal: () => { tone(0.12, 600, 900, 0.1, 'sine'); later(100, () => tone(0.2, 900, 1300, 0.1, 'sine')); },
  shoot: () => noise(0.14, 700, 2400, 0.13),
  lob: () => noise(0.12, 480, 180, 0.13, 'lowpass'),
  lobLand: () => noise(0.14, 220, 70, 0.16, 'lowpass'),
  dash: () => noise(0.16, 240, 1100, 0.13),
  pick: () => { tone(0.08, 520, 780, 0.09, 'square'); later(80, () => tone(0.12, 780, 1040, 0.08, 'square')); },
  slam: () => { noise(0.28, 180, 45, 0.26, 'lowpass'); tone(0.22, 110, 40, 0.12, 'sine'); },
  summon: () => { tone(0.18, 330, 620, 0.1, 'triangle'); later(120, () => tone(0.22, 520, 880, 0.08, 'triangle')); },
  boss: () => { tone(0.18, 196, 196, 0.11, 'square'); later(160, () => tone(0.18, 247, 247, 0.11, 'square')); later(320, () => tone(0.4, 330, 330, 0.12, 'square')); },
  victory: () => { tone(0.12, 523, 523, 0.1, 'square'); later(130, () => tone(0.12, 659, 659, 0.1, 'square')); later(260, () => tone(0.32, 784, 784, 0.12, 'square')); },
};

// ---------- Characters ----------
function buildWarrior() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body); // bobbing group
  const steel = mat(0xb8c3d6, { metalness: 0.75, roughness: 0.3 });
  const darkSteel = mat(0x5e6a80, { metalness: 0.7, roughness: 0.35 });
  const gold = mat(0xf2c04a, { metalness: 0.9, roughness: 0.25 });
  const cloth = mat(0x2f4fb8, { roughness: 0.8 });
  const capeM = mat(0xc8243a, { roughness: 0.8, side: THREE.DoubleSide });
  const skin = mat(0xf0c19a);
  const leather = mat(0x5a3820);
  // legs
  const legs = [];
  for (const sx of [-0.22, 0.22]) {
    const hip = new THREE.Group(); hip.position.set(sx, 0.95, 0); body.add(hip);
    mesh(new THREE.CapsuleGeometry(0.16, 0.45, 4, 8), cloth, 0, -0.3, 0, hip);
    mesh(new THREE.BoxGeometry(0.3, 0.32, 0.42), darkSteel, 0, -0.78, 0.05, hip); // boot
    mesh(new THREE.SphereGeometry(0.15, 8, 6), steel, 0, -0.42, 0.1, hip); // knee
    legs.push(hip);
  }
  // torso
  const torso = new THREE.Group(); torso.position.y = 1.0; body.add(torso);
  mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.75, 10), steel, 0, 0.42, 0, torso);
  mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 16), gold, 0, 0.78, 0, torso).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.37, 0.06, 6, 16), leather, 0, 0.05, 0, torso).rotation.x = Math.PI / 2; // belt
  mesh(new THREE.BoxGeometry(0.16, 0.14, 0.06), gold, 0, 0.05, 0.37, torso); // buckle
  // gold chest trim (V)
  const v1 = mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), gold, -0.12, 0.45, 0.37, torso); v1.rotation.z = 0.4;
  const v2 = mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), gold, 0.12, 0.45, 0.37, torso); v2.rotation.z = -0.4;
  // skirt tassets
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const t = mesh(new THREE.BoxGeometry(0.22, 0.3, 0.05), darkSteel, Math.sin(a) * 0.36, -0.12, Math.cos(a) * 0.36, torso); t.rotation.y = a; }
  // pauldrons
  for (const sx of [-0.5, 0.5]) { mesh(new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel, sx, 0.78, 0, torso); mesh(new THREE.TorusGeometry(0.21, 0.03, 4, 14), gold, sx, 0.78, 0, torso).rotation.x = Math.PI / 2; }
  // head + helmet
  const head = new THREE.Group(); head.position.y = 0.98; torso.add(head);
  mesh(new THREE.SphereGeometry(0.26, 12, 10), skin, 0, 0.2, 0.02, head);
  mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), steel, 0, 0.22, 0, head);
  mesh(new THREE.TorusGeometry(0.29, 0.035, 6, 18), gold, 0, 0.2, 0, head).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.05, 0.3, 0.12), gold, 0, 0.38, 0.12, head); // nose guard / crest base
  const crest = mesh(new THREE.BoxGeometry(0.06, 0.18, 0.55), mat(0xd8283c), 0, 0.55, -0.05, head); crest.rotation.x = -0.15;
  for (const sx of [-0.06, 0.06]) mesh(new THREE.SphereGeometry(0.035, 6, 6), mat(0x222233), 0.1 * Math.sign(sx), 0.2, 0.25, head); // eyes
  // cape
  const capeGeo = new THREE.PlaneGeometry(0.85, 1.25, 1, 4); capeGeo.translate(0, -0.62, 0);
  const cape = mesh(capeGeo, capeM, 0, 0.78, -0.36, torso); cape.castShadow = true;
  // arms
  function arm(sx) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.52, 0.68, 0); torso.add(sh);
    mesh(new THREE.CapsuleGeometry(0.11, 0.35, 4, 8), cloth, 0, -0.25, 0, sh);
    const fore = new THREE.Group(); fore.position.y = -0.5; sh.add(fore);
    mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.35, 8), steel, 0, -0.15, 0, fore);
    mesh(new THREE.TorusGeometry(0.12, 0.03, 4, 12), gold, 0, -0.02, 0, fore).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.11, 8, 6), leather, 0, -0.38, 0, fore);
    return { sh, fore };
  }
  const R = arm(-1), L = arm(1); // character faces +z; right hand is -x
  // sword in right hand
  const sword = new THREE.Group(); sword.position.set(0, -0.38, 0); R.fore.add(sword);
  sword.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6), leather, 0, 0, 0, sword);
  mesh(new THREE.BoxGeometry(0.42, 0.06, 0.1), gold, 0, 0.16, 0, sword);
  // Blade grows from the guard. scale.y on this group lengthens it without moving the hilt.
  const bladeRoot = new THREE.Group(); bladeRoot.position.y = 0.2; sword.add(bladeRoot);
  const blade = mesh(new THREE.BoxGeometry(0.1, 1.15, 0.03), mat(0xe8eef8, { metalness: 0.95, roughness: 0.15, emissive: 0x223344 }), 0, 0.575, 0, bladeRoot);
  const bladeTip = mesh(new THREE.ConeGeometry(0.07, 0.18, 4), mat(0xe8eef8, { metalness: 0.95, roughness: 0.15 }), 0, 1.24, 0, bladeRoot);
  bladeTip.rotation.y = Math.PI / 4;
  mesh(new THREE.SphereGeometry(0.06, 6, 6), gold, 0, -0.17, 0, sword);
  return { root, body, legs, torso, head, cape, R, L, sword, blade, bladeRoot };
}

const HERO_NAME = 'Lang';
function makeHeroNameTag(text) {
  const w = 256, h = 80;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = '800 42px system-ui, "Segoe UI", sans-serif';
  const tw = g.measureText(text).width;
  const bw = Math.min(w - 8, tw + 56), bh = 56;
  const x = (w - bw) / 2, y = (h - bh) / 2, r = bh / 2;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + bw, y, x + bw, y + bh, r);
  g.arcTo(x + bw, y + bh, x, y + bh, r);
  g.arcTo(x, y + bh, x, y, r);
  g.arcTo(x, y, x + bw, y, r);
  g.closePath();
  g.fillStyle = 'rgba(13,10,26,0.75)';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#e8c25a';
  g.stroke();
  g.fillStyle = '#ffd45e';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.05, 1.05 * (h / w), 1);
  sprite.center.set(0.5, 0);
  sprite.position.set(0, 2.82, 0);
  sprite.renderOrder = 5;
  sprite.visible = false;
  return sprite;
}

function buildEnemy(type) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  let parts = {};
  if (type === 'goblin' || type === 'brute' || type === 'archer' || type === 'dasher' || type === 'thrower' || type === 'chief') {
    const archer = type === 'archer';
    const dasher = type === 'dasher';
    const thrower = type === 'thrower';
    const chief = type === 'chief';
    const skinC = type === 'brute' ? 0x7a5aa8 : archer ? 0x2f9d62 : dasher ? 0xf08a3a : thrower ? 0x3d8fd4 : chief ? 0x3f9a45 : 0x6cbf3a;
    const skin = mat(skinC, { roughness: 0.7 });
    const rag = mat(type === 'brute' ? 0x3a2a20 : archer ? 0x8a4e2c : dasher ? 0x6a2348 : thrower ? 0x4a3568 : chief ? 0x8a4e14 : 0x7a4a2a);
    const legs = [];
    for (const sx of [-0.18, 0.18]) { const hip = new THREE.Group(); hip.position.set(sx, 0.55, 0); body.add(hip); mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 6), skin, 0, -0.25, 0, hip); legs.push(hip); }
    mesh(new THREE.SphereGeometry(0.42, 10, 8), rag, 0, 0.85, 0, body).scale.set(1, 1.05, 0.85);
    const head = new THREE.Group(); head.position.y = 1.45; body.add(head);
    mesh(new THREE.SphereGeometry(0.34, 12, 10), skin, 0, 0, 0, head);
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.1, 0.45, 5), skin, sx * 0.38, 0.05, 0, head); ear.rotation.z = -sx * 1.3; }
    const eyeM = mat(archer ? 0x9af6ff : chief ? 0xffe14a : dasher ? 0xfff0c0 : 0xffee33, { emissive: archer ? 0x22dddd : chief ? 0xffb000 : dasher ? 0xff7700 : 0xffaa00 }).clone();
    for (const sx of [-0.12, 0.12]) mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeM, sx, 0.05, 0.29, head);
    mesh(new THREE.ConeGeometry(0.06, 0.18, 5), skin, 0, -0.05, 0.36, head).rotation.x = Math.PI / 2;
    let nock = null, bow = null;
    const arm = new THREE.Group(); arm.position.set(-0.45, 1.05, 0); body.add(arm);
    mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 6), skin, 0, -0.25, 0, arm);
    if (archer) {
      // feathered cap + quiver so the archer reads at a glance
      mesh(new THREE.SphereGeometry(0.36, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(0x6b3a1f), 0, 0.1, -0.02, head);
      const feather = mesh(new THREE.ConeGeometry(0.055, 0.26, 5), mat(0xd8283c), 0.1, 0.32, -0.06, head);
      feather.rotation.z = -0.5;
      const quiver = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.42, 6), mat(0x5a3820), 0.12, 1.05, -0.34, body);
      quiver.rotation.x = 0.35; quiver.rotation.z = -0.15;
      for (let i = 0; i < 3; i++) {
        const ax = (i - 1) * 0.05;
        mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 4), mat(0xf0e2c0), ax + 0.12, 1.28, -0.4, body).rotation.x = 0.35;
        mesh(new THREE.ConeGeometry(0.028, 0.08, 4), mat(0xff9a1f), ax + 0.12, 1.44, -0.46, body);
      }
      // Chunky D-shaped bow on the body (stays face-on; the arm pose sells the draw).
      bow = new THREE.Group(); bow.position.set(-0.5, 1.12, 0.34); body.add(bow);
      const wood = mat(0x8a5528, { roughness: 0.62 });
      const limbPts = [[0.06, 0.5, 0.7], [-0.1, 0.28, 0.35], [-0.18, 0, 0], [-0.1, -0.28, -0.35], [0.06, -0.5, -0.7]];
      for (let i = 0; i < limbPts.length; i++) {
        const s = mesh(new THREE.BoxGeometry(0.1, 0.28, 0.1), wood, limbPts[i][0], limbPts[i][1], 0, bow);
        s.rotation.z = limbPts[i][2];
      }
      mesh(new THREE.BoxGeometry(0.035, 1.02, 0.035), mat(0xfff6e8), 0.12, 0, 0.03, bow);
      const tipM = mat(0xf2c04a, { emissive: 0x664400 });
      mesh(new THREE.SphereGeometry(0.07, 6, 6), tipM, 0.08, 0.52, 0, bow);
      mesh(new THREE.SphereGeometry(0.07, 6, 6), tipM, 0.08, -0.52, 0, bow);
      nock = new THREE.Group(); nock.position.set(-0.02, 1.12, 0.72); body.add(nock); nock.visible = false;
      const nShaft = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 5), arrowMat.shaft, 0, 0, 0, nock);
      nShaft.rotation.x = Math.PI / 2;
      const nHead = mesh(new THREE.ConeGeometry(0.09, 0.22, 6), arrowMat.head, 0, 0, 0.42, nock);
      nHead.rotation.x = Math.PI / 2;
      mesh(new THREE.BoxGeometry(0.2, 0.12, 0.1), arrowMat.fletch, 0, 0, -0.32, nock);
    } else if (thrower) {
      mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0x6b4a32), 0.08, 0.95, -0.38, body);
      mesh(new THREE.DodecahedronGeometry(0.16, 0), mat(0xb7aa9a, { flatShading: true }), 0, -0.48, 0.16, arm);
      mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 10), mat(0xc9842a), 0.08, 0.95, -0.38, body).rotation.x = Math.PI / 2;
    } else if (dasher) {
      const fin = mesh(new THREE.ConeGeometry(0.07, 0.4, 4), mat(0xffe08a, { emissive: 0x664400 }), 0, 0.34, -0.02, head);
      fin.rotation.x = 0.55;
      const scarf = mesh(new THREE.PlaneGeometry(0.26, 0.42), mat(0xd8283c, { side: THREE.DoubleSide }), 0, 1.12, -0.4, body);
      scarf.rotation.x = 0.25;
      const blade = new THREE.Group(); blade.position.y = -0.48; blade.rotation.x = Math.PI / 2; arm.add(blade);
      mesh(new THREE.BoxGeometry(0.05, 0.55, 0.02), mat(0xe8eef8, { metalness: 0.8, roughness: 0.25 }), 0, 0.28, 0, blade);
      mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), mat(0xf2c04a), 0, 0.02, 0, blade);
    } else {
      const club = new THREE.Group(); club.position.y = -0.5; club.rotation.x = Math.PI / 2; arm.add(club);
      const clubLen = chief ? 1.15 : 0.8;
      const clubRad = chief ? 0.2 : 0.13;
      mesh(new THREE.CylinderGeometry(chief ? 0.07 : 0.06, clubRad, clubLen, 6), mat(chief ? 0x5a3418 : 0x6b4426, { flatShading: true }), 0, clubLen * 0.42, 0, club);
      if (chief) mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0xf2c04a, { metalness: 0.7, roughness: 0.3, emissive: 0x664400 }), 0, -0.02, 0, club);
    }
    if (chief) {
      const gold = mat(0xf2c04a, { metalness: 0.8, roughness: 0.3, emissive: 0x664400 });
      for (const sx of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.07, 0.34, 5), gold, sx * 0.16, 0.28, 0, head);
        horn.rotation.z = -sx * 0.55;
      }
      const band = mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 14), gold, 0, 0.08, 0, head);
      band.rotation.x = Math.PI / 2;
      mesh(new THREE.SphereGeometry(0.16, 8, 6), gold, -0.48, 1.15, 0, body);
      mesh(new THREE.SphereGeometry(0.16, 8, 6), gold, 0.48, 1.15, 0, body);
    }
    const arm2 = new THREE.Group(); arm2.position.set(0.45, 1.05, 0); body.add(arm2);
    mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 6), skin, 0, -0.25, 0, arm2);
    parts = { legs, head, arm, arm2, eyeM, nock, bow };
    if (type === 'brute') root.scale.setScalar(1.7);
  } else { // skeleton or skeleton king
    const king = type === 'king';
    const bone = mat(0xece4cf, { roughness: 0.55 });
    const gold = mat(0xf2c04a, { metalness: 0.85, roughness: 0.28, emissive: 0x6a4a10 });
    const legs = [];
    for (const sx of [-0.15, 0.15]) { const hip = new THREE.Group(); hip.position.set(sx, 0.85, 0); body.add(hip); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5), bone, 0, -0.4, 0, hip); mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), bone, 0, -0.82, 0.04, hip); legs.push(hip); }
    mesh(new THREE.BoxGeometry(0.36, 0.12, 0.2), bone, 0, 0.88, 0, body);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), bone, 0, 1.2, 0, body);
    for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.2 - i * 0.02, 0.025, 4, 10, Math.PI * 1.6), bone, 0, 1.05 + i * 0.12, 0, body).rotation.set(Math.PI / 2, 0, Math.PI * 0.7);
    const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
    mesh(new THREE.SphereGeometry(0.24, 10, 8), bone, 0, 0, 0, head);
    mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), bone, 0, -0.17, 0.04, head);
    const eyeM = mat(king ? 0xffe14a : 0xff3355, { emissive: king ? 0xffb000 : 0xff0022 }).clone();
    for (const sx of [-0.09, 0.09]) mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeM, sx, 0.02, 0.2, head);
    const arm = new THREE.Group(); arm.position.set(-0.3, 1.45, 0); body.add(arm);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), bone, 0, -0.3, 0, arm);
    const sw = new THREE.Group(); sw.position.y = -0.6; sw.rotation.x = Math.PI / 2; arm.add(sw);
    mesh(new THREE.BoxGeometry(0.07, 0.85, 0.02), mat(0x8890a0, { metalness: 0.6, roughness: 0.5 }), 0, 0.45, 0, sw);
    mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), mat(king ? 0xf2c04a : 0x4a3a2a, king ? { metalness: 0.8, roughness: 0.3, emissive: 0x664400 } : {}), 0, 0.03, 0, sw);
    const arm2 = new THREE.Group(); arm2.position.set(0.3, 1.45, 0); body.add(arm2);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), bone, 0, -0.3, 0, arm2);
    let cape = null;
    if (king) {
      sw.scale.setScalar(1.35);
      mesh(new THREE.SphereGeometry(0.06, 6, 6), gold, 0, -0.08, 0, sw);
      const crown = new THREE.Group(); crown.position.y = 0.2; head.add(crown);
      const band = mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 14), gold, 0, 0, 0, crown);
      band.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        mesh(new THREE.ConeGeometry(0.055, i === 0 ? 0.42 : 0.28, 5), gold, Math.sin(a) * 0.18, 0.16, Math.cos(a) * 0.18, crown);
      }
      mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x44ddff, { emissive: 0x2288aa, roughness: 0.3 }), 0, 0.1, 0.2, crown);
      mesh(new THREE.SphereGeometry(0.16, 8, 6), gold, -0.42, 1.52, 0, body);
      mesh(new THREE.SphereGeometry(0.16, 8, 6), gold, 0.42, 1.52, 0, body);
      const capeGeo = new THREE.PlaneGeometry(1.05, 1.35, 1, 3); capeGeo.translate(0, -0.62, 0);
      cape = mesh(capeGeo, mat(0x7a2ea8, { roughness: 0.75, side: THREE.DoubleSide }), 0, 1.55, -0.22, body);
    }
    parts = { legs, head, arm, arm2, eyeM, cape };
  }
  // health bar (the king uses the big screen bar instead)
  const hb = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false, transparent: true, opacity: 0.8 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), new THREE.MeshBasicMaterial({ color: type === 'king' ? 0xc86bff : 0xff3344, depthTest: false }));
  fg.geometry.translate(0.5, 0, 0); fg.position.x = -0.5; fg.position.z = 0.001;
  bg.renderOrder = fg.renderOrder = 10;
  hb.add(bg, fg);
  hb.position.y = type === 'king' ? 2.65 : type === 'chief' ? 2.55 : type === 'skeleton' ? 2.25 : type === 'thrower' ? 2.15 : type === 'dasher' ? 1.95 : 2.05;
  hb.visible = false;
  root.add(hb);
  return { root, body, ...parts, hb, hbFill: fg };
}

// ---------- Game state ----------
const W = buildWarrior();
const heroTag = makeHeroNameTag(HERO_NAME);
W.root.add(heroTag);
scene.add(W.root);

const player = {
  pos: W.root.position, facing: 0, vel: new THREE.Vector3(),
  hp: 100, maxHp: 100, st: 100,
  attackT: -1, combo: 0, comboWindow: 0, hitSet: new Set(),
  heavy: false, swingSide: -1, heavyVoiced: false,
  dodgeT: -1, dodgeDir: new THREE.Vector3(), dodgeCd: 0, rollSide: -1,
  hurtT: 0, walkPhase: 0, dead: false, deadT: 0,
};
const ATTACK_DUR = 0.42;
const HEAVY_DUR = 0.78;
const HEAVY_COST = 36;
const ROLL_COST = 14;
const ROLL_TIME = 0.42;
const ROLL_IFRAME = 0.34;
const enemies = [];
const pickups = [];
function bootBest() {
  try {
    if (window.HappyScores) return window.HappyScores.getBest('toonblade');
    return Math.max(0, Math.floor(+(localStorage.getItem('toonblade_best') || 0)) || 0);
  } catch (e) { return 0; }
}
let state = 'menu', score = 0, wave = 0, waveTimer = 0, toSpawn = 0, spawnCd = 0, best = bootBest();
let archersThisWave = 0, dashersThisWave = 0, throwersThisWave = 0, brutesThisWave = 0, skipNextClearBonus = false, debugFreeze = false;
let choosingUpgrade = false, upgradePicks = 0, resumeState = 'play';
const upgrades = { reach: 0, haste: 0, speed: 0, combo: 0, heal: 0, heavy: 0 };
const UPGRADE_DEFS = [
  { id: 'reach', name: 'Long Sword', desc: 'The blade grows longer.', cap: 5, icon: '⚔' },
  { id: 'haste', name: 'Quick Cuts', desc: 'Attack a little faster.', cap: 5, icon: '⚡' },
  { id: 'speed', name: 'Swift Boots', desc: 'Run faster.', cap: 5, icon: '💨' },
  { id: 'heal', name: 'Small Heal', desc: 'Restore 28 health now.', cap: 99, icon: '💚' },
  { id: 'combo', name: 'Combo Rhythm', desc: 'More time to chain swings.', cap: 5, icon: '✨' },
  { id: 'heavy', name: 'Heavy Hands', desc: 'Heavy strikes hit harder.', cap: 4, icon: '✦' },
];
let upgradeOffer = [];
let shake = 0, hitStop = 0, runStartBest = best, newBestShown = false, bestPending = false;
let scoreCombo = 0, scoreComboT = 0;
function bootBestWave() {
  try { return Math.max(0, Math.floor(+(localStorage.getItem('toonblade_best_wave') || 0)) || 0); } catch (e) { return 0; }
}
let bestWave = bootBestWave(), runStartBestWave = bestWave, bestWavePending = false, waveRecordShown = false;
let runT = 0, kills = 0, bestComboReached = 0;
let tutorialReplay = false;
const reduceMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = reduceMotionQuery.matches;
let shakeOff = false;
try { shakeOff = localStorage.getItem('toonblade_shake') === '0'; } catch (_) {}
function shakeAllowed() { return !shakeOff && !reduceMotion; }
function updateShakeUI() {
  const btn = $('pShake');
  if (!btn) return;
  const on = shakeAllowed();
  btn.textContent = on ? 'Shake: On' : 'Shake: Off';
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function setShakeOff(off) {
  shakeOff = !!off;
  if (!shakeAllowed()) shake = 0;
  try { localStorage.setItem('toonblade_shake', shakeOff ? '0' : '1'); } catch (_) {}
  updateShakeUI();
}
reduceMotionQuery.addEventListener('change', () => {
  reduceMotion = reduceMotionQuery.matches;
  if (!shakeAllowed()) shake = 0;
  updateShakeUI();
});
const camYawPitch = { yaw: Math.PI, pitch: 0.42, dist: 8.5, distT: 8.5 };
let savedKey = '';
function saveBest() {
  const key = score + ':' + wave;
  if (key === savedKey) return;
  const HS = window.HappyScores;
  if (HS) {
    const result = HS.record('toonblade', score, wave);
    if (result && result.best > best) best = result.best;
    savedKey = key;
    return;
  }
  try {
    const prev = Math.max(0, Math.floor(+(localStorage.getItem('toonblade_best') || 0)) || 0);
    if (score > prev) localStorage.setItem('toonblade_best', String(Math.floor(score)));
    if (score > best) best = score;
    savedKey = key;
  } catch (_) {}
}
function checkBest() {
  if (score <= best) return;
  best = score; saveBest(); // save the moment a record is beaten
  if (!newBestShown && runStartBest > 0) { newBestShown = true; bestPending = true; }
}

const ETYPES = {
  goblin: { hp: 30, speed: 3.7, dmg: 8, range: 1.5, windup: 0.5, cd: 1.15, score: 10, r: 0.5 },
  skeleton: { hp: 45, speed: 3.3, dmg: 12, range: 1.8, windup: 0.55, cd: 1.3, score: 20, r: 0.45 },
  brute: { hp: 140, speed: 2.6, dmg: 22, range: 2.4, windup: 0.85, cd: 1.8, score: 75, r: 0.9 },
  archer: { hp: 30, speed: 3.45, dmg: 8, range: 8.4, windup: 0.8, cd: 2.45, score: 18, r: 0.48 },
  dasher: { hp: 24, speed: 5.5, dmg: 10, range: 1.35, windup: 0.74, cd: 1.2, score: 16, r: 0.42 },
  thrower: { hp: 32, speed: 3.05, dmg: 9, range: 7.2, windup: 0.82, cd: 2.15, score: 18, r: 0.5 },
  // Wave 5 chief is a readable fight. Later chiefs scale gently, like the king.
  chief: { hp: 200, speed: 2.05, dmg: 12, range: 2.5, windup: 1.1, cd: 1.4, score: 120, r: 1.05 },
  // First king (wave 10) is a long fight, not a stat wall. Later kings scale gently.
  king: { hp: 420, speed: 2.05, dmg: 16, range: 3.4, windup: 1.25, cd: 1.7, score: 250, r: 1.2 },
};
const enemyPool = { goblin: [], skeleton: [], brute: [], archer: [], dasher: [], thrower: [], chief: [], king: [] };
const spawnV = new THREE.Vector3();
function isBossType(type) { return type === 'king' || type === 'chief'; }
function isBossWave(w) { return w > 0 && w % 5 === 0; }
function enemyScale(type) {
  if (type === 'brute') return 1.7;
  if (type === 'king') return 2.2;
  if (type === 'chief') return 2.12;
  if (type === 'dasher') return 0.92;
  if (type === 'thrower') return 1.12;
  return 1;
}
function hpScaleFor(type) {
  if (type === 'king') return 1 + Math.max(0, wave - 10) * 0.055;
  if (type === 'chief') return 1 + Math.max(0, wave - 5) * 0.055;
  // Waves 1–3 stay at base health. Waves 4–8 keep the old curve. After that, health grows slower so fights do not turn into a sponge.
  const early = 1 + Math.max(0, Math.min(wave, 8) - 3) * 0.08;
  if (wave <= 8) return early;
  return early + (wave - 8) * 0.04;
}
function speedScale() { return 1 + Math.min(0.2, Math.max(0, wave - 3) * 0.02); }
function hurtAmount(dmg) {
  if (wave < 8) return dmg;
  return Math.max(1, Math.round(dmg * (1 + (wave - 7) * 0.022)));
}
function heavyDamage() { return 34 + (upgrades.heavy || 0) * 6; }
function bossLabel(type) {
  if (type === 'king') return wave >= 20 ? '★ SKELETON EMPEROR ★' : '★ SKELETON KING ★';
  return wave >= 15 ? '★ GOBLIN WARLORD ★' : '★ GOBLIN CHIEF ★';
}
function bossBanner() {
  if (wave % 10 === 0) return wave > 10 ? 'KING RETURNS' : 'BOSS WAVE';
  return wave > 5 ? 'CHIEF RETURNS' : 'BOSS WAVE';
}
function noteBestWave() {
  if (wave <= bestWave) return;
  bestWave = wave;
  try { localStorage.setItem('toonblade_best_wave', String(bestWave)); } catch (_) {}
  showStartBest();
  // Once per run: the first time you pass the wave you started with. A first run waits until wave 5 so the lesson stays quiet.
  if (!waveRecordShown && wave > runStartBestWave && (runStartBestWave > 0 || wave >= 5)) {
    waveRecordShown = true;
    bestWavePending = true;
  }
}
function spawnEnemy(type) {
  let e = enemyPool[type].pop();
  if (!e) { e = { type, g: buildEnemy(type), warn: null, lane: null }; }
  const T = ETYPES[type];
  const hpScale = hpScaleFor(type);
  if (e.warn) releaseWarn(e);
  releaseLane(e);
  Object.assign(e, {
    hp: T.hp * hpScale, maxHp: T.hp * hpScale, state: 'chase', t: 0,
    cd: isBossType(type) ? 0.9 : type === 'archer' || type === 'thrower' ? rand(0.55, 1.05) : rand(0.3, 1),
    facing: 0, kb: e.kb ? e.kb.set(0, 0, 0) : new THREE.Vector3(), flash: 0, walk: rand(0, 6),
    dead: false, deadT: 0, spawnT: 0, struck: false, atk: '',
    side: Math.random() < 0.5 ? -1 : 1, sideT: 0, pressT: 0,
    summonCd: type === 'king' ? 8 : 0, slamX: 0, slamZ: 0,
    aimX: 0, aimZ: 0, lockFace: null,
  });
  // spawn at arena edge, away from player
  let x, z, tries = 0;
  do { const a = rand(0, Math.PI * 2), d = ARENA_R - 4; x = Math.cos(a) * d; z = Math.sin(a) * d; tries++; }
  while (tries < 10 && Math.hypot(x - player.pos.x, z - player.pos.z) < 10);
  e.g.root.position.set(x, 0, z); e.g.root.rotation.set(0, 0, 0); e.g.body.position.set(0, 0, 0); e.g.body.rotation.set(0, 0, 0);
  e.g.root.visible = true; e.g.hb.visible = false;
  if (e.g.nock) e.g.nock.visible = false;
  scene.add(e.g.root); enemies.push(e);
  burst(spawnV.set(x, 0.5, z), isBossType(type) ? 0xffd45e : 0x9a6bff, isBossType(type) ? 22 : 14, 4);
  if (isBossType(type)) {
    bossRef = e; bossHpUi = -1; bossHideT = 0; shake = Math.max(shake, type === 'king' ? 0.28 : 0.22);
    const name = $('bossName');
    if (name) name.textContent = bossLabel(type);
    if (bossFill) bossFill.style.background = type === 'king'
      ? (wave >= 20 ? 'linear-gradient(90deg,#ffb000,#e86bff)' : 'linear-gradient(90deg,#7a2cff,#e86bff)')
      : (wave >= 15 ? 'linear-gradient(90deg,#ff7a18,#ffe14a)' : 'linear-gradient(90deg,#e2b000,#7dff6a)');
  }
}
function removeEnemy(e) {
  if (e.warn) releaseWarn(e);
  releaseLane(e);
  scene.remove(e.g.root); enemyPool[e.type].push(e); enemies.splice(enemies.indexOf(e), 1);
}

const potionGeo = new THREE.OctahedronGeometry(0.3, 0);
const potionMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xaa0022, roughness: 0.3 });
function dropPotion(pos) { const m = mesh(potionGeo, potionMat, pos.x, 0.6, pos.z, scene); pickups.push({ m, t: 0 }); }

function crowdFor(w) {
  // Waves 1–3 are a short melee lesson. Later crowds grow slowly and stay capped.
  if (w === 1) return 3;
  if (w === 2) return 4;
  if (w === 3) return 5;
  if (w === 4) return 6;
  if (w <= 9) return w + 1; // 6 → 7, 7 → 8, 8 → 9, 9 → 10
  return Math.min(14, 8 + Math.floor((w - 6) / 2));
}
function startWave() {
  wave++;
  archersThisWave = 0; dashersThisWave = 0; throwersThisWave = 0; brutesThisWave = 0;
  noteBestWave();
  if (isBossWave(wave)) {
    toSpawn = 1; spawnCd = 0.45;
    showBanner(bossBanner()); sfx.boss();
  } else {
    toSpawn = crowdFor(wave); spawnCd = wave <= 3 ? 0.85 : 0.5;
    showBanner('WAVE ' + wave); sfx.wave();
  }
}
// Boss every 5th wave: Goblin Chief, and the Skeleton King when the wave is also a multiple of 10.
// Dashers from wave 4, throwers from wave 6, archers from wave 4. Waves 1–3 are goblins, plus a rare skeleton.
function takeSpecial(kind) {
  if (kind === 'dasher') dashersThisWave++;
  else if (kind === 'thrower') throwersThisWave++;
  else if (kind === 'archer') archersThisWave++;
  else if (kind === 'brute') brutesThisWave++;
}
function pickFromCaps(dasherCap, archerCap, throwerCap, bruteCap) {
  const pending = [];
  if (brutesThisWave < bruteCap) pending.push('brute');
  if (dashersThisWave < dasherCap) pending.push('dasher');
  if (throwersThisWave < throwerCap) pending.push('thrower');
  if (archersThisWave < archerCap) pending.push('archer');
  if (pending.length && (toSpawn <= pending.length || Math.random() < 0.45)) {
    const pick = pending[(Math.random() * pending.length) | 0];
    takeSpecial(pick);
    return pick;
  }
  return '';
}
// Waves 6+ change flavour every three waves: rush, volley, brutes, then a mixed skirmish.
function lateMix() {
  const theme = Math.floor((wave - 6) / 3) % 4;
  let picked = '';
  if (theme === 0) picked = pickFromCaps(wave >= 12 ? 3 : 2, 1, 1, 0);
  else if (theme === 1) picked = pickFromCaps(1, wave >= 12 ? 3 : 2, 2, 0);
  else if (theme === 2) picked = pickFromCaps(1, 1, 1, wave >= 18 ? 2 : 1);
  else picked = pickFromCaps(2, 2, 2, wave >= 16 && toSpawn === 1 ? 1 : 0);
  if (picked) return picked;
  if (theme === 3 && Math.random() < 0.55) return 'skeleton';
  if (Math.random() < 0.34) return 'skeleton';
  return 'goblin';
}
function waveMix() {
  if (isBossWave(wave)) return wave % 10 === 0 ? 'king' : 'chief';
  if (wave >= 6) return lateMix();
  const archerCap = wave >= 9 ? 2 : wave >= 4 ? 1 : 0;
  const dasherCap = wave >= 8 ? 2 : wave >= 4 ? 1 : 0;
  const throwerCap = wave >= 9 ? 2 : wave >= 6 ? 1 : 0;
  const pending = [];
  if (dashersThisWave < dasherCap) pending.push('dasher');
  if (throwersThisWave < throwerCap) pending.push('thrower');
  if (archersThisWave < archerCap) pending.push('archer');
  if (pending.length && (toSpawn <= pending.length || Math.random() < 0.36)) {
    const pick = pending[(Math.random() * pending.length) | 0];
    if (pick === 'dasher') dashersThisWave++;
    else if (pick === 'thrower') throwersThisWave++;
    else archersThisWave++;
    return pick;
  }
  if (wave >= 3 && Math.random() < Math.min(0.42, 0.1 + (wave - 2) * 0.06)) return 'skeleton';
  if (wave === 2 && Math.random() < 0.12) return 'skeleton';
  return 'goblin';
}
// Debug hook: ?wave=10 jumps straight to that wave. Ignored on a normal visit.
function readDebugWave() {
  try {
    const q = new URLSearchParams(location.search).get('wave');
    if (!q) return 0;
    const n = parseInt(q, 10);
    if (n >= 1 && n <= 99) return n | 0;
  } catch (_) {}
  return 0;
}

// ---------- Input ----------
const keys = {};
const input = { mx: 0, mz: 0, tx: 0, tz: 0, attack: false, heavy: false, dodge: false, dodgeSide: 0 };
const buf = { attack: 0, heavy: 0, dodge: 0, dodgeSide: 0 };
let attackHeld = false, mouseAttack = false;
let stickId = null, lookId = null;
let pausedAt = 0, lastTouchT = -1e9, hadLock = false;
let stWarnT = 0;
function requestLock() {
  if (document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
}
function clearHeld() {
  for (const k in keys) keys[k] = false;
  input.attack = input.heavy = input.dodge = false;
  input.dodgeSide = 0;
  input.tx = input.tz = 0;
  buf.attack = buf.heavy = buf.dodge = 0;
  buf.dodgeSide = 0;
  attackHeld = false;
  mouseAttack = false;
  stickId = null;
  lookId = null;
  if (knob) knob.style.transform = '';
  document.querySelectorAll('#touch .tb.on').forEach((el) => el.classList.remove('on'));
}
// switch on-screen controls per event (hybrid touch laptops can use both)
function noteTouch() {
  lastTouchT = performance.now();
  if (!touchUI) { touchUI = true; document.body.classList.add('touch'); if (state === 'play') $('touch').classList.remove('hidden'); }
}
function noteMouse() {
  if (touchUI && !isTouch) { touchUI = false; document.body.classList.remove('touch'); $('touch').classList.add('hidden'); }
}
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyM' && !e.repeat) setMuted(!muted);
  if (state === 'play') {
    if (e.code === 'KeyJ') input.attack = true;
    if (e.code === 'KeyK' && !e.repeat) input.heavy = true;
    if (e.code === 'Space') input.dodge = true;
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) togglePause();
  } else if (state === 'upgrade' && !e.repeat) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') chooseUpgrade(0);
    else if (e.code === 'Digit2' || e.code === 'Numpad2') chooseUpgrade(1);
    else if (e.code === 'Digit3' || e.code === 'Numpad3') chooseUpgrade(2);
    else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  } else if (state === 'pause') {
    // ignore the same Esc press that released pointer lock and auto-paused
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat && performance.now() - pausedAt > 300) togglePause();
  } else if ((state === 'menu' || state === 'over') && e.code === 'Enter' && !e.repeat && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) startGame();
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); // no page scroll inside itch.io iframe
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { clearHeld(); if (state === 'play' || state === 'upgrade') togglePause(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
['gesturestart', 'gesturechange', 'gestureend'].forEach(type => {
  document.addEventListener(type, e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
});
// mouse: decided per event; compat mouse events synthesized after a touch are ignored
const isSynthMouse = e => (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) || performance.now() - lastTouchT < 800;
canvas.addEventListener('mousedown', e => {
  if (state !== 'play' || isSynthMouse(e)) return;
  noteMouse(); audio(); requestLock();
  if (e.button === 0) { mouseAttack = true; input.attack = true; }
  if (e.button === 2) input.heavy = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouseAttack = false; });
addEventListener('mousemove', e => {
  if (state !== 'play') return;
  if (document.pointerLockElement === canvas) {
    camYawPitch.yaw -= e.movementX * 0.0032;
    camYawPitch.pitch = clamp(camYawPitch.pitch + e.movementY * 0.0025, 0.1, 1.1);
  }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) hadLock = true;
  else if (hadLock && state === 'play') togglePause(); // Esc released the mouse -> pause
});
addEventListener('wheel', e => { if (state !== 'play') return; camYawPitch.distT = clamp(camYawPitch.distT + Math.sign(e.deltaY) * 0.6, 5, 13); }, { passive: true });

// touch: joystick + look + buttons
const stick = $('stick'), knob = $('knob');
let stickC = { x: 0, y: 0 }, lookLast = { x: 0, y: 0 };
function bindBtn(el, down, up) {
  el.addEventListener('touchstart', e => { e.preventDefault(); noteTouch(); audio(); el.classList.add('on'); down(); }, { passive: false });
  const end = e => { e.preventDefault(); el.classList.remove('on'); up && up(); };
  el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
  // Mouse and pen, for hybrid devices. Real touches are handled above (pointerType touch is ignored).
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    e.preventDefault(); noteTouch(); audio(); el.classList.add('on');
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    down();
  });
  const pend = e => { if (e.pointerType === 'touch') return; el.classList.remove('on'); up && up(); };
  el.addEventListener('pointerup', pend);
  el.addEventListener('pointercancel', pend);
}
bindBtn($('bAttack'), () => { attackHeld = true; input.attack = true; }, () => { attackHeld = false; });
bindBtn($('bHeavy'), () => input.heavy = true);
// Roll on release so a sideways swipe on the button can pick left or right.
{
  const bDodge = $('bDodge');
  let dodgeTouchX = 0, dodgeSwipe = 0;
  bDodge.addEventListener('touchstart', e => {
    e.preventDefault(); noteTouch(); audio(); bDodge.classList.add('on');
    dodgeTouchX = e.changedTouches[0].clientX; dodgeSwipe = 0;
  }, { passive: false });
  bDodge.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      const dx = t.clientX - dodgeTouchX;
      if (Math.abs(dx) > 22) dodgeSwipe = Math.sign(dx);
    }
  }, { passive: true });
  const dodgeEnd = e => {
    e.preventDefault(); bDodge.classList.remove('on');
    input.dodgeSide = dodgeSwipe; input.dodge = true; dodgeSwipe = 0;
  };
  bDodge.addEventListener('touchend', dodgeEnd, { passive: false });
  bDodge.addEventListener('touchcancel', e => { e.preventDefault(); bDodge.classList.remove('on'); dodgeSwipe = 0; }, { passive: false });
  bDodge.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    e.preventDefault(); noteTouch(); audio(); bDodge.classList.add('on');
    dodgeTouchX = e.clientX; dodgeSwipe = 0;
    try { bDodge.setPointerCapture(e.pointerId); } catch (_) {}
  });
  bDodge.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const dx = e.clientX - dodgeTouchX;
    if (Math.abs(dx) > 22) dodgeSwipe = Math.sign(dx);
  });
  bDodge.addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') return;
    dodgeEnd(e);
  });
}
bindBtn($('bPause'), () => { if (state === 'play' || state === 'upgrade') togglePause(); });
bindBtn($('bMute'), () => setMuted(!muted));
stick.addEventListener('touchstart', e => {
  e.preventDefault(); noteTouch(); audio();
  const t = e.changedTouches[0]; stickId = t.identifier;
  const r = stick.getBoundingClientRect(); stickC = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  moveStick(t);
}, { passive: false });
stick.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || stickId !== null) return;
  e.preventDefault(); noteTouch(); audio();
  stickId = e.pointerId;
  const r = stick.getBoundingClientRect(); stickC = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  moveStick(e);
  try { stick.setPointerCapture(e.pointerId); } catch (_) {}
});
stick.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' && e.pointerId === stickId) moveStick(e); });
stick.addEventListener('pointerup', e => {
  if (e.pointerType === 'touch' || e.pointerId !== stickId) return;
  stickId = null; input.tx = input.tz = 0; knob.style.transform = '';
});
stick.addEventListener('pointercancel', e => {
  if (e.pointerId !== stickId) return;
  stickId = null; input.tx = input.tz = 0; knob.style.transform = '';
});
function moveStick(t) {
  let dx = t.clientX - stickC.x, dy = t.clientY - stickC.y; const d = Math.hypot(dx, dy), m = 55;
  if (d > m) { dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  input.tx = dx / m; input.tz = dy / m;
}
addEventListener('touchstart', e => {
  noteTouch();
  if (state !== 'play') return;
  for (const t of e.changedTouches) {
    if (t.target === canvas && t.clientX > innerWidth * 0.35 && lookId === null) { lookId = t.identifier; lookLast.x = t.clientX; lookLast.y = t.clientY; }
  }
}, { passive: true });
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || !touchUI || state !== 'play') return;
  if (e.clientX > innerWidth * 0.35 && lookId === null) { lookId = e.pointerId; lookLast.x = e.clientX; lookLast.y = e.clientY; }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || e.pointerId !== lookId || state !== 'play') return;
  camYawPitch.yaw -= (e.clientX - lookLast.x) * 0.006;
  camYawPitch.pitch = clamp(camYawPitch.pitch + (e.clientY - lookLast.y) * 0.004, 0.1, 1.1);
  lookLast.x = e.clientX; lookLast.y = e.clientY;
});
addEventListener('pointerup', e => { if (e.pointerType !== 'touch' && e.pointerId === lookId) lookId = null; });
addEventListener('pointercancel', e => { if (e.pointerId === lookId) lookId = null; });
addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) moveStick(t);
    else if (t.identifier === lookId && state === 'play') {
      camYawPitch.yaw -= (t.clientX - lookLast.x) * 0.006;
      camYawPitch.pitch = clamp(camYawPitch.pitch + (t.clientY - lookLast.y) * 0.004, 0.1, 1.1);
      lookLast.x = t.clientX; lookLast.y = t.clientY;
    }
  }
  if (state === 'play') e.preventDefault();
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) { stickId = null; input.tx = input.tz = 0; knob.style.transform = ''; }
    if (t.identifier === lookId) lookId = null;
  }
}
addEventListener('touchend', endTouch); addEventListener('touchcancel', endTouch);

// ---------- UI ----------
const hpFill = $('hpFill'), stFill = $('stFill'), elWave = $('wave'), elScore = $('score'), elLeft = $('left'), banner = $('banner'), dmgFlash = $('dmgFlash');
const bossBar = $('bossBar'), bossFill = $('bossFill');
let bannerT = 0, bossRef = null, bossShown = false, bossHpUi = -1, bossHideT = 0;
function showBanner(text) {
  banner.textContent = text;
  const win = text === 'KING DEFEATED!' || text === 'CHIEF DEFEATED!' || text === 'EMPEROR DEFEATED!' || text === 'WARLORD DEFEATED!' || text === 'BEST WAVE!' || text === 'NEW BEST!';
  const boss = text === 'BOSS WAVE' || text === 'CHIEF RETURNS' || text === 'KING RETURNS';
  banner.classList.toggle('boss', boss);
  banner.classList.toggle('win', win);
  banner.classList.add('show');
  bannerT = win ? 2.3 : 1.8;
}
function pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
// update DOM only when a value changes (no per-frame string/array allocations)
let uiHp = -1, uiSt = -1, uiWave = -1, uiScore = -1, uiLeft = -1;
function updateBossUI(dt) {
  if (bossHideT > 0) bossHideT -= dt;
  const show = state === 'play' && bossRef && (!bossRef.dead || bossHideT > 0);
  if (show) {
    if (!bossShown) { bossShown = true; bossBar.classList.remove('hidden'); bossHpUi = -1; }
    const hp = bossRef.dead ? 0 : Math.max(0, bossRef.hp);
    const pct = bossRef.maxHp > 0 ? clamp(hp / bossRef.maxHp * 100, 0, 100) : 0;
    const bucket = pct | 0;
    if (bucket !== bossHpUi) { bossHpUi = bucket; bossFill.style.width = bucket + '%'; }
  } else if (bossShown) {
    bossShown = false; bossHpUi = -1; bossBar.classList.add('hidden');
  }
}
function updateUI(dt) {
  const hp = player.hp | 0, st = player.st | 0;
  let left = toSpawn; for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) left++;
  if (hp !== uiHp) { uiHp = hp; hpFill.style.width = clamp(player.hp / player.maxHp * 100, 0, 100) + '%'; }
  if (st !== uiSt) { uiSt = st; stFill.style.width = clamp(player.st, 0, 100) + '%'; }
  if (wave !== uiWave) { if (uiWave >= 0) pop(elWave); uiWave = wave; elWave.textContent = wave; }
  if (score !== uiScore) { if (uiScore >= 0 && score > uiScore) pop(elScore); uiScore = score; elScore.textContent = score; }
  if (left !== uiLeft) { uiLeft = left; elLeft.textContent = left; }
  paintLiveBest();
  if (state === 'play') saveBest();
  updateBossUI(dt || 0);
}
let liveBestShown = -2;
function paintLiveBest() {
  const live = $('bestLive');
  if (!live || liveBestShown === best) return;
  liveBestShown = best;
  live.textContent = 'Best: ' + (best > 0 ? best : '—');
}
function updateMuteUI() {
  const icon = muted ? '🔇' : '🔊';
  $('bMute').textContent = icon;
  $('pMute').textContent = icon + (muted ? ' Sound: Off' : ' Sound: On');
}
function showStartBest() {
  const el = $('sBest');
  if (el) el.textContent = best > 0 ? String(best) : '—';
  const waveEl = $('sBestWave');
  if (waveEl) waveEl.textContent = bestWave > 0 ? String(bestWave) : '—';
  liveBestShown = -2;
  paintLiveBest();
  if (window.HappyScores) window.HappyScores.paintNote('toonblade', $('dailyNote'));
}
function paintRunNote() {
  const el = $('runNote');
  if (!el) return;
  const s = Math.max(0, Math.floor(runT));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  const combo = bestComboReached >= 2 ? 'x' + bestComboReached : '—';
  const fresh = wave > runStartBestWave && wave > 0;
  el.textContent = 'Wave ' + wave + ' · ' + kills + ' kills · Best combo ' + combo + ' · ' + mm + ':' + ss + (fresh ? ' · New best wave!' : '');
}

function breakScoreCombo() {
  scoreCombo = 0; scoreComboT = 0;
  const row = $('comboRow');
  if (row) row.classList.add('hidden');
}
function noteScoreCombo() {
  scoreCombo = scoreComboT > 0 ? scoreCombo + 1 : 1;
  scoreComboT = 1.5;
  if (scoreCombo > bestComboReached) bestComboReached = scoreCombo;
  if (scoreCombo < 2) return;
  score += scoreCombo;
  checkBest();
  const row = $('comboRow'), el = $('combo');
  if (!row || !el) return;
  el.textContent = 'x' + scoreCombo;
  row.classList.remove('hidden');
  pop(el);
}

let coachOn = false, coachT = 0, coachStep = -1;
function coachLines() {
  return touchUI ? ['Move with the stick', '✦ heavy hit costs stamina'] : ['Move with WASD', 'K is a heavy hit'];
}
function endCoach() {
  coachOn = false; coachT = 0; coachStep = -1;
  const el = $('coach');
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('fade');
  el.textContent = '';
}
function maybeStartTutorial() {
  let again = tutorialReplay;
  try { if (localStorage.getItem('toonblade_tutorial_again') === '1') again = true; } catch (_) {}
  let seen = false;
  try { seen = localStorage.getItem('toonblade_tutorial') === '1'; } catch (_) {}
  if (seen && !again) { endCoach(); return; }
  tutorialReplay = false;
  try {
    localStorage.setItem('toonblade_tutorial', '1');
    localStorage.removeItem('toonblade_tutorial_again');
  } catch (_) {}
  const tips = $('tipsBtn');
  if (tips) tips.textContent = 'Show tips';
  coachOn = true; coachT = 0; coachStep = 0;
  const el = $('coach');
  if (!el) return;
  el.textContent = coachLines()[0];
  el.classList.remove('hidden', 'fade');
}
function updateCoach(dt) {
  if (!coachOn) return;
  const el = $('coach');
  if (!el) return;
  coachT += dt;
  let step = -1, fade = false;
  if (coachT < 1.5) { step = 0; fade = coachT > 1.15; }
  else if (coachT < 3) { step = 1; fade = coachT > 2.6; }
  else { endCoach(); return; }
  if (step !== coachStep) {
    coachStep = step;
    el.textContent = coachLines()[step];
    el.classList.remove('fade');
  }
  el.classList.toggle('fade', fade);
}

function resetFx() {
  for (let i = 0; i < ARROW_N; i++) killArrow(arrows[i]);
  for (let i = 0; i < ROCK_N; i++) killRock(rocks[i]);
  for (let i = 0; i < WARN_N; i++) { warns[i].alive = false; warns[i].g.visible = false; }
  for (let i = 0; i < LANE_N; i++) { lanes[i].alive = false; lanes[i].g.visible = false; }
  bossRef = null; bossHideT = 0; bossShown = false; bossHpUi = -1;
  if (bossBar) bossBar.classList.add('hidden');
}
function resetGame() {
  for (const e of [...enemies]) removeEnemy(e);
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
  resetFx();
  Object.assign(player, { hp: 100, st: 100, attackT: -1, combo: 0, comboWindow: 0, heavy: false, swingSide: -1, heavyVoiced: false, dodgeT: -1, dodgeCd: 0, rollSide: -1, hurtT: 0, dead: false, deadT: 0, facing: 0 });
  player.pos.set(0, 0, 0); player.vel.set(0, 0, 0); W.root.rotation.set(0, 0, 0); W.body.rotation.set(0, 0, 0); W.body.position.set(0, 0, 0);
  visFacing = 0;
  score = 0; wave = 0; toSpawn = 0; waveTimer = 1.0;
  archersThisWave = 0; dashersThisWave = 0; throwersThisWave = 0; brutesThisWave = 0; skipNextClearBonus = false;
  upgrades.reach = upgrades.haste = upgrades.speed = upgrades.combo = upgrades.heal = upgrades.heavy = 0;
  upgradePicks = 0; closeUpgrade();
  breakScoreCombo();
  camYawPitch.yaw = Math.PI;
  uiHp = uiSt = uiWave = uiScore = uiLeft = -1;
  runStartBest = best; newBestShown = false; bestPending = false;
  runStartBestWave = bestWave; waveRecordShown = false; bestWavePending = false;
  runT = 0; kills = 0; bestComboReached = 0;
  audioGen++;
  savedKey = '0:0';
  clearHeld();
  camBase.copy(camera.position); camLook.set(0, 1.4, 0); // smooth glide from menu/death camera
}
// Free public counter (Abacus). No account, no API key, no cookies, and no personal data.
// A play is one press of Play or Play Again. A view is one page load. These are event counts, not unique people.
// The counter host sees the request IP, the same as any web request. This game sends no name, cookie, or identifier.
// Leave PLAY_COUNTER empty to turn counting off. A failed request is ignored so the game still runs.
// Totals (opening these does not add a count):
//   Plays  https://abacus.jasoncameron.dev/get/nazhadibrahem1998-rgb.github.io/toonblade-plays
//   Views  https://abacus.jasoncameron.dev/get/nazhadibrahem1998-rgb.github.io/toonblade-views
const PLAY_COUNTER = 'https://abacus.jasoncameron.dev';
const PLAY_COUNTER_NS = 'nazhadibrahem1998-rgb.github.io';
function countHit(key) {
  if (!PLAY_COUNTER || !PLAY_COUNTER_NS || !key) return;
  try {
    fetch(PLAY_COUNTER + '/hit/' + encodeURIComponent(PLAY_COUNTER_NS) + '/' + encodeURIComponent(key), {
      method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

let backArmed = false;
let lastStart = 0;
function armBack() {
  if (backArmed) return;
  try { history.pushState({ hts: 'play' }, ''); backArmed = true; } catch (e) {}
}
function rollUpgrades() {
  const pool = UPGRADE_DEFS.filter(d => (upgrades[d.id] || 0) < d.cap && (d.id !== 'heavy' || wave >= 5));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  upgradeOffer = pool.slice(0, 3);
  const heal = UPGRADE_DEFS.find(d => d.id === 'heal');
  while (upgradeOffer.length < 3) upgradeOffer.push(heal);
}
function renderUpgradeCards() {
  const box = $('upCards');
  if (!box) return;
  box.replaceChildren();
  for (let i = 0; i < upgradeOffer.length; i++) {
    const def = upgradeOffer[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'up-card';
    btn.dataset.upgrade = def.id;
    const rank = (upgrades[def.id] || 0) + 1;
    const rankText = def.id === 'heal' ? 'Instant' : 'Rank ' + Math.min(rank, def.cap) + ' of ' + def.cap;
    btn.setAttribute('aria-label', def.name + '. ' + def.desc + ' ' + rankText);
    const ico = document.createElement('span'); ico.className = 'up-ico'; ico.setAttribute('aria-hidden', 'true'); ico.textContent = def.icon;
    const name = document.createElement('span'); name.className = 'up-name'; name.textContent = def.name;
    const desc = document.createElement('span'); desc.className = 'up-desc'; desc.textContent = def.desc;
    const rk = document.createElement('span'); rk.className = 'up-rank'; rk.textContent = rankText;
    btn.append(ico, name, desc, rk);
    btn.addEventListener('click', () => chooseUpgrade(i));
    box.appendChild(btn);
  }
}
function closeUpgrade() {
  choosingUpgrade = false;
  const el = $('upgrade');
  if (el) el.classList.add('hidden');
  const box = $('upCards');
  if (box) box.replaceChildren();
  const hud = $('hud');
  if (hud && state !== 'menu') hud.classList.remove('hidden');
}
function openUpgrade() {
  if (choosingUpgrade || state === 'upgrade') return;
  rollUpgrades();
  renderUpgradeCards();
  choosingUpgrade = true;
  state = 'upgrade';
  shake = 0;
  breakScoreCombo();
  clearHeld();
  const el = $('upgrade');
  if (el) el.classList.remove('hidden');
  const hud = $('hud');
  if (hud) hud.classList.add('hidden');
  if (banner) { banner.classList.remove('show'); bannerT = 0; }
  if (touchUI) $('touch').classList.add('hidden');
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
}
function applyUpgrade(id) {
  if (id === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + 28);
    upgrades.heal++;
    sfx.heal();
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(upgrades, id)) return;
  upgrades[id]++;
  sfx.pick();
}
function chooseUpgrade(index) {
  if (state !== 'upgrade') return;
  const def = upgradeOffer[index];
  if (!def) return;
  applyUpgrade(def.id);
  upgradePicks++;
  closeUpgrade();
  state = 'play';
  startWave();
  waveTimer = 2.5;
  if (touchUI) $('touch').classList.remove('hidden');
  else requestLock();
}
function attackDur() {
  if (player.heavy) return HEAVY_DUR;
  return ATTACK_DUR * Math.pow(0.88, upgrades.haste || 0);
}
function bladeReach() { return (player.heavy ? 3.15 : player.combo === 2 ? 3.0 : 2.6) + (upgrades.reach || 0) * 0.42; }
function bladeVisual() { return 1 + (upgrades.reach || 0) * 0.17; }
function runSpeed() { return 6.2 + (upgrades.speed || 0) * 0.8; }
function comboGap() { return 0.35 + (upgrades.combo || 0) * 0.14; }
function arenaBusy() {
  if (enemies.length) return true;
  for (let i = 0; i < ARROW_N; i++) if (arrows[i].alive) return true;
  for (let i = 0; i < ROCK_N; i++) if (rocks[i].alive) return true;
  return false;
}

function startGame() {
  const now = performance.now();
  if (state === 'play' || now - lastStart < 350) return;
  lastStart = now;
  armBack();
  countHit('toonblade-plays');
  audio(); resetGame(); state = 'play';
  document.body.classList.remove('hts-over');
  const jump = readDebugWave();
  if (jump > 1) { wave = jump - 1; waveTimer = 0.08; skipNextClearBonus = true; }
  $('start').classList.add('hidden'); $('over').classList.add('hidden'); $('pause').classList.add('hidden');
  const upEl = $('upgrade'); if (upEl) upEl.classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (touchUI) $('touch').classList.remove('hidden');
  else requestLock();
  maybeStartTutorial();
  if (!looping) { looping = true; requestAnimationFrame(loop); }
}
function gameOver() {
  state = 'over';
  closeUpgrade();
  const result = window.HappyScores ? window.HappyScores.record('toonblade', score, wave) : { best: Math.max(best, score) };
  best = result.best;
  if (wave > bestWave) noteBestWave();
  $('oWave').textContent = wave;
  paintRunNote();
  if (window.HappyScores) {
    window.HappyScores.showEnd({
      scoreEl: $('endScore'),
      tryEl: $('endTry'),
      id: 'toonblade',
      from: 'game',
      score: score,
      best: best,
      isNew: score > runStartBest && score > 0,
    });
  }
  $('over').classList.remove('hidden'); $('touch').classList.add('hidden');
  document.body.classList.add('hts-over');
  showStartBest();
  endCoach();
  clearHeld();
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
}
function togglePause() {
  if (state === 'play' || state === 'upgrade') {
    resumeState = state;
    state = 'pause'; pausedAt = performance.now(); clearHeld();
    $('pause').classList.remove('hidden');
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  } else if (state === 'pause') {
    state = resumeState === 'upgrade' ? 'upgrade' : 'play';
    $('pause').classList.add('hidden'); clock.getDelta();
    armBack();
    if (state === 'play' && !touchUI) requestLock(); // called from a click/key gesture
  }
}
$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
// click / tap anywhere on the pause screen (incl. RESUME) resumes
$('pause').addEventListener('click', (e) => {
  if (e.target.closest('a')) return;
  if (state === 'pause' && performance.now() - pausedAt > 150) togglePause();
});
$('pMute').addEventListener('click', e => { e.stopPropagation(); audio(); setMuted(!muted); });
$('pShake').addEventListener('click', e => { e.stopPropagation(); if (reduceMotion) return; setShakeOff(!shakeOff); });
$('tipsBtn').addEventListener('click', () => {
  tutorialReplay = true;
  try { localStorage.setItem('toonblade_tutorial_again', '1'); } catch (_) {}
  $('tipsBtn').textContent = 'Tips on next play';
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveBest(); if (state === 'play' || state === 'upgrade') togglePause(); } });
addEventListener('popstate', () => { backArmed = false; if (state === 'play' || state === 'upgrade') togglePause(); });
addEventListener('pagehide', saveBest);
updateMuteUI(); updateShakeUI(); showStartBest();
try { if (localStorage.getItem('toonblade_tutorial_again') === '1') { tutorialReplay = true; $('tipsBtn').textContent = 'Tips on next play'; } } catch (_) {}

// ---------- Update ----------
const tmpV = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
const damp = (rate, dt) => 1 - Math.exp(-rate * dt); // frame-rate independent smoothing factor
let visFacing = 0;
function collide(pos, r) {
  for (const o of obstacles) {
    const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz), m = o.r + r;
    if (d < m && d > 1e-4) { pos.x = o.x + dx / d * m; pos.z = o.z + dz / d * m; }
  }
  const d = Math.hypot(pos.x, pos.z), lim = ARENA_R - 1 - r;
  if (d > lim) { pos.x *= lim / d; pos.z *= lim / d; }
}
function slideBody(pos, vx, vz, dt, r) {
  const x0 = pos.x, z0 = pos.z;
  pos.x += vx * dt; pos.z += vz * dt;
  collide(pos, r);
  const want = Math.hypot(vx, vz) * dt;
  const moved = Math.hypot(pos.x - x0, pos.z - z0);
  if (want < 0.03 || moved >= want * 0.45) return;
  const len = Math.hypot(vx, vz) || 1;
  const nx = vx / len, nz = vz / len;
  let bestX = pos.x, bestZ = pos.z, best = moved;
  for (const s of [1, -1]) {
    pos.x = x0 - nz * s * want;
    pos.z = z0 + nx * s * want;
    collide(pos, r);
    const got = Math.hypot(pos.x - x0, pos.z - z0);
    if (got > best) { best = got; bestX = pos.x; bestZ = pos.z; }
  }
  pos.x = bestX; pos.z = bestZ;
}

function denyStamina() {
  if (stWarnT > 0.45) return;
  stWarnT = 0.9;
  sfx.dry();
  const bar = $('stBar');
  if (bar) bar.classList.add('deny');
  const warn = $('stWarn');
  if (warn) warn.classList.remove('hidden');
}
let flashTimer = 0;
function damagePlayer(dmg, fromPos) {
  if (player.dead || (player.dodgeT >= 0 && player.dodgeT < ROLL_IFRAME)) return false;
  dmg = hurtAmount(dmg);
  player.hp -= dmg; player.hurtT = 0.3; sfx.hurt(); shake = Math.max(shake, 0.35); breakScoreCombo();
  if (fromPos) {
    const kx = player.pos.x - fromPos.x, kz = player.pos.z - fromPos.z;
    const kl = Math.hypot(kx, kz);
    if (kl > 0.05) {
      const push = Math.min(1.05, 0.42 + dmg * 0.018);
      player.pos.x += kx / kl * push;
      player.pos.z += kz / kl * push;
      collide(player.pos, 0.5);
    }
  }
  dmgFlash.style.opacity = 1;
  flashTimer++;
  const flashMark = flashTimer;
  setTimeout(() => { if (flashMark === flashTimer) dmgFlash.style.opacity = 0; }, 120);
  burst(tmpV.set(player.pos.x, 1.3, player.pos.z), 0xff3344, 10, 5);
  if (player.hp <= 0) { player.hp = 0; player.dead = true; player.deadT = 0; sfx.die(); }
  return true;
}

function aimEnemy(maxDist, maxAng) {
  let best = null, bd = maxDist;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.g.root.position.x - player.pos.x, dz = e.g.root.position.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d >= bd) continue;
    if (maxAng != null && Math.abs(angDiff(player.facing, Math.atan2(dx, dz))) > maxAng) continue;
    bd = d; best = e;
  }
  return best;
}
function faceEnemy(maxDist, maxAng, move) {
  const best = aimEnemy(maxDist, maxAng);
  if (best) player.facing = Math.atan2(best.g.root.position.x - player.pos.x, best.g.root.position.z - player.pos.z);
  else if (move.lengthSq() > 0.01) player.facing = Math.atan2(move.x, move.z);
}
function updatePlayer(dt) {
  if (attackHeld || mouseAttack) input.attack = true;
  if (input.attack) buf.attack = 0.18;
  if (input.heavy) buf.heavy = 0.18;
  if (input.dodge) { buf.dodge = 0.18; buf.dodgeSide = input.dodgeSide; }
  input.attack = input.heavy = input.dodge = false;
  input.dodgeSide = 0;
  // movement input
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz -= 1;
  if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyQ) camYawPitch.yaw += 2.2 * dt;
  if (keys.KeyE) camYawPitch.yaw -= 2.2 * dt;
  if (input.tx || input.tz) { mx = input.tx; mz = input.tz; }
  const mag = Math.min(1, Math.hypot(mx, mz));
  // camera-relative
  const yaw = camYawPitch.yaw;
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(-fwd.z, 0, fwd.x);
  const move = tmpV.set(0, 0, 0).addScaledVector(right, mx).addScaledVector(fwd, -mz);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(mag);

  player.dodgeCd -= dt; player.comboWindow -= dt;
  const sideX = Math.cos(player.facing), sideZ = -Math.sin(player.facing);

  if (buf.dodge > 0 && player.dodgeT < 0 && player.dodgeCd <= 0) {
    buf.dodge = 0;
    if (player.st < ROLL_COST) denyStamina();
    else {
      player.dodgeT = 0; player.dodgeCd = 0.72; player.st -= ROLL_COST; player.attackT = -1; player.heavy = false;
      if (touchUI) {
        // Phone: roll along the stick's left/right, or the swipe on the roll button.
        let side = buf.dodgeSide;
        if (!side && Math.abs(input.tx) > 0.18) side = Math.sign(input.tx);
        if (!side) { player.rollSide = -(player.rollSide || -1); side = player.rollSide; }
        else player.rollSide = side;
        const yaw = camYawPitch.yaw;
        player.dodgeDir.set(Math.cos(yaw) * side, 0, -Math.sin(yaw) * side);
      } else if (move.lengthSq() > 0.04) {
        player.dodgeDir.copy(move).normalize();
        const lat = player.dodgeDir.x * sideX + player.dodgeDir.z * sideZ;
        player.rollSide = Math.abs(lat) > 0.3 ? Math.sign(lat) : (player.rollSide || -1);
      } else {
        player.rollSide = -(player.rollSide || -1);
        player.dodgeDir.set(sideX * player.rollSide, 0, sideZ * player.rollSide);
      }
      sfx.dodge();
      burst(tmpV.set(player.pos.x, 0.35, player.pos.z), 0xffe08a, 10, 4);
    }
  }
  const atkCost = Math.max(5, 8 - (upgrades.haste || 0));
  if (buf.heavy > 0 && player.attackT < 0 && player.dodgeT < 0) {
    buf.heavy = 0;
    if (player.st < HEAVY_COST) denyStamina();
    else {
      player.heavy = true; player.attackT = 0; player.st -= HEAVY_COST; player.hitSet.clear();
      player.swingSide = -1; player.heavyVoiced = false;
      buf.attack = 0;
      faceEnemy(bladeReach() + 0.8, 2.25, move);
      noise(0.16, 200, 80, 0.16, 'lowpass');
    }
  } else if (buf.attack > 0 && player.attackT < 0 && player.dodgeT < 0) {
    buf.attack = 0;
    if (player.st < atkCost) denyStamina();
    else {
      player.heavy = false; player.attackT = 0; player.st -= atkCost; player.hitSet.clear();
      player.combo = player.comboWindow > 0 ? (player.combo + 1) % 3 : 0;
      player.swingSide = player.combo === 1 ? 1 : player.combo === 2 ? 0 : -1;
      player.heavyVoiced = false;
      faceEnemy(3.2 + (upgrades.reach || 0) * 0.45, 2.15, move);
      sfx.swing();
    }
  }
  if (player.attackT < 0) buf.attack = Math.max(0, buf.attack - dt);
  if (player.attackT < 0 && player.dodgeT < 0) buf.heavy = Math.max(0, buf.heavy - dt);
  buf.dodge = Math.max(0, buf.dodge - dt);

  let speed = runSpeed();
  if (player.heavy && player.attackT >= 0) speed = 0.85;
  else if (player.attackT >= 0) speed = 1.2;
  if (player.dodgeT >= 0) {
    player.dodgeT += dt;
    const k = 1 - player.dodgeT / ROLL_TIME;
    const spd = 13 * Math.max(0.25, k);
    slideBody(player.pos, player.dodgeDir.x * spd, player.dodgeDir.z * spd, dt, 0.5);
    if (player.dodgeT > ROLL_TIME) player.dodgeT = -1;
    player.vel.set(0, 0, 0);
  } else {
    // short acceleration ramp (~55 ms) instead of instant start/stop
    const ka = damp(18, dt);
    player.vel.x += (move.x * speed - player.vel.x) * ka; player.vel.z += (move.z * speed - player.vel.z) * ka;
    slideBody(player.pos, player.vel.x, player.vel.z, dt, 0.5);
    if (move.lengthSq() > 0.01 && player.attackT < 0) {
      const target = Math.atan2(move.x, move.z);
      player.facing += angDiff(player.facing, target) * damp(14, dt);
    }
  }
  collide(player.pos, 0.5);
  // enemy push-out
  for (const e of enemies) {
    if (e.dead) continue;
    const ep = e.g.root.position, r = ETYPES[e.type].r + 0.45;
    const dx = player.pos.x - ep.x, dz = player.pos.z - ep.z, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-4) { player.pos.x += dx / d * (r - d) * 0.5; player.pos.z += dz / d * (r - d) * 0.5; }
  }

  // stamina regen
  if (player.attackT < 0 && player.dodgeT < 0) player.st = Math.min(100, player.st + 18 * dt);

  // attack resolution
  if (player.attackT >= 0) {
    player.attackT += dt;
    const swingDur = attackDur();
    const p = player.attackT / swingDur;
    const p0 = player.heavy ? 0.46 : 0.25, p1 = player.heavy ? 0.74 : 0.6;
    if (p > p0 && p < p1) {
      const reach = bladeReach(), arc = player.heavy ? 2.25 : player.combo === 2 ? Math.PI : 1.3;
      for (const e of enemies) {
        if (e.dead || player.hitSet.has(e)) continue;
        const ep = e.g.root.position; const dx = ep.x - player.pos.x, dz = ep.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < reach + ETYPES[e.type].r * 0.82 && Math.abs(angDiff(player.facing, Math.atan2(dx, dz))) < arc) {
          player.hitSet.add(e);
          const dir = impactDir(e);
          hitEnemy(e, player.heavy ? heavyDamage() : player.combo === 2 ? 22 : 15, dir[0], dir[1], player.heavy ? 2 : 1);
        }
      }
      slashMat.opacity = Math.sin((p - p0) / (p1 - p0) * Math.PI) * (player.heavy ? 0.92 : 0.78);
    } else slashMat.opacity = Math.max(0, slashMat.opacity - dt * 6);
    if (player.attackT > swingDur) { player.attackT = -1; player.heavy = false; player.comboWindow = comboGap(); }
  } else slashMat.opacity = Math.max(0, slashMat.opacity - dt * 6);
  slash.position.set(player.pos.x, 1.1, player.pos.z);
  slash.scale.setScalar(Math.max(0.2, bladeReach()) / 2.5);
  slashMat.color.setHex(player.heavy ? 0xffb03a : 0xfff2b0);
  slash.rotation.z = player.facing - Math.PI / 2; // ring lies in XY, tilted onto ground
  slash.rotation.x = -Math.PI / 2 + (player.heavy ? 0.05 : player.combo === 1 ? 0.3 : player.combo === 0 ? -0.2 : 0);

  // pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i]; pk.t += dt; pk.m.rotation.y += dt * 2; pk.m.position.y = 0.6 + Math.sin(pk.t * 3) * 0.15;
    if (pk.m.position.distanceTo(tmpV.set(player.pos.x, 0.6, player.pos.z)) < 1.1) {
      player.hp = Math.min(player.maxHp, player.hp + 30); sfx.heal(); burst(pk.m.position, 0x66ff88, 14, 4);
      scene.remove(pk.m); pickups.splice(i, 1);
    } else if (pk.t > 20) { scene.remove(pk.m); pickups.splice(i, 1); }
  }
}

function puffColor(type) {
  if (type === 'skeleton' || type === 'king') return 0xf4ecd8;
  if (type === 'brute') return 0x7a5aa8;
  if (type === 'archer') return 0x7dffa0;
  if (type === 'dasher') return 0xffb06a;
  if (type === 'thrower') return 0x8fd4ff;
  if (type === 'chief') return 0x8dff7a;
  return 0xfff07a;
}
function deathColor(type) {
  if (type === 'skeleton' || type === 'king') return 0xece4cf;
  if (type === 'brute') return 0x7a5aa8;
  if (type === 'archer') return 0x3faf6a;
  if (type === 'dasher') return 0xf08a3a;
  if (type === 'thrower') return 0x3d8fd4;
  if (type === 'chief') return 0x3f9a45;
  return 0x6cbf3a;
}
// Push along the blade: sideways for a side swing, back for an overhead or a heavy cleave.
function impactDir(e) {
  const f = player.facing;
  const fx = Math.sin(f), fz = Math.cos(f);
  const rx = Math.cos(f), rz = -Math.sin(f);
  const ep = e.g.root.position;
  let ox = ep.x - player.pos.x, oz = ep.z - player.pos.z;
  const od = Math.hypot(ox, oz) || 1;
  ox /= od; oz /= od;
  const lat = ox * rx + oz * rz;
  let sx, sz;
  if (player.heavy) {
    sx = fx * 0.82 - rx * 0.38 + rx * lat * 0.25;
    sz = fz * 0.82 - rz * 0.38 + rz * lat * 0.25;
  } else if (player.swingSide === 0) {
    sx = fx + rx * lat * 0.7;
    sz = fz + rz * lat * 0.7;
  } else {
    const side = player.swingSide;
    sx = rx * side + fx * Math.max(0, 1 - Math.abs(lat)) * 0.5;
    sz = rz * side + fz * Math.max(0, 1 - Math.abs(lat)) * 0.5;
  }
  sx += ox * 0.35; sz += oz * 0.35;
  const m = Math.hypot(sx, sz) || 1;
  return [sx / m, sz / m];
}
function hitEnemy(e, dmg, nx, nz, power) {
  noteScoreCombo();
  e.hp -= dmg; e.flash = 0.12;
  const boss = e.type === 'king' || e.type === 'chief';
  const brute = e.type === 'brute';
  const strong = (power || 1) > 1;
  let mag = strong ? 13 : 7.2;
  if (boss) mag = strong ? 2.2 : 1.35;
  else if (brute) mag = strong ? 4.6 : 3;
  const len = Math.hypot(nx, nz) || 1;
  e.kb.set(nx / len, 0, nz / len).multiplyScalar(mag);
  const heavy = brute || boss;
  if (e.state === 'windup' && !heavy) { e.state = 'stagger'; e.t = 0; if (e.warn) releaseWarn(e); releaseLane(e); }
  if (strong) { if (!player.heavyVoiced) { player.heavyVoiced = true; sfx.heavy(); } else sfx.hit(); }
  else sfx.hit();
  hitStop = strong ? 0.07 : 0.05; shake = Math.max(shake, strong ? 0.28 : 0.18);
  const ep = e.g.root.position;
  burst(tmpV.set(ep.x - nx * 0.3, 1.1, ep.z - nz * 0.3), puffColor(e.type), 10, 6);
  burst(tmpV, 0xffffff, 4, 8);
  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0; kills++;
    if (e.warn) releaseWarn(e);
    releaseLane(e);
    let pts = ETYPES[e.type].score * (1 + Math.floor(wave / 3));
    if (e.type === 'king' || e.type === 'chief') {
      pts += e.type === 'king' ? 200 : 150;
      showBanner(e.type === 'king' ? (wave >= 20 ? 'EMPEROR DEFEATED!' : 'KING DEFEATED!') : (wave >= 15 ? 'WARLORD DEFEATED!' : 'CHIEF DEFEATED!'));
      sfx.victory();
      player.hp = Math.min(player.maxHp, player.hp + (e.type === 'king' ? 30 : 24));
      bossHideT = 1.6;
      shake = Math.max(shake, 0.45);
      burst(tmpV.set(ep.x, 1.6, ep.z), 0xffd45e, 24, 8);
      burst(tmpV.set(ep.x, 1.1, ep.z), e.type === 'king' ? 0xfff6c8 : 0xd8ffb0, 14, 6);
    } else sfx.die();
    score += pts; checkBest();
    burst(tmpV.set(ep.x, 0.8, ep.z), deathColor(e.type), 22, 7);
    const sure = e.type === 'brute' || e.type === 'king' || e.type === 'chief';
    const rare = e.type === 'archer' || e.type === 'thrower' || e.type === 'dasher';
    if (Math.random() < (sure ? 1 : rare ? 0.16 : 0.14)) dropPotion(ep);
  }
}

function countMinions() {
  let n = 0;
  for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead && enemies[i].type !== 'king') n++;
  return n;
}
function kingWindup(e) { return e.atk === 'summon' ? 0.95 : e.atk === 'sweep' ? 1.05 : 1.25; }
function placeSweepWarn(e) {
  const p = e.g.root.position, dist = 2.15;
  const x = p.x + Math.sin(e.facing) * dist, z = p.z + Math.cos(e.facing) * dist;
  if (!e.warn) beginWarn(e, x, z, 1.85, 1.05);
  e.warn.x = x; e.warn.z = z; e.slamX = x; e.slamZ = z;
  e.warn.g.position.set(x, 0, z);
}
function startKingAttack(e, d) {
  if (e.summonCd <= 0 && countMinions() < 3 && e.spawnT > 2.5) {
    e.atk = 'summon'; e.summonCd = wave >= 20 ? 14 : 11;
  } else if (d < 4.3 && Math.random() < (wave >= 20 ? 0.62 : 0.45)) {
    e.atk = 'sweep';
  } else e.atk = 'slam';
  e.state = 'windup'; e.t = 0;
  if (e.atk === 'slam') beginWarn(e, player.pos.x, player.pos.z, 2.65, 1.25);
  else if (e.atk === 'sweep') placeSweepWarn(e);
}
function kingImpact(e) {
  const w = e.warn;
  const x = w ? w.x : e.slamX, z = w ? w.z : e.slamZ;
  const rad = w ? w.radius : 2.65;
  sfx.slam();
  burst(tmpA.set(x, 0.45, z), 0xffd56a, 16, 6);
  burst(tmpA.set(x, 0.3, z), 0xe6d2a2, 10, 4);
  shake = Math.max(shake, 0.2);
  const dx = player.pos.x - x, dz = player.pos.z - z;
  if (dx * dx + dz * dz < rad * rad) damagePlayer(e.atk === 'sweep' ? ETYPES.king.dmg : ETYPES.king.dmg - 2, tmpA.set(x, 0.6, z));
  releaseWarn(e);
}
function kingSummon(e) {
  sfx.summon();
  const p = e.g.root.position, yaw = e.facing;
  const sx = Math.sin(yaw), sz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  burst(tmpA.set(p.x, 1.7, p.z), 0xffd45e, 14, 5);
  burst(tmpA.set(p.x, 1.15, p.z), 0xc06bff, 10, 4);
  const room = 3 - countMinions();
  const n = room >= 2 ? 2 : room > 0 ? 1 : 0;
  if (n >= 1) summonAt(p.x + rx * 1.8 + sx * 1.15, p.z + rz * 1.8 + sz * 1.15);
  if (n >= 2) summonAt(p.x - rx * 1.8 + sx * 1.15, p.z - rz * 1.8 + sz * 1.15);
  releaseWarn(e);
}
function summonAt(x, z) {
  spawnEnemy('skeleton');
  const m = enemies[enemies.length - 1];
  m.g.root.position.set(x, 0, z);
  collide(m.g.root.position, ETYPES.skeleton.r);
  m.cd = rand(0.45, 0.95);
}
// Keeps a band of distance, strafes, and only shoots when the shot can be read.
function updateArcher(e, T, p, d, toP, dt) {
  let moving = false;
  e.facing += angDiff(e.facing, toP) * damp(8, dt);
  const prefer = 8.4, minD = 5.8;
  const sp = T.speed * speedScale();
  const fx = Math.sin(e.facing), fz = Math.cos(e.facing);
  if (d > prefer + 1.6) { p.x += fx * sp * dt; p.z += fz * sp * dt; moving = true; e.pressT = 0; }
  else if (d < minD) { p.x -= fx * sp * dt; p.z -= fz * sp * dt; moving = true; e.pressT += dt; }
  else {
    e.pressT = 0; e.sideT += dt;
    if (e.sideT > 2) { e.sideT = 0; e.side = -e.side; }
    p.x += Math.cos(e.facing) * e.side * sp * 0.75 * dt;
    p.z += -Math.sin(e.facing) * e.side * sp * 0.75 * dt;
    moving = true;
  }
  const inBand = d >= minD - 0.4 && d <= prefer + 3.2;
  if (e.cd <= 0 && d > 1.4 && d < 15 && (inBand || e.pressT > 0.65)) { e.state = 'windup'; e.t = 0; e.pressT = 0; }
  return moving;
}
function updateDasher(e, T, p, d, toP, dt) {
  let moving = false;
  e.facing += angDiff(e.facing, toP) * damp(9, dt);
  const sp = T.speed * speedScale();
  if (d > 2.4) {
    p.x += Math.sin(e.facing) * sp * dt; p.z += Math.cos(e.facing) * sp * dt; moving = true;
  }
  if (e.cd <= 0 && d > 1.6 && d < 12 && e.spawnT > 0.35) {
    e.state = 'windup'; e.t = 0; e.atk = 'dash'; e.lockFace = null;
    beginLane(e, 7.2, 1.55);
  }
  return moving;
}
function dasherWindup(e, T, toP, dt) {
  const lockAt = T.windup - 0.22;
  if (e.t < lockAt) e.facing += angDiff(e.facing, toP) * damp(7, dt);
  else if (e.lockFace == null) e.lockFace = e.facing;
  else e.facing = e.lockFace;
  placeLane(e);
  if (e.t >= T.windup) { e.state = 'strike'; e.t = 0; e.struck = false; sfx.dash(); }
}
function dasherStrike(e, T, p, dt) {
  p.x += Math.sin(e.facing) * 14.5 * dt; p.z += Math.cos(e.facing) * 14.5 * dt;
  const dx = player.pos.x - p.x, dz = player.pos.z - p.z, hit = T.r + 0.55;
  if (!e.struck && dx * dx + dz * dz < hit * hit) { e.struck = true; damagePlayer(T.dmg, p); }
  if (e.t > 0.42) { e.state = 'chase'; e.cd = T.cd; releaseLane(e); }
  return true;
}
function updateThrower(e, T, p, d, toP, dt) {
  let moving = false;
  e.facing += angDiff(e.facing, toP) * damp(7, dt);
  const prefer = 7.4, minD = 4.6, sp = T.speed * speedScale();
  const fx = Math.sin(e.facing), fz = Math.cos(e.facing);
  if (d > prefer + 1.3) { p.x += fx * sp * dt; p.z += fz * sp * dt; moving = true; }
  else if (d < minD) { p.x -= fx * sp * dt; p.z -= fz * sp * dt; moving = true; }
  else {
    e.sideT += dt;
    if (e.sideT > 1.8) { e.sideT = 0; e.side = -e.side; }
    p.x += Math.cos(e.facing) * e.side * sp * 0.7 * dt;
    p.z += -Math.sin(e.facing) * e.side * sp * 0.7 * dt;
    moving = true;
  }
  if (e.cd <= 0 && d > 2.4 && d < 14 && e.spawnT > 0.4) {
    e.state = 'windup'; e.t = 0; e.atk = 'lob';
    e.aimX = player.pos.x; e.aimZ = player.pos.z;
    beginWarn(e, e.aimX, e.aimZ, 1.45, T.windup + 0.7);
  }
  return moving;
}
function throwerStrike(e, T) {
  if (!e.struck) { e.struck = true; launchRock(e); }
  if (e.t > 0.28) { e.state = 'chase'; e.cd = T.cd * rand(0.9, 1.15); }
}
function chiefWindupTime(e) { return e.atk === 'charge' ? 0.95 : 1.1; }
function updateChief(e, T, p, d, toP, dt) {
  let moving = false;
  e.facing += angDiff(e.facing, toP) * damp(5, dt);
  if (d > 3.5) {
    const sp = T.speed * (1 + Math.max(0, wave - 5) * 0.012);
    p.x += Math.sin(e.facing) * sp * dt; p.z += Math.cos(e.facing) * sp * dt; moving = true;
  }
  if (e.cd <= 0 && e.spawnT > 0.65 && d < 13) {
    e.atk = d < 3.8 && Math.random() < (wave >= 15 ? 0.4 : 0.58) ? 'slam' : 'charge';
    e.state = 'windup'; e.t = 0; e.lockFace = null;
    if (e.atk === 'slam') beginWarn(e, p.x, p.z, 2.55, 1.1);
    else beginLane(e, 8.4, 2.2);
  }
  return moving;
}
function chiefWindupStep(e, toP, dt) {
  const need = chiefWindupTime(e);
  if (e.atk === 'charge') {
    const lockAt = need - 0.28;
    if (e.t < lockAt) e.facing += angDiff(e.facing, toP) * damp(4.5, dt);
    else if (e.lockFace == null) e.lockFace = e.facing;
    else e.facing = e.lockFace;
    placeLane(e);
  } else e.facing += angDiff(e.facing, toP) * damp(2.2, dt);
  if (e.t >= need) { e.state = 'strike'; e.t = 0; e.struck = false; if (e.atk === 'charge') sfx.dash(); }
}
function chiefStrike(e, T, p, dt) {
  if (e.atk !== 'charge') {
    if (!e.struck && e.t > 0.06) {
      e.struck = true;
      const w = e.warn;
      const x = w ? w.x : p.x, z = w ? w.z : p.z, rad = w ? w.radius : 2.55;
      sfx.slam();
      burst(tmpA.set(x, 0.4, z), 0xffd56a, 14, 5);
      burst(tmpA.set(x, 0.25, z), 0xc8e88a, 8, 3);
      shake = Math.max(shake, 0.18);
      const dx = player.pos.x - x, dz = player.pos.z - z;
      if (dx * dx + dz * dz < rad * rad) damagePlayer(T.dmg, tmpA.set(x, 0.5, z));
      releaseWarn(e);
    }
    if (e.state === 'strike' && e.t > 0.42) e.cd = T.cd, e.state = 'chase';
    return false;
  }
  p.x += Math.sin(e.facing) * 12 * dt; p.z += Math.cos(e.facing) * 12 * dt;
  const dx = player.pos.x - p.x, dz = player.pos.z - p.z, hit = T.r + 0.4;
  if (!e.struck && dx * dx + dz * dz < hit * hit) { e.struck = true; damagePlayer(T.dmg + 2, p); }
  if (e.t > 0.52) { e.state = 'chase'; e.cd = T.cd; releaseLane(e); }
  return true;
}
function updateKing(e, T, p, d, toP, dt) {
  let moving = false;
  e.facing += angDiff(e.facing, toP) * damp(6, dt);
  if (d > 5.2) {
    const sp = T.speed * (1 + wave * 0.012);
    p.x += Math.sin(e.facing) * sp * dt; p.z += Math.cos(e.facing) * sp * dt; moving = true;
  }
  if (e.cd <= 0 && e.spawnT > 0.75 && d < 14) startKingAttack(e, d);
  return moving;
}
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], T = ETYPES[e.type], g = e.g, p = g.root.position;
    const king = e.type === 'king', archer = e.type === 'archer';
    const chief = e.type === 'chief', dasher = e.type === 'dasher', thrower = e.type === 'thrower';
    if (e.dead) {
      if (e.warn) releaseWarn(e);
      releaseLane(e);
      e.deadT += dt;
      g.body.rotation.x = Math.min(Math.PI / 2, e.deadT * 6) * -1;
      g.root.position.y = -Math.max(0, e.deadT - 0.6) * (king ? 2.2 : 1.5);
      g.hb.visible = false;
      if (e.deadT > 1.4) removeEnemy(e);
      continue;
    }
    e.spawnT += dt;
    if (king) e.summonCd -= dt;
    const dx = player.pos.x - p.x, dz = player.pos.z - p.z, d = Math.hypot(dx, dz);
    const toP = Math.atan2(dx, dz);
    e.cd -= dt; e.t += dt;
    // knockback
    if (e.kb.lengthSq() > 0.01) { p.addScaledVector(e.kb, dt); e.kb.multiplyScalar(Math.pow(0.012, dt)); }
    let moving = false;
    const x0 = p.x, z0 = p.z;
    if (player.dead) { if (e.warn) releaseWarn(e); releaseLane(e); e.state = 'idle'; }
    else if (e.state === 'chase') {
      if (archer) moving = updateArcher(e, T, p, d, toP, dt);
      else if (king) moving = updateKing(e, T, p, d, toP, dt);
      else if (chief) moving = updateChief(e, T, p, d, toP, dt);
      else if (dasher) moving = updateDasher(e, T, p, d, toP, dt);
      else if (thrower) moving = updateThrower(e, T, p, d, toP, dt);
      else {
        e.facing += angDiff(e.facing, toP) * damp(8, dt);
        if (d > T.range * 0.9) {
          const sp = T.speed * speedScale();
          p.x += Math.sin(e.facing) * sp * dt; p.z += Math.cos(e.facing) * sp * dt; moving = true;
        } else if (e.cd <= 0) { e.state = 'windup'; e.t = 0; }
      }
    } else if (e.state === 'windup') {
      if (dasher) dasherWindup(e, T, toP, dt);
      else if (chief) chiefWindupStep(e, toP, dt);
      else {
        const turn = king && e.atk === 'slam' ? 2.2 : 4;
        e.facing += angDiff(e.facing, toP) * damp(turn, dt);
        if (king && e.atk === 'sweep') placeSweepWarn(e);
        const need = king ? kingWindup(e) : T.windup;
        if (e.t >= need) { e.state = 'strike'; e.t = 0; e.struck = false; }
      }
    } else if (e.state === 'strike') {
      if (dasher) moving = dasherStrike(e, T, p, dt);
      else if (chief) moving = chiefStrike(e, T, p, dt);
      else if (thrower) throwerStrike(e, T);
      else if (archer) {
        if (!e.struck) { e.struck = true; fireArrow(e); }
        if (e.t > 0.28) { e.state = 'chase'; e.cd = T.cd * rand(0.85, 1.2); }
      } else if (king) {
        if (!e.struck && e.t > 0.06) {
          e.struck = true;
          if (e.atk === 'summon') kingSummon(e); else kingImpact(e);
        }
        if (e.state === 'strike' && e.t > 0.42) { e.state = 'chase'; e.cd = T.cd * rand(0.9, 1.25); if (e.warn) releaseWarn(e); }
      } else {
        if (!e.struck && e.t > 0.06) {
          e.struck = true;
          if (d < T.range + 0.4 && Math.abs(angDiff(e.facing, toP)) < 1.2) {
            const r = damagePlayer(T.dmg, p);
            if (r === 'blocked' && e.type !== 'brute') { e.state = 'stagger'; e.t = 0; e.kb.set(-dx / (d || 1), 0, -dz / (d || 1)).multiplyScalar(6); }
          }
        }
        if (e.state === 'strike' && e.t > 0.3) { e.state = 'chase'; e.cd = T.cd * rand(0.8, 1.3); }
      }
    } else if (e.state === 'stagger') {
      if (e.t > 0.5) { e.state = 'chase'; e.cd = 0.4; }
    } else if (e.state === 'idle') { /* victory idle */ }
    const charging = (dasher && e.state === 'strike') || (chief && e.atk === 'charge' && e.state === 'strike');
    if (!charging) for (const o of enemies) {
      if (o === e || o.dead) continue;
      const op = o.g.root.position, sx = p.x - op.x, sz = p.z - op.z, sd = Math.hypot(sx, sz), m = T.r + ETYPES[o.type].r;
      if (sd < m && sd > 1e-4) { p.x += sx / sd * (m - sd) * 0.5; p.z += sz / sd * (m - sd) * 0.5; }
    }
    collide(p, T.r);
    if (moving && e.state === 'chase' && !charging && d > T.range * 1.05) {
      const moved = Math.hypot(p.x - x0, p.z - z0);
      const sp = T.speed * speedScale() * dt;
      if (sp > 0.02 && moved < sp * 0.35) {
        const nx = dx / (d || 1), nz = dz / (d || 1);
        let bestS = 1, bestClear = -1;
        for (const s of [1, -1]) {
          const tx = p.x - nz * s * 0.9, tz = p.z + nx * s * 0.9;
          let clear = 99;
          for (let oi = 0; oi < obstacles.length; oi++) {
            const o = obstacles[oi];
            const cd = Math.hypot(tx - o.x, tz - o.z) - o.r;
            if (cd < clear) clear = cd;
          }
          if (clear > bestClear) { bestClear = clear; bestS = s; }
        }
        p.x += -nz * bestS * sp;
        p.z += nx * bestS * sp;
        collide(p, T.r);
      }
    }
    // animation
    g.root.rotation.y = e.facing;
    if (moving) e.walk += dt * T.speed * 2.6;
    const sw = moving ? Math.sin(e.walk) : 0;
    g.legs[0].rotation.x = sw * 0.7; g.legs[1].rotation.x = -sw * 0.7;
    g.body.position.y = moving ? Math.abs(Math.cos(e.walk)) * 0.08 : 0;
    const wind = king ? kingWindup(e) : chief ? chiefWindupTime(e) : T.windup;
    let armX = -0.3 + sw * 0.3;
    if (e.state === 'windup') armX = -2.6 * Math.min(1, e.t / wind);
    else if (e.state === 'strike') armX = -2.6 + Math.min(1, e.t / 0.12) * 3.4;
    else if (e.state === 'stagger') { armX = 0.4; g.body.rotation.x = -0.25; }
    if (e.state !== 'stagger') g.body.rotation.x = e.state === 'windup' ? -0.15 : e.state === 'strike' ? 0.2 : 0;
    g.arm.rotation.x = armX; g.arm2.rotation.x = -sw * 0.4;
    if (archer && g.nock) {
      const draw = e.state === 'windup' ? Math.min(1, e.t / T.windup) : 0;
      g.nock.visible = e.state === 'windup';
      g.nock.position.z = 0.78 - draw * 0.28;
      if (g.bow) g.bow.position.z = 0.34 - draw * 0.12;
      // arm reaches forward to the string, then releases
      if (e.state === 'windup') { g.arm.rotation.x = -1.15 - draw * 0.25; g.arm.rotation.z = 0.55; }
      else if (e.state === 'strike') { g.arm.rotation.x = -0.85; g.arm.rotation.z = 0.2; }
      else { g.arm.rotation.x = -0.9; g.arm.rotation.z = 0.45; }
    }
    if (king) {
      const swinging = e.atk === 'sweep' && (e.state === 'windup' || e.state === 'strike');
      if (!swinging) { g.arm.rotation.z = 0; g.body.rotation.y = 0; }
      if (e.atk === 'summon' && (e.state === 'windup' || e.state === 'strike')) {
        const k = e.state === 'windup' ? Math.min(1, e.t / 0.95) : 1;
        g.arm.rotation.x = -2.5 * k; g.arm2.rotation.x = -2.5 * k; g.body.rotation.x = -0.2 * k;
      } else if (e.atk === 'slam' && e.state === 'windup') {
        const k = Math.min(1, e.t / 1.25);
        g.arm.rotation.x = -2.9 * k; g.body.rotation.x = -0.35 * k;
      } else if (e.atk === 'slam' && e.state === 'strike') {
        const k = Math.min(1, e.t / 0.14);
        g.arm.rotation.x = -2.9 + k * 4.2; g.body.rotation.x = -0.35 + k * 0.7;
      } else if (swinging && e.state === 'windup') {
        const k = Math.min(1, e.t / 1.05);
        g.arm.rotation.x = -1.15; g.arm.rotation.z = -1.45 * k; g.body.rotation.y = -0.45 * k;
      } else if (swinging && e.state === 'strike') {
        const k = Math.min(1, e.t / 0.16);
        g.arm.rotation.z = -1.45 + k * 2.7; g.body.rotation.y = -0.45 + k * 0.95;
      }
      if (g.cape) g.cape.rotation.x = 0.12 + Math.sin(e.walk * 0.5) * 0.06;
    }
    if (chief && (e.state === 'windup' || e.state === 'strike')) {
      if (e.atk === 'charge') {
        const k = e.state === 'windup' ? Math.min(1, e.t / 0.95) : 1;
        g.body.rotation.x = 0.55 * k; g.arm.rotation.x = -0.9 - 0.4 * k;
      } else if (e.state === 'windup') {
        const k = Math.min(1, e.t / 1.1);
        g.arm.rotation.x = -2.7 * k; g.body.rotation.x = -0.32 * k;
      } else {
        const k = Math.min(1, e.t / 0.14);
        g.arm.rotation.x = -2.7 + k * 4; g.body.rotation.x = -0.32 + k * 0.65;
      }
    }
    if (dasher && e.state === 'strike') g.body.rotation.x = 0.75;
    if (thrower && e.state === 'windup') g.arm.rotation.x = -0.5 - 1.7 * Math.min(1, e.t / T.windup);
    // telegraph: eyes glow during windup; hit flash
    const glow = e.state === 'windup' ? 1 : 0;
    g.root.scale.setScalar(enemyScale(e.type) * (1 + (e.flash > 0 ? 0.08 : 0)) * Math.min(1, e.spawnT * 3 + 0.01));
    e.flash -= dt;
    g.eyeM.emissiveIntensity = 1 + glow * (king || chief ? 4 : 3);
    // health bar — bosses use the screen bar
    g.hb.visible = !king && !chief && e.hp < e.maxHp;
    g.hbFill.scale.x = Math.max(0.001, e.hp / e.maxHp);
    g.hb.quaternion.copy(camera.quaternion).premultiply(tmpQ.copy(g.root.quaternion).invert());
  }
}
const tmpQ = new THREE.Quaternion();

// blended pose so limbs ease between idle / walk / block / attack instead of snapping
const pose = { rX: -0.25, rY: 0, rZ: -0.15, foreX: -0.4, lX: -0.5, lY: 0, lZ: 0.2, lForeX: -0.9, tY: 0, tX: 0, legL: 0, legR: 0 };
function animateWarrior(dt, moving, speedK) {
  const w = W;
  if (w.bladeRoot) w.bladeRoot.scale.y = bladeVisual();
  visFacing += angDiff(visFacing, player.facing) * damp(28, dt);
  W.root.rotation.y = visFacing;
  if (player.dead) {
    player.deadT += dt;
    W.body.rotation.x = -Math.min(Math.PI / 2, player.deadT * 3);
    W.body.position.y = Math.min(0.3, player.deadT * 0.6);
    return;
  }
  if (moving) player.walkPhase += dt * 11 * speedK;
  const s = moving ? Math.sin(player.walkPhase) : 0;
  const bob = moving ? Math.abs(Math.cos(player.walkPhase)) * 0.09 : Math.sin(performance.now() * 0.003) * 0.02;
  w.body.position.y += (bob - w.body.position.y) * damp(20, dt);
  w.body.rotation.set(0, 0, 0);
  // default arms
  let rX = -0.25 + s * 0.35, rZ = -0.15, rY = 0, foreX = -0.4;
  let lX = -0.5 - s * 0.3, lZ = 0.2, lY = 0, lForeX = -0.9, tY = 0, tX = 0;
  // cape sway
  w.cape.rotation.x = 0.15 + (moving ? 0.35 * speedK : 0) + Math.sin(performance.now() * 0.004) * 0.05;
  const attacking = player.attackT >= 0;
  if (attacking && player.heavy) {
    const p = player.attackT / HEAVY_DUR;
    const wind = Math.min(1, p / 0.46), strike = clamp((p - 0.46) / 0.28, 0, 1), ease = 1 - Math.pow(1 - strike, 3);
    rX = -0.5 - 1.15 * wind + 0.4 * ease;
    rZ = 1.55 * wind - 2.9 * ease;
    tY = 0.9 * wind - 1.7 * ease;
    foreX = -0.55;
    lX = -0.9 - 0.35 * wind;
    lZ = 0.7 * wind - 1.35 * ease;
    lY = 0.2 * wind;
  } else if (attacking) {
    const p = player.attackT / attackDur();
    const wind = Math.min(1, p / 0.25), strike = clamp((p - 0.25) / 0.3, 0, 1), ease = 1 - Math.pow(1 - strike, 3);
    if (player.combo === 0) { // horizontal right-to-left
      rX = -1.5; rZ = -1.2 * wind + 2.2 * ease; rY = 0;
      tY = -0.6 * wind + 1.3 * ease;
      foreX = -0.2;
    } else if (player.combo === 1) { // backhand
      rX = -1.5; rZ = 1.0 * wind - 2.3 * ease;
      tY = 0.6 * wind - 1.3 * ease; foreX = -0.2;
    } else { // overhead slam (spin)
      rX = -0.3 - 2.6 * wind + 3.1 * ease; rZ = -0.2; foreX = -0.3;
      tX = -0.2 * wind + 0.45 * ease;
      w.body.rotation.y = ease * Math.PI * 2;
    }
  }
  if (player.dodgeT >= 0) {
    const k = player.dodgeT / ROLL_TIME;
    const side = player.rollSide || 1;
    if (reduceMotion) {
      w.body.rotation.z = side * Math.sin(Math.min(1, k) * Math.PI) * 0.85;
      w.body.position.y = 0.12;
    } else {
      w.body.rotation.z = side * Math.min(1, k) * Math.PI * 2;
      w.body.position.y = Math.sin(Math.min(1, k) * Math.PI) * 0.42;
    }
    w.body.position.x = side * Math.sin(Math.min(1, k) * Math.PI) * 0.18;
  } else if (Math.abs(w.body.position.x) > 0.001) {
    w.body.position.x = 0;
  }
  // attack poses track tightly (crisp swings); everything else eases
  const k = damp(attacking ? (player.heavy ? 16 : 45) : 14, dt), kl = damp(20, dt);
  pose.rX += (rX - pose.rX) * k; pose.rY += (rY - pose.rY) * k; pose.rZ += (rZ - pose.rZ) * k; pose.foreX += (foreX - pose.foreX) * k;
  pose.lX += (lX - pose.lX) * k; pose.lY += (lY - pose.lY) * k; pose.lZ += (lZ - pose.lZ) * k; pose.lForeX += (lForeX - pose.lForeX) * k;
  pose.tY += (tY - pose.tY) * k; pose.tX += (tX - pose.tX) * k;
  pose.legL += (s * 0.8 - pose.legL) * kl; pose.legR += (-s * 0.8 - pose.legR) * kl;
  w.legs[0].rotation.x = pose.legL; w.legs[1].rotation.x = pose.legR;
  w.torso.rotation.set(pose.tX, pose.tY, 0);
  if (player.hurtT > 0) { player.hurtT -= dt; w.torso.rotation.x -= 0.25 * (player.hurtT / 0.3); }
  w.R.sh.rotation.set(pose.rX, pose.rY, pose.rZ); w.R.fore.rotation.x = pose.foreX;
  w.L.sh.rotation.set(pose.lX, pose.lY, pose.lZ); w.L.fore.rotation.x = pose.lForeX;
}

const camGoal = new THREE.Vector3(), camLook = new THREE.Vector3(0, 1.4, 0), camBase = new THREE.Vector3(), camTgt = new THREE.Vector3();
// light-space basis for texel-snapping the shadow frustum (stops shadow shimmer while moving)
const SUN_OFF = new THREE.Vector3(14, 26, 10);
const lightRot = new THREE.Matrix4().lookAt(SUN_OFF, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
const lightRotInv = lightRot.clone().invert();
const snapV = new THREE.Vector3();
function updateCamera(dt) {
  camYawPitch.dist += (camYawPitch.distT - camYawPitch.dist) * damp(10, dt);
  const { yaw, pitch, dist } = camYawPitch;
  camTgt.set(player.pos.x, 1.6, player.pos.z);
  camGoal.set(camTgt.x + Math.sin(yaw) * Math.cos(pitch) * dist, camTgt.y + Math.sin(pitch) * dist, camTgt.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  clearCamera(camGoal);
  // exponential smoothing (same feel at 30/60/144 fps); shake is applied on top, not fed back into the follow
  camBase.lerp(camGoal, damp(12, dt));
  camLook.lerp(camTgt, damp(20, dt));
  camera.position.copy(camBase);
  if (!shakeAllowed()) shake = 0;
  else if (shake > 0) {
    const amp = shake * 0.4;
    camera.position.x += rand(-1, 1) * amp;
    camera.position.y += rand(-1, 1) * amp;
    shake = Math.max(0, shake - dt * 1.8);
  }
  camera.lookAt(camLook);
  // keep shadow camera around player, snapped to whole shadow-map texels
  const texel = SHADOW_SPAN / SM;
  snapV.set(player.pos.x, 0, player.pos.z).applyMatrix4(lightRotInv);
  snapV.x = Math.round(snapV.x / texel) * texel; snapV.y = Math.round(snapV.y / texel) * texel;
  snapV.applyMatrix4(lightRot);
  sun.target.position.copy(snapV); sun.position.copy(snapV).add(SUN_OFF); sun.target.updateMatrixWorld();
}

// menu camera orbit
let menuT = 0;
function updateMenu(dt) {
  menuT += dt;
  camera.position.set(Math.sin(menuT * 0.2) * 7, 3.2, Math.cos(menuT * 0.2) * 7);
  camera.lookAt(0, 1.4, 0);
  W.root.rotation.y = 0;
  animateWarrior(dt, false, 0);
  W.R.sh.rotation.set(-0.3, 0, -0.4);
}

// ---------- Main loop ----------
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, fps = 60, quality = 2, slowBudget = 0;
function degradeQuality() {
  if (quality <= -1) return;
  quality--;
  if (quality === 1) { renderer.setPixelRatio(1); resize(); }
  else if (quality === 0) {
    renderer.shadowMap.enabled = false;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  } else { renderer.setPixelRatio(0.7); resize(); }
}
function trackFps(dt) {
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; window.__fps = fps; }
  if (state !== 'play' || document.hidden) return;
  if (dt > 0.12) slowBudget += 0.5;
  else if (dt > 0.045) slowBudget += dt;
  else slowBudget = Math.max(0, slowBudget - dt * 2);
  if (slowBudget > 1 && quality > -1) {
    degradeQuality();
    slowBudget = 0;
  }
}
function clearCamera(dest) {
  const ox = player.pos.x, oz = player.pos.z;
  const dx = dest.x - ox, dz = dest.z - oz;
  const a = dx * dx + dz * dz;
  if (a < 1e-4) return;
  let scale = 1;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const fx = ox - o.x, fz = oz - o.z;
    const rr = o.r + 0.45;
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - rr * rr;
    const disc = b * b - 4 * a * c;
    if (disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t > 0.18 && t < scale) scale = t;
  }
  if (scale < 1) { dest.x = ox + dx * scale; dest.z = oz + dz * scale; }
}
const STEP = 1 / 30;
let looping = false;
function loop() {
  requestAnimationFrame(loop);
  const real = clock.getDelta();
  trackFps(real); // measure real frame time (the old code measured the clamped dt, so it over-reported FPS)
  const raw = Math.min(real, 0.1);
  // sub-step long frames instead of slowing the game down below 20 fps
  const n = Math.max(1, Math.ceil(raw / STEP - 1e-6)), dt = raw / n;
  for (let i = 0; i < n; i++) update(dt);
  renderer.render(scene, camera);
}
function update(dt) {
  if (debugFreeze) return;
  for (const t of torches) t.scale.setScalar(1 + Math.sin(performance.now() * 0.02 + t.position.x) * 0.15);
  heroTag.visible = (state === 'play' || state === 'pause' || state === 'upgrade') && !player.dead;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.classList.remove('show'); }
  if (stWarnT > 0) {
    stWarnT -= dt;
    const warn = $('stWarn'), bar = $('stBar');
    if (warn) warn.classList.toggle('hidden', stWarnT <= 0);
    if (stWarnT <= 0 && bar) bar.classList.remove('deny');
  }
  if ((state === 'play' || state === 'upgrade') && !player.dead) runT += dt;
  if (bestWavePending && bannerT <= 0 && state === 'play') { bestWavePending = false; showBanner('BEST WAVE!'); sfx.heal(); }
  else if (bestPending && bannerT <= 0 && state === 'play') { bestPending = false; showBanner('NEW BEST!'); sfx.heal(); }

  if (state === 'menu') { updateMenu(dt); }
  else if (state === 'play' || state === 'over') {
    if (state === 'play') {
      updateCoach(dt);
      if (scoreComboT > 0) { scoreComboT -= dt; if (scoreComboT <= 0) breakScoreCombo(); }
    }
    if (hitStop > 0) { hitStop -= dt; dt *= 0.15; }
    if (state === 'play') {
      const moving = (Math.abs(input.tx || 0) + Math.abs(input.tz || 0) > 0.1) || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
      if (!player.dead) updatePlayer(dt);
      animateWarrior(dt, moving && !player.dead && player.dodgeT < 0, player.heavy ? 0.4 : 1);
      if (player.dead) { if (player.deadT > 1.6) gameOver(); }
      // waves
      if (toSpawn > 0) {
        spawnCd -= dt;
        if (spawnCd <= 0) {
          spawnEnemy(waveMix()); toSpawn--;
          spawnCd = wave <= 3 ? 1.05 : Math.max(0.4, 1.05 - wave * 0.035);
        }
      } else if (!arenaBusy() && !player.dead && !choosingUpgrade) {
        waveTimer -= dt;
        if (waveTimer <= 0) {
          if (wave > 0 && !skipNextClearBonus) {
            score += wave * 25; checkBest();
            player.hp = Math.min(player.maxHp, player.hp + 15);
            skipNextClearBonus = false;
            openUpgrade();
          } else {
            skipNextClearBonus = false;
            startWave(); waveTimer = 2.5;
          }
        } else if (wave > 0 && waveTimer > 2.3 && bannerT <= 0) showBanner('WAVE CLEARED!');
      }
    } else animateWarrior(dt, false, 0);
    updateEnemies(dt);
    updateArrows(dt);
    updateRocks(dt);
    updateWarns(dt);
    updateLanes(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateUI(dt);
  }
}

function clearArena() {
  for (let i = enemies.length - 1; i >= 0; i--) removeEnemy(enemies[i]);
  toSpawn = 0; waveTimer = 999;
  resetFx();
}
// testing hooks
window.__game = {
  renderer, scene, camera,
  get state() { return state; }, get best() { return best; }, get muted() { return muted; },
  togglePause, setMuted,
  get score() { return score; }, setScore(n) { score = Math.max(0, n | 0); },
  get wave() { return wave; }, set wave(v) { wave = v; },
  gameOver,
  get enemies() { return enemies.length; }, roster: enemies, arrows, warns, lanes, rocks,
  player, startGame, input, keys,
  upgrades, get offer() { return upgradeOffer.map(d => d.id); },
  get picks() { return upgradePicks; },
  get yaw() { return camYawPitch.yaw; },
  get bossKind() { return bossRef && !bossRef.dead ? bossRef.type : ''; },
  pickUpgrade(i) { chooseUpgrade(i | 0); },
  step(n, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); },
  spawnAt(type, x, z) {
    spawnEnemy(type);
    const e = enemies[enemies.length - 1];
    if (x != null) e.g.root.position.set(x, 0, z);
    return e;
  },
  clearArena,
  freeze(v) { debugFreeze = !!v; },
  get arrowAlive() { let n = 0; for (let i = 0; i < ARROW_N; i++) if (arrows[i].alive) n++; return n; },
  get warnOn() { for (let i = 0; i < WARN_N; i++) if (warns[i].alive) return true; return false; },
  get bossOn() { return bossShown; },
};

renderer.render(scene, camera);
countHit('toonblade-views');
if (window.__htsBoot) window.__htsBoot(startGame);
else { const el = $('loading'); if (el) el.hidden = true; }
