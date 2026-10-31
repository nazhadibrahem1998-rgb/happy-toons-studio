import { createState, step } from './physics.js';
import { run } from './bot.js';

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
