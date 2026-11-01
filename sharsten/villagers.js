/**
 * Villager rig using Gurut's part list and sizes
 * (godot-shooter/scripts/visuals/humanoid_factory.gd): pelvis, torso, vest,
 * sash, thighs, shins, shoes, upper arms, forearms, head, headwrap.
 * A face, hands, and Kurdish clothes sit on that rig. Animation is procedural.
 */
import * as THREE from './vendor/three.module.min.js';

const geos = new Map();
const mats = new Map();

function box(w, h, d) {
  const key = `${w}x${h}x${d}`;
  if (!geos.has(key)) geos.set(key, new THREE.BoxGeometry(w, h, d));
  return geos.get(key);
}
function ball(r) {
  const key = `s${r}`;
  if (!geos.has(key)) geos.set(key, new THREE.SphereGeometry(r, 14, 10));
  return geos.get(key);
}
function mat(hex, rough = 0.72) {
  const key = `${hex}:${rough}`;
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.02 }));
  }
  return mats.get(key);
}
function piece(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const SASHES = [0x8b1e2d, 0x1f6b4a, 0xc47a3a, 0x2f4f8a, 0x6b3a8a];
const DRESSES = [0xc44848, 0xd45a78, 0x3d8f8a, 0xc47a3a, 0x2f6a8a];
const KEYS = ['drop', 'torso', 'torsoY', 'hipL', 'hipR', 'shinL', 'shinR', 'armL', 'armR', 'elbL', 'elbR', 'head', 'headY'];

export function createVillagerRig(kind, salt = 0) {
  const root = new THREE.Group();
  root.scale.setScalar(kind === 'child' ? 0.5 : 0.68);
  const body = new THREE.Group();
  root.add(body);
  const skin = mat(0x8c5a42, 0.62);
  const shoe = mat(0x1a120e, 0.7);
  const cloth = mat(kind === 'mullah' ? 0xf4efe4 : kind === 'woman' ? DRESSES[salt % DRESSES.length] : 0x4a4034, 0.78);
  const shirt = mat(kind === 'mullah' ? 0xf7f1e4 : kind === 'woman' ? DRESSES[salt % DRESSES.length] : 0xc2a078, 0.74);
  const vest = mat(kind === 'woman' ? 0x6b3038 : 0x3a2a22, 0.8);
  const sash = mat(kind === 'mullah' ? 0x6b2a2a : SASHES[salt % SASHES.length], 0.7);
  const wrap = mat(kind === 'mullah' ? 0xf7f4ee : kind === 'woman' ? 0xf4efe6 : 0xd8c4a4, 0.8);
  const robe = mat(0x241c18, 0.82);

  const hips = [new THREE.Group(), new THREE.Group()];
  const shins = [new THREE.Group(), new THREE.Group()];
  [-0.15, 0.15].forEach((x, i) => {
    hips[i].position.set(x, 0.95, 0);
    body.add(hips[i]);
    piece(hips[i], box(0.26, 0.42, 0.28), cloth, 0, -0.21, 0);
    shins[i].position.set(0, -0.42, 0);
    hips[i].add(shins[i]);
    piece(shins[i], box(0.15, 0.36, 0.16), cloth, 0, -0.18, 0.01);
    piece(shins[i], box(0.16, 0.08, 0.28), shoe, 0, -0.38, 0.06);
  });

  const torso = new THREE.Group();
  torso.position.y = 1.02;
  body.add(torso);
  piece(torso, box(0.36, 0.2, 0.22), cloth, 0, -0.02, 0);
  piece(torso, box(0.4, 0.44, 0.24), shirt, 0, 0.26, 0);
  if (kind === 'mullah') {
    piece(torso, box(0.52, 0.78, 0.32), robe, 0, 0.12, 0.02);
    piece(torso, box(0.28, 0.36, 0.08), shirt, 0, 0.28, -0.14);
  } else if (kind === 'woman') {
    piece(torso, box(0.5, 0.82, 0.3), shirt, 0, 0.02, 0);
    piece(torso, box(0.34, 0.16, 0.08), vest, 0, 0.34, -0.12);
  } else {
    piece(torso, box(0.44, 0.34, 0.12), vest, 0, 0.3, -0.1);
    piece(torso, box(0.4, 0.28, 0.06), vest, 0, 0.28, 0.12);
  }
  const sashMesh = piece(torso, box(0.48, 0.08, 0.28), sash, 0, 0.02, 0);
  sashMesh.rotation.z = kind === 'woman' ? -0.12 : 0.18;

  const head = new THREE.Group();
  head.position.set(0, 0.58, 0);
  torso.add(head);
  piece(head, box(0.14, 0.08, 0.12), skin, 0, -0.08, 0);
  piece(head, ball(0.16), skin, 0, 0.06, 0);
  const eye = mat(0x1a120e, 0.35);
  piece(head, ball(0.028), eye, -0.055, 0.08, -0.13, false);
  piece(head, ball(0.028), eye, 0.055, 0.08, -0.13, false);
  piece(head, box(0.05, 0.012, 0.02), mat(0x2a2118, 0.7), -0.055, 0.11, -0.145, false);
  piece(head, box(0.05, 0.012, 0.02), mat(0x2a2118, 0.7), 0.055, 0.11, -0.145, false);
  piece(head, box(0.04, 0.05, 0.05), mat(0xe0b090, 0.6), 0, 0.04, -0.14, false);
  piece(head, box(0.07, 0.015, 0.02), mat(0x6b3030, 0.55), 0, -0.01, -0.145, false);
  if (kind === 'mullah') {
    piece(head, ball(0.175), wrap, 0, 0.12, 0.01);
    piece(head, box(0.08, 0.34, 0.05), wrap, 0.1, -0.08, 0.08);
    piece(head, box(0.14, 0.1, 0.06), mat(0xd8d8d8, 0.85), 0, -0.02, -0.12);
  } else if (kind === 'woman') {
    piece(head, ball(0.185), wrap, 0, 0.08, 0);
    piece(head, box(0.1, 0.46, 0.04), wrap, 0, -0.18, 0.06);
  } else {
    piece(head, ball(0.175), wrap, 0, 0.12, 0.01);
    piece(head, box(0.08, 0.38, 0.05), wrap, 0.12, -0.1, 0.08);
  }

  const shoulders = [new THREE.Group(), new THREE.Group()];
  const elbows = [new THREE.Group(), new THREE.Group()];
  [-0.3, 0.3].forEach((x, i) => {
    shoulders[i].position.set(x, 0.38, 0);
    torso.add(shoulders[i]);
    piece(shoulders[i], box(0.12, 0.28, 0.12), shirt, 0, -0.14, 0);
    elbows[i].position.set(0, -0.28, 0);
    shoulders[i].add(elbows[i]);
    piece(elbows[i], box(0.1, 0.24, 0.1), skin, 0, -0.12, 0);
    piece(elbows[i], box(0.1, 0.08, 0.08), skin, 0, -0.26, 0, false);
  });
  if (kind === 'mullah') {
    for (let b = 0; b < 5; b += 1) {
      piece(elbows[0], ball(0.02), mat(0x1f6b4a, 0.4), 0.04, -0.16 - b * 0.035, 0.02, false);
    }
  }

  const staff = piece(elbows[1], box(0.04, 0.9, 0.04), mat(0x6b4226, 0.8), 0.08, -0.2, 0.04);
  const axe = piece(elbows[1], box(0.05, 0.46, 0.05), mat(0x8a5a32, 0.75), 0, -0.16, 0.02);
  const hoe = piece(elbows[1], box(0.05, 0.5, 0.05), mat(0x6b4226, 0.8), 0, -0.12, 0);
  const sack = piece(elbows[0], box(0.16, 0.14, 0.14), mat(0xc4a574, 0.85), 0, -0.2, 0.06);
  staff.visible = false;
  axe.visible = false;
  hoe.visible = false;
  sack.visible = false;

  return { root, kind, body, hips, shins, shoulders, elbows, head, torso, staff, axe, hoe, sack, lock: [null, null] };
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function solveLeg(hip, shin, ty, tz) {
  const L1 = 0.42;
  const L2 = 0.4;
  const dy = ty - 0.95;
  const dz = tz;
  let dist = Math.hypot(dy, dz);
  dist = clamp(dist, 0.12, L1 + L2 - 0.02);
  const knee = Math.acos(clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1));
  const bend = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  const at = Math.atan2(dz, -dy);
  hip.rotation.x = at - bend;
  shin.rotation.x = -(Math.PI - knee);
}

function rootDelta(rig) {
  const root = rig.root;
  const dx = root.position.x - (rig._wx ?? root.position.x);
  const dz = root.position.z - (rig._wz ?? root.position.z);
  rig._wx = root.position.x;
  rig._wz = root.position.z;
  const yaw = root.rotation.y;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

function plantFeet(rig, o) {
  const delta = rootDelta(rig);
  const stride = o.action === 'run' ? 0.3 : 0.22;
  const freq = o.action === 'run' ? 10 : 7.2;
  const phase = (o.time || 0) * freq + (o.seed || 0);
  [-0.15, 0.15].forEach((sx, i) => {
    const s = Math.sin(phase + i * Math.PI);
    if (s > 0) {
      rig.lock[i] = null;
      const lift = 0.06 + s * 0.14;
      solveLeg(rig.hips[i], rig.shins[i], lift, -stride * s);
      return;
    }
    if (!rig.lock[i]) rig.lock[i] = { x: sx, z: -stride * 0.15 };
    rig.lock[i].x -= delta.x;
    rig.lock[i].z -= delta.z;
    rig.lock[i].z = clamp(rig.lock[i].z, -stride, stride * 1.4);
    solveLeg(rig.hips[i], rig.shins[i], 0.06, rig.lock[i].z);
  });
}

const STILL = {
  idle: { drop: 0, torso: 0, armL: 0.12, armR: 0.12, elbL: -0.28, elbR: -0.28 },
  hoe: { drop: 0.02, torso: -0.55, armL: -0.2, armR: -1.15, elbL: -0.3, elbR: -0.7, hipL: 0.2, hipR: -0.15 },
  bake: { drop: 0, torso: -0.25, armL: -0.9, armR: -0.9, elbL: -1.2, elbR: -1.1 },
  carry: { drop: 0, torso: -0.08, armL: -0.7, armR: -0.7, elbL: -1.15, elbR: -1.15 },
  wave: { armL: -2.4, elbL: -0.3, armR: 0.15, elbR: -0.25, headY: -0.2 },
  talk: { armL: 0.1, armR: -0.85, elbR: -1.1, headY: 0.25 },
  quarrel: { torsoY: 0.2, armL: -1.7, armR: -1.5, elbL: -0.4, elbR: -0.5, head: -0.1 },
  chop: { torso: -0.25, armR: -1.6, elbR: -0.9, armL: 0.2 },
  qiyam: { armL: -0.75, armR: -0.75, elbL: -1.2, elbR: -1.2, head: 0.05 },
  ruku: { torso: -1.15, armL: -0.4, armR: -0.4, elbL: -0.2, elbR: -0.2 },
  rise: { armL: -0.1, armR: -0.1, elbL: -0.15, elbR: -0.15 },
  sujud: { drop: -0.42, torso: -1.25, hipL: 1.35, hipR: 1.35, shinL: -1.45, shinR: -1.45, armL: -0.7, armR: -0.7, head: -0.35 },
  sit: { drop: -0.36, torso: -0.15, hipL: 1.25, hipR: 1.25, shinL: -1.6, shinR: -1.6, armL: -0.45, armR: -0.45, elbL: -1.3, elbR: -1.3, head: 0.1 },
  salamR: { drop: -0.36, torso: -0.12, hipL: 1.25, hipR: 1.25, shinL: -1.6, shinR: -1.6, headY: -0.7 },
  salamL: { drop: -0.36, torso: -0.12, hipL: 1.25, hipR: 1.25, shinL: -1.6, shinR: -1.6, headY: 0.7 },
};

function sample(action, o) {
  const t = o.time || 0;
  const seed = o.seed || 0;
  const base = { ...(STILL[action] || STILL.idle) };
  if (action === 'idle') {
    base.drop = Math.sin(t * 1.6 + seed) * 0.015;
    base.head = Math.sin(t * 0.7 + seed) * 0.04;
  } else if (action === 'walk' || action === 'run') {
    const f = action === 'run' ? 10.5 : 7.2;
    const a = action === 'run' ? 0.9 : 0.65;
    const s = Math.sin(t * f + seed);
    base.drop = Math.abs(Math.cos(t * f + seed)) * (action === 'run' ? 0.05 : 0.035);
    base.torso = action === 'run' ? 0.12 : 0.06;
    base.armL = -s * 0.75;
    base.armR = s * 0.75;
    base.elbL = -0.35;
    base.elbR = -0.35;
    base.hipL = s * a;
    base.hipR = -s * a;
    base.shinL = Math.max(0, -s) * 0.85;
    base.shinR = Math.max(0, s) * 0.85;
  } else if (action === 'chop' || action === 'hoe') {
    const s = Math.sin(t * 5.5 + seed);
    base.armR = -1.15 + s * 0.85;
    base.torso = -0.2 + s * 0.25;
  } else if (action === 'bake') {
    const s = Math.sin(t * 4 + seed);
    base.armL = -0.85 + s * 0.25;
    base.armR = -0.85 - s * 0.25;
  } else if (action === 'talk') {
    base.armR = -0.7 + Math.sin(t * 3 + seed) * 0.25;
    base.headY = Math.sin(t * 1.4 + seed) * 0.2;
  } else if (action === 'quarrel') {
    base.torsoY = Math.sin(t * 2.2 + seed) * 0.18;
    base.armL = -1.55 + Math.sin(t * 3) * 0.15;
  }
  if (o.tool === 'staff' && (action === 'walk' || action === 'idle' || action === 'run')) {
    base.armR = -0.35;
    base.elbR = -0.15;
  }
  return base;
}

function applyPose(rig, p) {
  rig.body.position.y = p.drop || 0;
  rig.torso.rotation.x = p.torso || 0;
  rig.torso.rotation.y = p.torsoY || 0;
  rig.hips[0].rotation.x = p.hipL || 0;
  rig.hips[1].rotation.x = p.hipR || 0;
  rig.shins[0].rotation.x = p.shinL || 0;
  rig.shins[1].rotation.x = p.shinR || 0;
  rig.shoulders[0].rotation.x = p.armL || 0;
  rig.shoulders[1].rotation.x = p.armR || 0;
  rig.elbows[0].rotation.x = p.elbL || 0;
  rig.elbows[1].rotation.x = p.elbR || 0;
  rig.head.rotation.x = p.head || 0;
  rig.head.rotation.y = p.headY || 0;
}

export function poseVillager(rig, o) {
  const action = o.action || 'idle';
  const target = sample(action, o);
  if (!rig._pose) rig._pose = { ...target };
  const gait = action === 'walk' || action === 'run';
  const k = gait ? 0.62 : 0.18;
  KEYS.forEach((key) => {
    const next = target[key] || 0;
    rig._pose[key] = (rig._pose[key] || 0) + (next - (rig._pose[key] || 0)) * k;
  });
  applyPose(rig, rig._pose);
  if (gait) plantFeet(rig, o);
  else rig.lock = [null, null];
  rig.staff.visible = o.tool === 'staff';
  rig.axe.visible = o.tool === 'axe';
  rig.hoe.visible = o.tool === 'hoe';
  rig.sack.visible = o.tool === 'sack';
}

export function posePrayer(rig, name) {
  poseVillager(rig, { action: name, time: 0, seed: 0, tool: '' });
}
