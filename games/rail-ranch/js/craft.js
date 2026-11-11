/* Original build, storage, and crafting rules for Rail Ranch.
   Mechanics are inspired by open games; this file is not derived from their code. */

export const TILE = 48;

const LEVELS = [0, 40, 110, 240, 480, 900, 1500];

export const PLACEABLES = [
  { id: 'warehouse', name: 'Warehouse', cost: 90, level: 1, kind: 'storage', blurb: 'More storage' },
  { id: 'rail', name: 'Rail piece', cost: 40, level: 1, kind: 'rail', blurb: 'Extend the line' },
  { id: 'mill', name: 'Mill', cost: 240, level: 2, kind: 'mill', blurb: 'Wheat to flour' },
  { id: 'cheese', name: 'Cheese press', cost: 280, level: 2, kind: 'cheese', blurb: 'Milk to cheese' },
  { id: 'bakery', name: 'Bakery', cost: 520, level: 3, kind: 'bakery', blurb: 'Flour to bread' },
];

const RECIPES = {
  mill: { every: 3.6, in: { wheat: 2 }, out: { flour: 1 } },
  cheese: { every: 4.2, in: { milk: 2 }, out: { cheese: 1 } },
  bakery: { every: 4.4, in: { flour: 1 }, out: { bread: 1 } },
};

export const GOOD_PRICE = { flour: 14, cheese: 18, bread: 26 };

const CHAIN_INPUT = { wheat: 'mill', milk: 'cheese' };

const TRACK_RECTS = [
  { x: 340, y: 250, w: 430, h: 310 },
  { x: 340, y: 160, w: 820, h: 400 },
  { x: 150, y: 70, w: 1140, h: 490 },
  { x: 70, y: 28, w: 1360, h: 532 },
];

export function emptyCraft() {
  return {
    placed: [],
    warehouse: {},
    warehouseCap: 40,
    xp: 0,
    level: 1,
    orders: [],
    craftAcc: { mill: 0, cheese: 0, bakery: 0 },
    dailyDate: '',
    dailyStreak: 0,
  };
}

export function attachCraft(state) {
  const blank = emptyCraft();
  const keys = Object.keys(blank);
  for (let i = 0; i < keys.length; i++) {
    if (state[keys[i]] == null) state[keys[i]] = blank[keys[i]];
  }
  if (!state.warehouse) state.warehouse = {};
  if (!state.craftAcc) state.craftAcc = { mill: 0, cheese: 0, bakery: 0 };
  if (!state.placed) state.placed = [];
  if (!state.orders) state.orders = [];
}

export function worldToTile(x, y) {
  return { gx: Math.floor(x / TILE), gy: Math.floor(y / TILE) };
}

export function tileCenter(gx, gy) {
  return { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
}

export function levelFromXp(xp) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) level = i + 1;
  return level;
}

export function xpForNext(level) {
  if (level >= LEVELS.length) return LEVELS[LEVELS.length - 1];
  return LEVELS[level];
}

function addXp(state, amount) {
  state.xp += amount;
  const next = levelFromXp(state.xp);
  const up = next > state.level;
  state.level = next;
  return up;
}

function countKind(state, kind) {
  let n = 0;
  for (let i = 0; i < state.placed.length; i++) if (state.placed[i].kind === kind) n += 1;
  return n;
}

function warehouseUsed(state) {
  const keys = Object.keys(state.warehouse);
  let n = 0;
  for (let i = 0; i < keys.length; i++) n += state.warehouse[keys[i]] || 0;
  return n;
}

export function railSlots(track) {
  const rect = TRACK_RECTS[Math.min(track, TRACK_RECTS.length - 1)];
  const slots = [];
  const x = rect.x + rect.w + 28;
  for (let i = 0; i < 6; i++) {
    const spot = worldToTile(x, rect.y + 36 + i * TILE);
    slots.push(spot);
  }
  return slots;
}

function slotKey(gx, gy) {
  return gx + ',' + gy;
}

function occupied(state, gx, gy) {
  for (let i = 0; i < state.placed.length; i++) {
    const p = state.placed[i];
    if (p.gx === gx && p.gy === gy) return true;
  }
  return false;
}

