/* Rail Ranch economy. The train loops a rail, picks up goods, and sells them
   at the market. Pure rules live here so a bot can fast-forward them. */
const WORLD_W = 1500;
const WORLD_H = 1000;
const BASE_SPEED = 196;
const WAGON_CAP = 6;
const MAX_WAGONS = 5;
const MAX_ENGINE = 4;
const MAX_TRUCKS = 4;
const MAX_LV = 4;
const OFFLINE_CAP = 2 * 60 * 60;
const TRUCK_RATE = 0.3;
const TRUCK_PAY = 0.62;
const FAIR_EARN = 70000;

const ENGINE_MULT = [1, 1.22, 1.48, 1.78, 2.12];
const ENGINE_COST = [110, 340, 980, 2600];
const WAGON_COST = [0, 72, 230, 760, 2100];
const TRUCK_COST = [150, 480, 1400, 3800];

const TRACKS = [
  { name: 'Home pasture', cost: 0, x: 340, y: 250, w: 430, h: 310, r: 68 },
  { name: 'East meadow', cost: 260, x: 340, y: 160, w: 820, h: 400, r: 74 },
  { name: 'North woods', cost: 1750, x: 150, y: 70, w: 1140, h: 490, r: 80 },
  { name: 'River bend', cost: 7200, x: 70, y: 28, w: 1360, h: 532, r: 84 },
];

const UNLOCKS = [
  { x: 150, y: 130, w: 760, h: 820 },
  { x: 110, y: 50, w: 1180, h: 900 },
  { x: 30, y: 0, w: 1430, h: 980 },
  { x: 0, y: 0, w: WORLD_W, h: WORLD_H },
];

const GATES = [
  { x: 820, y: 430 },
  { x: 1235, y: 370 },
  { x: 1472, y: 300 },
];

export const LAYOUT = {
  worldW: WORLD_W,
  worldH: WORLD_H,
  market: { x: 555, y: 628 },
  wagon: { x: 545, y: 755 },
  engine: { x: 730, y: 705 },
  truck: { x: 390, y: 775 },
  focus: { x: 590, y: 490 },
  road: { x: 170, y: 812, w: 760, h: 42 },
  fence: { x: 478, y: 318, w: 156, h: 128 },
  park: [
    { x: 250, y: 828 },
    { x: 318, y: 828 },
    { x: 386, y: 828 },
    { x: 454, y: 828 },
  ],
};

const PRODUCERS = [
  { id: 'barn', name: 'Red Barn', good: 'milk', noun: 'Milk', x: 555, y: 392, interval: 1.75, price: 5, cap: 12, up: 44, track: 0, owned: true },
  { id: 'coop', name: 'Hen House', good: 'eggs', noun: 'Eggs', x: 430, y: 688, interval: 1.35, price: 4, cap: 14, up: 62, track: 0, cost: 46 },
  { id: 'wheat', name: 'Wheat Field', good: 'wheat', noun: 'Wheat', x: 990, y: 248, interval: 2.15, price: 8, cap: 12, up: 130, track: 1, cost: 210 },
  { id: 'sheep', name: 'Sheep Pen', good: 'wool', noun: 'Wool', x: 1088, y: 455, interval: 2.5, price: 13, cap: 10, up: 230, track: 1, cost: 620 },
  { id: 'orchard', name: 'Apple Orchard', good: 'apples', noun: 'Apples', x: 240, y: 155, interval: 2.0, price: 11, cap: 12, up: 400, track: 2, cost: 1450 },
  { id: 'apiary', name: 'Bee Yard', good: 'honey', noun: 'Honey', x: 1165, y: 155, interval: 2.4, price: 20, cap: 10, up: 720, track: 2, cost: 3100 },
  { id: 'creamery', name: 'Creamery', good: 'cream', noun: 'Cream', x: 1310, y: 430, interval: 2.1, price: 28, cap: 10, up: 1300, track: 3, cost: 6800 },
  { id: 'greenhouse', name: 'Greenhouse', good: 'blooms', noun: 'Blooms', x: 165, y: 445, interval: 1.9, price: 34, cap: 12, up: 2100, track: 3, cost: 12800 },
];

const DEF = {};
for (let i = 0; i < PRODUCERS.length; i++) DEF[PRODUCERS[i].id] = PRODUCERS[i];

const GOALS = [
  { id: 'first', text: 'Sell goods at the market', test: (s) => s.totalEarned >= 1, reward: 6 },
  { id: 'earn50', text: 'Earn $50', earn: 50, test: (s) => s.totalEarned >= 50, reward: 10 },
  { id: 'coop', text: 'Build a hen house', offer: 'p:coop', test: (s) => s.producers.coop.owned, reward: 16 },
  { id: 'earn180', text: 'Earn $180', earn: 180, test: (s) => s.totalEarned >= 180, reward: 20 },
  { id: 'wagon', text: 'Hitch another wagon', offer: 'w', test: (s) => s.wagons >= 2, reward: 18 },
  { id: 'earn450', text: 'Earn $450', earn: 450, test: (s) => s.totalEarned >= 450, reward: 30 },
  { id: 'wheat', text: 'Plant a wheat field', offer: 'p:wheat', test: (s) => s.producers.wheat.owned, reward: 40 },
  { id: 'truck', text: 'Hire a delivery truck', offer: 't', test: (s) => s.trucks >= 1, reward: 28 },
  { id: 'earn1200', text: 'Earn $1,200', earn: 1200, test: (s) => s.totalEarned >= 1200, reward: 50 },
  { id: 'sheep', text: 'Open a sheep pen', offer: 'p:sheep', test: (s) => s.producers.sheep.owned, reward: 70 },
  { id: 'engine', text: 'Tune the engine twice', offer: 'e', test: (s) => s.engine >= 2, reward: 60 },
  { id: 'earn3500', text: 'Earn $3,500', earn: 3500, test: (s) => s.totalEarned >= 3500, reward: 120 },
  { id: 'north', text: 'Reach the north woods', offer: 'k', test: (s) => s.track >= 2, reward: 100 },
  { id: 'orchard', text: 'Grow an apple orchard', offer: 'p:orchard', test: (s) => s.producers.orchard.owned, reward: 90 },
  { id: 'earn9000', text: 'Earn $9,000', earn: 9000, test: (s) => s.totalEarned >= 9000, reward: 180 },
  { id: 'five', text: 'Run five producers', test: (s) => ownedCount(s) >= 5, reward: 160 },
  { id: 'river', text: 'Lay track to the river', offer: 'k', test: (s) => s.track >= 3, reward: 250 },
  { id: 'earn25000', text: 'Earn $25,000', earn: 25000, test: (s) => s.totalEarned >= 25000, reward: 300 },
  { id: 'fair', text: 'Fund the county fair', earn: FAIR_EARN, test: (s) => s.totalEarned >= FAIR_EARN, reward: 400 },
];

