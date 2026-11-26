import { LEVELS, TILE } from './levels.js';

export { TILE };

const PW = 20;
const PH = 40;
const PW_B = 28;
const PH_B = 52;
const GRAVITY = 2600;
const JUMP_V = -760;
const JUMP_CUT = 0.48;
const COYOTE = 0.1;
const BUFFER = 0.12;
const WALK_ACCEL = 1700;
const RUN_ACCEL = 2600;
const WALK_MAX = 200;
const RUN_MAX = 350;
const FRICTION = 2000;
const AIR_FRIC = 260;
const AIR_SCALE = 0.7;
const MAX_FALL = 1200;
const STOMP_V = -500;
const LIVES = 6;

const BEST_KEY = 'vesper-run-best';

function approach(v, target, delta) {
  if (v < target) return Math.min(target, v + delta);
  if (v > target) return Math.max(target, v - delta);
  return target;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createGame(opts = {}) {
  const storage = opts.storage || {
    get(k) {
      try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; }
    },
    set(k, v) {
      try { globalThis.localStorage?.setItem(k, String(v)); } catch { /* private mode */ }
    },
  };
  const sfx = opts.sfx || {};
  const play = (name) => { try { sfx[name]?.(); } catch { /* audio optional */ } };

  const parts = Array.from({ length: 180 }, () => ({ alive: false }));
  let partI = 0;

  const game = {
    phase: 'title',
    clock: 0,
    shake: 0,
    cam: { x: 0, y: 0 },
    viewW: 768,
    viewH: 432,
    level: null,
    levelIndex: 0,
    player: null,
    enemies: [],
    spikes: [],
    gems: [],
    crates: [],
    pickups: [],
    gates: [],
    checks: [],
    movers: [],
    bullets: [],
    beacon: null,
    boss: null,
    parts,
    score: 0,
    best: 0,
    lives: LIVES,
    deaths: 0,
    time: 0,
    shards: 0,
    freshBest: false,
    toast: '',
    toastT: 0,
    lock: 0,
  };

  let coyote = 0;
  let buffer = 0;
  let fireCd = 0;
  let gateCd = 0;
  let spawn = { x: 0, feet: 0 };
  let partEmit = 0;

  function readBest() {
    const n = Number(storage.get(BEST_KEY));
    game.best = Number.isFinite(n) ? n : 0;
  }

  function saveBest() {
    const prev = game.best;
    if (game.score > game.best) game.best = game.score;
    storage.set(BEST_KEY, game.best);
    game.freshBest = game.score > prev && game.score > 0;
  }

  function burst(x, y, color, n, speed, life) {
    for (let i = 0; i < n; i++) {
      const p = parts[partI];
      partI = (partI + 1) % parts.length;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - speed * 0.25;
      p.life = life * (0.6 + Math.random() * 0.4);
      p.max = p.life;
      p.color = color;
      p.size = 1.5 + Math.random() * 2.2;
    }
  }

  function tileSolid(c, r) {
    const level = game.level;
    if (!level) return false;
    if (r < 0 || r >= level.h) return false;
    if (c < 0 || c >= level.w) return true;
    return level.solid[r * level.w + c] === 1;
  }

  function solidAt(px, py) {
    if (py < 0) return false;
    return tileSolid(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  function rectsAt(x, y, w, h) {
    const out = [];
    const level = game.level;
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 0.001) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 0.001) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (tileSolid(c, r)) out.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE });
      }
    }
    for (const c of game.crates) {
      if (!c.alive) continue;
      if (x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y) {
        out.push({ x: c.x, y: c.y, w: c.w, h: c.h, crate: c });
      }
    }
    return out;
  }

  function columnSolid(x, foot) {
    if (moverUnder(x, foot)) return true;
    for (let d = 0; d <= 96; d += 16) {
      if (solidAt(x, foot + d)) return true;
    }
    return false;
  }

  function moverUnder(x, foot) {
    for (const m of game.movers) {
      if (x >= m.x && x <= m.x + m.w && Math.abs(foot - m.y) <= 4) return m;
    }
    return null;
  }

  function say(text) {
    game.toast = text;
    game.toastT = 1.6;
  }

  function load(index) {
    const src = LEVELS[index];
    game.levelIndex = index;
    game.level = {
      id: src.id,
      name: src.name,
      subtitle: src.subtitle,
      par: src.par,
      theme: src.theme,
      w: src.w,
      h: src.h,
      solid: src.solid,
    };
    game.enemies = [];
    game.spikes = [];
    game.gems = [];
    game.crates = [];
    game.pickups = [];
    game.gates = [];
    game.checks = [];
    game.movers = [];
    game.bullets = [];
    game.boss = null;
    game.beacon = null;
    game.time = 0;
    game.lock = 0;
    coyote = 0;
    buffer = 0;
    fireCd = 0;
    gateCd = 0.4;
    for (const p of parts) p.alive = false;

    const feetOf = (m) => (m.r + 1) * TILE;
    const midX = (m, w) => m.c * TILE + (TILE - w) / 2;
    let hasBoss = false;

    for (const m of src.marks) {
      if (m.kind === 'warden') hasBoss = true;
    }

    for (const m of src.marks) {
      if (m.kind === 'spawn') {
        spawn = { x: midX(m, PW), feet: feetOf(m) };
      } else if (m.kind === 'shard') {
        game.gems.push({
          x: m.c * TILE + 8,
          y: feetOf(m) - 26,
          w: 16,
          h: 16,
          got: false,
          phase: (m.c * 1.7 + m.r) % 6,
        });
      } else if (m.kind === 'skitter') {
        const w = 30;
        const h = 24;
        game.enemies.push({
          kind: 'skitter',
          x: midX(m, w),
          y: feetOf(m) - h,
          w,
          h,
          speed: m.speed ?? 46,
          vx: m.speed ?? 46,
          minX: (m.left ?? m.c - 2) * TILE,
          maxX: (m.right ?? m.c + 3) * TILE,
          alive: true,
        });
      } else if (m.kind === 'lens') {
        const w = 28;
        const h = 18;
        game.enemies.push({
          kind: 'lens',
          x: midX(m, w),
          y: m.r * TILE + 6,
          baseY: m.r * TILE + 6,
          w,
          h,
          speed: m.speed ?? 48,
          vx: -(m.speed ?? 48),
          minX: (m.left ?? m.c - 2) * TILE,
          maxX: (m.right ?? m.c + 3) * TILE,
          alive: true,
          t: m.c,
        });
      } else if (m.kind === 'spike') {
        game.spikes.push({ x: m.c * TILE + 4, y: feetOf(m) - 16, w: 24, h: 16 });
      } else if (m.kind === 'crate') {
        game.crates.push({
          x: m.c * TILE + 2,
          y: m.r * TILE + 2,
          w: 28,
          h: 28,
          alive: true,
          loot: m.loot || 'shard',
          bump: 0,
        });
      } else if (m.kind === 'checkpoint') {
        game.checks.push({
          x: m.c * TILE + 10,
          y: feetOf(m) - 52,
          w: 12,
          h: 52,
          on: false,
          spawnX: midX(m, PW),
          feet: feetOf(m),
        });
      } else if (m.kind === 'gate') {
        game.gates.push({
          pair: m.pair,
          x: m.c * TILE + 4,
          y: feetOf(m) - 48,
          w: 24,
          h: 48,
        });
      } else if (m.kind === 'mover') {
        const tiles = m.tiles || 4;
        const overhang = m.overhang || 0;
        const minX = (m.c - overhang) * TILE;
        const w = tiles * TILE;
        game.movers.push({
          x: minX,
          y: m.r * TILE,
          w,
          h: 12,
          minX,
          maxX: minX + (m.travel || 6) * TILE,
          speed: m.speed || 90,
          vx: m.speed || 90,
          dx: 0,
        });
      } else if (m.kind === 'bulk' || m.kind === 'arc') {
        game.pickups.push({
          kind: m.kind,
          x: m.c * TILE + 7,
          y: feetOf(m) - 22,
          w: 18,
          h: 18,
          age: 0,
        });
      } else if (m.kind === 'warden') {
        const w = 78;
        const h = 70;
        game.boss = {
          kind: 'warden',
          x: m.c * TILE,
          y: feetOf(m) - h,
          baseY: feetOf(m) - h,
          w,
          h,
          hp: 3,
          maxHp: 3,
          speed: m.speed ?? 60,
          vx: m.speed ?? 60,
          minX: (m.left ?? m.c - 3) * TILE,
          maxX: (m.right ?? m.c + 5) * TILE,
          t: 0,
          alive: true,
          vulnerable: false,
        };
      } else if (m.kind === 'beacon') {
        game.beacon = {
          x: m.c * TILE + 8,
          y: feetOf(m) - 132,
          w: 18,
          h: 132,
          baseY: feetOf(m),
          ready: !hasBoss,
        };
      }
    }

    const player = {
      x: spawn.x,
      y: spawn.feet - PH,
      w: PW,
      h: PH,
      vx: 0,
      vy: 0,
      grounded: false,
      jumping: false,
      facing: 1,
      bulk: false,
      arc: false,
      invuln: 0.4,
      anim: 0,
      riding: null,
    };
    game.player = player;
    snapFeet();
    snapCamera(true);
    say(src.name.toUpperCase());
  }

  function snapFeet() {
    const p = game.player;
    p.y = spawn.feet - p.h;
    p.x = spawn.x;
    p.vx = 0;
    p.vy = 0;
    p.grounded = true;
    p.jumping = false;
    p.riding = null;
  }

  function setSize(bulk) {
    const p = game.player;
    const feet = p.y + p.h;
    const cx = p.x + p.w / 2;
    p.bulk = bulk;
    p.w = bulk ? PW_B : PW;
    p.h = bulk ? PH_B : PH;
    p.y = feet - p.h;
    p.x = cx - p.w / 2;
    for (let i = 0; i < 10; i++) {
      if (!rectsAt(p.x, p.y, p.w, p.h).some((r) => overlap(p, r))) break;
      p.y -= 4;
    }
  }

  function snapCamera(instant) {
    const p = game.player;
    const level = game.level;
    if (!p || !level) return;
    const look = Math.max(-120, Math.min(120, p.vx * 0.34)) + p.facing * 36;
    let tx = p.x + p.w / 2 + look - game.viewW / 2;
    let ty = p.y + p.h * 0.35 - game.viewH * 0.58;
    const maxX = Math.max(0, level.w * TILE - game.viewW);
    const maxY = Math.max(0, level.h * TILE - game.viewH);
    tx = Math.max(0, Math.min(maxX, tx));
    ty = Math.max(0, Math.min(maxY, ty));
    if (instant) {
      game.cam.x = tx;
      game.cam.y = ty;
    } else {
      const k = 1 - Math.exp(-6.2 * (1 / 60));
      game.cam.x += (tx - game.cam.x) * k;
      game.cam.y += (ty - game.cam.y) * k;
      game.cam.x = Math.max(0, Math.min(maxX, game.cam.x));
      game.cam.y = Math.max(0, Math.min(maxY, game.cam.y));
    }
  }

  function moveX(dx) {
    const p = game.player;
    if (dx === 0) return;
    const prev = p.x;
    p.x += dx;
    const maxX = game.level.w * TILE - p.w;
    if (p.x < 0) { p.x = 0; p.vx = 0; }
    if (p.x > maxX) { p.x = maxX; p.vx = 0; }
    const hits = rectsAt(p.x, p.y, p.w, p.h);
    if (dx > 0) {
      let block = null;
      for (const r of hits) {
        if (prev + p.w <= r.x + 0.8 && p.x + p.w > r.x) block = block == null ? r.x : Math.min(block, r.x);
      }
      if (block != null) { p.x = block - p.w - 0.02; p.vx = 0; }
    } else {
      let block = null;
      for (const r of hits) {
        if (prev >= r.x + r.w - 0.8 && p.x < r.x + r.w) block = block == null ? r.x + r.w : Math.max(block, r.x + r.w);
      }
      if (block != null) { p.x = block + 0.02; p.vx = 0; }
    }
  }

  function moveY(dy) {
    const p = game.player;
    if (dy === 0) return false;
    const prev = p.y;
    p.y += dy;
    const hits = rectsAt(p.x, p.y, p.w, p.h);
    if (dy > 0) {
      for (const m of game.movers) hits.push({ x: m.x, y: m.y, w: m.w, h: 8, mover: m });
      for (const e of game.enemies) {
        if (e.alive) hits.push({ x: e.x + 3, y: e.y, w: e.w - 6, h: 10, enemy: e });
      }
      if (game.boss && game.boss.alive && game.boss.vulnerable) {
        const b = game.boss;
        hits.push({ x: b.x + 10, y: b.y, w: b.w - 20, h: 14, enemy: b });
      }
      let floor = null;
      let ride = null;
      let victim = null;
      for (const r of hits) {
        if (!overlap(p, r)) continue;
        if (prev + p.h <= r.y + 3 && p.y + p.h > r.y) {
          if (floor == null || r.y < floor) {
            floor = r.y;
            ride = r.mover || null;
            victim = r.enemy || null;
          }
        }
      }
      if (floor != null) {
        if (victim) {
          if (victim.kind === 'warden') hitBoss(true);
          else stompEnemy(victim);
          return true;
        }
        const impact = p.vy;
        p.y = floor - p.h;
        p.vy = 0;
        p.grounded = true;
        p.jumping = false;
        p.riding = ride;
        if (impact > 640) {
          game.shake = Math.max(game.shake, 3);
          burst(p.x + p.w / 2, p.y + p.h, '#9ad', 5, 70, 0.25);
        }
        return true;
      }
      p.riding = null;
      return false;
    }
    let ceil = null;
    let crate = null;
    for (const r of hits) {
      if (!overlap(p, r)) continue;
      if (prev >= r.y + r.h - 2 && p.y < r.y + r.h) {
        const bottom = r.y + r.h;
        if (ceil == null || bottom > ceil) {
          ceil = bottom;
          crate = r.crate || null;
        }
      }
    }
    if (ceil != null) {
      p.y = ceil + 0.05;
      p.vy = 40;
      p.jumping = false;
      if (crate) popCrate(crate);
    }
    return false;
  }

  function hasSupport() {
    const p = game.player;
    const foot = p.y + p.h + 0.6;
    if (solidAt(p.x + 3, foot) || solidAt(p.x + p.w - 3, foot)) return true;
    if (moverUnder(p.x + p.w / 2, p.y + p.h)) return true;
    return false;
  }

  function popCrate(c) {
    if (!c.alive) return;
    c.alive = false;
    c.bump = 1;
    game.score += 50;
    play('crate');
    game.shake = Math.max(game.shake, 4);
    burst(c.x + c.w / 2, c.y, '#ffb13a', 12, 140, 0.4);
    if (c.loot === 'empty') return;
    if (c.loot === 'shard') {
      game.gems.push({ x: c.x + 6, y: c.y - 18, w: 16, h: 16, got: false, phase: 0 });
    } else {
      game.pickups.push({ kind: c.loot, x: c.x + 5, y: c.y - 20, w: 18, h: 18, age: 0 });
    }
  }

  function givePickup(item) {
    const p = game.player;
    if (item.kind === 'bulk') {
      setSize(true);
      say('BULK FRAME');
      play('power');
      burst(p.x + p.w / 2, p.y + 10, '#ffb13a', 16, 160, 0.45);
    } else if (item.kind === 'arc') {
      p.arc = true;
      say('ARC SPOOL');
      play('power');
      burst(p.x + p.w / 2, p.y + 14, '#ff2d78', 16, 160, 0.45);
    }
    game.score += 400;
  }

  function stompEnemy(e) {
    const p = game.player;
    e.alive = false;
    p.y = e.y - p.h - 0.5;
    p.vy = STOMP_V;
    p.grounded = false;
    p.jumping = false;
    p.riding = null;
    game.score += 250;
    game.shake = Math.max(game.shake, 5);
    play('stomp');
    burst(e.x + e.w / 2, e.y + e.h / 2, e.kind === 'lens' ? '#d56bff' : '#3ef0ff', 14, 180, 0.4);
  }

  function hurt(from) {
    const p = game.player;
    if (p.invuln > 0 || game.lock > 0) return;
    if (p.bulk) {
      setSize(false);
      p.invuln = 1.35;
      p.vy = -320;
      p.grounded = false;
      const dir = from && p.x + p.w / 2 < from.x + (from.w || 0) / 2 ? -1 : 1;
      p.vx = dir * 180;
      game.shake = Math.max(game.shake, 6);
      play('hurt');
      burst(p.x + p.w / 2, p.y + 12, '#ffb13a', 10, 150, 0.35);
      say('FRAME CRACKED');
      return;
    }
    kill();
  }

  function kill() {
    const p = game.player;
    game.deaths += 1;
    game.lives -= 1;
    game.shake = 10;
    play('die');
    burst(p.x + p.w / 2, p.y + p.h / 2, '#ff2d78', 18, 200, 0.5);
    if (game.lives <= 0) {
      game.phase = 'over';
      saveBest();
      return;
    }
    setSize(false);
    p.arc = false;
    p.invuln = 1.25;
    game.lock = 0.28;
    snapFeet();
    game.bullets.length = 0;
  }

  function hitBoss(stomped) {
    const boss = game.boss;
    const p = game.player;
    if (!boss || !boss.alive || !boss.vulnerable) return false;
    boss.hp -= 1;
    game.score += 500;
    game.shake = Math.max(game.shake, 8);
    play('boss');
    burst(boss.x + boss.w / 2, boss.y + 10, '#ff4d6a', 16, 200, 0.45);
    if (stomped) {
      p.y = boss.y - p.h - 0.5;
      p.vy = STOMP_V;
      p.grounded = false;
      p.jumping = false;
    }
    if (boss.hp <= 0) {
      boss.alive = false;
      if (game.beacon) game.beacon.ready = true;
      game.shake = 14;
      play('down');
      burst(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffd0a8', 28, 260, 0.7);
      say('WARDEN DARK');
      game.score += 1500;
    }
    return true;
  }

  function finish() {
    if (game.phase !== 'play') return;
    const par = game.level.par;
    const bonus = Math.max(0, Math.floor(par - game.time) * 20);
    game.score += 1000 + bonus;
    saveBest();
    play('clear');
    game.shake = 6;
    burst(game.player.x + 10, game.player.y, '#3ef0ff', 22, 220, 0.6);
    game.phase = game.levelIndex >= LEVELS.length - 1 ? 'victory' : 'clear';
  }

  function fire() {
    const p = game.player;
    if (!p.arc || fireCd > 0) return;
    if (game.bullets.length > 6) game.bullets.shift();
    const dir = p.facing || 1;
    game.bullets.push({
      x: dir > 0 ? p.x + p.w : p.x - 12,
      y: p.y + p.h * 0.42,
      w: 12,
      h: 4,
      vx: dir * 560,
      life: 0.55,
    });
    fireCd = 0.26;
    play('shoot');
  }

  function step(dt, input, view) {
    if (view) {
      game.viewW = view.w;
      game.viewH = view.h;
    }
    game.clock += dt;
    if (game.toastT > 0) game.toastT -= dt;
    if (game.phase !== 'play') {
      snapCamera(false);
      return;
    }
    const p = game.player;
    game.time += dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (buffer > 0) buffer -= dt;
    if (coyote > 0) coyote -= dt;
    if (fireCd > 0) fireCd -= dt;
    if (gateCd > 0) gateCd -= dt;
    if (game.lock > 0) game.lock -= dt;
    p.anim += dt * (4 + Math.min(14, Math.abs(p.vx) / 30));

    for (const m of game.movers) {
      const prev = m.x;
      m.x += m.vx * dt;
      if (m.x < m.minX) { m.x = m.minX; m.vx = Math.abs(m.speed); }
      if (m.x > m.maxX) { m.x = m.maxX; m.vx = -Math.abs(m.speed); }
      m.dx = m.x - prev;
    }

    const locked = game.lock > 0;
    if (!locked && p.riding) {
      p.x += p.riding.dx;
      const maxX = game.level.w * TILE - p.w;
      if (p.x < 0) p.x = 0;
      if (p.x > maxX) p.x = maxX;
    }

    if (input.jumpPressed) buffer = BUFFER;

    if (!locked) {
      const accel = (input.run ? RUN_ACCEL : WALK_ACCEL) * (p.grounded ? 1 : AIR_SCALE);
      const max = input.run ? RUN_MAX : WALK_MAX;
      if (input.left) {
        p.facing = -1;
        p.vx = p.vx > -max ? Math.max(-max, p.vx - accel * dt) : p.vx;
      }
      if (input.right) {
        p.facing = 1;
        p.vx = p.vx < max ? Math.min(max, p.vx + accel * dt) : p.vx;
      }
      if (!input.left && !input.right) {
        p.vx = approach(p.vx, 0, (p.grounded ? FRICTION : AIR_FRIC) * dt);
      } else if (Math.abs(p.vx) > max) {
        p.vx = approach(p.vx, Math.sign(p.vx) * max, FRICTION * dt);
      }
    } else {
      p.vx = 0;
    }

    if (!locked && buffer > 0 && (p.grounded || coyote > 0)) {
      p.vy = JUMP_V;
      p.grounded = false;
      p.riding = null;
      coyote = 0;
      buffer = 0;
      p.jumping = true;
      play('jump');
    } else if (p.grounded && !hasSupport()) {
      p.grounded = false;
      p.riding = null;
      coyote = COYOTE;
    }

    if (!input.jumpHeld && p.jumping && p.vy < 0) {
      p.vy *= JUMP_CUT;
      p.jumping = false;
    }

    if (!p.grounded) {
      p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    } else {
      p.vy = 0;
    }

    if (p.riding) {
      const m = p.riding;
      const foot = p.y + p.h;
      const on = foot >= m.y - 3 && foot <= m.y + 8 && p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2;
      if (!on) p.riding = null;
    }
    const feetBefore = p.y + p.h;
    const fallSpeed = p.vy;
    if (!locked) {
      moveX(p.vx * dt);
      const landed = moveY(p.vy * dt);
      if (!landed && p.grounded && !hasSupport()) {
        p.grounded = false;
        p.riding = null;
        coyote = COYOTE;
      }
    }

    if (p.grounded && Math.abs(p.vx) > 90) {
      partEmit -= dt;
      if (partEmit <= 0) {
        partEmit = 0.045;
        burst(p.x + p.w / 2, p.y + p.h, '#6cf', 1, 40, 0.18);
      }
    }

    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (e.kind === 'skitter') {
        e.x += e.vx * dt;
        const dir = e.vx >= 0 ? 1 : -1;
        const front = dir > 0 ? e.x + e.w + 1 : e.x - 1;
        const wall = solidAt(front, e.y + e.h * 0.5);
        const ground = solidAt(front, e.y + e.h + 2) || moverUnder(front, e.y + e.h);
        if (wall || !ground || e.x < e.minX || e.x + e.w > e.maxX) {
          e.vx = -dir * Math.abs(e.speed || 40);
          if (e.x < e.minX) e.x = e.minX;
          if (e.x + e.w > e.maxX) e.x = e.maxX - e.w;
        }
      } else {
        e.t += dt;
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 3) * 8;
        if (e.x < e.minX) { e.x = e.minX; e.vx = Math.abs(e.speed); }
        if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.speed); }
      }
    }

    if (game.boss && game.boss.alive) {
      const b = game.boss;
      b.t += dt;
      const phase = b.t % 2.7;
      b.vulnerable = phase > 1.45 && phase < 2.55;
      b.x += b.vx * dt;
      if (b.x < b.minX) { b.x = b.minX; b.vx = Math.abs(b.speed); }
      if (b.x + b.w > b.maxX) { b.x = b.maxX - b.w; b.vx = -Math.abs(b.speed); }
      b.y = b.baseY + Math.sin(b.t * 1.6) * 5 + (b.vulnerable ? 16 : 0);
    }

    if (input.runPressed || (input.run && p.arc)) fire();

    for (const b of game.bullets) {
      b.x += b.vx * dt;
      b.life -= dt;
      if (solidAt(b.x + b.w / 2, b.y + b.h / 2)) b.life = 0;
      for (const e of game.enemies) {
        if (!e.alive || b.life <= 0) continue;
        if (overlap(b, e)) {
          e.alive = false;
          b.life = 0;
          game.score += 250;
          play('stomp');
          burst(e.x + e.w / 2, e.y + 6, '#ff2d78', 10, 160, 0.35);
        }
      }
      if (game.boss && game.boss.alive && b.life > 0 && overlap(b, game.boss)) {
        b.life = 0;
        if (!hitBoss(false)) burst(b.x, b.y, '#889', 4, 60, 0.2);
      }
    }
    game.bullets = game.bullets.filter((b) => b.life > 0);

    for (const e of game.enemies) {
      if (!e.alive || !overlap(p, e)) continue;
      const stomping = fallSpeed > 40 && feetBefore <= e.y + e.h * 0.55;
      if (stomping) stompEnemy(e);
      else {
        const deep = p.y + p.h > e.y + e.h * 0.42 && p.y < e.y + e.h - 4;
        if (deep) hurt(e);
      }
    }

    if (game.boss && game.boss.alive && overlap(p, game.boss)) {
      const b = game.boss;
      const stomping = fallSpeed > 40 && feetBefore <= b.y + 22;
      if (stomping && b.vulnerable) hitBoss(true);
      else if (p.y + p.h > b.y + 16 && p.y < b.y + b.h - 6) hurt(b);
    }

    for (const s of game.spikes) {
      if (overlap(p, s)) hurt(s);
    }

    for (const g of game.gems) {
      if (g.got) continue;
      g.phase += dt;
      if (overlap(p, g)) {
        g.got = true;
        game.shards += 1;
        game.score += 100;
        play('shard');
        burst(g.x + 8, g.y + 8, '#3ef0ff', 8, 110, 0.35);
      }
    }

    for (let i = game.pickups.length - 1; i >= 0; i--) {
      const item = game.pickups[i];
      item.age += dt;
      if (overlap(p, item)) {
        givePickup(item);
        game.pickups.splice(i, 1);
      }
    }

    if (gateCd <= 0) {
      for (const g of game.gates) {
        if (!overlap(p, g)) continue;
        const other = game.gates.find((o) => o !== g && o.pair === g.pair);
        if (!other) break;
        p.x = other.x + other.w / 2 - p.w / 2;
        p.y = other.y + other.h - p.h;
        p.vx *= 0.15;
        p.vy = 0;
        gateCd = 0.45;
        play('gate');
        burst(other.x + 12, other.y + 20, '#d56bff', 12, 120, 0.35);
        break;
      }
    }

    for (const k of game.checks) {
      if (k.on || !overlap(p, k)) continue;
      k.on = true;
      spawn = { x: k.spawnX, feet: k.feet };
      play('check');
      say('PYLON LOCKED');
      burst(k.x + 6, k.y + 10, '#5dffc4', 8, 90, 0.3);
    }

    if (p.y > game.level.h * TILE + 24) kill();

    if (game.beacon && game.beacon.ready) {
      const cx = p.x + p.w / 2;
      const bx = game.beacon.x + game.beacon.w / 2;
      if (Math.abs(cx - bx) < 26 && p.y + p.h > game.beacon.baseY - 150 && p.y < game.beacon.baseY) {
        finish();
      }
    }

    for (const part of parts) {
      if (!part.alive) continue;
      part.life -= dt;
      if (part.life <= 0) { part.alive = false; continue; }
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vy += 500 * dt;
    }

    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 16);
    snapCamera(false);
  }

  function sensors() {
    const p = game.player;
    const foot = p.y + p.h;
    const front = p.x + p.w;
    let gapAhead = false;
    let waitForMover = false;
    let moverReady = false;
    let rideHold = false;
    let rideBack = false;
    if (p.grounded) {
      const close = columnSolid(front + 10, foot);
      const far = columnSolid(front + 54, foot);
      gapAhead = close && !far;
      if (p.riding) {
        const m = p.riding;
        const room = m.x + m.w - front;
        const past = columnSolid(m.x + m.w + 10, foot);
        if (room > 48 && !past) gapAhead = false;
        if (!past) {
          rideHold = true;
          if (room < m.w * 0.62) rideBack = true;
        }
      }
      if (gapAhead) {
        const gapX = front + 24;
        for (const m of game.movers) {
          if (Math.abs(m.y - foot) > 8) continue;
          const serves = m.minX - 48 <= gapX && m.maxX + m.w + 48 >= gapX;
          if (!serves) continue;
          const overlapsNow = m.x < front + 8 && m.x + m.w > p.x + 4;
          if (overlapsNow) moverReady = true;
          else waitForMover = true;
        }
        if (moverReady) waitForMover = false;
      }
    }
    const wallAhead = solidAt(front + 3, p.y + p.h - 10) && !solidAt(front + 3, p.y + 2);
    const enemyAhead = game.enemies.some((e) => e.alive
      && e.x < front + 68
      && e.x + e.w > p.x + 8
      && Math.abs((e.y + e.h / 2) - (p.y + p.h / 2)) < 36);
    const hazardAhead = game.spikes.some((s) => s.x < front + 46 && s.x + s.w > front - 4 && Math.abs((s.y + s.h) - foot) < 22);
    let bossStomp = false;
    if (game.boss && game.boss.alive && game.boss.vulnerable && p.grounded) {
      const dx = game.boss.x - front;
      bossStomp = dx < 86 && dx > -20;
    }
    return { gapAhead, wallAhead, enemyAhead, hazardAhead, waitForMover, moverReady, rideHold, rideBack, bossStomp, grounded: p.grounded };
  }

  function snapshot() {
    const p = game.player;
    return {
      phase: game.phase,
      levelIndex: game.levelIndex,
      levelName: game.level ? game.level.name : '',
      score: game.score,
      best: game.best,
      lives: game.lives,
      deaths: game.deaths,
      time: game.time,
      shards: game.shards,
      toast: game.toastT > 0 ? game.toast : '',
      player: p ? {
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, w: p.w, h: p.h,
        grounded: p.grounded, bulk: p.bulk, arc: p.arc, facing: p.facing, invuln: p.invuln,
      } : null,
      enemies: game.enemies.map((e) => ({ kind: e.kind, x: e.x, y: e.y, w: e.w, h: e.h, alive: e.alive })),
      boss: game.boss ? { hp: game.boss.hp, alive: game.boss.alive, vulnerable: game.boss.vulnerable, x: game.boss.x, y: game.boss.y } : null,
      beaconReady: !!(game.beacon && game.beacon.ready),
      collected: game.shards,
    };
  }

  readBest();
  load(0);
  game.phase = 'title';

  game.load = load;
  game.step = step;
  game.sensors = sensors;
  game.snapshot = snapshot;
  game.burst = burst;
  game.startRun = () => {
    game.score = 0;
    game.lives = LIVES;
    game.deaths = 0;
    game.shards = 0;
    readBest();
    load(0);
    game.phase = 'play';
  };
  game.nextLevel = () => {
    if (game.levelIndex >= LEVELS.length - 1) {
      game.phase = 'victory';
      saveBest();
      return;
    }
    load(game.levelIndex + 1);
    game.phase = 'play';
  };
  game.retryLevel = () => {
    const keepScore = game.score;
    const keepLives = Math.max(game.lives, 1);
    const keepShards = game.shards;
    const keepDeaths = game.deaths;
    load(game.levelIndex);
    game.score = keepScore;
    game.lives = keepLives;
    game.shards = keepShards;
    game.deaths = keepDeaths;
    game.phase = 'play';
  };
  game.pause = () => { if (game.phase === 'play') game.phase = 'pause'; };
  game.resume = () => { if (game.phase === 'pause') game.phase = 'play'; };
  game.toTitle = () => { game.phase = 'title'; snapCamera(true); };
  game.tickTitle = (dt) => {
    game.clock += dt;
    if (game.player) game.player.anim += dt * 8;
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 16);
  };
  return game;
}

export const PHYS = { COYOTE, BUFFER, JUMP_V, JUMP_CUT, GRAVITY, WALK_MAX, RUN_MAX, PW, PH };