function nearFixed(gx, gy) {
  const c = tileCenter(gx, gy);
  const spots = [
    [555, 392], [500, 500], [990, 248], [1088, 455], [240, 155], [1165, 155],
    [1310, 430], [165, 445], [590, 530], [690, 505], [745, 455], [625, 535],
  ];
  for (let i = 0; i < spots.length; i++) {
    if (Math.hypot(spots[i][0] - c.x, spots[i][1] - c.y) < 42) return true;
  }
  if (c.y > 790 && c.y < 880 && c.x > 150 && c.x < 980) return true;
  return false;
}

export function catalog(state) {
  const railCost = 40 + state.track * 30;
  return PLACEABLES.map((item) => {
    const cost = item.id === 'rail' ? railCost : item.cost;
    const locked = state.level < item.level;
    const done = item.id === 'rail' && state.track >= TRACK_RECTS.length - 1 && railSlots(state.track).every((s) => occupied(state, s.gx, s.gy));
    return {
      id: item.id,
      name: item.name,
      blurb: item.blurb,
      kind: item.kind,
      cost,
      level: item.level,
      locked,
      done,
    };
  });
}

export function preview(state, id, x, y) {
  attachCraft(state);
  const tile = worldToTile(x, y);
  const item = PLACEABLES.find((p) => p.id === id);
  if (!item) return { ok: false, reason: 'unknown', gx: tile.gx, gy: tile.gy, x: tileCenter(tile.gx, tile.gy).x, y: tileCenter(tile.gx, tile.gy).y };
  const center = tileCenter(tile.gx, tile.gy);
  const entry = catalog(state).find((c) => c.id === id);
  let reason = 'ok';
  if (entry.locked) reason = 'level';
  else if (entry.done) reason = 'max';
  else if (id === 'rail') {
    const slots = railSlots(state.track);
    const match = slots.some((s) => s.gx === tile.gx && s.gy === tile.gy);
    if (!match) reason = 'slot';
    else if (occupied(state, tile.gx, tile.gy)) reason = 'taken';
  } else if (occupied(state, tile.gx, tile.gy)) reason = 'taken';
  else if (nearFixed(tile.gx, tile.gy)) reason = 'blocked';
  else if (center.x < 40 || center.y < 40 || center.x > 1460 || center.y > 960) reason = 'edge';
  const afford = state.cash >= entry.cost;
  return {
    ok: reason === 'ok',
    reason: reason === 'ok' && !afford ? 'cash' : reason,
    afford,
    cost: entry.cost,
    gx: tile.gx,
    gy: tile.gy,
    x: center.x,
    y: center.y,
    kind: item.kind,
    name: item.name,
  };
}

export function place(state, id, x, y, rot) {
  attachCraft(state);
  const plan = preview(state, id, x, y);
  if (!plan.ok) return { ok: false, reason: plan.reason, cost: plan.cost || 0 };
  if (state.cash < plan.cost) return { ok: false, reason: 'cash', cost: plan.cost };
  state.cash -= plan.cost;
  state.placed.push({
    id: id + ':' + plan.gx + ':' + plan.gy,
    kind: plan.kind,
    gx: plan.gx,
    gy: plan.gy,
    rot: ((rot || 0) % 4 + 4) % 4,
    x: plan.x,
    y: plan.y,
  });
  if (plan.kind === 'storage') state.warehouseCap += 40;
  const leveled = addXp(state, 18);
  state.rev += 1;
  let extended = false;
  if (plan.kind === 'rail') {
    const slots = railSlots(state.track);
    const filled = slots.every((s) => occupied(state, s.gx, s.gy));
    if (filled && state.track < TRACK_RECTS.length - 1) {
      state.track += 1;
      state._world = null;
      extended = true;
      addXp(state, 25);
    }
  }
  return { ok: true, id, title: plan.name, cost: plan.cost, focus: { x: plan.x, y: plan.y }, kind: plan.kind, leveled, extended, goals: [] };
}