const LABELS = [
  { text: 'Home pasture', x: 430, y: 500, track: 0 },
  { text: 'East meadow', x: 980, y: 132, track: 1 },
  { text: 'North woods', x: 430, y: 48, track: 2 },
  { text: 'River bend', x: 760, y: 500, track: 3 },
];

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function finite(n, fallback) {
  n = Number(n);
  return Number.isFinite(n) ? n : fallback;
}

function roundedLoop(rect) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.w;
  const h = rect.h;
  const radius = Math.min(rect.r, w / 2 - 2, h / 2 - 2);
  const pts = [];
  const edgeN = 14;
  const cornerN = 8;
  function line(x1, y1, x2, y2, n) {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  }
  function arc(cx, cy, a0, a1, n) {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const a = a0 + (a1 - a0) * t;
      pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
  }
  line(x + radius, y, x + w - radius, y, edgeN);
  arc(x + w - radius, y + radius, -Math.PI / 2, 0, cornerN);
  line(x + w, y + radius, x + w, y + h - radius, edgeN);
  arc(x + w - radius, y + h - radius, 0, Math.PI / 2, cornerN);
  line(x + w - radius, y + h, x + radius, y + h, edgeN);
  arc(x + radius, y + h - radius, Math.PI / 2, Math.PI, cornerN);
  line(x, y + h - radius, x, y + radius, edgeN);
  arc(x + radius, y + radius, Math.PI, Math.PI * 1.5, cornerN);
  return pts;
}

function buildPoly(pts) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push({ a, b, len, start: total });
    total += len;
  }
  return { pts, seg, length: total };
}

export function samplePoly(poly, dist) {
  const length = poly.length || 1;
  dist = ((dist % length) + length) % length;
  let i = 0;
  const seg = poly.seg;
  while (i < seg.length - 1 && seg[i + 1].start <= dist) i += 1;
  const s = seg[i];
  const t = s.len > 0 ? (dist - s.start) / s.len : 0;
  return {
    x: s.a.x + (s.b.x - s.a.x) * t,
    y: s.a.y + (s.b.y - s.a.y) * t,
    ang: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
  };
}

function nearestOn(poly, x, y) {
  let best = Infinity;
  let at = 0;
  let bx = x;
  let by = y;
  const seg = poly.seg;
  for (let i = 0; i < seg.length; i++) {
    const s = seg[i];
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((x - s.a.x) * dx + (y - s.a.y) * dy) / l2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const px = s.a.x + dx * t;
    const py = s.a.y + dy * t;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < best) {
      best = d;
      at = s.start + s.len * t;
      bx = px;
      by = py;
    }
  }
  return { at, x: bx, y: by, d: Math.sqrt(best) };
}

function stopAnchor(id, rect) {
  const topY = rect.y - 24;
  const botY = rect.y + rect.h + 24;
  const leftX = rect.x - 24;
  const rightX = rect.x + rect.w + 24;
  const midX = rect.x + rect.w * 0.5;
  if (id === 'barn') return { x: midX, y: topY };
  if (id === 'market') return { x: midX, y: botY };
  if (id === 'coop') return { x: 430, y: botY };
  if (id === 'wheat') return { x: 990, y: topY };
  if (id === 'orchard') return { x: 250, y: topY };
  if (id === 'apiary') return { x: 1165, y: topY };
  if (id === 'sheep') return { x: rightX, y: 450 };
  if (id === 'creamery') return { x: rightX, y: 420 };
  if (id === 'greenhouse') return { x: leftX, y: 440 };
  return { x: midX, y: topY };
}

function makeWorld(level) {
  const rect = TRACKS[level];
  const poly = buildPoly(roundedLoop(rect));
  const stations = [];
  const marketHit = nearestOn(poly, stopAnchor('market', rect).x, stopAnchor('market', rect).y);
  stations.push({
    id: 'market', kind: 'market', at: marketHit.at, d: marketHit.d,
    x: LAYOUT.market.x, y: LAYOUT.market.y, sx: marketHit.x, sy: marketHit.y,
  });
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    if (p.track > level) continue;
    const anchor = stopAnchor(p.id, rect);
    const hit = nearestOn(poly, anchor.x, anchor.y);
    stations.push({
      id: p.id, kind: 'producer', at: hit.at, d: hit.d,
      x: p.x, y: p.y, sx: hit.x, sy: hit.y, good: p.good,
    });
  }
  stations.sort((a, b) => a.at - b.at);
  for (let i = 1; i < stations.length; i++) {
    if (stations[i].at - stations[i - 1].at < 28) {
      stations[i].at = Math.min(poly.length - 1, stations[i - 1].at + 28);
    }
  }
  return {
    level,
    pts: poly.pts,
    seg: poly.seg,
    length: poly.length,
    stations,
  };
}

