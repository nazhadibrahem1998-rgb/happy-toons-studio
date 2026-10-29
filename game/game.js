// Happy Toons: Toonblade — © 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.
import * as THREE from './vendor/three.module.min.js';

const $ = id => document.getElementById(id);
// Primary input is touch (phones/tablets). Hybrid laptops start in mouse mode and switch per event.
const isTouch = matchMedia('(pointer: coarse)').matches;
let touchUI = isTouch;
if (isTouch) document.body.classList.add('touch');

// ---------- Renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
const maxDPR = isTouch ? 1.5 : 2;
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
let SM = isTouch ? 1024 : 2048;
sun.shadow.mapSize.set(SM, SM);
const SHADOW_SPAN = 60; // ortho shadow camera width (left..right)
const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 70;
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9a7bff, 0.8);
rim.position.set(-12, 10, -16);
scene.add(rim);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

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
  const m = new THREE.Mesh(pGeo, pMat(0xffffff)); m.visible = false; scene.add(m);
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
const slashMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
const slash = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.5, 24, 1, -Math.PI * 0.45, Math.PI * 0.9), slashMat);
slash.rotation.x = -Math.PI / 2; scene.add(slash);

// ---------- Audio ----------
let actx = null, master = null;
let muted = false; try { muted = localStorage.getItem('toonblade_muted') === '1'; } catch (_) {}
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(actx.destination); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function setMuted(m) {
  muted = m;
  try { localStorage.setItem('toonblade_muted', m ? '1' : '0'); } catch (_) {}
  if (master) master.gain.setTargetAtTime(m ? 0 : 1, actx.currentTime, 0.02);
  updateMuteUI();
}
let noiseBuf = null;
function noise(dur, f0, f1, vol = 0.3, type = 'bandpass') {
  const a = actx; if (!a || muted) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(); s.buffer = noiseBuf;
  const f = a.createBiquadFilter(); f.type = type; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, a.currentTime); f.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur);
  const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  s.connect(f).connect(g).connect(master); s.start(); s.stop(a.currentTime + dur);
}
function tone(dur, f0, f1, vol = 0.2, type = 'square') {
  const a = actx; if (!a || muted) return;
  const o = a.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + dur);
  const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(master); o.start(); o.stop(a.currentTime + dur);
}
const sfx = {
  swing: () => noise(0.18, 600, 3000, 0.25),
  hit: () => { noise(0.12, 900, 200, 0.4, 'lowpass'); tone(0.12, 180, 60, 0.25, 'triangle'); },
  clang: () => { tone(0.25, 1400, 1200, 0.12, 'square'); tone(0.3, 2100, 1900, 0.08, 'sine'); },
  hurt: () => tone(0.25, 300, 90, 0.2, 'sawtooth'),
  dodge: () => noise(0.22, 300, 1200, 0.18),
  die: () => tone(0.4, 400, 50, 0.18, 'square'),
  wave: () => { tone(0.15, 440, 440, 0.12, 'square'); setTimeout(() => tone(0.3, 660, 660, 0.12, 'square'), 150); },
  heal: () => { tone(0.12, 600, 900, 0.12, 'sine'); setTimeout(() => tone(0.2, 900, 1300, 0.12, 'sine'), 100); },
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
  const blade = mesh(new THREE.BoxGeometry(0.1, 1.15, 0.03), mat(0xe8eef8, { metalness: 0.95, roughness: 0.15, emissive: 0x223344 }), 0, 0.75, 0, sword);
  mesh(new THREE.ConeGeometry(0.07, 0.18, 4), mat(0xe8eef8, { metalness: 0.95, roughness: 0.15 }), 0, 1.41, 0, sword).rotation.y = Math.PI / 4;
  mesh(new THREE.SphereGeometry(0.06, 6, 6), gold, 0, -0.17, 0, sword);
  // shield on left forearm
  const shield = new THREE.Group(); shield.position.set(0.1, -0.2, 0.05); L.fore.add(shield);
  const sh = mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 20), mat(0x2f4fb8, { metalness: 0.3, roughness: 0.5 }), 0, 0, 0, shield);
  sh.rotation.z = Math.PI / 2;
  const rimS = mesh(new THREE.TorusGeometry(0.48, 0.05, 6, 24), gold, 0, 0, 0, shield); rimS.rotation.y = Math.PI / 2;
  // yellow star emblem (brand nod)
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.12 : 0.3, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? st.lineTo(x, y) : st.moveTo(x, y); }
  const starM = mesh(new THREE.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: false }), mat(0xffd21f, { emissive: 0x664400, roughness: 0.4 }), 0.05, 0, 0, shield);
  starM.rotation.y = Math.PI / 2;
  shield.rotation.y = 0; // shield faces outward (+x of left arm)
  return { root, body, legs, torso, head, cape, R, L, sword, blade, shield };
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
  if (type === 'goblin' || type === 'brute') {
    const skinC = type === 'brute' ? 0x7a5aa8 : 0x6cbf3a;
    const skin = mat(skinC, { roughness: 0.7 }); const rag = mat(type === 'brute' ? 0x3a2a20 : 0x7a4a2a);
    const legs = [];
    for (const sx of [-0.18, 0.18]) { const hip = new THREE.Group(); hip.position.set(sx, 0.55, 0); body.add(hip); mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 6), skin, 0, -0.25, 0, hip); legs.push(hip); }
    mesh(new THREE.SphereGeometry(0.42, 10, 8), rag, 0, 0.85, 0, body).scale.set(1, 1.05, 0.85);
    const head = new THREE.Group(); head.position.y = 1.45; body.add(head);
    mesh(new THREE.SphereGeometry(0.34, 12, 10), skin, 0, 0, 0, head);
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.1, 0.45, 5), skin, sx * 0.38, 0.05, 0, head); ear.rotation.z = -sx * 1.3; }
    const eyeM = mat(0xffee33, { emissive: 0xffaa00 });
    for (const sx of [-0.12, 0.12]) mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeM, sx, 0.05, 0.29, head);
    mesh(new THREE.ConeGeometry(0.06, 0.18, 5), skin, 0, -0.05, 0.36, head).rotation.x = Math.PI / 2;
    const arm = new THREE.Group(); arm.position.set(-0.45, 1.05, 0); body.add(arm);
    mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 6), skin, 0, -0.25, 0, arm);
    const club = new THREE.Group(); club.position.y = -0.5; club.rotation.x = Math.PI / 2; arm.add(club);
    mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.8, 6), mat(0x6b4426, { flatShading: true }), 0, 0.35, 0, club);
    const arm2 = new THREE.Group(); arm2.position.set(0.45, 1.05, 0); body.add(arm2);
    mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 6), skin, 0, -0.25, 0, arm2);
    parts = { legs, head, arm, arm2, eyeM };
    if (type === 'brute') root.scale.setScalar(1.7);
  } else { // skeleton
    const bone = mat(0xece4cf, { roughness: 0.55 });
    const legs = [];
    for (const sx of [-0.15, 0.15]) { const hip = new THREE.Group(); hip.position.set(sx, 0.85, 0); body.add(hip); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5), bone, 0, -0.4, 0, hip); mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), bone, 0, -0.82, 0.04, hip); legs.push(hip); }
    mesh(new THREE.BoxGeometry(0.36, 0.12, 0.2), bone, 0, 0.88, 0, body);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), bone, 0, 1.2, 0, body);
    for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.2 - i * 0.02, 0.025, 4, 10, Math.PI * 1.6), bone, 0, 1.05 + i * 0.12, 0, body).rotation.set(Math.PI / 2, 0, Math.PI * 0.7);
    const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
    mesh(new THREE.SphereGeometry(0.24, 10, 8), bone, 0, 0, 0, head);
    mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), bone, 0, -0.17, 0.04, head);
    const eyeM = mat(0xff3355, { emissive: 0xff0022 });
    for (const sx of [-0.09, 0.09]) mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeM, sx, 0.02, 0.2, head);
    const arm = new THREE.Group(); arm.position.set(-0.3, 1.45, 0); body.add(arm);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), bone, 0, -0.3, 0, arm);
    const sw = new THREE.Group(); sw.position.y = -0.6; sw.rotation.x = Math.PI / 2; arm.add(sw);
    mesh(new THREE.BoxGeometry(0.07, 0.85, 0.02), mat(0x8890a0, { metalness: 0.6, roughness: 0.5 }), 0, 0.45, 0, sw);
    mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), mat(0x4a3a2a), 0, 0.03, 0, sw);
    const arm2 = new THREE.Group(); arm2.position.set(0.3, 1.45, 0); body.add(arm2);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), bone, 0, -0.3, 0, arm2);
    parts = { legs, head, arm, arm2, eyeM };
  }
  // health bar
  const hb = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false, transparent: true, opacity: 0.8 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), new THREE.MeshBasicMaterial({ color: 0xff3344, depthTest: false }));
  fg.geometry.translate(0.5, 0, 0); fg.position.x = -0.5; fg.position.z = 0.001;
  bg.renderOrder = fg.renderOrder = 10;
  hb.add(bg, fg); hb.position.y = type === 'skeleton' ? 2.25 : 2.0; hb.visible = false;
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
  blocking: false, dodgeT: -1, dodgeDir: new THREE.Vector3(), dodgeCd: 0,
  hurtT: 0, walkPhase: 0, dead: false, deadT: 0,
};
const ATTACK_DUR = 0.42;
const enemies = [];
const pickups = [];
let state = 'menu', score = 0, wave = 0, waveTimer = 0, toSpawn = 0, spawnCd = 0, best = +(localStorage.getItem('toonblade_best') || 0);
let shake = 0, hitStop = 0, runStartBest = best, newBestShown = false, bestPending = false;
const camYawPitch = { yaw: Math.PI, pitch: 0.42, dist: 8.5, distT: 8.5 };
function saveBest() { try { localStorage.setItem('toonblade_best', best); } catch (_) {} }
function checkBest() {
  if (score <= best) return;
  best = score; saveBest(); // save the moment a record is beaten
  if (!newBestShown && runStartBest > 0) { newBestShown = true; bestPending = true; }
}

