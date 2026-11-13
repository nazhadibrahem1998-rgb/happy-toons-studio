/* Midnight Coast Run — Luma Bay city layout. Original geometry. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.City = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORLD_W = 2500;
  const WORLD_H = 3050;
  const ROAD_W = 168;
  const XS = [420, 940, 1460, 1980, 2360];
  const YS = [320, 820, 1320, 1820, 2320, 2740];
  const WATER_X = 150;
  const SAND_X = 270;
  const CAR_R = 14;

  const CLIENTS = [
    'Lantern Noodles',
    'Glass Orchid',
    'Moonpier Books',
    'Coral Bakery',
    'Signal Cafe',
    'Boardwalk Photo',
    'North Jetty Inn',
    'Halcyon Hotel',
    'Tidepool Laundry',
    'Starlight Cinema',
    'Paper Crane Office',
    'Bluefin Market',
    'Kindling Books',
    'Marina Clinic',
    'Sunset Post',
    'Neon Thread',
    'Pebble Gallery',
    'Cloudline Bakery',
    'Keel Shipping',
    'Luma Dental',
    'Amber Tailor',
    'Harbor Music Shop',
    'Palm Wharf Deli',
    'Lowtide Office',
    'Studio Lots Gate',
    'Glassmarket Hall',
    'Signal Hill Lab',
    'Coral Arcade',
    'Jetty Charts',
    'Moon Pier Florist',
    'Bayline Atelier',
    'Cinder Press',
    'Saltglass Spa',
    'Northlamp Diner',
    'Wharf Candle Co',
    'Dune Letter Co'
  ];

  const NEON = ['#ff3d8a', '#3df0ff', '#ffc14d', '#b388ff', '#5dffb0', '#ff7a3c'];

  const HUB = { x: XS[0], y: YS[YS.length - 1], name: 'Luma Bay Parcel' };

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function buildIntersections() {
    const nodes = [];
    for (let j = 0; j < YS.length; j++) {
      for (let i = 0; i < XS.length; i++) {
        nodes.push({ i: i, j: j, x: XS[i], y: YS[j], id: j * XS.length + i });
      }
    }
    return nodes;
  }

  const NODES = buildIntersections();

  function buildBuildings() {
    const buildings = [];
    let n = 0;
    for (let i = 0; i < XS.length - 1; i++) {
      for (let j = 0; j < YS.length - 1; j++) {
        const x0 = XS[i] + ROAD_W / 2 + 46;
        const y0 = YS[j] + ROAD_W / 2 + 46;
        const x1 = XS[i + 1] - ROAD_W / 2 - 46;
        const y1 = YS[j + 1] - ROAD_W / 2 - 46;
        const w = x1 - x0;
        const h = y1 - y0;
        if (w < 50 || h < 50) continue;
        const neon = NEON[n % NEON.length];
        const windows = [];
        const gapX = 26;
        const gapY = 22;
        for (let wy = y0 + 18; wy < y1 - 14; wy += gapY) {
          for (let wx = x0 + 14; wx < x1 - 14; wx += gapX) {
            const edge = wx < x0 + 42 || wx > x1 - 52 || wy < y0 + 40 || wy > y1 - 48;
            if (!edge) continue;
            const lit = ((wx * 3 + wy * 7 + n) % 4) !== 0;
            windows.push({
              x: wx,
              y: wy,
              w: 10,
              h: 8,
              lit: lit,
              color: lit ? (((wx + wy) % 2) ? neon : '#d7f7ff') : '#0c0816'
            });
          }
        }
        buildings.push({
          x: x0,
          y: y0,
          w: w,
          h: h,
          neon: neon,
          body: n % 2 ? '#161028' : '#1c1434',
          roof: n % 2 ? '#24183c' : '#2a1d48',
          windows: windows,
          door: { x: x0 + w / 2 - 10, y: y1 - 16, w: 20, h: 16 }
        });
        n++;
      }
    }
    return buildings;
  }

  const BUILDINGS = buildBuildings();

  function buildSpots() {
    const spots = [];
    let nameI = 0;
    function add(x, y, kind) {
      if (Math.hypot(x - HUB.x, y - HUB.y) < 70) return;
      spots.push({
        x: x,
        y: y,
        name: CLIENTS[nameI % CLIENTS.length],
        kind: kind
      });
      nameI++;
    }
    for (let j = 0; j < YS.length; j++) {
      for (let i = 0; i < XS.length; i++) {
        add(XS[i] + 46, YS[j] + 46, 'corner');
      }
    }
    for (let j = 0; j < YS.length; j++) {
      for (let i = 0; i < XS.length - 1; i++) {
        const x = (XS[i] + XS[i + 1]) / 2;
        add(x, YS[j], 'mid');
      }
    }
    for (let i = 0; i < XS.length; i++) {
      for (let j = 0; j < YS.length - 1; j++) {
        const y = (YS[j] + YS[j + 1]) / 2;
        add(XS[i], y, 'mid');
      }
    }
    return spots;
  }

  const SPOTS = buildSpots();

  function buildBoosts() {
    const pads = [];
    for (let j = 0; j < YS.length - 1; j += 2) {
      pads.push({ x: XS[0], y: (YS[j] + YS[j + 1]) / 2, vert: true });
    }
    for (let i = 1; i < XS.length - 1; i += 2) {
      pads.push({ x: (XS[i] + XS[i + 1]) / 2, y: YS[2], vert: false });
      pads.push({ x: (XS[i] + XS[i + 1]) / 2, y: YS[4], vert: false });
    }
    return pads;
  }

  const BOOSTS = buildBoosts();

  function buildDashes() {
    const dashes = [];
    const step = 34;
    const len = 16;
    for (let i = 0; i < XS.length; i++) {
      const x = XS[i] - 1.5;
      for (let y = 90; y < WORLD_H - 90; y += step) {
        dashes.push({ x: x, y: y, w: 3, h: len });
      }
    }
    for (let j = 0; j < YS.length; j++) {
      const y = YS[j] - 1.5;
      for (let x = SAND_X + 10; x < WORLD_W - 70; x += step) {
        dashes.push({ x: x, y: y, w: len, h: 3 });
      }
    }
    return dashes;
  }

  const DASHES = buildDashes();

  function buildDecor() {
    const palms = [];
    for (let y = 80; y < WORLD_H - 40; y += 96) {
      palms.push({ x: 210, y: y, scale: 0.85 + ((y / 96) % 3) * 0.08 });
    }
    const umbrellas = [];
    for (let y = 160; y < WORLD_H - 80; y += 150) {
      umbrellas.push({
        x: 188 + ((y / 150) % 2) * 18,
        y: y,
        color: NEON[(y / 150) % NEON.length]
      });
    }
    const lamps = [];
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      lamps.push({ x: n.x - ROAD_W / 2 + 10, y: n.y - ROAD_W / 2 + 10 });
    }
    const boats = [
      { x: 78, y: 480, phase: 0.2 },
      { x: 64, y: 1400, phase: 1.4 },
      { x: 84, y: 2300, phase: 2.2 }
    ];
    return { palms: palms, umbrellas: umbrellas, lamps: lamps, boats: boats };
  }

  const DECOR = buildDecor();

  function circleAABB(cx, cy, r, b) {
    const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
    const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
    let dx = cx - nx;
    let dy = cy - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 > r * r) return null;
    if (dx === 0 && dy === 0) {
      const left = cx - b.x;
      const right = b.x + b.w - cx;
      const top = cy - b.y;
      const bottom = b.y + b.h - cy;
      const min = Math.min(left, right, top, bottom);
      if (min === left) dx = -1;
      else if (min === right) dx = 1;
      else if (min === top) dy = -1;
      else dy = 1;
      const pen = r + min;
      const len = Math.hypot(dx, dy) || 1;
      return { x: cx + (dx / len) * pen, y: cy + (dy / len) * pen, nx: dx / len, ny: dy / len, pen: pen };
    }
    const d = Math.sqrt(d2);
    const pen = r - d;
    return { x: cx + (dx / d) * pen, y: cy + (dy / d) * pen, nx: dx / d, ny: dy / d, pen: pen };
  }

  const BORDERS = [
    { x: -400, y: -400, w: WATER_X + 400, h: WORLD_H + 800 },
    { x: -200, y: -200, w: WORLD_W + 400, h: 200 },
    { x: WORLD_W - 36, y: -200, w: 400, h: WORLD_H + 800 },
    { x: -200, y: WORLD_H - 36, w: WORLD_W + 400, h: 400 }
  ];

  function resolveCar(x, y, r) {
    let cx = x;
    let cy = y;
    let hit = null;
    const solids = BUILDINGS;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < solids.length; i++) {
        const res = circleAABB(cx, cy, r, solids[i]);
        if (!res) continue;
        cx = res.x;
        cy = res.y;
        hit = res;
      }
      for (let i = 0; i < BORDERS.length; i++) {
        const res = circleAABB(cx, cy, r, BORDERS[i]);
        if (!res) continue;
        cx = res.x;
        cy = res.y;
        hit = res;
      }
    }
    return { x: cx, y: cy, hit: hit };
  }

  function onSand(x) {
    return x >= WATER_X && x < SAND_X;
  }

  function nearestNode(x, y) {
    let best = NODES[0];
    let bestD = Infinity;
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function route(x1, y1, x2, y2) {
    const start = nearestNode(x1, y1);
    const goal = nearestNode(x2, y2);
    const w = XS.length;
    const h = YS.length;
    const startId = start.j * w + start.i;
    const goalId = goal.j * w + goal.i;
    const open = [startId];
    const came = new Array(NODES.length).fill(-1);
    const g = new Array(NODES.length).fill(Infinity);
    g[startId] = 0;
    const closed = new Array(NODES.length).fill(false);
    function heur(id) {
      const n = NODES[id];
      return Math.hypot(n.x - goal.x, n.y - goal.y);
    }
    while (open.length) {
      let bi = 0;
      let best = Infinity;
      for (let i = 0; i < open.length; i++) {
        const f = g[open[i]] + heur(open[i]);
        if (f < best) {
          best = f;
          bi = i;
        }
      }
      const cur = open[bi];
      open.splice(bi, 1);
      if (cur === goalId) break;
      if (closed[cur]) continue;
      closed[cur] = true;
      const n = NODES[cur];
      const neigh = [
        [n.i + 1, n.j],
        [n.i - 1, n.j],
        [n.i, n.j + 1],
        [n.i, n.j - 1]
      ];
      for (let k = 0; k < neigh.length; k++) {
        const ii = neigh[k][0];
        const jj = neigh[k][1];
        if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
        const nid = jj * w + ii;
        if (closed[nid]) continue;
        const cost = Math.hypot(NODES[nid].x - n.x, NODES[nid].y - n.y);
        const ng = g[cur] + cost;
        if (ng < g[nid]) {
          g[nid] = ng;
          came[nid] = cur;
          open.push(nid);
        }
      }
    }
    const path = [];
    let walk = goalId;
    if (walk !== startId && came[walk] === -1 && startId !== goalId) {
      path.push({ x: x2, y: y2 });
      return path;
    }
    const chain = [];
    let guard = 0;
    while (walk !== -1 && guard++ < 80) {
      chain.push(NODES[walk]);
      if (walk === startId) break;
      walk = came[walk];
    }
    chain.reverse();
    for (let i = 0; i < chain.length; i++) path.push({ x: chain[i].x, y: chain[i].y });
    const last = path[path.length - 1];
    if (!last || Math.hypot(last.x - x2, last.y - y2) > 12) path.push({ x: x2, y: y2 });
    return path;
  }

  return {
    WORLD_W: WORLD_W,
    WORLD_H: WORLD_H,
    ROAD_W: ROAD_W,
    XS: XS,
    YS: YS,
    WATER_X: WATER_X,
    SAND_X: SAND_X,
    CAR_R: CAR_R,
    HUB: HUB,
    NODES: NODES,
    BUILDINGS: BUILDINGS,
    SPOTS: SPOTS,
    BOOSTS: BOOSTS,
    DASHES: DASHES,
    DECOR: DECOR,
    NEON: NEON,
    circleAABB: circleAABB,
    resolveCar: resolveCar,
    onSand: onSand,
    nearestNode: nearestNode,
    route: route,
    dist: dist
  };
});
