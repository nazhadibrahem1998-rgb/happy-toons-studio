/**
 * Toon Tennis simulation: court geometry, ball flight, racket contact, rally rules, CPU.
 * No DOM. Safe to import from Node tests.
 */
import { addPoint, createScore, gamesTarget, serveCourt } from './scoring.js';

export const COURT = Object.freeze({
  length: 24,
  width: 8,
  netX: 12,
  netHeight: 1,
  serviceDepth: 6.4,
  ballR: 0.12,
  gravity: 15,
});

export const REACH = Object.freeze({
  x: 1.45,
  z: 1.15,
  yMin: 0.2,
  yMax: 2.4,
  idealY: 1.1,
});

export const RESTITUTION = 0.74;
const HUMAN_SPEED = 6.8;
const SWING = 0.18;
const SWING_CD = 0.34;

export const PROFILES = Object.freeze({
  easy: { speed: 3.7, reaction: 0.4, error: 1.2, aimJitter: 1.35, aggression: 0.18, swingLate: 0.06 },
  normal: { speed: 5.5, reaction: 0.16, error: 0.42, aimJitter: 0.48, aggression: 0.48, swingLate: 0.02 },
  hard: { speed: 7.2, reaction: 0.04, error: 0.16, aimJitter: 0.2, aggression: 0.78, swingLate: 0 },
});

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function playerLimits(side) {
  if (side === 0) return { x0: 0.45, x1: COURT.netX - 0.8, z0: 0.35, z1: COURT.width - 0.35 };
  return { x0: COURT.netX + 0.8, x1: COURT.length - 0.45, z0: 0.35, z1: COURT.width - 0.35 };
}

/** Service box the ball must land in. Lines count as in. */
export function serviceBox(serverSide, court) {
  const mid = COURT.width / 2;
  const depth = COURT.serviceDepth;
  const x0 = serverSide === 0 ? COURT.netX : COURT.netX - depth;
  const x1 = serverSide === 0 ? COURT.netX + depth : COURT.netX;
  // Deuce court is the server's right, and the serve goes cross-court.
  // Side 0 faces +x, so their right is low z. Side 1 faces -x, so their right is high z.
  let z0;
  let z1;
  if (serverSide === 0) {
    if (court === 'deuce') { z0 = mid; z1 = COURT.width; }
    else { z0 = 0; z1 = mid; }
  } else if (court === 'deuce') { z0 = 0; z1 = mid; }
  else { z0 = mid; z1 = COURT.width; }
  return { x0, x1, z0, z1 };
}

export function inCourt(x, z) {
  return x >= -0.04 && x <= COURT.length + 0.04 && z >= -0.04 && z <= COURT.width + 0.04;
}

export function pointInBox(x, z, box, pad = 0.1) {
  return x >= box.x0 - pad && x <= box.x1 + pad && z >= box.z0 - pad && z <= box.z1 + pad;
}

export function serveStance(side, court) {
  const mid = COURT.width / 2;
  const z = side === 0
    ? (court === 'deuce' ? mid * 0.42 : mid + mid * 0.58)
    : (court === 'deuce' ? mid + mid * 0.58 : mid * 0.42);
  const x = side === 0 ? 1.55 : COURT.length - 1.55;
  return { x, z };
}

export function receiveStance(side, serverSide, court) {
  const box = serviceBox(serverSide, court);
  return {
    x: side === 0 ? 2.5 : COURT.length - 2.5,
    z: (box.z0 + box.z1) / 2,
  };
}

/** Analytic-matching flight step (trapezoid on velocity). */
export function fly(ball, dt) {
  const vy0 = ball.vy;
  const vz0 = ball.vz;
  ball.vy = vy0 - COURT.gravity * dt;
  ball.vz = vz0 + ball.spin * dt;
  ball.x += ball.vx * dt;
  ball.y += (vy0 + ball.vy) * 0.5 * dt;
  ball.z += (vz0 + ball.vz) * 0.5 * dt;
}

