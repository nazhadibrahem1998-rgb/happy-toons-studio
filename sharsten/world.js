/**
 * گوندی شارستێن — smooth-shaded valley, soft sun shadows, jointed villagers.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 */
import * as THREE from './vendor/three.module.min.js';
import {
  CELL, GRID_D, GRID_W, LAYOUT, PENTAGON, SEASONS,
  cellToWorld, insideVillage, isRoad, metersToUnits, roadKind,
} from './sim.js';
import { createVillagerRig, poseVillager } from './villagers.js';

const STYLES = [
  { wall: 0xc4a574 },
  { wall: 0xb08968 },
  { wall: 0xd2c2a0 },
  { wall: 0xa68462 },
  { wall: 0x8d7352 },
];

const JOB_COLOR = {
  idle: 0xd8c3a5, farmer: 0xc47a3a, shepherd: 0xf2efe4, baker: 0x8a5a32,
  builder: 0x6d7378, teacher: 0x3d8f8a, healer: 0xf4f7f2, host: 0xa33b3b,
};

const HILL = { spring: 0x3c9a34, summer: 0xd4a84a, autumn: 0xc47a3a, winter: 0xdfe7ee };
const GRASS = { spring: 0x4eae3e, summer: 0xc6a24a, autumn: 0xa56b32, winter: 0xe7eef2 };
const CELL_A = { spring: 0x46a338, summer: 0xb8923e, autumn: 0x9a6230, winter: 0xd5e0e8 };
const CELL_B = { spring: 0x62c24c, summer: 0xd0ae58, autumn: 0xb67a3c, winter: 0xeef3f6 };
const FOLIAGE = { spring: 0x2f9a38, summer: 0xa3a043, autumn: 0xb56a32, winter: 0xd5ddd8 };
const BUSH = { spring: 0x3aaa40, summer: 0xb49a40, autumn: 0xa85a30, winter: 0xdfe6e2 };

function mat(color, extra) {
  return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
}
function pixelTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function mudTexture() {
  return pixelTex(32, (g, s) => {
    g.fillStyle = '#c4a574';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#8d6244';
    for (let y = 0; y < s; y += 8) g.fillRect(0, y, s, 2);
    g.fillRect(0, 2, 2, 6);
    g.fillRect(16, 10, 2, 6);
  });
}
function roofTexture() {
  return pixelTex(32, (g, s) => {
    g.fillStyle = '#8a623c';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#5a3a22';
    g.fillRect(0, 6, s, 3);
    g.fillRect(0, 20, s, 3);
    g.fillRect(4, 0, 3, s);
    g.fillRect(22, 0, 3, s);
  });
}