function ensureOrders(state) {
  const goods = ['milk', 'eggs'];
  if (countKind(state, 'mill')) goods.push('flour');
  if (countKind(state, 'bakery')) goods.push('bread');
  if (countKind(state, 'cheese')) goods.push('cheese');
  if (state.producers && state.producers.wheat && state.producers.wheat.owned) goods.push('wheat');
  while (state.orders.length < 3) {
    const tick = Math.floor(state.clock || 0);
    const good = goods[(tick + state.orders.length * 2) % goods.length];
    const need = 3 + state.level;
    state.orders.push({
      id: 'ord-' + tick + '-' + state.orders.length + '-' + good,
      good,
      need,
      have: 0,
      reward: 24 + need * (GOOD_PRICE[good] || 6),
      xp: 8 + state.level * 2,
      left: 110,
    });
  }
}

function grant(state, amount) {
  const g = Math.round(amount);
  if (g <= 0) return 0;
  state.cash += g;
  state.totalEarned += g;
  state.lifetime += g;
  return g;
}

export function noteGoods(state, good, count, events) {
  if (!good || count <= 0) return;
  attachCraft(state);
  ensureOrders(state);
  let left = count;
  for (let i = 0; i < state.orders.length && left > 0; i++) {
    const order = state.orders[i];
    if (order.good !== good || order.have >= order.need) continue;
    const take = Math.min(left, order.need - order.have);
    order.have += take;
    left -= take;
    if (order.have >= order.need) {
      grant(state, order.reward);
      const up = addXp(state, order.xp);
      if (events) events.push({ type: 'order', text: order.good, reward: order.reward, levelUp: up, x: 560, y: 500 });
    }
  }
  state.orders = state.orders.filter((order) => order.have < order.need);
}

export function routeSale(state, producerId, good, count) {
  attachCraft(state);
  const chain = CHAIN_INPUT[good];
  if (!chain || count <= 0 || countKind(state, chain) < 1) return count;
  const room = state.warehouseCap - warehouseUsed(state);
  if (room <= 0) return count;
  const keep = Math.min(count, room, Math.max(1, Math.floor(count * 0.45)));
  state.warehouse[good] = (state.warehouse[good] || 0) + keep;
  return count - keep;
}

function runRecipe(state, kind) {
  const recipe = RECIPES[kind];
  if (!recipe || countKind(state, kind) < 1) return false;
  const inputs = Object.keys(recipe.in);
  for (let i = 0; i < inputs.length; i++) {
    if ((state.warehouse[inputs[i]] || 0) < recipe.in[inputs[i]]) return false;
  }
  const outputs = Object.keys(recipe.out);
  let made = 0;
  for (let i = 0; i < outputs.length; i++) made += recipe.out[outputs[i]];
  if (warehouseUsed(state) + made > state.warehouseCap) return false;
  for (let i = 0; i < inputs.length; i++) state.warehouse[inputs[i]] -= recipe.in[inputs[i]];
  for (let i = 0; i < outputs.length; i++) {
    const good = outputs[i];
    state.warehouse[good] = (state.warehouse[good] || 0) + recipe.out[good];
  }
  return true;
}

export function tickCraft(state, dt, events) {
  attachCraft(state);
  const kinds = ['mill', 'cheese', 'bakery'];
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i];
    if (countKind(state, kind) < 1) continue;
    state.craftAcc[kind] += dt * countKind(state, kind);
    let guard = 0;
    while (state.craftAcc[kind] >= RECIPES[kind].every && guard < 4) {
      if (!runRecipe(state, kind)) {
        state.craftAcc[kind] = RECIPES[kind].every;
        break;
      }
      state.craftAcc[kind] -= RECIPES[kind].every;
      guard += 1;
    }
  }
  ensureOrders(state);
  for (let i = state.orders.length - 1; i >= 0; i--) {
    state.orders[i].left -= dt;
    if (state.orders[i].left <= 0) state.orders.splice(i, 1);
  }
  ensureOrders(state);
  state.craftSell = (state.craftSell || 0) + dt;
  if (state.craftSell >= 2.5) {
    state.craftSell = 0;
    const finished = ['bread', 'cheese', 'flour'];
    for (let i = 0; i < finished.length; i++) {
      const good = finished[i];
      const have = state.warehouse[good] || 0;
      if (have <= 0) continue;
      const sold = Math.min(have, 2);
      state.warehouse[good] = have - sold;
      const gain = grant(state, sold * GOOD_PRICE[good]);
      noteGoods(state, good, sold, events);
      if (gain && events) events.push({ type: 'sale', amount: gain, x: 700, y: 520 });
      addXp(state, sold);
    }
  }
}