const ETYPES = {
  goblin: { hp: 30, speed: 4.1, dmg: 9, range: 1.5, windup: 0.45, cd: 1.1, score: 10, r: 0.5 },
  skeleton: { hp: 45, speed: 3.3, dmg: 13, range: 1.8, windup: 0.55, cd: 1.3, score: 20, r: 0.45 },
  brute: { hp: 140, speed: 2.6, dmg: 26, range: 2.4, windup: 0.85, cd: 1.8, score: 75, r: 0.9 },
};
const enemyPool = { goblin: [], skeleton: [], brute: [] };
const spawnV = new THREE.Vector3();
function spawnEnemy(type) {
  let e = enemyPool[type].pop();
  if (!e) { e = { type, g: buildEnemy(type) }; }
  const T = ETYPES[type];
  const hpScale = 1 + (wave - 1) * 0.08;
  Object.assign(e, { hp: T.hp * hpScale, maxHp: T.hp * hpScale, state: 'chase', t: 0, cd: rand(0.3, 1), facing: 0, kb: e.kb ? e.kb.set(0, 0, 0) : new THREE.Vector3(), flash: 0, walk: rand(0, 6), dead: false, deadT: 0, spawnT: 0, struck: false });
  // spawn at arena edge, away from player
  let x, z, tries = 0;
  do { const a = rand(0, Math.PI * 2), d = ARENA_R - 4; x = Math.cos(a) * d; z = Math.sin(a) * d; tries++; }
  while (tries < 10 && Math.hypot(x - player.pos.x, z - player.pos.z) < 10);
  e.g.root.position.set(x, 0, z); e.g.root.rotation.set(0, 0, 0); e.g.body.position.set(0, 0, 0); e.g.body.rotation.set(0, 0, 0);
  e.g.root.visible = true; e.g.hb.visible = false;
  scene.add(e.g.root); enemies.push(e);
  burst(spawnV.set(x, 0.5, z), 0x9a6bff, 14, 4);
}
function removeEnemy(e) { scene.remove(e.g.root); enemyPool[e.type].push(e); enemies.splice(enemies.indexOf(e), 1); }