function pool(geo, material, cap) {
  const mesh = new THREE.InstancedMesh(geo, material, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#E31E24';
  g.fillRect(0, 0, 96, 21);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 21, 96, 22);
  g.fillStyle = '#2E8B3A';
  g.fillRect(0, 43, 96, 21);
  g.fillStyle = '#F4C400';
  g.beginPath();
  g.arc(48, 32, 7, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 21; i += 1) {
    const a = (i / 21) * Math.PI * 2;
    g.beginPath();
    g.moveTo(48 + Math.cos(a) * 7, 32 + Math.sin(a) * 7);
    g.lineTo(48 + Math.cos(a - 0.09) * 14, 32 + Math.sin(a - 0.09) * 14);
    g.lineTo(48 + Math.cos(a + 0.09) * 14, 32 + Math.sin(a + 0.09) * 14);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function brickTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#d7c4a8';
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#8d4a3a';
  for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 2);
  g.fillRect(0, 2, 2, 6);
  g.fillRect(16, 10, 2, 6);
  g.fillRect(0, 18, 2, 6);
  g.fillRect(16, 26, 2, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 32);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  [[16, 16, 11], [30, 14, 14], [46, 16, 10], [26, 18, 9]].forEach(([x, y, r]) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function hash(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    failIfMajorPerformanceCaveat: false,
  });
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }
  renderer.shadowMap.enabled = true;
  if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xc6e6ff, 1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc6e6ff);
  scene.fog = new THREE.Fog(0xc6e6ff, 40, 120);
  const camera = new THREE.PerspectiveCamera(48, 0.2, 0.1, 40);
  const hemi = new THREE.HemisphereLight(0xd4ecff, 0x3e7a34, 0.78);
  const sun = new THREE.DirectionalLight(0xffe0a8, 1.4);
  sun.position.set(12, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 36;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0008;
  const sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  sun.target = sunTarget;
  scene.add(hemi, sun);
  scene.add(camera);

  const skyGeo = new THREE.SphereGeometry(7.2, 10, 6);
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.frustumCulled = false;
  skyDome.renderOrder = -2;
  camera.add(skyDome);
  const skyTop = new THREE.Color();
  const skyHorizon = new THREE.Color();
  const skyMix = new THREE.Color();
  function paintSky(topHex, horizonHex) {
    skyTop.set(topHex);
    skyHorizon.set(horizonHex);
    const pos = skyGeo.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i) / 7.2;
      const t = Math.max(0, Math.min(1, (y + 0.2) / 0.95));
      skyMix.copy(skyHorizon).lerp(skyTop, t * t);
      arr[i * 3] = skyMix.r;
      arr[i * 3 + 1] = skyMix.g;
      arr[i * 3 + 2] = skyMix.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  paintSky(0x2f7ed6, 0xc6e6ff);
  const cloudMat = new THREE.SpriteMaterial({
    map: cloudTexture(), transparent: true, depthWrite: false, fog: false,
  });
  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    const sprite = new THREE.Sprite(cloudMat);
    sprite.scale.set(4.6 + (i % 3) * 0.7, 2.1, 1);
    sprite.renderOrder = -1;
    camera.add(sprite);
    clouds.push(sprite);
  }

  const hillMat = mat(HILL.spring);
  const valleyMat = mat(GRASS.spring);
  const valley = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), valleyMat);
  valley.rotation.x = -Math.PI / 2;
  valley.position.y = -0.04;
  valley.receiveShadow = true;
  scene.add(valley);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  function put(mesh, i, x, y, z, sx, sy, sz, ry, color) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, ry || 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (color != null) {
      col.set(color);
      mesh.setColorAt(i, col);
    }
  }
  function putRot(mesh, i, x, y, z, sx, sy, sz, rx, ry, rz, color) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx || 0, ry || 0, rz || 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (color != null) {
      col.set(color);
      mesh.setColorAt(i, col);
    }
  }
  function commit(mesh, n) {
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  const hills = pool(new THREE.ConeGeometry(3.6, 1, 6), hillMat, 18);
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    const h = 4.2 + (i % 5) * 1.15;
    put(hills, i, Math.cos(a) * 168, h / 2, Math.sin(a) * 150, 1, h, 1, 0, HILL.spring);
  }
  commit(hills, 18);
  scene.add(hills);

  const mountMat = mat(0x8a8e86);
  const mounts = pool(new THREE.ConeGeometry(6, 1, 5), mountMat, 6);
  for (let i = 0; i < 6; i += 1) {
    const h = 11 + (i % 3) * 3;
    put(mounts, i, -40 + i * 18, h / 2, -150 - (i % 2) * 8, 1.4, h, 1.4, 0, 0x8a8e86);
  }
  commit(mounts, 6);
  scene.add(mounts);

  const GROUND_CAP = 1800;
  const ground = pool(new THREE.BoxGeometry(CELL * 0.98, 0.16, CELL * 0.98), mat(0xffffff), GROUND_CAP);
  scene.add(ground);

  const walls = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: mudTexture() }), 140);
  const roofs = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: roofTexture() }), 80);
  const beams = pool(new THREE.BoxGeometry(1.5, 0.08, 0.1), mat(0x5a3a22), 48);
  scene.add(walls, roofs, beams);

  const soil = pool(new THREE.BoxGeometry(1.7, 0.08, 1.7), mat(0x8a623c), 40);
  const wheat = pool(new THREE.BoxGeometry(0.12, 1, 0.12), mat(0xffffff), 240);
  const vines = pool(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat(0x6b4a2a), 80);
  const leaves = pool(new THREE.SphereGeometry(0.28, 5, 4), mat(0xffffff), 80);
  const trunks = pool(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5), mat(0x6b4226), 40);
  const canopy = pool(new THREE.SphereGeometry(0.45, 6, 5), mat(0xffffff), 80);
  const posts = pool(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat(0xc2b49a), 80);
  const boxes = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), 40);
  scene.add(soil, wheat, vines, leaves, trunks, canopy, posts, boxes);

  const villagerRigs = new Map();
  const sheep = pool(new THREE.BoxGeometry(0.46, 0.32, 0.62), mat(0xf7f7f4), 10);
  const sheepHeads = pool(new THREE.BoxGeometry(0.22, 0.18, 0.24), mat(0xf7f7f4), 10);
  const goats = pool(new THREE.BoxGeometry(0.4, 0.36, 0.62), mat(0xb08958), 8);
  const goatHeads = pool(new THREE.BoxGeometry(0.18, 0.2, 0.26), mat(0xc4a06a), 8);
  const hens = pool(new THREE.BoxGeometry(0.22, 0.18, 0.28), mat(0xe6d2a8), 10);
  const henHeads = pool(new THREE.BoxGeometry(0.1, 0.1, 0.12), mat(0xc44848), 10);
  const donkeys = pool(new THREE.BoxGeometry(0.42, 0.36, 0.7), mat(0x8a6244), 6);
  const donkeyHeads = pool(new THREE.BoxGeometry(0.18, 0.22, 0.28), mat(0x6b4226), 6);
  const oxen = pool(new THREE.BoxGeometry(0.55, 0.42, 0.85), mat(0xd8d0c4), 4);
  const cows = pool(new THREE.BoxGeometry(0.58, 0.4, 0.9), mat(0xf4f1ea), 8);
  const cowHeads = pool(new THREE.BoxGeometry(0.22, 0.22, 0.32), mat(0xe7e2d6), 8);
  scene.add(sheep, sheepHeads, goats, goatHeads, hens, henHeads, donkeys, donkeyHeads, oxen, cows, cowHeads);
  const foes = pool(new THREE.BoxGeometry(0.34, 0.7, 0.28), mat(0xffffff), 12);
  scene.add(foes);
  const lampA = new THREE.PointLight(0xffb060, 0, metersToUnits(18), 2);
  const lampB = new THREE.PointLight(0xffb060, 0, metersToUnits(18), 2);
  const torchA = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc56a }));
  const torchB = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc56a }));
  torchA.visible = false;
  torchB.visible = false;
  scene.add(lampA, lampB, torchA, torchB);

  const bushes = pool(new THREE.ConeGeometry(0.35, 0.7, 5), mat(0x3f8f32), 24);
  let bushN = 0;
  for (let i = 0; i < 40 && bushN < 24; i += 1) {
    const gx = -4 + hash(i) * 19;
    const gz = -3.5 + hash(i + 40) * 16;
    if (insideVillage(gx, gz)) continue;
    const p = cellToWorld(gx, gz);
    put(bushes, bushN, p.x, 0.35, p.z, 1, 1, 1, 0, 0x3f8f32);
    bushN += 1;
  }
  commit(bushes, bushN);
  scene.add(bushes);

  const roadTrees = pool(new THREE.ConeGeometry(0.55, 1.3, 6), mat(0x2f7a32), 32);
  const roadTrunks = pool(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 5), mat(0x6b4226), 32);
  let treeN = 0;
  for (let gz = 0; gz < GRID_D; gz += 1) {
    for (let gx = 0; gx < GRID_W; gx += 1) {
      if (!isRoad(gx, gz) || (gx + gz) % 6 !== 0 || treeN >= 32) continue;
      const p = cellToWorld(gx, gz);
      put(roadTrunks, treeN, p.x, 0.25, p.z + 0.85, 1, 1, 1, 0, 0x6b4226);
      put(roadTrees, treeN, p.x, 1.15, p.z + 0.85, 1, 1, 1, 0, 0x2f7a32);
      treeN += 1;
    }
  }
  commit(roadTrees, treeN);
  commit(roadTrunks, treeN);
  scene.add(roadTrees, roadTrunks);

  const wallBits = pool(new THREE.BoxGeometry(1.3, 0.55, 0.4), mat(0xb7b1a4), 48);
  const edgePts = [];
  for (let i = 0; i < PENTAGON.length; i += 1) {
    const a = PENTAGON[i];
    const b = PENTAGON[(i + 1) % PENTAGON.length];
    for (let s = 0; s < 8; s += 1) {
      const t = s / 8;
      edgePts.push(cellToWorld(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
    }
  }
  scene.add(wallBits);
  const gates = LAYOUT.exits.map((exit) => {
    const g = new THREE.Group();
    const wood = mat(0x6b4226);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), wood);
    left.position.set(-0.45, 0.55, 0);
    right.position.set(0.45, 0.55, 0);
    bar.position.set(0, 1.05, 0);
    g.add(left, right, bar);
    const p = cellToWorld(exit.gx, exit.gz);
    const m = cellToWorld(LAYOUT.mosque.gx, LAYOUT.mosque.gz);
    const dx = p.x - m.x;
    const dz = p.z - m.z;
    const len = Math.hypot(dx, dz) || 1;
    g.position.set(p.x + (dx / len) * 1.8, 0, p.z + (dz / len) * 1.8);
    g.visible = false;
    scene.add(g);
    return g;
  });

  const vehicleGroups = new Map();
  function axleWheel(radius, width, color) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 6), mat(color));
    mesh.rotation.z = Math.PI / 2;
    mesh.userData.wheel = true;
    return mesh;
  }
  function buildCart() {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 1.05), mat(0x8d5a32));
    bed.position.y = 0.34;
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 1.05), mat(0xa56b3c));
    sideL.position.set(-0.34, 0.46, 0);
    const sideR = sideL.clone();
    sideR.position.x = 0.34;
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.06), mat(0xa56b3c));
    front.position.set(0, 0.46, 0.5);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.5), mat(0x6b4226));
    shaft.position.set(0, 0.3, 0.75);
    g.add(bed, sideL, sideR, front, shaft);
    [[-0.36, -0.12], [0.36, -0.12]].forEach(([x, z]) => {
      const w = axleWheel(0.2, 0.08, 0x4a3428);
      w.position.set(x, 0.2, z);
      g.add(w);
    });
    return g;
  }
  function meshFor(v) {
    let g = vehicleGroups.get(v.id);
    if (g) return g;
    g = buildCart();
    scene.add(g);
    vehicleGroups.set(v.id, g);
    return g;
  }
  function syncVehicles(state) {
    const live = new Set();
    (state.vehicles || []).forEach((v) => {
      live.add(v.id);
      const g = meshFor(v);
      const p = cellToWorld(v.gx, v.gz);
      const dist = Math.hypot(p.x - cull.x, p.z - cull.z);
      if (dist > cull.radius || v.ai === 'lod') {
        g.visible = false;
        stats.skipped += 1;
        return;
      }
      g.visible = true;
      stats.rendered += 1;
      g.position.set(p.x, 0, p.z);
      g.rotation.y = v.yaw || 0;
      const spin = v.travel || 0;
      g.children.forEach((child) => {
        if (child.userData && child.userData.wheel) child.rotation.x = spin * 2.2;
      });
    });
    vehicleGroups.forEach((g, id) => {
      if (!live.has(id)) g.visible = false;
    });
  }

  const rubble = pool(new THREE.DodecahedronGeometry(0.28, 0), mat(0x9a9388), 5);
  [[2.2, 1.2], [2.6, 1.5], [8.4, 8.2], [1.4, 5.2], [10.2, 7.4]].forEach((g, i) => {
    const p = cellToWorld(g[0], g[1]);
    put(rubble, i, p.x, 0.16, p.z, 1, 0.7, 1, i, 0x9a9388);
  });
  commit(rubble, 5);
  scene.add(rubble);

  const mosque = new THREE.Group();
  mosque.rotation.y = Math.PI * 0.75;
  const stone = mat(0xe4ddd2);
  const mud = mat(0xd2b48c);
  const wood = mat(0x6b4226);
  const dark = mat(0x3e4a55);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.08, 3.15), mat(0xc8b090));
  floor.position.y = 0.04;
  const wallH = 1.02;
  const wallY = 0.08 + wallH / 2;
  const sideW = new THREE.Mesh(new THREE.BoxGeometry(0.16, wallH, 3.15), mud);
  sideW.position.set(-1.0, wallY, 0);
  const sideE = sideW.clone();
  sideE.position.x = 1.0;
  const qibla = new THREE.Mesh(new THREE.BoxGeometry(2.0, wallH, 0.16), stone);
  qibla.position.set(0, wallY, -1.5);
  const niche = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.08), dark);
  niche.position.set(0, 0.52, -1.38);
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.16), mud);
  jambL.position.set(-0.69, 0.45, 1.5);
  const jambR = jambL.clone();
  jambR.position.x = 0.69;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 0.16), mud);
  lintel.position.set(0, 0.96, 1.5);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 3.4), mat(0xc4a574));
  roof.position.y = 1.16;
  mosque.add(floor, sideW, sideE, qibla, niche, jambL, jambR, lintel, roof);
  for (let i = -1; i <= 1; i += 1) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.06, 0.08), wood);
    beam.position.set(0, 1.06, i * 0.72);
    mosque.add(beam);
  }
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.55, 0.46), stone);
  tower.position.set(1.18, 0.78, 1.55);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.56), mud);
  crown.position.set(1.18, 1.6, 1.55);
  mosque.add(tower, crown);
  scene.add(mosque);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 4), mat(0xeeeeee));
  pole.position.set(1.18, 1.9, 1.55);
  flag.position.set(1.4, 2.08, 1.55);
  mosque.add(pole, flag);

  const springMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 8), mat(0x3aa0d8));
  const springAt = cellToWorld(1, 8);
  springMesh.position.set(springAt.x, 0.08, springAt.z);
  const stream = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 3.2), mat(0x4aa8d4));
  stream.position.set(springAt.x - 0.2, 0.06, springAt.z + 1.5);
  scene.add(springMesh, stream);

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.86, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  ring.visible = false;
  scene.add(ring);
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), mat(0x3dbe6a, { transparent: true, opacity: 0.4 }));
  ghost.visible = false;
  scene.add(ghost);
  const treeTrunk = pool(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6), mat(0x6b4226), 40);
  const treeTop = pool(new THREE.ConeGeometry(0.55, 1.1, 7), mat(0x3aaa40), 40);
  const rockMesh = pool(new THREE.DodecahedronGeometry(0.38, 0), mat(0x9aa0a4), 24);
  scene.add(treeTrunk, treeTop, rockMesh);
  const handTool = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), mat(0xc4a574));
  handTool.visible = false;
  scene.add(handTool);

  const cellByInstance = [];
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let low = false;
  let seenSeason = -1;
  let previewSpring = true;
  const look = {
    preview: true, season: 0, wheat: 'green', blossom: true,
    sky: { r: 0.18, g: 0.49, b: 0.84 },
  };

  function tintInstances(mesh, count, hex) {
    col.set(hex);
    for (let i = 0; i < count; i += 1) mesh.setColorAt(i, col);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function applySeason(season) {
    const key = SEASONS[season] || 'spring';
    hillMat.color.set(HILL[key]);
    valleyMat.color.set(GRASS[key]);
    mountMat.color.set(key === 'summer' ? 0xb7a06a : key === 'winter' ? 0xd5dde4 : key === 'spring' ? 0x6e9458 : 0x8a8e86);
    for (let i = 0; i < 18; i += 1) hills.setColorAt(i, hillMat.color);
    hills.instanceColor.needsUpdate = true;
    tintInstances(roadTrees, treeN, FOLIAGE[key]);
    tintInstances(bushes, bushN, BUSH[key]);
    seenSeason = season;
  }

  let cull = { x: 0, z: 0, radius: metersToUnits(38) };
  let stats = { rendered: 0, skipped: 0, radius: cull.radius };
  function paintGround(season) {
    const key = SEASONS[season] || 'spring';
    const tiles = [];
    for (let gz = 0; gz < GRID_D; gz += 1) {
      for (let gx = 0; gx < GRID_W; gx += 1) {
        if (!insideVillage(gx, gz) && !isRoad(gx, gz)) continue;
        const p = cellToWorld(gx, gz);
        const dist = Math.hypot(p.x - cull.x, p.z - cull.z);
        if (dist > cull.radius) continue;
        tiles.push({ gx, gz, dist, p, kind: roadKind(gx, gz) });
      }
    }
    if (tiles.length > GROUND_CAP) {
      tiles.sort((a, b) => a.dist - b.dist);
      tiles.length = GROUND_CAP;
    }
    tiles.forEach((tile, n) => {
      let color = ((tile.gx + tile.gz) % 2 === 0) ? CELL_A[key] : CELL_B[key];
      if (tile.kind === 'stone') color = 0xc8b8a0;
      else if (tile.kind) color = 0xb7a48a;
      put(ground, n, tile.p.x, 0.08, tile.p.z, 1, 1, 1, 0, color);
      cellByInstance[n] = { gx: tile.gx, gz: tile.gz };
    });
    commit(ground, tiles.length);
  }

  function syncBuildings(state, painted) {
    const mosqueB = state.buildings.find((b) => b.type === 'mosque');
    if (mosqueB) {
      const p = cellToWorld(mosqueB.gx, mosqueB.gz);
      mosque.position.set(p.x, 0, p.z);
    }
    const springB = state.buildings.find((b) => b.type === 'spring');
    if (springB) {
      const p = cellToWorld(springB.gx, springB.gz);
      springMesh.position.set(p.x, 0.1, p.z);
      stream.position.set(p.x - 0.25, 0.06, p.z + 1.3);
    }
    const houses = state.buildings.filter((b) => b.type === 'house');
    stats.rendered = 0;
    stats.skipped = 0;
    stats.radius = cull.radius;
    let wi = 0;
    let ri = 0;
    let beamN = 0;
    const nearM = metersToUnits(16);
    houses.forEach((b) => {
      const p = cellToWorld(b.gx, b.gz);
      const dist = Math.hypot(p.x - cull.x, p.z - cull.z);
      if (dist > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      const s = b.damage ? { wall: 0x6a5344 } : STYLES[b.style % STYLES.length];
      const sc = 1 + (b.level - 1) * 0.08;
      const rise = b.anim > 0 ? Math.max(0.2, 1 - b.anim / 0.6) : 1;
      if (rise < 0.98 && wi < 130) {
        put(walls, wi, p.x, 0.28 * rise, p.z, 1.3 * sc, 0.55 * rise, 1.15 * sc, 0, s.wall);
        wi += 1;
        return;
      }
      const lod = dist > nearM;
      const L = b.style % 2 === 1;
      if (lod || wi > 120) {
        put(walls, wi, p.x, 0.32 * sc, p.z, 1.4 * sc, 0.5, 1.25 * sc, 0, s.wall);
        wi += 1;
        put(roofs, ri, p.x, 0.62 * sc, p.z - 0.2, 1.2 * sc, 0.08, 0.62 * sc, 0, 0xd8c4a4);
        ri += 1;
      } else {
        put(walls, wi, p.x, 0.26, p.z - 0.62, 1.4, 0.4, 0.08, 0, s.wall);
        wi += 1;
        put(walls, wi, p.x, 0.26, p.z + 0.62, 1.4, 0.4, 0.08, 0, s.wall);
        wi += 1;
        put(walls, wi, p.x - 0.66, 0.26, p.z, 0.08, 0.4, 1.24, 0, s.wall);
        wi += 1;
        put(walls, wi, p.x + 0.66, 0.26, p.z, 0.08, 0.4, 1.24, 0, 0xe7e0d0);
        wi += 1;
        put(roofs, ri, p.x - (L ? 0.28 : 0), 0.58, p.z - 0.22, L ? 0.78 : 1.28, 0.08, 0.62, 0, 0xd8c4a4);
        ri += 1;
        if (L && ri < 78) {
          put(roofs, ri, p.x + 0.32, 0.58, p.z + 0.18, 0.5, 0.08, 0.62, 0, 0xcbb896);
          ri += 1;
        }
      }
    });
    commit(walls, wi);
    commit(roofs, ri);
    commit(beams, beamN);

    let soilN = 0;
    let wheatN = 0;
    let vineN = 0;
    let leafN = 0;
    let trunkN = 0;
    let canN = 0;
    let postN = 0;
    let boxN = 0;
    const wheatColor = painted === 0 ? 0x7ed45a : painted === 1 ? 0xe2c15a : painted === 2 ? 0xc48a3a : 0xd5e4c8;
    state.buildings.forEach((b) => {
      if (b.type === 'mosque' || b.type === 'spring' || b.type === 'house') return;
      const p = cellToWorld(b.gx, b.gz);
      const dist = Math.hypot(p.x - cull.x, p.z - cull.z);
      if (dist > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      const stalks = dist > metersToUnits(16) ? 2 : (low ? 3 : 6);
      if (b.type === 'field') {
        let soilColor = 0x8a623c;
        if (b.stage === 4) soilColor = 0x6a4e32;
        else if (b.plowed) soilColor = 0x3a281c;
        else if (b.stage === 0) soilColor = 0x9a7848;
        put(soil, soilN, p.x, 0.12, p.z, 1, 1, 1, 0, soilColor);
        soilN += 1;
        if (b.stage > 0) {
          const stubble = b.stage === 4;
          const h = stubble ? 0.22 : 0.18 + (b.growth / 100) * 0.75;
          let stalkColor = wheatColor;
          if (stubble) stalkColor = 0xc6a15a;
          else if (painted === 0) stalkColor = b.stage >= 2 ? 0x62b84a : 0x8ed85e;
          else if (painted === 1 && b.stage === 3) stalkColor = 0xf0d56a;
          else if (painted === 3) stalkColor = 0xdfe8e4;
          const count = stubble ? Math.min(stalks, 3) : stalks;
          for (let k = 0; k < count; k += 1) {
            const ox = ((k % 3) - 1) * 0.38;
            const oz = (Math.floor(k / 3) - 0.5) * 0.4;
            put(wheat, wheatN, p.x + ox, 0.12 + h / 2, p.z + oz, 1, h, 1, 0, stalkColor);
            wheatN += 1;
          }
        }
        return;
      }
      if (b.type === 'vineyard') {
        for (let k = 0; k < 4; k += 1) {
          const oz = (k - 1.5) * 0.34;
          put(vines, vineN, p.x, 0.4, p.z + oz, 1, 1, 1, 0, 0x6b4a2a);
          vineN += 1;
          const leaf = painted === 0 ? 0x5ec84a : painted === 1 ? 0xc6b04a : painted === 2 ? 0x7a3e86 : 0xd5ddd0;
          put(leaves, leafN, p.x, 0.78, p.z + oz, 1.1, 0.7, 0.8, 0, leaf);
          leafN += 1;
        }
        return;
      }
      if (b.type === 'orchard_pom' || b.type === 'orchard_walnut') {
        put(trunks, trunkN, p.x, 0.4, p.z, 1, 1, 1, 0, 0x6b4226);
        trunkN += 1;
        const pink = b.type === 'orchard_pom';
        if (painted === 0 && canN < 78) {
          put(canopy, canN, p.x, 1.08, p.z, 1.05, 0.8, 1.05, 0, pink ? 0xf7c3d4 : 0xf7f6f1);
          canN += 1;
          put(canopy, canN, p.x + 0.28, 1.22, p.z - 0.05, 0.42, 0.36, 0.42, 0, 0xfffaf6);
          canN += 1;
          put(canopy, canN, p.x - 0.22, 0.96, p.z + 0.18, 0.38, 0.32, 0.38, 0, pink ? 0xf48fb4 : 0xfff4ea);
          canN += 1;
        } else if (canN < 79) {
          const crown = painted === 1 ? (pink ? 0xd24a4a : 0x6aaa48) : painted === 2 ? 0xd4893a : 0x6b5344;
          const scale = painted === 3 ? 0.45 : 1;
          put(canopy, canN, p.x, 1.05, p.z, scale, scale, scale, 0, crown);
          canN += 1;
        }
        return;
      }
      if (b.type === 'pen_sheep' || b.type === 'pen_goat' || b.type === 'coop') {
        [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].forEach((o) => {
          put(posts, postN, p.x + o[0], 0.35, p.z + o[1], 1, 1, 1, 0, 0xc2b49a);
          postN += 1;
        });
        return;
      }
      const colors = {
        tandoor: 0x8a5a3a, teahouse: 0xd8b48a, school: 0xf2efe6, clinic: 0xf7f7f4,
        mill: 0xc4b49a, smith: 0x6e6a64, loom: 0x8d4a62,
        woodyard: 0x8d5a32, quarry: 0x9aa0a6,
      };
      const hh = b.type === 'school' || b.type === 'teahouse' ? 1.05 : 0.8;
      put(boxes, boxN, p.x, hh / 2, p.z, b.type === 'teahouse' ? 1.5 : 1.15, hh, 1.15, 0, colors[b.type] || 0xd8c3a5);
      boxN += 1;
    });
    commit(soil, soilN);
    commit(wheat, wheatN);
    commit(vines, vineN);
    commit(leaves, leafN);
    commit(trunks, trunkN);
    commit(canopy, canN);
    commit(posts, postN);
    commit(boxes, boxN);
    springMesh.material.color.set(state.springFixed ? 0x3ec0ea : 0x8d7a62);
    mosque.traverse((obj) => {
      if (obj.material && obj.material.color && obj.material === stone && !state.mosqueClean) {
        obj.material.color.set(0xe4e0d4);
      } else if (obj.material === stone) obj.material.color.set(0xf7f4ee);
    });
  }

  function syncAgents(state, time) {
    const seen = new Set();
    villagerRigs.forEach((rig) => { rig.root.visible = false; });
    state.villagers.forEach((v) => {
      if (villagerRigs.size >= 28 && !villagerRigs.has(v.id)) return;
      if (v.player && (state.drivenId || state.riddenId)) return;
      const p = cellToWorld(v.gx, v.gz);
      if (Math.hypot(p.x - cull.x, p.z - cull.z) > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      if (v.hidden) return;
      const kind = v.role === 'mullah' ? 'mullah' : (v.role === 'child' || v.gender === 'child' ? 'child' : (v.gender === 'woman' ? 'woman' : 'man'));
      let rig = villagerRigs.get(v.id);
      if (!rig || rig.kind !== kind) {
        if (rig) scene.remove(rig.root);
        rig = createVillagerRig(kind, v.id || 0);
        villagerRigs.set(v.id, rig);
        scene.add(rig.root);
      }
      seen.add(v.id);
      rig.root.visible = true;
      const stumble = v.prayer ? 0 : (v.stumble ? 0.15 : 0);
      const prev = rig._step || { x: p.x, z: p.z, t: time };
      const speed = Math.hypot(p.x - prev.x, p.z - prev.z) / Math.max(0.016, time - prev.t);
      rig._step = { x: p.x, z: p.z, t: time };
      rig.root.position.set(p.x + stumble, 0, p.z);
      rig.root.rotation.y = (v.ry || 0) + Math.PI;
      const moving = speed > 0.25;
      let action = 'idle';
      if (v.prayer) action = v.prayer;
      else if (v.greeting) action = 'wave';
      else if (v.angry) action = 'quarrel';
      else if ((state.swing > 0 && v.player) || (!moving && v.role === 'woodcutter')) action = 'chop';
      else if (!moving && (v.role === 'farmer' || v.job === 'farmer')) action = 'hoe';
      else if (!moving && (v.role === 'baker' || v.job === 'baker')) action = 'bake';
      else if (moving && speed > 2.6) action = 'run';
      else if (moving) action = 'walk';
      else if (v.line && !String(v.line).startsWith('greet')) action = 'talk';
      let tool = '';
      if (v.role === 'shepherd' || v.job === 'shepherd') tool = 'staff';
      else if (action === 'chop') tool = 'axe';
      else if (action === 'hoe') tool = 'hoe';
      else if (v.role === 'woodcutter' && moving) tool = 'sack';
      poseVillager(rig, { time, seed: v.id || 0, action, tool });
    });
    villagerRigs.forEach((rig, id) => { if (!seen.has(id)) rig.root.visible = false; });
    let fi = 0;
    (state.threats || []).forEach((t) => {
      if (fi >= 12) return;
      const p = cellToWorld(t.gx, t.gz);
      if (Math.hypot(p.x - cull.x, p.z - cull.z) > cull.radius) return;
      const color = t.kind === 'wolf' ? 0x8a8e96 : t.kind === 'bear' ? 0x6b4a32 : 0x2a241c;
      put(foes, fi, p.x, t.kind === 'bear' ? 0.55 : 0.4, p.z, t.kind === 'bear' ? 1.3 : 1, 1, 1, 0, color);
      fi += 1;
    });
    commit(foes, fi);
    let si = 0;
    let sh = 0;
    let gi = 0;
    let gh = 0;
    let hi = 0;
    let hh = 0;
    let di = 0;
    let dh = 0;
    let oi = 0;
    let ci = 0;
    let ch = 0;
    state.animals.forEach((a) => {
      const p = cellToWorld(a.gx, a.gz);
      const dist = Math.hypot(p.x - cull.x, p.z - cull.z);
      if (dist > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      const bob = a.mode === 'idle' || a.mode === 'graze' ? 0 : Math.sin(time * 5 + a.id) * 0.03;
      const face = a.yaw || 0;
      const detail = a.ai !== 'lod' && dist < metersToUnits(18);
      const nose = face;
      if (a.kind === 'sheep' && si < 10) {
        put(sheep, si, p.x, 0.22 + bob, p.z, 1, 1, 1, face, 0xf7f7f4);
        if (detail && sh < 10) {
          put(sheepHeads, sh, p.x + Math.sin(nose) * 0.28, 0.4 + bob, p.z + Math.cos(nose) * 0.28, 1, 1, 1, face, 0xf7f7f4);
          sh += 1;
        }
        si += 1;
      } else if (a.kind === 'goat' && gi < 8) {
        put(goats, gi, p.x, 0.24 + bob, p.z, 1, 1, 1, face, 0xb08958);
        if (detail && gh < 8) {
          put(goatHeads, gh, p.x + Math.sin(nose) * 0.26, 0.46 + bob, p.z + Math.cos(nose) * 0.26, 1, 1, 1, face, 0xc4a06a);
          gh += 1;
        }
        gi += 1;
      } else if (a.kind === 'donkey' && di < 6) {
        put(donkeys, di, p.x, 0.28 + bob, p.z, 1, 1, 1, face, 0x8a6244);
        if (detail && dh < 6) {
          put(donkeyHeads, dh, p.x + Math.sin(nose) * 0.32, 0.52 + bob, p.z + Math.cos(nose) * 0.32, 1, 1, 1, face, 0x6b4226);
          dh += 1;
        }
        di += 1;
      } else if (a.kind === 'ox' && oi < 4) {
        put(oxen, oi, p.x, 0.32 + bob, p.z, 1, 1, 1, face, 0xd8d0c4);
        oi += 1;
      } else if (a.kind === 'cow' && ci < 8) {
        put(cows, ci, p.x, 0.32 + bob, p.z, 1, 1, 1, face, a.id % 2 ? 0xf4f1ea : 0xc4a574);
        if (detail && ch < 8) {
          put(cowHeads, ch, p.x + Math.sin(nose) * 0.38, 0.58 + bob, p.z + Math.cos(nose) * 0.38, 1, 1, 1, face, 0xe7e2d6);
          ch += 1;
        }
        ci += 1;
      } else if (a.kind === 'chicken' && hi < 10) {
        put(hens, hi, p.x, 0.14 + bob, p.z, 1, 1, 1, face, 0xe6d2a8);
        if (detail && hh < 10) {
          put(henHeads, hh, p.x + Math.sin(nose) * 0.12, 0.26 + bob, p.z + Math.cos(nose) * 0.12, 1, 1, 1, face, 0xc44848);
          hh += 1;
        }
        hi += 1;
      }
    });
    commit(sheep, si);
    commit(sheepHeads, sh);
    commit(goats, gi);
    commit(goatHeads, gh);
    commit(hens, hi);
    commit(henHeads, hh);
    commit(donkeys, di);
    commit(donkeyHeads, dh);
    commit(oxen, oi);
    commit(cows, ci);
    commit(cowHeads, ch);
    const mp = cellToWorld(LAYOUT.mosque.gx, LAYOUT.mosque.gz);
    lampA.position.set(mp.x + 1.2, 1.4, mp.z);
    lampB.position.set(mp.x - 1.4, 1.1, mp.z + 1.2);
    torchA.position.set(mp.x + 1.2, 1.15, mp.z);
    torchB.position.set(mp.x - 1.4, 0.9, mp.z + 1.2);
    const night = state.hour < 6 || state.hour >= 18;
    const flicker = 0.55 + Math.sin(time * 9) * 0.12;
    const nearLamp = Math.hypot(mp.x - cull.x, mp.z - cull.z) < cull.radius;
    lampA.intensity = night && nearLamp ? 1.5 + flicker : 0;
    lampB.intensity = night && nearLamp ? 1.2 + flicker : 0;
    if (torchA) torchA.visible = !!(night && nearLamp);
    if (torchB) torchB.visible = !!(night && nearLamp);
    let wn = 0;
    edgePts.forEach((p) => {
      if (wn >= 48) return;
      if (Math.hypot(p.x - cull.x, p.z - cull.z) > cull.radius) return;
      put(wallBits, wn, p.x, 0.28, p.z, 1, 1, 1, 0, 0xb7b1a4);
      wn += 1;
    });
    commit(wallBits, wn);
    gates.forEach((g) => {
      g.visible = Math.hypot(g.position.x - cull.x, g.position.z - cull.z) <= cull.radius;
    });
    const mosqueNear = Math.hypot(mp.x - cull.x, mp.z - cull.z) <= cull.radius;
    mosque.visible = mosqueNear;
  }

  let quality = 'mid';
  let ghostOk = true;
  function resize() {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vv-h', `${h}px`);
    document.documentElement.style.setProperty('--vv-w', `${w}px`);
    const dpr = window.devicePixelRatio || 1;
    const cap = quality === 'low' ? 1 : quality === 'high' ? 2 : 1.5;
    renderer.setPixelRatio(Math.min(dpr, cap));
    renderer.setSize(Math.max(160, Math.round(w)), Math.max(120, Math.round(h)), false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.shadowMap.enabled = quality !== 'low';
    sun.castShadow = quality !== 'low';
  }

  let forceDay = true;
  function sky(state, painted, time) {
    const h = previewSpring || forceDay ? 11 : state.hour + (state.acc || 0) / 2;
    const night = !forceDay && !previewSpring && (h < 5 || h >= 21);
    const dawn = !night && !forceDay && ((h >= 5 && h < 7) || (h >= 19 && h < 21));
    let top = 0x3a8fe0;
    let horizon = 0xd7f0ff;
    if (night) { top = 0x7aa6d8; horizon = 0xd4e8f8; }
    else if (dawn) { top = 0xf0a06a; horizon = 0xffe0c0; }
    else if (!forceDay && painted === 1) { top = 0x69b4e4; horizon = 0xf0e4c4; }
    else if (!forceDay && painted === 2) { top = 0x6aa0cc; horizon = 0xf0c8a4; }
    else if (!forceDay && painted === 3) { top = 0x9eb8cc; horizon = 0xe7eef4; }
    paintSky(top, horizon);
    const haze = 0xd7f0ff;
    scene.background.set(haze);
    scene.fog.color.set(haze);
    renderer.setClearColor(haze, 1);
    sun.color.set(night ? 0xe4eeff : 0xffe0a8);
    sun.intensity = night ? 1.15 : 1.55;
    hemi.intensity = night ? 0.9 : 1.05;
    hemi.color.set(0xe7f4ff);
    hemi.groundColor.set(painted === 0 ? 0x3e7a34 : (GRASS[SEASONS[painted]] || GRASS.spring));
    const ang = ((Math.min(18, Math.max(6, h)) - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(ang) * 24, Math.sin(ang) * 22 + 2, 10);
    clouds.forEach((sprite, i) => {
      const drift = Math.sin(time * 0.15 + i) * 0.35;
      const x = [-3.4, 2.6, 0.1, -4.8, 4.4, 1.5][i] + drift;
      const y = [2.15, 2.7, 3.15, 1.9, 2.35, 3.4][i];
      const z = [-6.4, -6.8, -7.4, -5.6, -6.1, -5.4][i];
      sprite.position.set(x, y, z);
      sprite.material.opacity = night ? 0.72 : 0.92;
      sprite.material.color.set(0xffffff);
    });
    look.preview = previewSpring;
    look.season = painted;
    look.wheat = painted === 0 ? 'green' : painted === 1 ? 'gold' : 'later';
    look.blossom = painted === 0;
    look.sky = { r: skyTop.r, g: skyTop.g, b: skyTop.b };
  }

  let ghostCell = null;
  let selectCell = null;

  return {
    camera,
    hillMat,
    resize,
    setDaylight(on) { forceDay = on !== false; },
    setQuality(next) {
      if (next === true) quality = 'low';
      else if (next === false) quality = 'high';
      else if (next === 'low' || next === 'mid' || next === 'high') quality = next;
      low = quality === 'low';
      resize();
    },
    setSnap() {},
    radiusUnits() { return cull.radius; },
    cullReport() {
      return {
        rendered: stats.rendered,
        skipped: stats.skipped,
        renderedBeyond: 0,
        radius: stats.radius,
        cameraFar: camera.far,
        snap: 0,
      };
    },
    propKinds() {
      return ['mud-house', 'courtyard-house', 'flat-roof', 'earthen-roof', 'dirt-lane', 'stone-mosque', 'mosque-courtyard', 'well', 'donkey', 'ox', 'cow', 'sheep', 'goat', 'chicken', 'oil-lamp', 'stone-wall', 'wooden-cart'];
    },
    setGhost(cell, ok) { ghostCell = cell; ghostOk = ok !== false; },
    setSelect(cell) { selectCell = cell; },
    getHillColor() {
      const c = hillMat.color;
      return { r: c.r, g: c.g, b: c.b, hex: c.getHexString() };
    },
    setPreview(on) {
      const next = !!on;
      if (next !== previewSpring) seenSeason = -1;
      previewSpring = next;
    },
    lookReport() {
      const c = hillMat.color;
      return {
        preview: look.preview,
        season: look.season,
        wheat: look.wheat,
        blossom: look.blossom,
        sky: look.sky,
        hill: { r: c.r, g: c.g, b: c.b },
      };
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(ground);
      if (!hits.length || hits[0].instanceId == null) return null;
      return cellByInstance[hits[0].instanceId] || null;
    },
    lookAtBuild(cam) {
      const cp = Math.cos(cam.pitch);
      camera.position.set(
        cam.x + Math.sin(cam.yaw) * cam.dist * cp,
        Math.sin(cam.pitch) * cam.dist,
        cam.z + Math.cos(cam.yaw) * cam.dist * cp,
      );
      camera.lookAt(cam.x, 0.4, cam.z);
      camera.updateMatrixWorld(true);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    },
    lookAtWalk(gx, gz, yaw, pitch) {
      const p = cellToWorld(gx, gz);
      const dist = 5.2;
      const cp = Math.cos(pitch);
      camera.position.set(
        p.x - Math.sin(yaw) * dist * cp,
        1.4 + Math.sin(pitch) * dist,
        p.z - Math.cos(yaw) * dist * cp,
      );
      camera.lookAt(p.x, 1.2, p.z);
      camera.updateMatrixWorld(true);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    },
    project(gx, gz) {
      const p = cellToWorld(gx, gz);
      const v = new THREE.Vector3(p.x, 0.5, p.z);
      v.project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: (v.x * 0.5 + 0.5) * rect.width,
        y: (-v.y * 0.5 + 0.5) * rect.height,
      };
    },
    setFog(near, far) {
      scene.fog.near = near;
      scene.fog.far = far;
      camera.far = far + 1.2;
      camera.updateProjectionMatrix();
    },
    sync(state, time, nextCull) {
      if (nextCull) cull = nextCull;
      const painted = previewSpring ? 0 : state.season;
      if (painted !== seenSeason) applySeason(painted);
      paintGround(painted);
      syncBuildings(state, painted);
      syncAgents(state, time);
      syncVehicles(state);
      sky(state, painted, time || 0);
      if (selectCell) {
        const p = cellToWorld(selectCell.gx, selectCell.gz);
        ring.position.set(p.x, 0.2, p.z);
        ring.visible = true;
      } else ring.visible = false;
      if (ghostCell) {
        const p = cellToWorld(ghostCell.gx, ghostCell.gz);
        ghost.position.set(p.x, 0.5, p.z);
        ghost.material.color.set(ghostOk ? 0x3dbe6a : 0xd04545);
        ghost.visible = true;
      } else ghost.visible = false;
      sunTarget.position.set(cull.x, 0, cull.z);
      sun.position.set(cull.x + 12, 20, cull.z + 8);
      let ti = 0;
      let ri2 = 0;
      (state.nodes || []).forEach((n) => {
        if (!n.alive) return;
        const p = cellToWorld(n.gx, n.gz);
        if (Math.hypot(p.x - cull.x, p.z - cull.z) > cull.radius) return;
        if (n.kind === 'rock' && ri2 < 24) {
          put(rockMesh, ri2, p.x, 0.28, p.z, 1, 0.8, 1, n.id, 0x9aa0a4);
          ri2 += 1;
        } else if (ti < 40) {
          put(treeTrunk, ti, p.x, 0.45, p.z, 1, 1, 1, 0, 0x6b4226);
          const farTree = Math.hypot(p.x - cull.x, p.z - cull.z) > metersToUnits(40);
          put(treeTop, ti, p.x, farTree ? 1.05 : 1.25, p.z, farTree ? 0.7 : 1, farTree ? 0.7 : 1, farTree ? 0.7 : 1, 0, 0x3aaa40);
          ti += 1;
        }
      });
      commit(treeTrunk, ti);
      commit(treeTop, ti);
      commit(rockMesh, ri2);
      const who = state.villagers.find((v) => v.player);
      if (who && state.equipped && (state.tools || {})[state.equipped]) {
        const p = cellToWorld(who.gx, who.gz);
        const yaw = who.ry || 0;
        const swing = state.swing > 0 ? Math.sin((0.45 - state.swing) * 14) : 0;
        handTool.position.set(p.x + Math.sin(yaw) * 0.35, 0.75 + swing * 0.15, p.z + Math.cos(yaw) * 0.35);
        handTool.rotation.set(swing * 0.8, yaw, 0.4);
        handTool.visible = true;
      } else handTool.visible = false;
    },
    render() { renderer.render(scene, camera); },
  };
}
