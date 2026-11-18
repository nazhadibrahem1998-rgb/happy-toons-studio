import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  step,
  autoplay,
  applyOffline,
  serialize,
  hydrate,
  buy,
  debugLayout,
  incomeOf,
  OFFLINE_CAP,
  place,
  preview,
  railSlots,
} from '../js/sim.js';

test('layout puts every stop on the rail', () => {
  const layout = debugLayout();
  for (const level of layout) {
    assert.ok(level.length > 800, 'loop ' + level.level);
    for (let i = 0; i < level.stations.length; i++) {
      const station = level.stations[i];
      assert.ok(station.d < 36, station.id + ' on track ' + level.level + ' is ' + station.d + 'px off the rail');
      if (i > 0) {
        const gap = station.at - level.stations[i - 1].at;
        assert.ok(gap >= 24, station.id + ' overlaps ' + level.stations[i - 1].id);
      }
    }
  }
});

test('the first sale lands quickly and the first purchase is under 15s', () => {
  const state = createState();
  let saleAt = null;
  for (let t = 0; t <= 12; t += 0.25) {
    const events = step(state, 0.25, true);
    if (saleAt == null && events.some((e) => e.type === 'sale')) saleAt = t + 0.25;
  }
  assert.ok(saleAt != null && saleAt < 8, 'first sale at ' + saleAt);

  const report = autoplay(createState(), 20);
  assert.ok(report.firstBuyAt != null && report.firstBuyAt < 15, 'first buy at ' + report.firstBuyAt);
});

test('fifteen minutes stays busy, finite, and short of a soft lock', () => {
  const state = createState();
  const report = autoplay(state, 15 * 60);
  assert.equal(report.end.prestige, 0);
  assert.ok(Number.isFinite(report.end.cash));
  assert.ok(Number.isFinite(report.end.lifetime));
  assert.ok(report.end.lifetime < 250000, 'lifetime ' + report.end.lifetime);
  assert.ok(report.end.lifetime > 2500, 'lifetime ' + report.end.lifetime);
  assert.ok(report.firstBuyAt < 15);
  assert.ok(report.buyCount >= 8, 'buys ' + report.buyCount);
  assert.ok(report.buys.some((b) => b.t >= 60));
  assert.ok(report.buys.some((b) => b.t >= 300));
  assert.ok(report.buys.some((b) => b.t >= 600), 'no buy after 10 min');
  assert.ok(report.maxGap < 180, 'gap ' + report.maxGap);
  assert.ok(report.end.ownedCount >= 3, 'owned ' + report.end.ownedCount);
  assert.ok(report.end.track >= 1, 'track ' + report.end.track);
  let prev = 0;
  for (const sample of report.samples) {
    assert.ok(sample.lifetime >= prev);
    prev = sample.lifetime;
  }
});

test('a burst of long steps cannot print infinite cash', () => {
  const state = createState();
  for (let i = 0; i < 80; i++) step(state, 2, false);
  assert.ok(state.lifetime < 20000, 'burst lifetime ' + state.lifetime);
  assert.ok(state.lifetime > 50);
  const before = state.cash;
  step(state, 0, false);
  assert.equal(state.cash, before);
});

test('offline earnings are capped at two hours', () => {
  const half = createState();
  const earned = applyOffline(half, 30 * 60);
  const two = applyOffline(createState(), OFFLINE_CAP);
  const five = applyOffline(createState(), 5 * 60 * 60);
  assert.ok(earned > 0);
  assert.equal(five, two);
  assert.ok(earned < two);
  assert.ok(Math.abs(earned * 4 - two) / two < 0.08);
  assert.ok(earned < incomeOf(createState()) * 30 * 60);
});

test('save data round-trips', () => {
  const state = createState();
  autoplay(state, 90);
  const copy = hydrate(serialize(state));
  assert.equal(copy.cash, state.cash);
  assert.equal(copy.wagons, state.wagons);
  assert.equal(copy.producers.coop.owned, state.producers.coop.owned);
  assert.equal(copy.lifetime, state.lifetime);
  assert.equal(buy(copy, 'p:coop').ok, false);
  assert.equal(copy.placed.length, state.placed.length);
});

test('old saves migrate and chains stay behind a warehouse cap', () => {
  const migrated = hydrate({ v: 1, cash: 800, wagons: 2, lifetime: 800, totalEarned: 800 });
  assert.equal(migrated.cash, 800);
  assert.equal(migrated.wagons, 2);
  assert.equal(migrated.level, 1);
  assert.equal(preview(migrated, 'mill', 240, 180).reason, 'level');
  migrated.level = 3;
  migrated.xp = 300;
  migrated.cash = 5000;
  let built = null;
  for (let x = 80; x < 1400 && !built; x += 48) {
    for (let y = 80; y < 700 && !built; y += 48) {
      if (preview(migrated, 'mill', x, y).ok && preview(migrated, 'bakery', x + 80, y).ok) {
        assert.equal(place(migrated, 'mill', x, y, 0).ok, true);
        assert.equal(place(migrated, 'bakery', x + 80, y, 1).ok, true);
        built = true;
      }
    }
  }
  assert.ok(built);
  migrated.warehouse.wheat = 6;
  const earned = migrated.totalEarned;
  for (let i = 0; i < 4; i++) step(migrated, 2, false);
  assert.ok((migrated.warehouse.flour || 0) > 0 || migrated.warehouse.wheat < 6 || migrated.totalEarned > earned);
  const slot = railSlots(0)[0];
  const rail = place(migrated, 'rail', slot.gx * 48 + 24, slot.gy * 48 + 24, 0);
  assert.equal(rail.ok, true);
  const again = hydrate(serialize(migrated));
  assert.equal(again.placed.length, migrated.placed.length);
  assert.equal(again.warehouse.flour || 0, migrated.warehouse.flour || 0);
});
