/**
 * Block Tower player physics. Pure data — no rendering — so a scripted run
 * can prove the floors are beatable without a browser.
 */
import { buildLevel } from './levels.js';

export const PHYS = {
  r: 0.32,
  h: 1.58,
  g: 34,
  jumpV: 12,
  move: 7.5,
  accel: 92,
  airAccel: 46,
  coyote: 0.14,
  buffer: 0.14,
  stepHeight: 1.12,
  killDrop: 3.7,
  maxFall: 26,
};

function approach(cur, target, delta) {
  if (cur < target) return Math.min(target, cur + delta);
  return Math.max(target, cur - delta);
}

export function createState() {
  const ents = buildLevel();
  for (const e of ents) {
    if (e.crumble) {
      e.crumbleState = 'idle';
      e.stand = 0;
      e.gone = 0;
    }
  }
  const start = ents.find((e) => e.id === 'start');
  const floor = start.spawnFloor || 1;
  return {
    ents,
    time: 0,
    playTime: 0,
    deaths: 0,
    won: false,
    highest: floor,
    spawnId: start.id,
    spawn: { x: start.cx, y: start.top, z: start.cz, floor },
    jumpHeld: false,
    jumpBuffer: 0,
    coyote: PHYS.coyote,
    checkpointSerial: 0,
    player: {
      x: start.cx,
      y: start.top,
      z: start.cz,
      vx: 0,
      vy: 0,
      vz: 0,
      onGround: true,
      groundId: start.id,
    },
  };
}

function motionOffset(move, time) {
  if (!move) return 0;
  return Math.sin((Math.PI * 2 * time) / move.period + (move.phase || 0)) * move.amp;
}

export function solidPose(e, time, dt) {
  let ox = 0;
  let oy = 0;
  let oz = 0;
  let dx = 0;
  let dy = 0;
  let dz = 0;
  const gone = !!(e.crumble && e.crumbleState === 'gone');
  if (e.move && !gone) {
    const cur = motionOffset(e.move, time);
    const prev = motionOffset(e.move, time - dt);
    const d = cur - prev;
    if (e.move.axis === 'x') {
      ox = cur;
      dx = d;
    } else if (e.move.axis === 'y') {
      oy = cur;
      dy = d;
    } else {
      oz = cur;
      dz = d;
    }
  }
  const cx = e.cx + ox;
  const cz = e.cz + oz;
  const top = e.top + oy;
  return {
    id: e.id,
    seq: e.seq,
    kind: 'solid',
    color: e.color,
    floor: e.floor,
    spawnFloor: e.spawnFloor || 0,
    finish: !!e.finish,
    move: e.move || null,
    crumble: e.crumble || null,
    alive: !gone,
    cx,
    cz,
    top,
    w: e.w,
    h: e.h,
    d: e.d,
    minX: cx - e.w / 2,
    maxX: cx + e.w / 2,
    minZ: cz - e.d / 2,
    maxZ: cz + e.d / 2,
    minY: top - e.h,
    maxY: top,
    dx,
    dy,
    dz,
  };
}

export function hazardPose(e, time) {
  if (e.hazard === 'laser') {
    const u = ((time / e.pulse.period) + (e.pulse.phase || 0)) % 1;
    const top = e.top;
    return {
      id: e.id,
      hazard: 'laser',
      active: u < e.pulse.duty,
      minX: e.cx - e.w / 2,
      maxX: e.cx + e.w / 2,
      minZ: e.cz - e.d / 2,
      maxZ: e.cz + e.d / 2,
      minY: top,
      maxY: top + e.h,
      cx: e.cx,
      cz: e.cz,
      top,
      w: e.w,
      h: e.h,
      d: e.d,
    };
  }
  const ang = ((time / e.spin.period) + (e.spin.phase || 0)) * Math.PI * 2;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return {
    id: e.id,
    hazard: 'spinner',
    active: true,
    ang,
    cx: e.cx,
    cz: e.cz,
    pivot: e.pivot,
    radius: e.radius,
    thick: e.thick,
    depth: e.depth,
    ax: e.cx - c * e.radius,
    ay: e.pivot - s * e.radius,
    bx: e.cx + c * e.radius,
    by: e.pivot + s * e.radius,
  };
}

function overlapXZ(x, z, b) {
  return x + PHYS.r > b.minX && x - PHYS.r < b.maxX && z + PHYS.r > b.minZ && z - PHYS.r < b.maxZ;
}

