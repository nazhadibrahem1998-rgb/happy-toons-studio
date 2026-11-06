import assert from 'node:assert/strict';
import test from 'node:test';
import { addPoint, createScore, scoreNames, serveCourt } from '../js/scoring.js';
import {
  COURT,
  ballHeightAtX,
  createMatchState,
  fly,
  inCourt,
  netCrossing,
  playerLimits,
  pointInBox,
  racketContact,
  resolveStrike,
  runUntilOver,
  serviceBox,
  solveArc,
  step,
} from '../js/sim.js';

const DT = 1 / 60;
const IDLE = [{ mx: 0, mz: 0, swing: false }, { mx: 0, mz: 0, swing: false }];

function pump(state, frames, inputs) {
  const events = [];
  for (let i = 0; i < frames; i++) events.push(...step(state, inputs || IDLE, DT));
  return events;
}

function liveBall(partial) {
  return {
    x: 12,
    y: 1,
    z: 4,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    lastHitter: 0,
    bounceCount: 0,
    inPlay: true,
    serve: false,
    mustBounce: false,
    netCord: false,
    netFail: false,
    crossed: false,
    sinceBounce: 1,
    asleep: false,
    ...partial,
  };
}

test('point names follow 0, 15, 30, 40', () => {
  const score = createScore(3);
  assert.deepEqual(scoreNames(score), ['0', '0']);
  addPoint(score, 0);
  assert.deepEqual(scoreNames(score), ['15', '0']);
  addPoint(score, 0);
  assert.deepEqual(scoreNames(score), ['30', '0']);
  addPoint(score, 1);
  assert.deepEqual(scoreNames(score), ['30', '15']);
  addPoint(score, 0);
  assert.deepEqual(scoreNames(score), ['40', '15']);
});

test('deuce, advantage, and advantage lost', () => {
  const score = createScore(3);
  for (let i = 0; i < 3; i++) addPoint(score, 0);
  for (let i = 0; i < 3; i++) addPoint(score, 1);
  assert.deepEqual(scoreNames(score), ['deuce', 'deuce']);
  assert.equal(addPoint(score, 0).type, 'adv');
  assert.deepEqual(scoreNames(score), ['adv', '40']);
  assert.equal(addPoint(score, 1).type, 'deuce');
  assert.deepEqual(scoreNames(score), ['deuce', 'deuce']);
  addPoint(score, 1);
  assert.equal(addPoint(score, 1).type, 'game');
  assert.deepEqual(score.points, [0, 0]);
  assert.deepEqual(score.games, [0, 1]);
});

test('a game needs a two-point lead after 40, and the server alternates', () => {
  const score = createScore(3);
  assert.equal(score.server, 0);
  assert.equal(serveCourt(score), 'deuce');
  addPoint(score, 0);
  assert.equal(serveCourt(score), 'ad');
  addPoint(score, 0);
  addPoint(score, 0);
  const game = addPoint(score, 0);
  assert.equal(game.type, 'game');
  assert.equal(score.server, 1);
  assert.equal(serveCourt(score), 'deuce');
  assert.equal(score.games[0], 1);
});

test('40-30 is not a game; 40-15 is', () => {
  const tight = createScore(3);
  addPoint(tight, 0);
  addPoint(tight, 0);
  addPoint(tight, 0);
  addPoint(tight, 1);
  addPoint(tight, 1);
  addPoint(tight, 1);
  assert.equal(addPoint(tight, 0).type, 'adv');
  assert.equal(tight.games[0], 0);

  const easy = createScore(3);
  addPoint(easy, 0);
  addPoint(easy, 0);
  addPoint(easy, 0);
  addPoint(easy, 1);
  assert.equal(addPoint(easy, 0).type, 'game');
});