export function solveArc(from, to, flight) {
  const t = Math.max(0.28, flight);
  const vx = (to.x - from.x) / t;
  const vz = (to.z - from.z) / t;
  const vy = (to.y - from.y) / t + 0.5 * COURT.gravity * t;
  return { vx, vy, vz };
}

export function ballHeightAtX(from, vel, x) {
  if (Math.abs(vel.vx) < 0.001) return null;
  const t = (x - from.x) / vel.vx;
  if (t < 0) return null;
  return from.y + vel.vy * t - 0.5 * COURT.gravity * t * t;
}

/** Fraction 0..1 where the segment crosses the net plane, or null. */
export function netCrossing(prev, next) {
  const x0 = prev.x;
  const x1 = next.x;
  if ((x0 - COURT.netX) * (x1 - COURT.netX) > 0) return null;
  if (x0 === x1) return null;
  const t = (COURT.netX - x0) / (x1 - x0);
  if (t < 0 || t > 1) return null;
  return {
    t,
    y: prev.y + (next.y - prev.y) * t,
    z: prev.z + (next.z - prev.z) * t,
    dir: Math.sign(x1 - x0) || 1,
  };
}

function loftUntilClear(from, target, flight) {
  let t = Math.max(0.36, flight);
  let vel = solveArc(from, { x: target.x, y: 0.02, z: target.z }, t);
  const crosses = (from.x - COURT.netX) * (target.x - COURT.netX) < 0;
  for (let i = 0; i < 5 && crosses; i++) {
    const h = ballHeightAtX(from, vel, COURT.netX);
    if (h == null || h > COURT.netHeight + 0.22) break;
    t += 0.1;
    vel = solveArc(from, { x: target.x, y: 0.02, z: target.z }, t);
  }
  vel.flight = t;
  return vel;
}

export function racketContact(player, ball) {
  const facing = player.side === 0 ? 1 : -1;
  const dx = (ball.x - player.x) * facing;
  const dz = ball.z - player.z;
  const dy = ball.y - REACH.idealY;
  if (dx < 0.12 || dx > REACH.x) return null;
  if (Math.abs(dz) > REACH.z) return null;
  if (ball.y < REACH.yMin || ball.y > REACH.yMax) return null;
  return {
    dx,
    dz,
    dy,
    zNorm: clamp(dz / REACH.z, -1, 1),
    yNorm: clamp(dy / 0.8, -1, 1),
  };
}

/**
 * Shot shape comes from where the ball meets the racket.
 * zNorm > 0 (ball on the +z side of the player) sends the ball toward -z.
 * yNorm > 0 (high contact) is a flatter drive; yNorm < 0 (low contact) is a lob.
 * `intent` lets the CPU pick a target; contact still bends it.
 */
export function resolveStrike(player, ball, intent = null) {
  const contact = racketContact(player, ball);
  if (!contact) return null;
  const { zNorm, yNorm } = contact;
  let targetZ;
  let targetX;
  let flight;
  if (intent && Number.isFinite(intent.targetZ)) {
    targetZ = intent.targetZ - zNorm * 0.55;
    targetX = Number.isFinite(intent.targetX)
      ? intent.targetX
      : (player.side === 0 ? COURT.length - 2.2 : 2.2);
    flight = Number.isFinite(intent.flight) ? intent.flight : 0.68;
  } else {
    targetZ = player.z - zNorm * 3.8;
    const depth = clamp(0.58 + yNorm * 0.3, 0.26, 0.94);
    targetX = player.side === 0
      ? COURT.netX + (COURT.length - COURT.netX) * depth
      : COURT.length - (COURT.netX + (COURT.length - COURT.netX) * depth);
    flight = 0.7 + Math.max(0, -yNorm) * 0.34 - Math.max(0, yNorm) * 0.1;
  }
  // A human mishit off the edge of the racket flies wide. CPU aims are already chosen.
  if (!intent) {
    if (zNorm > 0.9) targetZ = -1.8;
    else if (zNorm < -0.9) targetZ = COURT.width + 1.8;
  }
  targetZ = clamp(targetZ, -2.2, COURT.width + 2.2);
  if (player.side === 0) targetX = clamp(targetX, COURT.netX + 0.7, COURT.length + 1.8);
  else targetX = clamp(targetX, -1.8, COURT.netX - 0.7);
  if (yNorm < -0.45) flight += 0.18;
  const from = { x: ball.x, y: Math.max(ball.y, 0.28), z: ball.z };
  const vel = loftUntilClear(from, { x: targetX, z: targetZ }, flight);
  vel.spin = -zNorm * 1.15;
  // Spin curves the ball, but the average sideways speed still finishes on targetZ.
  vel.vz -= 0.5 * vel.spin * vel.flight;
  vel.targetX = targetX;
  vel.targetZ = targetZ;
  vel.yNorm = yNorm;
  vel.zNorm = zNorm;
  return vel;
}