const POLY_CACHE = TRACKS.map((_, level) => makeWorld(level));

function ownedKey(state) {
  let key = '';
  for (let i = 0; i < PRODUCERS.length; i++) {
    key += state.producers[PRODUCERS[i].id].owned ? '1' : '0';
  }
  return key;
}

function stationList(level, state) {
  const base = POLY_CACHE[level];
  const stations = [];
  for (let i = 0; i < base.stations.length; i++) {
    const s = base.stations[i];
    if (s.kind === 'market') stations.push(s);
    else if (state.producers[s.id] && state.producers[s.id].owned) stations.push(s);
  }
  return stations;
}

function ensureWorld(state) {
  const key = ownedKey(state);
  if (state._world && state._world.level === state.track && state._world.key === key) return state._world;
  const base = POLY_CACHE[state.track];
  state._world = {
    level: state.track,
    key,
    pts: base.pts,
    seg: base.seg,
    length: base.length,
    stations: stationList(state.track, state),
  };
  return state._world;
}

export function unitPrice(state, id) {
  const def = DEF[id];
  const st = state.producers[id];
  const raw = def.price * Math.pow(1.18, st.priceLv) * Math.pow(1.16, state.prestige);
  return Math.max(1, Math.round(raw));
}

function intervalOf(state, id) {
  return DEF[id].interval * Math.pow(0.85, state.producers[id].rateLv);
}

function capOf(state, id) {
  return DEF[id].cap + state.producers[id].capLv * 5;
}

function upgradeCost(def, kind, level) {
  const mul = kind === 'cap' ? 0.88 : kind === 'price' ? 1.15 : 1;
  return Math.max(1, Math.round(def.up * mul * Math.pow(2.15, level)));
}

function ownedCount(state) {
  let n = 0;
  for (let i = 0; i < PRODUCERS.length; i++) if (state.producers[PRODUCERS[i].id].owned) n += 1;
  return n;
}

export function incomeOf(state) {
  return economy(state).income;
}

function economy(state) {
  const world = ensureWorld(state);
  let goods = 0;
  let value = 0;
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (!st.owned) continue;
    const per = 1 / intervalOf(state, p.id);
    goods += per;
    value += per * unitPrice(state, p.id);
  }
  const speed = BASE_SPEED * ENGINE_MULT[state.engine];
  const loopTime = world.length / Math.max(40, speed);
  const haul = (state.wagons * WAGON_CAP) / loopTime;
  const truck = state.trucks * TRUCK_RATE;
  const avg = goods > 0 ? value / goods : 0;
  const byTrain = Math.min(goods, haul);
  const byTruck = Math.min(Math.max(0, goods - byTrain), truck);
  return {
    goods,
    haul,
    income: byTrain * avg + byTruck * avg * TRUCK_PAY,
    bound: goods > haul * 0.88,
    loopTime,
  };
}

function freshProducers() {
  const map = {};
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    map[p.id] = {
      owned: !!p.owned,
      stock: p.owned ? 4 : 0,
      rateLv: 0,
      capLv: 0,
      priceLv: 0,
      timer: 0,
    };
  }
  return map;
}

function placeTrain(state) {
  const world = ensureWorld(state);
  const barn = world.stations.find((s) => s.id === 'barn');
  state.trainDist = barn ? (barn.at - 32 + world.length) % world.length : 0;
}

export function createState() {
  const state = {
    cash: 8,
    totalEarned: 0,
    lifetime: 0,
    prestige: 0,
    track: 0,
    wagons: 1,
    engine: 0,
    trucks: 0,
    producers: freshProducers(),
    trainDist: 0,
    cargo: {},
    load: 0,
    truckAcc: 0,
    goals: {},
    tut: 0,
    rev: 1,
    wall: 0,
    lastOffline: 0,
    offlineFor: 0,
    _world: null,
  };
  placeTrain(state);
  return state;
}

function reproject(state) {
  const prev = state._world ? samplePoly(state._world, state.trainDist) : null;
  state._world = null;
  if (!prev) return;
  const world = ensureWorld(state);
  state.trainDist = nearestOn(world, prev.x, prev.y).at;
}

function checkGoals(state) {
  const popped = [];
  for (let i = 0; i < GOALS.length; i++) {
    const g = GOALS[i];
    if (state.goals[g.id]) continue;
    if (!g.test(state)) continue;
    state.goals[g.id] = 1;
    const reward = g.reward || 0;
    if (reward > 0) {
      state.cash += reward;
      state.lifetime += reward;
    }
    popped.push({ id: g.id, text: g.text, reward });
  }
  return popped;
}

function crossed(prev, stepPx, at, length) {
  const end = prev + stepPx;
  let target = at;
  if (target < prev) target += length;
  return target > prev && target <= end;
}

function countAhead(world, state, fromAt, selfId) {
  let marketAt = null;
  for (let i = 0; i < world.stations.length; i++) {
    if (world.stations[i].kind === 'market') marketAt = world.stations[i].at;
  }
  if (marketAt == null) return 0;
  const length = world.length;
  const rel = (d) => (d - fromAt + length) % length;
  const marketRel = rel(marketAt);
  let n = 0;
  for (let i = 0; i < world.stations.length; i++) {
    const s = world.stations[i];
    if (s.kind === 'market' || s.id === selfId) continue;
    const r = rel(s.at);
    if (r > 12 && r < marketRel) {
      const st = state.producers[s.id];
      if (st && st.owned && st.stock > 0) n += 1;
    }
  }
  return n;
}

