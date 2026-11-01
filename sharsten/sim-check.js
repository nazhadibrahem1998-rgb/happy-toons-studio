import {
  LAYOUT, MAP_BOUND, acceptQuest, advanceHours, assignJob, astarRoute, averageHappiness, cameraBasis, cameraEyeY,
  canPlace, celebrateNewroz, clampToMap, cleanMosque, createState, demolish, driveVehicle, enterVehicle, exitVehicle, harvest,
  integrate, isRoad, isUnlocked, npcActiveCap, npcSchedule, phaseOf, place, plant, playable, reachExit, setEasy, setHour, setSeason, stepNpcs,
  animalCap, carryBudget, DONKEY_SPEED, enterAnimal, exitAnimal, herdSpot, moveGoods, rideAnimal, stepAnimals,
  stepVehicles, stickVector, suggestCell, turnInQuest, upgrade, VEHICLE_SPEED, vehicleCap, walkStep,
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

const traffic = createState();
assert(traffic.vehicles.length === 6, `fleet ${traffic.vehicles.length}`);
assert(traffic.vehicles.every((v) => v.kind === 'cart'), 'wooden carts only');
assert(vehicleCap(true) === 4 && vehicleCap(false) === 8, 'vehicle caps');
traffic.villagers.forEach((v) => { v.gx = 28; v.gz = 4; v.tx = 28; v.tz = 4; });
const ringCar = traffic.vehicles.find((v) => v.route === 'ring');
assert(ringCar && ringCar.path.length >= 8, 'ring');
ringCar.path.forEach((cell) => assert(isRoad(cell.gx, cell.gz), `ring road ${cell.gx},${cell.gz}`));
const lapStart = { gx: ringCar.gx, gz: ringCar.gz };
const lapSeen = new Set();
let lapped = false;
for (let i = 0; i < 240 && !lapped; i += 1) {
  stepVehicles(traffic, 0.1, { low: false, focus: { gx: ringCar.gx, gz: ringCar.gz, r: 40 } });
  lapSeen.add(`${Math.round(ringCar.gx)},${Math.round(ringCar.gz)}`);
  assert(playable(ringCar.gx, ringCar.gz), 'car stays inside');
  assert(isRoad(Math.round(ringCar.gx), Math.round(ringCar.gz)), 'car stays on a lane');
  if (i > 25 && lapSeen.size >= 6 && Math.hypot(ringCar.gx - lapStart.gx, ringCar.gz - lapStart.gz) < 0.35) lapped = true;
}
assert(lapped, `loop seen ${lapSeen.size}`);

const driver = createState();
const bike = driver.vehicles.find((v) => v.kind === 'cart');
const pilot = driver.villagers[0];
pilot.gx = bike.gx + 0.3;
pilot.gz = bike.gz;
assert(enterVehicle(driver, bike.id).ok, 'enter');
assert(driver.drivenId === bike.id && bike.occupied, 'seated');
const seat = { gx: bike.gx, gz: bike.gz };
for (let i = 0; i < 10; i += 1) driveVehicle(driver, bike.id, 0, 1, 0.1);
assert(Math.hypot(bike.gx - seat.gx, bike.gz - seat.gz) > 0.6, 'drove');
assert(Math.hypot(pilot.gx - bike.gx, pilot.gz - bike.gz) < 0.05, 'player rides');
assert(exitVehicle(driver).ok, 'exit');
assert(driver.drivenId === 0 && bike.occupied === false, 'on foot');

assert(enterVehicle(driver, bike.id).ok, 'enter again');
bike.gx = 0.2;
bike.gz = 10;
bike.yaw = Math.atan2(-1, 0);
pilot.gx = bike.gx;
pilot.gz = bike.gz;
let bounced = false;
for (let i = 0; i < 50; i += 1) {
  const step = driveVehicle(driver, bike.id, 0, 1, 0.1);
  if (step.hit) bounced = true;
  assert(playable(bike.gx, bike.gz), 'bound holds');
}
assert(bounced, 'edge stops the bike');
assert(bike.gx > -4, `gx ${bike.gx}`);
assert(playable(-10, 10) === false, 'past the valley is closed');

bike.gx = LAYOUT.mosque.gx;
bike.gz = LAYOUT.mosque.gz + 1.25;
bike.yaw = Math.atan2(0, -1);
pilot.gx = bike.gx;
pilot.gz = bike.gz;
let mosqueHit = false;
for (let i = 0; i < 30; i += 1) {
  const step = driveVehicle(driver, bike.id, 0, 1, 0.1);
  if (step.hit) mosqueHit = true;
  const onMosque = Math.round(bike.gx) === LAYOUT.mosque.gx && Math.round(bike.gz) === LAYOUT.mosque.gz;
  assert(!onMosque, 'mosque blocks');
}
assert(mosqueHit, 'mosque collision');

const farm = createState();
const ripeField = farm.buildings.find((b) => b.type === 'field' && b.stage === 3);
assert(ripeField, 'ripe plot');
const grainBefore = farm.resources.grain;
assert(harvest(farm, ripeField.id).ok, 'harvest');
assert(ripeField.stage === 0, `cleared ${ripeField.stage}`);
assert(farm.resources.grain >= grainBefore + 8, 'wheat added');

const fleet = createState();
const watcher = fleet.villagers[0];
stepVehicles(fleet, 0.2, { low: true, focus: { gx: watcher.gx, gz: watcher.gz, r: 999 } });
assert(fleet.vehicles.filter((v) => v.ai === 'active').length === 4, 'low vehicle cap');
stepVehicles(fleet, 0.2, { low: false, focus: { gx: watcher.gx, gz: watcher.gz, r: 0.2 } });
const parked = fleet.vehicles.filter((v) => Math.hypot(v.gx - watcher.gx, v.gz - watcher.gz) > 0.2);
assert(parked.length > 0 && parked.every((v) => v.ai === 'lod' && v.updated === false), 'vehicle lod');

const herd = createState();
assert(herd.animals.filter((a) => a.kind === 'cow').length >= 4, 'cows');
assert(herd.animals.filter((a) => a.kind === 'donkey').length >= 4, 'donkeys');
setHour(herd, 9);
const daySheep = herd.animals.find((a) => a.kind === 'sheep');
const pasture = herdSpot(herd, 'sheep', 'pasture');
const fold = herdSpot(herd, 'sheep', 'pen');
assert(Math.hypot(daySheep.gx - pasture.gx, daySheep.gz - pasture.gz) < 2.4, 'sheep at pasture');
assert(daySheep.mode === 'graze', daySheep.mode);
const herder = herd.villagers.find((v) => v.role === 'shepherd');
assert(Math.hypot(herder.gx - pasture.gx, herder.gz - pasture.gz) < 2.6, 'herder leads out');
setHour(herd, 20);
const nightSheep = herd.animals.find((a) => a.id === daySheep.id);
assert(nightSheep.mode === 'idle', nightSheep.mode);
assert(Math.hypot(nightSheep.gx - fold.gx, nightSheep.gz - fold.gz) < 2.4, 'sheep back at the pen');
assert(Math.hypot(nightSheep.gx - pasture.gx, nightSheep.gz - pasture.gz) > 6, 'left the pasture');
herd.animals.forEach((a) => assert(playable(a.gx, a.gz), `${a.kind} inside`));

const cowsOnly = createState();
cowsOnly.animals = cowsOnly.animals.filter((a) => a.kind === 'cow');
cowsOnly.resources.milk = 0;
advanceHours(cowsOnly, 1);
assert(cowsOnly.resources.milk > 0, 'cow milk');
const sheepOnly = createState();
sheepOnly.animals = sheepOnly.animals.filter((a) => a.kind === 'sheep');
sheepOnly.resources.wool = 0;
sheepOnly.resources.milk = 0;
advanceHours(sheepOnly, 1);
assert(sheepOnly.resources.wool > 0 && sheepOnly.resources.milk > 0, 'sheep wool and milk');
const goatsOnly = createState();
goatsOnly.animals = goatsOnly.animals.filter((a) => a.kind === 'goat');
goatsOnly.resources.milk = 0;
advanceHours(goatsOnly, 1);
assert(goatsOnly.resources.milk > 0, 'goat milk');
const hensOnly = createState();
hensOnly.animals = hensOnly.animals.filter((a) => a.kind === 'chicken');
hensOnly.resources.eggs = 0;
advanceHours(hensOnly, 1);
assert(hensOnly.resources.eggs > 0, 'eggs');

const pack = createState();
assert(carryBudget(pack) === pack.animals.filter((a) => a.kind === 'donkey').length * 8, 'donkey loads');
pack.animals.forEach((a) => { if (a.kind === 'donkey') a.ridden = true; });
assert(carryBudget(pack) < 20, 'ridden donkey carries less');
const hauled = moveGoods(createState(), 'wood', 100);
assert(hauled.moved === 32 && hauled.cap === 32, `haul ${hauled.moved}`);

const mount = createState();
const donkey = mount.animals.find((a) => a.kind === 'donkey');
const rider = mount.villagers[0];
rider.gx = donkey.gx + 0.2;
rider.gz = donkey.gz;
assert(DONKEY_SPEED < VEHICLE_SPEED.cart, 'donkey slower than a cart');
assert(enterAnimal(mount, donkey.id).ok, 'mount');
assert(mount.riddenId === donkey.id, 'mounted');
const saddle = { gx: donkey.gx, gz: donkey.gz };
for (let i = 0; i < 8; i += 1) rideAnimal(mount, donkey.id, 0, 1, 0.1);
assert(Math.hypot(donkey.gx - saddle.gx, donkey.gz - saddle.gz) > 0.4, 'donkey walked');
assert(playable(donkey.gx, donkey.gz), 'ride stays inside');
assert(exitAnimal(mount).ok, 'dismount');
assert(mount.riddenId === 0 && donkey.ridden === false, 'on foot');
assert(enterAnimal(mount, donkey.id).ok, 'mount again');
donkey.gx = 0.2;
donkey.gz = 10;
donkey.yaw = Math.atan2(-1, 0);
rider.gx = donkey.gx;
rider.gz = donkey.gz;
let donkeyHit = false;
for (let i = 0; i < 40; i += 1) {
  const step = rideAnimal(mount, donkey.id, 0, 1, 0.1);
  if (step.hit) donkeyHit = true;
  assert(playable(donkey.gx, donkey.gz), 'donkey bound');
}
assert(donkeyHit, 'donkey stops at the edge');

const flockCap = createState();
const eye = flockCap.villagers[0];
stepAnimals(flockCap, 0.2, { low: true, focus: { gx: eye.gx, gz: eye.gz, r: 999 } });
assert(animalCap(true) === 20 && animalCap(false) === 40, 'animal caps');
assert(flockCap.animals.filter((a) => a.ai === 'active').length === 20, 'low animal cap');
stepAnimals(flockCap, 0.2, { low: false, focus: { gx: eye.gx, gz: eye.gz, r: 0.3 } });
const farBeasts = flockCap.animals.filter((a) => Math.hypot(a.gx - eye.gx, a.gz - eye.gz) > 0.3);
assert(farBeasts.length > 0 && farBeasts.every((a) => a.ai === 'lod' && a.updated === false), 'animal lod');

const lock = createState();
assert(isUnlocked(lock, 'house') && !isUnlocked(lock, 'teahouse'), 'later buildings stay locked');
setEasy(lock, true);
assert(isUnlocked(lock, 'teahouse'), 'easy mode unlocks');
const plotTea = suggestCell(lock, 'teahouse');
assert(plotTea && canPlace(lock, 'teahouse', plotTea.gx, plotTea.gz), 'easy can afford a tea house');

console.log('sim-check ok');
