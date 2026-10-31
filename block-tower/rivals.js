/** Offline rival racers. Original names, no network, no accounts. */
import { plan } from './bot.js';

const ROSTER = [
  { id: 'nari', en: 'Nari', ckb: 'ناری', color: 0xff3ec8, lane: -0.55 },
  { id: 'peko', en: 'Peko', ckb: 'پێکۆ', color: 0xc6ff4a, lane: 0.55 },
  { id: 'vilo', en: 'Vilo', ckb: 'ڤایلۆ', color: 0x7aa2ff, lane: 0 },
];

const MODES = {
  off: { count: 0, speed: 1, mistake: 0 },
  easy: { count: 2, speed: 0.9, mistake: 0.1 },
  medium: { count: 3, speed: 0.94, mistake: 0.035 },
  hard: { count: 3, speed: 0.98, mistake: 0.008 },
};

export function rivalModeName(value) {
  return MODES[value] ? value : 'easy';
}

export function createRivals(mode, world) {
  const spec = MODES[rivalModeName(mode)];
  const start = world.spawn;
  const list = [];
  for (let i = 0; i < spec.count; i++) {
    const who = ROSTER[i];
    list.push({
      id: who.id,
      en: who.en,
      ckb: who.ckb,
      color: who.color,
      lane: who.lane,
      speed: spec.speed * (1 - i * 0.015),
      mistake: spec.mistake,
      mistakeLeft: 0,
      cool: 0.8 + i * 0.25,
      blunders: 0,
      seed: 2.1 + i * 1.3,
      x: start.x - 0.85 - i * 0.7,
      y: start.y,
      z: start.z + who.lane,
      vx: 0,
      vy: 0,
      vz: 0,
      onGround: true,
      groundId: world.spawnId,
      spawnId: world.spawnId,
      spawn: { x: start.x, y: start.y, z: start.z, floor: start.floor },
      floor: start.floor,
      highest: start.floor,
      won: false,
      finishTime: 0,
      deaths: 0,
      coyote: 0.14,
      jumpBuffer: 0,
      jumpHeld: false,
      invuln: 0.35 + i * 0.12,
      _jump: false,
      _input: { forward: 0, strafe: 0, jump: false, yaw: 0, speedScale: spec.speed },
    });
  }
  list.mode = rivalModeName(mode);
  return list;
}

function applyStyle(rival, input, dt) {
  const styled = {
    forward: input.forward,
    strafe: input.strafe,
    jump: input.jump,
    yaw: input.yaw,
    speedScale: rival.speed || 1,
  };
  if (rival.mistakeLeft > 0) {
    rival.mistakeLeft = Math.max(0, rival.mistakeLeft - dt);
    if (!styled.jump) styled.forward = 0;
    styled.jump = false;
    return styled;
  }
  rival.cool -= dt;
  if (rival.mistake > 0 && rival.cool <= 0) {
    const roll = Math.abs(Math.sin(rival.seed + rival.x * 0.13 + rival.blunders));
    rival.cool = 1.1;
    if (roll < rival.mistake) {
      rival.mistakeLeft = 0.42;
      rival.blunders += 1;
      if (!styled.jump) styled.forward = 0;
      styled.jump = false;
    }
  }
  if (Math.abs(styled.strafe) < 0.08 && styled.forward > 0) {
    const pull = (rival.lane - rival.z) / 1.4;
    styled.strafe = Math.max(-0.45, Math.min(0.45, pull));
  }
  return styled;
}

export function decideRivals(state, dt) {
  const rivals = state.rivals;
  if (!rivals || !rivals.length) return;
  for (let i = 0; i < rivals.length; i++) {
    const rival = rivals[i];
    if (rival.won) continue;
    const saved = state.player;
    state.player = rival;
    let input;
    try {
      input = plan(state);
    } finally {
      state.player = saved;
    }
    const styled = applyStyle(rival, input, dt);
    rival._input = styled;
    rival._jump = styled.jump;
    rival.yaw = styled.yaw;
  }
}

const EN_PLACE = ['1st', '2nd', '3rd', '4th'];
const CKB_PLACE = ['یەکەم', 'دووەم', 'سێیەم', 'چوارەم'];

export function placeWord(lang, index) {
  const list = lang === 'ckb' ? CKB_PLACE : EN_PLACE;
  return list[index] || String(index + 1);
}

export function raceRows(state) {
  const rows = [{
    id: 'you',
    en: 'You',
    ckb: 'تۆ',
    color: 0x3ef0ff,
    finished: !!state.won,
    time: state.won ? state.playTime : null,
    x: state.player.x,
  }];
  const rivals = state.rivals || [];
  for (let i = 0; i < rivals.length; i++) {
    const rival = rivals[i];
    rows.push({
      id: rival.id,
      en: rival.en,
      ckb: rival.ckb,
      color: rival.color,
      finished: !!rival.won,
      time: rival.won ? rival.finishTime : null,
      x: rival.x,
    });
  }
  rows.sort((a, b) => {
    if (a.finished && b.finished) return a.time - b.time;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.x - a.x;
  });
  return rows;
}