function makePlayer(side) {
  const spot = serveStance(side, 'deuce');
  return {
    side,
    x: spot.x,
    z: spot.z,
    vx: 0,
    vz: 0,
    speed: HUMAN_SPEED,
    swingT: 0,
    swingCd: 0,
    swinging: false,
    didHit: false,
    swingStarted: false,
    brain: null,
  };
}

function blankBrain(player) {
  return {
    rx: player.x,
    rz: player.z,
    wait: 0,
    aimZ: COURT.width / 2,
    aimX: player.side === 0 ? COURT.length - 2 : 2,
    flight: 0.68,
    planned: false,
    planAge: 1,
    reactTimer: 0,
    swingAt: 0,
  };
}

function heldBall(server) {
  return {
    x: server.x + (server.side === 0 ? 0.95 : -0.95),
    y: 0.95,
    z: server.z,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    lastHitter: server.side,
    bounceCount: 0,
    inPlay: false,
    serve: false,
    mustBounce: false,
    netCord: false,
    netFail: false,
    crossed: false,
    sinceBounce: 4,
    asleep: false,
  };
}

export function createMatchState(options = {}) {
  const mode = options.mode === 'local' || options.mode === 'demo' ? options.mode : 'cpu';
  const difficulty = PROFILES[options.difficulty] ? options.difficulty : 'normal';
  const seed = options.seed ?? 1;
  const state = {
    mode,
    difficulty,
    difficulties: options.difficulties || null,
    seed,
    rng: mulberry32(seed),
    match: createScore(gamesTarget(options.gamesToWin)),
    players: [makePlayer(0), makePlayer(1)],
    ball: null,
    stage: 'serve',
    faults: 0,
    serveCourt: 'deuce',
    keepFaults: false,
    betweenT: 0,
    hitCount: 0,
    time: 0,
    message: { key: 'serve', winner: null, timer: 0 },
    stats: {
      pointsPlayed: 0,
      winners: [0, 0],
      faults: 0,
      lets: 0,
      doubleFaults: 0,
      maxRally: 0,
      lastRally: 0,
    },
  };
  setupServe(state, false);
  return state;
}

function profileFor(state, index) {
  const name = state.difficulties?.[index] || state.difficulty || 'normal';
  return PROFILES[name] || PROFILES.normal;
}

function isCpu(state, index) {
  if (state.mode === 'demo') return true;
  return state.mode === 'cpu' && index === 1;
}

export function setupServe(state, keepFaults) {
  if (!keepFaults) state.faults = 0;
  state.keepFaults = false;
  state.serveCourt = serveCourt(state.match);
  state.stage = 'serve';
  state.hitCount = 0;
  state.betweenT = 0;
  for (const player of state.players) {
    const spot = player.side === state.match.server
      ? serveStance(player.side, state.serveCourt)
      : receiveStance(player.side, state.match.server, state.serveCourt);
    player.x = spot.x;
    player.z = spot.z;
    player.vx = 0;
    player.vz = 0;
    player.swingT = 0;
    player.swingCd = 0;
    player.swinging = false;
    player.didHit = false;
    player.swingStarted = false;
    if (player.brain) {
      player.brain.wait = 0;
      player.brain.planned = false;
      player.brain.reactTimer = 0;
      player.brain.swingAt = 0;
      player.brain.rx = spot.x;
      player.brain.rz = spot.z;
    }
  }
  state.ball = heldBall(state.players[state.match.server]);
  state.message = { key: 'serve', winner: state.match.server, timer: 0 };
}