function pickup(state, world, station, events) {
  const st = state.producers[station.id];
  if (!st || !st.owned || st.stock <= 0) return;
  const cap = state.wagons * WAGON_CAP;
  const space = cap - state.load;
  if (space <= 0) return;
  const ahead = countAhead(world, state, station.at, station.id);
  const keep = ahead > 0 ? Math.min(ahead, space - 1) : 0;
  const take = Math.min(st.stock, space - keep);
  if (take <= 0) return;
  st.stock -= take;
  state.cargo[station.id] = (state.cargo[station.id] || 0) + take;
  state.load += take;
  if (events) events.push({ type: 'pickup', id: station.id, n: take, good: station.good, x: station.x, y: station.y });
}

function sell(state, station, events) {
  if (state.load <= 0) return;
  let sum = 0;
  const goods = Object.keys(state.cargo);
  for (let i = 0; i < goods.length; i++) {
    const id = goods[i];
    const n = state.cargo[id] || 0;
    if (n > 0 && DEF[id]) sum += n * unitPrice(state, id);
    state.cargo[id] = 0;
  }
  state.load = 0;
  const gain = Math.round(sum);
  if (gain <= 0) return;
  state.cash += gain;
  state.totalEarned += gain;
  state.lifetime += gain;
  if (events) events.push({ type: 'sale', amount: gain, x: station.x, y: station.y });
}

function truckTick(state, dt, events) {
  if (state.trucks <= 0) return;
  state.truckAcc += dt * state.trucks * TRUCK_RATE;
  let guard = 0;
  while (state.truckAcc >= 1 && guard < 6) {
    guard += 1;
    state.truckAcc -= 1;
    let best = null;
    for (let i = 0; i < PRODUCERS.length; i++) {
      const p = PRODUCERS[i];
      const st = state.producers[p.id];
      if (!st.owned || st.stock <= 0) continue;
      if (!best || st.stock > best.stock) best = { id: p.id, stock: st.stock, st };
    }
    if (!best) {
      state.truckAcc = 0;
      break;
    }
    best.st.stock -= 1;
    const gain = Math.round(unitPrice(state, best.id) * TRUCK_PAY);
    if (gain > 0) {
      state.cash += gain;
      state.totalEarned += gain;
      state.lifetime += gain;
      if (events) events.push({ type: 'truck', amount: gain, x: LAYOUT.truck.x, y: LAYOUT.truck.y });
    }
  }
}

function moveTrain(state, dt, events) {
  const world = ensureWorld(state);
  const speed = BASE_SPEED * ENGINE_MULT[state.engine];
  let left = speed * dt;
  const length = world.length;
  while (left > 0.01) {
    const chunk = Math.min(10, left);
    const prev = state.trainDist;
    const hits = [];
    for (let i = 0; i < world.stations.length; i++) {
      const s = world.stations[i];
      if (crossed(prev, chunk, s.at, length)) hits.push(s);
    }
    hits.sort((a, b) => {
      const da = a.at < prev ? a.at + length : a.at;
      const db = b.at < prev ? b.at + length : b.at;
      return da - db;
    });
    for (let i = 0; i < hits.length; i++) {
      if (hits[i].kind === 'market') sell(state, hits[i], events);
      else pickup(state, world, hits[i], events);
    }
    state.trainDist = (prev + chunk) % length;
    left -= chunk;
  }
}

function stepOnce(state, dt, events) {
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (!st.owned) continue;
    const cap = capOf(state, p.id);
    if (st.stock >= cap) {
      st.timer = 0;
      continue;
    }
    st.timer += dt;
    const every = intervalOf(state, p.id);
    let guard = 0;
    while (st.stock < cap && st.timer >= every && guard < 8) {
      st.timer -= every;
      st.stock += 1;
      guard += 1;
    }
  }
  truckTick(state, dt, events);
  moveTrain(state, dt, events);
  const goals = checkGoals(state);
  if (events) {
    for (let i = 0; i < goals.length; i++) {
      events.push({ type: 'goal', text: goals[i].text, reward: goals[i].reward, x: LAYOUT.market.x, y: LAYOUT.market.y - 40 });
    }
  }
}

export function step(state, dt, collect) {
  if (!Number.isFinite(dt) || dt <= 0) return [];
  const total = Math.min(dt, 2);
  const events = collect ? [] : null;
  let left = total;
  while (left > 0.0001) {
    const h = Math.min(0.25, left);
    stepOnce(state, h, events);
    left -= h;
  }
  return events || [];
}

function fail(reason, cost) {
  return { ok: false, reason, cost: cost || 0 };
}

