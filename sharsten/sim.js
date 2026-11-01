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
export function renderRadiusUnits(low) { return metersToUnits(low ? 28 : 38); }
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
export const SECONDS_PER_HOUR = 2;
export const SEASON_DAYS = 4;
export const VILLAGER_CAP = 25;
/** Non-player neighbours simulated on this device. No server and no online model. */
export const NPC_COUNT = 24;
const ROLES = ['farmer', 'shepherd', 'teacher', 'faithful'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export const WALK_SPEED = 6;
export const LOOK_YAW_SPEED = 1.5;
export const LOOK_PITCH_SPEED = 1.05;

const NAMES = ['Awin', 'Roj', 'Hevi', 'Dara', 'Shilan', 'Baran', 'Kardo', 'Lana'];
const NAMES_CKB = ['ئاوین', 'ڕۆژ', 'هێڤی', 'دارا', 'شیلان', 'باران', 'کاردۆ', 'لانا'];

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
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

const ROADS = new Map();

function traceRoad(kind, x0, z0, x1, z1) {
  let x = x0;
  let z = z0;
  const sx = Math.sign(x1 - x0);
  const sz = Math.sign(z1 - z0);
  const paint = (gx, gz) => {
    const prev = ROADS.get(`${gx},${gz}`);
    if (prev !== 'paved') ROADS.set(`${gx},${gz}`, kind);
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
traceRoad('paved', MX - 1, MZ - 1, MX + 1, MZ - 1);
traceRoad('paved', MX + 1, MZ - 1, MX + 1, MZ + 1);
traceRoad('paved', MX + 1, MZ + 1, MX - 1, MZ + 1);
traceRoad('paved', MX - 1, MZ + 1, MX - 1, MZ - 1);
traceRoad('paved', MX - 1, MZ - 1, LAYOUT.exits[0].gx, LAYOUT.exits[0].gz);
traceRoad('paved', MX + 1, MZ, LAYOUT.exits[1].gx, LAYOUT.exits[1].gz);
traceRoad('paved', MX, MZ + 1, LAYOUT.exits[2].gx, LAYOUT.exits[2].gz);
traceRoad('paved', MX + 1, MZ - 1, MX + 2, MZ - 2);
traceRoad('paved', MX + 2, MZ - 2, LAYOUT.loopApex.gx, LAYOUT.loopApex.gz);
traceRoad('paved', LAYOUT.loopApex.gx, LAYOUT.loopApex.gz, MX + 14, MZ - 2);
traceRoad('paved', MX + 2, MZ - 2, MX + 14, MZ - 2);
traceRoad('dirt', MX - 1, MZ, LAYOUT.westSpur.gx, LAYOUT.westSpur.gz);
traceRoad('dirt', MX + 6, MZ - 2, LAYOUT.neSpur.gx, LAYOUT.neSpur.gz);
for (let gz = MZ; gz <= MZ + 15; gz += 3) traceRoad('dirt', MX + 2, gz, MX + 14, gz);
for (let gx = MX + 2; gx <= MX + 14; gx += 3) traceRoad('dirt', gx, MZ + 1, gx, MZ + 15);
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
  if (h < 6 || h >= 18) return 'home';
  if (h < 8) return 'street';
  if (h < 12) return 'work';
  if (h < 14) return 'mosque';
  if (h < 17) return 'work';
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
  const gx = home ? home.gx + 0.2 : 6;
  const gz = home ? home.gz + 0.6 : 3;
  const anchor = streetAnchor(gx, gz, n + 1);
  const v = {
    id: state.nextId++,
    name: NAMES[n % NAMES.length],
    nameCkb: NAMES_CKB[n % NAMES_CKB.length],
    job: 'idle',
    role: player ? 'player' : ROLES[npcIndex % ROLES.length],
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

function spawnAnimal(state, kind) {
  const base = {
    sheep: [23, 8.4], goat: [8.2, 26], chicken: [20.4, 32.2], donkey: [16.4, 31.2], ox: [21.2, 34.4],
  }[kind] || [20, 32];
  const n = state.animals.filter((a) => a.kind === kind).length;
  const a = {
    id: state.nextId++,
    kind,
    gx: base[0] + (n % 3) * 0.38,
    gz: base[1] + Math.floor(n / 3) * 0.32,
    tx: base[0] + (n % 3) * 0.38,
    tz: base[1],
    homeGx: base[0],
    homeGz: base[1],
  };
  state.animals.push(a);
  return a;
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
  if (phase === 'home') {
    const hs = homes(state);
    const house = state.buildings.find((b) => b.id === v.homeId && b.type === 'house')
      || (hs.length ? hs[v.id % hs.length] : null);
    if (!house) return { gx: v.gx, gz: v.gz };
    return { gx: house.gx + ((v.id % 3) - 1) * 0.2, gz: house.gz + 0.55 };
  }
  if (phase === 'mosque') {
    const ox = ((v.id % 5) - 2) * 0.28;
    return { gx: LAYOUT.mosque.gx + ox, gz: LAYOUT.mosque.gz + 1.05 };
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
    const herd = state.animals.filter((a) => a.kind === 'sheep' || a.kind === 'chicken');
    const animal = herd.length ? herd[v.id % herd.length] : null;
    if (animal) return { gx: animal.homeGx, gz: animal.homeGz };
  }
  if (v.role === 'teacher') {
    const school = state.buildings.find((b) => b.type === 'school');
    if (school) return { gx: school.gx + 0.35, gz: school.gz + 0.45 };
  }
  return { gx: v.streetGx, gz: v.streetGz };
}

function assignGoal(state, v) {
  const phase = npcSchedule(state.hour);
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
    followPath(v);
    const dx = v.tx - v.gx;
    const dz = v.tz - v.gz;
    if (Math.hypot(dx, dz) > 0.05) v.ry = Math.atan2(dx, dz);
  });
}

export function acceptQuest(state, id) {
  ensureVillageAi(state);
  const q = (state.npcQuests || []).find((item) => item.id === id);
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
  const day = working;
  state.animals.forEach((a) => {
    const penType = a.kind === 'sheep' ? 'pen_sheep' : a.kind === 'goat' ? 'pen_goat' : 'coop';
    const pen = state.buildings.find((b) => b.type === penType);
    if (!day) {
      a.tx = pen ? pen.gx + 0.3 : a.homeGx;
      a.tz = pen ? pen.gz + 0.3 : a.homeGz;
      return;
    }
    const seed = (a.id * 17 + state.ticks * 3) % 5;
    if (pen && seed < 2) {
      a.tx = pen.gx + ((seed - 1) * 0.4);
      a.tz = pen.gz + 0.8;
    } else {
      a.tx = a.homeGx + (seed - 2) * 0.45;
      a.tz = a.homeGz + ((a.id + state.ticks) % 3) * 0.28;
    }
    a.tx = clamp(a.tx, 0.3, GRID_W - 1.3);
    a.tz = clamp(a.tz, 0.3, GRID_D - 1.3);
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
  if (b.stage === 0 || b.stage === 3) return;
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
  const shepherdOn = working && state.villagers.some((v) => v.job === 'shepherd');
  const animalMul = (winter ? 0.65 : 1) * (shepherdOn ? 2.2 : 1);
  state.animals.forEach((a) => {
    if (a.kind === 'sheep') addRes(state, 'wool', 0.16 * animalMul);
    if (a.kind === 'goat') addRes(state, 'milk', 0.18 * animalMul);
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

export function tick(state, dt, opts = {}) {
  const step = Math.min(Math.max(dt, 0), 0.1);
  state.acc += step;
  let guard = 0;
  while (state.acc >= SECONDS_PER_HOUR && guard < 4) {
    state.acc -= SECONDS_PER_HOUR;
    stepHour(state);
    guard += 1;
  }
  stepNpcs(state, step, opts);
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
  let houses = 0;
  for (let gz = MZ - 4; gz <= MZ + 18 && houses < 24; gz += 1) {
    for (let gx = MX - 2; gx <= MX + 16 && houses < 24; gx += 1) {
      if (isRoad(gx, gz) || !besideRoad(gx, gz)) continue;
      const dist = Math.hypot(gx - MX, gz - MZ);
      if (dist < 1.5 || dist > 14) continue;
      if (gx < MX && gz < MZ) continue;
      if (dist > 7 && (gx + gz * 2) % 4 !== 0) continue;
      if ((gx + gz) % 2 !== 0) continue;
      const before = state.buildings.length;
      stamp('house', gx, gz, { style: houses % 5 });
      if (state.buildings.length > before) houses += 1;
    }
  }
  [[22, 8], [24, 8], [26, 7], [30, 8], [16, 8], [8, 22], [8, 26], [6, 34], [48, 40], [50, 48]].forEach(([gx, gz]) => {
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
  [[34, 8], [36, 10], [38, 8], [34, 12]].forEach(([gx, gz], i) => {
    stamp(i % 2 ? 'orchard_walnut' : 'orchard_pom', gx, gz);
  });
  spawnVillager(state, true);
  while (state.villagers.length < 1 + NPC_COUNT && state.villagers.length < capacity(state)) spawnVillager(state);
  bindQuests(state);
  const player = state.villagers[0];
  player.gx = MX + 1.35;
  player.gz = MZ + 0.15;
  player.tx = player.gx;
  player.tz = player.gz;
  spawnAnimal(state, 'sheep');
  spawnAnimal(state, 'sheep');
  spawnAnimal(state, 'goat');
  spawnAnimal(state, 'goat');
  spawnAnimal(state, 'chicken');
  spawnAnimal(state, 'chicken');
  spawnAnimal(state, 'donkey');
  spawnAnimal(state, 'donkey');
  spawnAnimal(state, 'ox');
  spawnAnimal(state, 'ox');
  retarget(state);
  state.villagers[0].gx = MX + 1.35;
  state.villagers[0].gz = MZ + 0.15;
  state.villagers[0].tx = MX + 1.35;
  state.villagers[0].tz = MZ + 0.15;
  recompute(state);
  return state;
}

export function canPlace(state, type, gx, gz) {
  if (!COSTS[type]) return false;
  if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_D) return false;
  if (isBlocked(gx, gz) || occupied(state, gx, gz)) return false;
  if (!canAfford(state, COSTS[type])) return false;
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
  pay(state, COSTS[type]);
  const style = type === 'house' ? homes(state).length % 5 : 0;
  const b = addBuilding(state, type, gx, gz, { style });
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
  const cost = (UPGRADE[b.type] || [])[b.level - 1];
  if (!cost) return { ok: false, reason: 'max' };
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
  state.lastPlantedId = b.id;
  state.villagers.forEach((v) => {
    if (v.job === 'farmer') v.workId = b.id;
  });
  retarget(state);
  bump(state);
  return { ok: true };
}

export function harvest(state, id) {
  const b = byId(state, id);
  if (!b || b.type !== 'field') return { ok: false, reason: 'not-field' };
  if (b.stage !== 3) return { ok: false, reason: 'not-ready' };
  addRes(state, 'grain', 8);
  addRes(state, 'food', 1);
  b.stage = 0;
  b.growth = 0;
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

export function cameraEyeY(pitch, dist = 8) {
  return 1.4 + Math.sin(pitch) * dist;
}

/**
 * One walk step. moveY +1 is stick up (camera forward). moveX +1 is stick right.
 * lookX +1 turns the view right. lookY +1 looks up (camera eye drops, pitch falls).
 */
export function walkStep(pos, yaw, pitch, moveX, moveY, lookX, lookY, dt) {
  const { forward, right } = cameraBasis(yaw);
  const nx = pos.x + (forward.x * moveY + right.x * moveX) * WALK_SPEED * dt;
  const nz = pos.z + (forward.z * moveY + right.z * moveX) * WALK_SPEED * dt;
  const nyaw = yaw + lookX * LOOK_YAW_SPEED * dt;
  const npitch = clamp(pitch - lookY * LOOK_PITCH_SPEED * dt, 0.18, 1.15);
  return { x: nx, z: nz, yaw: nyaw, pitch: npitch, forward, right };
}