function stickBall(state) {
  const server = state.players[state.match.server];
  const ball = state.ball;
  ball.x = server.x + (server.side === 0 ? 0.95 : -0.95);
  ball.y = 0.95;
  ball.z = server.z;
  ball.vx = 0;
  ball.vy = 0;
  ball.vz = 0;
  ball.inPlay = false;
  ball.asleep = false;
}

function launchServe(state, player) {
  const box = serviceBox(player.side, state.serveCourt);
  const stance = serveStance(player.side, state.serveCourt);
  const zError = (player.z - stance.z) * 1.25;
  const xShift = (player.x - stance.x) * 0.12;
  let targetZ = (box.z0 + box.z1) / 2 + zError;
  let targetX = (box.x0 + box.x1) / 2 + (player.side === 0 ? 0.25 : -0.25) + xShift;
  if (isCpu(state, player.side)) {
    const profile = profileFor(state, player.side);
    targetZ += (state.rng() - 0.5) * 2 * profile.aimJitter * 0.85;
  }
  const from = {
    x: player.x + (player.side === 0 ? 0.48 : -0.48),
    y: 2.15,
    z: player.z,
  };
  const vel = loftUntilClear(from, { x: targetX, z: targetZ }, 0.9);
  const ball = state.ball;
  ball.x = from.x;
  ball.y = from.y;
  ball.z = from.z;
  ball.vx = vel.vx;
  ball.vy = vel.vy;
  ball.vz = vel.vz;
  ball.spin = 0;
  ball.lastHitter = player.side;
  ball.bounceCount = 0;
  ball.inPlay = true;
  ball.serve = true;
  ball.mustBounce = true;
  ball.netCord = false;
  ball.netFail = false;
  ball.crossed = false;
  ball.sinceBounce = 8;
  ball.asleep = false;
  state.stage = 'play';
  state.hitCount = 1;
  state.message = { key: '', winner: null, timer: 0 };
  noteReaction(state, player.side);
}

function noteReaction(state, hitter) {
  const other = 1 - hitter;
  if (!isCpu(state, other)) return;
  const player = state.players[other];
  if (!player.brain) player.brain = blankBrain(player);
  player.brain.reactTimer = profileFor(state, other).reaction;
  player.brain.planned = false;
  player.brain.swingAt = 0;
  player.brain.planAge = 1;
}

function applyStrike(state, player, vel) {
  const ball = state.ball;
  ball.vx = vel.vx;
  ball.vy = vel.vy;
  ball.vz = vel.vz;
  ball.spin = vel.spin;
  ball.lastHitter = player.side;
  ball.bounceCount = 0;
  ball.serve = false;
  ball.mustBounce = false;
  ball.netCord = false;
  ball.netFail = false;
  ball.crossed = false;
  ball.inPlay = true;
  ball.sinceBounce = 8;
  ball.asleep = false;
  player.didHit = true;
  state.hitCount += 1;
  state.stage = 'play';
  noteReaction(state, player.side);
}

function applyNet(ball, cross, kind) {
  if (kind === 'clear' || kind === 'wide') {
    ball.crossed = true;
    return kind;
  }
  if (kind === 'cord') {
    ball.netCord = true;
    ball.crossed = true;
    ball.vx *= 0.42;
    ball.vy *= 0.62;
    ball.x = COURT.netX + cross.dir * (COURT.ballR + 0.03);
    return 'cord';
  }
  ball.netFail = true;
  ball.vx = -cross.dir * Math.max(1.2, Math.abs(ball.vx) * 0.22);
  ball.vy *= 0.35;
  ball.vz *= 0.5;
  ball.x = COURT.netX - cross.dir * (COURT.ballR + 0.04);
  return 'fail';
}

