/** Optional upgrades bought with gems found on the tower. Base movement does not require any of them. */

const KEY = 'bt-progress';

export const UPGRADES = [
  { id: 'jump', max: 2, cost: 4, en: 'Higher jump', ckb: 'بازدانی بەرزتر', enDetail: 'Each rank jumps a little higher.', ckbDetail: 'هەر پلەیەک کەمێک بەرزتر باز دەدات.' },
  { id: 'run', max: 2, cost: 4, en: 'Faster run', ckb: 'ڕاکردنی خێراتر', enDetail: 'Each rank runs a little faster.', ckbDetail: 'هەر پلەیەک کەمێک خێراتر دەڕوات.' },
  { id: 'doubleJump', max: 1, cost: 8, en: 'Double jump', ckb: 'دوو بازدان', enDetail: 'Jump again in the air. Affordable around the middle floors.', ckbDetail: 'جارێکی تر لە هەوادا باز بدە. لە نهۆمە ناوەندەکاندا دەتوانرێت.' },
  { id: 'dash', max: 2, cost: 6, en: 'Dash', ckb: 'داش', enDetail: 'A short burst. The second rank lasts longer. Shift, or the dash button.', ckbDetail: 'هێزێکی کورت. پلەی دووەم درێژترە. Shift یان دوگمەی داش.' },
  { id: 'shield', max: 1, cost: 6, en: 'Shield', ckb: 'قەڵغان', enDetail: 'Saves you from one hazard, then refills at a checkpoint.', ckbDetail: 'لە یەک مەترسی دەتپارێزێت، پاشان لە خاڵی پاشەکەوتدا دەگەڕێتەوە.' },
  { id: 'glide', max: 1, cost: 8, en: 'Glide', ckb: 'خلیسکان', enDetail: 'Hold jump while falling to fall slower.', ckbDetail: 'لە کاتی کەوتندا بازدان بگرە بۆ ئەوەی هێواشتر بکەویت.' },
];

export function defaultProgress() {
  return { gems: 0, found: [], jump: 0, run: 0, doubleJump: 0, dash: 0, shield: 0, glide: 0 };
}

export function loadProgress() {
  const base = defaultProgress();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (!saved || typeof saved !== 'object') return base;
    base.gems = Math.max(0, Number(saved.gems) || 0);
    base.found = Array.isArray(saved.found) ? saved.found.filter((id) => typeof id === 'string').slice(0, 80) : [];
    for (const item of UPGRADES) {
      const rank = Math.max(0, Math.min(item.max, Number(saved[item.id]) || 0));
      base[item.id] = rank;
    }
  } catch { /* keep defaults */ }
  return base;
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify({
    gems: progress.gems,
    found: progress.found,
    jump: progress.jump,
    run: progress.run,
    doubleJump: progress.doubleJump,
    dash: progress.dash,
    shield: progress.shield,
    glide: progress.glide,
  }));
}

export function applyProgress(world, progress) {
  world.jumpRank = progress.jump || 0;
  world.runRank = progress.run || 0;
  world.doubleJump = (progress.doubleJump || 0) > 0;
  world.hasDash = (progress.dash || 0) > 0;
  world.dashRank = progress.dash || 0;
  world.shieldOwned = (progress.shield || 0) > 0;
  world.hasGlide = (progress.glide || 0) > 0;
  if (world.shieldOwned && world.shieldReady == null) world.shieldReady = true;
  if (!world.shieldOwned) world.shieldReady = false;
}

export function buyUpgrade(progress, id) {
  const spec = UPGRADES.find((item) => item.id === id);
  if (!spec) return false;
  const rank = progress[id] || 0;
  if (rank >= spec.max) return false;
  const cost = spec.cost + (id === 'dash' && rank > 0 ? -2 : 0);
  if (progress.gems < cost) return false;
  progress.gems -= cost;
  progress[id] = rank + 1;
  saveProgress(progress);
  return true;
}

export function upgradeCost(progress, id) {
  const spec = UPGRADES.find((item) => item.id === id);
  if (!spec) return 0;
  const rank = progress[id] || 0;
  if (id === 'dash' && rank > 0) return spec.cost - 2;
  return spec.cost;
}
