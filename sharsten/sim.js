/**
 * گوندی شارستێن — Sharsten Village simulation.
 * © 2026 Ayub Azizi – Happy Toons Studio. Made with AI assistance.
 * Pure game rules: no DOM, no three.js. Safe to run in Node and the browser.
 */

export const SAVE_KEY = 'sharsten-village-v1';
export const SETTINGS_KEY = 'sharsten-settings-v1';
export const GRID_W = 12;
export const GRID_D = 10;
export const SECONDS_PER_HOUR = 2;
export const SEASON_DAYS = 4;
export const VILLAGER_CAP = 8;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export const WALK_SPEED = 2.4;
export const LOOK_YAW_SPEED = 1.5;
export const LOOK_PITCH_SPEED = 1.05;

const NAMES = ['Awin', 'Roj', 'Hevi', 'Dara', 'Shilan', 'Baran', 'Kardo', 'Lana'];
const NAMES_CKB = ['ئاوین', 'ڕۆژ', 'هێڤی', 'دارا', 'شیلان', 'باران', 'کاردۆ', 'لانا'];

export const COSTS = {
  house: { wood: 8, stone: 4 },
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
  woodyard: 2, quarry: 2, vineyard: 2, orchard_pom: 2, orchard_walnut: 2,
  pen_sheep: 2, pen_goat: 2, coop: 2, field: 1, spring: 1,
};

const JOB_TYPES = {
  farmer: ['field', 'vineyard', 'orchard_pom', 'orchard_walnut'],
  shepherd: ['pen_sheep', 'pen_goat', 'coop'],
  baker: ['tandoor'],
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

export function isRoad(gx, gz) {
  return gz === 4 || gx === 3;
}

export function isBlocked(gx, gz) {
  return isRoad(gx, gz);
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

function spawnVillager(state, player = false) {
  const hs = homes(state);
  const home = hs.length ? hs[state.villagers.length % hs.length] : null;
  const n = state.nameCursor++;
  const v = {
    id: state.nextId++,
    name: NAMES[n % NAMES.length],
    nameCkb: NAMES_CKB[n % NAMES_CKB.length],
    job: 'idle',
    player: !!player,
    homeId: home ? home.id : 0,
    workId: 0,
    happiness: 66,
    fullness: 74,
    rest: 82,
    mode: 'home',
    gx: home ? home.gx + 0.2 : 6,
    gz: home ? home.gz + 0.6 : 3,
    tx: home ? home.gx + 0.2 : 6,
    tz: home ? home.gz + 0.6 : 3,
  };
  state.villagers.push(v);
  return v;
}

function spawnAnimal(state, kind) {
  const base = { sheep: [2.2, 6.4], goat: [2.5, 7.3], chicken: [4.6, 2.4] }[kind];
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

export function retarget(state) {
  const working = state.hour >= 7 && state.hour < 17;
  state.villagers.forEach((v) => {
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
  if (v.job === 'baker' && state.resources.grain >= 1) {
    state.resources.grain = round3(state.resources.grain - 1);
    addRes(state, 'food', 2 * ((b && b.level) || 1));
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
  state.villagers.forEach((v) => {
    if (opts.skipPlayer && v.player) return;
    moveOne(v);
  });
  state.animals.forEach(moveOne);
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
      wood: 48, stone: 36, water: 18, food: 24, money: 40, grain: 4, milk: 0, wool: 0, eggs: 0,
    },
    buildings: [],
    villagers: [],
    animals: [],
    springFixed: false,
    mosqueClean: false,
    quests: { spring: false, school: false, newroz: false },
    newrozYear: -1,
    harvested: 0,
    learning: 0,
    lastPlacedId: 0,
    lastPlantedId: 0,
    selectedId: 0,
  };
  addBuilding(state, 'mosque', 7, 2, { level: 1 });
  addBuilding(state, 'spring', 1, 8, { level: 1 });
  addBuilding(state, 'house', 5, 2, { style: 0 });
  addBuilding(state, 'house', 6, 2, { style: 1 });
  addBuilding(state, 'house', 5, 6, { style: 2 });
  addBuilding(state, 'house', 8, 6, { style: 3 });
  addBuilding(state, 'house', 6, 6, { style: 4 });
  addBuilding(state, 'field', 7, 7, { stage: 2, growth: 48 });
  addBuilding(state, 'vineyard', 9, 3);
  addBuilding(state, 'vineyard', 10, 5);
  spawnVillager(state, true);
  spawnVillager(state);
  spawnVillager(state);
  spawnVillager(state);
  const player = state.villagers[0];
  player.gx = 6.2;
  player.gz = 3.1;
  player.tx = player.gx;
  player.tz = player.gz;
  spawnAnimal(state, 'sheep');
  spawnAnimal(state, 'sheep');
  spawnAnimal(state, 'goat');
  spawnAnimal(state, 'goat');
  spawnAnimal(state, 'chicken');
  spawnAnimal(state, 'chicken');
  spawnAnimal(state, 'chicken');
  spawnAnimal(state, 'chicken');
  retarget(state);
  state.villagers[0].gx = 6.2;
  state.villagers[0].gz = 3.1;
  state.villagers[0].tx = 6.2;
  state.villagers[0].tz = 3.1;
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
