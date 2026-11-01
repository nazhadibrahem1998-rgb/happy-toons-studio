/**
 * گوندی شارستێن — Sharsten Village simulation.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 * Pure game rules: no DOM, no three.js. Safe to run in Node and the browser.
 */

export const SAVE_KEY = 'sharsten-village-v1';
export const SETTINGS_KEY = 'sharsten-settings-v1';
export const GRID_W = 56;
export const GRID_D = 72;
export const CELL = 2;
/** About 500×700 m compressed so the valley is walkable. 1 cell ≈ 9 m. */
export const METERS_PER_CELL = 9;
export function metersToUnits(m) { return (m / METERS_PER_CELL) * CELL; }
export function renderRadiusUnits(q) {
  const key = q === true || q === 'low' ? 'low' : q === 'high' ? 'high' : q === false ? 'high' : (q || 'mid');
  const meters = key === 'low' ? 60 : key === 'high' ? 100 : 80;
  return metersToUnits(meters);
}
export const CHUNK_CELLS = 2;
export const MAP_BOUND = { minGx: -4, maxGx: GRID_W + 3, minGz: -4, maxGz: GRID_D + 3 };

/** Stylized pentagon from the satellite outline, not a survey. */
export const PENTAGON = [
  [0, 10],
  [26, 2],
  [55, 28],
  [36, 71],
  [10, 71],
];

export const LAYOUT = {
  mosque: { gx: 18, gz: 30 },
  exits: [
    { id: 'northwest', gx: 0, gz: 10 },
    { id: 'east', gx: 55, gz: 30 },
    { id: 'south', gx: 22, gz: 71 },
  ],
  loopApex: { gx: 28, gz: 4 },
  westSpur: { gx: 12, gz: 30 },
  neSpur: { gx: 32, gz: 16 },
};
export const SECONDS_PER_HOUR = 55;
/** Day hours last long enough for ten real minutes of daylight. Night hours are short. */
export function secondsThisHour(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return h >= 5 && h < 21 ? 48 : 12;
}
export const SEASON_DAYS = 4;
export const VILLAGER_CAP = 25;
/** Non-player neighbours simulated on this device. No server and no online model. */
export const NPC_COUNT = 24;
const ROLES = ['farmer', 'shepherd', 'teacher', 'faithful', 'baker', 'smith', 'weaver', 'woodcutter', 'stonecutter', 'water', 'child'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export const WALK_SPEED = 6;
export const LOOK_YAW_SPEED = 1.5;
export const LOOK_PITCH_SPEED = 1.05;

const MEN = [['Ahmad', 'ئەحمەد'], ['Kaka Hama', 'کاکە حەمە'], ['Mama Rashid', 'مامە رەشید'], ['Salih', 'ساڵح'], ['Aziz', 'عەزیز'], ['Qadir', 'قادر'], ['Salim', 'سەلیم'], ['Kaka Awrahman', 'کاکە ئەورەحمان']];
const WOMEN = [['Pura Fatima', 'پوورە فاتمە'], ['Khatun', 'خاتوون'], ['Gulal', 'گوڵال'], ['Naza', 'نازە'], ['Shamsa', 'شەمسە'], ['Halala', 'هەلالە']];
const CHILDREN = [['Aram', 'ئارام'], ['Hiwa', 'هیوا'], ['Shakhawan', 'شاخەوان'], ['Zerin', 'زێرین']];

export const COSTS = {
  house: { wood: 8, stone: 4 },
  mill: { wood: 8, stone: 6 },
  smith: { stone: 8, wood: 6 },
  loom: { wood: 7, stone: 2 },
  field: { wood: 2 },
  vineyard: { wood: 6, water: 3 },
  orchard_pom: { wood: 6, water: 2 },
  orchard_walnut: { wood: 6, water: 2 },
  pen_sheep: { wood: 6 },
  pen_goat: { wood: 6 },
  coop: { wood: 5 },
  tandoor: { stone: 8, wood: 4 },
  teahouse: { wood: 10, stone: 6 },
  school: { wood: 12, stone: 10 },
  clinic: { wood: 8, stone: 12 },
  woodyard: { wood: 6 },
  quarry: { wood: 4, stone: 6 },
  gate: { wood: 6, stone: 2 },
  tower: { wood: 8, stone: 6 },
  torchpost: { wood: 2 },
  hound: { wood: 2, food: 2 },
  barn: { wood: 10, stone: 4 },
  stable: { wood: 8, stone: 2 },
  wall: { wood: 2, stone: 1 },
};

export const UPGRADE = {
  house: [{ wood: 10, stone: 8 }, { wood: 14, stone: 12, money: 8 }],
  mosque: [{ stone: 10, wood: 6 }, { stone: 18, wood: 10, money: 10 }],
  school: [{ wood: 8, stone: 8 }, { wood: 10, stone: 10 }],
  clinic: [{ wood: 6, stone: 8 }],
  teahouse: [{ wood: 8, stone: 6 }],
  tandoor: [{ stone: 6, wood: 4 }],
  mill: [{ wood: 6, stone: 4 }],
  smith: [{ stone: 6, wood: 4 }],
  loom: [{ wood: 4 }],
  woodyard: [{ wood: 6 }],
  quarry: [{ wood: 4, stone: 4 }],
  vineyard: [{ wood: 4, water: 2 }],
  orchard_pom: [{ wood: 4, water: 2 }],
  orchard_walnut: [{ wood: 4, water: 2 }],
  pen_sheep: [{ wood: 4 }],
  pen_goat: [{ wood: 4 }],
  coop: [{ wood: 3 }],
};

export const MAX_LEVEL = {
  house: 3, mosque: 3, school: 3, clinic: 2, teahouse: 2, tandoor: 2,
  woodyard: 2, quarry: 2, mill: 2, smith: 2, loom: 2, vineyard: 2, orchard_pom: 2, orchard_walnut: 2,
  pen_sheep: 2, pen_goat: 2, coop: 2, field: 1, spring: 1,
  barn: 1, stable: 1, wall: 1,
};

const JOB_TYPES = {
  farmer: ['field', 'vineyard', 'orchard_pom', 'orchard_walnut'],
  shepherd: ['pen_sheep', 'pen_goat', 'coop'],
  baker: ['tandoor'],
  miller: ['mill'],
  smith: ['smith'],
  weaver: ['loom'],
  builder: ['woodyard', 'quarry'],
  teacher: ['school'],
  healer: ['clinic'],
  host: ['teahouse'],
};

export function clamp(n, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export function phaseOf(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return h >= 5 && h < 21 ? 'day' : 'night';
}

const ROADS = new Map();

/** Cell polylines traced from the Sharsten satellite outline. 1 cell ≈ 9 m. */
const ROAD_LINES = [
  { kind: 'stone', pts: [[17, 29], [17, 31], [19, 31], [19, 29], [17, 29]] },
  { kind: 'stone', pts: [[17, 29], [14, 26], [10, 22], [6, 16], [2, 12], [0, 10]] },
  { kind: 'stone', pts: [[19, 30], [24, 30], [30, 31], [38, 30], [46, 30], [55, 30]] },
  { kind: 'stone', pts: [[18, 31], [19, 36], [20, 44], [21, 54], [22, 62], [22, 71]] },
  { kind: 'stone', pts: [[19, 29], [22, 24], [26, 16], [28, 8], [28, 4]] },
  { kind: 'stone', pts: [[28, 4], [32, 8], [34, 14], [32, 20], [28, 26], [22, 29]] },
  { kind: 'dirt', pts: [[17, 30], [14, 30], [12, 30]] },
  { kind: 'dirt', pts: [[24, 28], [28, 22], [32, 16]] },
  { kind: 'dirt', pts: [[19, 31], [21, 32], [20, 35], [23, 36], [22, 39], [25, 41], [23, 44]] },
  { kind: 'dirt', pts: [[21, 32], [24, 33], [26, 31], [28, 34], [26, 37]] },
  { kind: 'dirt', pts: [[23, 36], [26, 38], [24, 40], [27, 42]] },
  { kind: 'dirt', pts: [[17, 31], [15, 33], [16, 36], [14, 38]] },
];

function traceRoad(kind, x0, z0, x1, z1) {
  let x = x0;
  let z = z0;
  const sx = Math.sign(x1 - x0);
  const sz = Math.sign(z1 - z0);
  const paint = (gx, gz) => {
    const prev = ROADS.get(`${gx},${gz}`);
    if (prev === 'stone') return;
    ROADS.set(`${gx},${gz}`, kind);
  };
  paint(x, z);
  let guard = 0;
  while ((x !== x1 || z !== z1) && guard < 400) {
    guard += 1;
    if (x !== x1 && (z === z1 || Math.abs(x1 - x) >= Math.abs(z1 - z))) x += sx;
    else z += sz;
    paint(x, z);
  }
}

const MX = LAYOUT.mosque.gx;
const MZ = LAYOUT.mosque.gz;
ROAD_LINES.forEach((line) => {
  for (let i = 0; i < line.pts.length - 1; i += 1) {
    traceRoad(line.kind, line.pts[i][0], line.pts[i][1], line.pts[i + 1][0], line.pts[i + 1][1]);
  }
});
ROADS.delete(`${MX},${MZ}`);

export function roadKind(gx, gz) {
  return ROADS.get(`${gx},${gz}`) || null;
}

export function isRoad(gx, gz) {
  return ROADS.has(`${gx},${gz}`);
}

export function insideVillage(gx, gz) {
  const poly = PENTAGON;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const crosses = (zi > gz) !== (zj > gz);
    if (crosses && gx < ((xj - xi) * (gz - zi)) / ((zj - zi) || 1e-6) + xi) inside = !inside;
  }
  return inside;
}

export function besideRoad(gx, gz) {
  return isRoad(gx + 1, gz) || isRoad(gx - 1, gz) || isRoad(gx, gz + 1) || isRoad(gx, gz - 1);
}

/** Village, its lanes, and a narrow ring of fields. Nothing past that is walkable. */
export function playable(gx, gz) {
  const rx = Math.round(gx);
  const rz = Math.round(gz);
  if (isRoad(rx, rz)) return true;
  if (insideVillage(gx, gz)) return true;
  for (let dz = -2; dz <= 2; dz += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (insideVillage(gx + dx, gz + dz)) return true;
    }
  }
  return false;
}

function nearestRoad(gx, gz, radius = 4) {
  if (isRoad(gx, gz)) return { gx, gz };
  for (let r = 1; r <= radius; r += 1) {
    for (let dz = -r; dz <= r; dz += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (isRoad(gx + dx, gz + dz)) return { gx: gx + dx, gz: gz + dz };
      }
    }
  }
  return null;
}

function cellKey(gx, gz) {
  return `${gx},${gz}`;
}

/** A* on the 4-connected road graph. Cost is one per lane step. Not a navmesh. */
function astarRoads(start, goal) {
  const h = (a) => Math.abs(a.gx - goal.gx) + Math.abs(a.gz - goal.gz);
  const gScore = new Map([[cellKey(start.gx, start.gz), 0]]);
  const prev = new Map([[cellKey(start.gx, start.gz), '']]);
  const closed = new Set();
  const open = [start];
  const inOpen = new Set([cellKey(start.gx, start.gz)]);
  while (open.length) {
    let bestI = 0;
    let bestF = Infinity;
    for (let i = 0; i < open.length; i += 1) {
      const node = open[i];
      const f = gScore.get(cellKey(node.gx, node.gz)) + h(node);
      if (f < bestF) { bestF = f; bestI = i; }
    }
    const cur = open.splice(bestI, 1)[0];
    const ck = cellKey(cur.gx, cur.gz);
    inOpen.delete(ck);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.gx === goal.gx && cur.gz === goal.gz) {
      const path = [];
      let k = ck;
      while (k) {
        const [gx, gz] = k.split(',').map(Number);
        path.push({ gx, gz });
        k = prev.get(k);
      }
      path.reverse();
      return path;
    }
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
      const nx = cur.gx + dx;
      const nz = cur.gz + dz;
      if (!isRoad(nx, nz)) return;
      const nk = cellKey(nx, nz);
      if (closed.has(nk)) return;
      const ng = gScore.get(ck) + 1;
      if (ng >= (gScore.get(nk) ?? Infinity)) return;
      gScore.set(nk, ng);
      prev.set(nk, ck);
      if (!inOpen.has(nk)) {
        open.push({ gx: nx, gz: nz });
        inOpen.add(nk);
      }
    });
  }
  return null;
}

/** Street route on the road graph. The goal cell must itself be a lane. */
export function roadRoute(sx, sz, tx, tz) {
  const start = nearestRoad(Math.round(sx), Math.round(sz));
  if (!start || !isRoad(tx, tz)) return null;
  return astarRoads(start, { gx: tx, gz: tz });
}

/**
 * Road-graph route that may finish on a plot (mosque, field, or house).
 * The walk uses lanes, then one last step onto the plot. Local only.
 */
export function astarRoute(sx, sz, tx, tz) {
  const start = nearestRoad(Math.round(sx), Math.round(sz), 8);
  const goalRoad = nearestRoad(Math.round(tx), Math.round(tz), 8);
  if (!start || !goalRoad) return null;
  const path = astarRoads(start, goalRoad);
  if (!path || !path.length) return null;
  const last = path[path.length - 1];
  if (Math.hypot(last.gx - tx, last.gz - tz) > 0.05) path.push({ gx: tx, gz: tz });
  return path;
}

/** How many neighbours get a full update. Low phones stay on the smaller budget. */
export function npcActiveCap(low) {
  return low ? 12 : 24;
}

/** Day plan. Standing at the mosque is a visit, not a worship animation. */
export function npcSchedule(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h < 5 || h >= 21) return 'home';
  if (h < 8) return 'street';
  if (h < 12) return 'work';
  if (h === 12) return 'mosque';
  if (h < 21) return 'work';
  return 'home';
}

/** Walk the road in small steps. A hit means the valley bound stopped the player. */
export function reachExit(exit) {
  const route = roadRoute(LAYOUT.mosque.gx, LAYOUT.mosque.gz, exit.gx, exit.gz);
  if (!route) return { ok: false, id: exit.id, reason: 'no-route' };
  let x = route[0].gx;
  let z = route[0].gz;
  for (let i = 1; i < route.length; i += 1) {
    const dx = route[i].gx - x;
    const dz = route[i].gz - z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.3));
    for (let s = 1; s <= steps; s += 1) {
      const nx = x + (dx * s) / steps;
      const nz = z + (dz * s) / steps;
      if (clampToMap(nx, nz).hit) return { ok: false, id: exit.id, reason: 'blocked' };
    }
    x = route[i].gx;
    z = route[i].gz;
  }
  return { ok: Math.hypot(x - exit.gx, z - exit.gz) < 0.75, id: exit.id, x, z };
}