const potionGeo = new THREE.OctahedronGeometry(0.3, 0);
const potionMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xaa0022, roughness: 0.3 });
function dropPotion(pos) { const m = mesh(potionGeo, potionMat, pos.x, 0.6, pos.z, scene); pickups.push({ m, t: 0 }); }

function startWave() {
  wave++; const n = 2 + wave * 2; toSpawn = n; spawnCd = 0.5;
  showBanner('WAVE ' + wave); sfx.wave();
}
function waveMix() {
  if (wave % 5 === 0 && toSpawn === 1) return 'brute';
  if (wave >= 2 && Math.random() < Math.min(0.55, 0.15 + wave * 0.07)) return 'skeleton';
  return 'goblin';
}

// ---------- Input ----------
const keys = {};
const input = { mx: 0, mz: 0, tx: 0, tz: 0, attack: false, block: false, dodge: false };
let pausedAt = 0, lastTouchT = -1e9, hadLock = false, mouseBlock = false;
const touchBtn = { block: false };
function requestLock() {
  if (document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
}
function clearHeld() { for (const k in keys) keys[k] = false; mouseBlock = false; touchBtn.block = false; input.attack = input.dodge = false; }
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
    if (e.code === 'Space') input.dodge = true;
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) togglePause();
  } else if (state === 'pause') {
    // ignore the same Esc press that released pointer lock and auto-paused
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat && performance.now() - pausedAt > 300) togglePause();
  } else if ((state === 'menu' || state === 'over') && e.code === 'Enter' && !e.repeat && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) startGame();
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); // no page scroll inside itch.io iframe
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { clearHeld(); if (state === 'play') togglePause(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
// mouse: decided per event; compat mouse events synthesized after a touch are ignored
const isSynthMouse = e => (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) || performance.now() - lastTouchT < 800;
canvas.addEventListener('mousedown', e => {
  if (state !== 'play' || isSynthMouse(e)) return;
  noteMouse(); audio(); requestLock();
  if (e.button === 0) input.attack = true;
  if (e.button === 2) mouseBlock = true;
});
addEventListener('mouseup', e => { if (e.button === 2) mouseBlock = false; });
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
let stickId = null, stickC = { x: 0, y: 0 }, lookId = null, lookLast = { x: 0, y: 0 };
function bindBtn(el, down, up) {
  el.addEventListener('touchstart', e => { e.preventDefault(); noteTouch(); audio(); el.classList.add('on'); down(); }, { passive: false });
  const end = e => { e.preventDefault(); el.classList.remove('on'); up && up(); };
  el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
}
bindBtn($('bAttack'), () => input.attack = true);
bindBtn($('bBlock'), () => touchBtn.block = true, () => touchBtn.block = false);
bindBtn($('bDodge'), () => input.dodge = true);
bindBtn($('bPause'), () => { if (state === 'play') togglePause(); });
bindBtn($('bMute'), () => setMuted(!muted));
stick.addEventListener('touchstart', e => {
  e.preventDefault(); noteTouch(); audio();
  const t = e.changedTouches[0]; stickId = t.identifier;
  const r = stick.getBoundingClientRect(); stickC = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  moveStick(t);
}, { passive: false });
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
let bannerT = 0;
function showBanner(t) { banner.textContent = t; banner.classList.add('show'); bannerT = 1.8; }
function pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
// update DOM only when a value changes (no per-frame string/array allocations)
let uiHp = -1, uiSt = -1, uiWave = -1, uiScore = -1, uiLeft = -1;
function updateUI() {
  const hp = player.hp | 0, st = player.st | 0;
  let left = toSpawn; for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) left++;
  if (hp !== uiHp) { uiHp = hp; hpFill.style.width = clamp(player.hp / player.maxHp * 100, 0, 100) + '%'; }
  if (st !== uiSt) { uiSt = st; stFill.style.width = clamp(player.st, 0, 100) + '%'; }
  if (wave !== uiWave) { if (uiWave >= 0) pop(elWave); uiWave = wave; elWave.textContent = wave; }
  if (score !== uiScore) { if (uiScore >= 0 && score > uiScore) pop(elScore); uiScore = score; elScore.textContent = score; }
  if (left !== uiLeft) { uiLeft = left; elLeft.textContent = left; }
}
function updateMuteUI() {
  const icon = muted ? '🔇' : '🔊';
  $('bMute').textContent = icon;
  $('pMute').textContent = icon + (muted ? ' Sound: Off' : ' Sound: On');
}
function showStartBest() { if (best > 0) { $('sBest').textContent = best; $('sBestWrap').classList.remove('hidden'); } }

function resetGame() {
  for (const e of [...enemies]) removeEnemy(e);
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
  Object.assign(player, { hp: 100, st: 100, attackT: -1, combo: 0, comboWindow: 0, blocking: false, dodgeT: -1, dodgeCd: 0, hurtT: 0, dead: false, deadT: 0, facing: 0 });
  player.pos.set(0, 0, 0); player.vel.set(0, 0, 0); W.root.rotation.set(0, 0, 0); W.body.rotation.set(0, 0, 0); W.body.position.set(0, 0, 0);
  visFacing = 0;
  score = 0; wave = 0; toSpawn = 0; waveTimer = 1.0; camYawPitch.yaw = Math.PI;
  uiHp = uiSt = uiWave = uiScore = uiLeft = -1;
  runStartBest = best; newBestShown = false; bestPending = false;
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

function startGame() {
  countHit('toonblade-plays');
  audio(); resetGame(); state = 'play';
  $('start').classList.add('hidden'); $('over').classList.add('hidden'); $('pause').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (touchUI) $('touch').classList.remove('hidden');
  else requestLock();
}
function gameOver() {
  state = 'over'; best = Math.max(best, score); saveBest();
  $('oWave').textContent = wave; $('oScore').textContent = score; $('oBest').textContent = best;
  $('oNew').classList.toggle('hidden', !(score > runStartBest && score > 0));
  $('over').classList.remove('hidden'); $('touch').classList.add('hidden');
  clearHeld();
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
}
function togglePause() {
  if (state === 'play') {
    state = 'pause'; pausedAt = performance.now(); clearHeld();
    $('pause').classList.remove('hidden');
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  } else if (state === 'pause') {
    state = 'play'; $('pause').classList.add('hidden'); clock.getDelta();
    if (!touchUI) requestLock(); // called from a click/key gesture
  }
}
$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
// click / tap anywhere on the pause screen (incl. RESUME) resumes
$('pause').addEventListener('click', () => { if (state === 'pause' && performance.now() - pausedAt > 150) togglePause(); });
$('pMute').addEventListener('click', e => { e.stopPropagation(); audio(); setMuted(!muted); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveBest(); if (state === 'play') togglePause(); } });
addEventListener('pagehide', saveBest);
updateMuteUI(); showStartBest();

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

function damagePlayer(dmg, fromPos) {
  if (player.dead || player.dodgeT >= 0) return false;
  // block check: enemy in front within ~110°
  if (player.blocking && player.st > 0) {
    const a = Math.atan2(fromPos.x - player.pos.x, fromPos.z - player.pos.z);
    if (Math.abs(angDiff(player.facing, a)) < 1.0) {
      player.st -= dmg * 1.6; sfx.clang(); burst(tmpV.set(player.pos.x + Math.sin(player.facing) * 0.7, 1.3, player.pos.z + Math.cos(player.facing) * 0.7), 0xfff0a0, 10, 6);
      shake = Math.max(shake, 0.15);
      if (player.st > 0) return 'blocked';
      dmg *= 0.5; // guard broken
    }
  }
  player.hp -= dmg; player.hurtT = 0.3; sfx.hurt(); shake = Math.max(shake, 0.35);
  dmgFlash.style.opacity = 1; setTimeout(() => dmgFlash.style.opacity = 0, 120);
  burst(tmpV.set(player.pos.x, 1.3, player.pos.z), 0xff3344, 10, 5);
  if (player.hp <= 0) { player.hp = 0; player.dead = true; player.deadT = 0; sfx.die(); }
  return true;
}

function updatePlayer(dt) {
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

  player.blocking = (keys.KeyK || mouseBlock || touchBtn.block) && player.attackT < 0 && player.dodgeT < 0 && player.st > 0;
  player.dodgeCd -= dt; player.comboWindow -= dt;

  if (input.dodge && player.dodgeT < 0 && player.dodgeCd <= 0 && player.st >= 20) {
    player.dodgeT = 0; player.dodgeCd = 0.75; player.st -= 20; player.attackT = -1;
    if (move.lengthSq() > 0.01) player.dodgeDir.copy(move).normalize();
    else player.dodgeDir.set(Math.sin(player.facing), 0, Math.cos(player.facing));
    player.facing = Math.atan2(player.dodgeDir.x, player.dodgeDir.z); sfx.dodge();
  }
  if (input.attack && player.attackT < 0 && player.dodgeT < 0 && player.st >= 8) {
    player.attackT = 0; player.st -= 8; player.hitSet.clear();
    player.combo = player.comboWindow > 0 ? (player.combo + 1) % 3 : 0;
    // auto-aim toward nearest enemy in front-ish
    let best = null, bd = 4;
    for (const e of enemies) { if (e.dead) continue; const d = e.g.root.position.distanceTo(player.pos); if (d < bd) { bd = d; best = e; } }
    if (best) player.facing = Math.atan2(best.g.root.position.x - player.pos.x, best.g.root.position.z - player.pos.z);
    else if (move.lengthSq() > 0.01) player.facing = Math.atan2(move.x, move.z);
    sfx.swing();
  }
  input.attack = input.dodge = false;

  let speed = 6.2;
  if (player.blocking) speed = 2.4;
  if (player.attackT >= 0) speed = 1.2;
  if (player.dodgeT >= 0) {
    player.dodgeT += dt;
    const k = 1 - player.dodgeT / 0.45;
    player.pos.addScaledVector(player.dodgeDir, 15 * Math.max(0.2, k) * dt);
    if (player.dodgeT > 0.45) player.dodgeT = -1;
    player.vel.set(0, 0, 0);
  } else {
    // short acceleration ramp (~55 ms) instead of instant start/stop
    const ka = damp(18, dt);
    player.vel.x += (move.x * speed - player.vel.x) * ka; player.vel.z += (move.z * speed - player.vel.z) * ka;
    player.pos.addScaledVector(player.vel, dt);
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
  if (player.attackT < 0 && player.dodgeT < 0) player.st = Math.min(100, player.st + (player.blocking ? 8 : 26) * dt);

  // attack resolution
  if (player.attackT >= 0) {
    player.attackT += dt;
    const p = player.attackT / ATTACK_DUR;
    if (p > 0.25 && p < 0.6) {
      const reach = player.combo === 2 ? 3.0 : 2.6, arc = player.combo === 2 ? Math.PI : 1.3;
      for (const e of enemies) {
        if (e.dead || player.hitSet.has(e)) continue;
        const ep = e.g.root.position; const dx = ep.x - player.pos.x, dz = ep.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < reach + ETYPES[e.type].r * 0.5 && Math.abs(angDiff(player.facing, Math.atan2(dx, dz))) < arc) {
          player.hitSet.add(e);
          hitEnemy(e, player.combo === 2 ? 22 : 15, dx / (d || 1), dz / (d || 1));
        }
      }
      slashMat.opacity = Math.sin((p - 0.25) / 0.35 * Math.PI) * 0.6;
    } else slashMat.opacity = Math.max(0, slashMat.opacity - dt * 6);
    if (player.attackT > ATTACK_DUR) { player.attackT = -1; player.comboWindow = 0.35; }
  } else slashMat.opacity = Math.max(0, slashMat.opacity - dt * 6);
  slash.position.set(player.pos.x, 1.1, player.pos.z);
  slash.rotation.z = player.facing - Math.PI / 2; // ring lies in XY, tilted onto ground
  slash.rotation.x = -Math.PI / 2 + (player.combo === 1 ? 0.3 : player.combo === 0 ? -0.2 : 0);

  // pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i]; pk.t += dt; pk.m.rotation.y += dt * 2; pk.m.position.y = 0.6 + Math.sin(pk.t * 3) * 0.15;
    if (pk.m.position.distanceTo(tmpV.set(player.pos.x, 0.6, player.pos.z)) < 1.1) {
      player.hp = Math.min(player.maxHp, player.hp + 30); sfx.heal(); burst(pk.m.position, 0x66ff88, 14, 4);
      scene.remove(pk.m); pickups.splice(i, 1);
    } else if (pk.t > 20) { scene.remove(pk.m); pickups.splice(i, 1); }
  }
}

