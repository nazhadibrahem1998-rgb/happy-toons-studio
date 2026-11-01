/**
 * گوندی شارستێن — low-poly valley. Instanced meshes, no shadows.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 */
import * as THREE from './vendor/three.module.min.js';
import { CELL, GRID_D, GRID_W, SEASONS, cellToWorld } from './sim.js';

const STYLES = [
  { wall: 0xe4d3b0, tarp: false, tank: false, brick: false },
  { wall: 0xb9b9b4, tarp: true, tank: true, brick: false },
  { wall: 0xe7b7c6, tarp: true, tank: false, brick: false },
  { wall: 0x9fbf98, tarp: false, tank: true, brick: false },
  { wall: 0xd7c4a8, tarp: false, tank: true, brick: true },
];

const JOB_COLOR = {
  idle: 0xd8c3a5, farmer: 0xc47a3a, shepherd: 0xf2efe4, baker: 0x8a5a32,
  builder: 0x6d7378, teacher: 0x3d8f8a, healer: 0xf4f7f2, host: 0xa33b3b,
};

const HILL = { spring: 0x5fa83a, summer: 0xd4a84a, autumn: 0xc47a3a, winter: 0xdfe7ee };
const GRASS = { spring: 0x74b84e, summer: 0xc6a24a, autumn: 0xa56b32, winter: 0xe7eef2 };
const CELL_A = { spring: 0x68ae46, summer: 0xb8923e, autumn: 0x9a6230, winter: 0xd5e0e8 };
const CELL_B = { spring: 0x7ec85a, summer: 0xd0ae58, autumn: 0xb67a3c, winter: 0xeef3f6 };

function mat(color, extra) {
  return new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra || {}));
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