test('first to N games ends the match, including 3-2', () => {
  const score = createScore(3);
  for (let g = 0; g < 2; g++) {
    for (let p = 0; p < 4; p++) addPoint(score, 0);
    for (let p = 0; p < 4; p++) addPoint(score, 1);
  }
  assert.deepEqual(score.games, [2, 2]);
  assert.equal(score.over, false);
  for (let p = 0; p < 3; p++) addPoint(score, 0);
  const last = addPoint(score, 0);
  assert.equal(last.type, 'match');
  assert.equal(score.over, true);
  assert.equal(score.winner, 0);
  assert.deepEqual(score.games, [3, 2]);
  assert.equal(addPoint(score, 1).type, 'over');
  assert.deepEqual(score.games, [3, 2]);
});

test('first to 5 is configurable and does not end at 3', () => {
  const score = createScore(5);
  assert.equal(score.gamesToWin, 5);
  for (let g = 0; g < 3; g++) {
    for (let p = 0; p < 4; p++) addPoint(score, 1);
  }
  assert.equal(score.over, false);
  assert.equal(score.games[1], 3);
  for (let p = 0; p < 4; p++) addPoint(score, 1);
  assert.equal(score.over, false);
  for (let p = 0; p < 4; p++) addPoint(score, 1);
  assert.equal(score.over, true);
  assert.equal(score.winner, 1);
  assert.deepEqual(score.games, [0, 5]);
});

test('service boxes are cross-court and do not overlap', () => {
  const deuceLeft = serviceBox(0, 'deuce');
  const adLeft = serviceBox(0, 'ad');
  const deuceRight = serviceBox(1, 'deuce');
  const adRight = serviceBox(1, 'ad');
  assert.ok(deuceLeft.x0 >= COURT.netX - 0.001);
  assert.ok(deuceLeft.x1 <= COURT.netX + COURT.serviceDepth + 0.001);
  assert.ok(deuceLeft.z0 >= COURT.width / 2 - 0.001);
  assert.ok(adLeft.z1 <= COURT.width / 2 + 0.001);
  assert.ok(deuceRight.x1 <= COURT.netX + 0.001);
  assert.ok(deuceRight.z1 <= COURT.width / 2 + 0.001);
  assert.ok(adRight.z0 >= COURT.width / 2 - 0.001);
  assert.equal(pointInBox(15, 6, deuceLeft), true);
  assert.equal(pointInBox(15, 2, deuceLeft), false);
  assert.equal(pointInBox(8, 2, deuceRight), true);
  assert.equal(pointInBox(8, 6, deuceRight), false);
  assert.equal(pointInBox(15, 6, deuceRight), false);
});

test('court lines count as in and a wide ball is out', () => {
  assert.equal(inCourt(0, 0), true);
  assert.equal(inCourt(COURT.length, COURT.width), true);
  assert.equal(inCourt(-0.5, 4), false);
  assert.equal(inCourt(12, COURT.width + 0.4), false);
});

test('an aimed arc lands on the target', () => {
  const from = { x: 1.8, y: 2.15, z: 1.7 };
  const to = { x: 15.2, y: 0.02, z: 6.1 };
  const vel = solveArc(from, to, 0.9);
  const ball = { ...from, ...vel, spin: 0 };
  let landed = null;
  for (let i = 0; i < 120; i++) {
    const y0 = ball.y;
    fly(ball, DT);
    if (y0 > COURT.ballR && ball.y <= COURT.ballR) {
      landed = { x: ball.x, z: ball.z, y: ball.y };
      break;
    }
  }
  assert.ok(landed, 'ball should come down');
  assert.ok(Math.abs(landed.x - to.x) < 0.25, `x ${landed.x}`);
  assert.ok(Math.abs(landed.z - to.z) < 0.25, `z ${landed.z}`);
  const overNet = ballHeightAtX(from, vel, COURT.netX);
  assert.ok(overNet > COURT.netHeight, `net height ${overNet}`);
});

