import assert from 'node:assert/strict';
import test from 'node:test';
import { addPoint, createScore } from '../js/scoring.js';
import {
  COURT,
  applyHit,
  createMatchState,
  paddleLimit,
  runUntilOver,
  step,
} from '../js/sim.js';

const DT = 1 / 60;
const IDLE = [{ mx: 0 }, { mx: 0 }];

test('first to 7 ends the match and first to 6 does not', () => {
  const score = createScore(7);
  assert.equal(score.goal, 7);
  for (let i = 0; i < 6; i++) assert.equal(addPoint(score, 0).type, 'point');
  assert.equal(score.over, false);
  assert.equal(addPoint(score, 0).type, 'match');
  assert.equal(score.winner, 0);
  assert.deepEqual(score.points, [7, 0]);
  assert.equal(addPoint(score, 1).type, 'over');
  assert.deepEqual(score.points, [7, 0]);
});

test('first to 11 does not end at 7', () => {
  const score = createScore(11);
  assert.equal(score.goal, 11);
  for (let i = 0; i < 7; i++) addPoint(score, 1);
  assert.equal(score.over, false);
  assert.equal(score.points[1], 7);
  for (let i = 0; i < 3; i++) addPoint(score, 1);
  assert.equal(score.over, false);
  assert.equal(addPoint(score, 1).type, 'match');
  assert.deepEqual(score.points, [0, 11]);
});

test('a center hit stays straight and an edge hit angles away', () => {
  const center = { vx: 0.2, vy: -7, rally: 0 };
  const left = { vx: 0, vy: -7, rally: 0 };
  const right = { vx: 0, vy: -7, rally: 0 };
  const cSpeed = applyHit(center, 0, 1);
  const lSpeed = applyHit(left, -1, 1);
  const rSpeed = applyHit(right, 1, 1);
  assert.ok(center.vy > 0, 'ball leaves toward the far end');
  assert.ok(Math.abs(center.vx) < Math.abs(left.vx));
  assert.ok(left.vx < 0, 'left edge sends the ball left');
  assert.ok(right.vx > 0, 'right edge sends the ball right');
  assert.ok(cSpeed > 7);
  assert.ok(left.rally === 1 && right.rally === 1);
});

test('each rally hit speeds the ball up until the cap', () => {
  const ball = { vx: 0, vy: -COURT.serveSpeed, rally: 0 };
  let prev = COURT.serveSpeed;
  for (let i = 0; i < 12; i++) {
    const speed = applyHit(ball, 0.2, i % 2 === 0 ? 1 : -1);
    assert.ok(speed >= prev - 0.001);
    prev = speed;
  }
  assert.ok(prev > COURT.serveSpeed + 2);
  assert.ok(prev <= COURT.maxSpeed + 0.001);
});

test('missing the near paddle gives the point to the far side', () => {
  const state = createMatchState({ mode: 'local', target: 7, seed: 2 });
  state.stage = 'play';
  state.betweenT = 0;
  state.paddles[0].x = 1.2;
  state.ball = { x: 8.2, y: 1.4, vx: 0, vy: -9, rally: 2, inPlay: true };
  let guard = 0;
  while (state.stats.pointsPlayed === 0 && guard < 90) {
    step(state, IDLE, DT);
    guard += 1;
  }
  assert.equal(state.score.points[1], 1);
  assert.equal(state.score.points[0], 0);
  assert.equal(state.message.key, 'point');
});

test('missing the far paddle gives the point to the near side', () => {
  const state = createMatchState({ mode: 'local', target: 7, seed: 3 });
  state.stage = 'play';
  state.paddles[1].x = 8.6;
  state.ball = { x: 2, y: COURT.length - 1.4, vx: 0, vy: 9, rally: 1, inPlay: true };
  let guard = 0;
  while (state.stats.pointsPlayed === 0 && guard < 90) {
    step(state, IDLE, DT);
    guard += 1;
  }
  assert.equal(state.score.points[0], 1);
  assert.equal(state.message.key, 'point');
});