export function isBlocked(gx, gz) {
  if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_D) return true;
  if (isRoad(gx, gz)) return true;
  if (!insideVillage(gx, gz)) return true;
  if (!besideRoad(gx, gz)) return true;
  return false;
}

export function worldToCell(x, z) {
  return {
    gx: x / CELL + (GRID_W - 1) / 2,
    gz: z / CELL + (GRID_D - 1) / 2,
  };
}

export function cellToWorld(gx, gz) {
  return {
    x: (gx - (GRID_W - 1) / 2) * CELL,
    y: 0,
    z: (gz - (GRID_D - 1) / 2) * CELL,
  };
}

/** Pull a walker back onto the village or its fields. Roads stop at the exits. */
export function clampToMap(gx, gz) {
  if (playable(gx, gz)) return { gx, gz, hit: false };
  let x = gx;
  let z = gz;
  const tx = LAYOUT.mosque.gx;
  const tz = LAYOUT.mosque.gz;
  for (let i = 0; i < 16; i += 1) {
    x += (tx - x) * 0.35;
    z += (tz - z) * 0.35;
    if (playable(x, z)) return { gx: x, gz: z, hit: true };
  }
  return { gx: tx, gz: tz, hit: true };
}

function occupied(state, gx, gz) {
  return state.buildings.some((b) => b.gx === gx && b.gz === gz);
}

function byId(state, id) {
  return state.buildings.find((b) => b.id === id) || null;
}

function canAfford(state, cost) {
  return Object.keys(cost).every((k) => (state.resources[k] || 0) >= cost[k]);
}

function pay(state, cost) {
  Object.keys(cost).forEach((k) => {
    state.resources[k] = round3(state.resources[k] - cost[k]);
  });
}

function addRes(state, key, amount) {
  state.resources[key] = round3((state.resources[key] || 0) + amount);
}

function homes(state) {
  return state.buildings.filter((b) => b.type === 'house');
}

function capacity(state) {
  return homes(state).reduce((sum, h) => sum + h.level + 1, 0);
}

function bump(state) {
  state.rev = (state.rev || 0) + 1;
}

function addBuilding(state, type, gx, gz, opt = {}) {
  const b = {
    id: state.nextId++,
    type,
    gx,
    gz,
    level: opt.level || 1,
    stage: opt.stage || 0,
    growth: opt.growth || 0,
    style: opt.style ?? 0,
    anim: opt.anim || 0,
    tag: opt.tag || '',
    damage: opt.damage || 0,
  };
  state.buildings.push(b);
  return b;
}

function streetAnchor(gx, gz, salt) {
  const road = nearestRoad(Math.round(gx), Math.round(gz), 6);
  if (!road) return { gx, gz };
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dir = dirs[Math.abs(salt) % 4];
  let x = road.gx;
  let z = road.gz;
  const steps = 2 + (Math.abs(salt) % 4);
  for (let i = 0; i < steps; i += 1) {
    const nx = x + dir[0];
    const nz = z + dir[1];
    if (!isRoad(nx, nz)) break;
    x = nx;
    z = nz;
  }
  return { gx: x, gz: z };
}

function spawnVillager(state, player = false) {
  const hs = homes(state);
  const home = hs.length ? hs[state.villagers.length % hs.length] : null;
  const n = state.nameCursor++;
  const npcIndex = state.villagers.filter((v) => !v.player).length;
  const role = player ? 'player' : ROLES[npcIndex % ROLES.length];
  const gender = role === 'child' ? 'child' : (role === 'water' || role === 'weaver' ? 'woman' : 'man');
  const book = gender === 'child' ? CHILDREN : gender === 'woman' ? WOMEN : MEN;
  const picked = book[n % book.length];
  const gx = home ? home.gx + 0.2 : 6;
  const gz = home ? home.gz + 0.6 : 3;
  const anchor = streetAnchor(gx, gz, n + 1);
  const v = {
    id: state.nextId++,
    name: player ? 'Ahmad' : picked[0],
    nameCkb: player ? 'ئەحمەد' : picked[1],
    gender,
    job: 'idle',
    role,
    player: !!player,
    homeId: home ? home.id : 0,
    workId: 0,
    questId: '',
    happiness: 66,
    fullness: 74,
    rest: 82,
    mode: 'home',
    ai: 'idle',
    gx,
    gz,
    tx: gx,
    tz: gz,
    streetGx: anchor.gx,
    streetGz: anchor.gz,
    goalGx: gx,
    goalGz: gz,
    path: [],
    pathI: 0,
    pathSig: '',
    ry: 0,
    line: '',
    sayLeft: 0,
    greeting: false,
    updated: true,
  };
  state.villagers.push(v);
  return v;
}

const ANIMAL_COUNTS = { sheep: 8, goat: 6, chicken: 8, donkey: 4, cow: 6, ox: 2 };
const HERD_OF = {
  sheep: 'flock', goat: 'flock', cow: 'cattle', ox: 'cattle', chicken: 'poultry', donkey: 'pack',
};
const PASTURE = {
  flock: { gx: 26, gz: 10 },
  cattle: { gx: 10, gz: 22 },
  poultry: { gx: 22, gz: 36 },
  pack: { gx: 14, gz: 34 },
};
const PEN_FALLBACK = {
  flock: { gx: 16, gz: 29 },
  cattle: { gx: 20, gz: 29 },
  poultry: { gx: 16, gz: 31 },
  pack: { gx: 16, gz: 32 },
};

/** Slower than a tractor. The donkey still cannot leave the valley. */
export const DONKEY_SPEED = 1.25;

export function animalCap(low) {
  return low ? 20 : 40;
}

function herdName(kind) {
  return HERD_OF[kind] || 'flock';
}

function fitPoint(gx, gz) {
  const spot = clampToMap(gx, gz);
  return { gx: spot.gx, gz: spot.gz };
}

function herderList(state) {
  return state.villagers.filter((v) => !v.player && (v.role === 'shepherd' || v.job === 'shepherd'));
}

function herdForVillager(state, v) {
  const list = herderList(state);
  const idx = list.findIndex((h) => h.id === v.id);
  return ['flock', 'cattle', 'poultry', 'pack'][(idx < 0 ? 0 : idx) % 4];
}

export function herdSpot(state, kind, phase) {
  const herd = herdName(kind);
  if (phase === 'pen') {
    const type = herd === 'flock' ? 'pen_sheep' : herd === 'cattle' ? 'pen_goat' : herd === 'poultry' ? 'coop' : null;
    const pen = type && state.buildings.find((b) => b.type === type);
    if (pen) return fitPoint(pen.gx + 0.35, pen.gz + 0.35);
    return fitPoint(PEN_FALLBACK[herd].gx, PEN_FALLBACK[herd].gz);
  }
  const day = PASTURE[herd];
  return fitPoint(day.gx, day.gz);
}

function herdPhase(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return h >= 7 && h < 17 ? 'pasture' : 'pen';
}

function spawnAnimal(state, kind) {
  const base = {
    sheep: [23, 8.4], goat: [8.2, 26], chicken: [20.4, 32.2], donkey: [18.8, 33.6], ox: [21.2, 34.4], cow: [12.2, 22],
  }[kind] || [20, 32];
  const n = state.animals.filter((a) => a.kind === kind).length;
  const gx = base[0] + (n % 3) * 0.42;
  const gz = base[1] + Math.floor(n / 3) * 0.36;
  const a = {
    id: state.nextId++,
    kind,
    gx,
    gz,
    tx: gx,
    tz: gz,
    homeGx: base[0],
    homeGz: base[1],
    mode: 'idle',
    ai: 'idle',
    yaw: 0,
    load: 0,
    ridden: false,
    hold: false,
    updated: true,
  };
  state.animals.push(a);
  return a;
}

function spawnHerds(state) {
  Object.keys(ANIMAL_COUNTS).forEach((kind) => {
    for (let i = 0; i < ANIMAL_COUNTS[kind]; i += 1) spawnAnimal(state, kind);
  });
}

function workersAt(state, id) {
  return state.villagers.filter((v) => v.workId === id && v.job !== 'idle').length;
}

function workplace(state, job) {
  const types = JOB_TYPES[job];
  if (!types) return null;
  if (job === 'farmer' && state.lastPlantedId) {
    const planted = byId(state, state.lastPlantedId);
    if (planted && planted.type === 'field' && planted.stage > 0 && planted.stage < 3) return planted;
  }
  const options = state.buildings.filter((b) => types.includes(b.type));
  if (!options.length) return null;
  options.sort((a, b) => workersAt(state, a.id) - workersAt(state, b.id) || a.id - b.id);
  return options[0];
}

function sendHome(state, v) {
  const hs = homes(state);
  let house = state.buildings.find((b) => b.id === v.homeId && b.type === 'house');
  if (!house && hs.length) house = hs[v.id % hs.length];
  if (!house) {
    v.tx = 6;
    v.tz = 3;
    return;
  }
  v.homeId = house.id;
  v.tx = house.gx + ((v.id % 3) - 1) * 0.22;
  v.tz = house.gz + 0.62;
}

function lostChickenSpot() {
  let x = MX;
  let z = MZ + 1;
  if (!isRoad(x, z)) {
    const road = nearestRoad(MX, MZ, 4);
    if (road) { x = road.gx; z = road.gz; }
  }
  for (let i = 0; i < 8; i += 1) {
    if (isRoad(x, z + 1)) z += 1;
    else break;
  }
  return { gx: x, gz: z };
}

function bindQuests(state) {
  const giver = (role) => state.villagers.find((v) => !v.player && v.role === role);
  const farmer = giver('farmer');
  const shepherd = giver('shepherd');
  const teacher = giver('teacher');
  if (!farmer || !shepherd || !teacher) {
    state.npcQuests = state.npcQuests || [];
    return;
  }
  const spot = lostChickenSpot();
  state.npcQuests = [
    {
      id: 'wheat', giverId: farmer.id, status: 'open', titleKey: 'qWheat',
      need: { grain: 4 }, reward: { money: 8 }, offer: 'wheatOffer', done: 'wheatDone',
    },
    {
      id: 'chicken', giverId: shepherd.id, status: 'open', titleKey: 'qChicken',
      spot, found: false, reward: { food: 6 }, offer: 'chickenOffer', done: 'chickenDone',
    },
    {
      id: 'fence', giverId: teacher.id, status: 'open', titleKey: 'qFence',
      need: { wood: 4 }, reward: { money: 6, tools: 1 }, offer: 'fenceOffer', done: 'fenceDone',
    },
    {
      id: 'water', giverId: farmer.id, status: 'open', titleKey: 'qWater',
      need: { water: 4 }, reward: { food: 4 }, offer: 'waterOffer', done: 'waterDone',
    },
    {
      id: 'wool', giverId: shepherd.id, status: 'open', titleKey: 'qWool',
      need: { wool: 2 }, reward: { money: 5 }, offer: 'woolOffer', done: 'woolDone',
    },
  ];
  farmer.questId = 'wheat';
  shepherd.questId = 'chicken';
  teacher.questId = 'fence';
}

function ensureVillageAi(state) {
  state.villagers.forEach((v, i) => {
    if (!v.role) v.role = v.player ? 'player' : ROLES[i % ROLES.length];
    if (!v.path) v.path = [];
    if (v.pathI == null) v.pathI = 0;
    if (v.pathSig == null) v.pathSig = '';
    if (v.sayLeft == null) v.sayLeft = 0;
    if (v.greeting == null) v.greeting = false;
    if (v.line == null) v.line = '';
    if (v.streetGx == null) {
      const anchor = streetAnchor(v.gx, v.gz, v.id || i);
      v.streetGx = anchor.gx;
      v.streetGz = anchor.gz;
    }
  });
  if (!state.npcQuests) bindQuests(state);
}

function goalFor(state, v, phase) {
  if ((v.role === 'shepherd' || v.job === 'shepherd') && phase !== 'mosque') {
    const herd = herdForVillager(state, v);
    const sample = herd === 'cattle' ? 'cow' : herd === 'poultry' ? 'chicken' : herd === 'pack' ? 'donkey' : 'sheep';
    return herdSpot(state, sample, phase === 'home' ? 'pen' : 'pasture');
  }
  if (phase === 'home') {
    const hs = homes(state);
    const house = state.buildings.find((b) => b.id === v.homeId && b.type === 'house')
      || (hs.length ? hs[v.id % hs.length] : null);
    if (!house) return { gx: v.gx, gz: v.gz };
    return { gx: house.gx + ((v.id % 3) - 1) * 0.2, gz: house.gz + 0.55 };
  }
  if (v.role === 'mullah') {
    if (phase === 'mosque' || state.adhan) return { gx: MX - 0.35, gz: MZ - 0.45 };
    if ((state.ticks || 0) % 8 < 4) {
      const home = state.buildings.find((b) => b.tag === 'mullah') || state.buildings.find((b) => b.id === v.homeId);
      if (home) return { gx: home.gx, gz: home.gz + 0.7 };
    }
    return { gx: MX + 0.1, gz: MZ + 0.85 };
  }
  if (phase === 'mosque') {
    const ox = ((v.id % 5) - 2) * 0.28;
    return { gx: LAYOUT.mosque.gx + ox, gz: LAYOUT.mosque.gz + 0.35 };
  }
  if (phase === 'street' || v.role === 'faithful') {
    return { gx: v.streetGx, gz: v.streetGz };
  }
  if (v.role === 'farmer') {
    const fields = state.buildings.filter((b) => b.type === 'field');
    const field = fields.length ? fields[v.id % fields.length] : null;
    if (field) return { gx: field.gx + 0.35, gz: field.gz + 0.35 };
  }
  if (v.role === 'shepherd') {
    return herdSpot(state, 'sheep', 'pasture');
  }
  if (v.role === 'teacher' || v.role === 'child') {
    const school = state.buildings.find((b) => b.type === 'school');
    if (school) return { gx: school.gx + 0.35, gz: school.gz + 0.45 };
  }
  const workSpot = {
    baker: 'tandoor', smith: 'smith', weaver: 'loom', woodcutter: 'woodyard', stonecutter: 'quarry', water: 'spring',
  }[v.role];
  if (workSpot) {
    const place = state.buildings.find((b) => b.type === workSpot);
    if (place) return { gx: place.gx + 0.35, gz: place.gz + 0.4 };
  }
  return { gx: v.streetGx, gz: v.streetGz };
}