test('the net stops a low ball and lets a high ball through', () => {
  const lowPrev = { x: 11.2, y: 0.4, z: 4 };
  const lowNext = { x: 12.6, y: 0.42, z: 4 };
  const low = netCrossing(lowPrev, lowNext);
  assert.ok(low);
  assert.ok(low.y < COURT.netHeight);

  const highPrev = { x: 11.2, y: 2.1, z: 4 };
  const highNext = { x: 12.8, y: 1.7, z: 4.2 };
  const high = netCrossing(highPrev, highNext);
  assert.ok(high);
  assert.ok(high.y > COURT.netHeight);

  const same = netCrossing({ x: 10, y: 1, z: 4 }, { x: 11, y: 1, z: 4 });
  assert.equal(same, null);
});

test('a low drive into the net gives the point to the other player', () => {
  const state = createMatchState({ mode: 'local', seed: 3 });
  state.stage = 'play';
  state.ball = liveBall({ x: 11.15, y: 0.42, z: 4, vx: 9, vy: 0.1, lastHitter: 0 });
  const events = pump(state, 90);
  assert.ok(events.includes('net'));
  assert.equal(state.match.points[1], 1);
  assert.equal(state.match.points[0], 0);
  assert.notEqual(state.stage, 'play');
});

test('a ball that clears the net stays in play', () => {
  const state = createMatchState({ mode: 'local', seed: 4 });
  state.stage = 'play';
  state.ball = liveBall({ x: 10.2, y: 2.3, z: 4, vx: 12, vy: 1, lastHitter: 0, bounceCount: 0 });
  let guard = 0;
  while (state.ball.x <= COURT.netX && state.stage === 'play' && guard < 40) {
    step(state, IDLE, DT);
    guard += 1;
  }
  assert.ok(state.ball.x > COURT.netX, `x ${state.ball.x}`);
  assert.equal(state.stage, 'play');
  assert.equal(state.match.points[0] + state.match.points[1], 0);
});

test('the second bounce on the receiver side wins the point', () => {
  const state = createMatchState({ mode: 'local', seed: 5 });
  state.stage = 'play';
  state.ball = liveBall({
    x: 18,
    y: 0.2,
    z: 4,
    vx: 1,
    vy: -1,
    lastHitter: 0,
    bounceCount: 1,
  });
  pump(state, 180);
  assert.equal(state.match.points[0], 1);
  assert.ok(state.stats.pointsPlayed >= 1);
});

test('a good bounce followed by a second bounce out still wins the point', () => {
  const state = createMatchState({ mode: 'local', seed: 12 });
  state.stage = 'play';
  state.ball = liveBall({
    x: 16,
    y: 0.45,
    z: 4,
    vx: 6,
    vy: -3,
    vz: 10,
    lastHitter: 0,
    bounceCount: 0,
  });
  let guard = 0;
  let sawInBounce = false;
  while (state.stats.pointsPlayed === 0 && guard < 240) {
    const before = state.ball.bounceCount;
    step(state, IDLE, DT);
    if (state.ball.bounceCount > before && state.stats.pointsPlayed === 0) {
      assert.equal(inCourt(state.ball.x, state.ball.z), true);
      sawInBounce = true;
    }
    guard += 1;
  }
  assert.equal(sawInBounce, true);
  assert.equal(state.match.points[0], 1);
  assert.equal(state.message.key, 'point');
});

test('a bounce past the baseline is out', () => {
  const state = createMatchState({ mode: 'local', seed: 6 });
  state.stage = 'play';
  state.ball = liveBall({ x: 24.55, y: 0.28, z: 4, vx: 3, vy: -4, lastHitter: 0, bounceCount: 0 });
  let guard = 0;
  while (state.stats.pointsPlayed === 0 && guard < 120) {
    step(state, IDLE, DT);
    guard += 1;
  }
  assert.equal(state.match.points[1], 1);
  assert.equal(state.message.key, 'out');
});