export function buy(state, id) {
  if (id === 'w') {
    if (state.wagons >= MAX_WAGONS) return fail('max');
    const cost = WAGON_COST[state.wagons];
    if (state.cash < cost) return fail('cash', cost);
    state.cash -= cost;
    state.wagons += 1;
    state.tut = 1;
    state.rev += 1;
    const goals = checkGoals(state);
    return { ok: true, id, title: 'Extra wagon', cost, goals };
  }
  if (id === 'e') {
    if (state.engine >= MAX_ENGINE) return fail('max');
    const cost = ENGINE_COST[state.engine];
    if (state.cash < cost) return fail('cash', cost);
    state.cash -= cost;
    state.engine += 1;
    state.tut = 1;
    state.rev += 1;
    const goals = checkGoals(state);
    return { ok: true, id, title: 'Faster engine', cost, goals };
  }
  if (id === 't') {
    if (state.trucks >= MAX_TRUCKS) return fail('max');
    const cost = TRUCK_COST[state.trucks];
    if (state.cash < cost) return fail('cash', cost);
    state.cash -= cost;
    state.trucks += 1;
    state.tut = 1;
    state.rev += 1;
    const goals = checkGoals(state);
    return { ok: true, id, title: 'Delivery truck', cost, goals, focus: { x: LAYOUT.truck.x, y: LAYOUT.truck.y } };
  }
  if (id === 'k') {
    if (state.track >= TRACKS.length - 1) return fail('max');
    const next = TRACKS[state.track + 1];
    if (state.cash < next.cost) return fail('cash', next.cost);
    state.cash -= next.cost;
    state.track += 1;
    state.tut = 1;
    reproject(state);
    state.rev += 1;
    const goals = checkGoals(state);
    return { ok: true, id, title: next.name, cost: next.cost, goals, focus: { x: (TRACKS[state.track].x + TRACKS[state.track].w * 0.7), y: TRACKS[state.track].y + 80 } };
  }
  if (id === 'prestige') {
    if (state.totalEarned < FAIR_EARN) return fail('locked', FAIR_EARN);
    const life = state.lifetime;
    const prestige = state.prestige + 1;
    const goals = state.goals;
    const rev = state.rev + 1;
    const fresh = createState();
    fresh.prestige = prestige;
    fresh.lifetime = life;
    fresh.goals = goals;
    fresh.tut = 1;
    fresh.cash = 40 + prestige * 60;
    fresh.rev = rev;
    fresh.wall = state.wall;
    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) delete state[keys[i]];
    Object.assign(state, fresh);
    return { ok: true, id, title: 'New region', cost: 0, goals: [] };
  }
  if (id.indexOf('p:') === 0) {
    const pid = id.slice(2);
    const def = DEF[pid];
    if (!def || def.owned) return fail('unknown');
    const st = state.producers[pid];
    if (!st) return fail('unknown');
    if (st.owned) return fail('max');
    if (def.track > state.track) return fail('locked', def.cost);
    if (state.cash < def.cost) return fail('cash', def.cost);
    state.cash -= def.cost;
    st.owned = true;
    st.stock = 2;
    st.timer = 0;
    state.tut = 1;
    state._world = null;
    state.rev += 1;
    const goals = checkGoals(state);
    return { ok: true, id, title: def.name, cost: def.cost, goals, focus: { x: def.x, y: def.y } };
  }
  if (id.indexOf('up:') === 0) {
    const parts = id.split(':');
    const pid = parts[1];
    const kind = parts[2];
    const def = DEF[pid];
    const st = def && state.producers[pid];
    if (!st || !st.owned) return fail('locked');
    if (kind !== 'rate' && kind !== 'cap' && kind !== 'price') return fail('unknown');
    const level = kind === 'rate' ? st.rateLv : kind === 'cap' ? st.capLv : st.priceLv;
    if (level >= MAX_LV) return fail('max');
    const cost = upgradeCost(def, kind, level);
    if (state.cash < cost) return fail('cash', cost);
    state.cash -= cost;
    if (kind === 'rate') st.rateLv += 1;
    else if (kind === 'cap') st.capLv += 1;
    else st.priceLv += 1;
    state.tut = 1;
    state.rev += 1;
    const goals = checkGoals(state);
    const title = kind === 'rate' ? 'Faster production' : kind === 'cap' ? 'Bigger storage' : 'Better prices';
    return { ok: true, id, title, cost, goals };
  }
  return fail('unknown');
}

function kindScore(kind, bound) {
  if (kind === 'producer') return 220;
  if (kind === 'track') return 200;
  if (kind === 'wagon') return bound ? 175 : 48;
  if (kind === 'cap') return bound ? 155 : 36;
  if (kind === 'engine') return bound ? 135 : 72;
  if (kind === 'rate') return 112;
  if (kind === 'truck') return bound ? 96 : 42;
  if (kind === 'price') return 28;
  return 0;
}

export function offers(state) {
  const econ = economy(state);
  const list = [];
  function push(item) {
    item.score = item.available ? kindScore(item.kind, econ.bound) : 0;
    item.affordable = item.available && state.cash >= item.cost;
    list.push(item);
  }
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (p.owned || st.owned) continue;
    push({
      id: 'p:' + p.id,
      kind: 'producer',
      title: p.name,
      cost: p.cost,
      available: p.track <= state.track,
      x: p.x,
      y: p.y,
    });
  }
  if (state.wagons < MAX_WAGONS) {
    push({ id: 'w', kind: 'wagon', title: 'Extra wagon', cost: WAGON_COST[state.wagons], available: true, x: LAYOUT.wagon.x, y: LAYOUT.wagon.y });
  }
  if (state.engine < MAX_ENGINE) {
    push({ id: 'e', kind: 'engine', title: 'Faster engine', cost: ENGINE_COST[state.engine], available: true, x: LAYOUT.engine.x, y: LAYOUT.engine.y });
  }
  if (state.trucks < MAX_TRUCKS) {
    push({ id: 't', kind: 'truck', title: 'Delivery truck', cost: TRUCK_COST[state.trucks], available: true, x: LAYOUT.truck.x, y: LAYOUT.truck.y });
  }
  if (state.track < TRACKS.length - 1) {
    const gate = GATES[state.track];
    const next = TRACKS[state.track + 1];
    push({ id: 'k', kind: 'track', title: next.name, cost: next.cost, available: true, x: gate.x, y: gate.y });
  }
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (!st.owned) continue;
    if (st.rateLv < MAX_LV) {
      push({ id: 'up:' + p.id + ':rate', kind: 'rate', title: p.name + ' speed', cost: upgradeCost(p, 'rate', st.rateLv), available: true, building: p.id, level: st.rateLv });
    }
    if (st.capLv < MAX_LV) {
      push({ id: 'up:' + p.id + ':cap', kind: 'cap', title: p.name + ' storage', cost: upgradeCost(p, 'cap', st.capLv), available: true, building: p.id, level: st.capLv });
    }
    if (st.priceLv < MAX_LV) {
      push({ id: 'up:' + p.id + ':price', kind: 'price', title: p.name + ' prices', cost: upgradeCost(p, 'price', st.priceLv), available: true, building: p.id, level: st.priceLv });
    }
  }
  if (state.totalEarned >= FAIR_EARN) {
    push({ id: 'prestige', kind: 'prestige', title: 'New region', cost: 0, available: true, x: LAYOUT.market.x, y: LAYOUT.market.y });
  }
  return list;
}

