/**
 * Ten hand-built floors. The path climbs in +X so each floor sits beside
 * the tower column instead of directly on top of the one below it.
 * Floor 1–3 stay slow: short gaps, long crumble timers, one obvious moving platform.
 */

let autoId = 0;

function makeBuilder() {
  const ents = [];
  let cursor = null;
  let seq = 0;
  const D = 5.6;

  function add(partial) {
    const ent = {
      h: 1,
      d: D,
      cz: 0,
      ...partial,
      id: partial.id || `e${autoId++}`,
    };
    if (ent.kind === 'solid') ent.seq = seq++;
    ents.push(ent);
    if (ent.kind === 'solid') cursor = ent;
    return ent;
  }

  function solid(w, gap, extra = {}) {
    const top = extra.top != null ? extra.top : (cursor ? cursor.top + (extra.dy || 0) : 2);
    const cx = !cursor ? 0 : cursor.cx + cursor.w / 2 + gap + w / 2;
    return add({
      kind: 'solid',
      w,
      cx,
      top,
      d: extra.d || D,
      cz: extra.cz || 0,
      h: extra.h || 1,
      floor: extra.floor,
      spawnFloor: extra.spawnFloor || 0,
      finish: !!extra.finish,
      move: extra.move || null,
      crumble: extra.crumble || null,
      color: extra.color || 'cyan',
      id: extra.id,
    });
  }

  function stairs(count, rise, run) {
    for (let i = 0; i < count; i++) {
      solid(run + 0.4, i === 0 ? 0.02 : -0.32, { dy: rise, color: 'stone', floor: cursor && cursor.floor });
    }
  }

  function laser(ox, pulse, id) {
    add({
      kind: 'hazard',
      hazard: 'laser',
      id,
      cx: cursor.cx + ox,
      cz: cursor.cz,
      top: cursor.top,
      w: 0.46,
      h: 2.2,
      d: cursor.d - 0.5,
      pulse,
      floor: cursor.floor,
    });
  }

  function spinner(ox, opts) {
    add({
      kind: 'hazard',
      hazard: 'spinner',
      id: opts.id,
      cx: cursor.cx + ox,
      cz: cursor.cz,
      pivot: cursor.top + (opts.lift ?? 0.18),
      radius: opts.radius ?? 1.4,
      thick: opts.thick ?? 0.28,
      depth: cursor.d - 0.3,
      spin: { period: opts.period ?? 3.5, phase: opts.phase || 0 },
      floor: cursor.floor,
    });
  }

  return { ents, solid, stairs, laser, spinner, get cursor() { return cursor; } };
}