test('racket contact changes the angle', () => {
  const player = { side: 0, x: 4, z: 4 };
  const center = liveBall({ x: 4.7, y: 1.1, z: 4 });
  const wide = liveBall({ x: 4.7, y: 1.1, z: 4.85 });
  const other = liveBall({ x: 4.7, y: 1.1, z: 3.15 });
  const low = liveBall({ x: 4.7, y: 0.4, z: 4 });
  const high = liveBall({ x: 4.7, y: 1.85, z: 4 });
  const miss = liveBall({ x: 4.7, y: 1.1, z: 6.4 });
  assert.equal(racketContact(player, miss), null);
  assert.ok(racketContact(player, center));
  const hitCenter = resolveStrike(player, center, null);
  const hitWide = resolveStrike(player, wide, null);
  const hitOther = resolveStrike(player, other, null);
  const hitLow = resolveStrike(player, low, null);
  const hitHigh = resolveStrike(player, high, null);
  assert.ok(hitCenter.vx > 0, 'shot goes toward the other end');
  assert.ok(hitWide.targetZ < hitCenter.targetZ, 'ball on the +z edge goes toward -z');
  assert.ok(hitOther.targetZ > hitCenter.targetZ);
  assert.ok(hitWide.zNorm > 0 && hitWide.spin < 0);
  assert.ok(hitLow.vy > hitHigh.vy, 'a low contact lobs more than a high contact');
  const right = { side: 1, x: 20, z: 4 };
  const back = resolveStrike(right, liveBall({ x: 19.3, y: 1.1, z: 4, lastHitter: 0 }), null);
  assert.ok(back.vx < 0);
});

test('a placed serve lands in the box, and a wild one is a fault', () => {
  const good = createMatchState({ mode: 'local', seed: 8, gamesToWin: 3 });
  assert.equal(good.stage, 'serve');
  assert.equal(good.match.server, 0);
  pump(good, 6, [{ mx: 0, mz: 0, swing: true }, IDLE[1]]);
  assert.equal(good.ball.inPlay, true);
  let guard = 0;
  while (good.ball.serve && good.stage === 'play' && guard < 180) {
    step(good, IDLE, DT);
    guard += 1;
  }
  assert.ok(guard < 180);
  assert.equal(good.stage, 'play');
  assert.equal(good.faults, 0);
  assert.equal(good.match.points[0] + good.match.points[1], 0);
  assert.ok(good.ball.bounceCount >= 1);

  const bad = createMatchState({ mode: 'local', seed: 9 });
  bad.players[0].z = 6.4;
  pump(bad, 2, [{ mx: 0, mz: 0, swing: true }, IDLE[1]]);
  guard = 0;
  while (bad.stage === 'play' && guard < 200) {
    step(bad, IDLE, DT);
    guard += 1;
  }
  assert.equal(bad.message.key, 'fault');
  assert.equal(bad.faults, 1);
  assert.equal(bad.match.points[0] + bad.match.points[1], 0);
});

test('two faults in a row are a double fault', () => {
  const state = createMatchState({ mode: 'local', seed: 10 });
  for (let serve = 0; serve < 2; serve++) {
    state.players[0].z = 6.5;
    const swing = [{ mx: 0, mz: 0, swing: true }, IDLE[1]];
    pump(state, 3, swing);
    let guard = 0;
    while (state.stage === 'play' && guard < 220) {
      step(state, IDLE, DT);
      guard += 1;
    }
    pump(state, 80);
  }
  assert.equal(state.stats.doubleFaults, 1);
  assert.equal(state.match.points[1], 1);
  assert.equal(state.faults, 0);
});

test('normal CPU players finish a match and trade shots', () => {
  const state = createMatchState({ mode: 'demo', difficulty: 'normal', gamesToWin: 3, seed: 11 });
  runUntilOver(state, 50000);
  assert.equal(state.match.over, true, `timed out at ${state.steps} maxRally ${state.stats.maxRally}`);
  assert.ok(state.match.winner === 0 || state.match.winner === 1);
  assert.ok(state.match.games[state.match.winner] >= 3);
  assert.ok(state.stats.maxRally >= 3, `expected a rally, max was ${state.stats.maxRally}`);
  assert.ok(state.stats.pointsPlayed >= 4);
  console.log('normal demo', JSON.stringify({
    games: state.match.games,
    winner: state.match.winner,
    points: state.stats.pointsPlayed,
    maxRally: state.stats.maxRally,
    faults: state.stats.faults,
    lets: state.stats.lets,
    steps: state.steps,
  }));
});

