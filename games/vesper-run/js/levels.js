export const TILE = 32;

export const THEMES = {
  rail: {
    top: '#2a1d68',
    horizon: '#5a32a8',
    bottom: '#3a2068',
    neon: '#5dfff0',
    hot: '#ff4d9a',
    amber: '#ffc14d',
    fog: '#6a48c8',
    steel: '#3a4578',
    steelDeep: '#2a3058',
    brick: '#7a3a62',
    moss: '#2f8a78',
    moon: '#ffe6bf',
    sign: '#ff4d9a',
  },
  stacks: {
    top: '#3a1868',
    horizon: '#6a2890',
    bottom: '#4a1848',
    neon: '#e070ff',
    hot: '#ffc14d',
    amber: '#7dfff0',
    fog: '#7a40b0',
    steel: '#4a3068',
    steelDeep: '#321848',
    brick: '#8a4060',
    moss: '#3a9a70',
    moon: '#ffd8ea',
    sign: '#ffc14d',
  },
  circuit: {
    top: '#0e3a48',
    horizon: '#146878',
    bottom: '#0c4038',
    neon: '#7dffe0',
    hot: '#5ad8ff',
    amber: '#ffe08a',
    fog: '#1a7880',
    steel: '#1a4860',
    steelDeep: '#123040',
    brick: '#3a6878',
    moss: '#3aaa78',
    moon: '#d8fff4',
    sign: '#7dffe0',
  },
  vault: {
    top: '#4a1830',
    horizon: '#7a2040',
    bottom: '#3a1428',
    neon: '#ff6a88',
    hot: '#7dfff0',
    amber: '#ffd0a8',
    fog: '#a04060',
    steel: '#5a2840',
    steelDeep: '#3a1828',
    brick: '#8a3050',
    moss: '#c06078',
    moon: '#ffd0c0',
    sign: '#ff6a88',
  },
};

function make(spec) {
  const { id, name, subtitle, par, theme, w, h, paint } = spec;
  const solid = new Uint8Array(w * h);
  const marks = [];
  const api = {
    box(c0, r0, c1, r1, kind = 1) {
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (c < 0 || r < 0 || c >= w || r >= h) continue;
          solid[r * w + c] = kind;
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
    a.box(0, 13, 73, 15, 1);
    a.box(0, 13, 73, 13, 3);
    a.carve(18, 13, 19, 15);
    a.carve(48, 13, 49, 15);
    a.box(24, 13, 35, 13, 2);
    a.box(36, 12, 37, 12, 2);
    a.box(0, 6, 0, 12, 1);
    a.box(1, 9, 1, 12, 1);
    a.box(0, 6, 2, 6, 2);
    a.box(4, 8, 9, 8, 2);
    a.box(12, 7, 16, 7, 2);
    a.box(21, 8, 26, 8, 1);
    a.box(38, 8, 43, 8, 2);
    a.mark('spawn', 2, 12);
    a.mark('shard', 5, 12);
    a.mark('shard', 4, 6);
    a.mark('shard', 5, 5);
    a.mark('shard', 6, 5);
    a.mark('shard', 7, 6);
    a.mark('shard', 8, 7);
    a.mark('shard', 9, 7);
    a.mark('crate', 6, 7, { loot: 'shard' });
    a.mark('skitter', 12, 12, { left: 10, right: 16, speed: 42 });
    a.mark('lens', 14, 5, { left: 12, right: 16, speed: 34 });
    a.mark('checkpoint', 28, 12);
    a.mark('shard', 30, 10);
    a.mark('shard', 31, 9);
    a.mark('shard', 32, 9);
    a.mark('shard', 33, 10);
    a.mark('shard', 32, 12);
    a.mark('skitter', 42, 12, { left: 40, right: 45, speed: 36 });
    a.mark('crate', 40, 7, { loot: 'shard' });
    a.mark('spike', 54, 12);
    a.mark('spike', 55, 12);
    a.mark('shard', 58, 10);
    a.mark('shard', 60, 9);
    a.mark('shard', 62, 10);
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
    a.box(0, 15, 87, 17, 1);
    a.box(0, 15, 87, 15, 3);
    a.carve(26, 15, 38, 17);
    a.box(22, 14, 44, 14, 2);
    a.carve(33, 14, 34, 14);
    a.carve(62, 15, 64, 17);
    a.box(0, 9, 0, 14, 1);
    a.box(3, 10, 8, 10, 2);
    a.box(4, 12, 8, 12, 1);
    a.box(76, 12, 81, 12, 1);
    a.mark('crate', 5, 9, { loot: 'shard' });
    a.mark('shard', 3, 8);
    a.mark('shard', 4, 7);
    a.mark('shard', 6, 7);
    a.mark('shard', 7, 8);
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
    a.box(0, 13, 101, 15, 1);
    a.box(0, 13, 101, 13, 3);
    a.carve(34, 13, 44, 15);
    a.carve(70, 13, 72, 15);
    a.box(20, 12, 21, 12, 2);
    a.box(80, 10, 84, 10, 2);
    a.box(0, 7, 0, 12, 1);
    a.box(3, 8, 8, 8, 2);
    a.mark('crate', 5, 7, { loot: 'shard' });
    a.mark('shard', 3, 6);
    a.mark('shard', 4, 5);
    a.mark('shard', 6, 5);
    a.mark('shard', 7, 6);
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
    a.box(0, 11, 35, 13, 1);
    a.box(0, 11, 35, 11, 3);
    a.box(0, 0, 0, 11, 1);
    a.box(35, 0, 35, 11, 1);
    a.box(0, 0, 35, 0, 2);
    a.box(6, 7, 10, 7, 2);
    a.box(24, 7, 29, 7, 2);
    a.mark('shard', 8, 6);
    a.mark('shard', 26, 6);
    a.mark('spawn', 3, 10);
    a.mark('arc', 6, 10);
    a.mark('shard', 8, 10);
    a.mark('shard', 28, 10);
    a.mark('warden', 16, 10, { left: 10, right: 24, speed: 62 });
    a.mark('beacon', 31, 10);
  },
});

export const LEVELS = [L1, L2, L3, L4];