function flyAndBounce(ball, dt) {
  const prev = { x: ball.x, y: ball.y, z: ball.z };
  fly(ball, dt);
  const cross = netCrossing(prev, ball);
  let net = null;
  if (cross) {
    const wide = cross.z < -0.55 || cross.z > COURT.width + 0.55;
    const kind = wide ? 'wide' : cross.y >= COURT.netHeight ? 'clear' : cross.y >= COURT.netHeight - 0.12 ? 'cord' : 'fail';
    net = applyNet(ball, cross, kind);
    if (net === 'fail') {
      ball.sinceBounce += dt;
      return { net, bounce: false };
    }
  }
  if (ball.y <= COURT.ballR && ball.vy < 0) {
    if (prev.y > COURT.ballR) {
      const denom = prev.y - ball.y;
      const u = denom > 1e-8 ? clamp((prev.y - COURT.ballR) / denom, 0, 1) : 1;
      ball.x = prev.x + (ball.x - prev.x) * u;
      ball.z = prev.z + (ball.z - prev.z) * u;
    }
    ball.y = COURT.ballR;
    ball.vy = Math.abs(ball.vy) * RESTITUTION;
    ball.vx *= 0.94;
    ball.vz *= 0.94;
    ball.spin *= 0.55;
    ball.bounceCount += 1;
    ball.sinceBounce = 0;
    return { net, bounce: true };
  }
  ball.sinceBounce += dt;
  return { net, bounce: false };
}

function finishPoint(state, winner, reason) {
  if (state.stage === 'between' || state.stage === 'match') return 'locked';
  const result = addPoint(state.match, winner);
  state.stats.pointsPlayed += 1;
  state.stats.winners[winner] += 1;
  state.stats.maxRally = Math.max(state.stats.maxRally, state.hitCount);
  state.stats.lastRally = state.hitCount;
  if (state.ball) state.ball.inPlay = false;
  state.keepFaults = false;
  state.faults = 0;
  if (result.type === 'match') {
    state.stage = 'match';
    state.message = { key: 'match', winner, timer: 0 };
    return 'match';
  }
  state.stage = 'between';
  state.betweenT = result.type === 'game' ? 1.3 : 0.95;
  const key = result.type === 'game' ? 'game' : reason;
  state.message = { key, winner, timer: state.betweenT };
  return key;
}

function doFault(state) {
  if (state.stage === 'between' || state.stage === 'match') return 'locked';
  state.stats.faults += 1;
  state.faults += 1;
  if (state.ball) state.ball.inPlay = false;
  if (state.faults >= 2) {
    state.stats.doubleFaults += 1;
    const receiver = state.match.server === 0 ? 1 : 0;
    return finishPoint(state, receiver, 'doublefault');
  }
  state.keepFaults = true;
  state.stage = 'between';
  state.betweenT = 0.8;
  state.message = { key: 'fault', winner: null, timer: 0.8 };
  return 'fault';
}

function doLet(state) {
  if (state.stage !== 'play') return 'locked';
  state.stats.lets += 1;
  if (state.ball) state.ball.inPlay = false;
  state.keepFaults = true;
  state.stage = 'between';
  state.betweenT = 0.7;
  state.message = { key: 'let', winner: null, timer: 0.7 };
  return 'let';
}

function onBounce(state, events) {
  const ball = state.ball;
  events.push('bounce');
  if (state.stage !== 'play') return;
  const hitter = ball.lastHitter;
  const onHitterSide = hitter === 0 ? ball.x < COURT.netX - 0.08 : ball.x > COURT.netX + 0.08;
  const inside = inCourt(ball.x, ball.z);
  if (ball.serve) {
    const box = serviceBox(hitter, state.serveCourt);
    const inBox = pointInBox(ball.x, ball.z, box);
    ball.serve = false;
    ball.mustBounce = false;
    if (ball.netCord && inBox && !onHitterSide) {
      events.push(doLet(state));
      return;
    }
    if (ball.netFail || onHitterSide || !inBox) {
      events.push(doFault(state));
      return;
    }
    events.push('serve-in');
    return;
  }
  // Only the first bounce can be out. A second bounce means the receiver missed,
  // so the player who hit the ball wins wherever that second bounce lands.
  if (ball.bounceCount >= 2) {
    events.push(finishPoint(state, hitter, 'point'));
    return;
  }
  if (!inside) {
    events.push(finishPoint(state, hitter === 0 ? 1 : 0, 'out'));
    return;
  }
  if (onHitterSide || ball.netFail) {
    events.push(finishPoint(state, hitter === 0 ? 1 : 0, 'net'));
  }
}