test('hard CPU beats easy CPU', () => {
  const state = createMatchState({
    mode: 'demo',
    difficulties: ['easy', 'hard'],
    gamesToWin: 3,
    seed: 21,
  });
  runUntilOver(state, 50000);
  assert.equal(state.match.over, true, `timed out steps ${state.steps}`);
  assert.equal(state.match.winner, 1, `games ${state.match.games.join('-')} points ${state.stats.winners.join('-')}`);
  console.log('hard vs easy', JSON.stringify({
    games: state.match.games,
    winners: state.stats.winners,
    maxRally: state.stats.maxRally,
    faults: state.stats.faults,
  }));
});

test('a very fast ball does not tunnel through a swinging racket', () => {
  const state = createMatchState({ mode: 'local', seed: 1 });
  state.stage = 'play';
  state.players[0].x = 8;
  state.players[0].z = 4;
  state.players[0].swinging = true;
  state.players[0].swingT = 0.18;
  state.players[0].didHit = false;
  state.ball = {
    x: 6.4, y: 1.1, z: 4, vx: 100, vy: 0, vz: 0, spin: 0,
    lastHitter: 1, bounceCount: 1, inPlay: true, serve: false, mustBounce: false,
    netCord: false, netFail: false, crossed: true, sinceBounce: 1, asleep: false,
  };
  let hit = false;
  for (let i = 0; i < 8 && state.stage === 'play'; i++) {
    const events = step(state, [{ mx: 0, mz: 0, swing: true }, IDLE[1]], DT);
    if (events.includes('hit') && state.ball.lastHitter === 0) hit = true;
  }
  assert.equal(hit, true);
});

test('players stay inside their own half', () => {
  const state = createMatchState({ mode: 'local', seed: 2 });
  const push = [
    { mx: 1, mz: 1, swing: false, gotoX: 100, gotoZ: 100 },
    { mx: -1, mz: -1, swing: false, gotoX: -100, gotoZ: -100 },
  ];
  for (let i = 0; i < 180; i++) step(state, push, DT);
  for (const player of state.players) {
    const limits = playerLimits(player.side);
    assert.ok(player.x >= limits.x0 - 0.001 && player.x <= limits.x1 + 0.001);
    assert.ok(player.z >= limits.z0 - 0.001 && player.z <= limits.z1 + 0.001);
  }
});

function trackerInput(state) {
  const ball = state.ball;
  const me = state.players[0];
  const input = { mx: 0, mz: 0, swing: false };
  if (state.stage === 'serve' && state.match.server === 0) input.swing = true;
  if (ball?.inPlay && ball.lastHitter !== 0) {
    input.mz = Math.max(-1, Math.min(1, (ball.z - me.z) / 0.4));
    input.mx = Math.max(-1, Math.min(1, (ball.x - 0.7 - me.x) / 0.5));
    const rdx = ball.x - me.x;
    if (rdx > 0.2 && rdx < 1.4 && Math.abs(ball.z - me.z) < 1 && ball.y < 2.2 && ball.y > 0.3 && (!ball.mustBounce || ball.bounceCount >= 1) && ball.x < COURT.netX) {
      input.swing = true;
    }
  }
  return input;
}

test('easy CPU is beatable and hard CPU is not a pushover', () => {
  function play(difficulty, seed) {
    const state = createMatchState({ mode: 'cpu', difficulty, gamesToWin: 3, seed });
    let steps = 0;
    while (!state.match.over && steps < 30000) {
      step(state, [trackerInput(state), IDLE[1]], DT);
      steps += 1;
    }
    return state;
  }
  const easy = play('easy', 4);
  assert.equal(easy.match.over, true);
  assert.equal(easy.match.winner, 0, `easy games ${easy.match.games.join('-')}`);
  const hard = play('hard', 4);
  assert.equal(hard.match.over, true);
  assert.equal(hard.match.winner, 1, `hard games ${hard.match.games.join('-')}`);
});