function phaseFor(state, v) {
  let phase = npcSchedule(state.hour);
  if (phase === 'mosque') {
    const half = secondsThisHour(state.hour) * 0.5;
    if ((state.acc || 0) >= half) phase = 'work';
    else if (v.role !== 'mullah' && v.prays === false) phase = 'work';
  }
  return phase;
}

function assignGoal(state, v) {
  const phase = phaseFor(state, v);
  v.mode = phase;
  const goal = goalFor(state, v, phase);
  v.goalGx = goal.gx;
  v.goalGz = goal.gz;
  const sig = `${phase}:${Math.round(goal.gx * 2)}:${Math.round(goal.gz * 2)}`;
  if (sig !== v.pathSig) {
    const route = astarRoute(v.gx, v.gz, goal.gx, goal.gz);
    v.path = route && route.length ? route : [{ gx: goal.gx, gz: goal.gz }];
    v.pathI = 0;
    v.pathSig = sig;
  }
}

function followPath(v) {
  if (Math.hypot(v.gx - v.goalGx, v.gz - v.goalGz) < 0.35) {
    v.pathI = Math.max(0, (v.path.length || 1) - 1);
    v.tx = v.goalGx;
    v.tz = v.goalGz;
    return;
  }
  if (!v.path || !v.path.length) {
    v.tx = v.goalGx;
    v.tz = v.goalGz;
    return;
  }
  let index = Math.min(v.pathI, v.path.length - 1);
  let wp = v.path[index];
  if (Math.hypot(v.gx - wp.gx, v.gz - wp.gz) < 0.22 && index < v.path.length - 1) {
    index += 1;
    v.pathI = index;
    wp = v.path[index];
  }
  v.tx = wp.gx;
  v.tz = wp.gz;
}

/** Local state machine: schedule, road path, greet. Far neighbours update less often. */
export function stepNpcs(state, dt, opts = {}) {
  ensureVillageAi(state);
  const cap = npcActiveCap(!!opts.low);
  const focus = opts.focus;
  const player = state.villagers.find((v) => v.player);
  const chicken = (state.npcQuests || []).find((q) => q.id === 'chicken' && q.status === 'active');
  if (chicken && player && chicken.spot && Math.hypot(player.gx - chicken.spot.gx, player.gz - chicken.spot.gz) < 1.6) {
    chicken.found = true;
  }
  const npcs = state.villagers.filter((v) => !v.player);
  npcs.forEach((v) => {
    v._d = focus ? Math.hypot(v.gx - focus.gx, v.gz - focus.gz) : 0;
  });
  npcs.sort((a, b) => a._d - b._d || a.id - b.id);
  npcs.forEach((v, i) => {
    const far = focus && focus.r != null && v._d > focus.r + 0.001;
    const skipThrottle = i >= cap && ((state.ticks + v.id) % 4 !== 0);
    if (far || skipThrottle) {
      v.ai = far ? 'lod' : 'throttle';
      v.updated = false;
      v.hold = true;
      return;
    }
    v.ai = i >= cap ? 'throttle' : 'active';
    v.hold = false;
    v.updated = true;
    assignGoal(state, v);
    if (v.sayLeft > 0) v.sayLeft = Math.max(0, v.sayLeft - dt);
    const dist = player ? Math.hypot(v.gx - player.gx, v.gz - player.gz) : 99;
    const questLine = v.line && !String(v.line).startsWith('greet') && v.sayLeft > 0;
    if ((state.rep || 0) < -15 && player && dist < 1.8) {
      v.line = v.role === 'mullah' ? 'advise' : ['scold0', 'scold1', 'scold2'][v.id % 3];
      v.sayLeft = Math.max(v.sayLeft, 1.2);
      v.ry = Math.atan2(v.gx - player.gx, v.gz - player.gz);
      v.greeting = false;
      v.tx = v.gx;
      v.tz = v.gz;
      return;
    }
    if (!questLine && dist < 1.65) {
      v.greeting = true;
      v.line = `greet${v.id % 4}`;
      v.ry = Math.atan2(player.gx - v.gx, player.gz - v.gz);
      v.sayLeft = Math.max(v.sayLeft, 0.35);
      v.tx = v.gx;
      v.tz = v.gz;
      return;
    }
    v.greeting = false;
    if (v.line && String(v.line).startsWith('greet')) v.line = '';
    else if (v.sayLeft <= 0 && v.line && !String(v.line).startsWith('greet')) v.line = '';
    if (v.stumble > 0) v.stumble = Math.max(0, v.stumble - dt);
    followPath(v);
    const dx = v.tx - v.gx;
    const dz = v.tz - v.gz;
    if (v.hidden && phaseFor(state, v) !== 'mosque') v.hidden = false;
    if (phaseFor(state, v) === 'mosque' && v.role !== 'mullah' && Math.hypot(v.gx - v.goalGx, v.gz - v.goalGz) < 0.42) v.hidden = true;
    if (Math.hypot(dx, dz) > 0.05) v.ry = Math.atan2(dx, dz);
  });
}

export function acceptQuest(state, id) {
  ensureVillageAi(state);
  const q = (state.npcQuests || []).find((item) => item.id === id);
  if ((state.rep || 0) < -40) return { ok: false, reason: 'dislike' };
  if (!q || q.status !== 'open') return { ok: false, reason: 'closed' };
  q.status = 'active';
  const giver = state.villagers.find((v) => v.id === q.giverId);
  if (giver) { giver.line = q.offer; giver.sayLeft = 4; }
  bump(state);
  return { ok: true, line: q.offer };
}

export function turnInQuest(state, id) {
  ensureVillageAi(state);
  const q = (state.npcQuests || []).find((item) => item.id === id);
  if (!q || q.status !== 'active') return { ok: false, reason: 'inactive' };
  if (q.need && Object.keys(q.need).some((k) => (state.resources[k] || 0) < q.need[k])) {
    return { ok: false, reason: 'need' };
  }
  if (q.id === 'chicken') {
    const p = state.villagers.find((v) => v.player);
    const near = !!(p && q.spot && Math.hypot(p.gx - q.spot.gx, p.gz - q.spot.gz) < 1.6);
    if (!q.found && !near) return { ok: false, reason: 'lost' };
    q.found = true;
  }
  if (q.need) {
    Object.keys(q.need).forEach((k) => { state.resources[k] = round3(state.resources[k] - q.need[k]); });
  }
  Object.keys(q.reward || {}).forEach((k) => addRes(state, k, q.reward[k]));
  q.status = 'done';
  const giver = state.villagers.find((v) => v.id === q.giverId);
  if (giver) { giver.line = q.done; giver.sayLeft = 4; }
  bump(state);
  return { ok: true, line: q.done };
}

export function retarget(state) {
  ensureVillageAi(state);
  const working = state.hour >= 7 && state.hour < 17;
  state.villagers.forEach((v) => {
    if (v.player) {
      if (working && v.job !== 'idle') {
        const w = workplace(state, v.job);
        if (w) {
          v.mode = 'work';
          v.workId = w.id;
          v.tx = w.gx + 0.4;
          v.tz = w.gz + 0.55;
          return;
        }
      }
      v.mode = 'home';
      sendHome(state, v);
      return;
    }
    assignGoal(state, v);
    v.tx = v.goalGx;
    v.tz = v.goalGz;
  });
  const phase = herdPhase(state.hour);
  state.animals.forEach((a) => {
    if (a.ridden) return;
    const goal = herdSpot(state, a.kind, phase);
    const spread = ((a.id % 5) - 2) * 0.32;
    const spot = fitPoint(goal.gx + spread, goal.gz + ((a.id % 3) - 1) * 0.24);
    a.tx = spot.gx;
    a.tz = spot.gz;
    a.mode = phase === 'pasture' ? 'graze' : 'idle';
  });
}

function snap(state) {
  state.villagers.forEach((v) => {
    v.gx = v.tx;
    v.gz = v.tz;
  });
  state.animals.forEach((a) => {
    a.gx = a.tx;
    a.gz = a.tz;
  });
}

function growField(state, b) {
  if (!b || b.type !== 'field') return;
  if (b.stage === 0 || b.stage === 3 || b.stage === 4) return;
  if (state.season === 3) return;
  const rate = state.season === 1 ? 14 : state.season === 0 ? 12 : 7;
  b.growth = Math.min(100, b.growth + rate);
  if (b.growth >= 35) b.stage = 2;
  if (b.growth >= 100) {
    b.growth = 100;
    b.stage = 3;
  }
}

function produce(state, v) {
  const b = byId(state, v.workId);
  if (v.job === 'builder') {
    if (b && b.type === 'quarry') addRes(state, 'stone', 1.5 * b.level);
    else addRes(state, 'wood', 2 * ((b && b.level) || 1));
    return;
  }
  if (v.job === 'farmer') {
    if (b && b.type === 'field') growField(state, b);
    else if (b && b.type === 'vineyard' && state.season !== 3) {
      addRes(state, 'food', state.season === 1 ? 1.2 : state.season === 2 ? 0.8 : 0.35);
    } else if (b && String(b.type).startsWith('orchard') && state.season !== 3) {
      addRes(state, 'food', state.season === 0 ? 0.3 : 0.9);
    }
    return;
  }
  if (v.job === 'baker') {
    if (state.resources.flour >= 1) {
      state.resources.flour = round3(state.resources.flour - 1);
      addRes(state, 'food', 2 * ((b && b.level) || 1));
    } else if (state.resources.grain >= 1) {
      state.resources.grain = round3(state.resources.grain - 1);
      addRes(state, 'food', 2 * ((b && b.level) || 1));
    }
    return;
  }
  if (v.job === 'miller' && state.resources.grain >= 1) {
    state.resources.grain = round3(state.resources.grain - 1);
    addRes(state, 'flour', 1);
    return;
  }
  if (v.job === 'weaver' && state.resources.wool >= 2) {
    state.resources.wool = round3(state.resources.wool - 2);
    addRes(state, 'cloth', 1);
    return;
  }
  if (v.job === 'smith' && state.resources.stone >= 1) {
    state.resources.stone = round3(state.resources.stone - 1);
    addRes(state, 'tools', 1);
    return;
  }
  if (v.job === 'host') {
    if (state.resources.water >= 1 && state.resources.food >= 1) {
      state.resources.water = round3(state.resources.water - 1);
      state.resources.food = round3(state.resources.food - 1);
      addRes(state, 'money', 3);
      state.villagers.forEach((p) => { p.happiness = clamp(p.happiness + 1); });
    }
    if (state.resources.wool >= 2) {
      state.resources.wool = round3(state.resources.wool - 2);
      addRes(state, 'money', 5);
    }
    return;
  }
  if (v.job === 'teacher') {
    state.learning = (state.learning || 0) + 1;
    return;
  }
  if (v.job === 'healer') {
    const worst = state.villagers.reduce((m, p) => (p.happiness < m.happiness ? p : m), state.villagers[0]);
    if (worst) worst.happiness = clamp(worst.happiness + 3);
  }
}

function chain(state) {
  const baker = state.hour >= 7 && state.hour < 17 && state.villagers.some((v) => v.job === 'baker');
  if (state.resources.milk >= (baker ? 1 : 2)) {
    const take = baker ? 1 : 2;
    state.resources.milk = round3(state.resources.milk - take);
    addRes(state, 'food', baker ? 2 : 1);
  }
  if (state.resources.eggs >= 2) {
    state.resources.eggs = round3(state.resources.eggs - 2);
    addRes(state, 'food', 1);
  }
}

export function averageHappiness(state) {
  if (!state.villagers.length) return 0;
  return state.villagers.reduce((s, v) => s + v.happiness, 0) / state.villagers.length;
}

function yearOf(state) {
  return Math.floor((state.day - 1) / (SEASON_DAYS * 4));
}

function recompute(state) {
  let level = 1;
  if (state.springFixed && state.mosqueClean) level = 2;
  if (level >= 2 && state.buildings.some((b) => b.type === 'school') && state.villagers.some((v) => v.job === 'teacher')) level = 3;
  if (level >= 3 && state.harvested >= 1) level = 4;
  if (level >= 4 && state.quests.newroz) level = 5;
  state.level = level;
  if (state.springFixed) state.quests.spring = true;
  if (state.buildings.some((b) => b.type === 'school')) state.quests.school = true;
}

export function stepHour(state) {
  const working = state.hour >= 7 && state.hour < 17;
  const winter = state.season === 3;
  addRes(state, 'water', state.springFixed ? 1.2 : 0.25);
  state.buildings.forEach((b) => {
    if (b.type !== 'field' || !b.sown || b.stage < 1 || b.stage >= 3) return;
    b.growth = (b.growth || 0) + (b.watered ? 14 : 8);
    if (b.growth >= 100) {
      b.growth = 0;
      b.stage += 1;
    }
  });
  const shepherdOn = working && state.villagers.some((v) => v.job === 'shepherd');
  const animalMul = (winter ? 0.65 : 1) * (shepherdOn ? 2.2 : 1);
  state.animals.forEach((a) => {
    if (a.ridden) return;
    if (a.kind === 'sheep') {
      addRes(state, 'wool', 0.16 * animalMul);
      addRes(state, 'milk', 0.05 * animalMul);
    }
    if (a.kind === 'goat') addRes(state, 'milk', 0.18 * animalMul);
    if (a.kind === 'cow') addRes(state, 'milk', 0.42 * animalMul);
    if (a.kind === 'chicken') addRes(state, 'eggs', 0.2 * animalMul);
  });
  if (working) {
    state.villagers.forEach((v) => {
      if (v.job === 'idle') return;
      produce(state, v);
      v.rest = clamp(v.rest - 2);
    });
  } else {
    state.villagers.forEach((v) => {
      v.rest = clamp(v.rest + (state.hour >= 18 || state.hour < 6 ? 6 : 2));
    });
  }
  state.villagers.forEach((v) => { v.fullness = clamp(v.fullness - 3); });
  if ([8, 13, 19].includes(state.hour) && state.resources.food >= state.villagers.length && state.villagers.length) {
    state.resources.food = round3(state.resources.food - state.villagers.length);
    state.villagers.forEach((v) => { v.fullness = clamp(v.fullness + 26); });
  }
  chain(state);
  const clinic = working && state.villagers.some((v) => v.job === 'healer');
  const school = working && state.villagers.some((v) => v.job === 'teacher');
  state.villagers.forEach((v) => {
    let d = (v.fullness - 55) * 0.04 + (v.rest - 50) * 0.03;
    if (state.mosqueClean) d += 0.45;
    if (state.buildings.some((b) => b.type === 'mosque')) d += 0.2;
    if (clinic) d += 0.7;
    if (school) d += 0.35;
    if (winter && state.resources.food < state.villagers.length) d -= 0.6;
    if (!working) d += 0.12;
    v.happiness = clamp(v.happiness + d);
  });
  state.hour += 1;
  if (state.hour === 12 && state.adhanDay !== state.day) {
    state.adhanDay = state.day;
    state.adhan = 1;
  }
  if (state.hour >= 24) {
    state.hour = 0;
    state.day += 1;
    state.seasonDay += 1;
    if (state.seasonDay >= SEASON_DAYS) {
      state.seasonDay = 0;
      state.season = (state.season + 1) % 4;
    }
  }
  state.ticks += 1;
  ensureGoals(state);
  retarget(state);
  recompute(state);
  bump(state);
}

