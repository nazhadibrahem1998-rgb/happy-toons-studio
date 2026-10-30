// خەلیفەکان (Khalifakan) — © 2026 Nazhad Ibrahem – Happy Toons Studio. Made with AI assistance.
import * as THREE from './vendor/three.module.min.js';

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const Q = new URLSearchParams(location.search);

// ---------- utils ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dampAng = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
const ease = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - (1 - t) * (1 - t);
const KD = '٠١٢٣٤٥٦٧٨٩';
const kn = n => String(n).replace(/\d/g, d => KD[d]);
let seed = 1337;
const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---------- renderer ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance', stencil: false });
const DPR = Math.min(devicePixelRatio || 1, isTouch ? 1.5 : 2);
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x5a4630, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 2.4);
sun.castShadow = true;
const SM = isTouch ? 1024 : 2048;
sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(0.55, 0.75, 0.35).normalize();
scene.fog = new THREE.Fog(0xc9b79a, 45, 190);

// sky dome
const skyU = { top: { value: new THREE.Color(0x4a7ab8) }, bot: { value: new THREE.Color(0xe8d2ac) }, sunC: { value: new THREE.Color(0xfff0c8) }, sunD: { value: SUN_DIR.clone() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top,bot,sunC,sunD; varying vec3 vP; void main(){ float h=clamp(vP.y*1.6+0.12,0.,1.); vec3 c=mix(bot,top,pow(h,0.8)); float s=max(dot(vP,sunD),0.); c+=sunC*(pow(s,600.)*2.+pow(s,12.)*0.25); gl_FragColor=vec4(c,1.); }'
}));
sky.renderOrder = -1;
scene.add(sky);

// ---------- audio (WebAudio, procedural) ----------
const Audio = (() => {
  let ctx = null, master = null, musicG = null, muted = false, noiseBuf = null, nextBeat = 0, beatI = 0, musicOn = false, droneNodes = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    musicG = ctx.createGain(); musicG.gain.value = 0.22; musicG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function noise(t, dur, f0, f1, q, vol, type = 'bandpass', dest = master) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function tone(t, dur, f0, f1, vol, type = 'sine', dest = master) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  const ok = () => ctx && !muted;
  const S = {
    init,
    swing(heavy) { if (!ok()) return; const t = ctx.currentTime; noise(t, heavy ? 0.32 : 0.18, heavy ? 500 : 900, heavy ? 2200 : 3800, 1.2, heavy ? 0.35 : 0.22); },
    hit(heavy) { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.18, heavy ? 120 : 170, 45, 0.6); noise(t, 0.12, 2500, 600, 0.8, 0.35); },
    clang() { if (!ok()) return; const t = ctx.currentTime; [1, 2.76, 5.4].forEach((m, i) => tone(t, 0.35 - i * 0.08, 520 * m, 500 * m, 0.12, 'triangle')); noise(t, 0.08, 6000, 3000, 2, 0.2); },
    hurt() { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.25, 220, 90, 0.35, 'sawtooth'); noise(t, 0.15, 1200, 300, 0.7, 0.3); },
    whoosh() { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.3, 300, 1400, 0.9, 0.25); },
    jump() { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.15, 400, 900, 1, 0.12); },
    land() { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.12, 90, 40, 0.3); },
    slam() { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.6, 70, 28, 0.9); noise(t, 0.5, 900, 80, 0.6, 0.6, 'lowpass'); },
    death() { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.6, 180, 60, 0.3, 'sawtooth'); },
    pickup() { if (!ok()) return; const t = ctx.currentTime; [660, 880, 1320].forEach((f, i) => tone(t + i * 0.07, 0.2, f, f, 0.15, 'triangle')); },
    roar() { if (!ok()) return; const t = ctx.currentTime; tone(t, 1.4, 110, 55, 0.5, 'sawtooth'); tone(t, 1.4, 82, 41, 0.4, 'square'); noise(t, 1.3, 600, 150, 0.5, 0.35, 'lowpass'); },
    ui() { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.08, 700, 900, 0.12, 'triangle'); },
    win() { if (!ok()) return; const t = ctx.currentTime; [392, 494, 587, 784].forEach((f, i) => tone(t + i * 0.16, 0.5, f, f, 0.2, 'triangle')); },
    lose() { if (!ok()) return; const t = ctx.currentTime; [392, 349, 311, 262].forEach((f, i) => tone(t + i * 0.22, 0.55, f, f * 0.98, 0.2, 'triangle')); },
    music(on) {
      musicOn = on; if (!ctx) return;
      if (on && !droneNodes) {
        const g = ctx.createGain(); g.gain.value = 0.05; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 73.4; o2.frequency.value = 110.2;
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(musicG); o1.start(); o2.start(); droneNodes = [o1, o2, g];
        nextBeat = ctx.currentTime + 0.1;
      } else if (!on && droneNodes) { droneNodes[0].stop(); droneNodes[1].stop(); droneNodes = null; }
    },
    tick(intensity) {
      // daf-style rhythm (dum . tek tek dum . tek .)
      if (!ctx || !musicOn || muted) return;
      const bpm = 96 + intensity * 30, step = 60 / bpm / 2;
      while (nextBeat < ctx.currentTime + 0.15) {
        const p = [2, 0, 1, 1, 2, 0, 1, 0][beatI % 8], t = nextBeat;
        if (p === 2) { tone(t, 0.3, 95, 50, 0.55, 'sine', musicG); noise(t, 0.08, 1500, 400, 0.8, 0.15, 'bandpass', musicG); }
        if (p === 1) { noise(t, 0.07, 3200, 2000, 1.5, 0.22, 'bandpass', musicG); tone(t, 0.06, 420, 380, 0.08, 'triangle', musicG); }
        if (beatI % 16 === 0 && intensity > 0.5) noise(t, 0.6, 2500, 4000, 0.5, 0.08, 'highpass', musicG);
        nextBeat += step; beatI++;
      }
    },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.7; return muted; },
    get muted() { return muted; }
  };
  return S;
})();