test('a paddle return flips the ball back and raises rally speed', () => {
  const state = createMatchState({ mode: 'local', target: 7, seed: 4 });
  state.stage = 'play';
  state.paddles[0].x = 5;
  state.ball = { x: 5, y: 2.2, vx: 0, vy: -8, rally: 0, inPlay: true };
  const before = Math.hypot(state.ball.vx, state.ball.vy);
  let guard = 0;
  while (state.ball.vy < 0 && state.stage === 'play' && guard < 80) {
    step(state, IDLE, DT);
    guard += 1;
  }
  assert.ok(state.ball.vy > 0);
  assert.equal(state.ball.rally, 1);
  assert.ok(Math.hypot(state.ball.vx, state.ball.vy) > before);
  assert.equal(state.score.points[0] + state.score.points[1], 0);
});

test('side walls keep the ball on the court', () => {
  const state = createMatchState({ mode: 'local', target: 7, seed: 5 });
  state.stage = 'play';
  state.ball = { x: 0.3, y: 8, vx: -6, vy: 0.2, rally: 0, inPlay: true };
  step(state, IDLE, DT);
  assert.ok(state.ball.x >= COURT.ballR - 0.001);
  assert.ok(state.ball.vx > 0);
  assert.ok(state.ball.x < COURT.width);
});

test('normal CPU players finish a race to 7', () => {
  const state = createMatchState({ mode: 'demo', difficulty: 'normal', target: 7, seed: 8 });
  runUntilOver(state, 40000);
  assert.equal(state.score.over, true, `steps ${state.steps}`);
  assert.ok(state.score.points[state.score.winner] >= 7);
  assert.ok(state.stats.hits > 0);
  console.log('paddle normal', JSON.stringify({
    points: state.score.points,
    winner: state.score.winner,
    maxRally: state.stats.maxRally,
    steps: state.steps,
  }));
});

test('a touch snap puts the paddle on the pointer in one step', () => {
  const state = createMatchState({ mode: 'local', target: 7, seed: 1 });
  state.stage = 'play';
  const target = 2.25;
  step(state, [{ snap: true, gotoX: target }, { mx: 0 }], DT);
  assert.ok(Math.abs(state.paddles[0].x - target) < 0.001, state.paddles[0].x);
  const start = state.paddles[1].x;
  step(state, [{ mx: 0 }, { mx: 1 }], DT);
  const moved = Math.abs(state.paddles[1].x - start);
  assert.ok(moved > 0.05 && moved < 0.2, moved);
});

test('paddles can slide during the serve countdown', () => {
  const state = createMatchState({ mode: 'local', target: 7, seed: 1 });
  assert.equal(state.stage, 'between');
  const start = state.paddles[0].x;
  for (let i = 0; i < 25; i++) step(state, [{ mx: 1 }, { mx: 0 }], DT);
  assert.ok(state.paddles[0].x > start + 0.5, state.paddles[0].x);
  assert.ok(state.paddles[0].x <= COURT.width - COURT.paddleW / 2 + 0.001);
});

test('paddles stay on the court and a fast ball stays inside the sides', () => {
  const state = createMatchState({ mode: 'local', target: 11, seed: 6 });
  state.stage = 'play';
  state.ball = { x: 5, y: 8, vx: 19, vy: 4, rally: 0, inPlay: true };
  const half = COURT.paddleW / 2;
  for (let i = 0; i < 240 && state.stage === 'play'; i++) {
    step(state, [{ gotoX: i % 2 ? -40 : 40 }, { gotoX: 500 }], DT);
    for (const paddle of state.paddles) {
      assert.ok(paddle.x >= half - 0.001 && paddle.x <= COURT.width - half + 0.001, paddle.x);
    }
    if (state.ball?.inPlay) {
      assert.ok(state.ball.x >= COURT.ballR - 0.05 && state.ball.x <= COURT.width - COURT.ballR + 0.05);
      assert.ok(Math.hypot(state.ball.vx, state.ball.vy) <= COURT.maxSpeed + 0.2);
    }
  }
  assert.equal(paddleLimit(-5), half);
  assert.equal(paddleLimit(99), COURT.width - half);
});

test('hard CPU beats easy CPU', () => {
  const state = createMatchState({
    mode: 'demo',
    difficulties: ['easy', 'hard'],
    target: 7,
    seed: 12,
  });
  runUntilOver(state, 40000);
  assert.equal(state.score.over, true);
  assert.equal(state.score.winner, 1, `points ${state.score.points.join('-')}`);
  console.log('paddle hard vs easy', state.score.points.join('-'), 'rally', state.stats.maxRally);
});
