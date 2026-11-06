/**
 * Top-down paddle and ball. No characters.
 * x runs across a paddle. y runs from paddle 0 (near) to paddle 1 (far).
 */
import { addPoint, createScore, pointTarget } from './scoring.js';

export const COURT = Object.freeze({
  width: 10,
  length: 16,
  paddleW: 1.85,
  paddleH: 0.42,
  ballR: 0.22,
  inset: 0.72,
  maxSpeed: 20,
  serveSpeed: 8.4,
  gain: 1.085,
  maxAngle: 0.78,
});

const HUMAN_SPEED = 7.6;

export const PROFILES = Object.freeze({
  easy: { speed: 3.5, reaction: 0.24, error: 1.05, aim: 0.2 },
  normal: { speed: 5.1, reaction: 0.1, error: 0.38, aim: 0.72 },
  hard: { speed: 8.6, reaction: 0.03, error: 0.12, aim: 0.92 },
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

export function paddleLimit(x, width = COURT.paddleW) {
  const half = width / 2;
  return clamp(x, half, COURT.width - half);
}

function makePaddle(side) {
  return {
    side,
    x: COURT.width / 2,
    y: side === 0 ? COURT.inset : COURT.length - COURT.inset,
    w: COURT.paddleW,
    h: COURT.paddleH,
    vx: 0,
    speed: HUMAN_SPEED,
    brain: null,
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
    score: createScore(pointTarget(options.target ?? options.gamesToWin)),
    paddles: [makePaddle(0), makePaddle(1)],
    ball: null,
    server: 0,
    stage: 'between',
    betweenT: 0.35,
    time: 0,
    message: { key: 'serve', winner: 0, timer: 0.8 },
    stats: { pointsPlayed: 0, winners: [0, 0], maxRally: 0, hits: 0 },
  };
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

export function launch(state) {
  const server = state.server;
  const paddle = state.paddles[server];
  const dir = server === 0 ? 1 : -1;
  const angle = (state.rng() - 0.5) * 0.55;
  const speed = COURT.serveSpeed;
  state.ball = {
    x: paddle.x,
    y: paddle.y + dir * (COURT.paddleH / 2 + COURT.ballR + 0.18),
    vx: Math.sin(angle) * speed,
    vy: Math.cos(angle) * speed * dir,
    rally: 0,
    inPlay: true,
  };
  state.stage = 'play';
  state.message = { key: 'serve', winner: server, timer: 0.7 };
}

/**
 * Bounce off a paddle. `offset` is -1 at the left edge and +1 at the right.
 * `dir` is +1 when the ball should travel toward increasing y.
 * Speed rises a little on every rally hit.
 */
export function applyHit(ball, offset, dir) {
  const prev = Math.max(COURT.serveSpeed * 0.85, Math.hypot(ball.vx, ball.vy));
  const next = Math.min(COURT.maxSpeed, prev * COURT.gain + 0.05);
  const angle = clamp(offset, -1, 1) * COURT.maxAngle;
  const vx = Math.sin(angle) * next;
  const vy = Math.cos(angle) * next * dir;
  const mag = Math.hypot(vx, vy) || 1;
  ball.vx = (vx / mag) * next;
  ball.vy = (vy / mag) * next;
  ball.rally = (ball.rally || 0) + 1;
  return next;
}

function frontY(paddle) {
  const sign = paddle.side === 0 ? 1 : -1;
  return paddle.y + sign * (paddle.h / 2);
}

function tryPaddle(ball, prev, paddle) {
  const plane = frontY(paddle);
  const crossed = paddle.side === 0
    ? prev.y >= plane && ball.y <= plane
    : prev.y <= plane && ball.y >= plane;
  if (!crossed) return false;
  const denom = ball.y - prev.y;
  const t = denom === 0 ? 1 : clamp((plane - prev.y) / denom, 0, 1);
  const x = prev.x + (ball.x - prev.x) * t;
  const reach = paddle.w / 2 + COURT.ballR * 0.15;
  if (Math.abs(x - paddle.x) > reach) return false;
  const offset = clamp((x - paddle.x) / (paddle.w / 2), -1, 1);
  const dir = paddle.side === 0 ? 1 : -1;
  applyHit(ball, offset, dir);
  ball.x = x;
  ball.y = plane + dir * (COURT.ballR + 0.02);
  return true;
}

function moveBall(ball, dt) {
  const prev = { x: ball.x, y: ball.y, vx: ball.vx };
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  const r = COURT.ballR;
  let wall = false;
  if (ball.x < r) {
    ball.x = r + (r - ball.x);
    ball.vx = Math.abs(ball.vx);
    wall = prev.vx < 0;
  } else if (ball.x > COURT.width - r) {
    const edge = COURT.width - r;
    ball.x = edge - (ball.x - edge);
    ball.vx = -Math.abs(ball.vx);
    wall = prev.vx > 0;
  }
  return { prev, wall };
}

function scorePoint(state, winner) {
  if (state.stage !== 'play') return 'locked';
  const result = addPoint(state.score, winner);
  state.stats.pointsPlayed += 1;
  state.stats.winners[winner] += 1;
  state.stats.maxRally = Math.max(state.stats.maxRally, state.ball?.rally || 0);
  state.stats.hits += state.ball?.rally || 0;
  if (state.ball) state.ball.inPlay = false;
  if (result.type === 'match') {
    state.stage = 'match';
    state.message = { key: 'match', winner, timer: 0 };
    return 'match';
  }
  state.server = winner;
  state.stage = 'between';
  state.betweenT = 0.7;
  state.message = { key: 'point', winner, timer: 0.7 };
  return 'point';
}

export function predictX(ball, targetY) {
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  let vy = ball.vy;
  const r = COURT.ballR;
  if (Math.abs(vy) < 0.05) return x;
  if (Math.sign(vy) !== Math.sign(targetY - y)) return null;
  for (let i = 0; i < 8; i++) {
    const dy = targetY - y;
    const tGoal = dy / vy;
    const tWall = vx > 0.01 ? (COURT.width - r - x) / vx : vx < -0.01 ? (r - x) / vx : 1e9;
    if (tGoal <= tWall + 1e-6) return x + vx * tGoal;
    x += vx * tWall;
    y += vy * tWall;
    if (x <= r + 0.001) x = r;
    if (x >= COURT.width - r - 0.001) x = COURT.width - r;
    vx = -vx;
  }
  return x;
}

function blankBrain(paddle) {
  return { target: paddle.x, react: 0, age: 1 };
}

function cpuControl(state, paddle) {
  const profile = profileFor(state, paddle.side);
  if (!paddle.brain) paddle.brain = blankBrain(paddle);
  const brain = paddle.brain;
  paddle.speed = profile.speed;
  const ball = state.ball;
  const home = COURT.width / 2;
  if (state.stage !== 'play' || !ball?.inPlay) {
    brain.target = home;
  } else {
    const coming = paddle.side === 0 ? ball.vy < 0 : ball.vy > 0;
    if (!coming) {
      brain.react = profile.reaction;
      brain.target += (home + (ball.x - home) * 0.25 - brain.target) * 0.35;
    } else if (brain.react > 0) {
      brain.react -= 1 / 60;
    } else if (brain.age > 0.03 + profile.reaction * 0.2) {
      const predicted = predictX(ball, frontY(paddle));
      if (predicted != null) {
        const opp = state.paddles[1 - paddle.side];
        const open = opp.x > COURT.width / 2 ? -1 : 1;
        const aim = open * profile.aim * (paddle.w * 0.42);
        const jitter = (state.rng() - 0.5) * 2 * profile.error;
        brain.target = paddleLimit(predicted - aim + jitter, paddle.w);
      }
      brain.age = 0;
    }
  }
  brain.age += 1 / 60;
  const dx = brain.target - paddle.x;
  return { mx: Math.abs(dx) < 0.05 ? 0 : clamp(dx / 0.55, -1, 1), gotoX: undefined };
}

function applyMove(paddle, input, dt) {
  let mx = clamp(input?.mx || 0, -1, 1);
  if (Number.isFinite(input?.gotoX)) {
    const dx = input.gotoX - paddle.x;
    mx = Math.abs(dx) < 0.04 ? 0 : clamp(dx / 0.38, -1, 1);
  }
  const want = mx * paddle.speed;
  const k = 1 - Math.exp(-dt * 16);
  paddle.vx += (want - paddle.vx) * k;
  paddle.x = paddleLimit(paddle.x + paddle.vx * dt, paddle.w);
}

const ZERO = { mx: 0, gotoX: undefined };

export function step(state, inputs, dt) {
  const events = [];
  if (!state || state.stage === 'match') return events;
  const h = Math.max(0, Math.min(dt || 0, 0.05));
  if (!h) return events;
  state.time += h;
  if (state.message.timer > 0) state.message.timer -= h;

  if (state.stage === 'between') {
    state.betweenT -= h;
    for (let i = 0; i < 2; i++) {
      const paddle = state.paddles[i];
      const input = isCpu(state, i) ? cpuControl(state, paddle) : (inputs?.[i] || ZERO);
      if (!isCpu(state, i)) paddle.speed = HUMAN_SPEED;
      applyMove(paddle, input, h);
    }
    if (state.betweenT <= 0) {
      launch(state);
      events.push('serve');
    }
    return events;
  }

  for (let i = 0; i < 2; i++) {
    const paddle = state.paddles[i];
    const input = isCpu(state, i) ? cpuControl(state, paddle) : (inputs?.[i] || ZERO);
    if (!isCpu(state, i)) paddle.speed = HUMAN_SPEED;
    applyMove(paddle, input, h);
  }

  const ball = state.ball;
  if (!ball?.inPlay || state.stage !== 'play') return events;
  const moved = moveBall(ball, h);
  const prev = moved.prev;
  let hit = false;
  if (tryPaddle(ball, prev, state.paddles[0])) {
    events.push('hit');
    hit = true;
  } else if (tryPaddle(ball, prev, state.paddles[1])) {
    events.push('hit');
    hit = true;
  }
  if (!hit && moved.wall) events.push('wall');
  if (ball.y < -0.04 && ball.vy <= 0) events.push(scorePoint(state, 1));
  else if (ball.y > COURT.length + 0.04 && ball.vy >= 0) events.push(scorePoint(state, 0));
  return events;
}

export function runUntilOver(state, maxSteps = 50000) {
  const idle = [ZERO, ZERO];
  let steps = 0;
  while (!state.score.over && steps < maxSteps) {
    step(state, idle, 1 / 60);
    steps += 1;
  }
  state.steps = steps;
  return state;
}
