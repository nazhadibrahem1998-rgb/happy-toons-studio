import {
  LAYOUT, MAP_BOUND, acceptQuest, advanceHours, assignJob, astarRoute, averageHappiness, cameraBasis, cameraEyeY,
  celebrateNewroz, clampToMap, cleanMosque, createState, demolish, harvest, integrate, isRoad, npcActiveCap, npcSchedule,
  phaseOf, place, plant, playable, reachExit, setHour, setSeason, stepNpcs, stickVector, suggestCell, turnInQuest, upgrade, walkStep,
} from './sim.js';
import { linePairs } from './i18n.js';

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

const open = clampToMap(LAYOUT.mosque.gx + 1.2, LAYOUT.mosque.gz);
assert(open.hit === false, 'street by the mosque is inside');
const edge = clampToMap(-30, 2);
assert(edge.hit === true, 'outside the fields is blocked');
assert(playable(edge.gx, edge.gz), 'clamp lands inside');

const wanted = ['greet0', 'greet1', 'greet2', 'greet3', 'wheatOffer', 'wheatDone', 'chickenOffer', 'chickenDone', 'fenceOffer', 'fenceDone'];
const lines = linePairs();
const seen = new Set(lines.map((line) => line.id));
wanted.forEach((id) => assert(seen.has(id), `line ${id}`));
lines.forEach((line) => {
  assert(line.en && line.en.trim() && line.ckb && line.ckb.trim(), `empty ${line.id}`);
  assert(line.en !== line.ckb, `same ${line.id}`);
});

const day = createState();
const walker = day.villagers.find((v) => !v.player);
for (let h = 0; h < 24; h += 1) {
  setHour(day, h);
  const mode = day.villagers.find((v) => v.id === walker.id).mode;
  assert(mode === npcSchedule(h), `hour ${h} mode ${mode}`);
}
const mosquePath = astarRoute(LAYOUT.exits[1].gx, LAYOUT.exits[1].gz, LAYOUT.mosque.gx, LAYOUT.mosque.gz);
assert(mosquePath && mosquePath.length > 2, 'mosque path');
const mosqueEnd = mosquePath[mosquePath.length - 1];
assert(Math.hypot(mosqueEnd.gx - LAYOUT.mosque.gx, mosqueEnd.gz - LAYOUT.mosque.gz) < 0.1, 'reaches mosque');
const wheatField = day.buildings.find((b) => b.type === 'field');
const home = day.buildings.find((b) => b.type === 'house');
const fieldPath = astarRoute(LAYOUT.mosque.gx, LAYOUT.mosque.gz, wheatField.gx, wheatField.gz);
const homePath = astarRoute(LAYOUT.mosque.gx, LAYOUT.mosque.gz, home.gx, home.gz);
assert(fieldPath && Math.hypot(fieldPath[fieldPath.length - 1].gx - wheatField.gx, fieldPath[fieldPath.length - 1].gz - wheatField.gz) < 0.1, 'reaches field');
assert(homePath && Math.hypot(homePath[homePath.length - 1].gx - home.gx, homePath[homePath.length - 1].gz - home.gz) < 0.1, 'reaches home');
[mosquePath, fieldPath, homePath].forEach((path) => {
  for (let i = 1; i < path.length; i += 1) {
    const step = Math.hypot(path[i].gx - path[i - 1].gx, path[i].gz - path[i - 1].gz);
    assert(step <= 1.75, `gap ${step}`);
  }
  path.slice(0, -1).forEach((cell) => assert(isRoad(cell.gx, cell.gz), 'lane'));
});

setHour(day, 12);
const visitor = day.villagers.find((v) => !v.player && v.role === 'teacher');
assert(visitor.mode === 'mosque', 'teacher visits mosque');
assert(visitor.path && visitor.path.length > 1, 'teacher path');
const visitEnd = visitor.path[visitor.path.length - 1];
assert(Math.hypot(visitEnd.gx - LAYOUT.mosque.gx, visitEnd.gz - LAYOUT.mosque.gz) < 2.2, 'path ends at mosque');