// ---------- textures ----------
function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; return t;
}
const stoneTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8a7a66'; g.fillRect(0, 0, w, h);
  let y = 0; seed = 7;
  while (y < h) {
    const rh = 18 + srand() * 18; let x = -srand() * 30;
    while (x < w) {
      const rw = 26 + srand() * 34, v = 110 + srand() * 60 | 0;
      g.fillStyle = `rgb(${v + 12},${v},${v - 18})`; g.beginPath(); g.roundRect(x + 2, y + 2, rw - 4, rh - 4, 5); g.fill();
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + rh - 6, rw - 4, 3);
      x += rw;
    }
    y += rh;
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${srand() > .5 ? 255 : 0},${srand() > .5 ? 240 : 0},200,${srand() * .06})`; g.fillRect(srand() * w, srand() * h, 2, 2); }
});
const clothTex = canvasTex(64, 64, (g, w, h) => { // red/white jamana check
  g.fillStyle = '#efe6d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3261e';
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) g.fillRect(i * 8 + 1, j * 8 + 1, 6, 6);
  g.fillStyle = 'rgba(80,0,0,.4)'; for (let i = 0; i < 8; i++) g.fillRect(i * 8 + 3, 0, 2, h);
}, 2);
const sashTex = canvasTex(64, 32, (g, w, h) => {
  g.fillStyle = '#7a1a14'; g.fillRect(0, 0, w, h);
  const cols = ['#d9a53a', '#1f5a3a', '#e8dcc0', '#2a3d7a'];
  for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.fillRect(0, i * 4 + 1, w, 1.5); }
}, 1);

// ---------- materials ----------
const matCache = new Map();
function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o));
  matCache.set(k, m); return m;
}
const METAL = M(0xb8bcc4, { roughness: 0.32, metalness: 0.85 });
const DARKMETAL = M(0x4a4c52, { roughness: 0.45, metalness: 0.8 });
const GOLD = M(0xc9973a, { roughness: 0.35, metalness: 0.9 });
const WOOD = M(0x6b4424, { roughness: 0.9 });
const DARKWOOD = M(0x3e2614, { roughness: 0.9 });
const LEATHER = M(0x4a2e1a, { roughness: 0.8 });

// ---------- geometry helpers ----------
function mergeGeoms(list) { // [{geo, color}] -> one non-indexed geometry with vertex colors
  let total = 0; const parts = list.map(({ geo, color, uvScale }) => { const g = geo.index ? geo.toNonIndexed() : geo; total += g.attributes.position.count; return { g, color, uvScale }; });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0; const c = new THREE.Color();
  for (const { g, color, uvScale = 1 } of parts) {
    const n = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) for (let i = 0; i < n; i++) { uv[(o + i) * 2] = g.attributes.uv.array[i * 2] * uvScale; uv[(o + i) * 2 + 1] = g.attributes.uv.array[i * 2 + 1] * uvScale; }
    const ca = g.attributes.color;
    for (let i = 0; i < n; i++) { if (ca) c.fromArray(ca.array, i * 3); else c.set(color); col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere(); return out;
}
const tf = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  return geo.clone().applyMatrix4(m);
};
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = ease(xf), v = ease(zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, z * 4.3) * 0.17;

// ---------- world ----------
const ARENA = 23.2;
const colliders = []; // {x,z,r}
function groundH(x, z) {
  const r = Math.hypot(x, z);
  if (r < 26) return 0;
  const k = r - 26;
  return Math.pow(k, 1.25) * 0.16 * (0.55 + fbm(x * 0.04, z * 0.04)) + (fbm(x * 0.15, z * 0.15) - 0.5) * Math.min(1, k * 0.2) * 1.2;
}
function buildWorld() {
  // ground
  const gg = new THREE.PlaneGeometry(320, 320, 110, 110); gg.rotateX(-Math.PI / 2);
  const p = gg.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
  const grassA = new THREE.Color(0x6f7f3a), grassB = new THREE.Color(0x8d8a45), dirt = new THREE.Color(0x9a7f5c), rock = new THREE.Color(0x857462), dry = new THREE.Color(0xa99456);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), h = groundH(x, z);
    p.setY(i, h);
    const n = fbm(x * 0.08, z * 0.08);
    c.copy(grassA).lerp(grassB, n).lerp(dry, clamp((fbm(x * .02 + 9, z * .02) - .45) * 2, 0, 1) * .6);
    if (r < 21) c.lerp(dirt, clamp((21 - r) / 6, 0, 1) * (0.55 + n * 0.45));
    if (h > 9) c.lerp(rock, clamp((h - 9) / 10, 0, 1));
    c.multiplyScalar(0.92 + hash2(x * 3, z * 3) * 0.12);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);

  // mountains (one merged mesh)
  const mt = []; seed = 42;
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU + srand() * 0.2, r = 120 + srand() * 60, hgt = 45 + srand() * 55, rad = 28 + srand() * 30;
    const g = new THREE.ConeGeometry(rad, hgt, 9, 5, true); const pp = g.attributes.position;
    const cc = new Float32Array(pp.count * 3);
    for (let j = 0; j < pp.count; j++) {
      const y = pp.getY(j) + hgt / 2, t = y / hgt;
      const jx = pp.getX(j), jz = pp.getZ(j), nn = hash2(jx * 0.3 + i, jz * 0.3 + y);
      if (t > 0.02 && t < 0.98) { pp.setX(j, jx * (0.85 + nn * 0.3)); pp.setZ(j, jz * (0.85 + nn * 0.3)); pp.setY(j, pp.getY(j) + (nn - 0.5) * hgt * 0.08); }
      c.set(0x6d5f50).lerp(new THREE.Color(0x8b7b66), nn);
      if (t < 0.25) c.lerp(new THREE.Color(0x5d6a38), (0.25 - t) * 3);
      if (t > 0.7 + nn * 0.1) c.set(0xeef2f5);
      cc[j * 3] = c.r; cc[j * 3 + 1] = c.g; cc[j * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    mt.push({ geo: tf(g, Math.cos(a) * r, hgt / 2 - 6, Math.sin(a) * r, 0, srand() * 3, 0) });
  }
  const mg = mergeGeoms(mt); mg.computeVertexNormals();
  scene.add(new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));

  // stone village (two merged meshes)
  const walls = [], deco = []; seed = 99;
  const houseSpots = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + (srand() - .5) * 0.25; houseSpots.push([a, 28 + srand() * 9]); }
  for (let i = 0; i < 9; i++) houseSpots.push([srand() * TAU, 40 + srand() * 14]);
  houseSpots.push([0.6, 19.5], [2.75, 20], [4.6, 19.8]); // inside arena edge: cover
  for (const [a, r] of houseSpots) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r, w = 3.6 + srand() * 2.6, d = 3.4 + srand() * 2, h = 2.6 + srand() * 1.4;
    const y = Math.min(groundH(x, z), groundH(x + 2, z + 2), groundH(x - 2, z - 2)) - 0.3, ry = -a + Math.PI / 2 + (srand() - .5) * 0.3;
    const rot = (gx, gz) => [x + gx * Math.cos(ry) + gz * Math.sin(ry), z - gx * Math.sin(ry) + gz * Math.cos(ry)];
    const tint = new THREE.Color().setHSL(0.08, 0.15 + srand() * 0.1, 0.6 + srand() * 0.12);
    walls.push({ geo: tf(new THREE.BoxGeometry(w, h + 0.3, d), x, y + (h + 0.3) / 2, z, 0, ry), color: tint, uvScale: Math.max(w, h) / 2.2 });
    // flat earthen roof + parapet
    deco.push({ geo: tf(new THREE.BoxGeometry(w + 0.35, 0.28, d + 0.35), x, y + h + 0.44, z, 0, ry), color: 0x8a6f4f });
    // beam ends on the front
    const nb = Math.floor(w / 0.6);
    for (let b = 0; b < nb; b++) { const [bx, bz] = rot(-w / 2 + 0.3 + b * (w - 0.6) / Math.max(1, nb - 1), -d / 2 - 0.12); deco.push({ geo: tf(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 5), bx, y + h + 0.18, bz, Math.PI / 2, ry, 0), color: 0x4a3018 }); }
    // door + windows (towards village centre: -z local)
    { const [dx, dz] = rot((srand() - .5) * w * 0.4, -d / 2 - 0.02); deco.push({ geo: tf(new THREE.BoxGeometry(0.9, 1.75, 0.12), dx, y + 0.3 + 0.87, dz, 0, ry), color: 0x3a2414 }); }
    for (const s of [-1, 1]) if (srand() > 0.3) { const [wx, wz] = rot(s * w * 0.32, -d / 2 - 0.02); deco.push({ geo: tf(new THREE.BoxGeometry(0.55, 0.6, 0.1), wx, y + 0.3 + h * 0.6, wz, 0, ry), color: 0x1d140c }); }
    if (r < 24) colliders.push({ x, z, r: Math.max(w, d) * 0.6 });
  }
  const wallMesh = new THREE.Mesh(mergeGeoms(walls), new THREE.MeshStandardMaterial({ map: stoneTex, vertexColors: true, roughness: 0.95 }));
  wallMesh.castShadow = wallMesh.receiveShadow = true; scene.add(wallMesh);
  // dry stone ring wall (boundary)
  const ringW = [];
  for (let i = 0; i < 64; i++) {
    if (i % 16 === 3 || i % 16 === 4) continue; // gaps
    const a = i / 64 * TAU, r = ARENA + 1.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    ringW.push({ geo: tf(new THREE.BoxGeometry(2.45, 0.75 + hash2(i, 3) * 0.3, 0.7), x, 0.38, z, 0, -a + Math.PI / 2), color: 0xb7a890, uvScale: 1.2 });
  }
  const ring = new THREE.Mesh(mergeGeoms(ringW), wallMesh.material); ring.castShadow = ring.receiveShadow = true; scene.add(ring);

  // oak trees (instanced), poplars, rocks
  const oak = [{ geo: tf(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6), 0, 1.1, 0), color: 0x4b3423 }];
  [[0, 2.9, 0, 1.25], [0.75, 2.6, 0.3, 0.9], [-0.7, 2.7, -0.2, 0.95], [0.1, 3.5, -0.5, 0.85], [-0.2, 2.4, 0.7, 0.8]].forEach(([x, y, z, s], i) =>
    oak.push({ geo: tf(new THREE.IcosahedronGeometry(s, 0), x, y, z, i, i * 2, 0), color: [0x4d6227, 0x5b6f2c, 0x45581f, 0x637530, 0x55692a][i] }));
  const oakGeo = mergeGeoms(oak); oakGeo.computeVertexNormals();
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const pop = [{ geo: tf(new THREE.CylinderGeometry(0.1, 0.16, 1.6, 5), 0, 0.8, 0), color: 0x5a4430 }, { geo: tf(new THREE.ConeGeometry(0.75, 5.5, 7, 2), 0, 4.0, 0), color: 0x56702c }, { geo: tf(new THREE.ConeGeometry(0.6, 3.5, 7, 1), 0, 5.5, 0, 0, 1), color: 0x627a33 }];
  const popGeo = mergeGeoms(pop); popGeo.computeVertexNormals();
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8c7d6b, roughness: 1, flatShading: true });
  const place = (n, rMin, rMax, avoid) => { const out = []; let tries = 0; while (out.length < n && tries++ < n * 30) { const a = srand() * TAU, r = rMin + srand() * (rMax - rMin), x = Math.cos(a) * r, z = Math.sin(a) * r; if (avoid && houseSpots.some(([ha, hr]) => Math.hypot(Math.cos(ha) * hr - x, Math.sin(ha) * hr - z) < 4.5)) continue; out.push([x, z]); } return out; };
  const inst = (geo, mat, spots, sMin, sMax, cast, sink = 0) => {
    const im = new THREE.InstancedMesh(geo, mat, spots.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    spots.forEach(([x, z], i) => { const s = sMin + srand() * (sMax - sMin); e.set(0, srand() * TAU, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, groundH(x, z) - sink * s, z), q, new THREE.Vector3(s, s * (0.85 + srand() * 0.3), s)); im.setMatrixAt(i, m4); });
    im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
  };
  seed = 5;
  const inner = place(5, 16, 21.5, true); inner.forEach(([x, z]) => colliders.push({ x, z, r: 0.55 }));
  inst(oakGeo, treeMat, inner.concat(place(70, 26, 95, true)), 0.9, 1.6, true);
  inst(popGeo, treeMat, place(26, 27, 50, true), 0.9, 1.3, true);
  const innerRocks = place(4, 12, 20, true); innerRocks.forEach(([x, z]) => colliders.push({ x, z, r: 0.9 }));
  inst(rockGeo, rockMat, innerRocks, 0.8, 1.1, true, 0.35);
  inst(rockGeo, rockMat, place(60, 26, 110, false), 0.6, 2.8, false, 0.4);
  // grass tufts
  const tuft = mergeGeoms([0, 1, 2].map(i => ({ geo: tf(new THREE.ConeGeometry(0.06, 0.45, 3), Math.cos(i * 2.1) * 0.12, 0.2, Math.sin(i * 2.1) * 0.12, Math.cos(i * 2.1) * 0.3, 0, Math.sin(i * 2.1) * 0.3), color: 0x7a8a3c })));
  inst(tuft, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), place(isTouch ? 350 : 700, 6, 45, false), 0.8, 1.6, false);
  // deco: roofs, beams, doors
  const decoMesh = new THREE.Mesh(mergeGeoms(deco), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  decoMesh.castShadow = true; decoMesh.receiveShadow = true; scene.add(decoMesh);
}
const STAGE_LOOKS = [
  { top: 0x4f86c6, bot: 0xe9dcc0, sun: 0xfff0d0, sunI: 2.5, hemi: 0.9, fog: 0xcfc4ac, dir: [0.55, 0.8, 0.35], exp: 1.05 },
  { top: 0x5a7fb5, bot: 0xf0c890, sun: 0xffd29a, sunI: 2.4, hemi: 0.8, fog: 0xd8b98c, dir: [-0.6, 0.55, 0.4], exp: 1.05 },
  { top: 0x3b4f80, bot: 0xf09a5a, sun: 0xffa060, sunI: 2.2, hemi: 0.7, fog: 0xc98d62, dir: [0.7, 0.32, -0.5], exp: 1.1 },
  { top: 0x2a2440, bot: 0xd0603a, sun: 0xff9a6a, sunI: 2.7, hemi: 0.85, fog: 0x8a4a34, dir: [-0.4, 0.45, -0.75], exp: 1.2 },
];
function applyLook(i) {
  const L = STAGE_LOOKS[i];
  skyU.top.value.set(L.top); skyU.bot.value.set(L.bot); skyU.sunC.value.set(L.sun);
  SUN_DIR.set(...L.dir).normalize(); skyU.sunD.value.copy(SUN_DIR);
  sun.color.set(L.sun); sun.intensity = L.sunI; hemi.intensity = L.hemi; scene.fog.color.set(L.fog);
  renderer.toneMappingExposure = L.exp;
}

// ---------- weapons ----------
const G = { // shared geometries
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 12, 9), sphLo: new THREE.SphereGeometry(1, 7, 5), cone: new THREE.ConeGeometry(1, 1, 6), ico: new THREE.IcosahedronGeometry(1, 0),
};
function part(geo, mat, sx, sy, sz, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = shadow; return m;
}
const alongZ = (geo, mat, r, len, z0, rTopScale = 1) => { const m = part(geo, mat, r, len, r, 0, 0, z0 + len / 2, Math.PI / 2); return m; };
function curvedBlade(len, width, curve, mat, thick = 0.012) {
  const s = new THREE.Shape(), N = 10;
  const f = t => curve * t * t;
  s.moveTo(-width * 0.5, 0);
  for (let i = 1; i <= N; i++) { const t = i / N; s.lineTo(f(t) - width * 0.5 * (1 - t * 0.85), t * len); }
  for (let i = N; i >= 0; i--) { const t = i / N; s.lineTo(f(t) + width * 0.5 * (1 - t) + (i === N ? 0 : 0.004), t * len); }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
  g.translate(0, 0, -thick / 2); g.rotateX(Math.PI / 2); // shape Y -> +Z
  g.rotateZ(Math.PI / 2); // flat side faces sideways
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
function buildWeapon(type, glow) {
  const w = new THREE.Group(); const add = m => (w.add(m), m);
  const grip = (len = 0.16, back = 0.04) => add(alongZ(G.cyl, LEATHER, 0.022, len, -back));
  const bladeMat = glow ? M(0x2b2b33, { roughness: 0.3, metalness: 0.9, emissive: 0xff4a10, emissiveIntensity: 0.0 }) : METAL;
  if (glow) bladeMat.userData.keep = true;
  switch (type) {
    case 'club': add(part(new THREE.CylinderGeometry(0.075, 0.03, 0.9, 7), WOOD, 1, 1, 1, 0, 0, 0.4, Math.PI / 2)); add(part(G.sphLo, DARKWOOD, 0.05, 0.04, 0.05, 0.05, 0, 0.62)); add(part(G.sphLo, DARKWOOD, 0.045, 0.04, 0.045, -0.05, 0.02, 0.5)); break;
    case 'sword': grip(); add(part(G.box, GOLD, 0.2, 0.03, 0.03, 0, 0, 0.13)); add(part(G.box, METAL, 0.012, 0.05, 0.85, 0, 0, 0.57)); add(part(G.cone, METAL, 0.025, 0.08, 0.008, 0, 0, 1.03, Math.PI / 2, 0, Math.PI / 2)); add(part(G.sph, GOLD, 0.03, 0.03, 0.03, 0, 0, -0.05)); break;
    case 'sabre': { grip(0.17); add(part(G.box, GOLD, 0.16, 0.025, 0.035, 0, 0, 0.13)); const b = curvedBlade(0.85, 0.055, 0.16, METAL); b.position.z = 0.14; add(b); add(part(G.sph, GOLD, 0.028, 0.028, 0.028, 0, 0, -0.05)); break; }
    case 'axe': { add(alongZ(G.cyl, WOOD, 0.025, 0.85, -0.08)); const sh = new THREE.Shape(); sh.moveTo(0, -0.05); sh.quadraticCurveTo(0.12, -0.1, 0.24, -0.18); sh.quadraticCurveTo(0.17, 0.01, 0.24, 0.2); sh.quadraticCurveTo(0.12, 0.08, 0, 0.06); sh.lineTo(0, -0.05);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: false }); g.translate(0, 0, -0.011); g.rotateX(Math.PI / 2); g.rotateZ(-Math.PI / 2);
      const h = new THREE.Mesh(g, METAL); h.castShadow = true; h.position.z = 0.66; add(h); add(part(G.box, DARKMETAL, 0.05, 0.07, 0.12, 0, 0.02, 0.66)); break; }
    case 'spear': add(alongZ(G.cyl, WOOD, 0.022, 1.9, -0.6)); add(part(G.cone, METAL, 0.045, 0.3, 0.045, 0, 0, 1.45, Math.PI / 2)); add(part(G.cyl, M(0x8e1c14), 0.035, 0.06, 0.035, 0, 0, 1.28, Math.PI / 2)); break;
    case 'mace': add(alongZ(G.cyl, DARKWOOD, 0.024, 0.62, -0.06)); add(part(G.ico, DARKMETAL, 0.11, 0.11, 0.11, 0, 0, 0.62));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(part(G.cone, DARKMETAL, 0.025, 0.09, 0.025, Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0.62, 0, 0, a - Math.PI / 2)); } break;
    case 'dagger': grip(0.11, 0.03); add(part(G.box, GOLD, 0.09, 0.02, 0.02, 0, 0, 0.09)); { const b = curvedBlade(0.3, 0.04, 0.05, METAL); b.position.z = 0.1; add(b); } break;
    case 'hammer': add(alongZ(G.cyl, DARKWOOD, 0.028, 1.15, -0.15)); add(part(G.box, DARKMETAL, 0.42, 0.2, 0.2, 0, 0, 0.95)); add(part(G.box, METAL, 0.06, 0.22, 0.22, 0.21, 0, 0.95)); add(part(G.box, METAL, 0.06, 0.22, 0.22, -0.21, 0, 0.95)); break;
    case 'scythe': { add(alongZ(G.cyl, WOOD, 0.022, 1.6, -0.35)); const b = curvedBlade(0.75, 0.08, -0.25, METAL, 0.01); b.rotation.set(0, 0, 0); const bg = new THREE.Group(); bg.add(b); b.rotation.x = 0; bg.rotation.x = Math.PI / 2; bg.position.z = 1.2; add(bg); break; }
    case 'staff': add(alongZ(G.cyl, WOOD, 0.026, 1.8, -0.85)); add(part(G.cyl, GOLD, 0.034, 0.12, 0.034, 0, 0, 0.92, Math.PI / 2)); add(part(G.cyl, GOLD, 0.034, 0.12, 0.034, 0, 0, -0.82, Math.PI / 2)); break;
    case 'greatsword': grip(0.36, 0.1); add(part(G.box, GOLD, 0.5, 0.06, 0.07, 0, 0, 0.29)); add(part(G.box, bladeMat, 0.03, 0.16, 1.55, 0, 0, 1.08)); add(part(G.cone, bladeMat, 0.08, 0.2, 0.015, 0, 0, 1.95, Math.PI / 2, 0, Math.PI / 2));
      add(part(G.box, M(0xffa040, { emissive: 0xff5a10, emissiveIntensity: 1.6 }), 0.035, 0.02, 1.45, 0, 0, 1.08, 0, 0, 0, false)); add(part(G.sph, GOLD, 0.06, 0.06, 0.06, 0, 0, -0.13)); break;
  }
  w.userData.bladeMat = bladeMat;
  return w;
}

// ---------- characters ----------
function makeLabel(text, color = '#ffffff', boss = false) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 84; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, fog: false }));
  spr.scale.set(2.0, 0.66, 1); spr.renderOrder = 10;
  let last = -1;
  spr.userData.draw = (hp, alert) => {
    const k = Math.round(hp * 100) + (alert ? 1000 : 0); if (k === last) return; last = k;
    g.clearRect(0, 0, 256, 84);
    g.font = '700 38px KFont, "Noto Sans Arabic", Tahoma, sans-serif'; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(text, 128, 30); g.fillStyle = alert ? '#ff7a50' : color; g.fillText(text, 128, 30);
    if (!boss) {
      g.fillStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.roundRect(48, 60, 160, 14, 6); g.fill();
      g.fillStyle = hp > 0.5 ? '#e0503a' : hp > 0.25 ? '#e08a2a' : '#f0c040'; g.beginPath(); g.roundRect(51, 63, Math.max(0, 154 * hp), 8, 4); g.fill();
    }
    tex.needsUpdate = true;
  };
  spr.userData.draw(1, false);
  return spr;
}

function buildHuman(o) {
  const B = Object.assign({ h: 1, w: 1, skin: 0xc89a78, shirt: 0xd8d0c0, trousers: 0x5a5040, vest: null, vestOpen: true, shoes: 0xe2d8c4, sash: true, sashColor: null, head: 'klaw', headColor: 0x2a2018, beard: 'full', hairColor: 0x1e1610, braid: false, weapon: 'club', offWeapon: null, cape: null, pads: null, mask: null, coat: null }, o);
  const skin = M(B.skin, { roughness: 0.7 }), shirt = M(B.shirt), trous = M(B.trousers), hair = M(B.hairColor, { roughness: 0.9 });
  const root = new THREE.Group(), core = new THREE.Group(); core.position.y = 0.9; root.add(core);
  const body = new THREE.Group(); body.position.y = -0.9; core.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.95 * B.h; body.add(hips);
  const W = B.w;
  hips.add(part(G.cyl, trous, 0.2 * W, 0.24, 0.16 * W, 0, -0.02));
  const mkLeg = s => {
    const leg = new THREE.Group(); leg.position.set(s * 0.1 * W, -0.06, 0); hips.add(leg);
    leg.add(part(G.cyl, trous, 0.12 * W, 0.46 * B.h, 0.12 * W, 0, -0.23 * B.h));
    const knee = new THREE.Group(); knee.position.y = -0.45 * B.h; leg.add(knee);
    knee.add(part(new THREE.CylinderGeometry(1.15, 0.7, 1, 8), trous, 0.11 * W, 0.42 * B.h, 0.11 * W, 0, -0.21 * B.h));
    knee.add(part(G.box, M(B.shoes), 0.11, 0.08, 0.25, 0, -0.43 * B.h, 0.05));
    return [leg, knee];
  };
  const [legL, kneeL] = mkLeg(1), [legR, kneeR] = mkLeg(-1);
  const spine = new THREE.Group(); spine.position.y = 0.04; hips.add(spine);
  spine.add(part(new THREE.CylinderGeometry(1.0, 0.82, 1, 10), shirt, 0.23 * W, 0.56 * B.h, 0.16 * W, 0, 0.29 * B.h));
  if (B.coat) spine.add(part(new THREE.CylinderGeometry(0.85, 1.25, 1, 10), M(B.coat), 0.22 * W, 0.62 * B.h, 0.17 * W, 0, -0.12 * B.h));
  if (B.vest) { const vg = new THREE.CylinderGeometry(1.0, 0.86, 1, 12, 1, true, B.vestOpen ? 0.55 : 0, B.vestOpen ? TAU - 1.1 : TAU); vg.rotateY(Math.PI);
    spine.add(part(vg, M(B.vest, { side: THREE.DoubleSide }), 0.245 * W, 0.44 * B.h, 0.175 * W, 0, 0.33 * B.h)); }
  if (B.sash) spine.add(part(G.cyl, B.sashColor ? M(B.sashColor) : new THREE.MeshStandardMaterial({ map: sashTex, roughness: 0.9 }), 0.215 * W, 0.15, 0.17 * W, 0, 0.04));
  if (B.pads) for (const s of [-1, 1]) spine.add(part(G.sph, M(B.pads, { roughness: 0.5, metalness: 0.6 }), 0.12 * W, 0.08, 0.12, s * 0.25 * W, 0.53 * B.h));
  if (B.cape) { const cg = new THREE.CylinderGeometry(0.9, 1.5, 1, 12, 1, true, Math.PI * 0.6, Math.PI * 0.8); cg.translate(0, -0.5, 0);
    const cape = part(cg, M(B.cape, { side: THREE.DoubleSide }), 0.26 * W, 1.1 * B.h, 0.2 * W, 0, 0.56 * B.h, -0.02); spine.add(cape); }
  // head
  const neck = new THREE.Group(); neck.position.y = 0.56 * B.h; spine.add(neck);
  neck.add(part(G.cyl, skin, 0.055, 0.1, 0.055, 0, 0.04));
  const head = new THREE.Group(); head.position.y = 0.17; neck.add(head);
  const hs = B.headScale || 1; head.scale.setScalar(hs);
  head.add(part(G.sph, skin, 0.115, 0.135, B.noFace ? 0.1 : 0.12));
  const dark = M(0x15100c);
  if (!B.noFace) for (const s of [-1, 1]) {
    head.add(part(G.sphLo, dark, 0.016, 0.012, 0.01, s * 0.045, 0.02, 0.108, 0, 0, 0, false));
    head.add(part(G.box, hair, 0.05, 0.012, 0.02, s * 0.047, 0.05, 0.106, 0, 0, s * -0.12, false));
  }
  if (!B.noFace) head.add(part(G.cone, skin, 0.022, 0.06, 0.03, 0, -0.005, 0.12, Math.PI / 2.4, 0, 0, false));
  if (B.beard === 'full' || B.beard === 'long') head.add(part(G.sph, hair, 0.1, B.beard === 'long' ? 0.12 : 0.08, 0.08, 0, B.beard === 'long' ? -0.1 : -0.07, 0.05));
  if (B.beard !== 'none' && !B.noFace) head.add(part(G.box, hair, 0.09, 0.022, 0.03, 0, -0.04, 0.112, 0, 0, 0, false));
  if (B.mask) head.add(part(G.sph, M(B.mask), 0.122, 0.07, 0.125, 0, -0.06, 0.005));
  if (B.braid) { head.add(part(G.sph, hair, 0.12, 0.12, 0.12, 0, 0.025, -0.01)); for (let i = 0; i < 5; i++) head.add(part(G.sphLo, hair, 0.04, 0.05, 0.04, 0, -0.06 - i * 0.075, -0.12 - i * 0.012)); }
  const hc = M(B.headColor);
  switch (B.head) {
    case 'jamana': head.add(part(new THREE.TorusGeometry(1, 0.42, 6, 14), new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.9 }), 0.11, 0.11, 0.1, 0, 0.075, 0, Math.PI / 2)); head.add(part(G.sph, hc, 0.1, 0.07, 0.1, 0, 0.1)); break;
    case 'klaw': head.add(part(new THREE.CylinderGeometry(0.9, 1, 1, 10), hc, 0.11, 0.1, 0.11, 0, 0.11)); head.add(part(G.sph, hc, 0.1, 0.03, 0.1, 0, 0.16)); break;
    case 'turban': head.add(part(new THREE.TorusGeometry(1, 0.5, 6, 14), hc, 0.105, 0.105, 0.11, 0, 0.08, 0, Math.PI / 2)); head.add(part(G.sph, hc, 0.11, 0.1, 0.11, 0, 0.12)); break;
    case 'helmet': head.add(part(G.sph, DARKMETAL, 0.125, 0.1, 0.13, 0, 0.06)); head.add(part(G.cone, DARKMETAL, 0.03, 0.12, 0.03, 0, 0.2)); head.add(part(G.box, DARKMETAL, 0.02, 0.09, 0.02, 0, 0.0, 0.125)); break;
    case 'hood': head.add(part(G.sph, hc, 0.14, 0.15, 0.14, 0, 0.02, -0.02)); break;
    case 'bandana': head.add(part(G.sph, hc, 0.12, 0.07, 0.123, 0, 0.07)); head.add(part(G.box, hc, 0.03, 0.12, 0.02, 0.03, -0.02, -0.12, 0.3, 0, 0.2)); break;
    case 'coins': head.add(part(G.sph, hc, 0.12, 0.08, 0.123, 0, 0.075)); for (let i = -3; i <= 3; i++) head.add(part(G.cyl6, GOLD, 0.014, 0.004, 0.014, Math.sin(i * 0.3) * 0.12, 0.045, Math.cos(i * 0.3) * 0.12, Math.PI / 2, 0, 0, false)); break;
    case 'bald': head.add(part(G.sph, hair, 0.117, 0.05, 0.115, 0, 0.0, -0.03)); break;
    case 'fur': head.add(part(G.cyl, hc, 0.13, 0.12, 0.13, 0, 0.1)); head.add(part(G.sph, hc, 0.13, 0.04, 0.13, 0, 0.16)); break;
    case 'crown': head.add(part(G.sph, hair, 0.12, 0.1, 0.12, 0, 0.04, -0.02)); break;
  }
  // arms
  const mkArm = s => {
    const sh = new THREE.Group(); sh.rotation.order = 'YXZ'; sh.position.set(s * 0.255 * W, 0.5 * B.h, 0); spine.add(sh);
    sh.add(part(new THREE.CylinderGeometry(1, 0.85, 1, 8), shirt, 0.07 * W, 0.32 * B.h, 0.07 * W, 0, -0.15 * B.h));
    const el = new THREE.Group(); el.position.y = -0.3 * B.h; sh.add(el);
    el.add(part(new THREE.CylinderGeometry(1, 0.8, 1, 8), shirt, 0.058 * W, 0.27 * B.h, 0.058 * W, 0, -0.13 * B.h));
    const wr = new THREE.Group(); wr.position.y = -0.28 * B.h; el.add(wr);
    wr.add(part(G.sph, skin, 0.05, 0.055, 0.05, 0, -0.01, 0));
    return [sh, el, wr];
  };
  const [shL, elL, wrL] = mkArm(1), [shR, elR, wrR] = mkArm(-1);
  const weapon = buildWeapon(B.weapon, B.glow); wrR.add(weapon);
  let off = null; if (B.offWeapon) { off = buildWeapon(B.offWeapon); wrL.add(off); }
  if (B.belt) spine.add(part(G.box, GOLD, 0.06, 0.08, 0.02, 0, 0.04, 0.17 * W, 0, 0, 0, false));
  root.traverse(m => { if (m.isMesh) m.receiveShadow = false; });
  return { root, core, body, hips, legL, legR, kneeL, kneeR, spine, neck, head, shL, shR, elL, elR, wrL, wrR, weapon, off, B };
}

// pose keys -> joint
const POSE0 = { lL: 0, lR: 0, kL: 0, kR: 0, spX: 0, spY: 0, spZ: 0, hX: 0, hY: 0, aLx: 0, aLy: 0, aLz: 0.12, eL: -0.2, aRx: 0, aRy: 0, aRz: -0.12, eR: -0.2, wRx: 0, wRy: 0, wRz: 0, wLx: 0, by: 0, bx: 0, bry: 0, roll: 0 };
const KEYS = Object.keys(POSE0);
function applyPose(r, P) {
  r.legL.rotation.x = P.lL; r.legR.rotation.x = P.lR; r.kneeL.rotation.x = P.kL; r.kneeR.rotation.x = P.kR;
  r.spine.rotation.set(P.spX, P.spY, P.spZ); r.head.rotation.set(P.hX, P.hY, 0);
  r.shL.rotation.set(P.aLx, P.aLy, P.aLz); r.elL.rotation.x = P.eL; r.shR.rotation.set(P.aRx, P.aRy, P.aRz); r.elR.rotation.x = P.eR;
  r.wrR.rotation.set(P.wRx, P.wRy, P.wRz); r.wrL.rotation.x = P.wLx;
  r.core.position.y = 0.9 + P.by; r.core.rotation.set(P.bx, P.bry, P.roll);
}
const ATK_POSES = {
  hor: [{ aRx: -1.45, aRy: -1.45, eR: -0.35, wRx: 1.35, spY: -0.65, aLx: -0.5, aLy: 0.3 }, { aRx: -1.3, aRy: 1.15, eR: -0.1, wRx: 1.45, spY: 0.75, aLx: -0.2, aLy: -0.2 }],
  horR: [{ aRx: -1.4, aRy: 1.1, eR: -1.3, wRx: 1.35, spY: 0.65 }, { aRx: -1.45, aRy: -1.35, eR: -0.1, wRx: 1.5, spY: -0.65 }],
  over: [{ aRx: -2.9, aRy: -0.2, eR: -0.5, wRx: 0.3, spX: -0.25, spY: -0.2, aLx: -1.0 }, { aRx: -0.75, aRy: 0.1, eR: -0.05, wRx: 1.6, spX: 0.4, spY: 0.1, aLx: -0.3, by: -0.08 }],
  thrust: [{ aRx: -0.45, aRy: 0, eR: -1.5, wRx: 1.5, spY: -0.55, aLx: -1.1, eL: -0.9 }, { aRx: -1.55, aRy: 0.15, eR: 0, wRx: 1.55, spY: 0.3, spX: 0.25, aLx: -1.35, eL: -0.25, by: -0.06 }],
  stab: [{ aRx: -0.6, aRy: -0.3, eR: -1.6, wRx: 1.45, spY: -0.4 }, { aRx: -1.5, aRy: 0.1, eR: -0.05, wRx: 1.55, spY: 0.3, spX: 0.3, by: -0.1 }],
  slam: [{ aRx: -3.0, aRy: 0.3, eR: -0.3, wRx: 0.3, aLx: -3.0, aLy: -0.3, eL: -0.3, spX: -0.3 }, { aRx: -0.65, aRy: 0.35, eR: 0, wRx: 1.3, aLx: -0.65, aLy: -0.35, eL: 0, spX: 0.5, by: -0.16 }],
  spin: [{ aRx: -1.5, aRy: -1.3, eR: -0.2, wRx: 1.45, spY: -0.8, aLx: -0.4, aLz: 0.6 }, { aRx: -1.5, aRy: 0.9, eR: -0.1, wRx: 1.45, spY: 0.5, aLz: 0.8, bry: TAU }],
  twin: [{ aRx: -1.7, aRy: -0.9, eR: -1.1, aLx: -1.7, aLy: 0.9, eL: -1.1, wRx: 1.3, wLx: 1.3, spX: -0.1 }, { aRx: -1.25, aRy: 0.95, eR: -0.1, aLx: -1.25, aLy: -0.95, eL: -0.1, wRx: 1.4, wLx: 1.4, spX: 0.3, by: -0.08 }],
};
const GUARD = {
  default: { aRx: -0.55, aRy: -0.25, eR: -0.95, wRx: 0.85, aLx: -0.25, aLz: 0.2, eL: -0.5 },
  long: { aRx: -0.5, aRy: 0.0, eR: -1.0, wRx: 1.2, aLx: -0.9, aLy: -0.45, eL: -0.9 },
  two: { aRx: -0.75, aRy: 0.35, eR: -0.8, wRx: 0.6, aLx: -0.75, aLy: -0.35, eL: -0.8 },
  twin: { aRx: -0.6, aRy: -0.2, eR: -1.1, wRx: 0.9, aLx: -0.6, aLy: 0.2, eL: -1.1, wLx: 0.9 },
};

// ---------- roster ----------
// t: pose type, wind/act/rec: timing (s), reach (m), arc (rad), dmg, kb (knockback), lunge (m/s)
const A = (t, wind, act, rec, reach, arc, dmg, kb, lunge = 0, extra = {}) => Object.assign({ t, wind, act, rec, reach, arc, dmg, kb, lunge }, extra);
const ROSTER = {
  'ڕەوا': { weapon: 'club', guard: 'default', hp: 70, speed: 3.4, poise: 1, look: { shirt: 0x8d8f86, trousers: 0x4b5058, vest: 0x2f3438, head: 'klaw', headColor: 0x1a1714, beard: 'moustache', skin: 0xc49a76 },
    atks: [A('over', 0.6, 0.14, 0.55, 1.9, 1.3, 11, 5, 2.5), A('hor', 0.5, 0.14, 0.5, 1.9, 2.0, 9, 4, 2)], latin: 'Rewa', wName: 'دار (club)' },
  'هەستیار': { weapon: 'sword', guard: 'default', hp: 75, speed: 3.9, poise: 1, look: { h: 1.06, shirt: 0x1d1a18, trousers: 0x1d1a18, vest: 0x7a1f18, head: 'jamana', headColor: 0x111111, beard: 'full', skin: 0xb98c6c },
    atks: [A('hor', 0.42, 0.12, 0.42, 2.1, 2.0, 10, 3.5, 3), A('horR', 0.35, 0.12, 0.45, 2.1, 2.0, 10, 3.5, 3, { chain: 0 }), A('thrust', 0.5, 0.12, 0.5, 2.3, 0.8, 13, 4, 6)], latin: 'Hestyar', wName: 'شمشێر (sword)' },
  'خێڵە': { weapon: 'dagger', offWeapon: 'dagger', guard: 'twin', hp: 60, speed: 4.6, poise: 1, look: { w: 0.88, shirt: 0x3e2350, trousers: 0x2a1a33, coat: 0x4d2a62, head: 'none', beard: 'none', braid: true, hairColor: 0x241510, skin: 0xd0a282, shoes: 0x2a1a14 },
    atks: [A('twin', 0.32, 0.1, 0.35, 1.6, 1.6, 7, 2.5, 5), A('stab', 0.28, 0.1, 0.4, 1.7, 0.9, 8, 2.5, 7, { chain: 0 })], latin: 'Xêłe', wName: 'دوو خەنجەر (twin knives)' },
  'سەفین': { weapon: 'axe', guard: 'default', hp: 120, speed: 3.0, poise: 2, look: { w: 1.25, shirt: 0x6b4a2e, trousers: 0x3d2c1c, vest: 0x2e1d10, vestOpen: false, head: 'bald', beard: 'long', hairColor: 0x2a1a10, skin: 0xb5876a, shoes: 0x3a2a1a },
    atks: [A('over', 0.85, 0.16, 0.7, 2.1, 1.2, 18, 8, 2.5), A('hor', 0.7, 0.16, 0.65, 2.1, 2.1, 15, 6, 2)], latin: 'Sefîn', wName: 'تەور (axe)' },
  'ئیرەج': { weapon: 'spear', guard: 'long', hp: 80, speed: 3.6, poise: 1, look: { h: 1.1, w: 0.92, shirt: 0xb9a47c, trousers: 0x6f6046, vest: 0x5c4a32, head: 'helmet', beard: 'moustache', skin: 0xc49a76 },
    atks: [A('thrust', 0.55, 0.14, 0.55, 3.2, 0.5, 13, 5, 4), A('thrust', 0.35, 0.12, 0.6, 3.2, 0.5, 11, 4, 3, { chain: 0 })], latin: 'Îrec', wName: 'نێزە (spear)' },
  'شادە': { weapon: 'scythe', guard: 'long', hp: 85, speed: 3.5, poise: 1, look: { w: 0.9, shirt: 0x34502e, trousers: 0x22331e, coat: 0x2c4426, head: 'hood', headColor: 0x1f2e1a, beard: 'none', braid: true, hairColor: 0x2a1810, skin: 0xd2a684, shoes: 0x2a2014 },
    atks: [A('spin', 0.7, 0.4, 0.6, 2.6, TAU, 13, 6, 1.5), A('hor', 0.55, 0.15, 0.55, 2.6, 2.4, 12, 5, 2)], latin: 'Şade', wName: 'داس (scythe)' },
  'کاوێنە': { weapon: 'staff', guard: 'long', hp: 80, speed: 4.0, poise: 1, look: { w: 0.9, shirt: 0xdcd6ca, trousers: 0x2f4f7a, coat: 0x2f4f7a, head: 'coins', headColor: 0x7a1c2a, beard: 'none', braid: true, hairColor: 0x1a120c, skin: 0xd8ab8a, shoes: 0xe2d8c4 },
    atks: [A('hor', 0.4, 0.12, 0.35, 2.4, 2.2, 8, 4, 3), A('horR', 0.3, 0.12, 0.35, 2.4, 2.2, 8, 4, 3, { chain: 0 }), A('thrust', 0.45, 0.12, 0.5, 2.6, 0.7, 10, 7, 5)], latin: 'Kawêne', wName: 'گۆچان (staff)' },
  'ئاکام': { weapon: 'mace', guard: 'default', hp: 130, speed: 3.1, poise: 2, look: { w: 1.18, shirt: 0x24282a, trousers: 0x1b1d1f, vest: 0x101214, vestOpen: false, pads: 0x6a6e74, head: 'turban', headColor: 0x22402e, beard: 'full', skin: 0xb88a6a, shoes: 0x1b1612 },
    atks: [A('over', 0.75, 0.15, 0.6, 2.0, 1.3, 17, 8, 3), A('horR', 0.6, 0.15, 0.6, 2.0, 2.0, 14, 7, 2)], latin: 'Akam', wName: 'گورز (mace)' },
  'ئەشکان': { weapon: 'hammer', guard: 'two', hp: 170, speed: 2.7, poise: 3, scale: 1.14, look: { w: 1.3, shirt: 0x4a4440, trousers: 0x2c2826, vest: 0x5e4630, pads: 0x8a8a8a, head: 'fur', headColor: 0x5c4a3a, beard: 'long', hairColor: 0x3a2a1c, skin: 0xb08468, shoes: 0x2a2018 },
    atks: [A('slam', 1.0, 0.16, 0.85, 2.4, 1.4, 24, 11, 2, { wave: true }), A('hor', 0.8, 0.18, 0.7, 2.4, 2.2, 18, 9, 1.5)], latin: 'Eşkan', wName: 'چەکوش (war hammer)' },
  'ئەیوب': { weapon: 'dagger', guard: 'default', hp: 65, speed: 4.9, poise: 1, look: { w: 0.9, h: 0.96, shirt: 0xa07a3a, trousers: 0x4a3a22, vest: 0x3a2a16, head: 'bandana', headColor: 0x2a2a2a, mask: 0x2a2a2a, beard: 'none', skin: 0xc49a76, shoes: 0x2a2018 },
    atks: [A('stab', 0.3, 0.1, 0.3, 1.6, 1.0, 8, 3, 9), A('hor', 0.25, 0.1, 0.35, 1.6, 1.8, 7, 3, 4, { chain: 0 })], latin: 'Eyûb', wName: 'خەنجەر (dagger)' },
};
const STAGES = [
  { name: 'گوندی بەردین', sub: 'قۆناغی یەکەم', foes: ['ڕەوا', 'هەستیار', 'خێڵە'], tokens: 1 },
  { name: 'دارستانی بەڕوو', sub: 'قۆناغی دووەم', foes: ['سەفین', 'ئیرەج', 'شادە'], tokens: 2 },
  { name: 'دەربەندی چیا', sub: 'قۆناغی سێیەم', foes: ['کاوێنە', 'ئاکام', 'ئەشکان', 'ئەیوب'], tokens: 2 },
  { name: 'میران', sub: 'سەرۆکی خەلیفەکان', foes: [], boss: true, tokens: 1 },
];

// ---------- FX ----------
const FX = (() => {
  const N = 360, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N), max = new Float32Array(N), grav = new Float32Array(N), base = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  pts.frustumCulled = false; scene.add(pts);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -100;
  let idx = 0; const c = new THREE.Color();
  function burst(p, n, color, spd, up = 1, g = 9, lifeT = 0.45) {
    c.set(color);
    for (let k = 0; k < n; k++) {
      const i = idx = (idx + 1) % N;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      const a = Math.random() * TAU, e = Math.random() * 2 - 1 + up * 0.5;
      vel[i * 3] = Math.cos(a) * spd * Math.random(); vel[i * 3 + 1] = e * spd * 0.8; vel[i * 3 + 2] = Math.sin(a) * spd * Math.random();
      life[i] = max[i] = lifeT * (0.5 + Math.random() * 0.8); grav[i] = g;
      base[i * 3] = c.r; base[i * 3 + 1] = c.g; base[i * 3 + 2] = c.b;
    }
  }
  // shock rings
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.85, 1, 48); ringGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffa050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; scene.add(m); rings.push({ m, t: 0, life: 0, r0: 0, r1: 0 }); }
  function ring(p, r0, r1, life, color = 0xffa050) { const R = rings.find(r => r.t <= 0) || rings[0]; R.m.position.set(p.x, 0.06, p.z); R.t = R.life = life; R.r0 = r0; R.r1 = r1; R.m.material.color.set(color); R.m.visible = true; }
  // damage numbers
  const nums = [];
  for (let i = 0; i < 14; i++) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false })); s.renderOrder = 20; s.visible = false; s.scale.set(0.9, 0.45, 1); scene.add(s);
    nums.push({ s, cv, tex, t: 0, vy: 0 });
  }
  let ni = 0;
  function num(p, v, color = '#fff2c8', big = false) {
    const n = nums[ni = (ni + 1) % nums.length], g = n.cv.getContext('2d');
    g.clearRect(0, 0, 128, 64); g.font = `700 ${big ? 46 : 38}px KFont, "Noto Sans Arabic", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(kn(v), 64, 34); g.fillStyle = color; g.fillText(kn(v), 64, 34); n.tex.needsUpdate = true;
    n.s.position.set(p.x + rand(-0.3, 0.3), p.y, p.z + rand(-0.3, 0.3)); n.s.visible = true; n.t = 0.8; n.vy = 2.2; n.s.scale.set(big ? 1.2 : 0.9, big ? 0.6 : 0.45, 1);
  }
  function update(dt) {
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt; const k = Math.max(0, life[i] / max[i]);
      vel[i * 3 + 1] -= grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.02) { pos[i * 3 + 1] = 0.02; vel[i * 3 + 1] *= -0.3; }
      col[i * 3] = base[i * 3] * k; col[i * 3 + 1] = base[i * 3 + 1] * k; col[i * 3 + 2] = base[i * 3 + 2] * k;
      if (life[i] <= 0) pos[i * 3 + 1] = -100;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    for (const R of rings) if (R.t > 0) { R.t -= dt; const k = 1 - R.t / R.life, r = lerp(R.r0, R.r1, easeOut(k)); R.m.scale.set(r, 1, r); R.m.material.opacity = (1 - k) * 0.9; if (R.t <= 0) R.m.visible = false; }
    for (const n of nums) if (n.t > 0) { n.t -= dt; n.s.position.y += n.vy * dt; n.vy *= 0.92; n.s.material.opacity = Math.min(1, n.t * 3); if (n.t <= 0) n.s.visible = false; }
  }
  return { burst, ring, num, update };
})();