export function advanceHours(state, n) {
  const k = Math.max(0, Math.floor(n));
  for (let i = 0; i < k; i += 1) stepHour(state);
  snap(state);
}

export function setHour(state, hour) {
  state.hour = ((Math.floor(hour) % 24) + 24) % 24;
  retarget(state);
  snap(state);
  bump(state);
}

export function setSeason(state, name) {
  const i = SEASONS.indexOf(name);
  if (i < 0) return { ok: false };
  state.season = i;
  state.seasonDay = 0;
  bump(state);
  return { ok: true };
}

export const VEHICLE_SPEED = { cart: 1.55 };
const VEHICLE_KINDS = ['cart'];

/** How many vehicles get a full update. The rest wait or skip. */
export function vehicleCap(low) {
  return low ? 4 : 8;
}

function traceCells(x0, z0, x1, z1) {
  const cells = [];
  let x = x0;
  let z = z0;
  cells.push({ gx: x, gz: z });
  const sx = Math.sign(x1 - x0);
  const sz = Math.sign(z1 - z0);
  let guard = 0;
  while ((x !== x1 || z !== z1) && guard < 120) {
    guard += 1;
    if (x !== x1 && (z === z1 || Math.abs(x1 - x) >= Math.abs(z1 - z))) x += sx;
    else z += sz;
    cells.push({ gx: x, gz: z });
  }
  return cells;
}

/** Closed lane around the mosque. Cars lap this graph, not a navmesh. */
export function roadLoop() {
  const corners = [[MX - 1, MZ - 1], [MX + 1, MZ - 1], [MX + 1, MZ + 1], [MX - 1, MZ + 1]];
  const loop = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    const seg = traceCells(a[0], a[1], b[0], b[1]);
    seg.forEach((cell, idx) => {
      if (i > 0 && idx === 0) return;
      loop.push(cell);
    });
  });
  if (loop.length > 1) {
    const a = loop[0];
    const b = loop[loop.length - 1];
    if (a.gx === b.gx && a.gz === b.gz) loop.pop();
  }
  return loop;
}

function shuttleLoop(x0, z0, x1, z1) {
  const go = traceCells(x0, z0, x1, z1);
  const back = traceCells(x1, z1, x0, z0).slice(1, -1);
  return go.concat(back);
}

function solidAt(state, gx, gz) {
  const rx = Math.round(gx);
  const rz = Math.round(gz);
  const plot = state.buildings.find((b) => b.gx === rx && b.gz === rz);
  if (!plot) return false;
  return plot.type !== 'field';
}

function addVehicle(state, kind, gx, gz, route, path) {
  const v = {
    id: state.nextId++,
    kind,
    route: route || '',
    gx,
    gz,
    yaw: 0,
    speed: 0,
    path: path || null,
    pathI: 0,
    pathSig: '',
    ai: 'idle',
    hold: false,
    updated: true,
    occupied: false,
    stopped: false,
    travel: 0,
  };
  state.vehicles.push(v);
  return v;
}

function spawnVehicles(state) {
  const ring = roadLoop();
  const lead = addVehicle(state, 'cart', ring[0].gx, ring[0].gz, 'ring', ring.map((c) => ({ gx: c.gx, gz: c.gz })));
  lead.yaw = 0;
  addVehicle(state, 'cart', 28, MZ, 'east', shuttleLoop(28, MZ, 48, MZ));
  addVehicle(state, 'cart', 40, MZ, 'east', shuttleLoop(40, MZ, 54, MZ));
  addVehicle(state, 'cart', 18, 44, 'south', shuttleLoop(18, 44, 18, 58));
  addVehicle(state, 'cart', 18, 52, 'south', shuttleLoop(18, 52, 18, 64));
  addVehicle(state, 'cart', 34, MZ, 'east', shuttleLoop(34, MZ, 46, MZ));
}

function ensureVehicles(state) {
  if (!Array.isArray(state.vehicles)) state.vehicles = [];
  if (!state.drivenId) state.drivenId = 0;
  if (!state.vehicles.length) spawnVehicles(state);
}

function peopleNear(state, gx, gz, radius) {
  return state.villagers.some((v) => Math.hypot(v.gx - gx, v.gz - gz) < radius);
}

function followVehiclePath(state, v, dt) {
  if (!v.path || !v.path.length) {
    v.path = v.path || [];
    v.pathI = 0;
  }
  if (!v.path.length) return;
  if (peopleNear(state, v.gx, v.gz, 1.15)) {
    v.stopped = true;
    v.speed = 0;
    return;
  }
  v.stopped = false;
  const wp = v.path[v.pathI % v.path.length];
  const dx = wp.gx - v.gx;
  const dz = wp.gz - v.gz;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.18) {
    v.pathI = (v.pathI + 1) % v.path.length;
    return;
  }
  v.yaw = Math.atan2(dx, dz);
  const spd = Math.min(dist, (VEHICLE_SPEED[v.kind] || 2) * dt);
  const nx = v.gx + (dx / dist) * spd;
  const nz = v.gz + (dz / dist) * spd;
  if (!playable(nx, nz) || solidAt(state, nx, nz)) {
    v.stopped = true;
    v.speed = 0;
    return;
  }
  v.gx = nx;
  v.gz = nz;
  v.speed = VEHICLE_SPEED[v.kind] || 2;
  v.travel = (v.travel || 0) + spd;
}

/** Local drivers. Far vehicles and extras past the cap update less often. */
export function stepVehicles(state, dt, opts = {}) {
  ensureVehicles(state);
  const cap = vehicleCap(!!opts.low);
  const focus = opts.focus;
  const list = state.vehicles.slice();
  list.forEach((v) => {
    v._d = focus ? Math.hypot(v.gx - focus.gx, v.gz - focus.gz) : 0;
  });
  list.sort((a, b) => a._d - b._d || a.id - b.id);
  list.forEach((v, i) => {
    if (!VEHICLE_KINDS.includes(v.kind)) return;
    if (v.occupied) {
      v.ai = 'driven';
      v.hold = false;
      v.updated = true;
      return;
    }
    const far = focus && focus.r != null && v._d > focus.r + 0.001;
    const skipThrottle = i >= cap && ((state.ticks + v.id) % 4 !== 0);
    if (far || skipThrottle) {
      v.ai = far ? 'lod' : 'throttle';
      v.updated = false;
      v.hold = true;
      return;
    }
    v.ai = i >= cap ? 'throttle' : 'active';
    v.hold = false;
    v.updated = true;
    followVehiclePath(state, v, dt);
  });
}

function animalGoal(state, a) {
  const phase = herdPhase(state.hour);
  const goal = herdSpot(state, a.kind, phase);
  const spread = ((a.id % 5) - 2) * 0.32;
  return fitPoint(goal.gx + spread, goal.gz + ((a.id % 3) - 1) * 0.24);
}

function herderForAnimal(state, a) {
  const list = herderList(state);
  if (!list.length) return null;
  const herd = herdName(a.kind);
  const idx = { flock: 0, cattle: 1, poultry: 2, pack: 3 }[herd] || 0;
  return list[idx % list.length];
}

/** Idle, wander, graze, or follow the herder. Far animals update less often. */
export function stepAnimals(state, dt, opts = {}) {
  const cap = animalCap(!!opts.low);
  const focus = opts.focus;
  const list = state.animals.slice();
  list.forEach((a) => {
    a._d = focus ? Math.hypot(a.gx - focus.gx, a.gz - focus.gz) : 0;
  });
  list.sort((x, y) => x._d - y._d || x.id - y.id);
  list.forEach((a, i) => {
    if (a.ridden) {
      a.ai = 'ridden';
      a.mode = 'ridden';
      a.hold = true;
      a.updated = true;
      return;
    }
    const far = focus && focus.r != null && a._d > focus.r + 0.001;
    const skipThrottle = i >= cap && ((state.ticks + a.id) % 4 !== 0);
    if (far || skipThrottle) {
      a.ai = far ? 'lod' : 'throttle';
      a.updated = false;
      a.hold = true;
      return;
    }
    a.ai = i >= cap ? 'throttle' : 'active';
    a.hold = false;
    a.updated = true;
    const goal = animalGoal(state, a);
    const herder = herderForAnimal(state, a);
    const phase = herdPhase(state.hour);
    const nearHerder = herder && herder.mode !== 'mosque' && Math.hypot(herder.gx - a.gx, herder.gz - a.gz) < 6;
    if (nearHerder) {
      a.mode = 'follow';
      const spot = fitPoint(herder.gx + ((a.id % 3) - 1) * 0.45, herder.gz + 0.7);
      a.tx = spot.gx;
      a.tz = spot.gz;
    } else if (Math.hypot(a.gx - goal.gx, a.gz - goal.gz) > 1.35) {
      a.mode = 'wander';
      a.tx = goal.gx;
      a.tz = goal.gz;
    } else {
      const beat = (state.ticks + a.id) % 4;
      a.mode = beat === 0 ? 'idle' : beat === 1 ? 'wander' : 'graze';
      if (a.mode === 'wander') {
        const spot = fitPoint(goal.gx + Math.sin(a.id) * 0.7, goal.gz + Math.cos(a.id) * 0.55);
        a.tx = spot.gx;
        a.tz = spot.gz;
      } else {
        a.tx = a.gx;
        a.tz = a.gz;
      }
    }
    if (a.kind === 'donkey' && !a.ridden && phase === 'pen' && a.load > 0) {
      const pen = herdSpot(state, 'donkey', 'pen');
      if (Math.hypot(a.gx - pen.gx, a.gz - pen.gz) < 1.6) {
        const drop = Math.min(a.load, 1);
        addRes(state, 'wool', drop);
        a.load = Math.max(0, a.load - drop);
      }
    }
    const dx = a.tx - a.gx;
    const dz = a.tz - a.gz;
    if (Math.hypot(dx, dz) > 0.05) a.yaw = Math.atan2(dx, dz);
  });
}

/** Donkeys that are not being ridden can carry a larger load. */
export function carryBudget(state) {
  return state.animals.filter((a) => a.kind === 'donkey').reduce((sum, a) => sum + (a.ridden ? 2 : 8), 0);
}

export function moveGoods(state, key, amount) {
  const cap = carryBudget(state);
  const have = state.resources[key] || 0;
  const budget = Math.max(0, Math.min(amount, cap, have));
  let left = budget;
  state.animals.forEach((a) => {
    if (a.kind !== 'donkey' || left <= 0) return;
    const space = (a.ridden ? 2 : 8) - (a.load || 0);
    const take = Math.min(Math.max(space, 0), left);
    a.load = (a.load || 0) + take;
    left -= take;
  });
  const moved = budget - left;
  state.lastHaul = moved;
  return { ok: true, moved, cap };
}

export function nearestAnimal(state, kind, gx, gz, radius = 1.7) {
  let best = null;
  let bestD = radius;
  state.animals.forEach((a) => {
    if (a.ridden) return;
    if (kind && a.kind !== kind) return;
    const d = Math.hypot(a.gx - gx, a.gz - gz);
    if (d < bestD) { best = a; bestD = d; }
  });
  return best;
}

export function enterAnimal(state, id) {
  const a = state.animals.find((item) => item.id === id);
  const p = state.villagers.find((item) => item.player);
  if (!a || a.kind !== 'donkey' || !p) return { ok: false, reason: 'missing' };
  if (Math.hypot(p.gx - a.gx, p.gz - a.gz) > 1.7) return { ok: false, reason: 'far' };
  state.animals.forEach((item) => { item.ridden = false; });
  state.vehicles.forEach((item) => { item.occupied = false; });
  state.drivenId = 0;
  a.ridden = true;
  a.mode = 'ridden';
  state.riddenId = a.id;
  p.gx = a.gx;
  p.gz = a.gz;
  p.tx = a.gx;
  p.tz = a.gz;
  bump(state);
  return { ok: true, id: a.id };
}

export function exitAnimal(state) {
  const a = state.animals.find((item) => item.id === state.riddenId);
  const p = state.villagers.find((item) => item.player);
  if (!a || !p) return { ok: false, reason: 'none' };
  a.ridden = false;
  a.mode = 'idle';
  state.riddenId = 0;
  const spot = fitPoint(a.gx + Math.cos(a.yaw || 0) * 0.8, a.gz - Math.sin(a.yaw || 0) * 0.8);
  if (!solidAt(state, spot.gx, spot.gz)) {
    p.gx = spot.gx;
    p.gz = spot.gz;
  }
  p.tx = p.gx;
  p.tz = p.gz;
  bump(state);
  return { ok: true };
}