export function buildLevel() {
  autoId = 0;
  const b = makeBuilder();
  const { solid, stairs, laser, spinner } = b;

  // Floor 1 — wide blocks, tiny gaps, one low step. An average player walks this.
  solid(8, 0, { id: 'start', spawnFloor: 1, floor: 1, color: 'cyan', top: 2 });
  solid(4.8, 1.55, { floor: 1, color: 'cyan' });
  solid(4.8, 1.7, { floor: 1, color: 'cyan', spawnFloor: 1, id: 'f1-mid' });
  solid(5, 1.85, { floor: 1, color: 'magenta' });
  solid(4.6, 1.7, { floor: 1, color: 'cyan', dy: 0.55 });
  solid(5.2, 1.6, { floor: 1, color: 'cyan' });
  stairs(5, 0.92, 2.55);
  solid(6.2, 0.15, { floor: 2, color: 'checkpoint', spawnFloor: 2, id: 'f2-start' });

  // Floor 2 — slightly longer hops, still static.
  solid(4.6, 2.05, { floor: 2, color: 'cyan' });
  solid(4.4, 2.25, { floor: 2, color: 'magenta', dy: 0.6 });
  solid(4.6, 2.1, { floor: 2, color: 'cyan' });
  solid(4.6, 2.35, { floor: 2, color: 'cyan', spawnFloor: 2, id: 'f2-mid' });
  solid(4.4, 2.15, { floor: 2, color: 'magenta' });
  solid(5, 2.0, { floor: 2, color: 'cyan' });
  stairs(5, 0.92, 2.55);
  solid(6.2, 0.15, { floor: 3, color: 'checkpoint', spawnFloor: 3, id: 'f3-start' });

  // Floor 3 — slow crumble blocks and one moving platform, with room to hesitate.
  solid(4.8, 1.9, { floor: 3, color: 'cyan' });
  solid(4.4, 1.7, {
    floor: 3,
    color: 'amber',
    crumble: { delay: 1.85, respawn: 2.4 },
    id: 'f3-crumble-a',
  });
  solid(4.4, 1.65, {
    floor: 3,
    color: 'amber',
    crumble: { delay: 1.85, respawn: 2.4 },
    id: 'f3-crumble-b',
  });
  solid(5, 1.7, { floor: 3, color: 'cyan', spawnFloor: 3, id: 'f3-mid' });
  solid(3.6, 0.9, {
    floor: 3,
    color: 'lime',
    d: 5.0,
    id: 'f3-mover',
    move: { axis: 'x', amp: 1.9, period: 3.2, phase: 0.6 },
  });
  solid(5.4, 0.75, { floor: 3, color: 'cyan' });
  stairs(5, 0.92, 2.55);
  solid(6.2, 0.15, { floor: 4, color: 'checkpoint', spawnFloor: 4, id: 'f4-start' });

  // Floor 4 — shorter crumble timers, still a straight line.
  solid(4.2, 2.1, { floor: 4, color: 'cyan' });
  solid(3.8, 1.85, {
    floor: 4,
    color: 'amber',
    crumble: { delay: 1.05, respawn: 2.2 },
    id: 'f4-crumble-a',
  });
  solid(3.8, 1.85, {
    floor: 4,
    color: 'amber',
    crumble: { delay: 1.0, respawn: 2.2 },
    id: 'f4-crumble-b',
  });
  solid(4.4, 2.05, { floor: 4, color: 'magenta', spawnFloor: 4, id: 'f4-mid' });
  solid(3.6, 2.4, { floor: 4, color: 'cyan' });
  solid(3.8, 1.7, {
    floor: 4,
    color: 'amber',
    crumble: { delay: 0.95, respawn: 2.2 },
    id: 'f4-crumble-c',
  });
  solid(5, 1.8, { floor: 4, color: 'cyan' });
  stairs(5, 0.92, 2.5);
  solid(6, 0.12, { floor: 5, color: 'checkpoint', spawnFloor: 5, id: 'f5-start' });

  // Floor 5 — a bar you time, then a sideways platform.
  solid(10.5, 1.8, { floor: 5, color: 'cyan', id: 'f5-spin-pad' });
  spinner(0.4, { id: 'f5-spin', period: 4.8, radius: 1.08, lift: 0.22, thick: 0.2 });
  solid(4.4, 2.15, { floor: 5, color: 'magenta' });
  solid(6.2, -0.85, {
    floor: 5,
    color: 'lime',
    d: 3.5,
    id: 'f5-zmover',
    move: { axis: 'z', amp: 2.3, period: 3.35, phase: 0.9 },
  });
  solid(5.2, -0.85, { floor: 5, color: 'cyan', spawnFloor: 5, id: 'f5-mid' });
  stairs(4, 0.9, 2.5);
  solid(6, 0.12, { floor: 6, color: 'checkpoint', spawnFloor: 6, id: 'f6-start' });

  // Floor 6 — two laser gates with a safe wait on each pad.
  solid(9.5, 1.7, { floor: 6, color: 'cyan', id: 'f6-laser-a-pad' });
  laser(-0.2, { period: 2.5, duty: 0.42, phase: 0 }, 'f6-laser-a');
  solid(9.2, 1.9, { floor: 6, color: 'magenta', id: 'f6-laser-b-pad' });
  laser(0.3, { period: 2.7, duty: 0.4, phase: 0.45 }, 'f6-laser-b');
  solid(4.6, 2.2, { floor: 6, color: 'cyan', spawnFloor: 6, id: 'f6-mid' });
  stairs(4, 0.9, 2.5);
  solid(6, 0.12, { floor: 7, color: 'checkpoint', spawnFloor: 7, id: 'f7-start' });

  // Floor 7 — crumble, gap, laser.
  solid(4, 2.25, { floor: 7, color: 'cyan' });
  solid(3.6, 1.9, {
    floor: 7,
    color: 'amber',
    crumble: { delay: 0.82, respawn: 2 },
    id: 'f7-crumble-a',
  });
  solid(3.6, 2.15, {
    floor: 7,
    color: 'amber',
    crumble: { delay: 0.78, respawn: 2 },
    id: 'f7-crumble-b',
  });
  solid(8.8, 2.3, { floor: 7, color: 'cyan', id: 'f7-laser-pad', spawnFloor: 7 });
  laser(0.6, { period: 2.35, duty: 0.46, phase: 0.2 }, 'f7-laser');
  solid(4.2, 2.4, { floor: 7, color: 'magenta' });
  stairs(4, 0.9, 2.45);
  solid(6, 0.12, { floor: 8, color: 'checkpoint', spawnFloor: 8, id: 'f8-start' });

  // Floor 8 — two moving platforms, then a bar.
  solid(4.4, 2.0, { floor: 8, color: 'cyan' });
  solid(3.5, 0.85, {
    floor: 8,
    color: 'lime',
    d: 4.6,
    id: 'f8-mover-a',
    move: { axis: 'x', amp: 1.85, period: 2.7, phase: 0.4 },
  });
  solid(4.2, 0.7, { floor: 8, color: 'magenta', id: 'f8-island', spawnFloor: 8 });
  solid(3.5, 0.85, {
    floor: 8,
    color: 'lime',
    d: 4.6,
    id: 'f8-mover-b',
    move: { axis: 'x', amp: 1.8, period: 2.95, phase: 1.7 },
  });
  // The bar sits on this pad. It must not be a checkpoint: the old spawn
  // was the pad centre, which is inside the bar at every angle.
  solid(10, 0.65, { floor: 8, color: 'cyan', id: 'f8-spin-pad' });
  spinner(-0.3, { id: 'f8-spin', period: 4.6, radius: 1.08, lift: 0.22, thick: 0.2, phase: 0.25 });
  solid(5.2, 0.4, { floor: 8, color: 'checkpoint', spawnFloor: 8, id: 'f8-safe' });
  stairs(4, 0.9, 2.45);
  solid(6, 0.12, { floor: 9, color: 'checkpoint', spawnFloor: 9, id: 'f9-start' });

  // Floor 9 — laser, crumble, sideways bridge.
  solid(9, 1.85, { floor: 9, color: 'magenta', id: 'f9-laser-pad' });
  laser(-0.4, { period: 2.2, duty: 0.48, phase: 0.1 }, 'f9-laser');
  solid(3.5, 2.0, {
    floor: 9,
    color: 'amber',
    crumble: { delay: 0.72, respawn: 1.8 },
    id: 'f9-crumble',
  });
  solid(6.0, -0.8, {
    floor: 9,
    color: 'lime',
    d: 3.3,
    id: 'f9-zmover',
    move: { axis: 'z', amp: 2.2, period: 3.05, phase: 0.35 },
  });
  solid(5, -0.75, { floor: 9, color: 'cyan', spawnFloor: 9, id: 'f9-mid' });
  stairs(4, 0.88, 2.4);
  solid(6.4, 0.12, { floor: 10, color: 'checkpoint', spawnFloor: 10, id: 'f10-start' });

  // Floor 10 — a short finale, then the crown.
  solid(8.6, 1.9, { floor: 10, color: 'gold', id: 'f10-laser-pad' });
  laser(0.2, { period: 2.15, duty: 0.5, phase: 0.33 }, 'f10-laser');
  solid(3.5, 0.8, {
    floor: 10,
    color: 'lime',
    d: 4.8,
    id: 'f10-mover',
    move: { axis: 'x', amp: 1.8, period: 2.6, phase: 1.2 },
  });
  solid(9.4, 0.6, { floor: 10, color: 'magenta', id: 'f10-spin-pad' });
  spinner(0.5, { id: 'f10-spin', period: 4.7, radius: 1.08, lift: 0.22, thick: 0.2, phase: 0.6 });
  solid(3.5, 1.85, {
    floor: 10,
    color: 'amber',
    crumble: { delay: 0.7, respawn: 1.8 },
    id: 'f10-crumble',
  });
  solid(6.5, 2.05, {
    floor: 10,
    color: 'gold',
    spawnFloor: 10,
    finish: true,
    id: 'finish',
  });

  const ents = b.ents;
  const seenFloor = new Set();
  const gems = [];
  for (const solid of ents) {
    if (!solid.spawnFloor || seenFloor.has(solid.floor)) continue;
    seenFloor.add(solid.floor);
    gems.push(
      { kind: 'gem', id: `gem-f${solid.floor}-a`, floor: solid.floor, x: solid.cx - 0.4, y: solid.top + 0.95, z: 1.7 },
      { kind: 'gem', id: `gem-f${solid.floor}-b`, floor: solid.floor, x: solid.cx + 0.7, y: solid.top + 0.95, z: -1.7 },
    );
  }
  return ents.concat(gems);
}

export const FLOOR_COUNT = 10;

export const FLOOR_NAMES = {
  1: { ckb: 'هەنگاوی یەکەم', en: 'First steps' },
  2: { ckb: 'بازدانی درێژتر', en: 'Longer hops' },
  3: { ckb: 'خشتە جوڵاوەکان', en: 'Moving stone' },
  4: { ckb: 'خشتە ناسکەکان', en: 'Crumbling stone' },
  5: { ckb: 'داری خولاو', en: 'Spinning bars' },
  6: { ckb: 'تیشکی نێۆن', en: 'Neon beams' },
  7: { ckb: 'ڕێڕەوی تێکەڵ', en: 'Mixed lane' },
  8: { ckb: 'دوو پرد', en: 'Two bridges' },
  9: { ckb: 'پێش لووتکە', en: 'Below the crown' },
  10: { ckb: 'لووتکە', en: 'The crown' },
};