// weapon trail (player)
const Trail = (() => {
  const N = 14, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 2 * 3), al = new Float32Array(N * 2);
  const idxs = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idxs); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('a', new THREE.BufferAttribute(al, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { col: { value: new THREE.Color(0xffd890) } },
    vertexShader: 'attribute float a; varying float vA; void main(){ vA=a; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 col; varying float vA; void main(){ gl_FragColor=vec4(col*vA, vA); }' });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);
  const hist = []; let on = 0;
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  function update(dt, active, baseObj, tipLocal, baseLocal) {
    on = active ? Math.min(1, on + dt * 12) : Math.max(0, on - dt * 5);
    if (on > 0) { vA.copy(baseLocal); baseObj.localToWorld(vA); vB.copy(tipLocal); baseObj.localToWorld(vB); hist.unshift([vA.clone(), vB.clone()]); }
    if (hist.length > N) hist.length = N;
    for (let i = 0; i < N; i++) {
      const h = hist[Math.min(i, hist.length - 1)]; if (!h) continue;
      pos.set([h[0].x, h[0].y, h[0].z], i * 6); pos.set([h[1].x, h[1].y, h[1].z], i * 6 + 3);
      const k = (1 - i / (N - 1)) * on * 0.85; al[i * 2] = k * 0.15; al[i * 2 + 1] = k;
    }
    if (on <= 0) hist.length = 0;
    geo.attributes.position.needsUpdate = true; geo.attributes.a.needsUpdate = true; mesh.visible = on > 0.01 && hist.length > 1;
  }
  return { update, mat };
})();