export function rideAnimal(state, id, steer, throttle, dt) {
  const a = state.animals.find((item) => item.id === id);
  const p = state.villagers.find((item) => item.player);
  if (!a || !a.ridden) return { ok: false, reason: 'empty' };
  const step = Math.min(Math.max(dt, 0), 0.1);
  const gas = Math.max(-1, Math.min(1, throttle || 0));
  const turn = Math.max(-1, Math.min(1, steer || 0));
  a.yaw = (a.yaw || 0) + turn * 1.4 * step;
  const spd = gas * DONKEY_SPEED;
  if (Math.abs(spd) < 0.01) return { ok: true, moved: false, gx: a.gx, gz: a.gz, yaw: a.yaw };
  const nx = a.gx + Math.sin(a.yaw) * spd * step;
  const nz = a.gz + Math.cos(a.yaw) * spd * step;
  const boxed = solidAt(state, a.gx, a.gz);
  if (!playable(nx, nz) || (solidAt(state, nx, nz) && !boxed)) {
    return { ok: false, hit: true, gx: a.gx, gz: a.gz, yaw: a.yaw };
  }
  a.gx = nx;
  a.gz = nz;
  a.tx = nx;
  a.tz = nz;
  if (p) {
    p.gx = nx;
    p.gz = nz;
    p.tx = nx;
    p.tz = nz;
  }
  return { ok: true, moved: true, gx: nx, gz: nz, yaw: a.yaw };
}

export function nearestVehicle(state, gx, gz, radius = 1.7) {
  ensureVehicles(state);
  let best = null;
  let bestD = radius;
  state.vehicles.forEach((v) => {
    if (v.occupied) return;
    const d = Math.hypot(v.gx - gx, v.gz - gz);
    if (d < bestD) { best = v; bestD = d; }
  });
  return best;
}

export function enterVehicle(state, id) {
  ensureVehicles(state);
  const v = state.vehicles.find((item) => item.id === id);
  const p = state.villagers.find((item) => item.player);
  if (!v || !p) return { ok: false, reason: 'missing' };
  if (Math.hypot(p.gx - v.gx, p.gz - v.gz) > 1.7) return { ok: false, reason: 'far' };
  state.vehicles.forEach((item) => { item.occupied = false; });
  state.animals.forEach((item) => { item.ridden = false; });
  state.riddenId = 0;
  v.occupied = true;
  state.drivenId = v.id;
  p.gx = v.gx;
  p.gz = v.gz;
  p.tx = v.gx;
  p.tz = v.gz;
  bump(state);
  return { ok: true, id: v.id, kind: v.kind };
}

export function exitVehicle(state) {
  ensureVehicles(state);
  const v = state.vehicles.find((item) => item.id === state.drivenId);
  const p = state.villagers.find((item) => item.player);
  if (!v || !p) return { ok: false, reason: 'none' };
  v.occupied = false;
  state.drivenId = 0;
  const spot = { gx: v.gx + Math.cos(v.yaw) * 0.85, gz: v.gz - Math.sin(v.yaw) * 0.85 };
  if (playable(spot.gx, spot.gz) && !solidAt(state, spot.gx, spot.gz)) {
    p.gx = spot.gx;
    p.gz = spot.gz;
  } else {
    p.gx = v.gx;
    p.gz = v.gz;
  }
  p.tx = p.gx;
  p.tz = p.gz;
  bump(state);
  return { ok: true };
}

/** Left stick: steer (x) and throttle (y). Houses, the mosque, and the valley edge reject the move. */
export function driveVehicle(state, id, steer, throttle, dt) {
  ensureVehicles(state);
  const v = state.vehicles.find((item) => item.id === id);
  const p = state.villagers.find((item) => item.player);
  if (!v || !v.occupied) return { ok: false, reason: 'empty' };
  const step = Math.min(Math.max(dt, 0), 0.1);
  const gas = Math.max(-1, Math.min(1, throttle || 0));
  const turn = Math.max(-1, Math.min(1, steer || 0));
  v.yaw += turn * 1.8 * step;
  const spd = gas * (VEHICLE_SPEED[v.kind] || 2);
  if (Math.abs(spd) < 0.01) {
    v.speed = 0;
    return { ok: true, moved: false, gx: v.gx, gz: v.gz, yaw: v.yaw };
  }
  const nx = v.gx + Math.sin(v.yaw) * spd * step;
  const nz = v.gz + Math.cos(v.yaw) * spd * step;
  const crowded = state.villagers.some((person) => !person.player && Math.hypot(person.gx - nx, person.gz - nz) < 0.55);
  const crowdedCar = state.vehicles.some((other) => other.id !== v.id && Math.hypot(other.gx - nx, other.gz - nz) < 0.75);
  if (!playable(nx, nz) || solidAt(state, nx, nz) || crowded || crowdedCar) {
    v.speed = 0;
    v.stopped = true;
    return { ok: false, hit: true, gx: v.gx, gz: v.gz, yaw: v.yaw };
  }
  v.gx = nx;
  v.gz = nz;
  v.speed = Math.abs(spd);
  v.stopped = false;
  v.travel = (v.travel || 0) + Math.abs(spd) * step;
  if (p) {
    p.gx = nx;
    p.gz = nz;
    p.tx = nx;
    p.tz = nz;
  }
  return { ok: true, moved: true, gx: nx, gz: nz, yaw: v.yaw };
}

export function tick(state, dt, opts = {}) {
  ensureProgress(state);
  const step = Math.min(Math.max(dt, 0), 0.1);
  state.acc += step;
  let guard = 0;
  const hourLen = secondsThisHour(state.hour);
  while (state.acc >= hourLen && guard < 3) {
    state.acc -= hourLen;
    stepHour(state);
    guard += 1;
  }
  state.seconds = (state.seconds || 0) + step;
  if (state.swing > 0) state.swing = Math.max(0, state.swing - step);
  state.buildings.forEach((b) => { if (b.anim > 0) b.anim = Math.max(0, b.anim - step); });
  if (state.craftJob) {
    state.craftJob.left -= step;
    if (state.craftJob.left <= 0) finishCraft(state);
  }
  (state.nodes || []).forEach((n) => {
    if (!n.alive && state.seconds >= n.back) {
      n.alive = true;
      n.hp = 3;
    }
  });
  syncStage(state);
  stepThreats(state, step);
  stepNpcs(state, step, opts);
  stepQuarrels(state, step);
  stepVehicles(state, step, opts);
  stepAnimals(state, step, opts);
  autoCollect(state);
  integrate(state, step, opts);
}

export function integrate(state, dt, opts = {}) {
  const speed = 0.7;
  const moveOne = (a) => {
    const dx = a.tx - a.gx;
    const dz = a.tz - a.gz;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.03) {
      a.gx = a.tx;
      a.gz = a.tz;
      return;
    }
    const s = Math.min(dist, speed * dt);
    a.gx += (dx / dist) * s;
    a.gz += (dz / dist) * s;
  };
  const nearEnough = (a) => {
    if (!opts.focus) return true;
    if (a.player) return true;
    return Math.hypot(a.gx - opts.focus.gx, a.gz - opts.focus.gz) <= opts.focus.r + 0.001;
  };
  state.villagers.forEach((v) => {
    if (opts.skipPlayer && v.player) return;
    if (v.hold || v.ai === 'lod') { v.updated = false; return; }
    if (!nearEnough(v)) { v.updated = false; return; }
    v.updated = true;
    moveOne(v);
  });
  state.animals.forEach((a) => {
    if (a.ridden || a.hold || a.ai === 'lod') { a.updated = false; return; }
    if (!nearEnough(a)) { a.updated = false; return; }
    a.updated = true;
    moveOne(a);
  });
}

export function createState() {
  const state = {
    hour: 8,
    day: 1,
    season: 0,
    seasonDay: 0,
    level: 1,
    ticks: 0,
    acc: 0,
    rev: 1,
    nextId: 1,
    nameCursor: 0,
    mode: 'build',
    resources: {
      wood: 48, stone: 36, water: 18, food: 96, money: 40, grain: 4, milk: 0, wool: 0, eggs: 0,
      flour: 0, cloth: 0, tools: 0,
    },
    buildings: [],
    villagers: [],
    animals: [],
    springFixed: false,
    mosqueClean: false,
    quests: { spring: false, school: false, newroz: false },
    npcQuests: null,
    vehicles: [],
    drivenId: 0,
    riddenId: 0,
    easy: false,
    newrozYear: -1,
    harvested: 0,
    learning: 0,
    lastPlacedId: 0,
    lastPlantedId: 0,
    selectedId: 0,
  };
  const stamp = (type, gx, gz, opt = {}) => {
    if (isRoad(gx, gz) || occupied(state, gx, gz)) return;
    if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_D) return;
    addBuilding(state, type, gx, gz, opt);
  };
  stamp('mosque', MX, MZ, { level: 1 });
  stamp('spring', MX - 4, MZ + 3, { level: 1 });
  stamp('house', 18, 28, { tag: 'mullah', style: 0 });
  stamp('house', 20, 28, { tag: 'player', style: 1 });
  let houses = 0;
  for (let gz = MZ - 3; gz <= MZ + 15 && houses < 32; gz += 1) {
    for (let gx = MX - 5; gx <= MX + 11 && houses < 32; gx += 1) {
      if (isRoad(gx, gz) || !besideRoad(gx, gz)) continue;
      const dist = Math.hypot(gx - MX, gz - MZ);
      if (dist < 2.1 || dist > 8.5) continue;
      if ((gx * 3 + gz) % 5 === 0) continue;
      const before = state.buildings.length;
      stamp('house', gx, gz, { style: houses % 2 });
      if (state.buildings.length > before) houses += 1;
    }
  }
  let plots = 0;
  for (let gz = 0; gz < GRID_D && plots < 36; gz += 1) {
    for (let gx = 0; gx < GRID_W && plots < 36; gx += 1) {
      if (isRoad(gx, gz) || !besideRoad(gx, gz)) continue;
      const dist = Math.hypot(gx - MX, gz - MZ);
      if (dist < 9 || dist > 18) continue;
      if ((gx + gz) % 2 !== 0) continue;
      const before = state.buildings.length;
      stamp('field', gx, gz, { stage: plots % 4 === 0 ? 3 : 1, growth: plots % 4 === 0 ? 100 : 20 });
      if (state.buildings.length > before) plots += 1;
    }
  }
  [[22, 8], [26, 7], [16, 8], [8, 22], [8, 36], [30, 22], [12, 40], [36, 18]].forEach(([gx, gz]) => {
    stamp('field', gx, gz, { stage: 3, growth: 100 });
  });
  [[20, 6], [34, 8], [6, 40], [40, 62], [18, 64], [28, 64]].forEach(([gx, gz]) => {
    stamp('field', gx, gz, { stage: 0, growth: 0 });
  });
  [[46, 24], [48, 26], [46, 32], [48, 34], [44, 18], [40, 12]].forEach(([gx, gz]) => stamp('vineyard', gx, gz));
  stamp('tandoor', MX + 3, MZ + 2);
  stamp('mill', MX + 4, MZ + 4);
  stamp('smith', MX + 6, MZ + 2);
  stamp('loom', MX + 4, MZ - 3);
  stamp('school', MX - 2, MZ + 2);
  state.buildings.filter((b) => b.type === 'house' && !b.tag && b.id % 5 === 0).slice(0, 3).forEach((b) => { b.damage = 1; });
  const springB = state.buildings.find((b) => b.type === 'spring');
  if (springB) springB.damage = 1;
  stamp('pen_sheep', 16, 29);
  stamp('pen_goat', 20, 29);
  stamp('coop', 16, 31);
  [[34, 8], [36, 10], [38, 8], [34, 12]].forEach(([gx, gz], i) => {
    stamp(i % 2 ? 'orchard_walnut' : 'orchard_pom', gx, gz);
  });
  spawnVillager(state, true);
  while (state.villagers.length < 1 + NPC_COUNT && state.villagers.length < capacity(state)) spawnVillager(state);
  bindQuests(state);
  const player = state.villagers[0];
  const own = state.buildings.find((b) => b.tag === 'player');
  const mullahHome = state.buildings.find((b) => b.tag === 'mullah');
  const doorX = own ? own.gx - 0.15 : MX + 1;
  const doorZ = own ? own.gz + 0.85 : MZ - 1.2;
  player.gx = doorX;
  player.gz = doorZ;
  player.tx = doorX;
  player.tz = doorZ;
  player.ry = Math.atan2(MX - doorX, MZ - doorZ);
  if (own) player.homeId = own.id;
  const mullah = state.villagers.find((v) => !v.player && v.role === 'faithful');
  if (mullah) {
    mullah.role = 'mullah';
    mullah.name = 'Mullah Husen';
    mullah.nameCkb = 'مەلا حوسێن';
    mullah.prays = true;
    mullah.child = false;
    if (mullahHome) mullah.homeId = mullahHome.id;
    state.mullahId = mullah.id;
  }
  state.villagers.forEach((v) => {
    if (v.player) return;
    v.child = v.role === 'child';
    if (v.prays == null) v.prays = v.role === 'mullah' || v.id % 5 !== 0;
  });
  spawnHerds(state);
  spawnVehicles(state);
  retarget(state);
  state.villagers[0].gx = doorX;
  state.villagers[0].gz = doorZ;
  state.villagers[0].tx = doorX;
  state.villagers[0].tz = doorZ;
  state.villagers[0].ry = Math.atan2(MX - doorX, MZ - doorZ);
  recompute(state);
  ensureProgress(state);
  return state;
}

const UNLOCK_LEVEL = {
  house: 1, field: 1, spring: 1, tandoor: 1, woodyard: 1, coop: 1,
  mill: 2, pen_sheep: 2, pen_goat: 2,
  loom: 3, smith: 3,
  orchard_pom: 4, orchard_walnut: 4, vineyard: 4,
  school: 5, clinic: 5, teahouse: 5, quarry: 2,
  barn: 3, stable: 4, wall: 2,
  gate: 3, tower: 3, torchpost: 2, hound: 3,
};
const STAGE_OPEN = { barn: 2, stable: 4, wall: 2, pen_sheep: 4, pen_goat: 4 };
const JOB_LEVEL = {
  farmer: 1, baker: 1, builder: 1,
  miller: 2, shepherd: 2,
  weaver: 3, smith: 3,
  host: 4,
  teacher: 5, healer: 5,
};
const XP_FOR_RANK = [0, 0, 2, 4, 7, 11];

export function isUnlocked(state, type) {
  if (state.easy) return true;
  if ((STAGE_OPEN[type] || 99) <= (state.stage || 1)) return true;
  return (state.rank || 1) >= (UNLOCK_LEVEL[type] || 1);
}

export function jobUnlocked(state, job) {
  if (job === 'idle' || state.easy) return true;
  return (state.rank || 1) >= (JOB_LEVEL[job] || 1);
}

