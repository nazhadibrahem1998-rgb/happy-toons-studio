import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, PHYS } from '../js/sim.js';
import { decide } from './policy.js';

function memory() {
  const m = new Map();
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => m.set(k, String(v)),
  };
}

function boot() {
  const storage = memory();
  const game = createGame({ storage });
  return { game, storage };
}

const VIEW = { w: 900, h: 432 };

test('run accelerates and friction slows you', () => {
  const { game } = boot();
  game.startRun();
  const input = { left: false, right: true, run: true, jumpHeld: false, jumpPressed: false, runPressed: false };
  for (let i = 0; i < 5; i++) game.step(1 / 60, input, VIEW);
  const mid = game.snapshot().player.vx;
  assert.ok(mid > 40 && mid < PHYS.RUN_MAX, `early vx ${mid}`);
  for (let i = 0; i < 12; i++) game.step(1 / 60, input, VIEW);
  const fast = game.snapshot().player.vx;
  assert.ok(fast > PHYS.RUN_MAX - 30, `run vx ${fast}`);
  const stop = { left: false, right: false, run: false, jumpHeld: false, jumpPressed: false, runPressed: false };
  const before = game.snapshot().player.vx;
  for (let i = 0; i < 6; i++) game.step(1 / 60, stop, VIEW);
  assert.ok(game.snapshot().player.vx < before - 20, 'friction should bleed speed');
});

test('a short hop peaks lower than a full jump', () => {
  function peak(holdFrames) {
    const { game } = boot();
    game.startRun();
    let minY = Infinity;
    for (let i = 0; i < 70; i++) {
      const held = i < holdFrames;
      game.step(1 / 60, {
        left: false, right: false, run: false,
        jumpHeld: held, jumpPressed: i === 0, runPressed: false,
      }, VIEW);
      minY = Math.min(minY, game.snapshot().player.y);
    }
    return minY;
  }
  const full = peak(40);
  const short = peak(2);
  assert.ok(short - full > 25, `short ${short} full ${full}`);
});

test('coyote time still allows a jump just after leaving the ground', () => {
  const { game } = boot();
  game.startRun();
  game.player.invuln = 40;
  const run = { left: false, right: true, run: true, jumpHeld: false, jumpPressed: false, runPressed: false };
  let leftGround = -1;
  for (let i = 0; i < 400; i++) {
    game.step(1 / 60, run, VIEW);
    if (!game.snapshot().player.grounded) { leftGround = i; break; }
  }
  assert.ok(leftGround > 0, 'expected a ledge');
  game.step(1 / 60, { ...run, jumpPressed: true, jumpHeld: true }, VIEW);
  assert.ok(game.snapshot().player.vy < -200, `coyote vy ${game.snapshot().player.vy}`);
  assert.equal(game.snapshot().deaths, 0);
  assert.ok(leftGround > 0);
  assert.ok(PHYS.COYOTE >= 0.1 && PHYS.COYOTE < 0.12);
  assert.ok(PHYS.BUFFER >= 0.12 && PHYS.BUFFER < 0.14);
});

test('jump buffer fires when you land', () => {
  const { game } = boot();
  game.startRun();
  const floor = game.snapshot().player.y + game.snapshot().player.h;
  game.step(1 / 60, { left: false, right: false, run: false, jumpHeld: true, jumpPressed: true, runPressed: false }, VIEW);
  for (let i = 0; i < 8; i++) {
    game.step(1 / 60, { left: false, right: false, run: false, jumpHeld: true, jumpPressed: false, runPressed: false }, VIEW);
  }
  let pressed = false;
  let hopped = false;
  let hold = 0;
  for (let i = 0; i < 90; i++) {
    const p = game.snapshot().player;
    const dist = floor - (p.y + p.h);
    const t = p.vy > 40 ? dist / p.vy : 99;
    const press = !pressed && p.vy > 0 && t < 0.11 && t > 0.02;
    if (press) hold = 6;
    game.step(1 / 60, {
      left: false, right: false, run: false,
      jumpHeld: press || hold > 0, jumpPressed: press, runPressed: false,
    }, VIEW);
    if (press) pressed = true;
    if (hold > 0) hold -= 1;
    if (pressed && game.snapshot().player.vy < -250) hopped = true;
  }
  assert.ok(pressed, 'never armed the buffer');
  assert.ok(hopped, 'buffered jump did not fire');
});