// pickups (pomegranates)
const pickups = [];
const pomGeo = mergeGeoms([{ geo: new THREE.SphereGeometry(0.17, 10, 8), color: 0xb0161c }, { geo: tf(new THREE.ConeGeometry(0.06, 0.09, 6), 0, 0.18, 0), color: 0x7a2a10 }]);
const pomMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: 0x5a0808, emissiveIntensity: 0.6 });
function dropPickup(x, z) { const m = new THREE.Mesh(pomGeo, pomMat); m.position.set(x, 0.4, z); m.castShadow = true; scene.add(m); pickups.push({ m, t: 0 }); }

// ---------- fighters ----------
const enemies = [];
let player = null;
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const game = { state: 'loading', stage: 0, time: 0, kills: 0, maxCombo: 0, combo: 0, comboT: 0, hitStop: 0, slowmo: 0, slowK: 1, trauma: 0, tokens: 1, used: 0, stageClearT: -1, god: false, waves: [] };

class Fighter {
  constructor(rig, hp, scale = 1) {
    this.rig = rig; this.root = rig.root; this.pos = this.root.position; this.vel = new THREE.Vector3(); this.kb = new THREE.Vector3();
    this.scale = scale; this.root.scale.setScalar(scale); this.radius = 0.42 * scale * (rig.B.w > 1.1 ? 1.15 : 1);
    this.hp = this.maxHp = hp; this.face = 0; this.walkPh = 0; this.speedN = 0; this.P = Object.assign({}, POSE0); this.T = Object.assign({}, POSE0);
    this.state = 'move'; this.st = 0; this.atk = null; this.phase = ''; this.pt = 0; this.hitSet = new Set(); this.y = 0; this.vy = 0; this.grounded = true; this.dead = false; this.flashT = 0; this.hurtT = 0;
    this.guard = GUARD.default; this.mats = []; this.root.traverse(m => { if (m.isMesh && m.material && m.material.emissive && !this.mats.includes(m.material)) this.mats.push(m.material); });
    scene.add(this.root);
  }
  basePose(dt, t) {
    const P = this.T; Object.assign(P, POSE0);
    const s = this.speedN, ph = this.walkPh;
    P.lL = Math.sin(ph) * 0.85 * s; P.lR = -P.lL;
    P.kL = (0.12 + 1.0 * Math.max(0, -Math.cos(ph))) * s + 0.06; P.kR = (0.12 + 1.0 * Math.max(0, Math.cos(ph))) * s + 0.06;
    P.by = -0.03 * s + Math.abs(Math.cos(ph)) * 0.05 * s - (1 - s) * 0.03; P.bx = 0.14 * s;
    Object.assign(P, this.guard);
    P.aLx = (P.aLx || 0) - Math.sin(ph) * 0.55 * s; P.aRx += Math.sin(ph) * 0.25 * s;
    P.spX = Math.sin(t * 2.1 + this.pos.x) * 0.025 + 0.05 * s; P.spY = -0.15 * (1 - s); P.hY = 0.15 * (1 - s);
    if (s < 0.2) { P.lL = -0.18; P.lR = 0.18; P.kL = 0.18; P.kR = 0.28; }
    if (!this.grounded) { P.lL = -0.7; P.kL = 1.1; P.lR = 0.25; P.kR = 0.7; P.aLz = 0.6; }
    return P;
  }
  attackOverlay(P) {
    const a = this.atk, [W, S] = ATK_POSES[a.t], t = clamp(this.pt, 0, 1), keys = new Set([...Object.keys(W), ...Object.keys(S)]);
    for (const k of keys) {
      if (k === 'bry') continue;
      const base = P[k], w = k in W ? W[k] : base, s = k in S ? S[k] : w;
      P[k] = this.phase === 'wind' ? lerp(base, w, ease(t)) : this.phase === 'act' ? lerp(w, s, easeOut(t)) : lerp(s, base, ease(t));
    }
    P.bry = this.phase === 'act' && S.bry ? S.bry * (a.spins || 1) * ease(t) : 0;
    if (this.phase !== 'wind') { P.lL = -0.45; P.lR = 0.35; P.kL = 0.35; P.kR = 0.25; } else { P.lL = -0.2; P.lR = 0.3; P.kL = 0.4; P.kR = 0.4; P.by -= 0.05; }
  }
  smoothPose(dt, k) {
    const P = this.P, T = this.T;
    for (const key of KEYS) P[key] = key === 'bry' || key === 'bx' && this.state === 'dodge' ? T[key] : damp(P[key], T[key], k, dt);
    applyPose(this.rig, P);
  }
  move(dt) {
    this.kb.multiplyScalar(Math.exp(-6 * dt));
    this.pos.x += (this.vel.x + this.kb.x) * dt; this.pos.z += (this.vel.z + this.kb.z) * dt;
    if (!this.grounded || this.vy !== 0) { this.vy -= 22 * dt; this.y += this.vy * dt; if (this.y <= 0) { const wasAir = !this.grounded; this.y = 0; this.vy = 0; this.grounded = true; if (wasAir) this.onLand && this.onLand(); } else this.grounded = false; }
    this.pos.y = this.y;
    for (const c of colliders) { const dx = this.pos.x - c.x, dz = this.pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + this.radius; if (d < m && d > 1e-4) { this.pos.x = c.x + dx / d * m; this.pos.z = c.z + dz / d * m; } }
    const r = Math.hypot(this.pos.x, this.pos.z), lim = this.spawning ? 40 : ARENA - this.radius;
    if (r > lim) { this.pos.x *= lim / r; this.pos.z *= lim / r; }
    this.root.rotation.y = this.face;
  }
  flash(dt) {
    if (this.flashT > 0) this.flashT -= dt;
    const v = Math.max(0, this.flashT) * 5;
    for (const m of this.mats) if (!m.userData.keepEm) m.emissiveIntensity = v, m.emissive && v > 0 && m.emissive.setHex(0xff5a3a);
  }
}
// give each fighter its own materials so hit flashes don't leak to others
function uniqueMats(root) { const map = new Map(); root.traverse(m => { if (m.isMesh) { if (!map.has(m.material)) { const c = m.material.clone(); if (m.material.emissiveIntensity > 0.5 || m.material.userData.keep) c.userData.keepEm = true; map.set(m.material, c); } m.material = map.get(m.material); } }); }