export function unlocks(rank) {
  return Object.keys(UNLOCK_LEVEL).filter((type) => UNLOCK_LEVEL[type] <= rank);
}

function applyPerks(state) {
  const rank = state.rank || 1;
  state.cosmetics = { clothes: rank >= 3, decor: rank >= 4, mosqueCourt: rank >= 5 };
}

function syncRank(state) {
  let rank = 1;
  const xp = state.xp || 0;
  for (let r = 5; r >= 1; r -= 1) {
    if (xp >= XP_FOR_RANK[r]) { rank = r; break; }
  }
  if (!state.rank) state.rank = 1;
  if (rank > state.rank) {
    state.rank = rank;
    state.notice = rank;
    applyPerks(state);
  }
}

export function grantXp(state, amount) {
  state.xp = (state.xp || 0) + amount;
  syncRank(state);
  bump(state);
  return { rank: state.rank, xp: state.xp, notice: state.notice || 0 };
}

export function setRank(state, rank) {
  const next = Math.max(1, Math.min(5, Math.floor(rank) || 1));
  state.rank = next;
  state.xp = XP_FOR_RANK[next];
  state.notice = next;
  applyPerks(state);
  bump(state);
  return { rank: next };
}

function ensureGoals(state) {
  if (state.goalDay === state.day && Array.isArray(state.goals) && state.goals.length === 3) return;
  state.goalDay = state.day;
  state.goals = [
    { id: 'place', done: false, reward: { wood: 4 } },
    { id: 'gather', done: false, reward: { food: 3 } },
    { id: 'greet', done: false, reward: { money: 2 } },
  ];
}

export function completeGoal(state, id) {
  ensureGoals(state);
  const goal = state.goals.find((item) => item.id === id);
  if (!goal || goal.done) return { ok: false };
  goal.done = true;
  Object.keys(goal.reward).forEach((key) => addRes(state, key, goal.reward[key]));
  grantXp(state, 1);
  return { ok: true, reward: goal.reward };
}

export const TUTORIAL_STEPS = ['tutHello', 'tutBuild', 'tutWalk', 'tutDone'];

export function advanceTutorial(state) {
  if (state.tutorial == null) state.tutorial = 0;
  if (state.tutorial < 0) return { ok: true, done: true, step: -1 };
  state.tutorial += 1;
  if (state.tutorial >= TUTORIAL_STEPS.length) {
    state.tutorial = -1;
    addRes(state, 'wood', 6);
    grantXp(state, 1);
  }
  bump(state);
  return { ok: true, done: state.tutorial < 0, step: state.tutorial };
}

export function dismissNotice(state) {
  state.notice = 0;
  bump(state);
}

export function autoCollect(state) {
  const player = state.villagers.find((v) => v.player);
  if (!player) return { got: false };
  let got = false;
  state.buildings.forEach((b) => {
    if (Math.hypot(b.gx - player.gx, b.gz - player.gz) > 1.8) return;
    if (b.type === 'field' && b.stage === 3) {
      addRes(state, 'grain', 2);
      addRes(state, 'food', 1);
      b.stage = 1;
      b.growth = 8;
      got = true;
    }
    if ((b.type === 'spring') && b.pickedHour !== state.hour) {
      b.pickedHour = state.hour;
      addRes(state, 'water', 1);
      got = true;
    }
  });
  if (got) completeGoal(state, 'gather');
  return { got };
}

const STAGES = [
  ['axe', 'wood', 'stone', 'house'],
  ['plant', 'harvest', 'flour', 'bread'],
  ['broom', 'clean'],
  ['deed', 'repair'],
  ['help', 'defend'],
  ['iron', 'sickle'],
];

export const RECIPES = [
  { id: 'axe', out: 'axe', n: 1, need: { wood: 2, stone: 1 }, stage: 1, tool: true },
  { id: 'pick', out: 'pick', n: 1, need: { wood: 2, stone: 2 }, stage: 1, tool: true },
  { id: 'broom', out: 'broom', n: 1, need: { wood: 1, fibre: 2 }, stage: 2, tool: true },
  { id: 'staff', out: 'staff', n: 1, need: { wood: 2 }, stage: 2, tool: true },
  { id: 'torch', out: 'torch', n: 1, need: { wood: 1, fibre: 1 }, stage: 2, tool: true },
  { id: 'rope', out: 'rope', n: 1, need: { wood: 1, fibre: 2 }, stage: 2 },
  { id: 'bucket', out: 'bucket', n: 1, need: { wood: 3, rope: 1 }, stage: 2, tool: true },
  { id: 'pot', out: 'pot', n: 1, need: { clay: 2, water: 1 }, stage: 3 },
  { id: 'fired', out: 'fired', n: 1, need: { pot: 1 }, stage: 3, place: 'tandoor' },
  { id: 'flour', out: 'flour', n: 1, need: { grain: 2 }, stage: 4, place: 'mill' },
  { id: 'bread', out: 'food', n: 2, need: { flour: 1, water: 1 }, stage: 4, place: 'tandoor' },
  { id: 'brick', out: 'brick', n: 2, need: { stone: 1, clay: 2 }, stage: 4 },
  { id: 'cloth', out: 'cloth', n: 1, need: { wool: 2 }, stage: 5, place: 'loom' },
  { id: 'iron', out: 'iron', n: 1, need: { ore: 2 }, stage: 6, place: 'smith' },
  { id: 'sickle', out: 'sickle', n: 1, need: { iron: 1, wood: 1 }, stage: 6, tool: true },
  { id: 'hoe', out: 'hoe', n: 1, need: { iron: 1, wood: 2 }, stage: 6, tool: true },
];

function goalMet(state, id) {
  const got = state.got || {};
  const built = state.built || {};
  const tools = state.tools || {};
  if (id === 'axe') return (tools.axe || 0) >= 1;
  if (id === 'wood') return (got.wood || 0) >= 10;
  if (id === 'stone') return (got.stone || 0) >= 5;
  if (id === 'house') return (built.house || 0) >= 1;
  if (id === 'plant') return (state.planted || 0) >= 1;
  if (id === 'rope') return (state.resources.rope || 0) >= 1 || (tools.bucket || 0) >= 1;
  if (id === 'tandoor') return (built.tandoor || 0) >= 1;
  if (id === 'pot') return (state.resources.pot || 0) + (state.resources.fired || 0) >= 1;
  if (id === 'flour') return (got.flour || 0) >= 1 || (state.resources.flour || 0) >= 1;
  if (id === 'harvest') return (state.harvested || 0) >= 1;
  if (id === 'bread') return (state.baked || 0) >= 3 || (got.food || 0) >= 5;
  if (id === 'help') return !!state.mosqueClean;
  if (id === 'school') return state.buildings.some((b) => b.type === 'school' && b.level >= 2);
  if (id === 'iron') return (state.resources.iron || 0) >= 1;
  if (id === 'sickle') return (tools.sickle || 0) + (tools.hoe || 0) >= 1;
  if (id === 'broom') return (tools.broom || 0) >= 1;
  if (id === 'clean') return (state.cleaned || 0) >= 2;
  if (id === 'deed') return (state.deedCount || 0) >= 1;
  if (id === 'repair') return (state.repaired || 0) >= 1;
  if (id === 'defend') return (state.defended || 0) >= 1;
  return false;
}

function syncStage(state) {
  ensureProgress(state);
  const index = Math.max(0, (state.stage || 1) - 1);
  const goals = STAGES[index];
  if (!goals) return;
  if (!goals.every((id) => goalMet(state, id))) return;
  if (state.stageClear === state.stage) return;
  state.stageClear = state.stage;
  addRes(state, 'money', 6);
  addRes(state, 'food', 2);
  state.stageNotice = state.stage;
  if (state.stage < STAGES.length) state.stage += 1;
  bump(state);
}

export function stageSnapshot(state) {
  ensureProgress(state);
  const index = Math.max(0, Math.min(STAGES.length, state.stage || 1) - 1);
  const goals = STAGES[index] || [];
  return {
    stage: state.stage || 1,
    last: STAGES.length,
    goals: goals.map((id) => ({ id, done: goalMet(state, id) })),
    notice: state.stageNotice || 0,
  };
}

export function dismissStage(state) {
  state.stageNotice = 0;
  bump(state);
}

function nearType(state, type) {
  const p = state.villagers.find((v) => v.player);
  if (!p) return false;
  return state.buildings.some((b) => b.type === type && Math.hypot(b.gx - p.gx, b.gz - p.gz) < 3.2);
}

export function recipeList(state) {
  ensureProgress(state);
  return RECIPES.map((r) => ({
    id: r.id,
    out: r.out,
    n: r.n,
    need: r.need,
    stage: r.stage,
    place: r.place || '',
    open: (state.stage || 1) >= r.stage,
    have: Object.keys(r.need).every((k) => (state.resources[k] || 0) >= r.need[k]),
  }));
}

function finishCraft(state) {
  const job = state.craftJob;
  state.craftJob = null;
  if (!job) return;
  const recipe = RECIPES.find((r) => r.id === job.id);
  if (!recipe) return;
  if (recipe.tool) {
    state.tools[recipe.out] = Math.min(2, (state.tools[recipe.out] || 0) + 1);
    if (!state.equipped) state.equipped = recipe.out;
  } else {
    addRes(state, recipe.out, recipe.n);
    state.got[recipe.out] = (state.got[recipe.out] || 0) + recipe.n;
  }
  state.craftNote = recipe.out;
  bump(state);
}

export function craft(state, id) {
  ensureProgress(state);
  if (state.craftJob) return { ok: false, reason: 'busy' };
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) return { ok: false, reason: 'missing' };
  if ((state.stage || 1) < recipe.stage) return { ok: false, reason: 'locked' };
  if (recipe.place && !nearType(state, recipe.place)) return { ok: false, reason: 'place', where: recipe.place };
  if (!Object.keys(recipe.need).every((k) => (state.resources[k] || 0) >= recipe.need[k])) return { ok: false, reason: 'cost' };
  Object.keys(recipe.need).forEach((k) => { state.resources[k] = round3(state.resources[k] - recipe.need[k]); });
  const tier = recipe.tool ? (state.tools[recipe.out] || 0) : 0;
  state.craftJob = { id, left: tier >= 1 ? 0.7 : 1.15 };
  bump(state);
  return { ok: true, left: state.craftJob.left };
}

export function equipTool(state, id) {
  if (!(state.tools && state.tools[id])) return { ok: false };
  state.equipped = id;
  bump(state);
  return { ok: true };
}

function ensureNodes(state) {
  if (Array.isArray(state.nodes) && state.nodes.length) return;
  state.nodes = [];
  let id = 1;
  const seeds = [];
  for (let i = 0; i < 36; i += 1) {
    const ang = i * 0.85;
    const dist = 3.2 + (i % 6) * 0.7;
    seeds.push([Math.round(MX + Math.cos(ang) * dist), Math.round(MZ + Math.sin(ang) * dist), i % 3 === 0 ? 'rock' : 'tree']);
  }
  seeds.forEach(([gx, gz, kind]) => {
    if (state.nodes.length >= 22) return;
    if (gx < 1 || gz < 1 || gx >= GRID_W - 1 || gz >= GRID_D - 1) return;
    if (isRoad(gx, gz) || occupied(state, gx, gz)) return;
    if (state.nodes.some((n) => n.gx === gx && n.gz === gz)) return;
    state.nodes.push({ id: id++, kind, gx, gz, alive: true, hp: 3, back: 0 });
  });
}

export function nearestNode(state, radius = 1.7) {
  ensureNodes(state);
  const p = state.villagers.find((v) => v.player);
  if (!p) return null;
  let best = null;
  let bestD = radius;
  state.nodes.forEach((n) => {
    if (!n.alive) return;
    const d = Math.hypot(n.gx - p.gx, n.gz - p.gz);
    if (d < bestD) { best = n; bestD = d; }
  });
  return best;
}

export function gather(state) {
  ensureProgress(state);
  const node = nearestNode(state, 1.75);
  if (!node) return { ok: false, reason: 'closer' };
  const tool = node.kind === 'rock' ? 'pick' : 'axe';
  const tier = state.tools[tool] || 0;
  if (!tier) return { ok: false, reason: tool === 'pick' ? 'needPick' : 'needAxe' };
  state.swing = 0.45;
  state.equipped = tool;
  const power = tier >= 2 ? 2 : 1;
  node.hp -= power;
  const key = node.kind === 'rock' ? 'stone' : 'wood';
  addRes(state, key, power);
  state.got[key] = (state.got[key] || 0) + power;
  if (node.kind === 'tree' && (node.id % 2 === 0)) {
    addRes(state, 'fibre', 1);
    state.got.fibre = (state.got.fibre || 0) + 1;
  }
  if (node.kind === 'rock' && (node.id % 3 === 0)) {
    addRes(state, 'clay', 1);
    state.got.clay = (state.got.clay || 0) + 1;
  }
  if (node.kind === 'rock' && node.id % 5 === 0) {
    addRes(state, 'ore', 1);
    state.got.ore = (state.got.ore || 0) + 1;
  }
  let cleared = false;
  if (node.hp <= 0) {
    node.alive = false;
    node.back = (state.seconds || 0) + 48;
    cleared = true;
  }
  bump(state);
  return { ok: true, key, n: power, kind: node.kind, cleared };
}

function bumpRep(state, n) {
  if (state.rep == null) state.rep = 8;
  state.rep = Math.max(-100, Math.min(100, Math.round(state.rep + n)));
}

function seedSpots(state) {
  state.spots = [0, 1, 2, 3].map((i) => ({
    id: i + 1,
    gx: MX + (i % 2 ? 0.45 : -0.35),
    gz: MZ + (i < 2 ? 0.4 : -0.3),
    on: 1,
  }));
}

function seedDeeds(state) {
  const adults = state.villagers.filter((v) => !v.player && v.role !== 'child' && v.role !== 'mullah');
  const kinds = ['water', 'bread', 'sheep', 'harvest', 'poor'];
  state.deeds = adults.slice(0, 4).map((v, i) => ({ id: i + 1, kind: kinds[i % kinds.length], giverId: v.id, status: 'open' }));
}

function playerOf(state) {
  return state.villagers.find((v) => v.player);
}