function onNetFail(state, events) {
  const ball = state.ball;
  events.push('net');
  if (ball.serve) events.push(doFault(state));
  else events.push(finishPoint(state, ball.lastHitter === 0 ? 1 : 0, 'net'));
}

function decorate(ball, dt) {
  if (!ball || ball.asleep) return;
  const result = flyAndBounce(ball, dt);
  if (result.bounce && ball.vy < 0.55) {
    ball.vy = 0;
    ball.vx *= 0.4;
    ball.vz *= 0.4;
    ball.asleep = true;
  }
}

function chaseSpeed(profile, player, x, z) {
  const dist = Math.hypot(player.x - x, player.z - z);
  if (dist < 1.15) return profile.speed * clamp(dist / 0.32, 0.1, 1);
  return profile.speed;
}

function moveToward(player, x, z) {
  const dx = x - player.x;
  const dz = z - player.z;
  return {
    mx: Math.abs(dx) < 0.06 ? 0 : clamp(dx / 0.7, -1, 1),
    mz: Math.abs(dz) < 0.06 ? 0 : clamp(dz / 0.7, -1, 1),
    swing: false,
  };
}

function predictContact(ball, player) {
  const ghost = { ...ball };
  const facing = player.side === 0 ? 1 : -1;
  const limits = playerLimits(player.side);
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < 160; i++) {
    const result = flyAndBounce(ghost, 1 / 60);
    if (result.net === 'fail' || ghost.netFail) break;
    const onSide = player.side === 0 ? ghost.x <= COURT.netX + 0.15 : ghost.x >= COURT.netX - 0.15;
    const bouncedOk = !ghost.mustBounce || ghost.bounceCount >= 1;
    const standX = clamp(ghost.x - facing * 0.72, limits.x0, limits.x1);
    const dx = (ghost.x - standX) * facing;
    const heightOk = ghost.y >= 0.4 && ghost.y <= 1.85;
    if (onSide && bouncedOk && heightOk && dx >= 0.2 && dx <= REACH.x - 0.05) {
      const score = Math.abs(ghost.y - REACH.idealY) + i * 0.0015;
      if (score < bestScore) {
        bestScore = score;
        best = { x: standX, z: clamp(ghost.z, limits.z0, limits.z1), y: ghost.y, t: (i + 1) / 60 };
      }
      if (best && ghost.y > REACH.idealY + 0.15) break;
    }
    if (ghost.bounceCount >= 3) break;
  }
  return best;
}

function chooseAim(state, player, profile) {
  const opp = state.players[1 - player.side];
  const openZ = opp.z > COURT.width / 2 ? 1.15 : COURT.width - 1.15;
  const mid = COURT.width / 2 + (state.rng() - 0.5) * 1.2;
  let z = state.rng() < profile.aggression ? openZ : mid;
  z += (state.rng() - 0.5) * 2 * profile.aimJitter;
  const deep = player.side === 0 ? COURT.length - 1.7 : 1.7;
  const drop = player.side === 0 ? COURT.netX + 3.1 : COURT.netX - 3.1;
  const targetX = state.rng() < profile.aggression * 0.45 ? drop : deep;
  const flight = Math.abs(targetX - COURT.netX) < 4 ? 0.86 : 0.64;
  return { z: clamp(z, 0.45, COURT.width - 0.45), x: targetX, flight };
}

