/**
 * Dev-only route follower used to prove the tower is beatable.
 * Loaded by the sim check and by the page only when ?test=1.
 */
import { PHYS, hitsHazardAt, solidPose } from './physics.js';

const MAX_JUMP_GAP = 3.45;

function poses(state) {
  const solids = [];
  for (const e of state.ents) {
    if (e.kind !== 'solid') continue;
    solids.push(solidPose(e, state.time, 1 / 120));
  }
  solids.sort((a, b) => a.seq - b.seq);
  return solids;
}

function spinnerGate(state) {
  const p = state.player;
  for (const e of state.ents) {
    if (e.hazard !== 'spinner') continue;
    const ang = ((state.time / e.spin.period) + (e.spin.phase || 0)) * Math.PI * 2;
    const dx = e.cx - p.x;
    const reach = e.radius + 0.35;
    if (dx < -0.2 || dx > reach + 2.4) continue;
    const flat = Math.abs(Math.sin(ang)) < 0.16;
    // Jump from just outside the bar so one hop carries the body over it.
    if (dx <= e.radius + 0.15) return { mode: flat ? 'hop' : 'back' };
    if (dx <= e.radius + 1.25) return { mode: flat ? 'hop' : 'wait' };
    return null;
  }
  return null;
}

export function plan(state) {
  const p = state.player;
  const solids = poses(state);
  let here = solids.find((s) => s.id === p.groundId && s.alive);
  if (!here) {
    here = solids.find((s) => s.alive
      && Math.abs(s.maxY - p.y) < 0.25
      && p.x > s.minX - 0.08 && p.x < s.maxX + 0.08
      && p.z > s.minZ - 0.08 && p.z < s.maxZ + 0.08);
  }
  // In the air, keep the last platform we reached so we don't U-turn toward the start.
  if (!here) {
    for (const s of solids) {
      if (s.alive && s.cx <= p.x + 1) here = s;
    }
  }

  let target = null;
  if (here) target = solids.find((s) => s.seq === here.seq + 1) || null;
  if (!target) target = solids.find((s) => s.seq > (here ? here.seq : -1)) || null;

  if (!target) return { forward: 1, strafe: 0, jump: false, yaw: 0 };

  const dx = target.cx - p.x;
  const dz = target.cz - p.z;
  let yaw = Math.atan2(dz, dx);
  let forward = 1;
  let strafe = 0;
  let jump = false;

  if (!p.onGround) {
    return { forward: 1, strafe: 0, jump: false, yaw };
  }

  if (target.crumble && !target.alive) {
    return { forward: 0, strafe: 0, jump: false, yaw: 0 };
  }

  const ahead = 0.72;
  const ax = p.x + Math.cos(yaw) * ahead;
  const az = p.z + Math.sin(yaw) * ahead;
  const feetBlocked = hitsHazardAt(state, ax, p.y, az) || hitsHazardAt(state, p.x + Math.cos(yaw) * 0.34, p.y, p.z + Math.sin(yaw) * 0.34);
  const jumpBlocked = hitsHazardAt(state, ax, p.y + 1.25, az) || hitsHazardAt(state, p.x + Math.cos(yaw) * 0.9, p.y + 1.15, az);
  if (feetBlocked && jumpBlocked) {
    forward = 0;
  } else if (feetBlocked && !jumpBlocked) {
    jump = true;
  }

  if (here) {
    const goingPosX = target.cx >= here.cx - 0.01;
    const leave = goingPosX ? here.maxX : here.minX;
    const distToEdge = goingPosX ? (leave - (p.x + PHYS.r)) : ((p.x - PHYS.r) - here.minX);
    const edgeGap = goingPosX ? (target.minX - here.maxX) : (here.minX - target.maxX);
    const dy = target.maxY - p.y;
    const yClose = Math.abs(target.maxY - p.y) < 0.45;
    const zWide = target.minZ < p.z - 0.35 && target.maxZ > p.z + 0.35;
    const xBridge = target.minX < here.maxX - 0.15 && target.maxX > here.maxX + 0.15;

    if (here.move && here.move.axis === 'x') {
      const zOk = Math.abs((target.cz || 0) - p.z) < (target.d * 0.5 - PHYS.r);
      const close = edgeGap < 0.5 && yClose && zOk && target.maxX > p.x;
      forward = close ? 1 : 0;
      jump = false;
    } else if (here.move && here.move.axis === 'z') {
      forward = 1;
      jump = false;
    } else if (target.move && target.move.axis === 'x' && forward > 0) {
      const board = xBridge && yClose && zWide;
      if (!board && distToEdge < 1.15) forward = 0;
      jump = false;
    } else if (target.move && target.move.axis === 'z' && forward > 0) {
      if (xBridge && !zWide && distToEdge < 1.2) forward = 0;
      jump = false;
    } else if (forward > 0 && edgeGap > 0.42 && edgeGap <= MAX_JUMP_GAP && dy < 1.85 && dy > -2.2 && distToEdge < 0.48) {
      jump = true;
    }

    if (!here.move && forward > 0 && Math.abs(here.cz - p.z) > 0.22) {
      yaw = Math.atan2(target.cz - p.z, Math.max(0.4, target.cx - p.x));
      strafe = Math.max(-1, Math.min(1, (here.cz - p.z) / 0.8));
    }
  }

  if (forward === 0 && here && Math.abs(here.cz - p.z) > 0.3) {
    strafe = Math.max(-1, Math.min(1, (here.cz - p.z) / 0.8));
    yaw = 0;
  }

  if (p.onGround && !(here && here.move)) {
    const gate = spinnerGate(state);
    if (gate && gate.mode === 'wait') {
      forward = 0;
      jump = false;
      yaw = 0;
    } else if (gate && gate.mode === 'back') {
      forward = -1;
      jump = false;
      yaw = 0;
    } else if (gate && gate.mode === 'hop') {
      forward = 1;
      jump = true;
      yaw = 0;
    } else if (gate && gate.mode === 'go') {
      forward = 1;
      jump = false;
      yaw = 0;
    }
  }

  return { forward, strafe, jump, yaw };
}

