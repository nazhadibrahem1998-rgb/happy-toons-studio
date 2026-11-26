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
  if (!geos.has(key)) geos.set(key, new THREE.SphereGeometry(r, 12, 8));
  return geos.get(key);
}
function tube(r, h) {
  const key = `c${r}x${h}`;
  if (!geos.has(key)) geos.set(key, new THREE.CylinderGeometry(r, r * 0.92, h, 8));
  return geos.get(key);
}
function cone(top, bottom, h) {
  const key = `k${top}x${bottom}x${h}`;
  if (!geos.has(key)) geos.set(key, new THREE.CylinderGeometry(top, bottom, h, 7));
  return geos.get(key);
}
const patterns = new Map();
function patternMap(kind) {
  if (!kind || kind === 'plain') return null;
  if (patterns.has(kind)) return patterns.get(kind);
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ecdf';
  g.fillRect(0, 0, 32, 32);
  if (kind === 'stripe') {
    g.fillStyle = '#6e3030';
    for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 3);
  } else if (kind === 'coin') {
    g.clearRect(0, 0, 32, 32);
    g.fillStyle = '#e2c56a';
    for (let i = 0; i < 5; i += 1) {
      g.beginPath();
      g.arc(4 + i * 6, 16, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.fillStyle = '#2f3d32';
    for (let y = 0; y < 32; y += 8) {
      for (let x = 0; x < 32; x += 8) {
        if (((x + y) / 8) % 2 === 0) g.fillRect(x, y, 8, 8);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  patterns.set(kind, tex);
  return tex;
}
function mat(hex, rough = 0.72, map = null, metal = 0.02) {
  const key = `${hex}:${rough}:${metal}:${map ? map.uuid : ''}`;
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({
      color: hex, roughness: rough, metalness: metal, map,
    }));
  }
  return mats.get(key);
}
const MEN = [
  { cloth: 0x6b5344, shirt: 0xe6d7c3, sash: 0x7a3030, wrap: 0xcbb892, pattern: 'plain' },
  { cloth: 0x5a6168, shirt: 0xd9d2c6, sash: 0x3e4a38, wrap: 0x8d8880, pattern: 'stripe' },
  { cloth: 0x24344c, shirt: 0xf0e6d4, sash: 0xc4a06a, wrap: 0x24344c, pattern: 'plain' },
  { cloth: 0x4a3c32, shirt: 0xf3eee4, sash: 0x1f4d3c, wrap: 0xd4c4a0, pattern: 'check' },
];
const WOMEN = [
  { dress: 0x8e3d4a, layer: 0xc46a58, kawa: 0x4a2030, scarf: 0xf6f1e8, coins: true },
  { dress: 0x1f5a48, layer: 0x3d8a6a, kawa: 0x5c2840, scarf: 0xf4efe6, coins: false },
  { dress: 0xb86a32, layer: 0xe0a060, kawa: 0x3a2848, scarf: 0x2a3a52, coins: true },
  { dress: 0x3a4a68, layer: 0x7a88a8, kawa: 0x6b3038, scarf: 0xf7f3ea, coins: false },
];
const LOOKS = {
  'خولە درێژ': {
    proportions: [0.68, 1.62, 0.68],
    fit: { cloth: 0x6b452c, jacket: 0x6b452c, shirt: 0xe7d5bc, sash: 0x8a5a32, wrap: 0x6b452c, baggy: true, turban: true, beard: false, skirt: false, robe: false, simple: false, cap: false },
  },
  'خولە پیزە': {
    proportions: [1.48, 0.7, 1.38],
    fit: { cloth: 0x5a5048, jacket: 0x5a5048, shirt: 0xf3eadc, sash: 0xc43838, wrap: 0x5a5048, baggy: true, turban: true, beard: false, sashWide: true },
  },
  'خولە ڕوت': {
    fit: { cloth: 0x6a5344, jacket: 0x6a5344, shirt: 0xe6d7c3, sash: 0x7a4030, wrap: 0x4a3428, baggy: true, turban: false, cap: true, bald: true, beard: false },
  },
  'خولە دۆم': {
    drum: true,
    fit: { cloth: 0xc45a32, jacket: 0x2f6a48, shirt: 0xf0d060, sash: 0x2a3a78, wrap: 0xe07a32, wrapMap: patternMap('stripe'), baggy: true, turban: true, beard: false },
  },
  'حەمەی کەوچکان': {
    spoons: true,
    fit: { cloth: 0x6b5344, jacket: 0x6b5344, shirt: 0xe6d4bc, sash: 0x6b3030, wrap: 0xc4a574, baggy: true, turban: true, beard: false },
  },
  'مام ڕەسو': {
    cane: true,
    proportions: [0.96, 0.94, 0.96],
    skin: 0xd2b49a,
    fit: { cloth: 0x4a4038, jacket: 0x4a4038, shirt: 0xe8e0d4, sash: 0x6b3030, wrap: 0xd8d0c4, baggy: true, turban: true, beard: true, beardGrey: true },
  },
  'حەسەنە نۆ نۆ': {
    fit: { cloth: 0x3e463c, jacket: 0x3e463c, shirt: 0xf4efe6, sash: 0x6b5344, wrap: 0xb7b1a4, baggy: true, turban: true, beard: true, beardShort: true },
  },
  'ئامە دەم شڕ': {
    as: 'woman',
    fit: { cloth: 0xb4232a, jacket: 0x6b1830, shirt: 0xe07a3a, sash: 0x6b1830, wrap: 0xf2c14a, wrapMap: patternMap('check'), skirt: true, scarf: true, velvet: true, coins: false, turban: false, baggy: false, robe: false, beard: false },
  },
  'فاتە چاو پیس': {
    as: 'woman',
    proportions: [0.98, 0.9, 0.98],
    skin: 0xd2b49a,
    fit: { cloth: 0x2a3a62, jacket: 0x1c2844, shirt: 0x3a4a78, sash: 0x1c2844, wrap: 0x16120e, skirt: true, scarf: true, velvet: true, coins: true, turban: false, beard: false },
  },
  'کاکە حەمە': {
    cloak: true,
    crook: true,
    fit: { cloth: 0x5a4636, jacket: 0x6a5644, shirt: 0xe6d4bc, sash: 0x3a3228, wrap: 0x5a4636, baggy: true, turban: true, beard: true, beardShort: true },
  },
  'مەلا حوسێن': {
    as: 'mullah',
    fit: { cloth: 0x241c18, jacket: 0x1a1614, shirt: 0xf7f4ee, sash: 0x6b2a2a, wrap: 0xf7f7f4, robe: true, turban: true, beard: true, beardWhite: true, skirt: false, baggy: false },
  },
};

function outfitFor(kind, salt) {
  if (kind === 'mullah') {
    return { cloth: 0x2a221c, jacket: 0x241c18, shirt: 0xf7f4ee, sash: 0x6b2a2a, wrap: 0xf7f4ee, robe: true, turban: true, beard: true };
  }
  if (kind === 'woman') {
    const row = WOMEN[Math.abs(salt) % WOMEN.length];
    return {
      cloth: row.dress, jacket: row.kawa, shirt: row.layer, sash: row.kawa, wrap: row.scarf,
      skirt: true, scarf: true, coins: row.coins, velvet: true,
    };
  }
  if (kind === 'child') {
    return { cloth: 0xc4a574, jacket: 0xd8c4a4, shirt: 0xf4efe6, sash: 0x8d3a32, wrap: 0xf6f1e8, simple: true, cap: true };
  }
  const row = MEN[Math.abs(salt) % MEN.length];
  return {
    cloth: row.cloth, jacket: row.cloth, shirt: row.shirt, sash: row.sash, wrap: row.wrap,
    wrapMap: patternMap(row.pattern), baggy: true, turban: true, beard: salt % 3 !== 1,
  };
}
function piece(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const KEYS = ['drop', 'torso', 'torsoY', 'hipL', 'hipR', 'shinL', 'shinR', 'armL', 'armR', 'elbL', 'elbR', 'head', 'headY', 'sway', 'hipYaw', 'breath'];

export function createVillagerRig(kind, salt = 0, name = '') {
  const look = LOOKS[name] || null;
  const visual = (look && look.as) || kind;
  const root = new THREE.Group();
  root.scale.setScalar(kind === 'child' ? 0.5 : 0.68);
  const body = new THREE.Group();
  root.add(body);
  const fit = Object.assign({}, outfitFor(visual, salt), (look && look.fit) || {});
  const skin = mat((look && look.skin) || 0xc49274, 0.58);
  const shoe = mat(0x1a120e, 0.7);
  const cloth = mat(fit.cloth, 0.82);
  const shirt = mat(fit.shirt, 0.74);
  const jacket = mat(fit.jacket, fit.velvet ? 0.5 : 0.78);
  const sashMat = mat(fit.sash, 0.68);
  const wrap = mat(fit.wrap, 0.78, fit.wrapMap || null);
  const gold = mat(0xe2c56a, 0.38, patternMap('coin'), 0.45);

  const hips = [new THREE.Group(), new THREE.Group()];
  const shins = [new THREE.Group(), new THREE.Group()];
  const thighGeo = fit.skirt ? cone(0.24, 0.12, 0.42) : fit.baggy ? cone(0.28, 0.08, 0.42) : tube(0.09, 0.4);
  const shinGeo = fit.skirt ? cone(0.12, 0.055, 0.34) : fit.baggy ? tube(0.055, 0.32) : tube(0.065, 0.34);
  [-0.15, 0.15].forEach((x, i) => {
    hips[i].position.set(x, 0.95, 0);
    body.add(hips[i]);
    piece(hips[i], thighGeo, cloth, 0, -0.2, 0);
    shins[i].position.set(0, -0.4, 0);
    hips[i].add(shins[i]);
    piece(shins[i], shinGeo, cloth, 0, -0.16, 0.01);
    piece(shins[i], box(0.16, 0.08, 0.28), shoe, 0, -0.36, -0.04);
  });

  const torso = new THREE.Group();
  torso.position.y = 1.02;
  body.add(torso);
  if (fit.robe) {
    piece(torso, box(0.56, 1.05, 0.36), jacket, 0, 0.02, 0.02);
    piece(torso, box(0.22, 0.28, 0.06), shirt, 0, 0.34, -0.16);
  } else if (fit.skirt) {
    piece(torso, box(0.5, 0.78, 0.32), cloth, 0, 0.02, 0);
    piece(torso, box(0.42, 0.36, 0.12), shirt, 0, 0.22, -0.08);
    piece(torso, box(0.48, 0.32, 0.14), jacket, 0, 0.32, -0.04);
  } else if (fit.simple) {
    piece(torso, box(0.38, 0.42, 0.24), jacket, 0, 0.18, 0);
    piece(torso, box(0.16, 0.16, 0.04), shirt, 0, 0.28, -0.12);
  } else {
    piece(torso, box(0.44, 0.5, 0.26), jacket, 0, 0.2, 0);
    piece(torso, box(0.16, 0.2, 0.04), shirt, 0, 0.3, -0.13);
  }
  const sashH = fit.sashWide ? 0.22 : (fit.robe ? 0.08 : 0.13);
  const sashMesh = piece(torso, box(fit.simple ? 0.4 : 0.54, sashH, 0.34), sashMat, 0, fit.skirt ? 0.16 : 0.02, 0);
  sashMesh.rotation.z = fit.skirt ? -0.08 : 0.04;

  const head = new THREE.Group();
  head.position.set(0, 0.58, 0);
  torso.add(head);
  piece(head, tube(0.07, 0.1), skin, 0, -0.1, 0);
  piece(head, ball(0.17), skin, 0, 0.05, 0);
  const white = mat(0xf4f1ea, 0.4);
  const pupil = mat(0x1a120e, 0.3);
  const browC = mat(0x3a2a22, 0.7);
  const lids = [];
  const brows = [];
  [-0.06, 0.06].forEach((x) => {
    piece(head, ball(0.045), white, x, 0.07, -0.145, false);
    piece(head, ball(0.022), pupil, x, 0.07, -0.175, false);
    const lid = piece(head, box(0.07, 0.02, 0.02), skin, x, 0.09, -0.15, false);
    lids.push(lid);
    const brow = piece(head, box(0.07, 0.018, 0.02), browC, x, 0.125, -0.15, false);
    brows.push(brow);
    piece(head, ball(0.04), skin, x > 0 ? 0.15 : -0.15, 0.04, 0, false);
  });
  piece(head, box(0.045, 0.06, 0.05), mat(0xe0b090, 0.55), 0, 0.03, -0.16, false);
  const mouth = piece(head, box(0.08, 0.02, 0.02), mat(0x8a3a3a, 0.5), 0, -0.03, -0.16, false);
  if (fit.bald) {
    piece(head, box(0.14, 0.045, 0.14), wrap, 0, 0.2, 0.01);
  } else if (fit.robe || fit.turban) {
    piece(head, box(0.32, 0.07, 0.26), wrap, 0, 0.16, 0);
    piece(head, box(0.18, 0.07, 0.16), wrap, 0, 0.22, 0);
    piece(head, box(0.05, fit.robe ? 0.26 : 0.4, 0.045), wrap, 0.18, -0.02, 0.1);
  } else if (fit.scarf) {
    piece(head, ball(0.19), wrap, 0, 0.09, 0);
    piece(head, box(0.14, 0.52, 0.05), wrap, 0.02, -0.16, 0.07);
    if (fit.coins) piece(head, box(0.2, 0.045, 0.02), gold, 0, 0.12, -0.17, false);
  } else if (fit.cap) {
    piece(head, ball(0.16), wrap, 0, 0.16, 0);
  }
  if (fit.beard) {
    const beardMat = mat(fit.beardWhite ? 0xf7f4ee : fit.beardGrey ? 0xc8c2b8 : 0x4a3428, 0.8);
    const beardH = fit.beardShort ? 0.045 : fit.beardWhite ? 0.12 : 0.08;
    piece(head, box(0.1, beardH, 0.04), beardMat, 0, -0.02 - beardH * 0.15, -0.15, false);
    if (!fit.beardShort) piece(head, box(0.09, 0.03, 0.03), beardMat, 0, -0.015, -0.17, false);
  }
  if (look && look.cloak) {
    const felt = mat(0x6a5a48, 0.92);
    piece(torso, box(0.66, 0.72, 0.16), felt, 0, 0.2, 0.12);
    piece(torso, box(0.14, 0.58, 0.3), felt, -0.3, 0.16, 0);
    piece(torso, box(0.14, 0.58, 0.3), felt, 0.3, 0.16, 0);
  }
  if (look && look.drum) {
    const drum = new THREE.Group();
    drum.position.set(-0.32, -0.02, 0.1);
    drum.rotation.z = Math.PI / 2;
    piece(drum, tube(0.11, 0.24), mat(0xc45a32, 0.6), 0, 0, 0, false);
    piece(drum, box(0.02, 0.2, 0.2), mat(0xf4efe4, 0.45), 0, 0.12, 0, false);
    piece(drum, box(0.02, 0.2, 0.2), mat(0xf4efe4, 0.45), 0, -0.12, 0, false);
    torso.add(drum);
  }
  if (look && look.spoons) {
    const spoonWood = mat(0xc4a574, 0.7);
    [-0.14, 0, 0.14].forEach((x) => {
      piece(torso, box(0.025, 0.16, 0.02), spoonWood, x, -0.16, -0.18, false);
      piece(torso, ball(0.04), spoonWood, x, -0.24, -0.18, false);
    });
  }
  if (look && look.cane) {
    piece(torso, box(0.035, 0.95, 0.035), mat(0x6b4226, 0.75), 0.34, -0.28, 0.08, false);
  }
  if (look && look.crook) {
    const crookWood = mat(0x5a3a22, 0.75);
    piece(torso, box(0.035, 1.05, 0.035), crookWood, 0.36, -0.12, 0.1, false);
    const hook = piece(torso, box(0.14, 0.035, 0.035), crookWood, 0.42, 0.4, 0.1, false);
    hook.rotation.z = 0.7;
  }

  const shoulders = [new THREE.Group(), new THREE.Group()];
  const elbows = [new THREE.Group(), new THREE.Group()];
  [-0.3, 0.3].forEach((x, i) => {
    shoulders[i].position.set(x, 0.38, 0);
    torso.add(shoulders[i]);
    piece(shoulders[i], tube(0.055, 0.26), shirt, 0, -0.13, 0);
    elbows[i].position.set(0, -0.26, 0);
    shoulders[i].add(elbows[i]);
    piece(elbows[i], tube(0.045, 0.22), skin, 0, -0.11, 0);
    piece(elbows[i], ball(0.05), skin, 0, -0.24, -0.02, false);
  });
  if (kind === 'mullah') {
    for (let b = 0; b < 5; b += 1) {
      piece(elbows[0], ball(0.02), mat(0x1f6b4a, 0.4), 0.04, -0.16 - b * 0.035, 0.02, false);
    }
  }

  const staff = piece(elbows[1], box(0.04, 0.9, 0.04), mat(0x6b4226, 0.8), 0.08, -0.2, 0.04);
  const axe = piece(elbows[1], box(0.05, 0.46, 0.05), mat(0x8a5a32, 0.75), 0, -0.16, 0.02);
  piece(axe, box(0.16, 0.06, 0.04), mat(0x8a8e86, 0.48), 0.07, -0.16, 0);
  const hoe = piece(elbows[1], box(0.05, 0.5, 0.05), mat(0x6b4226, 0.8), 0, -0.12, 0);
  const sack = piece(elbows[0], box(0.16, 0.14, 0.14), mat(0xc4a574, 0.85), 0, -0.2, 0.06);
  const hammer = new THREE.Group();
  piece(hammer, box(0.04, 0.32, 0.04), mat(0x6b4226, 0.8), 0, -0.1, 0);
  piece(hammer, box(0.18, 0.07, 0.07), mat(0x6a6e74, 0.5), 0, -0.26, 0);
  hammer.position.set(0.02, -0.06, 0.04);
  elbows[1].add(hammer);
  const sickle = new THREE.Group();
  piece(sickle, box(0.035, 0.34, 0.035), mat(0x6b4226, 0.8), 0, -0.12, 0);
  const blade = piece(sickle, box(0.14, 0.04, 0.02), mat(0x7a8276, 0.45), 0.05, -0.28, 0);
  blade.rotation.z = 0.9;
  sickle.position.set(0.02, -0.04, 0.05);
  elbows[1].add(sickle);
  const shuttle = piece(elbows[1], box(0.18, 0.04, 0.05), mat(0xd2b48a, 0.8), 0, -0.24, 0.04);
  const sword = new THREE.Group();
  piece(sword, box(0.04, 0.16, 0.04), mat(0x6b4226, 0.7), 0, 0.05, 0, false);
  piece(sword, box(0.12, 0.03, 0.04), mat(0xc4a574, 0.5), 0, 0.14, 0, false);
  piece(sword, box(0.05, 0.46, 0.015), mat(0xd8dde4, 0.35), 0, 0.4, 0, false);
  sword.position.set(0.1, -0.05, -0.08);
  elbows[1].add(sword);
  const sheath = piece(torso, box(0.04, 0.42, 0.03), mat(0x4a3428, 0.7), 0.18, 0.12, 0.08, false);
  staff.visible = false;
  axe.visible = false;
  hoe.visible = false;
  sack.visible = false;
  hammer.visible = false;
  sickle.visible = false;
  shuttle.visible = false;
  sword.visible = false;
  sheath.visible = false;

  return {
    root, kind, lookName: name, proportions: (look && look.proportions) || null, body, hips, shins, shoulders, elbows, head, torso,
    staff, axe, hoe, sack, hammer, sickle, shuttle, sword, sheath, face: { lids, brows, mouth }, lock: [null, null],
  };
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
  const stride = o.action === 'run' ? 0.36 : 0.5;
  const phase = ((o.travel || 0) / stride) * Math.PI + (o.seed || 0);
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
  sit: { drop: -0.22, hipL: 1.15, hipR: 1.15, shinL: -1.2, shinR: -1.2, armL: -0.35, armR: -0.35, elbL: -0.6, elbR: -0.6 },
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
  const turn = Math.max(-0.55, Math.min(0.55, o.turn || 0));
  if (action === 'idle') {
    const breath = Math.sin(t * 1.45 + seed);
    base.drop = breath * 0.012;
    base.breath = breath * 0.025;
    base.head = Math.sin(t * 1.45 + seed + 0.4) * 0.035;
    base.torsoY = Math.sin(t * 0.55 + seed) * 0.05 + turn * 0.7;
    base.sway = Math.sin(t * 0.55 + seed) * 0.02;
    base.hipYaw = -base.torsoY * 0.6;
    base.armL = 0.14 + Math.sin(t * 0.7 + seed) * 0.04;
    base.armR = 0.14 - Math.sin(t * 0.7 + seed) * 0.04;
  } else if (action === 'walk' || action === 'run') {
    const stride = action === 'run' ? 0.36 : 0.5;
    const phase = ((o.travel || 0) / stride) * Math.PI + seed;
    const s = Math.sin(phase);
    const bob = Math.abs(Math.cos(phase));
    base.drop = bob * (action === 'run' ? 0.045 : 0.03);
    base.breath = bob * 0.015;
    base.torso = action === 'run' ? 0.14 : 0.07;
    base.torsoY = -s * 0.2 + turn * 0.85;
    base.hipYaw = s * 0.18;
    base.sway = s * 0.035;
    base.head = bob * 0.05;
    base.armL = -s * (action === 'run' ? 0.85 : 0.62);
    base.armR = s * (action === 'run' ? 0.85 : 0.62);
    base.elbL = -0.4 - Math.max(0, s) * 0.25;
    base.elbR = -0.4 - Math.max(0, -s) * 0.25;
    base.hipL = s * (action === 'run' ? 0.85 : 0.6);
    base.hipR = -s * (action === 'run' ? 0.85 : 0.6);
    base.shinL = Math.max(0, -s) * 0.7;
    base.shinR = Math.max(0, s) * 0.7;
  } else if (action === 'chop' || action === 'hoe' || action === 'hammer') {
    const speed = action === 'hammer' ? 7.5 : action === 'hoe' ? 3.6 : 5.2;
    const s = Math.sin(t * speed + seed);
    base.armR = -1.25 + s * (action === 'hammer' ? 1.15 : 0.9);
    base.elbR = action === 'hammer' ? -0.35 : -0.55;
    base.torso = -0.25 + s * 0.32;
    base.hipL = s * 0.12;
  } else if (action === 'bake' || action === 'draw') {
    const s = Math.sin(t * (action === 'draw' ? 2.4 : 3.4) + seed);
    base.torso = action === 'draw' ? -0.7 : -0.4 + s * 0.18;
    base.armL = -0.9 + s * 0.2;
    base.armR = -0.85 - s * 0.28;
    base.elbL = -1.15;
    base.elbR = -1.05;
  } else if (action === 'weave') {
    const s = Math.sin(t * 3.1 + seed);
    base.armL = -0.95;
    base.armR = -0.85 + s * 0.55;
    base.elbL = -1.25;
    base.elbR = -0.7;
    base.torsoY = s * 0.16;
  } else if (action === 'teach') {
    const s = Math.sin(t * 2.3 + seed);
    base.armR = -1.45 + s * 0.55;
    base.armL = -0.35;
    base.elbR = -0.45;
    base.headY = s * 0.28;
  } else if (action === 'call') {
    const s = Math.sin(t * 1.6 + seed);
    base.armL = -2.15;
    base.armR = -2.15;
    base.elbL = -0.35;
    base.elbR = -0.35;
    base.head = -0.12 + s * 0.06;
  } else if (action === 'tend') {
    const s = Math.sin(t * 2.1 + seed);
    base.torso = -0.4;
    base.armR = -0.85 + s * 0.25;
    base.elbR = -1.05;
    base.head = 0.18;
  } else if (action === 'haul') {
    const s = Math.sin(t * 2.2 + seed);
    base.torso = -0.5 + s * 0.16;
    base.armL = -0.85;
    base.elbL = -1.2;
    base.armR = -0.45 + s * 0.35;
  } else if (action === 'listen') {
    base.headY = Math.sin(t * 1.1 + seed) * 0.22;
    base.head = 0.08;
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
  if (o.tool === 'sack' && (action === 'walk' || action === 'run' || action === 'idle' || action === 'haul')) {
    base.armL = -0.8;
    base.elbL = -1.15;
  }
  return base;
}

function applyPose(rig, p) {
  rig.body.position.y = p.drop || 0;
  rig.body.position.x = p.sway || 0;
  rig.body.rotation.y = p.hipYaw || 0;
  rig.torso.scale.y = 1 + (p.breath || 0);
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
  if (rig._act !== action) {
    rig._from = { ...rig._pose };
    rig._act = action;
    rig._blend = 0;
  }
  const dt = Math.min(0.05, Math.max(0.001, o.dt || 0.016));
  rig._blend = Math.min(1, (rig._blend || 0) + dt * 3.4);
  const u = rig._blend * rig._blend * (3 - 2 * rig._blend);
  const gait = action === 'walk' || action === 'run';
  const follow = gait ? 0.72 : 0.45;
  KEYS.forEach((key) => {
    const from = (rig._from && rig._from[key]) || 0;
    const to = target[key] || 0;
    const mixed = from + (to - from) * u;
    rig._pose[key] = (rig._pose[key] || 0) + (mixed - (rig._pose[key] || 0)) * follow;
  });
  applyPose(rig, rig._pose);
  if (gait) plantFeet(rig, o);
  else rig.lock = [null, null];
  rig.staff.visible = o.tool === 'staff';
  rig.axe.visible = o.tool === 'axe';
  rig.hoe.visible = o.tool === 'hoe';
  rig.sack.visible = o.tool === 'sack';
  if (rig.hammer) rig.hammer.visible = o.tool === 'hammer';
  if (rig.sickle) rig.sickle.visible = o.tool === 'sickle';
  if (rig.shuttle) rig.shuttle.visible = o.tool === 'shuttle';
  const drawn = o.sword === 'hand';
  rig.sword.visible = drawn;
  rig.sheath.visible = o.sword === 'belt';
  if (drawn && (action === 'chop' || o.swing)) {
    rig.shoulders[1].rotation.x = -1.7 + Math.sin((o.time || 0) * 16) * 0.4;
    rig.sword.rotation.x = -0.8;
  } else if (drawn && o.blocking) {
    rig.shoulders[1].rotation.x = -1.15;
    rig.elbows[1].rotation.x = -0.4;
    rig.sword.rotation.z = 0.6;
  } else if (rig.sword) {
    rig.sword.rotation.set(0.4, 0, 0.2);
  }
  if (rig.face) {
    const blink = Math.sin((o.time || 0) * 0.7 + (o.seed || 0)) > 0.96 ? 0.15 : 1;
    rig.face.lids.forEach((lid) => { lid.scale.y = blink; });
    const angry = action === 'quarrel';
    rig.face.brows.forEach((brow, i) => { brow.rotation.z = angry ? (i ? -0.5 : 0.5) : 0; });
    const talking = action === 'talk' || action === 'wave' || action === 'call' || action === 'teach';
    rig.face.mouth.scale.y = talking ? 0.6 + Math.abs(Math.sin((o.time || 0) * 9)) * 1.8 : 1;
    rig.face.mouth.scale.x = o.happy && !angry ? 1.35 : 1;
    rig.face.mouth.position.y = o.happy && !angry ? -0.02 : -0.03;
  }
}

export function posePrayer(rig, name) {
  poseVillager(rig, { action: name, time: 0, seed: 0, tool: '' });
}
