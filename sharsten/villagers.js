/**
 * Villager rig scaled from Gurut's humanoid (godot-shooter/scripts/visuals/humanoid_factory.gd).
 * Same proportions: pelvis, torso, thighs, shins, shoes, upper arms, forearms, head and headwrap.
 * Face, hands and jointed walk are added on that rig. Clothes are Kurdish, not Gurut's own shirt.
 */
import * as THREE from './vendor/three.module.min.js';

const geos = new Map();
const mats = new Map();

function box(w, h, d) {
  const key = `${w}x${h}x${d}`;
  if (!geos.has(key)) geos.set(key, new THREE.BoxGeometry(w, h, d));
  return geos.get(key);
}
function ball(r, seg = 12) {
  const key = `s${r}-${seg}`;
  if (!geos.has(key)) geos.set(key, new THREE.SphereGeometry(r, seg, Math.max(8, seg - 2)));
  return geos.get(key);
}
function mat(hex, rough = 0.72) {
  const key = `${hex}:${rough}`;
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.02 }));
  }
  return mats.get(key);
}
function mesh(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const SASHES = [0x8b1e2d, 0x1f6b4a, 0xc47a3a, 0x2f4f8a, 0x6b3a8a];
const DRESSES = [0xc44848, 0xd45a78, 0x3d8f8a, 0xc47a3a, 0x2f6a8a];

export function createVillagerRig(kind, salt = 0) {
  const root = new THREE.Group();
  root.scale.setScalar(kind === 'child' ? 0.48 : 0.62);
  const body = new THREE.Group();
  root.add(body);
  const skin = mat(0x8c664e, 0.62);
  const shoe = mat(0x1f1814, 0.7);
  const sash = mat(kind === 'mullah' ? 0x6b2a2a : SASHES[salt % SASHES.length], 0.7);
  const cloth = mat(kind === 'mullah' ? 0xf3efe6 : kind === 'woman' ? DRESSES[salt % DRESSES.length] : 0x3e4a38, 0.78);
  const shirt = mat(kind === 'mullah' ? 0xf7f1e4 : kind === 'woman' ? DRESSES[salt % DRESSES.length] : 0xc4a574, 0.74);
  const robe = mat(0x241c18, 0.8);
  const wrap = mat(kind === 'mullah' ? 0xf7f4ee : kind === 'woman' ? 0xf2efe4 : 0xd8c4a4, 0.8);
  const beardC = mat(0xd0d0d0, 0.85);

  const hips = [new THREE.Group(), new THREE.Group()];
  const shins = [new THREE.Group(), new THREE.Group()];
  [-0.15, 0.15].forEach((x, i) => {
    hips[i].position.set(x, 0.95, 0);
    body.add(hips[i]);
    mesh(hips[i], box(0.26, 0.42, 0.3), cloth, 0, -0.21, 0);
    shins[i].position.set(0, -0.42, 0);
    hips[i].add(shins[i]);
    mesh(shins[i], box(0.16, 0.38, 0.18), cloth, 0, -0.19, 0.02);
    mesh(shins[i], box(0.14, 0.08, 0.26), shoe, 0, -0.4, 0.06);
  });

  const torso = new THREE.Group();
  torso.position.y = 1.05;
  body.add(torso);
  mesh(torso, box(0.38, 0.42, 0.22), shirt, 0, 0.27, 0);
  if (kind === 'mullah') {
    mesh(torso, box(0.5, 0.7, 0.28), robe, 0, 0.18, 0);
  } else if (kind === 'woman') {
    mesh(torso, box(0.46, 0.72, 0.28), shirt, 0, 0.02, 0);
  } else {
    mesh(torso, box(0.42, 0.34, 0.16), mat(0x4a3828, 0.8), 0, 0.31, -0.06);
  }
  mesh(torso, box(0.46, 0.07, 0.26), sash, 0, 0.03, 0).rotation.z = 0.2;

  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  mesh(head, box(0.08, 0.08, 0.08), skin, 0, -0.06, 0);
  mesh(head, ball(0.115, 14), skin, 0, 0.08, 0);
  mesh(head, ball(0.02, 8), mat(0x1a120e, 0.4), -0.04, 0.1, -0.1);
  mesh(head, ball(0.02, 8), mat(0x1a120e, 0.4), 0.04, 0.1, -0.1);
  mesh(head, box(0.03, 0.025, 0.05), mat(0xf0c8b0, 0.6), 0, 0.06, -0.1);
  mesh(head, box(0.06, 0.012, 0.02), mat(0x6b3030, 0.6), 0, 0.02, -0.11);
  if (kind === 'mullah') {
    mesh(head, ball(0.132, 12), wrap, 0, 0.14, 0.01);
    mesh(head, box(0.07, 0.28, 0.05), wrap, 0.02, -0.08, 0.1);
    mesh(head, box(0.1, 0.08, 0.04), beardC, 0, -0.02, -0.1);
  } else if (kind === 'woman') {
    mesh(head, ball(0.14, 12), wrap, 0, 0.1, 0);
    mesh(head, box(0.08, 0.42, 0.04), wrap, 0, -0.16, 0.08);
  } else {
    mesh(head, ball(0.132, 12), wrap, 0, 0.14, 0.01);
    mesh(head, box(0.07, 0.32, 0.05), wrap, 0.02, -0.06, 0.1);
  }

  const shoulders = [new THREE.Group(), new THREE.Group()];
  const elbows = [new THREE.Group(), new THREE.Group()];
  [-0.28, 0.28].forEach((x, i) => {
    shoulders[i].position.set(x, 0.38, 0);
    torso.add(shoulders[i]);
    mesh(shoulders[i], box(0.11, 0.28, 0.12), shirt, 0, -0.14, 0);
    elbows[i].position.set(0, -0.28, 0);
    shoulders[i].add(elbows[i]);
    mesh(elbows[i], box(0.1, 0.26, 0.1), skin, 0, -0.13, 0);
    mesh(elbows[i], ball(0.045, 8), skin, 0, -0.28, 0);
    if (kind === 'mullah' && i === 0) {
      for (let b = 0; b < 4; b += 1) mesh(elbows[i], ball(0.018, 6), mat(0x1f6b4a, 0.4), 0.02, -0.22 - b * 0.03, 0.04);
    }
  });

  return { root, kind, body, hips, shins, shoulders, elbows, head, torso };
}

const PRAYER_POSE = {
  qiyam: { torso: -0.04, hip: 0.02, shin: 0, arm: -0.82, elbow: -1.25, head: 0.06, headY: 0, drop: 0 },
  ruku: { torso: -1.22, hip: 0.08, shin: 0.05, arm: -0.45, elbow: -0.25, head: 0.08, headY: 0, drop: 0 },
  rise: { torso: -0.02, hip: 0, shin: 0, arm: -0.12, elbow: -0.18, head: 0, headY: 0, drop: 0 },
  sujud: { torso: -1.32, hip: 1.42, shin: -1.5, arm: -0.85, elbow: -0.25, head: -0.4, headY: 0, drop: -0.46 },
  sit: { torso: -0.16, hip: 1.32, shin: -1.65, arm: -0.5, elbow: -1.45, head: 0.12, headY: 0, drop: -0.4 },
  salamR: { torso: -0.16, hip: 1.32, shin: -1.65, arm: -0.5, elbow: -1.45, head: 0.08, headY: -0.72, drop: -0.4 },
  salamL: { torso: -0.16, hip: 1.32, shin: -1.65, arm: -0.5, elbow: -1.45, head: 0.08, headY: 0.72, drop: -0.4 },
};

/** One shared, slow cycle. The face is local -Z, so a negative torso pitch bows toward qibla. */
export function posePrayer(rig, name) {
  const target = PRAYER_POSE[name] || PRAYER_POSE.qiyam;
  if (!rig._pose) rig._pose = { ...target };
  Object.keys(target).forEach((key) => {
    rig._pose[key] += (target[key] - rig._pose[key]) * 0.14;
  });
  const p = rig._pose;
  rig.body.position.y = p.drop;
  rig.torso.rotation.x = p.torso;
  rig.hips[0].rotation.x = p.hip;
  rig.hips[1].rotation.x = p.hip;
  rig.shins[0].rotation.x = p.shin;
  rig.shins[1].rotation.x = p.shin;
  rig.shoulders[0].rotation.x = p.arm;
  rig.shoulders[1].rotation.x = p.arm;
  rig.elbows[0].rotation.x = p.elbow;
  rig.elbows[1].rotation.x = p.elbow;
  rig.head.rotation.x = p.head;
  rig.head.rotation.y = p.headY;
}

export function poseVillager(rig, o) {
  if (rig.torso) rig.torso.rotation.x = 0;
  if (rig.head) rig.head.rotation.y = 0;
  rig._pose = null;
  const s = o.moving ? Math.sin(o.time * 8 + o.seed) : 0;
  const bob = o.moving ? Math.abs(Math.cos(o.time * 8 + o.seed)) * 0.045 : Math.sin(o.time * 1.7 + o.seed) * 0.012;
  rig.body.position.y = bob;
  rig.hips[0].rotation.x = s * 0.75;
  rig.hips[1].rotation.x = -s * 0.75;
  rig.shins[0].rotation.x = Math.max(0, -s) * 0.8;
  rig.shins[1].rotation.x = Math.max(0, s) * 0.8;
  let left = -s * 0.6;
  let right = s * 0.6;
  let foreL = -0.35;
  let foreR = -0.35;
  if (o.wave) { left = -2.3; foreL = -0.2; }
  if (o.chop) { right = -1.5; foreR = -1.05; }
  rig.shoulders[0].rotation.x = left;
  rig.shoulders[1].rotation.x = right;
  rig.elbows[0].rotation.x = foreL;
  rig.elbows[1].rotation.x = foreR;
  rig.head.rotation.x = o.moving ? 0 : Math.sin(o.time * 1.2 + o.seed) * 0.04;
}