function cpuControl(state, player, dt) {
  const profile = profileFor(state, player.side);
  if (!player.brain) player.brain = blankBrain(player);
  const brain = player.brain;
  player.speed = profile.speed;
  const ball = state.ball;

  if (state.stage === 'serve') {
    if (player.side === state.match.server) {
      const stance = serveStance(player.side, state.serveCourt);
      player.speed = chaseSpeed(profile, player, stance.x, stance.z);
      const input = moveToward(player, stance.x, stance.z);
      brain.wait += dt;
      const ready = Math.hypot(player.x - stance.x, player.z - stance.z) < 0.3;
      if (ready && brain.wait > 0.42 + profile.reaction) {
        input.swing = true;
        brain.wait = 0;
      }
      return input;
    }
    const spot = receiveStance(player.side, state.match.server, state.serveCourt);
    player.speed = chaseSpeed(profile, player, spot.x, spot.z);
    return moveToward(player, spot.x, spot.z);
  }

  if (state.stage !== 'play' || !ball?.inPlay) {
    const homeX = player.side === 0 ? 2.1 : COURT.length - 2.1;
    player.speed = chaseSpeed(profile, player, homeX, COURT.width / 2);
    return moveToward(player, homeX, COURT.width / 2);
  }

  const incoming = ball.lastHitter !== player.side;
  if (!incoming) {
    const homeX = player.side === 0 ? 2.1 : COURT.length - 2.1;
    const shade = clamp(ball.z, 1.2, COURT.width - 1.2);
    player.speed = chaseSpeed(profile, player, homeX, shade);
    return moveToward(player, homeX, shade);
  }

  if (brain.reactTimer > 0) {
    brain.reactTimer -= dt;
    player.speed = chaseSpeed(profile, player, brain.rx, brain.rz);
    return moveToward(player, brain.rx, brain.rz);
  }

  const refresh = 0.04 + profile.reaction * 0.45;
  if (!brain.planned || brain.planAge >= refresh) {
    const pred = predictContact(ball, player);
    if (pred) {
      const limits = playerLimits(player.side);
      const jitter = (state.rng() - 0.5) * 2 * profile.error;
      brain.rx = pred.x;
      brain.rz = clamp(pred.z + jitter, limits.z0, limits.z1);
      const aim = chooseAim(state, player, profile);
      brain.aimZ = aim.z;
      brain.aimX = aim.x;
      brain.flight = aim.flight;
      brain.planned = true;
      brain.planAge = 0;
    }
  }
  brain.planAge += dt;
  player.speed = chaseSpeed(profile, player, brain.rx, brain.rz);
  const input = moveToward(player, brain.rx, brain.rz);
  const live = racketContact(player, ball);
  const bounceOk = !ball.mustBounce || ball.bounceCount >= 1;
  // Wait until the strings are near the ball. Swinging at the edge sends the ball out.
  const maxOff = profile.error > 0.9 ? 1.05 : profile.error > 0.35 ? 0.62 : 0.4;
  const centered = !!(live && Math.abs(live.dz) <= maxOff && ball.y > 0.5 && ball.y < 1.7);
  if (centered && bounceOk) {
    if (!brain.swingAt) brain.swingAt = state.time + profile.swingLate;
    if (state.time >= brain.swingAt) input.swing = true;
  } else {
    brain.swingAt = 0;
  }
  return input;
}

function applyMove(player, input, dt) {
  let mx = clamp(input?.mx || 0, -1, 1);
  let mz = clamp(input?.mz || 0, -1, 1);
  if (Number.isFinite(input?.gotoX) && Number.isFinite(input?.gotoZ)) {
    const dx = input.gotoX - player.x;
    const dz = input.gotoZ - player.z;
    mx = Math.abs(dx) < 0.05 ? 0 : clamp(dx / 0.42, -1, 1);
    mz = Math.abs(dz) < 0.05 ? 0 : clamp(dz / 0.42, -1, 1);
  }
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }
  const wantVx = mx * player.speed;
  const wantVz = mz * player.speed;
  const k = 1 - Math.exp(-dt * 14);
  player.vx += (wantVx - player.vx) * k;
  player.vz += (wantVz - player.vz) * k;
  const limits = playerLimits(player.side);
  player.x = clamp(player.x + player.vx * dt, limits.x0, limits.x1);
  player.z = clamp(player.z + player.vz * dt, limits.z0, limits.z1);
  player.swingT = Math.max(0, player.swingT - dt);
  player.swingCd = Math.max(0, player.swingCd - dt);
  player.swingStarted = false;
  if (input?.swing && player.swingCd <= 0 && player.swingT <= 0) {
    player.swingT = SWING;
    player.swingCd = SWING_CD;
    player.swinging = true;
    player.didHit = false;
    player.swingStarted = true;
  }
  if (player.swingT <= 0) player.swinging = false;
}