export function claimDaily(state, today) {
  attachCraft(state);
  if (!today || state.dailyDate === today) return { ok: false, reason: 'claimed' };
  const prev = shiftDate(today, -1);
  state.dailyStreak = state.dailyDate === prev ? state.dailyStreak + 1 : 1;
  state.dailyDate = today;
  const reward = 35 + state.dailyStreak * 12;
  grant(state, reward);
  const leveled = addXp(state, 10);
  return { ok: true, reward, streak: state.dailyStreak, leveled };
}

export function dailyInfo(state, today) {
  attachCraft(state);
  const claimed = state.dailyDate === today;
  const streak = state.dailyStreak || 0;
  return {
    claimed,
    streak,
    reward: 35 + (claimed ? streak : streak + 1) * 12,
  };
}

function shiftDate(iso, days) {
  const p = iso.split('-');
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() + days);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

export function craftSummary(state) {
  attachCraft(state);
  ensureOrders(state);
  return {
    xp: state.xp,
    level: state.level,
    nextXp: xpForNext(state.level),
    warehouse: state.warehouse,
    warehouseCap: state.warehouseCap,
    warehouseUsed: warehouseUsed(state),
    placed: state.placed.length,
    orders: state.orders.map((order) => ({
      id: order.id,
      good: order.good,
      need: order.need,
      have: order.have,
      reward: order.reward,
      left: Math.max(0, Math.ceil(order.left)),
    })),
  };
}

export function readCraft(data, state) {
  attachCraft(state);
  if (!data) return;
  state.xp = Math.max(0, Math.round(Number(data.xp) || 0));
  state.level = levelFromXp(state.xp);
  state.warehouseCap = Math.max(40, Math.round(Number(data.warehouseCap) || 40));
  state.dailyDate = typeof data.dailyDate === 'string' ? data.dailyDate : '';
  state.dailyStreak = Math.max(0, Math.round(Number(data.dailyStreak) || 0));
  state.warehouse = {};
  if (data.warehouse && typeof data.warehouse === 'object') {
    const keys = Object.keys(data.warehouse);
    for (let i = 0; i < keys.length; i++) {
      const n = Math.max(0, Math.round(Number(data.warehouse[keys[i]]) || 0));
      if (n) state.warehouse[keys[i]] = n;
    }
  }
  state.placed = [];
  if (Array.isArray(data.placed)) {
    for (let i = 0; i < data.placed.length; i++) {
      const p = data.placed[i];
      if (!p || typeof p.kind !== 'string') continue;
      state.placed.push({
        id: String(p.id || p.kind),
        kind: p.kind,
        gx: Math.round(Number(p.gx) || 0),
        gy: Math.round(Number(p.gy) || 0),
        rot: Math.round(Number(p.rot) || 0) % 4,
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
      });
    }
  }
  state.orders = [];
  if (Array.isArray(data.orders)) {
    for (let i = 0; i < data.orders.length && i < 3; i++) {
      const o = data.orders[i];
      if (!o || typeof o.good !== 'string') continue;
      state.orders.push({
        id: String(o.id || 'ord'),
        good: o.good,
        need: Math.max(1, Math.round(Number(o.need) || 1)),
        have: Math.max(0, Math.round(Number(o.have) || 0)),
        reward: Math.max(0, Math.round(Number(o.reward) || 0)),
        xp: Math.max(0, Math.round(Number(o.xp) || 0)),
        left: Math.max(1, Number(o.left) || 60),
      });
    }
  }
}

export function writeCraft(state) {
  attachCraft(state);
  return {
    xp: state.xp,
    warehouseCap: state.warehouseCap,
    warehouse: state.warehouse,
    placed: state.placed,
    orders: state.orders,
    dailyDate: state.dailyDate,
    dailyStreak: state.dailyStreak,
  };
}