function bodyHitsBox(x, y, z, b) {
  return overlapXZ(x, z, b) && y < b.maxY && y + PHYS.h > b.minY;
}

function segmentHitsAABB(ax, ay, az, bx, by, bz, minX, minY, minZ, maxX, maxY, maxZ) {
  let tmin = 0;
  let tmax = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const slab = (p0, d, min, max) => {
    if (Math.abs(d) < 1e-8) return p0 >= min && p0 <= max;
    let t1 = (min - p0) / d;
    let t2 = (max - p0) / d;
    if (t1 > t2) {
      const s = t1;
      t1 = t2;
      t2 = s;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };
  if (!slab(ax, dx, minX, maxX)) return false;
  if (!slab(ay, dy, minY, maxY)) return false;
  if (!slab(az, dz, minZ, maxZ)) return false;
  return true;
}

export function hitsHazardAt(state, x, y, z, time = state.time) {
  for (const e of state.ents) {
    if (e.kind !== 'hazard') continue;
    const h = hazardPose(e, time);
    if (!h.active) continue;
    if (h.hazard === 'laser') {
      if (bodyHitsBox(x, y, z, h)) return true;
    } else {
      const pad = h.thick * 0.5;
      const halfD = h.depth * 0.5;
      if (z + PHYS.r < h.cz - halfD || z - PHYS.r > h.cz + halfD) continue;
      if (segmentHitsAABB(
        h.ax, h.ay, z,
        h.bx, h.by, z,
        x - PHYS.r - pad,
        y - pad,
        z - 0.02,
        x + PHYS.r + pad,
        y + PHYS.h + pad,
        z + 0.02,
      )) return true;
    }
  }
  return false;
}

function aliveSolids(state, time, dt) {
  const list = [];
  for (const e of state.ents) {
    if (e.kind !== 'solid') continue;
    const pose = solidPose(e, time, dt);
    if (pose.alive) list.push(pose);
  }
  return list;
}

function collideHorizontal(p, solids, axis) {
  const dir = axis === 'x' ? Math.sign(p.vx) : Math.sign(p.vz);
  for (let pass = 0; pass < 2; pass++) {
    for (const b of solids) {
      if (!bodyHitsBox(p.x, p.y, p.z, b)) continue;
      if (p.y >= b.maxY - 0.06) continue;
      if (b.minY >= p.y + PHYS.h - 0.05) continue;
      const rise = b.maxY - p.y;
      if (rise > 0.001 && rise <= PHYS.stepHeight && p.vy <= 3) {
        p.y = b.maxY;
        p.vy = Math.max(0, p.vy);
        p.onGround = true;
        p.groundId = b.id;
        continue;
      }
      if (axis === 'x') {
        if (p.vx > 0 || dir > 0) p.x = b.minX - PHYS.r;
        else p.x = b.maxX + PHYS.r;
        p.vx = 0;
      } else {
        if (p.vz > 0 || dir > 0) p.z = b.minZ - PHYS.r;
        else p.z = b.maxZ + PHYS.r;
        p.vz = 0;
      }
    }
  }
}

function collideY(p, prevY, solids) {
  let landed = null;
  for (const b of solids) {
    if (!overlapXZ(p.x, p.z, b)) continue;
    if (p.vy <= 0 && prevY >= b.maxY - 0.1 && p.y <= b.maxY && p.y > b.maxY - 1.4) {
      if (!landed || b.maxY >= landed.maxY) landed = b;
    } else if (p.vy > 0 && prevY + PHYS.h <= b.minY + 0.08 && p.y + PHYS.h > b.minY && p.y < b.maxY) {
      p.y = b.minY - PHYS.h;
      p.vy = 0;
    }
  }
  if (landed) {
    p.y = landed.maxY;
    p.vy = 0;
    p.onGround = true;
    p.groundId = landed.id;
  }
}

function respawn(state) {
  const p = state.player;
  state.deaths += 1;
  p.x = state.spawn.x;
  p.y = state.spawn.y;
  p.z = state.spawn.z;
  p.vx = 0;
  p.vy = 0;
  p.vz = 0;
  p.onGround = true;
  p.groundId = state.spawnId;
  state.jumpBuffer = 0;
  state.coyote = PHYS.coyote;
}

function updateCrumble(state, dt) {
  const ground = state.player.groundId;
  for (const e of state.ents) {
    if (!e.crumble) continue;
    if (e.crumbleState === 'gone') {
      e.gone += dt;
      if (e.gone >= e.crumble.respawn) {
        e.crumbleState = 'idle';
        e.gone = 0;
        e.stand = 0;
      }
      continue;
    }
    if (ground === e.id) e.stand += dt;
    else e.stand = 0;
    if (e.stand >= e.crumble.delay) {
      e.crumbleState = 'gone';
      e.gone = 0;
      e.stand = 0;
      if (state.player.groundId === e.id) {
        state.player.groundId = null;
        state.player.onGround = false;
      }
    }
  }
}

function substep(state, input, dt) {
  const p = state.player;
  state.time += dt;
  const solids = aliveSolids(state, state.time, dt);

  if (p.groundId) {
    const g = solids.find((s) => s.id === p.groundId);
    if (g && Math.abs(p.y - g.maxY) < 0.22 && overlapXZ(p.x, p.z, g)) {
      p.x += g.dx;
      p.y += g.dy;
      p.z += g.dz;
    }
  }

  const yaw = input.yaw || 0;
  const forward = input.forward || 0;
  const strafe = input.strafe || 0;
  let wx = Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
  let wz = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
  const mag = Math.hypot(wx, wz);
  if (mag > 1) {
    wx /= mag;
    wz /= mag;
  }
  const accel = (p.onGround ? PHYS.accel : PHYS.airAccel) * dt;
  p.vx = approach(p.vx, wx * PHYS.move, accel);
  p.vz = approach(p.vz, wz * PHYS.move, accel);

  if (p.onGround) state.coyote = PHYS.coyote;
  else state.coyote = Math.max(0, state.coyote - dt);
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  if (state.jumpBuffer > 0 && state.coyote > 0 && !state.won) {
    p.vy = PHYS.jumpV;
    p.onGround = false;
    p.groundId = null;
    state.jumpBuffer = 0;
    state.coyote = 0;
  }

  p.vy = Math.max(-PHYS.maxFall, p.vy - PHYS.g * dt);

  p.onGround = false;
  const prevGround = p.groundId;
  p.groundId = null;

  p.x += p.vx * dt;
  collideHorizontal(p, solids, 'x');
  p.z += p.vz * dt;
  collideHorizontal(p, solids, 'z');
  const prevY = p.y;
  p.y += p.vy * dt;
  collideY(p, prevY, solids);

  if (!p.onGround && prevGround) {
    const g = solids.find((s) => s.id === prevGround);
    if (g && overlapXZ(p.x, p.z, g) && Math.abs(p.y - g.maxY) <= 0.16 && p.vy <= 0) {
      p.y = g.maxY;
      p.vy = 0;
      p.onGround = true;
      p.groundId = g.id;
    }
  }

  if (p.onGround) state.coyote = PHYS.coyote;

  if (!state.won && hitsHazardAt(state, p.x, p.y, p.z, state.time)) {
    respawn(state);
    return;
  }
  if (!state.won && p.y < state.spawn.y - PHYS.killDrop) {
    respawn(state);
    return;
  }

  if (p.groundId && p.groundId !== state.spawnId) {
    const ent = state.ents.find((e) => e.id === p.groundId);
    if (ent && ent.spawnFloor) {
      const pose = solids.find((s) => s.id === ent.id) || solidPose(ent, state.time, dt);
      state.spawnId = ent.id;
      state.spawn = { x: pose.cx, y: pose.maxY, z: pose.cz, floor: ent.spawnFloor };
      if (ent.spawnFloor > state.highest) state.highest = ent.spawnFloor;
      state.checkpointSerial += 1;
    }
    if (ent && ent.finish) state.won = true;
  }

  updateCrumble(state, dt);
}

export function step(state, input, dt) {
  if (state.won) return;
  const clamped = Math.min(Math.max(dt, 0), 0.05);
  if (input.timing !== false) state.playTime += clamped;
  const pressed = !!input.jump && !state.jumpHeld;
  state.jumpHeld = !!input.jump;
  if (pressed) state.jumpBuffer = PHYS.buffer;
  let left = clamped;
  const sub = 1 / 120;
  while (left > 1e-8) {
    const h = Math.min(sub, left);
    substep(state, input, h);
    left -= h;
    if (state.won) break;
  }
}

export function snapshot(state) {
  return {
    x: state.player.x,
    y: state.player.y,
    z: state.player.z,
    vx: state.player.vx,
    vy: state.player.vy,
    floor: state.spawn.floor,
    highest: state.highest,
    deaths: state.deaths,
    won: state.won,
    groundId: state.player.groundId,
    playTime: state.playTime,
    checkpointSerial: state.checkpointSerial,
    onGround: state.player.onGround,
  };
}
