/* Midnight Coast Run — night rules, car, traffic, jobs. */
(function (root, factory) {
  const api = factory(root.City || require('./city.js'));
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Sim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (City) {
  'use strict';

  const MIDNIGHT = 24 * 3600;

  const NIGHTS = [
    { name: 'Warm-Up Run', start: 21.5, rate: 42, req: 2, sides: 1, traffic: 6, trafficSpeed: 70, fuel: 0.42, pay: 1, weather: 'clear', blurb: 'Two drops along the coast. Learn the lights before the clock matters.' },
    { name: 'Boardwalk Lights', start: 21.25, rate: 46, req: 3, sides: 1, traffic: 8, trafficSpeed: 78, fuel: 0.5, pay: 1.05, weather: 'clear', blurb: 'A third drop means a trip back to the parcel depot.' },
    { name: 'Lantern Row', start: 21.0, rate: 48, req: 3, sides: 1, traffic: 10, trafficSpeed: 86, fuel: 0.58, pay: 1.1, weather: 'clear', blurb: 'More cars on the lantern streets. Weave, don\'t bump.' },
    { name: 'Glassmarket', start: 21.0, rate: 52, req: 4, sides: 1, traffic: 11, trafficSpeed: 90, fuel: 0.66, pay: 1.15, weather: 'clear', blurb: 'Four drops across the market grid. Plan the loop.' },
    { name: 'Signal Hill', start: 20.75, rate: 54, req: 4, sides: 2, traffic: 12, trafficSpeed: 94, fuel: 0.72, pay: 1.2, weather: 'clear', blurb: 'Two bonus contracts if your trunk has room.' },
    { name: 'Double Drop', start: 20.75, rate: 56, req: 4, sides: 2, traffic: 13, trafficSpeed: 100, fuel: 0.78, pay: 1.28, weather: 'clear', blurb: 'The depot wants speed and clean fenders.' },
    { name: 'Rain on the Coast', start: 21.0, rate: 58, req: 4, sides: 1, traffic: 13, trafficSpeed: 92, fuel: 0.82, pay: 1.32, weather: 'rain', blurb: 'Wet asphalt. Turns wash out a little. Neon smears.' },
    { name: 'North Jetty', start: 20.5, rate: 56, req: 5, sides: 1, traffic: 14, trafficSpeed: 104, fuel: 0.9, pay: 1.38, weather: 'clear', blurb: 'Long hauls toward the jetty. Watch the tank.' },
    { name: 'Short Clock', start: 22.0, rate: 64, req: 4, sides: 1, traffic: 13, trafficSpeed: 108, fuel: 0.88, pay: 1.55, weather: 'clear', blurb: 'You roll out late. The pay matches the rush.' },
    { name: 'Across Luma Bay', start: 20.5, rate: 60, req: 5, sides: 2, traffic: 16, trafficSpeed: 112, fuel: 0.96, pay: 1.48, weather: 'clear', blurb: 'The whole bay is on your route sheet tonight.' },
    { name: 'Midnight', start: 21.15, rate: 68, req: 5, sides: 2, traffic: 18, trafficSpeed: 118, fuel: 1.05, pay: 1.75, weather: 'midnight', blurb: 'Final night. Five drops. The clock is the only rival.' }
  ];

  const UPGRADES = {
    engine: { name: 'Engine', desc: 'Top speed and pull', max: 5, costs: [180, 340, 560, 860, 1280] },
    handling: { name: 'Handling', desc: 'Turn-in and grip', max: 5, costs: [160, 300, 480, 760, 1100] },
    nitro: { name: 'Nitro', desc: 'Longer, stronger boost', max: 5, costs: [200, 380, 600, 920, 1400] },
    trunk: { name: 'Trunk', desc: 'Carry one more parcel', max: 4, costs: [240, 420, 700, 1100] }
  };

  const PAINTS = [
    { name: 'Magenta Dusk', color: '#ff3d8a', glow: '#ff77b5', price: 0 },
    { name: 'Cyan Tide', color: '#1ad4e6', glow: '#7cf6ff', price: 160 },
    { name: 'Amber Sun', color: '#ffb020', glow: '#ffd27a', price: 200 },
    { name: 'Mint Glass', color: '#2ee6a6', glow: '#8fffd4', price: 240 },
    { name: 'Violet Night', color: '#8b5cff', glow: '#c3b0ff', price: 320 },
    { name: 'Pearl', color: '#f4f1ff', glow: '#ffffff', price: 480 }
  ];

  const TRAFFIC_COLORS = ['#6ec8ff', '#ffd36e', '#e8e6f4', '#ff8fb8', '#8dffe0', '#c9a6ff'];

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function formatClock(clock) {
    let c = clock;
    if (c >= MIDNIGHT) return '12:00 AM';
    if (c < 0) c = 0;
    const h24 = Math.floor(c / 3600) % 24;
    const m = Math.floor((c % 3600) / 60);
    const ap = h24 >= 12 ? 'PM' : 'AM';
    let h = h24 % 12;
    if (h === 0) h = 12;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  function formatLeft(clock) {
    const left = Math.max(0, MIDNIGHT - clock);
    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    if (h <= 0) return m + 'm left';
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm left';
  }

  function carStats(upg) {
    const u = upg || { engine: 0, handling: 0, nitro: 0, trunk: 0 };
    return {
      maxSpeed: 168 + u.engine * 14,
      accel: 280 + u.engine * 26,
      brake: 520 + u.handling * 20,
      turn: 3.25 + u.handling * 0.45,
      nitroMul: 1.2 + u.nitro * 0.055,
      nitroDrain: 36 - u.nitro * 2.4,
      nitroRegen: 12 + u.nitro * 2.6,
      slots: 2 + u.trunk
    };
  }

  function calcStars(r) {
    if (!r.cleared) return 0;
    let stars = 1;
    const frac = r.timeTotal > 0 ? r.timeLeft / r.timeTotal : 0;
    if (frac >= 0.2 && r.bumps <= 5) stars = 2;
    if (frac >= 0.34 && r.bumps <= 2 && (r.sides >= 1 || r.near >= 4)) stars = 3;
    return stars;
  }

  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function farEnough(spot, list, minD) {
    for (let i = 0; i < list.length; i++) {
      if (Math.hypot(spot.x - list[i].x, spot.y - list[i].y) < minD) return false;
    }
    return true;
  }

  function pickSpots(rng, count, minDist, avoid) {
    const pool = shuffle(City.SPOTS, rng);
    let minD = minDist;
    let chosen = [];
    for (let attempt = 0; attempt < 4 && chosen.length < count; attempt++) {
      chosen = [];
      for (let i = 0; i < pool.length && chosen.length < count; i++) {
        const s = pool[i];
        if (!farEnough(s, avoid, minD * 0.65)) continue;
        if (!farEnough(s, chosen, minD)) continue;
        chosen.push(s);
      }
      minD *= 0.72;
    }
    return chosen;
  }

  function makeJob(spot, pay, required, id) {
    return {
      id: id,
      name: spot.name,
      x: spot.x,
      y: spot.y,
      pay: pay,
      required: required
    };
  }

  function freshRunFields(night, upg, endless) {
    const stats = carStats(upg);
    const startClock = night.start * 3600;
    return {
      phase: 'play',
      endless: !!endless,
      nightIndex: night.index,
      nightName: night.name,
      weather: night.weather,
      blurb: night.blurb,
      rate: night.rate,
      payMul: night.pay,
      fuelRate: night.fuel,
      rain: night.weather === 'rain',
      clock: startClock,
      startClock: startClock,
      timeTotal: MIDNIGHT - startClock,
      stats: stats,
      slots: stats.slots,
      x: City.HUB.x,
      y: City.HUB.y + 8,
      angle: -Math.PI / 2,
      speed: 0,
      steerV: 0,
      fuel: 100,
      nitro: 100,
      nitroOn: false,
      cargo: [],
      waiting: [],
      sideQueue: [],
      sideOffer: null,
      objective: null,
      targetIndex: 0,
      dropTimer: 0,
      hubTimer: 0,
      sideTimer: 0,
      earned: 0,
      bumps: 0,
      near: 0,
      combo: 0,
      bestCombo: 0,
      comboTime: 0,
      delivered: 0,
      sidesDone: 0,
      requiredTotal: night.req || 0,
      bumpLock: 0,
      celebrate: 0,
      result: null,
      accounted: false,
      events: [],
      popups: [],
      particles: [],
      trail: [],
      shake: 0,
      flash: 0,
      boostCd: {},
      traffic: [],
      fuels: [],
      clocks: [],
      nextId: 1,
      lowFuelPing: 0,
      warnPing: 0,
      reverseHold: 0,
      trunkPing: 0,
      endlessDrops: 0,
      steerInput: 0
    };
  }

  function pushEvent(state, e) {
    state.events.push(e);
    if (state.events.length > 12) state.events.shift();
  }

  function popup(state, x, y, text, color) {
    state.popups.push({ x: x, y: y, text: text, color: color || '#fff', life: 1.15, vy: -28 });
    if (state.popups.length > 14) state.popups.shift();
  }

  function burst(state, x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.4,
        max: 0.75,
        color: color,
        size: 2 + Math.random() * 2.5
      });
    }
    if (state.particles.length > 140) state.particles.splice(0, state.particles.length - 140);
  }

  function chooseObjective(state, keepId) {
    const opts = [];
    for (let i = 0; i < state.cargo.length; i++) {
      const c = state.cargo[i];
      opts.push({ kind: 'drop', id: c.id, x: c.x, y: c.y, name: c.name, required: c.required, pay: c.pay });
    }
    const hasReqCargo = state.cargo.some(function (c) { return c.required; });
    if (!hasReqCargo && state.waiting.length && state.cargo.length < state.slots) {
      opts.unshift({
        kind: 'hub',
        id: 'hub',
        x: City.HUB.x,
        y: City.HUB.y,
        name: City.HUB.name,
        required: true,
        pay: 0
      });
    }
    if (state.sideOffer && state.cargo.length < state.slots) {
      opts.push({
        kind: 'side',
        id: 'side',
        x: state.sideOffer.x,
        y: state.sideOffer.y,
        name: state.sideOffer.name,
        required: false,
        pay: state.sideOffer.pay
      });
    }
    if (!opts.length) {
      state.objective = null;
      state.targetIndex = 0;
      return;
    }
    if (keepId) {
      const idx = opts.findIndex(function (o) { return o.id === keepId; });
      if (idx >= 0) {
        state.targetIndex = idx;
        state.objective = opts[idx];
        state._opts = opts;
        return;
      }
    }
    let best = 0;
    if (!(opts[0] && opts[0].kind === 'hub')) {
      let bestD = Infinity;
      for (let i = 0; i < opts.length; i++) {
        if (!opts[i].required && opts[i].kind !== 'hub') continue;
        const d = Math.hypot(opts[i].x - state.x, opts[i].y - state.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (!opts[best].required && opts[0]) best = 0;
    }
    state.targetIndex = best;
    state.objective = opts[best];
    state._opts = opts;
  }

  function cycleTarget(state) {
    const opts = state._opts || [];
    if (opts.length < 2) return;
    state.targetIndex = (state.targetIndex + 1) % opts.length;
    state.objective = opts[state.targetIndex];
    popup(state, state.x, state.y - 20, 'Next: ' + state.objective.name, '#7cf6ff');
  }

  function loadFromWaiting(state) {
    while (state.waiting.length && state.cargo.length < state.slots) {
      const job = state.waiting.shift();
      state.cargo.push(job);
    }
  }

  function offerNextSide(state) {
    if (state.sideOffer || !state.sideQueue.length) return;
    if (state.cargo.some(function (c) { return !c.required; })) return;
    const spot = state.sideQueue.shift();
    const dropPool = City.SPOTS.filter(function (s) {
      return Math.hypot(s.x - spot.x, s.y - spot.y) > 700;
    });
    const drop = dropPool[Math.floor(state.rng() * dropPool.length)] || City.SPOTS[0];
    const pay = Math.round(280 * state.payMul);
    state.sideOffer = {
      id: 'side-pick-' + state.nextId++,
      name: spot.name,
      x: spot.x,
      y: spot.y,
      dropName: drop.name,
      dropX: drop.x,
      dropY: drop.y,
      pay: pay
    };
  }

  function createNight(nightIndex, upg) {
    const idx = clamp(nightIndex, 1, NIGHTS.length);
    const def = NIGHTS[idx - 1];
    const night = {
      index: idx,
      name: def.name,
      start: def.start,
      rate: def.rate,
      req: def.req,
      sides: def.sides,
      traffic: def.traffic,
      trafficSpeed: def.trafficSpeed,
      fuel: def.fuel,
      pay: def.pay,
      weather: def.weather,
      blurb: def.blurb
    };
    const state = freshRunFields(night, upg, false);
    state.rng = mulberry32(idx * 9176 + 42);
    const jobs = pickSpots(state.rng, night.req, 520, [City.HUB]);
    state.requiredTotal = jobs.length;
    for (let i = 0; i < jobs.length; i++) {
      const pay = Math.round((120 + (i % 3) * 15) * night.pay);
      state.waiting.push(makeJob(jobs[i], pay, true, state.nextId++));
    }
    loadFromWaiting(state);
    const sides = pickSpots(state.rng, night.sides, 480, jobs.concat([City.HUB]));
    state.sideQueue = sides;
    offerNextSide(state);
    state.fuels = pickSpots(state.rng, idx < 4 ? 2 : 3, 400, [City.HUB]).map(function (s, i) {
      return { id: 'f' + i, x: s.x, y: s.y };
    });
    state.clocks = pickSpots(state.rng, idx < 3 ? 1 : 2, 500, [City.HUB]).map(function (s, i) {
      return { id: 'c' + i, x: s.x, y: s.y };
    });
    spawnTraffic(state, night.traffic, night.trafficSpeed);
    chooseObjective(state);
    return state;
  }

  function createEndless(upg) {
    const night = {
      index: 0,
      name: 'Endless Coast',
      start: 22,
      rate: 52,
      req: 0,
      sides: 0,
      traffic: 10,
      trafficSpeed: 96,
      fuel: 0.7,
      pay: 1.2,
      weather: 'midnight',
      blurb: 'Every drop adds a little time. Midnight still arrives.'
    };
    const state = freshRunFields(night, upg, true);
    state.rng = mulberry32(9001);
    state.requiredTotal = 0;
    spawnNextEndless(state);
    state.fuels = pickSpots(state.rng, 3, 380, [City.HUB]).map(function (s, i) {
      return { id: 'f' + i, x: s.x, y: s.y };
    });
    state.clocks = pickSpots(state.rng, 2, 420, [City.HUB]).map(function (s, i) {
      return { id: 'c' + i, x: s.x, y: s.y };
    });
    spawnTraffic(state, 10, 96);
    chooseObjective(state);
    return state;
  }

  function spawnNextEndless(state) {
    const spots = pickSpots(state.rng, 1, 280, [{ x: state.x, y: state.y }]);
    const spot = spots[0] || City.SPOTS[state.endlessDrops % City.SPOTS.length];
    const pay = Math.round(150 + state.endlessDrops * 22);
    state.cargo = [makeJob(spot, pay, true, state.nextId++)];
    state.waiting = [];
    chooseObjective(state);
  }

  function spawnTraffic(state, count, speed) {
    const rng = state.rng;
    state.traffic = [];
    for (let n = 0; n < count; n++) {
      const vertical = rng() < 0.55;
      let x;
      let y;
      let dir = rng() < 0.5 ? -1 : 1;
      const lane = rng() < 0.5 ? -28 : 28;
      if (vertical) {
        const i = Math.floor(rng() * City.XS.length);
        x = City.XS[i] + lane;
        y = 160 + rng() * (City.WORLD_H - 320);
      } else {
        const j = Math.floor(rng() * City.YS.length);
        y = City.YS[j] + lane * 0.6;
        x = 320 + rng() * (City.WORLD_W - 420);
      }
      if (Math.hypot(x - City.HUB.x, y - City.HUB.y) < 220) {
        y -= 260;
      }
      const sp = speed * (0.82 + rng() * 0.35);
      state.traffic.push({
        x: x,
        y: y,
        dir: dir,
        vertical: vertical,
        lane: lane,
        speed: sp,
        base: sp,
        color: TRAFFIC_COLORS[n % TRAFFIC_COLORS.length],
        nearCd: 0,
        angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
        turnCd: 0
      });
    }
  }

  function requiredLeft(state) {
    let n = 0;
    for (let i = 0; i < state.cargo.length; i++) if (state.cargo[i].required) n++;
    for (let i = 0; i < state.waiting.length; i++) if (state.waiting[i].required) n++;
    return n;
  }

  function deliverCargo(state, job) {
    state.cargo = state.cargo.filter(function (c) { return c.id !== job.id; });
    state.earned += job.pay;
    state.delivered += 1;
    if (!job.required) state.sidesDone += 1;
    state.dropTimer = 0;
    popup(state, job.x, job.y - 10, 'Delivered +$' + job.pay, '#b8ffcf');
    burst(state, job.x, job.y, '#7dffb2', 16, 90);
    state.shake = Math.max(state.shake, 5);
    state.flash = 0.35;
    pushEvent(state, { t: 'deliver', name: job.name, pay: job.pay });
    if (!job.required) offerNextSide(state);
    if (state.endless) {
      state.endlessDrops += 1;
      state.clock = Math.max(state.startClock, state.clock - 150);
      popup(state, state.x, state.y - 36, '+2m 30s', '#ffe18a');
      if (state.endlessDrops % 2 === 0 && state.traffic.length < 22) {
        spawnTraffic(state, state.traffic.length + 1, 100 + state.endlessDrops * 2);
      }
      spawnNextEndless(state);
      return;
    }
    if (requiredLeft(state) === 0 && !state.cargo.some(function (c) { return !c.required; })) {
      finish(state, true);
      return;
    }
    chooseObjective(state);
  }

  function finish(state, cleared) {
    if (state.phase !== 'play') return;
    const timeLeft = Math.max(0, MIDNIGHT - state.clock);
    const minutesLeft = timeLeft / 60;
    const timeBonus = cleared && !state.endless ? Math.floor(minutesLeft * 4) : 0;
    const clearBonus = cleared && !state.endless ? 90 + state.nightIndex * 28 : 0;
    const stars = state.endless ? 0 : calcStars({
      cleared: cleared,
      timeLeft: timeLeft,
      timeTotal: state.timeTotal,
      bumps: state.bumps,
      sides: state.sidesDone,
      near: state.near
    });
    const base = state.earned;
    let banked;
    if (state.endless) banked = base;
    else if (cleared) banked = base + timeBonus + clearBonus;
    else banked = Math.floor(base * 0.45);
    state.result = {
      cleared: !!cleared,
      endless: !!state.endless,
      stars: stars,
      earned: base,
      timeBonus: timeBonus,
      clearBonus: clearBonus,
      banked: banked,
      timeLeft: timeLeft,
      timeTotal: state.timeTotal,
      minutesLeft: minutesLeft,
      delivered: state.delivered,
      required: state.requiredTotal,
      sides: state.sidesDone,
      bumps: state.bumps,
      near: state.near,
      bestCombo: state.bestCombo,
      nightIndex: state.nightIndex,
      nightName: state.nightName,
      score: banked,
      drops: state.endlessDrops || state.delivered
    };
    state.phase = 'celebrate';
    state.celebrate = cleared ? 1.05 : 0.7;
    state.shake = cleared ? 7 : 4;
    pushEvent(state, { t: cleared ? 'clear' : 'fail' });
  }

  function doBump(state, x, y) {
    if (state.bumpLock > 0) return;
    state.bumpLock = 0.85;
    state.bumps += 1;
    state.combo = 0;
    state.comboTime = 0;
    state.clock = Math.min(MIDNIGHT, state.clock + 240);
    state.shake = 9;
    state.speed *= 0.32;
    popup(state, x, y - 16, 'Fender bump  +4m', '#ffb4c8');
    burst(state, x, y, '#ffd0e0', 8, 70);
    pushEvent(state, { t: 'bump' });
  }

  function updateTraffic(state, dt) {
    const rng = state.rng;
    const cars = state.traffic;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      c.nearCd = Math.max(0, c.nearCd - dt);
      c.turnCd = Math.max(0, c.turnCd - dt);
      let ahead = false;
      for (let j = 0; j < cars.length; j++) {
        if (i === j) continue;
        const o = cars[j];
        const dx = o.x - c.x;
        const dy = o.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d < 78 && d > 1) {
          const forward = c.vertical ? c.dir * dy : c.dir * dx;
          if (forward > 0) ahead = true;
        }
      }
      const sp = ahead ? c.base * 0.35 : c.base;
      c.speed += (sp - c.speed) * Math.min(1, dt * 3);
      if (c.vertical) {
        c.y += c.dir * c.speed * dt;
        c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (c.y < 120) { c.dir = 1; c.turnCd = 0.4; }
        if (c.y > City.WORLD_H - 120) { c.dir = -1; c.turnCd = 0.4; }
        if (c.turnCd <= 0) {
          for (let j = 0; j < City.YS.length; j++) {
            if (Math.abs(c.y - City.YS[j]) < 6 && rng() < 0.18) {
              c.vertical = false;
              c.y = City.YS[j] + c.lane * 0.4;
              c.dir = rng() < 0.5 ? -1 : 1;
              c.turnCd = 0.8;
              break;
            }
          }
        }
      } else {
        c.x += c.dir * c.speed * dt;
        c.angle = c.dir > 0 ? 0 : Math.PI;
        if (c.x < 300) { c.dir = 1; c.turnCd = 0.4; }
        if (c.x > City.WORLD_W - 80) { c.dir = -1; c.turnCd = 0.4; }
        if (c.turnCd <= 0) {
          for (let j = 0; j < City.XS.length; j++) {
            if (Math.abs(c.x - City.XS[j]) < 6 && rng() < 0.18) {
              c.vertical = true;
              c.x = City.XS[j] + c.lane;
              c.dir = rng() < 0.5 ? -1 : 1;
              c.turnCd = 0.8;
              break;
            }
          }
        }
      }
    }
  }

  function step(state, input, dt) {
    if (!state || state.phase === 'summary' || state.phase === 'fail') return;
    dt = clamp(dt, 0, 0.05);
    if (state.phase === 'celebrate') {
      state.celebrate -= dt;
      state.flash = Math.max(0, state.flash - dt);
      state.shake *= Math.pow(0.04, dt);
      decayFx(state, dt);
      if (state.celebrate <= 0) state.phase = 'summary';
      return;
    }
    if (state.phase !== 'play') return;

    const inp = input || {};
    const gas = clamp(inp.gas || 0, 0, 1);
    const brake = clamp(inp.brake || 0, 0, 1);
    const steer = clamp(inp.steer || 0, -1, 1);
    state.steerV += (steer - state.steerV) * Math.min(1, dt * 8);
    state.steerInput = steer;

    const rain = state.rain ? 0.9 : 1;
    const sp = Math.abs(state.speed);
    const omega = state.steerV * state.stats.turn * rain;
    const speedScale = 1 / (1 + Math.max(0, sp - 150) / 380);
    if (sp > 12) state.angle += omega * speedScale * Math.sign(state.speed) * dt;
    else state.angle += steer * 2.1 * dt;
    if (state.angle > Math.PI * 2 || state.angle < -Math.PI * 2) {
      state.angle = Math.atan2(Math.sin(state.angle), Math.cos(state.angle));
    }

    if (Math.abs(state.steerV) > 0.25 && sp > 100) {
      state.speed -= Math.abs(state.steerV) * 360 * dt * Math.sign(state.speed || 1);
    }

    let max = state.stats.maxSpeed;
    const wantNitro = !!(inp.nitro && state.nitro > 1 && sp > 30);
    state.nitroOn = wantNitro;
    if (wantNitro) {
      max *= state.stats.nitroMul;
      state.nitro = Math.max(0, state.nitro - state.stats.nitroDrain * dt);
      state.speed += 70 * dt * (state.speed >= 0 ? 1 : -1);
      if (Math.random() < 0.7) burst(state, state.x, state.y, '#7cf6ff', 1, 40);
    } else {
      state.nitro = Math.min(100, state.nitro + state.stats.nitroRegen * dt);
    }

    if (state.fuel <= 0) max *= 0.24;
    else if (state.fuel < 16) max *= 0.62;
    if (City.onSand(state.x)) max *= 0.48;

    if (gas > 0 && state.speed < max) state.speed += state.stats.accel * gas * dt;
    if (Math.abs(state.speed) < 10 && brake > 0 && gas === 0) state.reverseHold += dt;
    else state.reverseHold = 0;
    if (brake > 0) {
      if (state.speed > 6) state.speed -= state.stats.brake * brake * dt;
      else if (state.reverseHold > 0.22) state.speed -= state.stats.brake * 0.4 * brake * dt;
      else if (state.speed > 0) state.speed = Math.max(0, state.speed - state.stats.brake * brake * dt);
    }
    state.speed -= state.speed * (0.42 + (state.rain ? 0.12 : 0)) * dt;
    if (gas === 0 && brake === 0) {
      const drag = 70 * dt;
      if (Math.abs(state.speed) <= drag) state.speed = 0;
      else state.speed -= Math.sign(state.speed) * drag;
    }
    state.speed = clamp(state.speed, -96, max);

    state.x += Math.cos(state.angle) * state.speed * dt;
    state.y += Math.sin(state.angle) * state.speed * dt;

    const resolved = City.resolveCar(state.x, state.y, City.CAR_R);
    if (resolved.hit) {
      const vx = Math.cos(state.angle) * state.speed;
      const vy = Math.sin(state.angle) * state.speed;
      const nx = resolved.hit.nx;
      const ny = resolved.hit.ny;
      const vn = vx * nx + vy * ny;
      if (vn < 0) {
        const tx = vx - vn * nx;
        const ty = vy - vn * ny;
        const tsp = Math.hypot(tx, ty);
        if (tsp > 20) {
          state.angle = Math.atan2(ty, tx);
          state.speed = tsp * 0.82 * (state.speed < 0 ? -1 : 1);
          if (state.speed < 0 && tsp > 40) state.speed = tsp * 0.82;
        } else if (Math.abs(state.speed) > 40) {
          state.speed *= -0.18;
        } else {
          state.speed *= 0.2;
        }
      }
      if (Math.abs(state.speed) > 80 || Math.abs(vn) > 70) doBump(state, state.x, state.y);
      state.x = resolved.x;
      state.y = resolved.y;
    }

    state.fuel -= (0.45 + Math.min(1, sp / 200) * 0.9) * state.fuelRate * dt;
    if (state.fuel < 0) state.fuel = 0;
    if (state.fuel < 18 && state.fuel > 0) {
      state.lowFuelPing -= dt;
      if (state.lowFuelPing <= 0) {
        state.lowFuelPing = 4.5;
        pushEvent(state, { t: 'lowfuel' });
      }
    }

    const hubD = Math.hypot(state.x - City.HUB.x, state.y - City.HUB.y);
    if (hubD < 108 && Math.abs(state.speed) < 140) {
      const before = state.fuel;
      state.fuel = Math.min(100, state.fuel + 18 * dt);
      if (before < 99 && state.fuel >= 99) pushEvent(state, { t: 'refuel' });
    }

    updateTraffic(state, dt);

    for (let i = 0; i < state.traffic.length; i++) {
      const c = state.traffic[i];
      const dx = c.x - state.x;
      const dy = c.y - state.y;
      const d = Math.hypot(dx, dy);
      if (d < 28 && d > 0.01) {
        const push = (28 - d) * 0.85;
        state.x -= (dx / d) * push;
        state.y -= (dy / d) * push;
        c.x += (dx / d) * push * 0.4;
        c.y += (dy / d) * push * 0.4;
        c.speed *= 0.6;
        if (Math.abs(state.speed) > 50) doBump(state, state.x, state.y);
        state.speed *= 0.45;
      } else if (d < 50 && d > 30 && Math.abs(state.speed) > 110 && c.nearCd <= 0) {
        c.nearCd = 2.4;
        state.near += 1;
        state.combo += 1;
        state.comboTime = 3.1;
        if (state.combo > state.bestCombo) state.bestCombo = state.combo;
        const bonus = 8 + state.combo * 6;
        state.earned += bonus;
        popup(state, state.x, state.y - 26, 'Near miss x' + state.combo, '#ffe18a');
        pushEvent(state, { t: 'nearmiss', combo: state.combo, pay: bonus });
      }
    }

    if (state.comboTime > 0) {
      state.comboTime -= dt;
      if (state.comboTime <= 0) state.combo = 0;
    }

    for (let i = 0; i < City.BOOSTS.length; i++) {
      const b = City.BOOSTS[i];
      if (Math.hypot(state.x - b.x, state.y - b.y) < 42) {
        const key = i;
        if (!state.boostCd[key] || state.boostCd[key] <= 0) {
          state.boostCd[key] = 1.3;
          const cap = state.stats.maxSpeed * (state.nitroOn ? state.stats.nitroMul : 1) * 1.08;
          if (state.speed >= 0) state.speed = Math.min(cap, Math.max(state.speed, state.stats.maxSpeed * 0.92) + 50);
          burst(state, state.x, state.y, '#ffc14d', 8, 120);
          pushEvent(state, { t: 'boost' });
        }
      }
      if (state.boostCd[i] > 0) state.boostCd[i] -= dt;
    }

    for (let i = state.fuels.length - 1; i >= 0; i--) {
      const f = state.fuels[i];
      if (Math.hypot(state.x - f.x, state.y - f.y) < 40) {
        state.fuel = Math.min(100, state.fuel + 42);
        state.fuels.splice(i, 1);
        popup(state, f.x, f.y, 'Fuel', '#ffc14d');
        burst(state, f.x, f.y, '#ffc14d', 10, 80);
        pushEvent(state, { t: 'fuel' });
      }
    }
    for (let i = state.clocks.length - 1; i >= 0; i--) {
      const f = state.clocks[i];
      if (Math.hypot(state.x - f.x, state.y - f.y) < 40) {
        state.clock = Math.max(state.startClock, state.clock - 300);
        state.clocks.splice(i, 1);
        popup(state, f.x, f.y, 'Time +5m', '#7cf6ff');
        burst(state, f.x, f.y, '#7cf6ff', 10, 80);
        pushEvent(state, { t: 'time' });
      }
    }

    state.bumpLock = Math.max(0, state.bumpLock - dt);
    state.clock += state.rate * dt;

    const remainClock = MIDNIGHT - state.clock;
    if (remainClock < 1500 && remainClock > 0) {
      state.warnPing -= dt;
      if (state.warnPing <= 0) {
        state.warnPing = 8;
        pushEvent(state, { t: 'tick' });
      }
    }

    let inDrop = false;
    let closest = null;
    let closestD = 118;
    for (let i = 0; i < state.cargo.length; i++) {
      const c = state.cargo[i];
      const d = Math.hypot(state.x - c.x, state.y - c.y);
      if (d < closestD) {
        closestD = d;
        closest = c;
      }
    }
    if (closest && Math.abs(state.speed) < 210) {
      inDrop = true;
      state.dropTimer += dt;
      if (state.dropTimer > 0.16) deliverCargo(state, closest);
    } else state.dropTimer = 0;

    if (!inDrop && state.sideOffer && state.cargo.length < state.slots) {
      const s = state.sideOffer;
      if (Math.hypot(state.x - s.x, state.y - s.y) < 100 && Math.abs(state.speed) < 180) {
        state.sideTimer += dt;
        if (state.sideTimer > 0.18) {
          state.cargo.push({
            id: state.nextId++,
            name: s.dropName,
            x: s.dropX,
            y: s.dropY,
            pay: s.pay,
            required: false
          });
          popup(state, s.x, s.y, 'Side contract', '#ffd36e');
          pushEvent(state, { t: 'side', name: s.name });
          state.sideOffer = null;
          state.sideTimer = 0;
          chooseObjective(state);
        }
      } else state.sideTimer = 0;
    } else {
      if (!inDrop && state.sideOffer && state.cargo.length >= state.slots) {
        const s = state.sideOffer;
        if (Math.hypot(state.x - s.x, state.y - s.y) < 100 && state.trunkPing <= 0) {
          state.trunkPing = 1.6;
          popup(state, s.x, s.y - 16, 'Trunk full', '#ffd0e0');
          pushEvent(state, { t: 'trunk' });
        }
      }
      state.sideTimer = 0;
    }
    state.trunkPing = Math.max(0, state.trunkPing - dt);

    const needHub = !state.cargo.some(function (c) { return c.required; }) && state.waiting.length && state.cargo.length < state.slots;
    if (needHub && hubD < 110 && Math.abs(state.speed) < 170) {
      state.hubTimer += dt;
      if (state.hubTimer > 0.2) {
        loadFromWaiting(state);
        popup(state, City.HUB.x, City.HUB.y - 20, 'Loaded', '#d7f7ff');
        pushEvent(state, { t: 'load' });
        state.hubTimer = 0;
        chooseObjective(state);
      }
    } else state.hubTimer = 0;

    if (state.phase === 'play' && state.clock >= MIDNIGHT) {
      state.clock = MIDNIGHT;
      finish(state, false);
    }

    if (Math.abs(state.speed) > 40) {
      state.trail.push({ x: state.x, y: state.y });
      if (state.trail.length > 14) state.trail.shift();
    } else if (state.trail.length) {
      state.trail.shift();
    }

    decayFx(state, dt);
    if (state.phase === 'play') {
      const keep = state.objective && state.objective.id;
      chooseObjective(state, keep);
    }
  }

  function decayFx(state, dt) {
    state.shake *= Math.pow(0.05, dt);
    if (state.shake < 0.3) state.shake = 0;
    state.flash = Math.max(0, state.flash - dt * 1.4);
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const p = state.popups[i];
      p.life -= dt;
      p.y += p.vy * dt;
      if (p.life <= 0) state.popups.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function applyResult(save, state) {
    if (!state || !state.result || state.accounted) return save;
    const r = state.result;
    save.cash = Math.max(0, Math.round((save.cash || 0) + r.banked));
    save.stats = save.stats || { deliveries: 0, nights: 0, near: 0 };
    save.stats.deliveries += r.delivered || 0;
    save.stats.near += r.near || 0;
    if (r.endless) {
      if ((r.score || 0) > (save.bestEndless || 0)) save.bestEndless = r.score;
      save.bestEndlessDrops = Math.max(save.bestEndlessDrops || 0, r.drops || 0);
    } else {
      save.bestStars = save.bestStars || {};
      const prev = save.bestStars[state.nightIndex] || 0;
      if (r.stars > prev) save.bestStars[state.nightIndex] = r.stars;
      if (r.cleared) {
        save.stats.nights += 1;
        save.unlocked = Math.max(save.unlocked || 1, Math.min(12, state.nightIndex + 1));
        if (state.nightIndex === NIGHTS.length) save.endless = true;
      }
    }
    state.accounted = true;
    return save;
  }

  function defaultSave() {
    return {
      v: 1,
      cash: 0,
      unlocked: 1,
      endless: false,
      bestStars: {},
      bestEndless: 0,
      bestEndlessDrops: 0,
      upg: { engine: 0, handling: 0, nitro: 0, trunk: 0 },
      paint: 0,
      paintsOwned: [0],
      settings: { music: 70, sfx: 80, quality: 'auto', shake: true, touch: 'auto' },
      stats: { deliveries: 0, nights: 0, near: 0 }
    };
  }

  return {
    MIDNIGHT: MIDNIGHT,
    NIGHTS: NIGHTS,
    UPGRADES: UPGRADES,
    PAINTS: PAINTS,
    clamp: clamp,
    angleDiff: angleDiff,
    formatClock: formatClock,
    formatLeft: formatLeft,
    carStats: carStats,
    calcStars: calcStars,
    createNight: createNight,
    createEndless: createEndless,
    step: step,
    cycleTarget: cycleTarget,
    chooseObjective: chooseObjective,
    applyResult: applyResult,
    defaultSave: defaultSave
  };
});