function dirTo(a, b) { return Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z); }
function distTo(a, b) { return Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z); }
function shake(v) { game.trauma = Math.min(1, game.trauma + v); }
function hitStop(t) { game.hitStop = Math.max(game.hitStop, t); }
function weaponTipWorld(f, out) { out.set(0, 0, f.tipLen || 0.9); f.rig.weapon.localToWorld(out); return out; }

// ---------- player ----------
const PLAYER_ATKS = [
  A('hor', 0.11, 0.12, 0.3, 2.35, 2.3, 14, 3.5, 3.5, { stop: 0.05 }),
  A('horR', 0.09, 0.12, 0.3, 2.35, 2.3, 15, 3.8, 3.5, { stop: 0.05 }),
  A('over', 0.17, 0.12, 0.42, 2.6, 1.5, 27, 9, 4.5, { stop: 0.1, shake: 0.32, fin: true }),
];
const HEAVY = A('spin', 0.26, 0.32, 0.38, 2.9, TAU, 30, 11, 1.5, { stop: 0.09, shake: 0.35, heavy: true });
const AIR = A('over', 0.06, 9, 0.35, 2.7, TAU, 22, 8, 0, { stop: 0.08, shake: 0.45, air: true });

class Player extends Fighter {
  constructor() {
    const rig = buildHuman({ h: 1.04, w: 1.06, skin: 0xc4946e, shirt: 0x6e6a4a, trousers: 0x5c5940, vest: 0x3d2f22, head: 'jamana', headColor: 0x2a2018, beard: 'full', hairColor: 0x15100a, weapon: 'sabre', shoes: 0xe4dac6, belt: true });
    super(rig, 140); uniqueMats(this.root); this.mats = []; this.root.traverse(m => { if (m.isMesh && m.material.emissive && !this.mats.includes(m.material)) this.mats.push(m.material); });
    this.tipLen = 1.0; this.st = 100; this.stT = 0; this.combo = 0; this.comboWin = 0; this.inv = 0; this.buf = { atk: 0, heavy: 0, dodge: 0, jump: 0 }; this.target = null; this.dodgeDir = 0; this.perfect = 0;
    const lbl = makeLabel('گڕوت', '#ffd98a'); lbl.position.y = 2.25; lbl.scale.multiplyScalar(0.8); this.label = lbl; lbl.userData.draw = (() => { const d = lbl.userData.draw; return () => d(1, false); })(); lbl.visible = false; this.root.add(lbl);
  }
  reset() { this.hp = this.maxHp; this.st = 100; this.pos.set(0, 0, 6); this.y = 0; this.vy = 0; this.grounded = true; this.vel.set(0, 0, 0); this.kb.set(0, 0, 0); this.face = Math.PI; this.state = 'move'; this.dead = false; this.atk = null; this.inv = 0; this.combo = 0; this.P.bx = 0; this.root.visible = true; }
  pickTarget(dirAng) {
    let best = null, bs = 1e9;
    for (const e of enemies) { if (e.dead) continue; const d = distTo(this, e); if (d > 6) continue; const da = Math.abs(angDiff(dirAng, dirTo(this, e))); const s = d + da * 2.2; if (da < 1.9 && s < bs) { bs = s; best = e; } }
    return best;
  }
  startAttack(a) {
    this.atk = a; this.state = 'atk'; this.phase = 'wind'; this.pt = 0; this.hitSet.clear();
    const mv = input.mag > 0.2 ? input.ang : this.face; this.target = this.pickTarget(mv);
    if (!this.target && input.mag > 0.2) this.face = mv;
    Audio.swing(a.heavy || a.fin);
  }
  update(dt, t) {
    const B = this.buf; for (const k in B) B[k] = Math.max(0, B[k] - dt);
    if (this.inv > 0) this.inv -= dt; if (this.perfect > 0) this.perfect -= dt;
    this.stT -= dt; if (this.stT <= 0) this.st = Math.min(100, this.st + 30 * dt);
    if (this.comboWin > 0) { this.comboWin -= dt; if (this.comboWin <= 0) this.combo = 0; }
    const live = !this.dead && game.state === 'play';
    let k = 16;
    if (this.state === 'move') {
      const spd = 6.4 * input.mag, ctrl = this.grounded ? 1 : 0.45;
      const tx = Math.sin(input.ang) * spd, tz = Math.cos(input.ang) * spd;
      const acc = (input.mag > 0.05 ? 11 : 9) * ctrl;
      this.vel.x = damp(this.vel.x, tx, acc, dt); this.vel.z = damp(this.vel.z, tz, acc, dt);
      if (input.mag > 0.05) this.face = dampAng(this.face, input.ang, 13, dt);
      if (live) {
        if (B.dodge && this.st >= 18 && this.grounded) this.startDodge();
        else if (B.jump && this.grounded) { this.vy = 7.6; this.grounded = false; B.jump = 0; Audio.jump(); FX.burst(V.set(this.pos.x, 0.1, this.pos.z), 8, 0x8a7458, 2, 0.3, 4, 0.5); }
        else if (B.heavy && this.grounded && this.st >= 28) { B.heavy = 0; this.st -= 28; this.stT = 0.6; this.startAttack(HEAVY); }
        else if (B.atk) { B.atk = 0; if (!this.grounded && this.y > 0.6) { this.startAttack(AIR); this.vy = 2.5; } else if (this.grounded) { if (this.comboWin <= 0) this.combo = 0; this.startAttack(PLAYER_ATKS[this.combo % 3]); } }
      }
    } else if (this.state === 'atk') {
      const a = this.atk; k = 30;
      const dur = this.phase === 'wind' ? a.wind : this.phase === 'act' ? a.act : a.rec;
      this.pt += dt / dur;
      if (this.target && !this.target.dead && this.phase !== 'rec') this.face = dampAng(this.face, dirTo(this, this.target), 22, dt);
      let lunge = 0;
      if (this.phase === 'wind' && this.pt > 0.5 || this.phase === 'act') { lunge = a.lunge; if (this.target && !this.target.dead) { const gap = distTo(this, this.target) - this.target.radius - a.reach * 0.6; lunge = clamp(gap * 4, 0, a.lunge + 4); } }
      const fx = Math.sin(this.face), fz = Math.cos(this.face);
      if (!a.air) { this.vel.x = damp(this.vel.x, fx * lunge, 18, dt); this.vel.z = damp(this.vel.z, fz * lunge, 18, dt); } else { this.vel.multiplyScalar(Math.exp(-4 * dt)); }
      if (this.phase === 'wind' && this.pt >= 1) { this.phase = 'act'; this.pt = 0; if (a.air) this.vy = -16; }
      else if (this.phase === 'act') {
        if (!a.air) this.hitTest(a);
        if (this.pt >= 1 && !a.air) { this.phase = 'rec'; this.pt = 0; this.combo = a.heavy ? 0 : (this.combo + 1) % 3; this.comboWin = 0.55 + a.rec; }
      } else if (this.phase === 'rec') {
        if (live && B.dodge && this.st >= 18) this.startDodge();
        else if (live && this.pt > 0.3 && B.atk && !a.heavy) { B.atk = 0; this.startAttack(PLAYER_ATKS[this.combo % 3]); }
        else if (live && this.pt > 0.3 && B.heavy && this.st >= 28) { B.heavy = 0; this.st -= 28; this.stT = 0.6; this.startAttack(HEAVY); }
        else if (this.pt >= 1) { this.state = 'move'; this.atk = null; }
      }
      if (this.phase === 'wind' && live && B.dodge && this.st >= 18) this.startDodge();
    } else if (this.state === 'dodge') {
      this.pt += dt / 0.44; const sp = lerp(11.5, 2, this.pt);
      this.vel.set(Math.sin(this.dodgeDir) * sp, 0, Math.cos(this.dodgeDir) * sp);
      if (this.pt >= 1) { this.state = 'move'; this.T.bx = this.P.bx = 0; }
    } else if (this.state === 'hurt') {
      this.pt += dt / 0.32; this.vel.multiplyScalar(Math.exp(-10 * dt)); if (this.pt >= 1) this.state = 'move';
    } else if (this.state === 'dead') { this.vel.multiplyScalar(Math.exp(-6 * dt)); }
    this.move(dt);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.speedN = this.state === 'move' ? clamp(hs / 6.4, 0, 1) : 0; this.walkPh += dt * (4 + hs * 1.55);
    // pose
    const P = this.basePose(dt, t);
    if (this.state === 'atk') this.attackOverlay(P);
    if (this.state === 'dodge') { const u = this.pt; P.bx = TAU * ease(clamp(u * 1.15, 0, 1)); P.by = -0.38 * Math.sin(Math.PI * u); P.lL = P.lR = -1.5; P.kL = P.kR = 2.1; P.aLx = P.aRx = -1.1; P.eR = -1.4; }
    if (this.state === 'hurt') { P.spX = -0.45 * Math.sin(Math.PI * this.pt); P.hX = -0.3; P.aLz = 0.5; }
    if (this.state === 'dead') { P.bx = -1.5; P.by = -0.72; P.lL = -0.3; P.kL = 0.4; P.aLz = 1.2; P.aRz = -1.2; P.aLx = P.aRx = -0.3; }
    this.smoothPose(dt, k);
    this.flash(dt);
    Trail.update(dt, this.state === 'atk' && (this.phase === 'act' || (this.phase === 'wind' && this.pt > 0.75) || (this.phase === 'rec' && this.pt < 0.15)) && !this.atk.air || (this.state === 'atk' && this.atk.air && this.phase === 'act'), this.rig.weapon, V2.set(0, 0, 1.0), V.set(0, 0, 0.25));
  }
  onLand() {
    Audio.land();
    if (this.state === 'atk' && this.atk.air) {
      const a = this.atk; this.phase = 'rec'; this.pt = 0; FX.ring(this.pos, 0.3, 3.2, 0.45, 0xffc070); FX.burst(V.set(this.pos.x, 0.2, this.pos.z), 26, 0xd0a070, 5, 0.6, 9, 0.6); Audio.slam(); shake(0.45);
      for (const e of enemies) if (!e.dead && distTo(this, e) < 2.9 + e.radius) e.takeHit(a.dmg, dirTo(this, e), a.kb, this, true);
    } else FX.burst(V.set(this.pos.x, 0.05, this.pos.z), 6, 0x8a7458, 1.5, 0.2, 3, 0.4);
  }
  startDodge() {
    this.buf.dodge = 0; this.st -= 18; this.stT = 0.5; this.state = 'dodge'; this.pt = 0; this.atk = null;
    this.dodgeDir = input.mag > 0.2 ? input.ang : this.face; this.face = this.dodgeDir; this.inv = 0.36; Audio.whoosh();
    FX.burst(V.set(this.pos.x, 0.1, this.pos.z), 10, 0x9a8466, 2.5, 0.2, 3, 0.5);
  }
  hitTest(a) {
    let any = false;
    const tryHit = e => {
      if (e.dead || this.hitSet.has(e)) return;
      const d = distTo(this, e) - e.radius, da = Math.abs(angDiff(this.face + (this.P.bry || 0), dirTo(this, e)));
      if (d < a.reach && (a.arc >= TAU - 0.01 || da < a.arc / 2 || d < 0.5)) { this.hitSet.add(e); e.takeHit(a.dmg, dirTo(this, e), a.kb, this, a.heavy || a.fin); any = true; }
    };
    enemies.forEach(tryHit);
    if (any) { hitStop(a.stop); shake(a.shake || 0.12); }
  }
  takeHit(dmg, ang, kb, src) {
    if (this.dead || this.inv > 0 || game.state !== 'play') { if (this.state === 'dodge' && this.perfect <= 0 && game.state === 'play') { this.perfect = 1.5; game.slowmo = 0.6; showCombo('خۆلادانی تەواو!'); } return false; }
    if (game.god) dmg = 0;
    this.hp -= dmg; this.flashT = 0.18; this.inv = 0.45; this.kb.set(Math.sin(ang) * kb, 0, Math.cos(ang) * kb);
    FX.burst(V.set(this.pos.x, 1.2, this.pos.z), 14, 0xff6040, 4, 0.6, 9, 0.4); FX.num(V.set(this.pos.x, 2.1, this.pos.z), dmg, '#ff7a5a');
    Audio.hurt(); shake(0.4); hitStop(0.06); dmgFlash();
    if (this.state !== 'dodge') { this.state = 'hurt'; this.pt = 0; this.atk = null; }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.state = 'dead'; Audio.death(); game.slowmo = 1.2; setTimeout(() => endGame(false), 2200); }
    return true;
  }
}

