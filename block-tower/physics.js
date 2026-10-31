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
    invuln: 0,
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

export function solidPose(e, time, dt, out) {
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
  const pose = out || {};
  pose.id = e.id;
  pose.seq = e.seq;
  pose.kind = 'solid';
  pose.color = e.color;
  pose.floor = e.floor;
  pose.spawnFloor = e.spawnFloor || 0;
  pose.finish = !!e.finish;
  pose.move = e.move || null;
  pose.crumble = e.crumble || null;
  pose.alive = !gone;
  pose.cx = cx;
  pose.cz = cz;
  pose.top = top;
  pose.w = e.w;
  pose.h = e.h;
  pose.d = e.d;
  pose.minX = cx - e.w / 2;
  pose.maxX = cx + e.w / 2;
  pose.minZ = cz - e.d / 2;
  pose.maxZ = cz + e.d / 2;
  pose.minY = top - e.h;
  pose.maxY = top;
  pose.dx = dx;
  pose.dy = dy;
  pose.dz = dz;
  return pose;
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

const posePool = [];

function aliveSolids(state, time, dt) {
  let n = 0;
  for (const e of state.ents) {
    if (e.kind !== 'solid') continue;
    const pose = posePool[n] || (posePool[n] = {});
    solidPose(e, time, dt, pose);
    if (pose.alive) n += 1;
  }
  posePool.length = n;
  return posePool;
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

function nudgeOutOfHazard(state) {
  const p = state.player;
  let guard = 0;
  while (guard < 24 && hitsHazardAt(state, p.x, p.y, p.z, state.time)) {
    p.x -= 0.5;
    guard += 1;
  }
}

export function placeAtCheckpoint(state) {
  const p = state.player;
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
  state.invuln = 0.85;
  nudgeOutOfHazard(state);
}

function respawn(state) {
  state.deaths += 1;
  placeAtCheckpoint(state);
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
  if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);
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
  const move = PHYS.move * (1 + 0.08 * (state.runRank || 0));
  const jumpV = PHYS.jumpV * (1 + 0.1 * (state.jumpRank || 0));
  let wx = Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
  let wz = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
  const mag = Math.hypot(wx, wz);
  if (mag > 1) {
    wx /= mag;
    wz /= mag;
  }
  const accel = (p.onGround ? PHYS.accel : PHYS.airAccel) * dt;
  p.vx = approach(p.vx, wx * move, accel);
  p.vz = approach(p.vz, wz * move, accel);
  if (state.dashLeft > 0) {
    const burst = move * 2.45;
    p.vx = Math.cos(yaw) * burst;
    p.vz = Math.sin(yaw) * burst;
    state.dashLeft -= dt;
  }
  if (state.dashCd > 0) state.dashCd -= dt;

  if (p.onGround) state.coyote = PHYS.coyote;
  else state.coyote = Math.max(0, state.coyote - dt);
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  if (state.jumpBuffer > 0 && state.coyote > 0 && !state.won) {
    p.vy = jumpV;
    p.onGround = false;
    p.groundId = null;
    state.jumpBuffer = 0;
    state.coyote = 0;
  } else if (state.jumpBuffer > 0 && state.doubleJump && (state.airJumps || 0) > 0 && !p.onGround && state.coyote <= 0) {
    p.vy = jumpV * 0.92;
    state.airJumps -= 1;
    state.jumpBuffer = 0;
  }

  p.vy = Math.max(-PHYS.maxFall, p.vy - PHYS.g * dt);
  if (state.hasGlide && input.jump && !p.onGround && p.vy < -3.2) p.vy = -3.2;

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

  if (p.onGround) {
    state.coyote = PHYS.coyote;
    state.airJumps = state.doubleJump ? 1 : 0;
  }

  if (state.invuln <= 0 && !state.won && hitsHazardAt(state, p.x, p.y, p.z, state.time)) {
    if (state.shieldReady) {
      state.shieldReady = false;
      state.invuln = 0.7;
      p.vy = Math.max(p.vy, 7);
      return;
    }
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
      if (state.shieldOwned) state.shieldReady = true;
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
  const dashPressed = !!input.dash && !state.dashHeld;
  state.dashHeld = !!input.dash;
  if (dashPressed && state.hasDash && (state.dashCd || 0) <= 0) {
    const rank = state.dashRank || 1;
    state.dashLeft = 0.16 + 0.07 * Math.max(0, rank - 1);
    state.dashCd = 0.9;
  }
  let left = clamped;
  const sub = 1 / 120;
  const deathsBefore = state.deaths;
  while (left > 1e-8) {
    const h = Math.min(sub, left);
    substep(state, input, h);
    left -= h;
    if (state.won || state.deaths !== deathsBefore) break;
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
