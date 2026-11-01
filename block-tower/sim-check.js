import { plan, run } from './bot.js';
import { createState, hitsHazardAt, step, stepRivals } from './physics.js';
import { createRivals, decideRivals } from './rivals.js';

const audit = createState();
const badSpawns = [];
for (const pad of audit.ents.filter((e) => e.spawnFloor)) {
  let hits = 0;
  for (let i = 0; i < 300; i++) {
    if (hitsHazardAt(audit, pad.cx, pad.top, pad.cz, i / 30)) hits += 1;
  }
  if (hits) badSpawns.push(`${pad.id}:${hits}`);
}
if (badSpawns.length) {
  console.error('checkpoint inside hazard', badSpawns.join(', '));
  process.exit(1);
}
console.log('checkpoints clear of hazards');

const easy = createState();
const easyResult = run(easy, step, { untilFloor: 4, maxSteps: 20000 });
console.log('floors 1-3', JSON.stringify(easyResult));

const full = createState();
const fullResult = run(full, step, { untilFloor: 99, maxSteps: 36000 });
console.log('full', JSON.stringify(fullResult));

if (!easyResult.ok || easyResult.deaths > 0) {
  console.error('EASY FLOORS FAILED');
  process.exit(1);
}
if (!fullResult.ok || !fullResult.won) {
  console.error('FULL CLEAR FAILED');
  process.exit(1);
}
console.log('sim ok', { easyDeaths: easyResult.deaths, fullDeaths: fullResult.deaths, time: fullResult.playTime.toFixed(1) });

{
  const state = createState();
  state.rivals = createRivals('easy', state);
  const fallen = state.rivals[0];
  fallen.y = fallen.spawn.y - 8;
  fallen.vy = -1;
  stepRivals(state, 1 / 60);
  if (fallen.deaths < 1 || Math.abs(fallen.y - fallen.spawn.y) > 0.05) {
    console.error('rival did not respawn', fallen.deaths, fallen.y, fallen.spawn.y);
    process.exit(1);
  }
  console.log('rival respawn ok');
}

function solo(mode) {
  const state = createState();
  state.rivals = createRivals(mode, state);
  let steps = 0;
  for (; steps < 20000; steps++) {
    if (state.rivals.every((rival) => rival.won)) break;
    decideRivals(state, 1 / 60);
    step(state, { forward: 0, strafe: 0, jump: false, yaw: 0, timing: false }, 1 / 60);
    stepRivals(state, 1 / 60);
  }
  const done = state.rivals.every((rival) => rival.won);
  console.log('solo', mode, steps, state.rivals.map((rival) => `${rival.id}:${rival.won ? 'win' : 'no'} d${rival.deaths} b${rival.blunders}`).join(' '));
  if (!done) {
    console.error('rivals did not finish', mode);
    process.exit(1);
  }
  return state;
}

function alongside(mode) {
  const state = createState();
  state.rivals = createRivals(mode, state);
  for (let i = 0; i < 20000 && !state.won; i++) {
    decideRivals(state, 1 / 60);
    step(state, { ...plan(state), timing: true }, 1 / 60);
    stepRivals(state, 1 / 60);
  }
  const blunders = state.rivals.reduce((sum, rival) => sum + rival.blunders, 0);
  console.log('alongside', mode, JSON.stringify({
    won: state.won,
    deaths: state.deaths,
    blunders,
    rivals: state.rivals.map((rival) => ({ id: rival.id, x: +rival.x.toFixed(1), won: rival.won, deaths: rival.deaths })),
  }));
  if (!state.won || state.deaths > 0) {
    console.error('player failed the race', mode);
    process.exit(1);
  }
  if (state.rivals.some((rival) => rival.x < 80)) {
    console.error('rival did not race', mode);
    process.exit(1);
  }
  return blunders;
}

const easySolo = solo('easy');
if (easySolo.rivals.reduce((sum, rival) => sum + rival.blunders, 0) < 1) {
  console.error('easy rivals made no mistakes');
  process.exit(1);
}
solo('hard');
alongside('easy');
alongside('hard');
console.log('races ok');