test('walking into a skitter respawns at the start', () => {
  const { game } = boot();
  game.startRun();
  const x0 = game.snapshot().player.x;
  const walk = { left: false, right: true, run: false, jumpHeld: false, jumpPressed: false, runPressed: false };
  let died = false;
  for (let i = 0; i < 360; i++) {
    game.step(1 / 60, walk, VIEW);
    const s = game.snapshot();
    if (s.deaths >= 1) {
      died = true;
      assert.ok(s.player.x < x0 + 80, `respawn x ${s.player.x}`);
      assert.equal(s.lives, 5);
      assert.equal(s.phase, 'play');
      break;
    }
  }
  assert.ok(died, 'skitter should have connected');
});

test('a timed hop stomps the first skitter', () => {
  const { game } = boot();
  game.startRun();
  const run = { left: false, right: true, run: true, jumpHeld: false, jumpPressed: false, runPressed: false };
  let stomped = false;
  let jumping = 0;
  for (let i = 0; i < 400 && !stomped; i++) {
    const snap = game.snapshot();
    const enemy = snap.enemies.find((e) => e.alive);
    const dx = enemy ? enemy.x - (snap.player.x + snap.player.w) : 999;
    let inp = { ...run };
    if (jumping > 0) {
      jumping -= 1;
      inp.jumpHeld = true;
    } else if (dx > 30 && dx < 58 && snap.player.grounded && snap.player.invuln <= 0) {
      inp.jumpPressed = true;
      inp.jumpHeld = true;
      jumping = 3;
    }
    game.step(1 / 60, inp, VIEW);
    if (game.snapshot().enemies.some((e) => !e.alive) && game.snapshot().deaths === 0) stomped = true;
  }
  assert.ok(stomped, JSON.stringify(game.snapshot().enemies));
  assert.ok(game.snapshot().score >= 250);
});

test('policy clears the hand-built circuits', () => {
  for (const index of [0, 1, 2]) {
    const { game, storage } = boot();
    game.startRun();
    if (index !== 0) {
      game.load(index);
      game.phase = 'play';
    }
    game.lives = 12;
    const hold = { t: 0 };
    let phase = 'play';
    let stuck = 0;
    let lastX = 0;
    const trace = [];
    for (let i = 0; i < 60 * 90 && phase === 'play'; i++) {
      const sensors = game.sensors();
      const inp = decide(sensors, hold, game.snapshot().player);
      game.step(1 / 60, inp, VIEW);
      phase = game.snapshot().phase;
      const x = game.snapshot().player.x;
      if (i % 30 === 0) trace.push(Math.round(x));
      if (Math.abs(x - lastX) < 0.5 && !sensors.waitForMover) stuck += 1;
      else stuck = 0;
      lastX = x;
      if (stuck > 200) {
        assert.fail(`L${index + 1} stuck at ${x.toFixed(0)} deaths ${game.snapshot().deaths} sensors ${JSON.stringify(sensors)} trace ${trace.slice(-12).join(',')}`);
      }
    }
    const snap = game.snapshot();
    assert.equal(snap.phase, 'clear', `L${index + 1} ended ${snap.phase} deaths ${snap.deaths} x ${snap.player.x.toFixed(0)} trace ${trace.slice(-15).join(',')}`);
    assert.ok(snap.score > 0, 'score should rise');
    assert.ok(Number(storage.get('vesper-run-best')) > 0, 'best score stored');
    assert.ok(snap.deaths < 8, `too many deaths on L${index + 1}: ${snap.deaths}`);
  }
});

test('mover ledges actually meet the rail', () => {
  const { game } = boot();
  game.load(2);
  const movers = game.movers;
  assert.ok(movers.length === 1);
  const m = movers[0];
  const probe = (x) => {
    const col = Math.floor(x / 32);
    const row = Math.floor((m.y + 4) / 32);
    return game.level.solid[row * game.level.w + col] > 0;
  };
  assert.ok(probe(m.minX + 8), `left ledge ${m.minX}`);
  assert.ok(probe(m.maxX + m.w - 8), `right ledge ${m.maxX + m.w}`);
});