function tryHit(state, player, events) {
  const ball = state.ball;
  if (!ball?.inPlay || state.stage !== 'play') return;
  if (!player.swinging || player.didHit) return;
  if (ball.lastHitter === player.side) return;
  if (ball.mustBounce && ball.bounceCount < 1) return;
  const onSide = player.side === 0 ? ball.x <= COURT.netX + 0.08 : ball.x >= COURT.netX - 0.08;
  if (!onSide) return;
  const intent = isCpu(state, player.side) && player.brain
    ? { targetZ: player.brain.aimZ, targetX: player.brain.aimX, flight: player.brain.flight }
    : null;
  const vel = resolveStrike(player, ball, intent);
  if (!vel) return;
  applyStrike(state, player, vel);
  events.push('hit');
}

const ZERO = { mx: 0, mz: 0, swing: false };

export function step(state, inputs, dt) {
  const events = [];
  if (!state || state.stage === 'match') return events;
  const h = Math.max(0, Math.min(dt || 0, 0.05));
  if (h === 0) return events;
  state.time += h;

  if (state.stage === 'between') {
    state.betweenT -= h;
    decorate(state.ball, h);
    for (let i = 0; i < 2; i++) {
      const player = state.players[i];
      const input = isCpu(state, i) ? { mx: 0, mz: 0, swing: false } : (inputs?.[i] || ZERO);
      if (!isCpu(state, i)) player.speed = HUMAN_SPEED;
      applyMove(player, input, h);
    }
    if (state.message.timer > 0) state.message.timer -= h;
    if (state.betweenT <= 0) setupServe(state, state.keepFaults);
    return events;
  }

  const resolved = [ZERO, ZERO];
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    if (isCpu(state, i)) resolved[i] = cpuControl(state, player, h);
    else {
      player.speed = HUMAN_SPEED;
      resolved[i] = inputs?.[i] || ZERO;
    }
    applyMove(player, resolved[i], h);
  }

  if (state.stage === 'serve') {
    const server = state.players[state.match.server];
    if (server.swingStarted) {
      launchServe(state, server);
      events.push('hit');
    } else {
      stickBall(state);
    }
  }

  if (state.stage === 'play' && state.ball?.inPlay) {
    const speed = Math.hypot(state.ball.vx || 0, state.ball.vy || 0, state.ball.vz || 0);
    const pieces = Math.min(8, Math.max(1, Math.ceil((speed * h) / 0.45)));
    const sub = h / pieces;
    for (let piece = 0; piece < pieces && state.stage === 'play' && state.ball?.inPlay; piece++) {
      tryHit(state, state.players[0], events);
      if (state.stage === 'play' && state.ball?.inPlay) tryHit(state, state.players[1], events);
      if (!(state.stage === 'play' && state.ball?.inPlay)) break;
      const result = flyAndBounce(state.ball, sub);
      if (result.net === 'fail') onNetFail(state, events);
      else if (result.bounce && state.stage === 'play') onBounce(state, events);
      if (state.ball && state.ball.y < -2 && state.stage === 'play') {
        const hitter = state.ball.lastHitter;
        events.push(finishPoint(state, hitter === 0 ? 1 : 0, 'out'));
      }
    }
  }

  if (state.hitCount > 48 && state.stage === 'play' && state.ball?.inPlay) {
    const hitter = state.ball.lastHitter;
    events.push(finishPoint(state, hitter === 0 ? 1 : 0, 'out'));
  }

  if (state.message.timer > 0 && state.stage === 'play') state.message.timer -= h;
  return events;
}

/** Run a CPU/demo match until it ends. Used by tests and not by the browser loop. */
export function runUntilOver(state, maxSteps = 40000) {
  const idle = [ZERO, ZERO];
  let steps = 0;
  while (!state.match.over && steps < maxSteps) {
    step(state, idle, 1 / 60);
    steps += 1;
  }
  state.steps = steps;
  return state;
}