export function cleanSpot(state) {
  ensureProgress(state);
  const p = playerOf(state);
  if (!p) return { ok: false };
  if (!(state.tools.broom >= 1)) return { ok: false, reason: 'broom' };
  const spot = (state.spots || []).find((s) => s.on && Math.hypot(s.gx - p.gx, s.gz - p.gz) < 1.35);
  if (!spot) return { ok: false, reason: 'closer' };
  spot.on = 0;
  state.cleaned = (state.cleaned || 0) + 1;
  state.deedCount = (state.deedCount || 0) + 1;
  bumpRep(state, 8);
  state.spark = 0.8;
  const mullah = state.villagers.find((v) => v.role === 'mullah');
  if (mullah) { mullah.line = 'thanks'; mullah.sayLeft = 3; }
  if (state.amends) { state.amends = 0; bumpRep(state, 10); }
  bump(state);
  return { ok: true };
}

export function repairNear(state) {
  ensureProgress(state);
  const p = playerOf(state);
  if (!p) return { ok: false };
  const b = state.buildings.find((item) => item.damage && Math.hypot(item.gx - p.gx, item.gz - p.gz) < 1.6);
  if (!b) return { ok: false, reason: 'closer' };
  const cost = b.type === 'spring' ? { stone: 2, clay: 1 } : { wood: 2, stone: 1 };
  if (!canAfford(state, cost)) return { ok: false, reason: 'cost' };
  pay(state, cost);
  b.damage = 0;
  state.repaired = (state.repaired || 0) + 1;
  state.swing = 0.45;
  bumpRep(state, 6);
  if (state.amends) { state.amends = 0; bumpRep(state, 10); }
  bump(state);
  return { ok: true };
}

export function helpDeed(state, id) {
  ensureProgress(state);
  const d = (state.deeds || []).find((item) => item.id === id && item.status === 'open');
  const p = playerOf(state);
  if (!d || !p) return { ok: false };
  const giver = state.villagers.find((v) => v.id === d.giverId);
  if (giver && Math.hypot(giver.gx - p.gx, giver.gz - p.gz) > 1.8) return { ok: false, reason: 'closer' };
  if (d.kind === 'water' && (state.resources.water || 0) < 2) return { ok: false, reason: 'cost' };
  if ((d.kind === 'bread' || d.kind === 'poor') && (state.resources.food || 0) < 1) return { ok: false, reason: 'cost' };
  if (d.kind === 'water') state.resources.water = round3(state.resources.water - 2);
  if (d.kind === 'bread' || d.kind === 'poor') state.resources.food = round3(state.resources.food - 1);
  d.status = 'done';
  state.deedCount = (state.deedCount || 0) + 1;
  addRes(state, 'money', 3);
  bumpRep(state, 10);
  if (giver) { giver.line = 'thanks'; giver.sayLeft = 2.5; }
  bump(state);
  return { ok: true };
}

export function refuseDeed(state, id) {
  const d = (state.deeds || []).find((item) => item.id === id && item.status === 'open');
  if (!d) return { ok: false };
  d.status = 'refused';
  bumpRep(state, -8);
  const giver = state.villagers.find((v) => v.id === d.giverId);
  if (giver) { giver.line = 'scold1'; giver.sayLeft = 2.5; giver.angry = true; }
  bump(state);
  return { ok: true };
}

export function takeSelfish(state) {
  const p = playerOf(state);
  if (!p) return { ok: false };
  const field = state.buildings.find((b) => b.type === 'field' && b.stage === 3 && Math.hypot(b.gx - p.gx, b.gz - p.gz) < 1.5);
  if (field) {
    field.stage = 0;
    addRes(state, 'grain', 2);
    bumpRep(state, -12);
    bump(state);
    return { ok: true, kind: 'grain' };
  }
  bumpRep(state, -8);
  addRes(state, 'eggs', 1);
  bump(state);
  return { ok: true, kind: 'eggs' };
}

export function shove(state, id) {
  const v = state.villagers.find((item) => item.id === id && !item.player);
  const p = playerOf(state);
  if (!v || !p) return { ok: false };
  if (v.child || v.role === 'child') {
    v.tx = v.gx + 1.4;
    v.tz = v.gz + 0.4;
    v.line = 'childRun';
    v.sayLeft = 1.5;
    return { ok: false, reason: 'child' };
  }
  if (Math.hypot(v.gx - p.gx, v.gz - p.gz) > 1.7) return { ok: false, reason: 'closer' };
  v.stumble = 0.8;
  v.angry = true;
  v.line = 'angry';
  v.sayLeft = 2.4;
  const drop = 2 + (v.id % 3);
  addRes(state, 'money', drop);
  bumpRep(state, -24);
  state.offences = (state.offences || 0) + 1;
  state.villagers.forEach((other) => {
    if (other.player || other.id === v.id) return;
    if (Math.hypot(other.gx - v.gx, other.gz - v.gz) < 4) other.angry = true;
  });
  if (state.offences >= 3) state.confront = 1;
  bump(state);
  return { ok: true, dinar: drop };
}

export function acceptFine(state) {
  if (!state.confront) return { ok: false };
  if ((state.resources.money || 0) < 8) return { ok: false, reason: 'cost' };
  state.resources.money = round3(state.resources.money - 8);
  state.confront = 0;
  state.amends = 1;
  bumpRep(state, 4);
  const mullah = state.villagers.find((v) => v.role === 'mullah');
  if (mullah) { mullah.line = 'advise'; mullah.sayLeft = 3; }
  bump(state);
  return { ok: true };
}

const TRADE = {
  farmer: ['grain', 'barley'], baker: ['food', 'flour'], miller: ['flour', 'grain'], shepherd: ['wool', 'milk'], smith: ['tools'],
  weaver: ['cloth'], woodcutter: ['wood'], stonecutter: ['stone'], mullah: ['food'],
};
const BASE = { grain: 3, barley: 3, flour: 5, food: 8, wool: 5, milk: 4, tools: 8, cloth: 6, wood: 2, stone: 2, eggs: 3 };

export function tradeList(state, id) {
  const v = state.villagers.find((item) => item.id === id);
  if (!v) return [];
  const keys = TRADE[v.role] || ['food'];
  const rep = state.rep || 0;
  const mul = rep >= 40 ? 0.8 : rep < 0 ? 1.3 : 1;
  return keys.map((key) => ({ key, buy: Math.max(1, Math.round((BASE[key] || 3) * mul)), sell: Math.max(1, Math.round((BASE[key] || 3) * 0.6 * (rep >= 40 ? 1.25 : 1))) }));
}

export function tradeWith(state, id, key, dir) {
  const v = state.villagers.find((item) => item.id === id);
  if (!v || v.child || v.role === 'child') return { ok: false, reason: 'child' };
  if ((state.rep || 0) < -40 || v.angry) return { ok: false, reason: 'refuse' };
  const row = tradeList(state, id).find((item) => item.key === key);
  if (!row) return { ok: false };
  if (dir === 'buy') {
    if ((state.resources.money || 0) < row.buy) return { ok: false, reason: 'cost' };
    state.resources.money = round3(state.resources.money - row.buy);
    addRes(state, key, 1);
  } else {
    if ((state.resources[key] || 0) < 1) return { ok: false, reason: 'cost' };
    state.resources[key] = round3(state.resources[key] - 1);
    addRes(state, 'money', row.sell);
  }
  bump(state);
  return { ok: true };
}

export function setRaids(state, on) {
  state.raids = !!on;
  if (!on) state.threats = [];
  bump(state);
  return { ok: true, raids: state.raids };
}

export function spawnRaid(state) {
  state.threats = [
    { id: 1, kind: 'bandit', gx: MX, gz: MZ - 8, hp: 2, flee: 0 },
    { id: 2, kind: 'bandit', gx: MX + 2, gz: MZ - 7, hp: 2, flee: 0 },
  ];
  state.raidWarn = 1;
  return state.threats.length;
}

function stepThreats(state, dt) {
  if (!state.threats) state.threats = [];
  if (state.raids === false) { state.threats = []; return; }
  if (state.hour === 17 && state.day % 3 === 0 && state.warnDay !== state.day) {
    state.warnDay = state.day;
    state.raidWarn = 1;
  }
  if (state.hour === 18 && state.day % 3 === 0 && state.raidDay !== state.day) {
    state.raidDay = state.day;
    spawnRaid(state);
  }
  if ((state.hour >= 20 || state.hour < 5) && state.day % 2 === 0 && !state.threats.some((t) => t.kind === 'wolf')) {
    const pen = herdSpot(state, 'sheep', 'pen');
    state.threats.push({ id: 90 + state.day, kind: 'wolf', gx: pen.gx + 2, gz: pen.gz + 1, hp: 1, flee: 0 });
  }
  if (state.hour === 21 && state.day % 5 === 0 && !state.threats.some((t) => t.kind === 'bear')) {
    state.threats.push({ id: 80 + state.day, kind: 'bear', gx: 8, gz: 6, hp: 2, flee: 0 });
  }
  const p = playerOf(state);
  state.threats.forEach((t) => {
    const away = t.flee ? -1 : 1;
    const tx = t.flee ? t.gx : (t.kind === 'wolf' ? (herdSpot(state, 'sheep', 'pen').gx) : MX);
    const tz = t.flee ? (t.gz - 8) : (t.kind === 'wolf' ? herdSpot(state, 'sheep', 'pen').gz : MZ);
    const dx = tx - t.gx;
    const dz = tz - t.gz;
    const dist = Math.hypot(dx, dz) || 1;
    const spd = (t.flee ? 3.2 : 1.1) * dt * (away < 0 ? 1 : 1);
    t.gx += (dx / dist) * spd;
    t.gz += (dz / dist) * spd;
    if (p && !t.flee && Math.hypot(p.gx - t.gx, p.gz - t.gz) < 1.5 && (state.tools.torch || state.tools.staff)) {
      t.hp -= dt * 2;
    }
    state.villagers.forEach((v) => {
      if (v.player || t.flee) return;
      if (Math.hypot(v.gx - t.gx, v.gz - t.gz) < 1.3) t.hp -= dt;
    });
    if (t.hp <= 0 && !t.flee) {
      t.flee = 1;
      addRes(state, 'money', t.kind === 'bandit' ? 4 : 1);
      bumpRep(state, 6);
      state.defended = (state.defended || 0) + 1;
    }
  });
  state.threats = state.threats.filter((t) => !(t.flee && t.gz < MZ - 12));
}

export function bonk(state) {
  const p = playerOf(state);
  if (!p) return { ok: false };
  const t = (state.threats || []).find((item) => !item.flee && Math.hypot(item.gx - p.gx, item.gz - p.gz) < 1.8);
  if (!t) return { ok: false, reason: 'closer' };
  const power = t.kind === 'wolf' || t.kind === 'bear' ? ((state.tools.torch || 0) ? 2 : 1) : ((state.tools.staff || 0) ? 2 : 1);
  t.hp -= power;
  state.swing = 0.4;
  if (t.hp <= 0) {
    t.flee = 1;
    addRes(state, 'money', t.kind === 'bandit' ? 4 : 1);
    bumpRep(state, 6);
    state.defended = (state.defended || 0) + 1;
  }
  bump(state);
  return { ok: true, flee: !!t.flee };
}

const QUARREL_LINE = {
  land: ['qLandA', 'qLandB'],
  property: ['qPropA', 'qPropB'],
  house: ['qHouseA', 'qHouseB'],
  trade: ['qDealA', 'qDealB'],
};

function adultsOf(state) {
  return state.villagers.filter((v) => !v.player && v.role !== 'child' && v.role !== 'mullah' && !v.child);
}

function startQuarrel(state) {
  const adults = adultsOf(state);
  if (adults.length < 2) return;
  const topics = ['land', 'property', 'house', 'trade'];
  const topic = topics[state.day % topics.length];
  const i = state.day % adults.length;
  let j = (i + 1 + (state.day % 3)) % adults.length;
  if (j === i) j = (i + 1) % adults.length;
  state.quarrel = {
    a: adults[i].id,
    b: adults[j].id,
    topic,
    stage: 0,
    age: 0,
    settled: false,
  };
  state.quarrelNote = topic;
  state.nextQuarrelDay = state.day + 1 + (state.day % 2);
}

function endQuarrelMood(state, ids) {
  ids.forEach((id) => {
    const v = state.villagers.find((item) => item.id === id);
    if (!v) return;
    v.quarrel = false;
    v.grumpy = true;
    v.grumpyUntil = state.day + 1;
    v.happiness = clamp(v.happiness - 10);
    v.line = '';
  });
  state.villagers.forEach((v) => { v.happiness = clamp((v.happiness || 60) - 3); });
}

export function settleQuarrel(state, how) {
  ensureProgress(state);
  const q = state.quarrel;
  if (!q || q.settled) return { ok: false, reason: 'none' };
  const a = state.villagers.find((v) => v.id === q.a);
  const b = state.villagers.find((v) => v.id === q.b);
  q.settled = true;
  if (how === 'peace' || how === 'mullah') {
    bumpRep(state, how === 'mullah' ? 8 : 12);
    state.deedCount = (state.deedCount || 0) + 1;
    [a, b].forEach((v) => {
      if (!v) return;
      v.quarrel = false;
      v.grumpy = false;
      v.happiness = clamp((v.happiness || 60) + 6);
      v.line = 'qPeace';
      v.sayLeft = 2.4;
    });
  } else if (how === 'sideA' || how === 'sideB') {
    bumpRep(state, -2);
    const win = how === 'sideA' ? a : b;
    const lose = how === 'sideA' ? b : a;
    if (win) { win.quarrel = false; win.favor = (win.favor || 0) + 1; win.happiness = clamp((win.happiness || 60) + 4); win.line = 'qPeace'; win.sayLeft = 2; }
    if (lose) { lose.quarrel = false; lose.grumpy = true; lose.grumpyUntil = state.day + 1; lose.happiness = clamp((lose.happiness || 60) - 8); lose.line = 'scold1'; lose.sayLeft = 2; }
  } else {
    endQuarrelMood(state, [q.a, q.b]);
  }
  state.quarrel = null;
  bump(state);
  return { ok: true, how };
}

