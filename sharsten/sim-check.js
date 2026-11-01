import {
  LAYOUT, MAP_BOUND, advanceHours, assignJob, averageHappiness, cameraBasis, cameraEyeY, celebrateNewroz,
  clampToMap, cleanMosque, createState, demolish, harvest, isRoad, phaseOf, place, plant, reachExit, setHour, setSeason,
  stickVector, suggestCell, upgrade, walkStep,
} from './sim.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const s = createState();
assert(s.season === 0, 'spring default');
assert(phaseOf(s.hour) === 'day', 'morning is day');
setHour(s, 11);
assert(s.phase ? s.phase === 'day' : phaseOf(s.hour) === 'day', 'hour 11 day');
const ticks = s.ticks;
advanceHours(s, 8);
assert(s.hour === 19, `hour ${s.hour}`);
assert(phaseOf(s.hour) === 'night', 'night');
assert(s.ticks === ticks + 8, 'ticks');
assert(s.villagers[0].mode === 'home', 'home at night');

const w = createState();
setHour(w, 8);
const water0 = w.resources.water;
const plotW = suggestCell(w, 'woodyard');
assert(plotW, 'woodyard plot');
const placed = place(w, 'woodyard', plotW.gx, plotW.gz);
assert(placed.ok, 'woodyard');
const wood0 = w.resources.wood;
const who = w.villagers[0];
const job = assignJob(w, who.id, 'builder');
assert(job.ok, 'job');
advanceHours(w, 4);
assert(w.resources.wood > wood0 + 5, `wood ${w.resources.wood} from ${wood0}`);
assert(w.resources.water > water0, 'water ticks');

const f = createState();
setHour(f, 7);
const plotF = suggestCell(f, 'field');
assert(plotF, 'field plot');
const field = place(f, 'field', plotF.gx, plotF.gz);
assert(field.ok, 'field');
assert(plant(f, field.id).ok, 'plant');
assert(assignJob(f, f.villagers[1].id, 'farmer').ok, 'farmer');
advanceHours(f, 3);
const mid = f.buildings.find((b) => b.id === field.id);
assert(mid.growth >= 35 && mid.stage >= 2, `grow ${mid.growth} ${mid.stage}`);
advanceHours(f, 6);
const ripe = f.buildings.find((b) => b.id === field.id);
assert(ripe.stage === 3, 'ready');
const grain0 = f.resources.grain;
assert(harvest(f, field.id).ok, 'harvest');
assert(f.resources.grain >= grain0 + 8, 'grain');

const a = createState();
setHour(a, 8);
const wool0 = a.resources.wool;
const milk0 = a.resources.milk;
const egg0 = a.resources.eggs;
advanceHours(a, 3);
assert(a.resources.wool > wool0, 'wool');
assert(a.resources.milk > milk0, 'milk');
assert(a.resources.eggs > egg0, 'eggs');

const m = createState();
const mosque = m.buildings.find((b) => b.type === 'mosque');
assert(demolish(m, mosque.id).ok === false, 'mosque stays');
assert(cleanMosque(m).ok, 'clean');
assert(m.mosqueClean, 'cleaned');

setSeason(a, 'summer');
assert(a.season === 1, 'summer');

const up = stickVector(0, -40, 40);
assert(up.y > 0.9 && Math.abs(up.x) < 0.01, 'stick up');
const right = stickVector(40, 0, 40);
assert(right.x > 0.9 && Math.abs(right.y) < 0.01, 'stick right');
const down = stickVector(0, 40, 40);
assert(down.y < -0.9, 'stick down');

const yaw = 0;
const { forward, right: camRight } = cameraBasis(yaw);
const moved = walkStep({ x: 5, z: 5 }, yaw, 0.6, 0, 1, 0, 0, 0.5);
const dx = moved.x - 5;
const dz = moved.z - 5;
assert(dx * forward.x + dz * forward.z > 0.5, 'forward');
assert(Math.abs(dx * camRight.x + dz * camRight.z) < 0.05, 'not sideways');
const strafed = walkStep({ x: 5, z: 5 }, yaw, 0.6, 1, 0, 0, 0, 0.5);
const sx = strafed.x - 5;
const sz = strafed.z - 5;
assert(sx * camRight.x + sz * camRight.z > 0.5, 'right');
assert(Math.abs(sx * forward.x + sz * forward.z) < 0.05, 'not forward');

const looked = walkStep({ x: 5, z: 5 }, 0, 0.6, 0, 0, 1, 0, 0.4);
const beforeF = cameraBasis(0).forward;
const afterF = cameraBasis(looked.yaw).forward;
const prevRight = cameraBasis(0).right;
assert(afterF.x * prevRight.x + afterF.z * prevRight.z > 0.05, 'look right');
assert(Math.abs(beforeF.x) < 0.001, 'start forward');
const upLook = walkStep({ x: 0, z: 0 }, 0, 0.7, 0, 0, 0, 1, 0.3);
assert(upLook.pitch < 0.7, 'pitch up');
assert(cameraEyeY(upLook.pitch) < cameraEyeY(0.7), 'eye rises less when looking up');

assert(averageHappiness(s) > 0, 'happy');
const map = createState();
const mosqueAt = map.buildings.find((b) => b.type === 'mosque');
assert(mosqueAt && mosqueAt.gx === LAYOUT.mosque.gx && mosqueAt.gz === LAYOUT.mosque.gz, 'mosque');
assert(LAYOUT.exits.length === 3, 'three exits');
LAYOUT.exits.forEach((exit) => {
  assert(isRoad(exit.gx, exit.gz), exit.id);
  const walked = reachExit(exit);
  assert(walked.ok, `${exit.id} ${walked.reason || 'walk'}`);
});
assert(isRoad(LAYOUT.loopApex.gx, LAYOUT.loopApex.gz), 'north loop');
assert(isRoad(LAYOUT.westSpur.gx, LAYOUT.westSpur.gz), 'west spur');
assert(isRoad(LAYOUT.neSpur.gx, LAYOUT.neSpur.gz), 'ne spur');
assert(map.buildings.filter((b) => b.type === 'house').length >= 8, 'core houses');
const st = createState();
const plotH = suggestCell(st, 'house');
assert(plotH, 'house plot');
const h = place(st, 'house', plotH.gx, plotH.gz);
assert(upgrade(st, h.id).ok, 'upgrade');
assert(st.buildings.find((b) => b.id === h.id).level === 2, 'level 2');

assert(celebrateNewroz(createState()).ok === false, 'newroz needs tea');

const open = clampToMap(-2, 2);
assert(open.hit === false && open.gx === -2, 'open meadow past the plots');
const edge = clampToMap(-20, 2);
assert(edge.hit === true && edge.gx === MAP_BOUND.minGx, 'bounded at the hills');

console.log('sim-check ok');
