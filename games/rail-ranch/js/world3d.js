import * as THREE from '../vendor/three.module.min.js';
import { LAYOUT, blocked } from './sim.js';

const ELEV = 40 * Math.PI / 180;
const AZIM = Math.PI / 4;
const GRASS = 0x9be85c;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGradient() {
  const data = new Uint8Array([
    198, 198, 204, 255,
    226, 226, 230, 255,
    246, 246, 248, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 4, 1);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function grassTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9BE85C';
  g.fillRect(0, 0, 512, 512);
  const rnd = mulberry32(11);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(40,110,30,0.09)';
    g.beginPath();
    g.ellipse(rnd() * 512, rnd() * 512, 18 + rnd() * 46, 10 + rnd() * 26, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = i % 3 === 0 ? '#fff4b0' : i % 3 === 1 ? '#ff9ec0' : '#ffffff';
    g.beginPath();
    g.arc(rnd() * 512, rnd() * 512, 1.4 + rnd() * 1.6, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 8);
  return tex;
}

function shingleTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#3ad4c8';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#17685f';
  g.lineWidth = 2;
  for (let y = 6; y < 64; y += 8) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(64, y);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(0, y - 4, 64, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function priceTexture(label) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = '#3ddc58';
  g.beginPath();
  g.roundRect(28, 48, 150, 160, 28);
  g.fill();
  g.strokeStyle = '#f3ffe8';
  g.lineWidth = 8;
  g.strokeRect(52, 78, 104, 84);
  g.fillStyle = '#ffffff';
  g.font = '800 78px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$', 104, 128);
  g.font = '800 120px sans-serif';
  g.textAlign = 'left';
  g.fillText(String(label).replace('$', ''), 200, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundedPadGeometry(w, h) {
  const r = Math.min(8, w * 0.18, h * 0.18);
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 0.7,
    bevelSize: 0.7,
    bevelSegments: 2,
    curveSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 1.6, 0);
  return geo;
}

export function createWorld(canvas, fx) {
  const gradient = makeGradient();
  const toon = (color, extra) => new THREE.MeshToonMaterial(Object.assign({
    color,
    gradientMap: gradient,
  }, extra || {}));

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xb6f56e, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GRASS, 900, 2200);
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 4000);
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dummy = new THREE.Object3D();
  const ndc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();
  const proj = new THREE.Vector3();

  const hemi = new THREE.HemisphereLight(0xfffaf0, 0x9ed86a, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6df, 1.85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const rim = new THREE.DirectionalLight(0xfff1c2, 0.45);
  rim.position.set(-180, 120, -140);
  scene.add(rim);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 1.2;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 1600;
  scene.add(sun);
  scene.add(sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4200, 3200),
    toon(GRASS, { map: grassTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(new THREE.CircleGeometry(210, 28), toon(0xf6d35a));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(980, 0.15, 210);
  sand.scale.set(1.3, 0.85, 1);
  sand.receiveShadow = true;
  scene.add(sand);

  const road = new THREE.Mesh(new THREE.BoxGeometry(LAYOUT.road.w, 1.6, 46), toon(0xe7e4dc));
  road.position.set(LAYOUT.road.x + LAYOUT.road.w / 2, 0.7, LAYOUT.road.y + 16);
  road.receiveShadow = true;
  scene.add(road);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(LAYOUT.road.w, 1.2, 6), toon(0x9aa3ad));
  curb.position.set(road.position.x, 1.1, LAYOUT.road.y + 40);
  scene.add(curb);

  const pond = new THREE.Mesh(new THREE.CircleGeometry(36, 24), toon(0x6ec4ea));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(190, 0.25, 910);
  scene.add(pond);

  const trees = [];
  const rnd = mulberry32(21);
  let guard = 0;
  while (trees.length < 78 && guard < 900) {
    guard += 1;
    const x = -180 + rnd() * 1900;
    const y = -160 + rnd() * 1400;
    const inside = x > 12 && y > 12 && x < LAYOUT.worldW - 12 && y < LAYOUT.worldH - 12;
    if (inside && blocked(x, y)) continue;
    if (y > 790 && y < 880 && x > 140 && x < 1020) continue;
    trees.push({ x, y, s: 0.82 + rnd() * 0.55, pine: rnd() < 0.28, tint: rnd() });
  }

  const trunkGeo = new THREE.CylinderGeometry(3.1, 4.2, 16, 7);
  trunkGeo.translate(0, 8, 0);
  const puffGeo = new THREE.SphereGeometry(15, 14, 10);
  puffGeo.translate(0, 24, 0);
  const puff2 = new THREE.SphereGeometry(11, 12, 9);
  puff2.translate(-9, 32, 3);
  const puff3 = new THREE.SphereGeometry(10, 12, 9);
  puff3.translate(8, 30, -4);
  const puffHi = new THREE.SphereGeometry(6.4, 10, 8);
  puffHi.translate(3, 36, 5);
  const pineGeo = new THREE.ConeGeometry(11, 28, 7);
  pineGeo.translate(0, 22, 0);
  const shadowGeo = new THREE.CircleGeometry(13, 12);
  shadowGeo.rotateX(-Math.PI / 2);
  shadowGeo.translate(0, 0.35, 0);

  const trunkMat = toon(0x8a5a34);
  const leafMat = toon(0x3ad24a);
  const leafMat2 = toon(0xc8f56e);
  const pineMat = toon(0x1f7a3c);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x143014, transparent: true, opacity: 0.3, depthWrite: false });

  function instances(geo, mat, n) {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = mat !== shadowMat;
    mesh.receiveShadow = true;
    if (mat === shadowMat) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
    scene.add(mesh);
    return mesh;
  }
  const nTrees = trees.length;
  const trunks = instances(trunkGeo, trunkMat, nTrees);
  const leavesA = instances(puffGeo, leafMat, nTrees);
  const leavesB = instances(puff2, leafMat2, nTrees);
  const leavesC = instances(puff3, leafMat, nTrees);
  const leavesHi = instances(puffHi, leafMat2, nTrees);
  const pines = instances(pineGeo, pineMat, nTrees);
  const shades = instances(shadowGeo, shadowMat, nTrees);
  trunks.castShadow = false;
  leavesA.castShadow = false;
  leavesB.castShadow = false;
  leavesC.castShadow = false;
  leavesHi.castShadow = false;
  pines.castShadow = false;
  for (let i = 0; i < nTrees; i++) {
    const t = trees[i];
    dummy.position.set(t.x, 0, t.y);
    dummy.rotation.set(0, t.tint * 6, 0);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.updateMatrix();
    shades.setMatrixAt(i, dummy.matrix);
    trunks.setMatrixAt(i, dummy.matrix);
    if (t.pine) {
      pines.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      leavesA.setMatrixAt(i, dummy.matrix);
      leavesB.setMatrixAt(i, dummy.matrix);
      leavesC.setMatrixAt(i, dummy.matrix);
      leavesHi.setMatrixAt(i, dummy.matrix);
    } else {
      leavesA.setMatrixAt(i, dummy.matrix);
      leavesB.setMatrixAt(i, dummy.matrix);
      leavesC.setMatrixAt(i, dummy.matrix);
      leavesHi.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      pines.setMatrixAt(i, dummy.matrix);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  leavesA.instanceMatrix.needsUpdate = true;
  leavesB.instanceMatrix.needsUpdate = true;
  leavesC.instanceMatrix.needsUpdate = true;
  leavesHi.instanceMatrix.needsUpdate = true;
  pines.instanceMatrix.needsUpdate = true;
  shades.instanceMatrix.needsUpdate = true;

  const flowerGeo = new THREE.SphereGeometry(2.1, 6, 5);
  flowerGeo.translate(0, 2, 0);
  const flowerColors = [0xfff4b0, 0xff8eb8, 0xffffff];
  const flowers = flowerColors.map((color) => instances(flowerGeo, toon(color), 40));
  flowers.forEach((mesh) => { mesh.castShadow = false; });
  const fr = mulberry32(4);
  for (let i = 0; i < 40; i++) {
    dummy.position.set(40 + fr() * 1400, 0, 40 + fr() * 960);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    flowers[i % 3].setMatrixAt(Math.floor(i / 3), dummy.matrix);
  }
  flowers.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; mesh.count = 14; });

  function fenceRun(x, z, len, vertical) {
    const post = new THREE.BoxGeometry(3.2, 14, 3.2);
    const rail = new THREE.BoxGeometry(vertical ? 2.2 : len, 1.6, vertical ? len : 2.2);
    const wood = toon(0xd7a15a);
    const posts = new THREE.InstancedMesh(post, wood, 12);
    posts.castShadow = true;
    const n = Math.min(12, Math.floor(len / 16) + 1);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      dummy.position.set(vertical ? x : x + t * len, 7, vertical ? z + t * len : z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
    }
    posts.count = n;
    posts.instanceMatrix.needsUpdate = true;
    scene.add(posts);
    const r1 = new THREE.Mesh(rail, wood);
    const r2 = new THREE.Mesh(rail, toon(0xc9854a));
    r1.position.set(vertical ? x : x + len / 2, 10, vertical ? z + len / 2 : z);
    r2.position.set(vertical ? x : x + len / 2, 5, vertical ? z + len / 2 : z);
    scene.add(r1, r2);
  }
  fenceRun(200, 600, 150, false);
  fenceRun(230, 150, 100, true);
  fenceRun(900, 520, 110, false);
  const pen = LAYOUT.fence;
  fenceRun(pen.x, pen.y, pen.w, false);
  fenceRun(pen.x, pen.y, pen.h, true);
  fenceRun(pen.x + pen.w, pen.y, pen.h, true);

  function addMesh(geo, material, x, y, z, parent) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const buildings = {};
  function placeBuilding(id, x, z, group) {
    group.position.set(x, 0, z);
    group.rotation.y = Math.PI / 4;
    scene.add(group);
    buildings[id] = group;
  }

  const barn = new THREE.Group();
  addMesh(new THREE.BoxGeometry(58, 34, 42), toon(0xe23b3b), 0, 17, 0, barn);
  addMesh(new THREE.BoxGeometry(60, 3.2, 44), toon(0xfffaf2), 0, 33, 0, barn);
  const gable = new THREE.Shape();
  gable.moveTo(-30, 0);
  gable.lineTo(0, 20);
  gable.lineTo(30, 0);
  const roofGeo = new THREE.ExtrudeGeometry(gable, { depth: 48, bevelEnabled: false });
  roofGeo.translate(0, 0, -24);
  const roof = addMesh(roofGeo, toon(0x3ad4c8, { map: shingleTexture() }), 0, 34, 0, barn);
  roof.rotation.y = 0;
  addMesh(new THREE.BoxGeometry(18, 22, 1.4), toon(0xfffaf2), 0, 12, 21.2, barn);
  addMesh(new THREE.BoxGeometry(14, 18, 1.2), toon(0xc62828), 0, 11, 22.2, barn);
  const x1 = addMesh(new THREE.BoxGeometry(16, 2.4, 1.4), toon(0xffffff), 0, 12, 23.2, barn);
  x1.rotation.z = 0.78;
  const x2 = addMesh(new THREE.BoxGeometry(16, 2.4, 1.4), toon(0xffffff), 0, 12, 23.5, barn);
  x2.rotation.z = -0.78;
  addMesh(new THREE.BoxGeometry(8, 8, 2), toon(0x1b1b1b), 0, 40, 8, barn);
  addMesh(new THREE.BoxGeometry(5, 5, 1.5), toon(0xffe7a0), 0, 40, 9.2, barn);
  placeBuilding('barn', 555, 392, barn);

  const market = new THREE.Group();
  addMesh(new THREE.BoxGeometry(52, 22, 28), toon(0xc47a3a), 0, 11, 0, market);
  for (let i = 0; i < 6; i++) {
    const stripe = addMesh(new THREE.BoxGeometry(8, 2, 30), toon(i % 2 ? 0xf4f7f2 : 0x3aaa55), -22 + i * 9, 24, 0, market);
    stripe.rotation.z = -0.35;
  }
  placeBuilding('market', LAYOUT.market.x, LAYOUT.market.y, market);

  function house(body, roofColor) {
    const g = new THREE.Group();
    addMesh(new THREE.BoxGeometry(36, 22, 28), toon(body), 0, 11, 0, g);
    const top = addMesh(new THREE.ConeGeometry(26, 16, 4), toon(roofColor), 0, 28, 0, g);
    top.rotation.y = Math.PI / 4;
    addMesh(new THREE.BoxGeometry(10, 12, 2), toon(0xfffaf0), 0, 7, 15, g);
    return g;
  }
  placeBuilding('coop', 430, 688, house(0xf2c14e, 0xd4533c));
  placeBuilding('creamery', 1310, 430, house(0xf4f7fb, 0x3d7ee0));
  placeBuilding('greenhouse', 165, 445, (() => {
    const g = new THREE.Group();
    addMesh(new THREE.BoxGeometry(40, 18, 26), toon(0xd7f5e4), 0, 9, 0, g);
    addMesh(new THREE.BoxGeometry(42, 2, 2), toon(0xffffff), 0, 18, 0, g);
    return g;
  })());
  placeBuilding('wheat', 990, 248, (() => {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      addMesh(new THREE.CylinderGeometry(1.1, 1.1, 16, 5), toon(0xf0c14a), -12 + i * 6, 8, 0, g);
      addMesh(new THREE.SphereGeometry(2.4, 6, 5), toon(0xffe38a), -12 + i * 6, 16, 0, g);
    }
    return g;
  })());
  placeBuilding('sheep', 1088, 455, (() => {
    const g = new THREE.Group();
    addMesh(new THREE.BoxGeometry(40, 8, 28), toon(0xc9854a), 0, 4, 0, g);
    return g;
  })());
  placeBuilding('orchard', 240, 155, (() => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      addMesh(new THREE.CylinderGeometry(1.2, 1.4, 10, 5), toon(0x8a5a34), -10 + i * 10, 5, 0, g);
      addMesh(new THREE.SphereGeometry(6, 8, 6), toon(0x2f9a45), -10 + i * 10, 12, 0, g);
      addMesh(new THREE.SphereGeometry(1.6, 6, 5), toon(0xe23b3b), -8 + i * 10, 13, 2, g);
    }
    return g;
  })());
  placeBuilding('apiary', 1165, 155, (() => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) addMesh(new THREE.BoxGeometry(10, 14, 12), toon(i === 1 ? 0xf0b429 : 0xf6d365), -14 + i * 14, 7, 0, g);
    return g;
  })());

  const MAX_PILE = 40;
  function pileMesh(geo, color) {
    const mesh = new THREE.InstancedMesh(geo, toon(color), MAX_PILE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.count = 0;
    scene.add(mesh);
    return mesh;
  }
  const bottle = new THREE.CapsuleGeometry(3.1, 7.2, 4, 8);
  bottle.translate(0, 6, 0);
  const cap = new THREE.CylinderGeometry(1.5, 1.5, 2.1, 8);
  cap.translate(0, 11, 0);
  const piles = {
    milk: pileMesh(bottle, 0xf7fbff),
    milkCap: pileMesh(cap, 0x4aa3e8),
    eggs: pileMesh(new THREE.SphereGeometry(2.8, 8, 6), 0xfff6e4),
    wheat: pileMesh(new THREE.BoxGeometry(5, 4, 4), 0xf0c14a),
    wool: pileMesh(new THREE.SphereGeometry(3.2, 8, 6), 0xffffff),
    apples: pileMesh(new THREE.SphereGeometry(2.8, 8, 6), 0xe23b3b),
    honey: pileMesh(new THREE.CylinderGeometry(2.2, 2.4, 5, 8), 0xf0b429),
    cream: pileMesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 8), 0xf4f7fb),
    blooms: pileMesh(new THREE.SphereGeometry(2.6, 7, 5), 0xff8eb8),
  };

  const sleeperGeo = new THREE.BoxGeometry(7, 2.4, 20);
  const railGeo = new THREE.BoxGeometry(16, 1.8, 2.6);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, toon(0xe07a32), 700);
  const rails = new THREE.InstancedMesh(railGeo, toon(0xd5dbe3), 1400);
  sleepers.castShadow = true;
  sleepers.receiveShadow = true;
  rails.castShadow = true;
  rails.receiveShadow = true;
  scene.add(sleepers, rails);
  let railRev = -1;

  function rebuildRails(poly) {
    const length = poly.length;
    let sCount = 0;
    let rCount = 0;
    for (let d = 0; d < length && sCount < 680; d += 14) {
      const p = sampleAlong(poly, d);
      dummy.position.set(p.x, 1.2, p.y);
      dummy.rotation.set(0, -p.ang, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sleepers.setMatrixAt(sCount, dummy.matrix);
      sCount += 1;
      for (const side of [-5.2, 5.2]) {
        dummy.position.set(p.x + Math.cos(p.ang + Math.PI / 2) * side, 2.5, p.y + Math.sin(p.ang + Math.PI / 2) * side);
        dummy.rotation.set(0, -p.ang, 0);
        dummy.updateMatrix();
        if (rCount < 1400) rails.setMatrixAt(rCount, dummy.matrix);
        rCount += 1;
      }
    }
    sleepers.count = sCount;
    rails.count = rCount;
    sleepers.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
  }

  function sampleAlong(poly, dist) {
    const seg = poly.seg;
    const length = poly.length || 1;
    let d = ((dist % length) + length) % length;
    let i = 0;
    while (i < seg.length - 1 && seg[i + 1].start <= d) i += 1;
    const s = seg[i];
    const t = s.len > 0 ? (d - s.start) / s.len : 0;
    return {
      x: s.a.x + (s.b.x - s.a.x) * t,
      y: s.a.y + (s.b.y - s.a.y) * t,
      ang: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
    };
  }

  function makeTrainPart(engine) {
    const g = new THREE.Group();
    if (engine) {
      addMesh(new THREE.BoxGeometry(34, 14, 16), toon(0x2c6fe0), 0, 10, 0, g);
      addMesh(new THREE.BoxGeometry(22, 3, 16.4), toon(0xf2d23a), 2, 12, 0, g);
      addMesh(new THREE.BoxGeometry(14, 12, 14), toon(0x1d4eaa), -2, 20, 0, g);
      addMesh(new THREE.BoxGeometry(8, 6, 2), toon(0xd7f1ff), -2, 22, 8, g);
      addMesh(new THREE.CylinderGeometry(2.2, 2.6, 8, 8), toon(0xc0392b), -6, 24, 0, g);
      addMesh(new THREE.BoxGeometry(6, 5, 6), toon(0xe8eef5), 16, 10, 0, g);
    } else {
      addMesh(new THREE.BoxGeometry(26, 12, 15), toon(0xfff7ea), 0, 9, 0, g);
      addMesh(new THREE.BoxGeometry(26, 3, 15.4), toon(0x2c6fe0), 0, 10, 0, g);
    }
    const wheel = new THREE.CylinderGeometry(3.1, 3.1, 2.2, 10);
    wheel.rotateX(Math.PI / 2);
    for (const wx of engine ? [-10, 8] : [-7, 7]) {
      const w = addMesh(wheel, toon(0x242424), wx, 3.2, 8, g);
      w.userData.wheel = true;
      addMesh(wheel, toon(0x242424), wx, 3.2, -8, g).userData.wheel = true;
    }
    return g;
  }
  const train = new THREE.Group();
  scene.add(train);
  const parts = [];

  function makeTruck() {
    const g = new THREE.Group();
    addMesh(new THREE.BoxGeometry(18, 12, 14), toon(0xe23b3b), 6, 9, 0, g);
    addMesh(new THREE.BoxGeometry(14, 9, 14), toon(0xc47a3a), -10, 8, 0, g);
    addMesh(new THREE.BoxGeometry(7, 5, 1.4), toon(0xd7f0ff), 8, 11, 7.2, g);
    addMesh(new THREE.BoxGeometry(4, 3, 14.2), toon(0xf2d23a), 2, 6, 0, g);
    const wheel = new THREE.CylinderGeometry(2.4, 2.4, 2, 8);
    wheel.rotateX(Math.PI / 2);
    addMesh(wheel, toon(0x222222), -8, 2.4, 6, g);
    addMesh(wheel, toon(0x222222), 6, 2.4, 6, g);
    return g;
  }
  const mover = makeTruck();
  scene.add(mover);
  const parked = [];
  for (let i = 0; i < 4; i++) {
    const t = makeTruck();
    t.position.set(LAYOUT.park[i].x, 0, LAYOUT.park[i].y);
    t.rotation.y = -Math.PI / 5;
    scene.add(t);
    parked.push(t);
  }

  const placedRoot = new THREE.Group();
  scene.add(placedRoot);
  let placedKey = '';
  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(42, 16, 42),
    new THREE.MeshToonMaterial({ color: 0x7cff6b, transparent: true, opacity: 0.5, gradientMap: gradient }),
  );
  ghost.visible = false;
  ghost.position.y = 8;
  scene.add(ghost);

  function structure(kind) {
    const g = new THREE.Group();
    const colors = { warehouse: 0xd7d2c4, mill: 0xc47a3a, cheese: 0xf6d35a, bakery: 0xf2c14e, rail: 0xe07a32 };
    if (kind === 'rail') {
      addMesh(new THREE.BoxGeometry(36, 2.2, 16), toon(0xe07a32), 0, 1.2, 0, g);
      addMesh(new THREE.BoxGeometry(36, 1.4, 2.2), toon(0xd5dbe3), 0, 2.6, -4, g);
      addMesh(new THREE.BoxGeometry(36, 1.4, 2.2), toon(0xd5dbe3), 0, 2.6, 4, g);
      return g;
    }
    addMesh(new THREE.BoxGeometry(30, 18, 24), toon(colors[kind] || 0xdddddd), 0, 9, 0, g);
    const top = addMesh(new THREE.ConeGeometry(20, 12, 4), toon(kind === 'bakery' ? 0xd4533c : 0x2a9d92), 0, 22, 0, g);
    top.rotation.y = Math.PI / 4;
    return g;
  }

  const hand = new THREE.Group();
  const gloss = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.04,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
  });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(11, 18, 14), gloss);
  palm.scale.set(1.15, 0.78, 0.72);
  palm.castShadow = true;
  const finger = new THREE.Mesh(new THREE.CapsuleGeometry(4.2, 26, 4, 10), gloss);
  finger.position.set(4, 18, 10);
  finger.rotation.x = 0.55;
  finger.castShadow = true;
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 10), gloss);
  thumb.position.set(-10, 2, 6);
  thumb.scale.set(0.8, 1.1, 0.7);
  thumb.castShadow = true;
  hand.add(palm, finger, thumb);
  scene.add(hand);

  const signRoot = new THREE.Group();
  scene.add(signRoot);
  const signById = new Map();
  const padGeo = roundedPadGeometry(84, 52);

  function ensureSign(sign) {
    let node = signById.get(sign.buyId);
    if (!node) {
      node = new THREE.Group();
      const pad = new THREE.Mesh(padGeo, toon(0x24342c));
      pad.castShadow = true;
      pad.receiveShadow = true;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(70, 34),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.y = 6.4;
      node.add(pad, label);
      node.userData.labelMesh = label;
      node.userData.pad = pad;
      node.userData.text = '';
      if (sign.kind === 'plot') {
        const pts = [
          new THREE.Vector3(-48, 1.4, -30),
          new THREE.Vector3(48, 1.4, -30),
          new THREE.Vector3(48, 1.4, 30),
          new THREE.Vector3(-48, 1.4, 30),
        ];
        const line = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 3.5, gapSize: 2.2 }),
        );
        line.computeLineDistances();
        node.add(line);
      }
      signRoot.add(node);
      signById.set(sign.buyId, node);
    }
    if (node.userData.text !== sign.label) {
      const tex = priceTexture(sign.label);
      const mat = node.userData.labelMesh.material;
      if (mat.map) mat.map.dispose();
      mat.map = tex;
      mat.needsUpdate = true;
      node.userData.text = sign.label;
    }
    node.position.set(sign.x, 0, sign.y);
    const pulse = sign.hot ? 1 + Math.sin(performance.now() / 280) * 0.04 : 1;
    node.scale.set(pulse, 1, pulse);
    node.visible = true;
    return node;
  }

  function layoutPile(mesh, extra, origin, n, spread) {
    const shown = Math.min(MAX_PILE, Math.max(0, n));
    mesh.count = shown;
    if (extra) extra.count = shown;
    let left = shown;
    let row = 0;
    let index = 0;
    const base = shown <= 4 ? 2 : shown <= 10 ? 3 : 5;
    while (left > 0 && row < 8 && index < MAX_PILE) {
      const wide = Math.min(left, Math.max(1, base - Math.floor(row / 2)));
      for (let i = 0; i < wide && index < MAX_PILE; i++) {
        dummy.position.set(
          origin.x + (i - (wide - 1) / 2) * spread,
          row * spread * 0.72,
          origin.y + ((i + row) % 2) * 1.4,
        );
        dummy.rotation.set(0, (i + row) * 0.4, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (extra) extra.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
      left -= wide;
      row += 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (extra) extra.instanceMatrix.needsUpdate = true;
  }

  const animals = [
    { kind: 'rabbit', x: 260, z: 560, rx: 28, rz: 14, sp: 0.55, ph: 1, mesh: null },
    { kind: 'duck', x: 190, z: 900, rx: 18, rz: 6, sp: 0.7, ph: 0.4, mesh: null },
  ];
  function critter(color, scale) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), toon(color));
    body.scale.set(scale[0], scale[1], scale[2]);
    body.position.y = 6;
    body.castShadow = true;
    g.add(body);
    scene.add(g);
    return g;
  }
  animals[0].mesh = critter(0xf7f4ef, [1.2, 0.7, 0.8]);
  animals[1].mesh = critter(0xf2c14e, [1.3, 0.6, 0.8]);
  const cow = critter(0xfffaf2, [1.6, 0.85, 1]);

  let viewW = 1;
  let viewH = 1;
  let sized = '';
  let ratioCap = 3;
  let slowTime = 0;
  let camState = { x: LAYOUT.focus.x, y: LAYOUT.focus.y, z: 0.8 };

  function resize(w, h, dpr, dt) {
    if (dt && dt < 0.08) {
      if (dt > 1 / 45) slowTime += dt;
      else slowTime = Math.max(0, slowTime - dt);
      if (slowTime > 3 && ratioCap > 1) {
        ratioCap = Math.max(1, ratioCap - 0.5);
        slowTime = 0;
        sized = '';
      }
    }
    const ratio = Math.min(dpr || 1, ratioCap);
    const key = w + 'x' + h + '@' + ratio;
    if (key === sized) return;
    sized = key;
    viewW = w;
    viewH = h;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    if (fx) {
      fx.width = Math.max(1, Math.round(w * ratio));
      fx.height = Math.max(1, Math.round(h * ratio));
    }
  }

  function syncCamera() {
    const aspect = viewW / Math.max(1, viewH);
    const halfH = (viewH / camState.z) / 2;
    const halfW = halfH * aspect;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    const dist = 980;
    const tx = camState.x;
    const tz = camState.y;
    camera.position.set(
      tx + dist * Math.cos(ELEV) * Math.sin(AZIM),
      dist * Math.sin(ELEV),
      tz + dist * Math.cos(ELEV) * Math.cos(AZIM),
    );
    camera.lookAt(tx, 0, tz);
    camera.updateMatrixWorld();
    const span = Math.max(halfW, halfH) * 1.35;
    sun.position.set(tx + 220, 340, tz + 80);
    sun.target.position.set(tx, 0, tz);
    sun.target.updateMatrixWorld();
    const sc = sun.shadow.camera;
    sc.left = -span;
    sc.right = span;
    sc.top = span;
    sc.bottom = -span;
    sc.updateProjectionMatrix();
  }

  function project(x, y, lift, cam) {
    if (cam) camState = cam;
    syncCamera();
    proj.set(x, lift || 4, y);
    proj.project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (proj.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-proj.y * 0.5 + 0.5) * rect.height,
    };
  }

  function groundAt(clientX, clientY, cam) {
    if (cam) camState = cam;
    syncCamera();
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      return { x: camState.x, y: camState.y };
    }
    return { x: hitPoint.x, y: hitPoint.z };
  }

  function drawFx(env) {
    if (!fx) return;
    const ctx = fx.getContext('2d');
    const dpr = renderer.getPixelRatio();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    const rect = fx.getBoundingClientRect();
    const floats = env.floats || [];
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      const k = f.age / f.life;
      if (k >= 1) continue;
      const p = project(f.x, f.y, 18 + k * 20);
      ctx.globalAlpha = 1 - k;
      ctx.font = '800 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#14662a';
      ctx.fillStyle = '#fff6c2';
      const sx = p.x - rect.left;
      const sy = p.y - rect.top;
      ctx.strokeText(f.text, sx, sy);
      ctx.fillText(f.text, sx, sy);
    }
    const coins = env.coins || [];
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      const u = Math.max(0, Math.min(1, c.age / c.life));
      const ease = u * u * (3 - 2 * u);
      const x = (c.x + (c.tx - c.x) * ease) - rect.left;
      const y = (c.y + (c.ty - c.y) * ease - Math.sin(u * Math.PI) * 28) - rect.top;
      ctx.globalAlpha = 1 - u * 0.2;
      ctx.fillStyle = '#e2b423';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe56a';
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const bits = env.confetti || [];
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      const u = bit.age / bit.life;
      if (u >= 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.translate(bit.x - rect.left, bit.y - rect.top);
      ctx.rotate(bit.rot + bit.age * 5);
      ctx.fillStyle = bit.color;
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function draw(env) {
    const view = env.view;
    camState = env.cam;
    resize(env.w, env.h, env.dpr, env.dt || 0);
    syncCamera();
    if (view.rev !== railRev && view.poly) {
      rebuildRails(view.poly);
      railRev = view.rev;
    }
    const owned = {};
    for (let i = 0; i < view.buildings.length; i++) owned[view.buildings[i].id] = view.buildings[i];
    Object.keys(buildings).forEach((id) => {
      buildings[id].visible = !!owned[id];
      if (owned[id]) buildings[id].position.set(owned[id].x, 0, owned[id].y);
    });
    const seen = new Set();
    for (let i = 0; i < view.signs.length; i++) {
      seen.add(view.signs[i].buyId);
      ensureSign(view.signs[i]);
    }
    signById.forEach((node, id) => { node.visible = seen.has(id); });

    for (let i = 0; i < view.piles.length; i++) {
      const pile = view.piles[i];
      const shown = Math.min(MAX_PILE, pile.n <= 0 ? 0 : Math.min(MAX_PILE, pile.n * (pile.good === 'milk' ? 2 : 1)));
      if (pile.good === 'milk') layoutPile(piles.milk, piles.milkCap, pile, shown, 6.2);
      else if (piles[pile.good]) layoutPile(piles[pile.good], null, pile, shown, 5.4);
    }
    if (!view.piles.some((p) => p.good === 'milk')) {
      piles.milk.count = 0;
      piles.milkCap.count = 0;
    }

    while (parts.length < view.poses.length) {
      const part = makeTrainPart(false);
      part.userData.engine = false;
      train.add(part);
      parts.push(part);
    }
    for (let i = 0; i < parts.length; i++) {
      const pose = view.poses[i];
      parts[i].visible = !!pose;
      if (!pose) continue;
      if (parts[i].userData.engine !== !!pose.engine) {
        train.remove(parts[i]);
        parts[i] = makeTrainPart(!!pose.engine);
        parts[i].userData.engine = !!pose.engine;
        train.add(parts[i]);
      }
      parts[i].position.set(pose.x, 0, pose.y);
      parts[i].rotation.y = -pose.ang;
      parts[i].traverse((obj) => {
        if (obj.userData && obj.userData.wheel) obj.rotation.z = env.time * 8;
      });
    }

    for (let i = 0; i < parked.length; i++) {
      const ghost = i === view.trucks;
      parked[i].visible = i <= view.trucks;
      parked[i].traverse((obj) => {
        if (!obj.material || !obj.material.color) return;
        obj.material.opacity = ghost ? 0.38 : 1;
        obj.material.transparent = ghost;
      });
    }
    const drive = ((env.time * 42) % (LAYOUT.road.w + 80)) - 30;
    mover.position.set(LAYOUT.road.x + drive, 0, LAYOUT.road.y + 8);
    mover.rotation.y = Math.PI;

    const bob = Math.sin(env.time * 5) * 6;
    if (view.hand) {
      hand.visible = true;
      hand.position.set(view.hand.x + 28, 22 + bob * 0.2, view.hand.y + 18);
      hand.rotation.set(0.9, -0.6, 0.35);
      hand.scale.setScalar(1.7 + Math.sin(env.time * 5) * 0.05);
    } else hand.visible = false;

    cow.visible = !!owned.barn;
    cow.position.set(512 + Math.sin(env.time * 0.35) * 16, 0, 470 + Math.cos(env.time * 0.28) * 8);
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      a.mesh.position.set(
        a.x + Math.sin(env.time * a.sp + a.ph) * a.rx,
        0,
        a.z + Math.cos(env.time * a.sp * 0.8 + a.ph) * a.rz,
      );
    }

    Object.keys(buildings).forEach((id) => buildings[id].scale.set(1, 1, 1));
    const pops = env.pops || [];
    for (let i = 0; i < pops.length; i++) {
      const pop = pops[i];
      const node = buildings[pop.id];
      if (!node) continue;
      const u = pop.age / pop.life;
      const k = 1 + Math.sin(Math.min(1, u) * Math.PI) * 0.16;
      node.scale.set(k, k, k);
    }

    const placed = view.placed || [];
    const key = placed.map((p) => p.id + ':' + p.rot).join('|');
    if (key !== placedKey) {
      placedKey = key;
      while (placedRoot.children.length) placedRoot.remove(placedRoot.children[0]);
      for (let i = 0; i < placed.length; i++) {
        const item = structure(placed[i].kind);
        item.position.set(placed[i].x, 0, placed[i].y);
        item.rotation.y = (placed[i].rot || 0) * Math.PI / 2;
        placedRoot.add(item);
      }
    }
    if (env.ghost) {
      ghost.visible = true;
      ghost.position.set(env.ghost.x, 8, env.ghost.y);
      ghost.material.color.set(env.ghost.ok ? 0x7cff6b : 0xff5b4a);
      ghost.rotation.y = (env.ghost.rot || 0) * Math.PI / 2;
    } else ghost.visible = false;

    renderer.render(scene, camera);
    drawFx(env);
  }

  return { draw, project, groundAt, syncCamera, resize };
}