const budget = createState();
const hero = budget.villagers[0];
stepNpcs(budget, 0.2, { low: true, focus: { gx: hero.gx, gz: hero.gz, r: 999 } });
const crowd = budget.villagers.filter((v) => !v.player);
assert(crowd.length >= 24, `npcs ${crowd.length}`);
assert(npcActiveCap(true) === 12 && npcActiveCap(false) === 24, 'caps');
assert(crowd.filter((v) => v.ai === 'active').length === 12, 'low cap');
assert(crowd.filter((v) => v.ai === 'throttle').length === crowd.length - 12, 'throttled');
stepNpcs(budget, 0.2, { low: false, focus: { gx: hero.gx, gz: hero.gz, r: 0.25 } });
const distant = crowd.filter((v) => Math.hypot(v.gx - hero.gx, v.gz - hero.gz) > 0.25);
assert(distant.length > 0 && distant.every((v) => v.ai === 'lod' && v.updated === false), 'far lod');

const greetState = createState();
const neighbour = greetState.villagers.find((v) => !v.player);
greetState.villagers[0].gx = neighbour.gx;
greetState.villagers[0].gz = neighbour.gz + 0.4;
stepNpcs(greetState, 0.2, { low: false, focus: { gx: neighbour.gx, gz: neighbour.gz, r: 4 } });
assert(neighbour.greeting === true && String(neighbour.line).startsWith('greet'), 'greet');

const quest = createState();
const pay0 = quest.resources.money;
const sack0 = quest.resources.grain;
assert(acceptQuest(quest, 'wheat').ok, 'take wheat');
assert(quest.npcQuests.find((q) => q.id === 'wheat').status === 'active', 'wheat active');
assert(turnInQuest(quest, 'wheat').ok, 'finish wheat');
assert(quest.npcQuests.find((q) => q.id === 'wheat').status === 'done', 'wheat done');
assert(quest.resources.money >= pay0 + 8, 'wheat pay');
assert(quest.resources.grain <= sack0 - 4, 'wheat spent');

const chick = createState();
const lost = chick.npcQuests.find((q) => q.id === 'chicken');
assert(acceptQuest(chick, 'chicken').ok, 'take chicken');
assert(turnInQuest(chick, 'chicken').ok === false, 'hen still lost');
chick.villagers[0].gx = lost.spot.gx;
chick.villagers[0].gz = lost.spot.gz;
const food0 = chick.resources.food;
assert(turnInQuest(chick, 'chicken').ok, 'hen found');
assert(chick.resources.food >= food0 + 6, 'food reward');

const fence = createState();
const posts0 = fence.resources.wood;
const tools0 = fence.resources.tools;
const coins0 = fence.resources.money;
assert(acceptQuest(fence, 'fence').ok, 'take fence');
assert(turnInQuest(fence, 'fence').ok, 'fix fence');
assert(fence.resources.wood <= posts0 - 4, 'wood spent');
assert(fence.resources.tools >= tools0 + 1, 'tool');
assert(fence.resources.money >= coins0 + 6, 'fence pay');

const mover = createState();
setHour(mover, 8);
const farmer = mover.villagers.find((v) => !v.player && v.role === 'farmer');
farmer.gx = farmer.path[0].gx;
farmer.gz = farmer.path[0].gz;
farmer.pathI = 0;
mover.villagers[0].gx = 0;
mover.villagers[0].gz = 0;
const before = { gx: farmer.gx, gz: farmer.gz };
stepNpcs(mover, 0.5, { low: false, focus: { gx: farmer.gx, gz: farmer.gz, r: 6 } });
integrate(mover, 1, { focus: { gx: farmer.gx, gz: farmer.gz, r: 6 } });
const shifted = Math.hypot(farmer.gx - before.gx, farmer.gz - before.gz);
if (farmer.path.length > 1) assert(shifted > 0.05, 'walks the lane');

console.log('sim-check ok');
