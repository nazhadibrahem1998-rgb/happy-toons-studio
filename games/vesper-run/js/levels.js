export const TILE = 32;

export const THEMES = {
  rail: {
    top: '#07060f',
    horizon: '#221448',
    bottom: '#10141c',
    neon: '#3ef0ff',
    hot: '#ff2d78',
    amber: '#ffb13a',
    fog: '#140e28',
    steel: '#1a1826',
    steelDeep: '#100e18',
  },
  stacks: {
    top: '#0c0616',
    horizon: '#3a1460',
    bottom: '#160e14',
    neon: '#d56bff',
    hot: '#ffb13a',
    amber: '#7af0ff',
    fog: '#241032',
    steel: '#221628',
    steelDeep: '#140c18',
  },
  circuit: {
    top: '#04141a',
    horizon: '#0a3c48',
    bottom: '#071610',
    neon: '#5dffc4',
    hot: '#3ee0ff',
    amber: '#ffe08a',
    fog: '#062830',
    steel: '#102028',
    steelDeep: '#08141a',
  },
  vault: {
    top: '#14060c',
    horizon: '#4a1020',
    bottom: '#14080c',
    neon: '#ff4d6a',
    hot: '#7af0ff',
    amber: '#ffd0a8',
    fog: '#240810',
    steel: '#241018',
    steelDeep: '#14080e',
  },
};

function make(spec) {
  const { id, name, subtitle, par, theme, w, h, paint } = spec;
  const solid = new Uint8Array(w * h);
  const marks = [];
  const api = {
    box(c0, r0, c1, r1) {
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (c < 0 || r < 0 || c >= w || r >= h) continue;
          solid[r * w + c] = 1;
        }
      }
    },
    carve(c0, r0, c1, r1) {
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (c < 0 || r < 0 || c >= w || r >= h) continue;
          solid[r * w + c] = 0;
        }
      }
    },
    mark(kind, c, r, extra) {
      marks.push({ kind, c, r, ...(extra || {}) });
    },
  };
  paint(api);
  return { id, name, subtitle, par, theme, w, h, solid, marks };
}

const L1 = make({
  id: 'lower-rail',
  name: 'Lower Rail',
  subtitle: 'First circuit out of the yard',
  par: 50,
  theme: THEMES.rail,
  w: 74,
  h: 16,
  paint(a) {
    a.box(0, 13, 73, 15);
    a.carve(22, 13, 23, 15);
    a.carve(48, 13, 49, 15);
    a.box(36, 12, 37, 12);
    a.mark('spawn', 2, 12);
    a.mark('shard', 7, 12);
    a.mark('skitter', 12, 12, { left: 10, right: 16, speed: 42 });
    a.mark('checkpoint', 28, 12);
    a.mark('shard', 32, 12);
    a.mark('skitter', 42, 12, { left: 40, right: 45, speed: 36 });
    a.mark('spike', 54, 12);
    a.mark('spike', 55, 12);
    a.mark('crate', 60, 9, { loot: 'shard' });
    a.mark('shard', 66, 12);
    a.mark('beacon', 70, 12);
  },
});

const L2 = make({
  id: 'split-stacks',
  name: 'Split Stacks',
  subtitle: 'The upper freight shelf',
  par: 75,
  theme: THEMES.stacks,
  w: 88,
  h: 18,
  paint(a) {
    a.box(0, 15, 87, 17);
    a.carve(26, 15, 38, 17);
    a.box(22, 14, 44, 14);
    a.carve(33, 14, 34, 14);
    a.carve(62, 15, 64, 17);
    a.box(4, 12, 8, 12);
    a.box(76, 12, 81, 12);
    a.mark('spawn', 2, 14);
    a.mark('shard', 8, 14);
    a.mark('skitter', 13, 14, { left: 11, right: 17, speed: 40 });
    a.mark('gate', 6, 11, { pair: 1 });
    a.mark('lens', 30, 11, { left: 27, right: 32, speed: 46 });
    a.mark('shard', 36, 13);
    a.mark('crate', 40, 11, { loot: 'bulk' });
    a.mark('checkpoint', 43, 13);
    a.mark('gate', 79, 11, { pair: 1 });
    a.mark('spike', 52, 14);
    a.mark('spike', 53, 14);
    a.mark('skitter', 58, 14, { left: 56, right: 60, speed: 42 });
    a.mark('shard', 70, 14);
    a.mark('beacon', 84, 14);
  },
});

const L3 = make({
  id: 'long-circuit',
  name: 'Long Circuit',
  subtitle: 'The sleeper span',
  par: 95,
  theme: THEMES.circuit,
  w: 102,
  h: 16,
  paint(a) {
    a.box(0, 13, 101, 15);
    a.carve(34, 13, 44, 15);
    a.carve(70, 13, 72, 15);
    a.box(20, 12, 21, 12);
    a.box(80, 10, 84, 10);
    a.mark('spawn', 2, 12);
    a.mark('arc', 6, 12);
    a.mark('shard', 10, 12);
    a.mark('skitter', 15, 12, { left: 13, right: 18, speed: 44 });
    a.mark('checkpoint', 26, 12);
    a.mark('shard', 30, 12);
    a.mark('mover', 34, 13, { tiles: 4, travel: 10, speed: 88, overhang: 2 });
    a.mark('lens', 54, 9, { left: 50, right: 58, speed: 42 });
    a.mark('crate', 60, 9, { loot: 'shard' });
    a.mark('skitter', 64, 12, { left: 62, right: 67, speed: 40 });
    a.mark('checkpoint', 68, 12);
    a.mark('spike', 76, 12);
    a.mark('spike', 77, 12);
    a.mark('shard', 82, 9);
    a.mark('shard', 88, 12);
    a.mark('skitter', 93, 12, { left: 91, right: 96, speed: 38 });
    a.mark('beacon', 98, 12);
  },
});

const L4 = make({
  id: 'warden-vault',
  name: 'Warden Vault',
  subtitle: 'The seal at the end of the line',
  par: 80,
  theme: THEMES.vault,
  w: 36,
  h: 14,
  paint(a) {
    a.box(0, 11, 35, 13);
    a.box(0, 0, 0, 11);
    a.box(35, 0, 35, 11);
    a.box(0, 0, 35, 0);
    a.mark('spawn', 3, 10);
    a.mark('arc', 6, 10);
    a.mark('shard', 8, 10);
    a.mark('shard', 28, 10);
    a.mark('warden', 16, 10, { left: 10, right: 24, speed: 62 });
    a.mark('beacon', 31, 10);
  },
});

export const LEVELS = [L1, L2, L3, L4];
