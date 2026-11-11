import * as THREE from '../vendor/three.module.min.js';
import { LAYOUT, blocked } from './sim.js';

const ELEV = 40 * Math.PI / 180;
const AZIM = Math.PI / 4;
const GRASS = 0x6ed63a;

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
  g.fillStyle = '#6ED63A';
  g.fillRect(0, 0, 512, 512);
  const rnd = mulberry32(11);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = i % 2 ? 'rgba(20, 70, 16, 0.22)' : 'rgba(10, 50, 8, 0.16)';
    g.beginPath();
    g.ellipse(rnd() * 512, rnd() * 512, 16 + rnd() * 34, 8 + rnd() * 18, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 36; i++) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(rnd() * 512, rnd() * 512, 2.4 + rnd() * 2.2, 0, Math.PI * 2);
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
  g.roundRect(18, 68, 108, 124, 22);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = '900 64px ui-rounded, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$', 72, 132);
  g.font = '900 118px ui-rounded, sans-serif';
  g.fillText(String(label).replace('$', ''), 310, 136);
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
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.4,
    bevelSegments: 1,
    curveSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 1.2, 0);
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
  renderer.setClearColor(0x7ee044, 1);

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

  const roadDx = LAYOUT.road.x2 - LAYOUT.road.x;
  const roadDz = LAYOUT.road.y2 - LAYOUT.road.y;
  const roadLen = Math.hypot(roadDx, roadDz);
  const road = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 2.2, 36), toon(0xf3efe4));
  road.position.set((LAYOUT.road.x + LAYOUT.road.x2) / 2, 0.8, (LAYOUT.road.y + LAYOUT.road.y2) / 2);
  road.rotation.y = -Math.atan2(roadDz, roadDx);
  road.receiveShadow = true;
  scene.add(road);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 1.4, 7), toon(0xb7c0c8));
  curb.position.copy(road.position);
  curb.position.y = 1.3;
  curb.rotation.y = road.rotation.y;
  curb.translateZ(16);
  scene.add(curb);
  const sunPatch = new THREE.Mesh(
    new THREE.CircleGeometry(340, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe56a, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  sunPatch.rotation.x = -Math.PI / 2;
  sunPatch.position.set(560, 0.45, 390);
  scene.add(sunPatch);

  const pond = new THREE.Mesh(new THREE.CircleGeometry(36, 24), toon(0x6ec4ea));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(190, 0.25, 910);
  scene.add(pond);

  const trees = [
    { x: 400, y: 470, s: 1.55, pine: false, tint: 0.2 },
    { x: 430, y: 540, s: 1.35, pine: false, tint: 0.5 },
    { x: 760, y: 390, s: 1.4, pine: false, tint: 0.35 },
  ];
  const rnd = mulberry32(21);
  let guard = 0;
  while (trees.length < 52 && guard < 900) {
    guard += 1;
    const x = -180 + rnd() * 1900;
    const y = -160 + rnd() * 1400;
    const inside = x > 12 && y > 12 && x < LAYOUT.worldW - 12 && y < LAYOUT.worldH - 12;
    if (inside && blocked(x, y)) continue;
    if (x > 300 && x < 860 && y > 200 && y < 680) continue;
    if (x > 280 && x < 860 && y < 360) continue;
    trees.push({ x, y, s: 1.15 + rnd() * 0.55, pine: rnd() < 0.22, tint: rnd() });
  }

  const trunkGeo = new THREE.CylinderGeometry(3.6, 5, 18, 7);
  trunkGeo.translate(0, 9, 0);
  const puffGeo = new THREE.SphereGeometry(16, 14, 10);
  puffGeo.translate(0, 26, 0);
  const puff2 = new THREE.SphereGeometry(12, 12, 9);
  puff2.translate(-11, 30, 4);
  const puff3 = new THREE.SphereGeometry(11, 12, 9);
  puff3.translate(10, 28, -5);
  const puffDark = new THREE.SphereGeometry(13, 12, 8);
  puffDark.translate(0, 18, 1);
  const puffHi = new THREE.SphereGeometry(7.2, 10, 8);
  puffHi.translate(2, 38, 6);
  const pineGeo = new THREE.ConeGeometry(11, 28, 7);
  pineGeo.translate(0, 22, 0);
  const shadowGeo = new THREE.CircleGeometry(13, 12);
  shadowGeo.rotateX(-Math.PI / 2);
  shadowGeo.translate(0, 0.35, 0);

  const trunkMat = toon(0x8a5a34);
  const leafMat = toon(0x2fbe3e);
  const leafMat2 = toon(0xe7ff8a);
  const leafDark = toon(0x147a28);
  const pineMat = toon(0x1f7a3c);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x143014, transparent: true, opacity: 0.18, depthWrite: false });

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
  const leavesDark = instances(puffDark, leafDark, nTrees);
  const pines = instances(pineGeo, pineMat, nTrees);
  const shades = instances(shadowGeo, shadowMat, nTrees);
  trunks.castShadow = false;
  leavesA.castShadow = false;
  leavesB.castShadow = false;
  leavesC.castShadow = false;
  leavesHi.castShadow = false;
  leavesDark.castShadow = false;
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
      leavesDark.setMatrixAt(i, dummy.matrix);
    } else {
      leavesA.setMatrixAt(i, dummy.matrix);
      leavesB.setMatrixAt(i, dummy.matrix);
      leavesC.setMatrixAt(i, dummy.matrix);
      leavesHi.setMatrixAt(i, dummy.matrix);
      leavesDark.setMatrixAt(i, dummy.matrix);
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
  leavesDark.instanceMatrix.needsUpdate = true;
  pines.instanceMatrix.needsUpdate = true;
  shades.instanceMatrix.needsUpdate = true;

  const flowerGeo = new THREE.SphereGeometry(3.6, 8, 6);
  flowerGeo.translate(0, 3.2, 0);
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
  const bushGeo = new THREE.SphereGeometry(7, 10, 8);
  bushGeo.scale(1.15, 0.62, 1.05);
  bushGeo.translate(0, 5, 0);
  const bushes = instances(bushGeo, toon(0x1f9a34), 16);
  bushes.castShadow = false;
  const bushAt = [
    [440, 430], [680, 400], [400, 520], [740, 500],
  ];
  for (let i = 0; i < bushAt.length; i++) {
    dummy.position.set(bushAt[i][0], 0, bushAt[i][1]);
    dummy.rotation.set(0, i, 0);
    dummy.scale.set(0.8 + (i % 3) * 0.25, 0.8 + (i % 2) * 0.2, 0.85);
    dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
  }
  bushes.count = bushAt.length;
  bushes.instanceMatrix.needsUpdate = true;
  const bushShade = instances(shadowGeo, shadowMat, bushAt.length);
  for (let i = 0; i < bushAt.length; i++) {
    dummy.position.set(bushAt[i][0], 0, bushAt[i][1]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1.1, 1, 0.8);
    dummy.updateMatrix();
    bushShade.setMatrixAt(i, dummy.matrix);
  }
  bushShade.instanceMatrix.needsUpdate = true;

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

  function blobShadow(x, z, rx, rz) {
    const blob = new THREE.Mesh(shadowGeo, shadowMat);
    blob.position.set(x, 0.2, z);
    blob.scale.set(rx, 1, rz);
    blob.castShadow = false;
    blob.receiveShadow = false;
    scene.add(blob);
    return blob;
  }

  function shellPass(root, amount) {
    const meshes = [];
    root.traverse((obj) => {
      if (obj.isMesh && !obj.userData.shell) meshes.push(obj);
    });
    for (let i = 0; i < meshes.length; i++) {
      const shell = new THREE.Mesh(
        meshes[i].geometry,
        new THREE.MeshBasicMaterial({ color: 0x163018, side: THREE.BackSide }),
      );
      shell.scale.setScalar(amount || 1.06);
      shell.userData.shell = true;
      shell.castShadow = false;
      shell.receiveShadow = false;
      meshes[i].add(shell);
    }
  }

  function dashedLoop(x, z, w, h) {
    const dash = 14;
    const gap = 8;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    function edge(x0, z0, x1, z1) {
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const ang = Math.atan2(z1 - z0, x1 - x0);
      const steps = Math.floor(len / (dash + gap));
      for (let i = 0; i < steps; i++) {
        const t = (i * (dash + gap) + dash / 2) / len;
        const piece = new THREE.Mesh(new THREE.BoxGeometry(dash, 1.2, 3.2), mat);
        piece.position.set(x0 + (x1 - x0) * t, 0.8, z0 + (z1 - z0) * t);
        piece.renderOrder = 0;
        piece.rotation.y = -ang;
        scene.add(piece);
      }
    }
    edge(x, z, x + w, z);
    edge(x + w, z, x + w, z + h);
    edge(x + w, z + h, x, z + h);
    edge(x, z + h, x, z);
  }

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
  addMesh(new THREE.BoxGeometry(4, 2.4, 48), toon(0xfffaf2), 0, 54.6, 0, barn);
  addMesh(new THREE.BoxGeometry(64, 2.2, 3), toon(0xfffaf2), 0, 33.4, 23, barn);
  addMesh(new THREE.BoxGeometry(64, 2.2, 3), toon(0xfffaf2), 0, 33.4, -23, barn);
  for (let i = 1; i <= 3; i++) {
    const xL = -4 - i * 7;
    const yL = 35.2 + (30 + xL) * (20 / 30);
    const left = addMesh(new THREE.BoxGeometry(4.2, 0.55, 46), toon(i % 2 ? 0x12867a : 0x0e6e64), xL, yL, 0, barn);
    left.rotation.z = 0.588;
    const xR = 4 + i * 7;
    const yR = 35.2 + (30 - xR) * (20 / 30);
    const right = addMesh(new THREE.BoxGeometry(4.2, 0.55, 46), toon(i % 2 ? 0x12867a : 0x0e6e64), xR, yR, 0, barn);
    right.rotation.z = -0.588;
  }
  addMesh(new THREE.BoxGeometry(18, 22, 1.4), toon(0xfffaf2), 0, 12, 21.2, barn);
  addMesh(new THREE.BoxGeometry(14, 18, 1.2), toon(0xc62828), 0, 11, 22.2, barn);
  const x1 = addMesh(new THREE.BoxGeometry(16, 2.4, 1.4), toon(0xffffff), 0, 12, 23.2, barn);
  x1.rotation.z = 0.78;
  const x2 = addMesh(new THREE.BoxGeometry(16, 2.4, 1.4), toon(0xffffff), 0, 12, 23.5, barn);
  x2.rotation.z = -0.78;
  addMesh(new THREE.BoxGeometry(8, 8, 2), toon(0x1b1b1b), 0, 40, 8, barn);
  addMesh(new THREE.BoxGeometry(5, 5, 1.5), toon(0xffe7a0), 0, 40, 9.2, barn);
  shellPass(barn, 1.055);
  barn.userData.baseScale = 1.16;
  barn.scale.setScalar(1.16);
  placeBuilding('barn', 555, 392, barn);
  blobShadow(555, 392, 2.4, 1.7);
  dashedLoop(LAYOUT.fence.x - 10, LAYOUT.fence.y - 10, LAYOUT.fence.w + 20, LAYOUT.fence.h + 20);

  const market = new THREE.Group();
  addMesh(new THREE.BoxGeometry(52, 22, 28), toon(0xc47a3a), 0, 11, 0, market);
  for (let i = 0; i < 6; i++) {
    const stripe = addMesh(new THREE.BoxGeometry(8, 2, 30), toon(i % 2 ? 0xf4f7f2 : 0x3aaa55), -22 + i * 9, 24, 0, market);
    stripe.rotation.z = -0.35;
  }
  shellPass(market, 1.05);
  placeBuilding('market', LAYOUT.market.x, LAYOUT.market.y, market);
  blobShadow(LAYOUT.market.x, LAYOUT.market.y, 1.8, 1.2);

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
  const bottle = new THREE.CapsuleGeometry(2.5, 7.6, 4, 10);
  bottle.translate(0, 6.4, 0);
  const band = new THREE.CylinderGeometry(2.7, 2.7, 2.6, 10);
  band.translate(0, 6.6, 0);
  const cap = new THREE.CylinderGeometry(1.55, 1.55, 2.2, 10);
  cap.translate(0, 11.4, 0);
  const piles = {
    milk: pileMesh(bottle, 0xf7fbff),
    milkBand: pileMesh(band, 0x2f7de1),
    milkCap: pileMesh(cap, 0x1d4eaa),
    eggs: pileMesh(new THREE.SphereGeometry(2.8, 8, 6), 0xfff6e4),
    wheat: pileMesh(new THREE.BoxGeometry(5, 4, 4), 0xf0c14a),
    wool: pileMesh(new THREE.SphereGeometry(3.2, 8, 6), 0xffffff),
    apples: pileMesh(new THREE.SphereGeometry(2.8, 8, 6), 0xe23b3b),
    honey: pileMesh(new THREE.CylinderGeometry(2.2, 2.4, 5, 8), 0xf0b429),
    cream: pileMesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 8), 0xf4f7fb),
    blooms: pileMesh(new THREE.SphereGeometry(2.6, 7, 5), 0xff8eb8),
  };

  const sleeperGeo = new THREE.BoxGeometry(14, 4.6, 36);
  const railGeo = new THREE.BoxGeometry(20, 2.8, 5.2);
  const railHiGeo = new THREE.BoxGeometry(20, 0.9, 2.6);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, toon(0xd26522), 700);
  const rails = new THREE.InstancedMesh(railGeo, toon(0x8e99a6), 1400);
  const railHi = new THREE.InstancedMesh(railHiGeo, toon(0xf7fbff), 1400);
  sleepers.castShadow = true;
  sleepers.receiveShadow = true;
  rails.castShadow = true;
  rails.receiveShadow = true;
  railHi.castShadow = false;
  railHi.receiveShadow = true;
  scene.add(sleepers, rails, railHi);
  let railRev = -1;

  function rebuildRails(poly) {
    const length = poly.length;
    let sCount = 0;
    let rCount = 0;
    for (let d = 0; d < length && sCount < 680; d += 18) {
      const p = sampleAlong(poly, d);
      dummy.position.set(p.x, 2.2, p.y);
      dummy.rotation.set(0, -p.ang, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sleepers.setMatrixAt(sCount, dummy.matrix);
      sCount += 1;
      for (const side of [-10.5, 10.5]) {
        const rx = p.x + Math.cos(p.ang + Math.PI / 2) * side;
        const rz = p.y + Math.sin(p.ang + Math.PI / 2) * side;
        dummy.position.set(rx, 5.2, rz);
        dummy.rotation.set(0, -p.ang, 0);
        dummy.updateMatrix();
        if (rCount < 1400) rails.setMatrixAt(rCount, dummy.matrix);
        dummy.position.set(rx, 6.8, rz);
        dummy.updateMatrix();
        if (rCount < 1400) railHi.setMatrixAt(rCount, dummy.matrix);
        rCount += 1;
      }
    }
    sleepers.count = sCount;
    rails.count = rCount;
    railHi.count = rCount;
    sleepers.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    railHi.instanceMatrix.needsUpdate = true;
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
    g.scale.setScalar(1.62);
    shellPass(g, 1.045);
    return g;
  }
  const train = new THREE.Group();
  scene.add(train);
  const parts = [];
  const trainShades = [];
  for (let i = 0; i < 6; i++) trainShades.push(blobShadow(0, 0, 1.3, 0.7));

  function makeTruck() {
    const g = new THREE.Group();
    addMesh(new THREE.BoxGeometry(20, 7, 14), toon(0xc47a3a), -7, 7, 0, g);
    addMesh(new THREE.BoxGeometry(20, 1.6, 14.8), toon(0x8a4e22), -7, 11, 0, g);
    addMesh(new THREE.BoxGeometry(12, 11, 14), toon(0xe23b3b), 10, 9.5, 0, g);
    addMesh(new THREE.BoxGeometry(9, 5, 1.1), toon(0xd7f4ff), 10, 12, 7.4, g);
    addMesh(new THREE.BoxGeometry(9, 5, 1.1), toon(0xd7f4ff), 10, 12, -7.4, g);
    addMesh(new THREE.BoxGeometry(1.1, 5, 10), toon(0xd7f4ff), 16.2, 12, 0, g);
    const wheel = new THREE.CylinderGeometry(2.8, 2.8, 2.2, 12);
    wheel.rotateX(Math.PI / 2);
    for (const wx of [-12, 8]) {
      addMesh(wheel, toon(0x222222), wx, 2.8, 8, g);
      addMesh(wheel, toon(0x222222), wx, 2.8, -8, g);
    }
    g.scale.setScalar(1.35);
    shellPass(g, 1.035);
    return g;
  }
  const mover = makeTruck();
  scene.add(mover);
  const parked = [];
  for (let i = 0; i < 4; i++) {
    const t = makeTruck();
    t.position.set(LAYOUT.park[i].x, 0, LAYOUT.park[i].y);
    t.rotation.y = -Math.atan2(LAYOUT.road.y2 - LAYOUT.road.y, LAYOUT.road.x2 - LAYOUT.road.x);
    scene.add(t);
    parked.push(t);
    blobShadow(LAYOUT.park[i].x, LAYOUT.park[i].y, 1.5, 0.9);
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

  function gloveTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = '#214018';
    g.lineWidth = 12;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(108, 78, 58, 46, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(52, 96, 20, 30, -0.7, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(148, 70, 38, 130, 18);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(167, 214, 22, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const hand = new THREE.Sprite(new THREE.SpriteMaterial({
    map: gloveTexture(),
    transparent: true,
    depthWrite: false,
  }));
  hand.center.set(0.65, 0.16);
  hand.material.rotation = 0.15;
  hand.renderOrder = 6;
  scene.add(hand);

  const signRoot = new THREE.Group();
  scene.add(signRoot);
  const signById = new Map();
  const padGeo = roundedPadGeometry(70, 42);

  function ensureSign(sign) {
    let node = signById.get(sign.buyId);
    if (!node) {
      node = new THREE.Group();
      const pad = new THREE.Mesh(padGeo, toon(0x142018));
      pad.castShadow = true;
      pad.receiveShadow = true;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(64, 34),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.y = 4.6;
      node.add(pad, label);
      node.userData.labelMesh = label;
      node.userData.pad = pad;
      node.userData.text = '';
      pad.renderOrder = 3;
      label.renderOrder = 4;
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
    const base = shown > 16 ? 5 : shown > 8 ? 4 : 3;
    while (left > 0 && row < 9 && index < MAX_PILE) {
      const wide = Math.min(left, Math.max(1, base - row));
      for (let i = 0; i < wide && index < MAX_PILE; i++) {
        dummy.position.set(
          origin.x + (i - (wide - 1) / 2) * spread,
          row * 8.4,
          origin.y,
        );
        dummy.rotation.set(0, 0, 0);
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
      const shown = pile.n <= 0 ? 0 : Math.min(MAX_PILE, pile.good === 'milk' ? pile.n * 2 : pile.n);
      if (pile.good === 'milk') {
        layoutPile(piles.milk, null, pile, shown, 7.4);
        layoutPile(piles.milkBand, null, pile, shown, 7.4);
        layoutPile(piles.milkCap, null, pile, shown, 7.4);
      }
      else if (piles[pile.good]) layoutPile(piles[pile.good], null, pile, shown, 5.4);
    }
    if (!view.piles.some((p) => p.good === 'milk')) {
      piles.milk.count = 0;
      piles.milkBand.count = 0;
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
      if (trainShades[i]) trainShades[i].visible = !!pose;
      if (!pose) continue;
      if (parts[i].userData.engine !== !!pose.engine) {
        train.remove(parts[i]);
        parts[i] = makeTrainPart(!!pose.engine);
        parts[i].userData.engine = !!pose.engine;
        train.add(parts[i]);
      }
      parts[i].position.set(pose.x, 0, pose.y);
      parts[i].rotation.y = -pose.ang;
      if (trainShades[i]) {
        trainShades[i].visible = true;
        trainShades[i].position.set(pose.x, 0.3, pose.y);
      }
      parts[i].traverse((obj) => {
        if (obj.userData && obj.userData.wheel) obj.rotation.z = env.time * 8;
      });
    }

    for (let i = 0; i < parked.length; i++) {
      const scenery = i < 2;
      const ghost = !scenery && i === view.trucks;
      parked[i].visible = scenery || i <= view.trucks;
      parked[i].traverse((obj) => {
        if (!obj.material || !obj.material.color) return;
        obj.material.opacity = ghost ? 0.38 : 1;
        obj.material.transparent = ghost;
      });
    }
    mover.visible = view.trucks > 0;
    if (mover.visible) {
      const span = Math.hypot(LAYOUT.road.x2 - LAYOUT.road.x, LAYOUT.road.y2 - LAYOUT.road.y) || 1;
      const u = ((env.time * 36) % span) / span;
      mover.position.set(
        LAYOUT.road.x + (LAYOUT.road.x2 - LAYOUT.road.x) * u,
        0,
        LAYOUT.road.y + (LAYOUT.road.y2 - LAYOUT.road.y) * u,
      );
      mover.rotation.y = -Math.atan2(LAYOUT.road.y2 - LAYOUT.road.y, LAYOUT.road.x2 - LAYOUT.road.x);
    }

    const bob = Math.sin(env.time * 5) * 6;
    if (view.hand) {
      hand.visible = true;
      const pulse = 74 + Math.sin(env.time * 5) * 8;
      hand.position.set(view.hand.x + 4, 40, view.hand.y - 26);
      hand.scale.set(pulse, pulse, 1);
    } else hand.visible = false;

    cow.visible = !!owned.barn;
    cow.position.set(530 + Math.sin(env.time * 0.35) * 10, 0, 360 + Math.cos(env.time * 0.28) * 6);
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      a.mesh.position.set(
        a.x + Math.sin(env.time * a.sp + a.ph) * a.rx,
        0,
        a.z + Math.cos(env.time * a.sp * 0.8 + a.ph) * a.rz,
      );
    }

    Object.keys(buildings).forEach((id) => {
      const base = buildings[id].userData.baseScale || 1;
      buildings[id].scale.set(base, base, base);
    });
    const pops = env.pops || [];
    for (let i = 0; i < pops.length; i++) {
      const pop = pops[i];
      const node = buildings[pop.id];
      if (!node) continue;
      const u = pop.age / pop.life;
      const base = node.userData.baseScale || 1;
      const k = base * (1 + Math.sin(Math.min(1, u) * Math.PI) * 0.16);
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