function hash(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'low-power',
    alpha: false,
    failIfMajorPerformanceCaveat: false,
  });
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x8ec8ef, 1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec8ef);
  scene.fog = new THREE.Fog(0x8ec8ef, 36, 92);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  const hemi = new THREE.HemisphereLight(0xd5eeff, 0x6a8a48, 0.85);
  const sun = new THREE.DirectionalLight(0xfff2d2, 1.05);
  sun.position.set(12, 18, 8);
  scene.add(hemi, sun);

  const hillMat = mat(HILL.spring);
  const valleyMat = mat(GRASS.spring);
  const valley = new THREE.Mesh(new THREE.PlaneGeometry(78, 68), valleyMat);
  valley.rotation.x = -Math.PI / 2;
  valley.position.y = -0.04;
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
  function commit(mesh, n) {
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  const hills = pool(new THREE.ConeGeometry(3.6, 1, 6), hillMat, 18);
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    const h = 4.2 + (i % 5) * 1.15;
    put(hills, i, Math.cos(a) * 27, h / 2, Math.sin(a) * 24, 1, h, 1, 0, HILL.spring);
  }
  commit(hills, 18);
  scene.add(hills);

  const mountMat = mat(0x8a8e86);
  const mounts = pool(new THREE.ConeGeometry(6, 1, 5), mountMat, 6);
  for (let i = 0; i < 6; i += 1) {
    const h = 11 + (i % 3) * 3;
    put(mounts, i, -16 + i * 6.5, h / 2, -30 - (i % 2) * 3, 1, h, 1, 0, 0x8a8e86);
  }
  commit(mounts, 6);
  scene.add(mounts);

  const ground = pool(new THREE.BoxGeometry(CELL * 0.98, 0.16, CELL * 0.98), mat(0xffffff), GRID_W * GRID_D);
  scene.add(ground);

  const walls = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), 40);
  const roofs = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), 40);
  const tarps = pool(new THREE.BoxGeometry(1, 1, 1), mat(0x2f6fbf), 40);
  const tanks = pool(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 6), mat(0xdedede), 40);
  const bricks = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: brickTexture() }), 20);
  scene.add(walls, roofs, tarps, tanks, bricks);

  const soil = pool(new THREE.BoxGeometry(1.7, 0.08, 1.7), mat(0x8a623c), 40);
  const wheat = pool(new THREE.BoxGeometry(0.12, 1, 0.12), mat(0xffffff), 240);
  const vines = pool(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat(0x6b4a2a), 80);
  const leaves = pool(new THREE.SphereGeometry(0.28, 5, 4), mat(0xffffff), 80);
  const trunks = pool(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5), mat(0x6b4226), 40);
  const canopy = pool(new THREE.SphereGeometry(0.45, 6, 5), mat(0xffffff), 40);
  const posts = pool(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat(0xc2b49a), 80);
  const boxes = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), 40);
  scene.add(soil, wheat, vines, leaves, trunks, canopy, posts, boxes);

  const vBody = pool(new THREE.BoxGeometry(0.38, 0.62, 0.28), mat(0xffffff), 8);
  const vHead = pool(new THREE.SphereGeometry(0.16, 6, 5), mat(0xe6c2a0), 8);
  const sheep = pool(new THREE.BoxGeometry(0.46, 0.32, 0.62), mat(0xf7f7f4), 6);
  const goats = pool(new THREE.BoxGeometry(0.4, 0.36, 0.62), mat(0xb08958), 4);
  const hens = pool(new THREE.BoxGeometry(0.22, 0.18, 0.28), mat(0xe6d2a8), 8);
  scene.add(vBody, vHead, sheep, goats, hens);

  const bushes = pool(new THREE.ConeGeometry(0.35, 0.7, 5), mat(0x3f8f32), 24);
  let bushN = 0;
  for (let i = 0; i < 40 && bushN < 24; i += 1) {
    const gx = -4 + hash(i) * 19;
    const gz = -3.5 + hash(i + 40) * 16;
    const inside = gx > -0.2 && gx < GRID_W - 0.2 && gz > -0.2 && gz < GRID_D - 0.2;
    if (inside) continue;
    const p = cellToWorld(gx, gz);
    put(bushes, bushN, p.x, 0.35, p.z, 1, 1, 1, 0, 0x3f8f32);
    bushN += 1;
  }
  commit(bushes, bushN);
  scene.add(bushes);

  const roadTrees = pool(new THREE.ConeGeometry(0.55, 1.3, 6), mat(0x2f7a32), 16);
  const roadTrunks = pool(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 5), mat(0x6b4226), 16);
  let treeN = 0;
  for (let gx = 0; gx < GRID_W; gx += 2) {
    const p = cellToWorld(gx, 4);
    for (const side of [-1, 1]) {
      if (treeN >= 16) break;
      put(roadTrunks, treeN, p.x, 0.25, p.z + side * 1.35, 1, 1, 1, 0, 0x6b4226);
      put(roadTrees, treeN, p.x, 1.15, p.z + side * 1.35, 1, 1, 1, 0, 0x2f7a32);
      treeN += 1;
    }
  }
  commit(roadTrees, treeN);
  commit(roadTrunks, treeN);
  scene.add(roadTrees, roadTrunks);

  const poles = pool(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 5), mat(0x4a4e52), 6);
  const polePos = [];
  [0, 2, 6, 8].forEach((gz, i) => {
    const p = cellToWorld(3, gz);
    put(poles, i, p.x + 0.7, 1.1, p.z, 1, 1, 1, 0, 0x4a4e52);
    polePos.push(new THREE.Vector3(p.x + 0.7, 2.15, p.z));
  });
  commit(poles, 4);
  scene.add(poles);
  const wireGeo = new THREE.BufferGeometry().setFromPoints(polePos);
  const wires = new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x22262a }));
  scene.add(wires);

  const wallBits = pool(new THREE.BoxGeometry(1.1, 0.45, 0.35), mat(0xb7b1a4), 10);
  for (let i = 0; i < 10; i += 1) {
    const p = cellToWorld(i + 0.5, -0.55);
    put(wallBits, i, p.x, 0.22, p.z, 1, 1, 1, 0, 0xb7b1a4);
  }
  commit(wallBits, 10);
  scene.add(wallBits);

  const rubble = pool(new THREE.DodecahedronGeometry(0.28, 0), mat(0x9a9388), 5);
  [[2.2, 1.2], [2.6, 1.5], [8.4, 8.2], [1.4, 5.2], [10.2, 7.4]].forEach((g, i) => {
    const p = cellToWorld(g[0], g[1]);
    put(rubble, i, p.x, 0.16, p.z, 1, 0.7, 1, i, 0x9a9388);
  });
  commit(rubble, 5);
  scene.add(rubble);

  const bike = new THREE.Group();
  const bikeMat = mat(0xc43b3b);
  const dark = mat(0x222426);
  const wheelG = new THREE.TorusGeometry(0.22, 0.05, 5, 8);
  const w1 = new THREE.Mesh(wheelG, dark);
  const w2 = new THREE.Mesh(wheelG, dark);
  w1.position.set(-0.32, 0.22, 0);
  w2.position.set(0.32, 0.22, 0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.18), bikeMat);
  body.position.y = 0.38;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.16), dark);
  seat.position.set(-0.08, 0.5, 0);
  bike.add(w1, w2, body, seat);
  const home = cellToWorld(5, 2);
  bike.position.set(home.x - 1.15, 0, home.z + 0.95);
  scene.add(bike);

  const mosque = new THREE.Group();
  const stone = mat(0xf4f1ea);
  const trim = mat(0x2f8f55);
  const hole = mat(0x3e4a55);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.15, 1.5), stone);
  hall.position.y = 0.58;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.1, 1.58), trim);
  band.position.y = 1.12;
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.4), stone);
  terrace.position.y = 1.22;
  for (let i = -1; i <= 1; i += 1) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.06), hole);
    win.position.set(i * 0.42, 0.62, 0.76);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 4), hole);
    point.position.set(i * 0.42, 0.92, 0.76);
    mosque.add(win, point);
  }
  const canopyTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.55), mat(0xfffef8));
  canopyTop.position.set(0.25, 1.62, 0);
  for (const sx of [-0.05, 0.55]) {
    for (const sz of [-0.18, 0.18]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 4), stone);
      post.position.set(sx, 1.42, sz);
      mosque.add(post);
    }
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.7, 6), stone);
  shaft.position.set(-0.95, 0.85, -0.15);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 6), trim);
  gallery.position.set(-0.95, 1.55, -0.15);
  mosque.add(hall, band, terrace, canopyTop, shaft, gallery);
  for (let i = 0; i < 4; i += 1) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), mat(0x1c1c1c));
    const a = (i / 4) * Math.PI * 2;
    sp.position.set(-0.95 + Math.cos(a) * 0.22, 1.7, -0.15 + Math.sin(a) * 0.22);
    mosque.add(sp);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), stone);
  cap.position.set(-0.95, 1.85, -0.15);
  mosque.add(cap);
  scene.add(mosque);
  const mosqueSpot = cellToWorld(7, 2);
  mosque.position.set(mosqueSpot.x, 0, mosqueSpot.z);

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.46), new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4), mat(0xeeeeee));
  pole.position.set(mosqueSpot.x + 1.3, 0.9, mosqueSpot.z + 0.2);
  flag.position.set(mosqueSpot.x + 1.68, 1.6, mosqueSpot.z + 0.2);
  scene.add(pole, flag);

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
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), mat(0xffe08a, { transparent: true, opacity: 0.35 }));
  ghost.visible = false;
  scene.add(ghost);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let low = false;
  let seenSeason = -1;

  function applySeason(season) {
    const key = SEASONS[season] || 'spring';
    hillMat.color.set(HILL[key]);
    valleyMat.color.set(GRASS[key]);
    mountMat.color.set(key === 'summer' ? 0xb7a06a : key === 'winter' ? 0xd5dde4 : 0x8a8e86);
    for (let i = 0; i < 18; i += 1) hills.setColorAt(i, hillMat.color);
    hills.instanceColor.needsUpdate = true;
    seenSeason = season;
  }

  function paintGround(season) {
    const key = SEASONS[season] || 'spring';
    let n = 0;
    for (let gz = 0; gz < GRID_D; gz += 1) {
      for (let gx = 0; gx < GRID_W; gx += 1) {
        const p = cellToWorld(gx, gz);
        let color = ((gx + gz) % 2 === 0) ? CELL_A[key] : CELL_B[key];
        if (gz === 4) color = 0xb9b9b2;
        else if (gx === 3) color = 0xa1845c;
        put(ground, n, p.x, 0.08, p.z, 1, 1, 1, 0, color);
        n += 1;
      }
    }
    commit(ground, n);
  }

  function syncBuildings(state) {
    const houses = state.buildings.filter((b) => b.type === 'house');
    let wi = 0;
    let ri = 0;
    let ti = 0;
    let ki = 0;
    let bi = 0;
    houses.forEach((b) => {
      const p = cellToWorld(b.gx, b.gz);
      const s = STYLES[b.style % STYLES.length];
      const sc = 1 + (b.level - 1) * 0.08;
      put(walls, wi, p.x, 0.55 * sc, p.z, 1.45 * sc, 1.05 * sc, 1.28 * sc, 0, s.wall);
      wi += 1;
      put(roofs, ri, p.x, 1.12 * sc, p.z, 1.62 * sc, 0.1, 1.46 * sc, 0, state.season === 3 ? 0xf4f7fa : 0xc5c2ba);
      ri += 1;
      if (s.tarp) {
        put(tarps, ti, p.x, 1.22 * sc, p.z - 0.05, 1.05, 0.05, 0.82, 0, 0x2f6fbf);
        ti += 1;
      }
      if (s.tank) {
        put(tanks, ki, p.x + 0.42, 1.42 * sc, p.z - 0.28, 1, 1, 1, 0, 0xdedede);
        ki += 1;
      }
      if (s.brick) {
        put(bricks, bi, p.x, 0.62 * sc, p.z + 0.66 * sc, 1.15 * sc, 0.82 * sc, 0.05, 0, 0xffffff);
        bi += 1;
      }
    });
    commit(walls, wi);
    commit(roofs, ri);
    commit(tarps, ti);
    commit(tanks, ki);
    commit(bricks, bi);

    let soilN = 0;
    let wheatN = 0;
    let vineN = 0;
    let leafN = 0;
    let trunkN = 0;
    let canN = 0;
    let postN = 0;
    let boxN = 0;
    const stalks = low ? 3 : 6;
    const wheatColor = state.season === 1 || state.season === 2 ? 0xe2c15a : 0xb6c84a;
    state.buildings.forEach((b) => {
      if (b.type === 'mosque' || b.type === 'spring' || b.type === 'house') return;
      const p = cellToWorld(b.gx, b.gz);
      if (b.type === 'field') {
        put(soil, soilN, p.x, 0.12, p.z, 1, 1, 1, 0, 0x8a623c);
        soilN += 1;
        if (b.stage > 0) {
          const h = 0.18 + (b.growth / 100) * 0.75;
          for (let k = 0; k < stalks; k += 1) {
            const ox = ((k % 3) - 1) * 0.38;
            const oz = (Math.floor(k / 3) - 0.5) * 0.4;
            put(wheat, wheatN, p.x + ox, 0.12 + h / 2, p.z + oz, 1, h, 1, 0, b.stage === 3 ? 0xf0d56a : wheatColor);
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
          const leaf = state.season === 1 ? 0xc6b04a : 0x3f8f3a;
          put(leaves, leafN, p.x, 0.78, p.z + oz, 1.1, 0.7, 0.8, 0, state.season === 1 || state.season === 2 ? 0x7a3e86 : leaf);
          leafN += 1;
        }
        return;
      }
      if (b.type === 'orchard_pom' || b.type === 'orchard_walnut') {
        put(trunks, trunkN, p.x, 0.4, p.z, 1, 1, 1, 0, 0x6b4226);
        trunkN += 1;
        put(canopy, canN, p.x, 1.05, p.z, 1, 1, 1, 0, b.type === 'orchard_pom' ? 0xc44848 : 0x6aaa48);
        canN += 1;
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
    let vi = 0;
    state.villagers.forEach((v) => {
      if (vi >= 8) return;
      const p = cellToWorld(v.gx, v.gz);
      const moving = Math.hypot(v.tx - v.gx, v.tz - v.gz) > 0.05 || v.player;
      const bob = moving ? Math.sin(time * 7 + v.id) * 0.04 : 0;
      const color = v.player ? 0x2a6f8f : (JOB_COLOR[v.job] || JOB_COLOR.idle);
      put(vBody, vi, p.x, 0.42 + bob, p.z, 1, 1, 1, 0, color);
      put(vHead, vi, p.x, 0.86 + bob, p.z, 1, 1, 1, 0, 0xe6c2a0);
      vi += 1;
    });
    commit(vBody, vi);
    commit(vHead, vi);
    let si = 0;
    let gi = 0;
    let hi = 0;
    state.animals.forEach((a) => {
      const p = cellToWorld(a.gx, a.gz);
      const bob = Math.sin(time * 5 + a.id) * 0.03;
      if (a.kind === 'sheep' && si < 6) {
        put(sheep, si, p.x, 0.22 + bob, p.z, 1, 1, 1, 0, 0xf7f7f4);
        si += 1;
      } else if (a.kind === 'goat' && gi < 4) {
        put(goats, gi, p.x, 0.24 + bob, p.z, 1, 1, 1, 0, 0xb08958);
        gi += 1;
      } else if (hi < 8) {
        put(hens, hi, p.x, 0.14 + bob, p.z, 1, 1, 1, 0, 0xe6d2a8);
        hi += 1;
      }
    });
    commit(sheep, si);
    commit(goats, gi);
    commit(hens, hi);
  }

  function resize() {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vv-h', `${h}px`);
    document.documentElement.style.setProperty('--vv-w', `${w}px`);
    const dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function sky(state) {
    const h = state.hour + (state.acc || 0) / 2;
    const night = h < 5 || h >= 19;
    const dawn = (h >= 5 && h < 8) || (h >= 17 && h < 19);
    const summer = state.season === 1;
    const color = night ? 0x1c2744 : dawn ? 0xf0a06a : summer ? 0x7ebfe8 : 0x8ec8ef;
    scene.background.set(color);
    scene.fog.color.set(color);
    sun.intensity = night ? 0.16 : dawn ? 0.7 : 1.05;
    hemi.intensity = night ? 0.35 : 0.82;
    hemi.color.set(night ? 0x223055 : 0xd5eeff);
    hemi.groundColor.set(GRASS[SEASONS[state.season]] || GRASS.spring);
    const ang = ((Math.min(18, Math.max(6, h)) - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(ang) * 24, Math.sin(ang) * 22 + 2, 10);
  }

  let ghostCell = null;
  let selectCell = null;

  return {
    camera,
    hillMat,
    resize,
    setQuality(isLow) { low = !!isLow; resize(); },
    setGhost(cell) { ghostCell = cell; },
    setSelect(cell) { selectCell = cell; },
    getHillColor() {
      const c = hillMat.color;
      return { r: c.r, g: c.g, b: c.b, hex: c.getHexString() };
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(ground);
      if (!hits.length || hits[0].instanceId == null) return null;
      const id = hits[0].instanceId;
      return { gx: id % GRID_W, gz: Math.floor(id / GRID_W) };
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
      const dist = 7.2;
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
    sync(state, time) {
      if (state.season !== seenSeason) {
        applySeason(state.season);
        paintGround(state.season);
      }
      syncBuildings(state);
      syncAgents(state, time);
      sky(state);
      if (selectCell) {
        const p = cellToWorld(selectCell.gx, selectCell.gz);
        ring.position.set(p.x, 0.2, p.z);
        ring.visible = true;
      } else ring.visible = false;
      if (ghostCell) {
        const p = cellToWorld(ghostCell.gx, ghostCell.gz);
        ghost.position.set(p.x, 0.5, p.z);
        ghost.visible = true;
      } else ghost.visible = false;
      wires.visible = !low;
    },
    render() { renderer.render(scene, camera); },
  };
}