// ---------- enemies ----------
class Enemy extends Fighter {
  constructor(name, def, spawn) {
    const rig = buildHuman(Object.assign({ weapon: def.weapon, offWeapon: def.offWeapon }, def.look));
    super(rig, def.hp, def.scale || 1); uniqueMats(this.root); this.mats = []; this.root.traverse(m => { if (m.isMesh && m.material.emissive && !this.mats.includes(m.material)) this.mats.push(m.material); });
    this.name = name; this.def = def; this.guard = GUARD[def.guard] || GUARD.default; this.speed = def.speed; this.tipLen = 1;
    this.pos.set(spawn.x, 0, spawn.z); this.face = Math.atan2(-spawn.x, -spawn.z); this.spawning = true; this.state = 'spawn';
    this.cool = rand(0.8, 2.2); this.token = false; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = rand(1.5, 3.5); this.ringOff = rand(0, 1.4); this.poiseHits = 0; this.deadT = 0;
    const lbl = makeLabel(name); lbl.position.y = 2.25; this.label = lbl; this.root.add(lbl);
  }
  release() { if (this.token) { this.token = false; game.used = Math.max(0, game.used - 1); } }
  startAttack(a) { this.atk = a; this.state = 'atk'; this.phase = 'wind'; this.pt = 0; this.hitSet.clear(); weaponTipWorld(this, V); FX.burst(V, 7, 0xfff0c0, 1.2, 0.5, 0, 0.35); }
  takeHit(dmg, ang, kb, src, heavy) {
    if (this.dead || this.inv > 0) return;
    dmg = Math.round(dmg * rand(0.92, 1.08)); this.hp -= dmg; this.flashT = 0.12;
    const k = kb / (this.def.poise || 1) * (heavy ? 1.3 : 1); this.kb.set(Math.sin(ang) * k, 0, Math.cos(ang) * k);
    weaponTipWorld(src, V); V.lerp(V2.set(this.pos.x, 1.2 * this.scale, this.pos.z), 0.7);
    FX.burst(V, heavy ? 22 : 13, heavy ? 0xffc060 : 0xffe0a0, heavy ? 6 : 4.5, 0.4, 10, 0.35);
    FX.num(V2.set(this.pos.x, 2.3 * this.scale, this.pos.z), dmg, heavy ? '#ffd060' : '#fff2c8', heavy);
    Audio.hit(heavy); if (Math.random() < 0.3) Audio.clang();
    game.combo++; game.comboT = 1.6; game.maxCombo = Math.max(game.maxCombo, game.combo); if (game.combo >= 2) showCombo(kn(game.combo) + ' لێدان');
    this.poiseHits++;
    const armored = this.state === 'atk' && this.phase === 'act' && (this.def.poise || 1) > 1;
    if (!armored && (heavy || this.poiseHits >= (this.def.poise || 1))) { this.poiseHits = 0; this.release(); this.state = 'stag'; this.pt = 0; this.stagDur = heavy ? 0.6 : 0.38; this.atk = null; this.cool = Math.max(this.cool, rand(0.5, 1.2)); }
    if (this.hp <= 0) this.die();
    this.label.userData.draw(Math.max(0, this.hp / this.maxHp), false);
  }
  die() {
    this.hp = 0; this.dead = true; this.state = 'dead'; this.release(); this.deadT = 0; game.kills++; Audio.death();
    this.kb.multiplyScalar(1.6); this.label.visible = false;
    if (Math.random() < 0.55) dropPickup(this.pos.x, this.pos.z);
  }
  think(dt) {
    const p = player, d = distTo(this, p), ang = dirTo(this, p), live = !p.dead && game.state === 'play';
    if (this.state === 'spawn') {
      const ta = Math.atan2(-this.pos.x, -this.pos.z); this.face = dampAng(this.face, ta, 8, dt);
      this.vel.set(Math.sin(this.face) * this.speed, 0, Math.cos(this.face) * this.speed);
      if (Math.hypot(this.pos.x, this.pos.z) < ARENA - 3) { this.spawning = false; this.state = 'move'; }
      return;
    }
    if (this.state === 'stag') { this.pt += dt / this.stagDur; this.vel.multiplyScalar(Math.exp(-10 * dt)); if (this.pt >= 1) this.state = 'move'; return; }
    if (this.state === 'move') {
      this.cool -= dt; this.strafeT -= dt; if (this.strafeT < 0) { this.strafeT = rand(1.5, 3.5); this.strafe *= -1; }
      const reach = this.def.atks[0].reach, want = this.token ? reach * 0.75 : 3.6 + this.ringOff + reach * 0.3;
      let mx = 0, mz = 0, sp = this.speed;
      if (!live) { mx = -Math.sin(ang); mz = -Math.cos(ang); sp *= 0.3; if (d > 7) sp = 0; }
      else if (d > want + 0.4) { mx = Math.sin(ang); mz = Math.cos(ang); }
      else if (d < want - 0.8) { mx = -Math.sin(ang) * 0.6; mz = -Math.cos(ang) * 0.6; sp *= 0.6; }
      else { mx = Math.cos(ang) * this.strafe; mz = -Math.sin(ang) * this.strafe; sp *= 0.38; }
      // separation
      for (const o of enemies) if (o !== this && !o.dead) { const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, dd = Math.hypot(dx, dz), m = this.radius + o.radius + 0.5; if (dd < m && dd > 1e-3) { mx += dx / dd * (m - dd) * 2; mz += dz / dd * (m - dd) * 2; } }
      const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
      this.vel.x = damp(this.vel.x, mx * sp, 7, dt); this.vel.z = damp(this.vel.z, mz * sp, 7, dt);
      this.face = dampAng(this.face, ang, 7, dt);
      if (live && this.cool <= 0 && !this.token && game.used < game.tokens && d < 7) { this.token = true; game.used++; }
      if (live && this.token && this.cool <= 0 && d < reach + 0.9) this.startAttack(this.pickAtk());
      if (this.token && this.cool < -4) { this.release(); this.cool = 1; }
    } else if (this.state === 'atk') {
      const a = this.atk, dur = this.phase === 'wind' ? a.wind : this.phase === 'act' ? a.act : a.rec;
      this.pt += dt * (this.tscale || 1) / dur;
      if (a.multi && this.phase === 'act') { this.multiT = (this.multiT || 0) + dt; if (this.multiT > a.multi) { this.multiT = 0; this.hitSet.clear(); } }
      if (this.phase === 'wind') { this.face = dampAng(this.face, ang, 5, dt); this.vel.multiplyScalar(Math.exp(-8 * dt)); this.label.userData.draw(this.hp / this.maxHp, true); }
      if (this.phase === 'act') { const l = a.lunge * (1 - this.pt) * (d > 1.2 ? 1 : 0.2); this.vel.set(Math.sin(this.face) * l, 0, Math.cos(this.face) * l); if (a.t === 'spin') this.face = dampAng(this.face, ang, 3, dt); }
      if (this.phase === 'rec') this.vel.multiplyScalar(Math.exp(-8 * dt));
      if (this.phase === 'wind' && this.pt >= 1) { this.phase = 'act'; this.pt = 0; Audio.swing(a.dmg > 15); this.label.userData.draw(this.hp / this.maxHp, false); }
      else if (this.phase === 'act') {
        if (!this.hitSet.has(p) && live) { const dd = d - p.radius, da = Math.abs(angDiff(this.face, ang)); if (dd < a.reach && (da < a.arc / 2 || a.arc >= TAU - 0.01) && p.y < 1.4) { this.hitSet.add(p); p.takeHit(a.dmg, ang, a.kb, this); } }
        if (this.pt >= 1) { this.phase = 'rec'; this.pt = 0; if (a.wave) this.wave(); }
      } else if (this.phase === 'rec') {
        const follow = this.def.atks.find(x => x.chain === this.def.atks.indexOf(a));
        if (follow && this.pt > 0.3 && Math.random() < 0.6 && !this.chained) { this.chained = true; this.startAttack(follow); this.phase = 'wind'; return; }
        if (this.pt >= 1) { this.state = 'move'; this.atk = null; this.chained = false; this.release(); this.cool = rand(1.0, 2.4) / (1 + game.stage * 0.15); }
      }
    }
  }
  pickAtk() { const list = this.def.atks.filter(a => a.chain === undefined); return list[Math.floor(Math.random() * list.length)]; }
  wave() { weaponTipWorld(this, V); V.y = 0; FX.ring(V, 0.3, 4.5, 0.5, 0xffb060); FX.burst(V.setY(0.2), 20, 0xc8a070, 4, 0.6, 9, 0.6); Audio.slam(); shake(0.3); game.waves.push({ x: V.x, z: V.z, r: 0.3, v: 9, max: 4.5, dmg: 10, hit: false }); }
  update(dt, t) {
    if (this.dead) {
      this.deadT += dt; this.vel.multiplyScalar(Math.exp(-5 * dt));
      if (this.deadT > 2.2) this.y = -(this.deadT - 2.2) * 0.6;
      this.move(dt);
      const P = this.basePose(dt, t); P.bx = -1.5; P.by = -0.7; P.lL = -0.4; P.kL = 0.6; P.aLz = 1.2; P.aRz = -1.3; P.aLx = P.aRx = -0.4; this.speedN = 0;
      this.smoothPose(dt, 9); this.flash(dt);
      if (this.deadT > 3.4) { scene.remove(this.root); this.removed = true; }
      return;
    }
    this.think(dt);
    this.move(dt);
    const hs = Math.hypot(this.vel.x, this.vel.z); this.speedN = this.state === 'atk' ? 0 : clamp(hs / 5, 0, 1); this.walkPh += dt * (4 + hs * 1.6);
    const P = this.basePose(dt, t);
    if (this.state === 'atk') this.attackOverlay(P);
    if (this.state === 'stag') { const s = Math.sin(Math.PI * this.pt); P.spX = -0.5 * s; P.hX = -0.35 * s; P.aRx = -0.2; P.aLz = 0.6 * s; P.by = -0.06 * s; }
    this.smoothPose(dt, this.state === 'atk' ? 28 : 14);
    this.flash(dt);
  }
}

