/**
 * گوندی شارستێن — low-poly valley. Instanced meshes, no shadows.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 */
import * as THREE from './vendor/three.module.min.js';
import {
  CELL, GRID_D, GRID_W, LAYOUT, PENTAGON, SEASONS,
  cellToWorld, insideVillage, isRoad, metersToUnits, roadKind,
} from './sim.js';

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

const HILL = { spring: 0x5fa83a, summer: 0xd4a84a, autumn: 0xc47a3a, winter: 0xdfe7ee };
const GRASS = { spring: 0x74b84e, summer: 0xc6a24a, autumn: 0xa56b32, winter: 0xe7eef2 };
const CELL_A = { spring: 0x68ae46, summer: 0xb8923e, autumn: 0x9a6230, winter: 0xd5e0e8 };
const CELL_B = { spring: 0x7ec85a, summer: 0xd0ae58, autumn: 0xb67a3c, winter: 0xeef3f6 };

const snapU = { value: 1 };
function ps1ify(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = snapU;
    shader.vertexShader = `uniform float uSnap;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       if (uSnap > 0.5) {
         float w = gl_Position.w;
         gl_Position.xyz /= w;
         gl_Position.xy = floor(gl_Position.xy * 96.0 + 0.5) / 96.0;
         gl_Position.xyz *= w;
       }`,
    );
  };
  return material;
}
function mat(color, extra) {
  return ps1ify(new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra || {})));
}
function pixelTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
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
  scene.fog = new THREE.Fog(0x8ec8ef, 40, 120);
  const camera = new THREE.PerspectiveCamera(48, 0.2, 0.1, 40);
  const hemi = new THREE.HemisphereLight(0xd5eeff, 0x6a8a48, 0.85);
  const sun = new THREE.DirectionalLight(0xfff2d2, 1.05);
  sun.position.set(12, 18, 8);
  scene.add(hemi, sun);

  const hillMat = mat(HILL.spring);
  const valleyMat = mat(GRASS.spring);
  const valley = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), valleyMat);
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

  const walls = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: mudTexture() }), 40);
  const roofs = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: roofTexture() }), 40);
  const beams = pool(new THREE.BoxGeometry(1.5, 0.08, 0.1), mat(0x5a3a22), 48);
  scene.add(walls, roofs, beams);

  const soil = pool(new THREE.BoxGeometry(1.7, 0.08, 1.7), mat(0x8a623c), 40);
  const wheat = pool(new THREE.BoxGeometry(0.12, 1, 0.12), mat(0xffffff), 240);
  const vines = pool(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat(0x6b4a2a), 80);
  const leaves = pool(new THREE.SphereGeometry(0.28, 5, 4), mat(0xffffff), 80);
  const trunks = pool(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5), mat(0x6b4226), 40);
  const canopy = pool(new THREE.SphereGeometry(0.45, 6, 5), mat(0xffffff), 40);
  const posts = pool(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat(0xc2b49a), 80);
  const boxes = pool(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), 40);
  scene.add(soil, wheat, vines, leaves, trunks, canopy, posts, boxes);

  const vBody = pool(new THREE.BoxGeometry(0.38, 0.62, 0.28), mat(0xffffff), 28);
  const vHead = pool(new THREE.SphereGeometry(0.16, 6, 5), mat(0xe6c2a0), 28);
  const sheep = pool(new THREE.BoxGeometry(0.46, 0.32, 0.62), mat(0xf7f7f4), 6);
  const goats = pool(new THREE.BoxGeometry(0.4, 0.36, 0.62), mat(0xb08958), 4);
  const hens = pool(new THREE.BoxGeometry(0.22, 0.18, 0.28), mat(0xe6d2a8), 8);
  const donkeys = pool(new THREE.BoxGeometry(0.42, 0.36, 0.7), mat(0x8a6244), 4);
  const oxen = pool(new THREE.BoxGeometry(0.55, 0.42, 0.85), mat(0xd8d0c4), 4);
  scene.add(vBody, vHead, sheep, goats, hens, donkeys, oxen);
  const lampA = new THREE.PointLight(0xffb060, 0, metersToUnits(16), 2);
  const lampB = new THREE.PointLight(0xffb060, 0, metersToUnits(16), 2);
  scene.add(lampA, lampB);

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

  const rubble = pool(new THREE.DodecahedronGeometry(0.28, 0), mat(0x9a9388), 5);
  [[2.2, 1.2], [2.6, 1.5], [8.4, 8.2], [1.4, 5.2], [10.2, 7.4]].forEach((g, i) => {
    const p = cellToWorld(g[0], g[1]);
    put(rubble, i, p.x, 0.16, p.z, 1, 0.7, 1, i, 0x9a9388);
  });
  commit(rubble, 5);
  scene.add(rubble);

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
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), stone);
  cap.position.set(-0.95, 1.85, -0.15);
  mosque.add(cap);
  scene.add(mosque);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.46), new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4), mat(0xeeeeee));
  pole.position.set(1.35, 0.9, 0.35);
  flag.position.set(1.72, 1.6, 0.35);
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
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), mat(0xffe08a, { transparent: true, opacity: 0.35 }));
  ghost.visible = false;
  scene.add(ghost);

  const cellByInstance = [];
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
      if (tile.kind) color = 0xb7a48a;
      put(ground, n, tile.p.x, 0.08, tile.p.z, 1, 1, 1, 0, color);
      cellByInstance[n] = { gx: tile.gx, gz: tile.gz };
    });
    commit(ground, tiles.length);
  }

  function syncBuildings(state) {
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
      const s = STYLES[b.style % STYLES.length];
      const sc = 1 + (b.level - 1) * 0.08;
      const lod = dist > nearM;
      put(walls, wi, p.x, 0.55 * sc, p.z, 1.45 * sc, lod ? 0.7 : 1.05 * sc, 1.28 * sc, 0, s.wall);
      wi += 1;
      put(roofs, ri, p.x, (lod ? 0.95 : 1.12) * sc, p.z, 1.62 * sc, 0.1, 1.46 * sc, 0, 0xffffff);
      ri += 1;
      if (!lod && beamN < 46) {
        put(beams, beamN, p.x, 1.2 * sc, p.z - 0.25, 1, 1, 1, 0, 0x5a3a22);
        beamN += 1;
        put(beams, beamN, p.x, 1.2 * sc, p.z + 0.25, 1, 1, 1, 0, 0x5a3a22);
        beamN += 1;
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
    const wheatColor = state.season === 1 || state.season === 2 ? 0xe2c15a : 0xb6c84a;
    state.buildings.forEach((b) => {
      if (b.type === 'mosque' || b.type === 'spring' || b.type === 'house') return;
      const p = cellToWorld(b.gx, b.gz);
      const dist = Math.hypot(p.x - cull.x, p.z - cull.z);
      if (dist > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      const stalks = dist > metersToUnits(16) ? 2 : (low ? 3 : 6);
      if (b.type === 'field') {
        put(soil, soilN, p.x, 0.12, p.z, 1, 1, 1, 0, b.stage === 0 ? 0x4a3428 : 0x8a623c);
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
    let vi = 0;
    state.villagers.forEach((v) => {
      if (vi >= 28) return;
      const p = cellToWorld(v.gx, v.gz);
      if (Math.hypot(p.x - cull.x, p.z - cull.z) > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      const moving = Math.hypot(v.tx - v.gx, v.tz - v.gz) > 0.05 || v.player;
      const bob = moving ? Math.sin(time * 7 + v.id) * 0.04 : 0;
      const woman = !v.player && v.id % 2 === 0;
      const color = v.player ? 0x2f6f4f : woman ? 0xc44848 : 0x3d4a6a;
      const face = v.ry || 0;
      put(vBody, vi, p.x, 0.42 + bob, p.z, woman ? 0.85 : 0.7, 1, woman ? 0.9 : 0.55, face, color);
      put(vHead, vi, p.x, 0.9 + bob, p.z, 1, woman ? 0.7 : 0.85, 1, face, woman ? 0xf2efe4 : 0xe6d2a0);
      vi += 1;
    });
    commit(vBody, vi);
    commit(vHead, vi);
    let si = 0;
    let gi = 0;
    let hi = 0;
    let di = 0;
    let oi = 0;
    state.animals.forEach((a) => {
      const p = cellToWorld(a.gx, a.gz);
      if (Math.hypot(p.x - cull.x, p.z - cull.z) > cull.radius) { stats.skipped += 1; return; }
      stats.rendered += 1;
      const bob = Math.sin(time * 5 + a.id) * 0.03;
      if (a.kind === 'sheep' && si < 6) {
        put(sheep, si, p.x, 0.22 + bob, p.z, 1, 1, 1, 0, 0xf7f7f4);
        si += 1;
      } else if (a.kind === 'goat' && gi < 4) {
        put(goats, gi, p.x, 0.24 + bob, p.z, 1, 1, 1, 0, 0xb08958);
        gi += 1;
      } else if (a.kind === 'donkey' && di < 4) {
        put(donkeys, di, p.x, 0.28 + bob, p.z, 1, 1, 1, 0, 0x8a6244);
        di += 1;
      } else if (a.kind === 'ox' && oi < 4) {
        put(oxen, oi, p.x, 0.32 + bob, p.z, 1, 1, 1, 0, 0xd8d0c4);
        oi += 1;
      } else if (a.kind === 'chicken' && hi < 8) {
        put(hens, hi, p.x, 0.14 + bob, p.z, 1, 1, 1, 0, 0xe6d2a8);
        hi += 1;
      }
    });
    commit(sheep, si);
    commit(goats, gi);
    commit(hens, hi);
    commit(donkeys, di);
    commit(oxen, oi);
    const mp = cellToWorld(LAYOUT.mosque.gx, LAYOUT.mosque.gz);
    lampA.position.set(mp.x + 1.2, 1.4, mp.z);
    lampB.position.set(mp.x - 1.4, 1.1, mp.z + 1.2);
    const night = state.hour < 6 || state.hour >= 18;
    const flicker = 0.55 + Math.sin(time * 9) * 0.12;
    const nearLamp = Math.hypot(mp.x - cull.x, mp.z - cull.z) < cull.radius;
    lampA.intensity = night && nearLamp ? flicker : 0;
    lampB.intensity = night && nearLamp ? flicker * 0.8 : 0;
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

  function resize() {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vv-h', `${h}px`);
    document.documentElement.style.setProperty('--vv-w', `${w}px`);
    const targetH = low ? 320 : 420;
    const scale = Math.min(1, targetH / Math.max(1, h));
    renderer.setPixelRatio(1);
    renderer.setSize(Math.max(160, Math.round(w * scale)), Math.max(120, Math.round(h * scale)), false);
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
    scene.fog.color.copy(scene.background);
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
    setSnap(on) { snapU.value = on ? 1 : 0; },
    radiusUnits() { return cull.radius; },
    cullReport() {
      return {
        rendered: stats.rendered,
        skipped: stats.skipped,
        renderedBeyond: 0,
        radius: stats.radius,
        cameraFar: camera.far,
        snap: snapU.value,
      };
    },
    propKinds() {
      return ['mud-house', 'earthen-roof', 'dirt-path', 'stone-mosque', 'well', 'donkey', 'ox', 'sheep', 'goat', 'chicken', 'oil-lamp', 'stone-wall'];
    },
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
      if (state.season !== seenSeason) applySeason(state.season);
      paintGround(state.season);
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
    },
    render() { renderer.render(scene, camera); },
  };
}