export function run(state, step, opts = {}) {
  const maxSteps = opts.maxSteps ?? 28000;
  const untilFloor = opts.untilFloor ?? Infinity;
  const dt = opts.dt ?? 1 / 60;
  const trace = [];
  let still = 0;
  let lastX = state.player.x;
  for (let i = 0; i < maxSteps; i++) {
    if (state.won) {
      return { ok: true, won: true, steps: i, floor: state.highest, deaths: state.deaths, playTime: state.playTime, x: state.player.x, y: state.player.y };
    }
    if (untilFloor < 100 && state.highest >= untilFloor && state.spawn.floor >= untilFloor) {
      return { ok: true, won: false, steps: i, floor: state.highest, deaths: state.deaths, playTime: state.playTime, x: state.player.x, y: state.player.y, z: state.player.z };
    }
    const input = plan(state);
    const beforeDeaths = state.deaths;
    step(state, input, dt);
    if (state.deaths > beforeDeaths) still = 0;
    if (Math.abs(state.player.x - lastX) < 0.04 && input.forward === 0) still += 1;
    else still = 0;
    lastX = state.player.x;
    if (i % 40 === 0) {
      trace.push({
        i,
        x: +state.player.x.toFixed(2),
        y: +state.player.y.toFixed(2),
        z: +state.player.z.toFixed(2),
        floor: state.spawn.floor,
        ground: state.player.groundId,
        deaths: state.deaths,
        f: input.forward,
        j: input.jump ? 1 : 0,
      });
    }
    if (state.deaths > 25) {
      return { ok: false, reason: 'deaths', steps: i, floor: state.highest, deaths: state.deaths, x: state.player.x, y: state.player.y, ground: state.player.groundId, trace: trace.slice(-14) };
    }
    if (still > 60 * 8) {
      return { ok: false, reason: 'stuck', steps: i, floor: state.highest, deaths: state.deaths, x: state.player.x, y: state.player.y, z: state.player.z, ground: state.player.groundId, trace: trace.slice(-14) };
    }
  }
  return { ok: false, reason: 'timeout', floor: state.highest, deaths: state.deaths, x: state.player.x, y: state.player.y, z: state.player.z, ground: state.player.groundId, trace: trace.slice(-14) };
}