function hitEnemy(e, dmg, nx, nz) {
  e.hp -= dmg; e.flash = 0.12; e.kb.set(nx, 0, nz).multiplyScalar(e.type === 'brute' ? 3 : 9);
  if (e.state === 'windup' && e.type !== 'brute') { e.state = 'stagger'; e.t = 0; }
  sfx.hit(); hitStop = 0.05; shake = Math.max(shake, 0.18);
  const ep = e.g.root.position;
  burst(tmpV.set(ep.x - nx * 0.3, 1.1, ep.z - nz * 0.3), e.type === 'skeleton' ? 0xf4ecd8 : 0xfff07a, 10, 6);
  burst(tmpV, 0xffffff, 4, 8);
  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0; score += ETYPES[e.type].score * (1 + Math.floor(wave / 3)); checkBest(); sfx.die();
    burst(tmpV.set(ep.x, 0.8, ep.z), e.type === 'skeleton' ? 0xece4cf : e.type === 'brute' ? 0x7a5aa8 : 0x6cbf3a, 22, 7);
    if (Math.random() < (e.type === 'brute' ? 1 : 0.14)) dropPotion(ep);
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], T = ETYPES[e.type], g = e.g, p = g.root.position;
    if (e.dead) {
      e.deadT += dt;
      g.body.rotation.x = Math.min(Math.PI / 2, e.deadT * 6) * -1;
      g.root.position.y = -Math.max(0, e.deadT - 0.6) * 1.5;
      g.hb.visible = false;
      if (e.deadT > 1.4) removeEnemy(e);
      continue;
    }
    e.spawnT += dt;
    const dx = player.pos.x - p.x, dz = player.pos.z - p.z, d = Math.hypot(dx, dz);
    const toP = Math.atan2(dx, dz);
    e.cd -= dt; e.t += dt;
    // knockback
    if (e.kb.lengthSq() > 0.01) { p.addScaledVector(e.kb, dt); e.kb.multiplyScalar(Math.pow(0.002, dt)); }
    let moving = false;
    if (player.dead) { e.state = 'idle'; }
    else if (e.state === 'chase') {
      e.facing += angDiff(e.facing, toP) * damp(8, dt);
      if (d > T.range * 0.9) {
        const sp = T.speed * (1 + wave * 0.02);
        p.x += Math.sin(e.facing) * sp * dt; p.z += Math.cos(e.facing) * sp * dt; moving = true;
      } else if (e.cd <= 0) { e.state = 'windup'; e.t = 0; }
    } else if (e.state === 'windup') {
      e.facing += angDiff(e.facing, toP) * damp(4, dt);
      if (e.t >= T.windup) {
        e.state = 'strike'; e.t = 0; e.struck = false;
      }
    } else if (e.state === 'strike') {
      if (!e.struck && e.t > 0.06) {
        e.struck = true;
        if (d < T.range + 0.4 && Math.abs(angDiff(e.facing, toP)) < 1.2) {
          const r = damagePlayer(T.dmg, p);
          if (r === 'blocked' && e.type !== 'brute') { e.state = 'stagger'; e.t = 0; e.kb.set(-dx / d, 0, -dz / d).multiplyScalar(6); }
        }
      }
      if (e.state === 'strike' && e.t > 0.3) { e.state = 'chase'; e.cd = T.cd * rand(0.8, 1.3); }
    } else if (e.state === 'stagger') {
      if (e.t > 0.5) { e.state = 'chase'; e.cd = 0.4; }
    } else if (e.state === 'idle') { /* victory idle */ }
    // separation
    for (const o of enemies) {
      if (o === e || o.dead) continue;
      const op = o.g.root.position, sx = p.x - op.x, sz = p.z - op.z, sd = Math.hypot(sx, sz), m = T.r + ETYPES[o.type].r;
      if (sd < m && sd > 1e-4) { p.x += sx / sd * (m - sd) * 0.5; p.z += sz / sd * (m - sd) * 0.5; }
    }
    collide(p, T.r);
    // animation
    g.root.rotation.y = e.facing;
    if (moving) e.walk += dt * T.speed * 2.6;
    const sw = moving ? Math.sin(e.walk) : 0;
    g.legs[0].rotation.x = sw * 0.7; g.legs[1].rotation.x = -sw * 0.7;
    g.body.position.y = moving ? Math.abs(Math.cos(e.walk)) * 0.08 : 0;
    let armX = -0.3 + sw * 0.3;
    if (e.state === 'windup') armX = -2.6 * Math.min(1, e.t / T.windup);
    else if (e.state === 'strike') armX = -2.6 + Math.min(1, e.t / 0.12) * 3.4;
    else if (e.state === 'stagger') { armX = 0.4; g.body.rotation.x = -0.25; }
    if (e.state !== 'stagger') g.body.rotation.x = e.state === 'windup' ? -0.15 : e.state === 'strike' ? 0.2 : 0;
    g.arm.rotation.x = armX; g.arm2.rotation.x = -sw * 0.4;
    // telegraph: eyes glow during windup; hit flash
    const glow = e.state === 'windup' ? 1 : 0;
    g.root.scale.setScalar((e.type === 'brute' ? 1.7 : 1) * (1 + (e.flash > 0 ? 0.08 : 0)) * Math.min(1, e.spawnT * 3 + 0.01));
    e.flash -= dt;
    g.eyeM.emissiveIntensity = 1 + glow * 3;
    // health bar
    g.hb.visible = e.hp < e.maxHp;
    g.hbFill.scale.x = Math.max(0.001, e.hp / e.maxHp);
    g.hb.quaternion.copy(camera.quaternion).premultiply(tmpQ.copy(g.root.quaternion).invert());
  }
}
const tmpQ = new THREE.Quaternion();