export function chooseBuy(state) {
  const list = offers(state).filter((o) => o.available && o.score > 0 && o.kind !== 'prestige');
  if (!list.length) return null;
  const econ = economy(state);
  const rate = Math.max(0.8, econ.income);
  const affordable = list.filter((o) => o.affordable);
  const pending = list
    .filter((o) => !o.affordable && (o.kind === 'producer' || o.kind === 'track' || o.kind === 'wagon'))
    .filter((o) => (o.cost - state.cash) / rate < 80)
    .sort((a, b) => a.cost - b.cost);
  const saving = pending[0];
  if (saving && state.cash >= saving.cost * 0.45) {
    const big = affordable.filter((o) => o.score >= 160);
    if (!big.length) return null;
    big.sort((a, b) => b.score - a.score || a.cost - b.cost);
    return big[0];
  }
  if (!affordable.length) return null;
  affordable.sort((a, b) => b.score - a.score || a.cost - b.cost);
  return affordable[0];
}

export function autoplay(state, seconds) {
  const buys = [];
  let first = null;
  let lastBuy = 0;
  let maxGap = 0;
  const samples = [];
  const dt = 0.25;
  let t = 0;
  let nextSample = 60;
  const limit = Math.max(0, Number(seconds) || 0);
  while (t < limit - 1e-6) {
    step(state, dt, false);
    t += dt;
    const choice = chooseBuy(state);
    if (choice) {
      const res = buy(state, choice.id);
      if (res.ok) {
        const gap = t - lastBuy;
        if (first == null) first = t;
        else if (gap > maxGap) maxGap = gap;
        lastBuy = t;
        buys.push({ t: Math.round(t * 100) / 100, id: choice.id, cost: res.cost });
      }
    }
    if (t + 1e-6 >= nextSample) {
      samples.push({
        t: nextSample,
        cash: state.cash,
        lifetime: state.lifetime,
        owned: ownedCount(state),
        track: state.track,
        wagons: state.wagons,
        engine: state.engine,
        trucks: state.trucks,
      });
      nextSample += 60;
    }
  }
  const still = offers(state).some((o) => o.score > 0 && o.available && o.kind !== 'prestige');
  const tail = limit - lastBuy;
  if (still && first != null && tail > maxGap) maxGap = tail;
  return {
    firstBuyAt: first,
    buyCount: buys.length,
    maxGap: Math.round(maxGap * 100) / 100,
    buys,
    samples,
    end: summary(state),
  };
}

export function applyOffline(state, seconds) {
  if (!Number.isFinite(seconds) || seconds < 8) return 0;
  const used = Math.min(OFFLINE_CAP, seconds);
  const earned = Math.round(incomeOf(state) * used * 0.7);
  if (earned > 0) {
    state.cash += earned;
    state.totalEarned += earned;
    state.lifetime += earned;
  }
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (!st.owned) continue;
    const made = Math.floor((used / intervalOf(state, p.id)) * 0.2);
    st.stock = Math.min(capOf(state, p.id), st.stock + made);
  }
  state.lastOffline = earned;
  state.offlineFor = used;
  checkGoals(state);
  return earned;
}

export function goalView(state) {
  for (let i = 0; i < GOALS.length; i++) {
    const g = GOALS[i];
    if (state.goals[g.id]) continue;
    let ratio = 0;
    if (g.earn) ratio = clamp(state.totalEarned / g.earn, 0, 1);
    else if (g.offer) {
      const offer = offers(state).find((o) => o.id === g.offer && o.available);
      if (offer && offer.cost > 0) ratio = clamp(state.cash / offer.cost, 0, 1);
      else if (g.test(state)) ratio = 1;
    }
    return { text: g.text, ratio, id: g.id, reward: g.reward || 0 };
  }
  return { text: 'The county fair is open', ratio: 1, id: 'done', reward: 0 };
}

export function summary(state) {
  const g = goalView(state);
  let maxStock = 0;
  const owned = [];
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (st.owned) owned.push(p.id);
    if (st.stock > maxStock) maxStock = st.stock;
  }
  return {
    cash: state.cash,
    lifetime: state.lifetime,
    totalEarned: state.totalEarned,
    track: state.track,
    wagons: state.wagons,
    engine: state.engine,
    trucks: state.trucks,
    prestige: state.prestige,
    tut: state.tut,
    owned,
    ownedCount: owned.length,
    maxStock,
    load: state.load,
    lastOffline: state.lastOffline || 0,
    offlineFor: state.offlineFor || 0,
    income: Math.round(incomeOf(state) * 100) / 100,
    goal: g.text,
    goalRatio: Math.round(g.ratio * 1000) / 1000,
    goalId: g.id,
  };
}