// ---------- boss: Miran ----------
let faceTex = null, boss = null;
const BOSS_DEF = {
  weapon: 'greatsword', guard: 'two', hp: 1000, speed: 3.2, poise: 99, scale: 1.62,
  look: { w: 1.22, h: 1.02, glow: true, shirt: 0x15120f, trousers: 0x14110e, coat: 0x1c1610, vest: 0x3a2a12, vestOpen: false, pads: 0xb08a3a, cape: 0x5a1210, sashColor: 0xa07a2a, head: 'crown', beard: 'none', hairColor: 0x15100c, skin: 0xc7977c, shoes: 0x1a1410, headScale: 1.3, belt: true, noFace: true },
  atks: [A('hor', 0.62, 0.18, 0.35, 3.3, 2.5, 18, 8, 4), A('horR', 0.34, 0.18, 0.6, 3.3, 2.5, 18, 9, 4, { chain: 0 }), A('slam', 0.95, 0.18, 0.85, 3.1, 1.3, 26, 12, 3, { wave: true }), A('thrust', 0.7, 0.18, 0.6, 4.0, 0.7, 20, 10, 10),
    A('spin', 0.6, 1.1, 0.6, 3.3, TAU, 13, 9, 0, { spins: 2, multi: 0.45, p2: true })],
};
class Boss extends Enemy {
  constructor() {
    super('میران', BOSS_DEF, { x: 0, z: -15 });
    this.spawning = false; this.state = 'move'; this.face = 0; this.phaseN = 1; this.poiseDmg = 0; this.tscale = 1; this.inv = 0; this.leapCool = 4;
    this.root.remove(this.label); this.label = makeLabel('میران', '#ffb070', true); this.label.position.y = 2.35; this.root.add(this.label);
    // the face
    const fg = new THREE.PlaneGeometry(0.245, 0.33, 10, 10), p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * 3.4 - y * y * 0.9); }
    fg.computeVertexNormals();
    const fm = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, alphaTest: 0.03, roughness: 0.75, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.38 }); fm.userData.keepEm = true;
    const face = new THREE.Mesh(fg, fm); face.position.set(0, 0.0, 0.124); this.rig.head.add(face); this.faceMesh = face;
    this.bladeMat = null; this.root.traverse(m => { if (m.isMesh && m.material.userData.keepEm && m.material.color.getHex() === 0x2b2b33) this.bladeMat = m.material; });
    // leap marker
    this.marker = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3a20, transparent: true, opacity: 0, depthWrite: false })); this.marker.position.y = 0.05; scene.add(this.marker);
    this.tipLen = 1.9;
  }
  pickAtk() {
    const list = this.def.atks.filter(a => a.chain === undefined && (!a.p2 || this.phaseN >= 2));
    return list[Math.floor(Math.random() * list.length)];
  }
  takeHit(dmg, ang, kb, src, heavy) {
    if (this.dead || this.inv > 0 || this.state === 'roar') return;
    const before = this.hp;
    dmg = Math.round(dmg * rand(0.92, 1.08)); this.hp -= dmg; this.flashT = 0.1; this.poiseDmg += dmg;
    if (this.state !== 'leap') this.kb.set(Math.sin(ang) * kb * 0.15, 0, Math.cos(ang) * kb * 0.15);
    weaponTipWorld(src, V); V.lerp(V2.set(this.pos.x, 1.6, this.pos.z), 0.6);
    FX.burst(V, heavy ? 24 : 14, heavy ? 0xffc060 : 0xffe0a0, heavy ? 6 : 4.5, 0.4, 10, 0.35); FX.num(V2.set(this.pos.x, 3.6, this.pos.z), dmg, heavy ? '#ffd060' : '#fff2c8', heavy);
    Audio.hit(heavy); if (Math.random() < 0.4) Audio.clang();
    game.combo++; game.comboT = 1.6; game.maxCombo = Math.max(game.maxCombo, game.combo); if (game.combo >= 2) showCombo(kn(game.combo) + ' لێدان');
    if (this.poiseDmg > 95 && this.state !== 'leap' && !(this.state === 'atk' && this.phase === 'act')) { this.poiseDmg = 0; this.release(); this.state = 'stag'; this.pt = 0; this.stagDur = 1.1; this.atk = null; banner('', 'میران لەرزی!', 1.0); }
    const f = this.hp / this.maxHp;
    if (this.hp <= 0) { this.die(); return; }
    if (this.phaseN === 1 && f < 0.6 || this.phaseN === 2 && f < 0.3) this.enterPhase(this.phaseN + 1);
  }
  enterPhase(n) {
    this.phaseN = n; this.release(); this.atk = null; this.state = 'roar'; this.pt = 0; this.tscale = n === 3 ? 1.25 : 1.08; this.speed = BOSS_DEF.speed * (n === 3 ? 1.3 : 1.12);
    Audio.roar(); shake(0.6); FX.ring(this.pos, 0.5, 8, 0.7, 0xff5030);
    banner(n === 2 ? 'میران تووڕە بوو!' : 'تووڕەیی کۆتایی!', n === 2 ? 'ئاگاداری بازدانەکەی بە' : 'بە بازدان لە شەپۆلەکان دەرباز بە', 2.2);
    const d = distTo(this, player); if (d < 7) { const a = dirTo(this, player); player.kb.set(Math.sin(a) * 12, 0, Math.cos(a) * 12); }
  }
  die() {
    this.hp = 0; this.dead = true; this.state = 'dead'; this.release(); this.deadT = 0; game.kills++; this.label.visible = false; this.marker.material.opacity = 0;
    Audio.roar(); game.slowmo = 2.0; shake(0.8); FX.burst(V.set(this.pos.x, 1.5, this.pos.z), 60, 0xffa040, 7, 0.8, 6, 1.2);
    banner('میران تێکشکا!', 'گوندەکە ڕزگار بوو', 3); game.winT = 4.2;
  }
  wave() {
    weaponTipWorld(this, V); V.y = 0; const n = this.phaseN === 3 ? 2 : 1;
    for (let i = 0; i < n; i++) { const wv = { x: V.x, z: V.z, r: 0.3 - i * 2.6, v: 8.5, max: 11, dmg: 14, hit: false }; game.waves.push(wv); const c0 = new THREE.Vector3(wv.x, 0, wv.z); setTimeout(() => FX.ring(c0, 0.3, 11, 11 / 8.5, 0xff8040), i * 300); }
    FX.burst(V.setY(0.2), 34, 0xd0a070, 6, 0.6, 9, 0.8); Audio.slam(); shake(0.6);
  }
  think(dt) {
    if (this.inv > 0) this.inv -= dt;
    const p = player, d = distTo(this, p);
    if (this.bladeMat) this.bladeMat.emissiveIntensity = damp(this.bladeMat.emissiveIntensity, this.phaseN === 3 ? 2.2 : this.phaseN === 2 ? 1.0 : (this.state === 'atk' && this.phase === 'wind' ? 1.4 : 0.25), 6, dt);
    if (this.phaseN === 3 && Math.random() < 0.5) FX.burst(V.set(this.pos.x + rand(-0.7, 0.7), rand(0.3, 2.8), this.pos.z + rand(-0.7, 0.7)), 1, 0xff3a10, 0.6, 1.5, -2, 0.6);
    if (this.state === 'roar') { this.pt += dt / 1.5; this.vel.multiplyScalar(Math.exp(-8 * dt)); if (this.pt >= 1) { this.state = 'move'; this.cool = 0.4; } return; }
    if (this.state === 'leap') {
      const L = this.leap; L.t += dt * this.tscale;
      if (L.t < 0.5) { this.vel.set(0, 0, 0); this.face = dampAng(this.face, dirTo(this, p), 8, dt); L.tx = lerp(L.tx, p.pos.x, dt * 4); L.tz = lerp(L.tz, p.pos.z, dt * 4); }
      else { if (!L.sx) { L.sx = this.pos.x; L.sz = this.pos.z; Audio.whoosh(); }
        const u = clamp((L.t - 0.5) / 0.85, 0, 1); this.pos.x = lerp(L.sx, L.tx, u); this.pos.z = lerp(L.sz, L.tz, u); this.y = Math.sin(Math.PI * u) * 5.5; this.vel.set(0, 0, 0);
        if (u >= 1) { this.y = 0; this.state = 'atk'; this.atk = BOSS_DEF.atks[2]; this.phase = 'rec'; this.pt = 0.3; this.marker.material.opacity = 0; FX.ring(this.pos, 0.4, 4.2, 0.45, 0xffb060); FX.burst(V.set(this.pos.x, 0.2, this.pos.z), 40, 0xd0a070, 7, 0.6, 9, 0.8); Audio.slam(); shake(0.8);
          if (distTo(this, p) < 3.8 + p.radius && p.y < 1.0) p.takeHit(24, dirTo(this, p), 13, this);
          game.waves.push({ x: this.pos.x, z: this.pos.z, r: 1, v: 9, max: 9, dmg: 12, hit: false }); FX.ring(V2.set(this.pos.x, 0, this.pos.z), 1, 9, 8 / 9, 0xff8040);
        } }
      this.marker.position.set(L.tx, 0.05, L.tz); this.marker.material.opacity = 0.18 + 0.15 * Math.sin(L.t * 18);
      return;
    }
    if (this.state === 'move' && this.phaseN >= 2) { this.leapCool -= dt; if (this.leapCool <= 0 && this.cool <= 0 && d > 5 && !p.dead) { this.leapCool = this.phaseN === 3 ? rand(4, 6) : rand(6, 9); this.state = 'leap'; this.leap = { t: 0, tx: p.pos.x, tz: p.pos.z }; this.release(); return; } }
    super.think(dt);
  }
  update(dt, t) {
    super.update(dt, t);
    if (this.state === 'leap' && !this.dead) { const P = this.T; const u = this.leap.t < 0.5 ? this.leap.t / 0.5 : 1; P.by = this.leap.t < 0.5 ? -0.25 * u : 0; P.kL = P.kR = this.leap.t < 0.5 ? 1.2 * u : 0.4; P.lL = P.lR = this.leap.t < 0.5 ? -0.8 * u : -0.3; P.aRx = P.aLx = this.leap.t < 0.5 ? -0.3 : -2.9; this.smoothPose(dt, 20); }
    if (this.state === 'roar') { const P = this.T; P.spX = -0.35; P.hX = -0.4; P.aLz = 1.0; P.aRz = -1.0; P.aRx = -0.4; P.aLx = -0.4; P.by = -0.05; this.smoothPose(dt, 10); }
  }
}

// ---------- input ----------
const input = { mag: 0, ang: 0, sx: 0, sy: 0, keys: {}, atkHeld: false, stickId: null, camId: null, camX: 0, camY: 0, lastCam: 0 };
const cam = { yaw: Math.PI, pitch: 0.32, dist: 5.4, tgt: new THREE.Vector3(0, 1.4, 6), cine: null, menuA: 0 };
const stickEl = $('stick'), knobEl = $('knob'), zone = $('stickZone');
let stickO = { x: 0, y: 0 };
zone.addEventListener('pointerdown', e => {
  e.preventDefault(); if (input.stickId !== null) return; input.stickId = e.pointerId; stickO = { x: e.clientX, y: e.clientY };
  stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.add('on'); Audio.init();
});
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') { if (game.state === 'play' && document.pointerLockElement !== canvas) canvas.requestPointerLock && canvas.requestPointerLock(); else if (game.state === 'play') { if (e.button === 0) player.buf.atk = 0.3; if (e.button === 2) player.buf.heavy = 0.3; } return; }
  if (input.camId === null) { input.camId = e.pointerId; input.camX = e.clientX; input.camY = e.clientY; }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('pointermove', e => {
  if (e.pointerId === input.stickId) {
    const R = stickEl.offsetWidth * 0.5; let dx = (e.clientX - stickO.x) / R, dy = (e.clientY - stickO.y) / R; const l = Math.hypot(dx, dy);
    if (l > 1) { // drag the stick base along so it never feels stuck
      stickO.x += (dx / l) * (l - 1) * R; stickO.y += (dy / l) * (l - 1) * R; stickEl.style.left = stickO.x + 'px'; stickEl.style.top = stickO.y + 'px'; dx /= l; dy /= l;
    }
    input.sx = dx; input.sy = dy; knobEl.style.transform = `translate(${dx * R * 0.62}px,${dy * R * 0.62}px)`;
  } else if (e.pointerId === input.camId) {
    const dx = e.clientX - input.camX, dy = e.clientY - input.camY; input.camX = e.clientX; input.camY = e.clientY;
    cam.yaw -= dx * 0.0062; cam.pitch = clamp(cam.pitch + dy * 0.0042, -0.12, 1.05); input.lastCam = performance.now();
  }
});
const endPtr = e => {
  if (e.pointerId === input.stickId) { input.stickId = null; input.sx = input.sy = 0; knobEl.style.transform = ''; stickEl.classList.remove('on'); stickEl.style.left = ''; stickEl.style.top = ''; }
  if (e.pointerId === input.camId) input.camId = null;
};
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
document.addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { cam.yaw -= e.movementX * 0.0032; cam.pitch = clamp(cam.pitch + e.movementY * 0.0025, -0.12, 1.05); } });
const bindBtn = (id, down, up) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); Audio.init(); down(); }); const u = e => { b.classList.remove('on'); up && up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); };
bindBtn('bAtk', () => { input.atkHeld = true; player.buf.atk = 0.35; }, () => { input.atkHeld = false; });
bindBtn('bHeavy', () => player.buf.heavy = 0.35);
bindBtn('bDodge', () => player.buf.dodge = 0.3);
bindBtn('bJump', () => player.buf.jump = 0.25);
bindBtn('bPause', () => togglePause());
bindBtn('bMute', () => { const m = Audio.toggleMute(); $('bMute').style.opacity = m ? 0.45 : 1; });
addEventListener('keydown', e => {
  input.keys[e.code] = true; Audio.init();
  if (!player) return;
  if (e.code === 'KeyJ') player.buf.atk = 0.35; if (e.code === 'KeyK') player.buf.heavy = 0.35;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyL') player.buf.dodge = 0.3;
  if (e.code === 'Space') { player.buf.jump = 0.25; e.preventDefault(); }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') Audio.toggleMute();
});
addEventListener('keyup', e => { input.keys[e.code] = false; });
function readInput(dt) {
  const K = input.keys; let x = input.sx, y = input.sy;
  if (K.KeyA || K.ArrowLeft) x -= 1; if (K.KeyD || K.ArrowRight) x += 1; if (K.KeyW || K.ArrowUp) y -= 1; if (K.KeyS || K.ArrowDown) y += 1;
  if (K.KeyQ) cam.yaw += 2.2 * dt; if (K.KeyE) cam.yaw -= 2.2 * dt;
  let m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; m = 1; }
  const dz = 0.12; input.mag = m < dz ? 0 : (m - dz) / (1 - dz);
  const fy = -y, fx = x, sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  if (m > 0) input.ang = Math.atan2(sy * fy - cy * fx, cy * fy + sy * fx);
  if (input.atkHeld && player) player.buf.atk = Math.max(player.buf.atk, 0.12);
}

// ---------- UI ----------
let bannerT = 0;
function banner(title, sub, dur = 2.4) { $('bTitle').textContent = title; $('bSub').textContent = sub; $('banner').classList.add('show'); bannerT = dur; }
let comboT = 0; function showCombo(t) { const c = $('combo'); c.textContent = t; c.classList.add('show'); comboT = 1.1; }
let flashT = 0; function dmgFlash() { $('dmgFlash').style.opacity = 1; flashT = 0.15; }
function updateUI(dt) {
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  if (comboT > 0) { comboT -= dt; if (comboT <= 0) $('combo').classList.remove('show'); }
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('dmgFlash').style.opacity = 0; }
  $('hpFill').style.width = (player.hp / player.maxHp * 100).toFixed(1) + '%';
  $('stFill').style.width = player.st.toFixed(0) + '%';
  const alive = enemies.filter(e => !e.dead).length + game.spawnQ.length;
  $('leftTxt').textContent = STAGES[game.stage].boss ? '' : 'دوژمن: ' + kn(alive);
  if (boss) $('bossFill').style.width = (Math.max(0, boss.hp) / boss.maxHp * 100).toFixed(1) + '%';
}