// blended pose so limbs ease between idle / walk / block / attack instead of snapping
const pose = { rX: -0.25, rY: 0, rZ: -0.15, foreX: -0.4, lX: -0.5, lY: 0, lZ: 0.2, lForeX: -0.9, tY: 0, tX: 0, legL: 0, legR: 0, shieldY: -0.9 };
function animateWarrior(dt, moving, speedK) {
  const w = W;
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
  if (attacking) {
    const p = player.attackT / ATTACK_DUR;
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
  if (player.blocking) { lX = -1.45; lZ = -0.45; lY = 0; lForeX = -0.25; tY = -0.15; }
  if (player.dodgeT >= 0) {
    const k = player.dodgeT / 0.45;
    w.body.rotation.x = k * Math.PI * 2; w.body.position.y = Math.sin(k * Math.PI) * 0.5;
  }
  // attack poses track tightly (crisp swings); everything else eases
  const k = damp(attacking ? 45 : player.blocking ? 22 : 14, dt), kl = damp(20, dt);
  pose.rX += (rX - pose.rX) * k; pose.rY += (rY - pose.rY) * k; pose.rZ += (rZ - pose.rZ) * k; pose.foreX += (foreX - pose.foreX) * k;
  pose.lX += (lX - pose.lX) * k; pose.lY += (lY - pose.lY) * k; pose.lZ += (lZ - pose.lZ) * k; pose.lForeX += (lForeX - pose.lForeX) * k;
  pose.tY += (tY - pose.tY) * k; pose.tX += (tX - pose.tX) * k;
  pose.legL += (s * 0.8 - pose.legL) * kl; pose.legR += (-s * 0.8 - pose.legR) * kl;
  pose.shieldY += ((player.blocking ? -1.2 : -0.9) - pose.shieldY) * k;
  w.legs[0].rotation.x = pose.legL; w.legs[1].rotation.x = pose.legR;
  w.torso.rotation.set(pose.tX, pose.tY, 0);
  if (player.hurtT > 0) { player.hurtT -= dt; w.torso.rotation.x -= 0.25 * (player.hurtT / 0.3); }
  w.R.sh.rotation.set(pose.rX, pose.rY, pose.rZ); w.R.fore.rotation.x = pose.foreX;
  w.L.sh.rotation.set(pose.lX, pose.lY, pose.lZ); w.L.fore.rotation.x = pose.lForeX;
  w.shield.rotation.y = pose.shieldY;
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
  // exponential smoothing (same feel at 30/60/144 fps); shake is applied on top, not fed back into the follow
  camBase.lerp(camGoal, damp(12, dt));
  camLook.lerp(camTgt, damp(20, dt));
  camera.position.copy(camBase);
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.4; camera.position.y += rand(-1, 1) * shake * 0.4; shake = Math.max(0, shake - dt * 1.8); }
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
let fpsAcc = 0, fpsN = 0, fps = 60, lowFpsTime = 0, quality = 2;
function trackFps(dt) {
  fpsAcc += dt; fpsN++;
  if (fpsAcc < 1) return;
  fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; window.__fps = fps;
  if (state !== 'play' || document.hidden) return;
  // adaptive quality: needs 3 *consecutive* slow seconds (old counter never reset)
  lowFpsTime = fps < 45 ? lowFpsTime + 1 : 0;
  if (lowFpsTime >= 3 && quality > 0) {
    quality--; lowFpsTime = 0;
    if (quality === 1) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1)); resize(); }
    else { SM = Math.max(512, SM / 2); sun.shadow.mapSize.set(SM, SM); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  }
}
const STEP = 1 / 30;
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
  for (const t of torches) t.scale.setScalar(1 + Math.sin(performance.now() * 0.02 + t.position.x) * 0.15);
  heroTag.visible = (state === 'play' || state === 'pause') && !player.dead;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.classList.remove('show'); }
  if (bestPending && bannerT <= 0 && state === 'play') { bestPending = false; showBanner('NEW BEST!'); sfx.heal(); }

  if (state === 'menu') { updateMenu(dt); }
  else if (state === 'play' || state === 'over') {
    if (hitStop > 0) { hitStop -= dt; dt *= 0.15; }
    if (state === 'play') {
      const moving = (Math.abs(input.tx || 0) + Math.abs(input.tz || 0) > 0.1) || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
      if (!player.dead) updatePlayer(dt);
      animateWarrior(dt, moving && !player.dead && player.dodgeT < 0, player.blocking ? 0.5 : 1);
      if (player.dead) { if (player.deadT > 1.6) gameOver(); }
      // waves
      if (toSpawn > 0) { spawnCd -= dt; if (spawnCd <= 0) { spawnEnemy(waveMix()); toSpawn--; spawnCd = Math.max(0.35, 1.1 - wave * 0.05); } }
      else if (enemies.length === 0 && !player.dead) {
        waveTimer -= dt;
        if (waveTimer <= 0) { if (wave > 0) { score += wave * 25; checkBest(); player.hp = Math.min(player.maxHp, player.hp + 15); } startWave(); waveTimer = 2.5; }
        else if (wave > 0 && waveTimer > 2.3 && bannerT <= 0) showBanner('WAVE CLEARED!');
      }
    } else animateWarrior(dt, false, 0);
    updateEnemies(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateUI();
  }
}

// testing hooks
window.__game = { renderer, scene, get state() { return state; }, get best() { return best; }, get muted() { return muted; }, togglePause, setMuted, get score() { return score; }, get wave() { return wave; }, get enemies() { return enemies.length; }, player, startGame, input, keys, step(n, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); } };

$('loading').remove();
countHit('toonblade-views');
loop();