export function mapSigns(state) {
  const signs = [];
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (st.owned || p.owned) continue;
    if (p.track > state.track) continue;
    const tutorial = p.id === 'coop' && !state.tut;
    signs.push({
      buyId: 'p:' + p.id,
      x: p.x,
      y: p.y,
      label: '$' + p.cost,
      title: p.name,
      hot: state.cash >= p.cost || tutorial,
      kind: 'plot',
      good: p.good,
    });
  }
  if (state.wagons < MAX_WAGONS) {
    signs.push({ buyId: 'w', x: LAYOUT.wagon.x, y: LAYOUT.wagon.y, label: '$' + WAGON_COST[state.wagons], title: 'Wagon', hot: state.cash >= WAGON_COST[state.wagons], kind: 'yard' });
  }
  if (state.engine < MAX_ENGINE) {
    signs.push({ buyId: 'e', x: LAYOUT.engine.x, y: LAYOUT.engine.y, label: '$' + ENGINE_COST[state.engine], title: 'Engine', hot: state.cash >= ENGINE_COST[state.engine], kind: 'yard' });
  }
  if (state.trucks < MAX_TRUCKS) {
    signs.push({ buyId: 't', x: LAYOUT.truck.x, y: LAYOUT.truck.y, label: '$' + TRUCK_COST[state.trucks], title: 'Truck', hot: state.cash >= TRUCK_COST[state.trucks], kind: 'yard' });
  }
  if (state.track < TRACKS.length - 1) {
    const gate = GATES[state.track];
    const next = TRACKS[state.track + 1];
    signs.push({ buyId: 'k', x: gate.x, y: gate.y, label: '$' + next.cost, title: next.name, hot: state.cash >= next.cost, kind: 'track' });
  }
  return signs;
}

export function hitTest(state, x, y) {
  const signs = mapSigns(state);
  let best = null;
  let bestD = 48;
  for (let i = 0; i < signs.length; i++) {
    const s = signs[i];
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= bestD) {
      bestD = d;
      best = { type: 'sign', id: s.buyId, x: s.x, y: s.y };
    }
  }
  if (best) return best;
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    if (!state.producers[p.id].owned) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= 52) return { type: 'building', id: p.id, x: p.x, y: p.y };
  }
  if (Math.hypot(LAYOUT.market.x - x, LAYOUT.market.y - y) <= 54) {
    return { type: 'market', id: 'market', x: LAYOUT.market.x, y: LAYOUT.market.y };
  }
  return null;
}

export function view(state) {
  const world = ensureWorld(state);
  const poses = [];
  const gap = 36;
  for (let i = state.wagons; i >= 1; i--) {
    const p = samplePoly(world, state.trainDist - gap * i - 8);
    poses.push({ x: p.x, y: p.y, ang: p.ang, engine: false, index: i });
  }
  const head = samplePoly(world, state.trainDist);
  poses.push({ x: head.x, y: head.y, ang: head.ang, engine: true, index: 0 });
  const buildings = [{ id: 'market', x: LAYOUT.market.x, y: LAYOUT.market.y }];
  const piles = [];
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    if (!st.owned) continue;
    buildings.push({ id: p.id, x: p.x, y: p.y });
    piles.push({
      id: p.id,
      good: p.good,
      x: p.x + (p.id === 'barn' ? 48 : 30),
      y: p.y + (p.id === 'barn' ? 8 : 10),
      n: st.stock,
      cap: capOf(state, p.id),
    });
  }
  const goods = [];
  const keys = Object.keys(state.cargo);
  for (let i = 0; i < keys.length; i++) if (state.cargo[keys[i]] > 0 && DEF[keys[i]]) goods.push(DEF[keys[i]].good);
  const hand = state.tut ? null : { x: DEF.coop.x, y: DEF.coop.y };
  return {
    rev: state.rev,
    w: WORLD_W,
    h: WORLD_H,
    unlock: UNLOCKS[state.track],
    track: state.track,
    trackName: TRACKS[state.track].name,
    poly: world,
    poses,
    buildings,
    piles,
    signs: mapSigns(state),
    stops: world.stations.map((s) => ({ id: s.id, x: s.sx, y: s.sy, kind: s.kind, bx: s.x, by: s.y })),
    trucks: state.trucks,
    hand,
    labels: LABELS.filter((l) => l.track <= state.track),
    load: state.load,
    capacity: state.wagons * WAGON_CAP,
    goods,
    prestige: state.prestige,
    tut: state.tut,
  };
}

export function buildingInfo(state, id) {
  if (id === 'market') {
    return {
      id: 'market',
      name: 'Ranch Market',
      line: 'The train unloads here.',
      detail: state.load > 0 ? ('On board: ' + state.load + ' goods') : 'Waiting for the next load.',
      actions: [],
      canPrestige: state.totalEarned >= FAIR_EARN,
      prestigeText: 'Open a new region',
    };
  }
  const def = DEF[id];
  if (!def) return null;
  const st = state.producers[id];
  if (!st || !st.owned) return null;
  const actions = [];
  if (st.rateLv < MAX_LV) actions.push({ id: 'up:' + id + ':rate', name: 'Faster', cost: upgradeCost(def, 'rate', st.rateLv), level: st.rateLv, max: MAX_LV });
  if (st.capLv < MAX_LV) actions.push({ id: 'up:' + id + ':cap', name: 'Bigger', cost: upgradeCost(def, 'cap', st.capLv), level: st.capLv, max: MAX_LV });
  if (st.priceLv < MAX_LV) actions.push({ id: 'up:' + id + ':price', name: 'Richer', cost: upgradeCost(def, 'price', st.priceLv), level: st.priceLv, max: MAX_LV });
  return {
    id,
    name: def.name,
    line: def.noun + ' · $' + unitPrice(state, id) + ' each',
    detail: 'Stock ' + st.stock + '/' + capOf(state, id) + ' · every ' + intervalOf(state, id).toFixed(1) + 's',
    actions,
    canPrestige: false,
  };
}