// ---------- flow ----------
game.spawnQ = [];
const GAPS = [0, 1, 2, 3].map(q => (4 / 64) * TAU + q * TAU / 4);
function clearAll() {
  for (const e of enemies) { scene.remove(e.root); if (e.marker) scene.remove(e.marker); }
  enemies.length = 0; game.used = 0; game.waves.length = 0; game.spawnQ.length = 0; boss = null;
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
}
function startGame(stage = 0) {
  Audio.init(); Audio.ui(); clearAll(); player.reset();
  Object.assign(game, { time: 0, kills: 0, maxCombo: 0, combo: 0, stageClearT: -1, winT: 0, slowmo: 0, hitStop: 0 });
  ['start', 'end', 'pause'].forEach(id => $(id).classList.add('hidden')); $('hud').classList.remove('hidden'); $('touch').classList.remove('hidden'); $('bossBar').classList.add('hidden');
  cam.yaw = Math.PI; cam.pitch = 0.32; cam.tgt.set(0, 1.4, 6);
  game.state = 'play'; Audio.music(true);
  startStage(stage);
}
function startStage(i) {
  game.stage = i; const S = STAGES[i]; applyLook(i); game.tokens = S.tokens; game.used = 0; game.stageClearT = -1;
  $('stageName').textContent = S.sub + ' · ' + S.name;
  if (S.boss) { startBoss(); return; }
  banner(S.name, S.sub, 2.6);
  const pa = Math.atan2(player.pos.z, player.pos.x);
  const gaps = GAPS.slice().sort((a, b) => Math.abs(angDiff(b, pa)) - Math.abs(angDiff(a, pa)));
  S.foes.forEach((n, k) => game.spawnQ.push({ t: 1.6 + k * 1.1, name: n, a: gaps[k % 2] + rand(-0.04, 0.04) }));
}
function spawnEnemy(q) { const r = ARENA + 4; enemies.push(new Enemy(q.name, ROSTER[q.name], { x: Math.cos(q.a) * r, z: Math.sin(q.a) * r })); }
function startBoss() {
  player.pos.set(0, 0, 7); player.face = Math.PI; player.vel.set(0, 0, 0); cam.yaw = Math.PI; cam.tgt.set(0, 1.4, 7);
  boss = new Boss(); enemies.push(boss); boss.face = 0;
  game.state = 'cine'; cam.cine = { t: 0, dur: 4.2 }; Audio.roar();
  banner('میران', 'سەرۆکی خەلیفەکان', 3.6); $('banner').classList.add('low');
}
function endGame(win) {
  if (game.state === 'over') return;
  game.state = 'over'; Audio.music(false); win ? Audio.win() : Audio.lose();
  if (document.pointerLockElement) document.exitPointerLock();
  $('endTitle').textContent = win ? 'سەرکەوتیت!' : 'گڕوت کەوت…';
  $('endSub').textContent = win ? 'گڕوت میرانی تێکشکاند و گوندەکەی ڕزگار کرد.' : 'خەلیفەکان ئەمجارە بردیانەوە. دووبارە هەوڵ بدەرەوە!';
  const tm = Math.floor(game.time), mm = Math.floor(tm / 60), ss = String(tm % 60).padStart(2, '0');
  $('endStats').textContent = `دوژمنی تێکشکاو: ${kn(game.kills)} · زۆرترین زنجیرە: ${kn(game.maxCombo)} · کات: ${kn(mm)}:${kn(ss)}`;
  $('end').classList.remove('hidden'); $('touch').classList.add('hidden');
}
function togglePause(force) {
  if (game.state === 'play' || game.state === 'cine') { game.prev = game.state; game.state = 'paused'; $('pause').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); }
  else if (game.state === 'paused' && force !== true) { game.state = game.prev; $('pause').classList.add('hidden'); }
}
function toMenu() { clearAll(); player.reset(); player.pos.set(0, 0, 0); game.state = 'menu'; Audio.music(false); applyLook(0); ['end', 'pause', 'hud', 'touch'].forEach(id => $(id).classList.add('hidden')); $('start').classList.remove('hidden'); }
async function goFull() {
  if (!isTouch || Q.has('nofs')) return;
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { }
  try { await screen.orientation.lock('landscape'); } catch (e) { }
}
$('playBtn').addEventListener('click', () => { goFull(); startGame(+(Q.get('stage') || 0)); });
$('resumeBtn').addEventListener('click', () => togglePause());
$('restartBtn').addEventListener('click', () => startGame(0));
$('menuBtn').addEventListener('click', toMenu);
$('againBtn').addEventListener('click', () => { goFull(); startGame(0); });
$('endMenuBtn').addEventListener('click', toMenu);
const portrait = () => isTouch && innerHeight > innerWidth;
document.addEventListener('visibilitychange', () => { if (document.hidden && (game.state === 'play' || game.state === 'cine')) togglePause(); });

// ---------- camera ----------
const camPos = new THREE.Vector3(), lookAt = new THREE.Vector3(), shakeO = new THREE.Vector3();
function updateCamera(dt, t) {
  if (game.state === 'menu') {
    cam.menuA += dt * 0.12; const a = 2.6 + Math.sin(cam.menuA) * 0.5, r = 4.4;
    camPos.set(Math.sin(a) * r, 1.55 + Math.sin(cam.menuA * 0.7) * 0.15, Math.cos(a) * r);
    const right = V.set(-Math.cos(a), 0, Math.sin(a));
    lookAt.set(0, 1.15, 0).addScaledVector(right, -1.25);
    camera.position.copy(camPos); camera.lookAt(lookAt); return;
  }
  if (game.state === 'cine' && cam.cine && boss) {
    const c = cam.cine; c.t += dt; const u = clamp(c.t / c.dur, 0, 1);
    const hp = boss.rig.head.getWorldPosition(V); const f = V2.set(Math.sin(boss.face), 0, Math.cos(boss.face));
    const close = camPos.copy(hp).addScaledVector(f, 1.25).add(V2.set(0.25, 0.05, 0));
    if (u < 0.55) { camera.position.copy(close); camera.lookAt(hp); }
    else {
      const k = ease((u - 0.55) / 0.45); const behind = lookAt.set(player.pos.x - Math.sin(cam.yaw) * cam.dist * Math.cos(cam.pitch), 1.4 + cam.dist * Math.sin(cam.pitch), player.pos.z - Math.cos(cam.yaw) * cam.dist * Math.cos(cam.pitch));
      camera.position.lerpVectors(close, behind, k); const la = V2.copy(hp).lerp(V.set(player.pos.x, 1.4, player.pos.z), k); camera.lookAt(la);
    }
    if (u >= 1) { cam.cine = null; game.state = 'play'; $('banner').classList.remove('low'); $('bossBar').classList.remove('hidden'); cam.tgt.set(player.pos.x, 1.4, player.pos.z); }
    return;
  }
  const p = player, moving = input.mag > 0.3 && p.state === 'move';
  // gentle auto-follow when the player runs sideways and isn't touching the camera
  if (moving && performance.now() - input.lastCam > 1400) { const d = angDiff(cam.yaw, input.ang); if (Math.abs(d) < 2.0) cam.yaw += d * (1 - Math.exp(-0.7 * dt)); }
  const dist = boss && !boss.dead ? 6.6 : cam.dist;
  cam.curDist = damp(cam.curDist || dist, dist, 2, dt);
  cam.tgt.x = damp(cam.tgt.x, p.pos.x, 10, dt); cam.tgt.z = damp(cam.tgt.z, p.pos.z, 10, dt); cam.tgt.y = damp(cam.tgt.y, 1.45 + p.y * 0.5, 6, dt);
  const cp = Math.cos(cam.pitch), D = cam.curDist;
  camPos.set(cam.tgt.x - Math.sin(cam.yaw) * D * cp, cam.tgt.y + Math.sin(cam.pitch) * D + 0.25, cam.tgt.z - Math.cos(cam.yaw) * D * cp);
  if (camPos.y < 0.35) camPos.y = 0.35;
  lookAt.copy(cam.tgt);
  if (boss && !boss.dead) lookAt.lerp(V.set(boss.pos.x, 1.6, boss.pos.z), 0.12);
  game.trauma = Math.max(0, game.trauma - dt * 1.7); const s = game.trauma * game.trauma;
  shakeO.set(Math.sin(t * 61) * 0.3, Math.sin(t * 47 + 1) * 0.25, Math.sin(t * 53 + 2) * 0.3).multiplyScalar(s);
  camera.position.copy(camPos).add(shakeO); camera.lookAt(lookAt);
}

// ---------- loop ----------
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 1.5 ? 64 : 58; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
let last = performance.now(), perfAcc = 0, perfN = 0, perfLevel = 0, uiAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, (now - last) / 1000); last = now;
  // adaptive quality for slower phones
  perfAcc += realDt; perfN++;
  if (perfN >= 90) { const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
    if (avg > 0.024 && perfLevel === 0 && game.state === 'play') { perfLevel = 1; renderer.setPixelRatio(Math.min(DPR, 1.15)); resize(); }
    else if (avg > 0.028 && perfLevel === 1 && game.state === 'play') { perfLevel = 2; renderer.setPixelRatio(1); sun.shadow.mapSize.set(512, 512); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } resize(); } }
  if (portrait() && (game.state === 'play' || game.state === 'cine')) togglePause(true);
  if (game.state === 'loading' || game.state === 'paused') { renderer.render(scene, camera); return; }
  let dt = realDt;
  if (game.hitStop > 0) { game.hitStop -= realDt; dt *= 0.05; }
  if (game.slowmo > 0) { game.slowmo -= realDt; dt *= 0.3; }
  const t = now / 1000;
  readInput(realDt);
  if (game.state === 'menu') {
    player.speedN = 0; player.state = 'move'; const P = player.basePose(dt, t); P.aRx = -0.3; P.eR = -0.4; P.wRx = 1.2; P.aRz = -0.25; P.spY = 0.3; P.hY = -0.2; player.smoothPose(dt, 6); player.root.rotation.y = 2.6;
  } else {
    if (game.state === 'play' || game.state === 'over') {
      game.time += game.state === 'play' ? dt : 0;
      if (game.state === 'play') player.update(dt, t); else { player.vel.multiplyScalar(0.9); }
      for (const e of enemies) e.update(dt, t);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].removed) enemies.splice(i, 1);
      // spawning
      for (let i = game.spawnQ.length - 1; i >= 0; i--) { const q = game.spawnQ[i]; q.t -= dt; if (q.t <= 0) { spawnEnemy(q); game.spawnQ.splice(i, 1); } }
      // shock waves
      for (let i = game.waves.length - 1; i >= 0; i--) { const w = game.waves[i]; w.r += w.v * dt; if (w.r > w.max) { game.waves.splice(i, 1); continue; }
        if (!w.hit && w.r > 0.5 && player.y < 0.35 && !player.dead) { const d = Math.hypot(player.pos.x - w.x, player.pos.z - w.z); if (Math.abs(d - w.r) < 0.5) { w.hit = true; player.takeHit(w.dmg, Math.atan2(player.pos.x - w.x, player.pos.z - w.z), 8, null); } } }
      // pickups
      for (let i = pickups.length - 1; i >= 0; i--) { const pk = pickups[i]; pk.t += dt; pk.m.rotation.y += dt * 2; pk.m.position.y = 0.4 + Math.sin(pk.t * 3) * 0.08;
        const d = Math.hypot(player.pos.x - pk.m.position.x, player.pos.z - pk.m.position.z);
        if (d < 2.6 && pk.t > 0.6) { pk.m.position.x = damp(pk.m.position.x, player.pos.x, 6, dt); pk.m.position.z = damp(pk.m.position.z, player.pos.z, 6, dt); }
        if (d < 0.8 && pk.t > 0.6 && !player.dead) { player.hp = Math.min(player.maxHp, player.hp + 28); Audio.pickup(); FX.burst(V.set(player.pos.x, 1, player.pos.z), 16, 0x60ff80, 2.5, 1, -1, 0.6); FX.num(V.set(player.pos.x, 2.2, player.pos.z), 28, '#7dff9a'); scene.remove(pk.m); pickups.splice(i, 1); }
        else if (pk.t > 25) { scene.remove(pk.m); pickups.splice(i, 1); } }
      if (game.comboT > 0) { game.comboT -= dt; if (game.comboT <= 0) game.combo = 0; }
      // stage flow
      const S = STAGES[game.stage];
      if (game.state === 'play' && !S.boss && game.stageClearT < 0 && !game.spawnQ.length && enemies.every(e => e.dead) && !player.dead) {
        game.stageClearT = 3.4; banner('ئافەرین!', 'قۆناغەکە تەواو بوو · گڕوت هێزی گەڕایەوە', 2.6); player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.4); Audio.win();
      }
      if (game.stageClearT > 0) { game.stageClearT -= dt; if (game.stageClearT <= 0) startStage(game.stage + 1); }
      if (game.winT > 0) { game.winT -= realDt; if (game.winT <= 0) endGame(true); }
    } else if (game.state === 'cine') {
      player.speedN = 0; const P = player.basePose(dt, t); player.smoothPose(dt, 10); player.root.rotation.y = player.face;
      for (const e of enemies) { e.speedN = 0; const P2 = e.basePose(dt, t); P2.spX = -0.2; P2.aLz = 0.9; P2.hX = -0.15; e.smoothPose(dt, 6); e.root.rotation.y = e.face; }
    }
    Audio.tick(boss ? (boss.phaseN === 3 ? 1 : 0.7) : game.stage * 0.25);
    uiAcc += realDt; if (uiAcc > 0.05) { updateUI(uiAcc); uiAcc = 0; }
  }
  updateCamera(realDt, t);
  FX.update(dt);
  sun.position.copy(player.pos).addScaledVector(SUN_DIR, 40); sun.target.position.copy(player.pos);
  sky.position.copy(camera.position);
  for (const e of enemies) { const L = e.label; if (!L || !L.visible) continue; if (!L.userData.bs) L.userData.bs = L.scale.clone(); const k = clamp(camera.position.distanceTo(e.root.position) / 9, 1, 2.6); L.scale.copy(L.userData.bs).multiplyScalar(k); }
  renderer.render(scene, camera);
}

// ---------- boot ----------
(async function boot() {
  resize();
  try { await Promise.race([document.fonts.load('700 34px KFont'), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  faceTex = await new Promise(res => new THREE.TextureLoader().load('assets/miran_face.png', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, () => res(null)));
  buildWorld();
  player = new Player(); player.reset(); player.pos.set(0, 0, 0);
  applyLook(0);
  $('loading').classList.add('hidden');
  game.state = 'menu';
  requestAnimationFrame(frame);
  if (Q.has('autostart')) startGame(+(Q.get('stage') || 0));
})();
window.KH = { game, input, get player() { return player; }, enemies, get boss() { return boss; }, startGame, startStage, cam, endGame, ROSTER };