function stepQuarrels(state, dt) {
  if (state.quarrelsOn === false) {
    state.quarrel = null;
    return;
  }
  state.villagers.forEach((v) => {
    if (v.grumpyUntil != null && state.day > v.grumpyUntil) v.grumpy = false;
  });
  if (!state.quarrel) {
    if (state.day < (state.nextQuarrelDay || 2)) return;
    if (state.hour < 8 || state.hour > 18) return;
    startQuarrel(state);
    return;
  }
  const q = state.quarrel;
  q.age += dt;
  if (q.stage < 1 && q.age > 20) q.stage = 1;
  if (q.stage < 2 && q.age > 40) q.stage = 2;
  const a = state.villagers.find((v) => v.id === q.a);
  const b = state.villagers.find((v) => v.id === q.b);
  const lines = QUARREL_LINE[q.topic] || QUARREL_LINE.land;
  if (a && b) {
    a.quarrel = true;
    b.quarrel = true;
    a.line = lines[0];
    b.line = lines[1];
    a.sayLeft = 1.4;
    b.sayLeft = 1.4;
    const midX = (a.gx + b.gx) / 2;
    const midZ = (a.gz + b.gz) / 2;
    if (q.stage >= 1) {
      a.tx = midX + 0.3;
      a.tz = midZ;
      b.tx = midX - 0.3;
      b.tz = midZ;
    }
    if (q.stage >= 2) {
      adultsOf(state).forEach((v) => {
        if (v.id === a.id || v.id === b.id) return;
        if (Math.hypot(v.gx - midX, v.gz - midZ) < 3.5) {
          v.tx = midX;
          v.tz = midZ;
          v.line = 'qCrowd';
          v.sayLeft = 0.8;
        }
      });
    }
  }
  if (q.age > 75) {
    endQuarrelMood(state, [q.a, q.b]);
    state.quarrel = null;
    state.quarrelNote = 'ignored';
  }
}

function ensureProgress(state) {
  if (!state.rank) state.rank = 1;
  if (state.xp == null) state.xp = 0;
  if (state.tutorial == null) state.tutorial = 0;
  if (!state.notice) state.notice = 0;
  if (!state.stage) state.stage = 1;
  if (!state.got) state.got = {};
  if (!state.built) state.built = {};
  if (!state.tools) state.tools = {};
  if (state.seconds == null) state.seconds = 0;
  if (!state.resources.clay) state.resources.clay = state.resources.clay || 0;
  if (!state.resources.fibre) state.resources.fibre = 0;
  if (!state.resources.ore) state.resources.ore = 0;
  if (!state.resources.iron) state.resources.iron = 0;
  if (!state.resources.rope) state.resources.rope = 0;
  if (!state.resources.pot) state.resources.pot = 0;
  if (!state.resources.fired) state.resources.fired = 0;
  if (!state.resources.brick) state.resources.brick = 0;
  if (state.rep == null) state.rep = 8;
  if (state.raids == null) state.raids = true;
  if (state.quarrelsOn == null) state.quarrelsOn = true;
  if (state.nextQuarrelDay == null) state.nextQuarrelDay = 2;
  if (!state.spots) seedSpots(state);
  if (!state.deeds) seedDeeds(state);
  if (!state.threats) state.threats = [];
  applyPerks(state);
  ensureGoals(state);
  ensureNodes(state);
}

function priced(state, cost) {
  if (!cost || !state.easy) return cost;
  const out = {};
  Object.keys(cost).forEach((k) => { out[k] = Math.max(1, Math.ceil(cost[k] / 2)); });
  return out;
}

export function setEasy(state, on) {
  state.easy = !!on;
  bump(state);
  return { ok: true, easy: state.easy };
}

export function canPlace(state, type, gx, gz) {
  if (!COSTS[type] || !isUnlocked(state, type)) return false;
  if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_D) return false;
  if (isBlocked(gx, gz) || occupied(state, gx, gz)) return false;
  if (!canAfford(state, priced(state, COSTS[type]))) return false;
  return true;
}

export function suggestCell(state, type) {
  for (let gz = 0; gz < GRID_D; gz += 1) {
    for (let gx = 0; gx < GRID_W; gx += 1) {
      if (gx < 0) continue;
      if (isBlocked(gx, gz) || occupied(state, gx, gz)) continue;
      if (!COSTS[type]) continue;
      return { gx, gz };
    }
  }
  return null;
}

export function place(state, type, gx, gz) {
  if (!canPlace(state, type, gx, gz)) return { ok: false, reason: 'blocked' };
  pay(state, priced(state, COSTS[type]));
  grantXp(state, 1);
  completeGoal(state, 'place');
  state.built = state.built || {};
  state.built[type] = (state.built[type] || 0) + 1;
  const style = type === 'house' ? homes(state).length % 5 : 0;
  const b = addBuilding(state, type, gx, gz, { style, anim: 0.6 });
  state.lastPlacedId = b.id;
  state.selectedId = b.id;
  if (type === 'house') {
    while (state.villagers.length < Math.min(VILLAGER_CAP, capacity(state))) spawnVillager(state);
  }
  retarget(state);
  recompute(state);
  bump(state);
  return { ok: true, id: b.id };
}

export function upgrade(state, id) {
  const b = byId(state, id);
  if (!b) return { ok: false, reason: 'missing' };
  const max = MAX_LEVEL[b.type] || 1;
  if (b.level >= max) return { ok: false, reason: 'max' };
  const raw = (UPGRADE[b.type] || [])[b.level - 1];
  if (!raw) return { ok: false, reason: 'max' };
  const cost = priced(state, raw);
  if (!canAfford(state, cost)) return { ok: false, reason: 'cost' };
  pay(state, cost);
  b.level += 1;
  if (b.type === 'house') {
    while (state.villagers.length < Math.min(VILLAGER_CAP, capacity(state))) spawnVillager(state);
  }
  recompute(state);
  bump(state);
  return { ok: true, level: b.level };
}

export function demolish(state, id) {
  const b = byId(state, id);
  if (!b) return { ok: false, reason: 'missing' };
  if (b.type === 'mosque' || b.type === 'spring') return { ok: false, reason: 'fixed' };
  const cost = COSTS[b.type] || {};
  if (cost.wood) addRes(state, 'wood', Math.floor(cost.wood * 0.5));
  if (cost.stone) addRes(state, 'stone', Math.floor(cost.stone * 0.5));
  state.buildings = state.buildings.filter((x) => x.id !== id);
  state.villagers.forEach((v) => {
    if (v.homeId === id) v.homeId = 0;
    if (v.workId === id) {
      v.workId = 0;
      if (v.job !== 'idle' && !workplace(state, v.job)) v.job = 'idle';
    }
  });
  if (state.selectedId === id) state.selectedId = 0;
  retarget(state);
  recompute(state);
  bump(state);
  return { ok: true };
}

export function select(state, id) {
  state.selectedId = id || 0;
  bump(state);
}

export function assignJob(state, villagerId, job) {
  const v = state.villagers.find((x) => x.id === villagerId);
  if (!v) return { ok: false, reason: 'missing' };
  if (job !== 'idle' && !JOB_TYPES[job]) return { ok: false, reason: 'job' };
  if (!jobUnlocked(state, job)) return { ok: false, reason: 'locked' };
  if (job !== 'idle' && !workplace(state, job)) return { ok: false, reason: 'no-workplace' };
  v.job = job;
  v.workId = job === 'idle' ? 0 : workplace(state, job).id;
  retarget(state);
  recompute(state);
  bump(state);
  return { ok: true };
}

export function plant(state, id) {
  const b = byId(state, id);
  if (!b || b.type !== 'field') return { ok: false, reason: 'not-field' };
  if (state.season === 3) return { ok: false, reason: 'winter' };
  if (b.stage !== 0) return { ok: false, reason: 'busy' };
  b.stage = 1;
  b.growth = 0;
  b.sown = true;
  b.crop = b.crop || 'wheat';
  state.lastPlantedId = b.id;
  state.planted = (state.planted || 0) + 1;
  state.villagers.forEach((v) => {
    if (v.job === 'farmer') v.workId = b.id;
  });
  retarget(state);
  bump(state);
  return { ok: true };
}

export function sow(state, id, crop) {
  const b = byId(state, id);
  if (!b || b.type !== 'field') return { ok: false, reason: 'not-field' };
  b.crop = crop === 'barley' ? 'barley' : 'wheat';
  b.plowed = true;
  return plant(state, id);
}

export function waterField(state, id) {
  const b = byId(state, id);
  if (!b || b.type !== 'field') return { ok: false, reason: 'not-field' };
  if ((state.resources.water || 0) < 1) return { ok: false, reason: 'cost' };
  state.resources.water = round3(state.resources.water - 1);
  b.watered = true;
  bump(state);
  return { ok: true };
}

export function millGrain(state) {
  const p = state.villagers.find((v) => v.player);
  const mill = state.buildings.find((b) => b.type === 'mill');
  if (!p || !mill || Math.hypot(p.gx - mill.gx, p.gz - mill.gz) > 2.2) return { ok: false, reason: 'place' };
  const key = (state.resources.grain || 0) >= 2 ? 'grain' : ((state.resources.barley || 0) >= 2 ? 'barley' : '');
  if (!key) return { ok: false, reason: 'cost' };
  state.resources[key] = round3(state.resources[key] - 2);
  addRes(state, 'flour', 1);
  state.got.flour = (state.got.flour || 0) + 1;
  bump(state);
  return { ok: true };
}

export function bakeBread(state) {
  const p = state.villagers.find((v) => v.player);
  const oven = state.buildings.find((b) => b.type === 'tandoor');
  if (!p || !oven || Math.hypot(p.gx - oven.gx, p.gz - oven.gz) > 2.2) return { ok: false, reason: 'place' };
  if ((state.resources.flour || 0) < 1 || (state.resources.water || 0) < 1) return { ok: false, reason: 'cost' };
  state.resources.flour = round3(state.resources.flour - 1);
  state.resources.water = round3(state.resources.water - 1);
  addRes(state, 'food', 1);
  state.baked = (state.baked || 0) + 1;
  state.got.food = (state.got.food || 0) + 1;
  bump(state);
  return { ok: true };
}

export function harvest(state, id) {
  const b = byId(state, id);
  if (!b || b.type !== 'field') return { ok: false, reason: 'not-field' };
  if (b.stage !== 3) return { ok: false, reason: 'not-ready' };
  const pile = b.crop === 'barley' ? 'barley' : 'grain';
  if (!state.resources[pile] && pile === 'barley') state.resources.barley = 0;
  addRes(state, pile, 8);
  addRes(state, 'food', 1);
  b.stage = 0;
  b.growth = 0;
  b.plowed = true;
  state.harvested += 1;
  recompute(state);
  bump(state);
  return { ok: true };
}

export function fixSpring(state) {
  if (state.springFixed) return { ok: false, reason: 'done' };
  const cost = { stone: 8, wood: 5 };
  if (!canAfford(state, cost)) return { ok: false, reason: 'cost' };
  pay(state, cost);
  state.springFixed = true;
  state.quests.spring = true;
  recompute(state);
  bump(state);
  return { ok: true };
}

export function cleanMosque(state) {
  if (state.mosqueClean) return { ok: false, reason: 'done' };
  if (state.resources.water < 4) return { ok: false, reason: 'cost' };
  state.resources.water = round3(state.resources.water - 4);
  state.mosqueClean = true;
  recompute(state);
  bump(state);
  return { ok: true };
}

export function setStock(state, key, value) {
  if (!Object.prototype.hasOwnProperty.call(state.resources, key)) return { ok: false };
  state.resources[key] = value;
  return { ok: true };
}

export function celebrateNewroz(state) {
  if (state.season !== 0) return { ok: false, reason: 'season' };
  if (state.newrozYear === yearOf(state)) return { ok: false, reason: 'done' };
  if (!state.buildings.some((b) => b.type === 'teahouse')) return { ok: false, reason: 'tea' };
  if (state.resources.food < 12) return { ok: false, reason: 'food' };
  if (averageHappiness(state) < 45) return { ok: false, reason: 'happy' };
  state.resources.food = round3(state.resources.food - 8);
  addRes(state, 'money', 25);
  state.villagers.forEach((v) => { v.happiness = clamp(v.happiness + 12); });
  state.quests.newroz = true;
  state.newrozYear = yearOf(state);
  recompute(state);
  bump(state);
  return { ok: true };
}

export function snapshot(state) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.phase = phaseOf(state.hour);
  copy.seasonKey = SEASONS[state.season];
  copy.happiness = averageHappiness(state);
  return copy;
}

export function serialize(state) {
  return JSON.stringify({ v: 1, state });
}

export function parseSave(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !data.state || !data.state.resources || !Array.isArray(data.state.buildings)) return null;
    data.state.acc = data.state.acc || 0;
    data.state.rev = (data.state.rev || 0) + 1;
    const hour = data.state.hour;
    if (hour == null || hour < 6 || hour >= 18) {
      data.state.hour = 8;
      data.state.acc = 0;
    }
    if (data.state.season == null) data.state.season = 0;
    return data.state;
  } catch {
    return null;
  }
}

/** Screen delta to stick axes. Finger up (negative dy) is +Y. Finger right is +X. No inversion. */
export function stickVector(dx, dy, radius) {
  const R = Math.max(1, radius);
  let x = dx / R;
  let y = -dy / R;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

export function cameraBasis(yaw) {
  return {
    forward: { x: Math.sin(yaw), z: Math.cos(yaw) },
    right: { x: Math.cos(yaw), z: -Math.sin(yaw) },
  };
}

/** Third-person axes. Forward matches the walk camera. Right is screen-right, not flipped by RTL. */
export function viewAxes(yaw) {
  return {
    forward: { x: Math.sin(yaw), z: Math.cos(yaw) },
    right: { x: -Math.cos(yaw), z: Math.sin(yaw) },
  };
}

export function cameraEyeY(pitch, dist = 8) {
  return 1.4 + Math.sin(pitch) * dist;
}

/**
 * One walk step. moveY +1 is stick up (camera forward). moveX +1 is stick right.
 * lookX +1 turns the view right. lookY +1 looks up (camera eye drops, pitch falls).
 */
export function walkStep(pos, yaw, pitch, moveX, moveY, lookX, lookY, dt) {
  const { forward, right } = viewAxes(yaw);
  const nx = pos.x + (forward.x * moveY + right.x * moveX) * WALK_SPEED * dt;
  const nz = pos.z + (forward.z * moveY + right.z * moveX) * WALK_SPEED * dt;
  const nyaw = yaw - lookX * LOOK_YAW_SPEED * dt;
  const npitch = clamp(pitch - lookY * LOOK_PITCH_SPEED * dt, 0.18, 1.15);
  return { x: nx, z: nz, yaw: nyaw, pitch: npitch, forward, right };
}