function distToPoly(poly, x, y) {
  let best = Infinity;
  const seg = poly.seg;
  for (let i = 0; i < seg.length; i++) {
    const s = seg[i];
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((x - s.a.x) * dx + (y - s.a.y) * dy) / l2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const px = s.a.x + dx * t;
    const py = s.a.y + dy * t;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export function blocked(x, y) {
  for (let i = 0; i < POLY_CACHE.length; i++) {
    if (distToPoly(POLY_CACHE[i], x, y) < 28) return true;
  }
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    if (Math.hypot(p.x - x, p.y - y) < 58) return true;
  }
  const spots = [LAYOUT.market, LAYOUT.wagon, LAYOUT.engine, LAYOUT.truck, GATES[0], GATES[1], GATES[2]];
  for (let i = 0; i < spots.length; i++) {
    if (Math.hypot(spots[i].x - x, spots[i].y - y) < 46) return true;
  }
  return false;
}

export function debugLayout() {
  return POLY_CACHE.map((w) => ({
    level: w.level,
    length: Math.round(w.length),
    stations: w.stations.map((s) => ({
      id: s.id,
      at: Math.round(s.at),
      sx: Math.round(s.sx),
      sy: Math.round(s.sy),
      d: Math.round(s.d),
    })),
  }));
}

export function serialize(state) {
  const producers = {};
  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const st = state.producers[p.id];
    producers[p.id] = {
      owned: !!st.owned,
      stock: Math.round(st.stock),
      rateLv: st.rateLv,
      capLv: st.capLv,
      priceLv: st.priceLv,
      timer: st.timer,
    };
  }
  return {
    v: 1,
    cash: state.cash,
    totalEarned: state.totalEarned,
    lifetime: state.lifetime,
    prestige: state.prestige,
    track: state.track,
    wagons: state.wagons,
    engine: state.engine,
    trucks: state.trucks,
    trainDist: state.trainDist,
    truckAcc: state.truckAcc,
    cargo: state.cargo,
    load: state.load,
    goals: state.goals,
    tut: state.tut,
    producers,
  };
}

export function hydrate(data) {
  const state = createState();
  if (!data || data.v !== 1) return state;
  state.cash = clamp(Math.round(finite(data.cash, 8)), 0, 1e9);
  state.totalEarned = clamp(Math.round(finite(data.totalEarned, 0)), 0, 1e9);
  state.lifetime = clamp(Math.round(finite(data.lifetime, state.totalEarned)), state.totalEarned, 1e9);
  state.prestige = clamp(Math.round(finite(data.prestige, 0)), 0, 40);
  state.track = clamp(Math.round(finite(data.track, 0)), 0, TRACKS.length - 1);
  state.wagons = clamp(Math.round(finite(data.wagons, 1)), 1, MAX_WAGONS);
  state.engine = clamp(Math.round(finite(data.engine, 0)), 0, MAX_ENGINE);
  state.trucks = clamp(Math.round(finite(data.trucks, 0)), 0, MAX_TRUCKS);
  state.trainDist = Math.max(0, finite(data.trainDist, 0));
  state.truckAcc = clamp(finite(data.truckAcc, 0), 0, 20);
  state.load = clamp(Math.round(finite(data.load, 0)), 0, MAX_WAGONS * WAGON_CAP);
  state.tut = data.tut ? 1 : 0;
  state.cargo = {};
  if (data.cargo && typeof data.cargo === 'object') {
    for (let i = 0; i < PRODUCERS.length; i++) {
      const id = PRODUCERS[i].id;
      const n = Math.round(finite(data.cargo[id], 0));
      if (n > 0) state.cargo[id] = n;
    }
  }
  state.goals = {};
  if (data.goals && typeof data.goals === 'object') {
    for (let i = 0; i < GOALS.length; i++) {
      if (data.goals[GOALS[i].id]) state.goals[GOALS[i].id] = 1;
    }
  }
  if (data.producers && typeof data.producers === 'object') {
    for (let i = 0; i < PRODUCERS.length; i++) {
      const p = PRODUCERS[i];
      const src = data.producers[p.id];
      if (!src) continue;
      const st = state.producers[p.id];
      st.owned = p.owned ? true : !!src.owned;
      st.rateLv = clamp(Math.round(finite(src.rateLv, 0)), 0, MAX_LV);
      st.capLv = clamp(Math.round(finite(src.capLv, 0)), 0, MAX_LV);
      st.priceLv = clamp(Math.round(finite(src.priceLv, 0)), 0, MAX_LV);
      st.timer = clamp(finite(src.timer, 0), 0, 30);
      st.stock = clamp(Math.round(finite(src.stock, 0)), 0, capOf(state, p.id));
    }
  }
  state._world = null;
  state.rev += 1;
  ensureWorld(state);
  return state;
}

export function anchors() {
  const list = PRODUCERS.map((p) => ({ x: p.x, y: p.y, r: 56 }));
  list.push({ x: LAYOUT.market.x, y: LAYOUT.market.y, r: 64 });
  return list;
}

export { PRODUCERS, WORLD_W, WORLD_H, FAIR_EARN, OFFLINE_CAP };
