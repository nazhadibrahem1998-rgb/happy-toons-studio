import { TILE } from './levels.js';

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function sky(ctx, w, h, cam, theme, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme.top);
  g.addColorStop(0.42, theme.horizon);
  g.addColorStop(1, theme.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const moonX = w * 0.78;
  const moonY = h * 0.2;
  const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 90);
  halo.addColorStop(0, 'rgba(255,236,200,0.55)');
  halo.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.moon || '#ffe6bf';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,120,80,0.35)';
  ctx.beginPath();
  ctx.arc(moonX - 12, moonY - 8, 8, 0, Math.PI * 2);
  ctx.arc(moonX + 14, moonY + 10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  for (let i = 0; i < 56; i++) {
    const x = (hash(i + 3) * w * 1.4 + time * (6 + (i % 4))) % w;
    const y = hash(i + 19) * h * 0.48;
    ctx.globalAlpha = 0.35 + hash(i + 8) * 0.65;
    ctx.fillRect(x, y, i % 7 === 0 ? 2.5 : 1.4, i % 7 === 0 ? 2.5 : 1.4);
  }
  ctx.globalAlpha = 1;

  signs(ctx, w, h, cam.x * 0.22, theme, time);
  bands(ctx, w, h, cam.x * 0.15, 0.58, theme.fog, theme.neon, 0.45);
  bands(ctx, w, h, cam.x * 0.32, 0.72, theme.steel, theme.hot, 0.72);
  bands(ctx, w, h, cam.x * 0.52, 0.86, theme.steelDeep, theme.amber, 0.9);

  ctx.strokeStyle = 'rgba(210,230,255,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 28; i++) {
    const x = (hash(i + 40) * w + time * 18) % w;
    const y = (hash(i + 70) * h + time * (90 + (i % 5) * 20)) % h;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 22; i++) {
    const x = (hash(i + 90) * w + time * (22 + i % 6)) % w;
    const y = (hash(i + 12) * h + time * 40) % h;
    ctx.fillStyle = i % 2 ? theme.amber : theme.hot;
    ctx.globalAlpha = 0.45 + (i % 3) * 0.15;
    ctx.fillRect(x, y, 2.5, 2.5);
  }
  ctx.globalAlpha = 1;

  const fog = ctx.createLinearGradient(0, h * 0.62, 0, h);
  fog.addColorStop(0, 'rgba(90,60,160,0)');
  fog.addColorStop(1, 'rgba(40,20,80,0.28)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

function signs(ctx, w, h, scroll, theme, time) {
  const labels = ['LUMEN', 'NIGHT RAIL', 'OPEN LATE', 'VESPER'];
  const span = 280;
  const start = Math.floor(scroll / span) - 1;
  const count = Math.ceil(w / span) + 3;
  ctx.save();
  ctx.font = '700 16px "Avenir Next", "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const n = start + i;
    const x = n * span - scroll;
    const y = h * (0.16 + hash(n) * 0.22);
    const label = labels[Math.abs(n) % labels.length];
    const pulse = 0.65 + Math.sin(time * 3 + n) * 0.35;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(12,8,28,0.72)';
    const tw = ctx.measureText(label).width + 22;
    ctx.fillRect(x, y, tw, 26);
    ctx.strokeStyle = n % 2 ? theme.hot : theme.neon;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, tw, 26);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = n % 2 ? theme.hot : theme.neon;
    ctx.fillText(label, x + 11, y + 14);
  }
  ctx.restore();
}

function bands(ctx, w, h, scroll, baseline, fill, win, alpha) {
  const span = 150;
  const start = Math.floor(scroll / span) - 1;
  const count = Math.ceil(w / span) + 3;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const n = start + i;
    const x = n * span - scroll;
    const lift = hash(n * 2.1);
    const bw = 54 + lift * 70;
    const bh = 70 + hash(n * 4.4) * h * 0.32;
    const by = h * baseline - bh;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fillRect(x, by, bw, bh + 30);
    ctx.fillStyle = win;
    const rows = 4 + Math.floor(hash(n) * 4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        if (hash(n + r * 9 + c) < 0.4) continue;
        ctx.globalAlpha = alpha * (0.45 + hash(n + r + c) * 0.55);
        ctx.fillRect(x + 8 + c * (bw / 3.5), by + 12 + r * 14, 8, 4);
      }
    }
    ctx.globalAlpha = alpha;
    if (lift > 0.62) {
      ctx.fillStyle = fill;
      ctx.fillRect(x + bw * 0.5, by - 22, 3, 22);
      ctx.fillStyle = win;
      ctx.fillRect(x + bw * 0.5 - 2, by - 26, 7, 4);
    }
  }
  ctx.restore();
}

export function render(ctx, game, cssW, cssH, dpr) {
  const theme = (game.level && game.level.theme) || {
    top: '#2a1d68', horizon: '#5a32a8', bottom: '#3a2068', neon: '#5dfff0', hot: '#ff4d9a',
    amber: '#ffc14d', fog: '#6a48c8', steel: '#3a4578', steelDeep: '#2a3058', brick: '#7a3a62',
    moss: '#2f8a78', moon: '#ffe6bf', sign: '#ff4d9a',
  };
  const cam = game.cam;
  cam.clock = game.clock;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sky(ctx, cssW, cssH, cam, theme, game.clock);
  if (!game.level || !game.player) {
    overlay(ctx, game, cssW, cssH, theme);
    return;
  }
  const scale = (cssH / game.viewH) * dpr;
  const mag = game.shake || 0;
  const sx = Math.sin(game.clock * 53) * mag;
  const sy = Math.cos(game.clock * 47) * mag * 0.6;
  ctx.setTransform(scale, 0, 0, scale, (-cam.x + sx) * scale, (-cam.y + sy) * scale);
  drawTiles(ctx, game, theme);
  for (const m of game.movers) drawMover(ctx, m, theme, game.clock);
  for (const s of game.spikes) drawSpike(ctx, s, theme);
  for (const g of game.gates) drawGate(ctx, g, theme, game.clock);
  for (const k of game.checks) drawPylon(ctx, k, theme, game.clock);
  if (game.beacon) drawBeacon(ctx, game.beacon, theme, game.clock);
  for (const c of game.crates) if (c.alive || c.bump > 0) drawCrate(ctx, c, theme, game.clock);
  for (const g of game.gems) if (!g.got) drawGem(ctx, g, theme, game.clock);
  for (const item of game.pickups) drawPickup(ctx, item, theme, game.clock);
  for (const e of game.enemies) if (e.alive) drawEnemy(ctx, e, theme, game.clock);
  if (game.boss && game.boss.alive) drawWarden(ctx, game.boss, theme, game.clock);
  for (const b of game.bullets) drawBolt(ctx, b);
  drawPlayer(ctx, game.player, theme, game.clock);
  for (const p of game.parts) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of game.floats || []) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.color;
    ctx.font = '700 14px "Avenir Next", "Segoe UI", sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overlay(ctx, game, cssW, cssH, theme);
}

function overlay(ctx, game, w, h, theme) {
  const v = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.2, w / 2, h * 0.5, h * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,6,24,0.18)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,244,220,${Math.min(0.45, game.flash * 0.5)})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (game.bannerT > 0) {
    const a = Math.min(1, game.bannerT);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,6,20,0.45)';
    ctx.fillRect(w * 0.2, h * 0.3, w * 0.6, 78);
    ctx.strokeStyle = theme.neon;
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.2, h * 0.3, w * 0.6, 78);
    ctx.fillStyle = '#fff8ea';
    ctx.font = '800 36px "Avenir Next", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COURSE CLEAR', w / 2, h * 0.3 + 50);
    ctx.restore();
  }
}

function drawTiles(ctx, game, theme) {
  const level = game.level;
  const cam = game.cam;
  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const c1 = Math.min(level.w - 1, Math.floor((cam.x + game.viewW) / TILE) + 2);
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const r1 = Math.min(level.h - 1, Math.floor((cam.y + game.viewH) / TILE) + 2);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const kind = level.solid[r * level.w + c];
      if (!kind) continue;
      const x = c * TILE;
      const y = r * TILE;
      const above = r === 0 || !level.solid[(r - 1) * level.w + c];
      if (kind === 2) drawBrick(ctx, x, y, above, theme, c, r);
      else if (kind === 3) drawMoss(ctx, x, y, above, theme, c);
      else drawMetal(ctx, x, y, above, theme, c, r);
    }
  }
}

function drawMetal(ctx, x, y, above, theme, c, r) {
  ctx.fillStyle = above ? theme.steel : theme.steelDeep;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x + 2, y + 6, TILE - 4, 1);
  ctx.fillRect(x + 2, y + 16, TILE - 4, 1);
  ctx.fillRect(x + 2, y + 26, TILE - 4, 1);
  if ((c + r) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 5, y + 9, 3, 3);
    ctx.fillRect(x + TILE - 8, y + 9, 3, 3);
  }
  if (above) {
    ctx.fillStyle = theme.neon;
    ctx.fillRect(x, y, TILE, 3);
    ctx.fillStyle = theme.hot;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x, y + 4, TILE, 2);
    ctx.globalAlpha = 1;
  }
}

function drawBrick(ctx, x, y, above, theme, c, r) {
  ctx.fillStyle = theme.brick || '#7a3a62';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  const offset = (r % 2) * 8;
  for (let row = 4; row < TILE; row += 8) {
    ctx.fillRect(x, y + row, TILE, 1);
    ctx.fillRect(x + ((row / 8 + c) % 2 ? 8 : 20) + offset * 0, y + row - 7, 1, 7);
  }
  if (above) {
    ctx.fillStyle = theme.amber;
    ctx.fillRect(x, y, TILE, 3);
  }
}

function drawMoss(ctx, x, y, above, theme, c) {
  drawMetal(ctx, x, y, false, theme, c, 1);
  if (above) {
    ctx.fillStyle = theme.moss || '#2f8a78';
    ctx.fillRect(x, y, TILE, 8);
    ctx.fillStyle = '#b8ffe8';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + 4 + (c % 3) * 4, y + 2, 6, 2);
    ctx.fillRect(x + 16, y + 4, 5, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.neon;
    ctx.fillRect(x, y + 8, TILE, 2);
  }
}

function drawPlayer(ctx, p, theme, time) {
  const flicker = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  const run = Math.min(1, Math.abs(p.vx) / 200);
  const idle = p.grounded && run < 0.08;
  const bob = idle ? Math.sin(time * 3) * 1.4 : 0;
  const leg = Math.sin(p.anim) * 8 * run;
  const cx = p.x + p.w / 2;
  const feet = p.y + p.h + bob;
  let sx = p.bulk ? 1.15 : 1;
  let sy = p.bulk ? 1.12 : 1;
  if (p.landT > 0) {
    sx *= 1.16;
    sy *= 0.78;
  } else if (!p.grounded && p.vy < 0) {
    sx *= 0.9;
    sy *= 1.12;
  } else if (!p.grounded) {
    sx *= 0.88;
    sy *= 1.16;
  } else if (run > 0.2) {
    const wave = Math.sin(p.anim * 2);
    sx *= 1 - wave * 0.05;
    sy *= 1 + wave * 0.07;
  }
  ctx.save();
  if (flicker) ctx.globalAlpha = 0.45;
  ctx.translate(cx, feet);
  ctx.scale((p.facing < 0 ? -1 : 1) * sx, sy);
  const scarf = Math.sin(time * 10 + Math.abs(p.vx) * 0.02) * (4 + run * 7);
  ctx.fillStyle = p.bulk ? '#ffb15a' : theme.hot;
  ctx.beginPath();
  ctx.moveTo(-6, -34);
  ctx.quadraticCurveTo(-18 - run * 8, -28 + scarf, -22 - run * 10, -16 + scarf);
  ctx.lineTo(-12, -20);
  ctx.lineTo(-4, -30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1c28';
  ctx.fillRect(-5, -16, 4, 14 + leg);
  ctx.fillRect(2, -16, 4, 14 - leg);
  ctx.fillStyle = p.bulk ? theme.amber : theme.neon;
  ctx.fillRect(-7, -5 + leg * 0.3, 8, 4);
  ctx.fillRect(1, -5 - leg * 0.3, 8, 4);
  ctx.fillStyle = p.bulk ? '#2a2014' : '#1c2030';
  ctx.beginPath();
  ctx.moveTo(-11, -40);
  ctx.lineTo(11, -40);
  ctx.lineTo(13, -8);
  ctx.lineTo(4, -12);
  ctx.lineTo(0, -6);
  ctx.lineTo(-4, -12);
  ctx.lineTo(-13, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.bulk ? theme.amber : theme.neon;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = theme.amber;
  ctx.fillRect(-8, -22, 16, 3);
  ctx.fillStyle = '#12141c';
  ctx.fillRect(-8, -54, 16, 16);
  ctx.fillStyle = p.arc ? theme.hot : '#d8fbff';
  ctx.fillRect(-7, -48, 14, 5);
  ctx.fillStyle = theme.neon;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-6, -47, 5, 3);
  ctx.fillRect(1, -47, 5, 3);
  ctx.globalAlpha = 1;
  if (p.arc) {
    ctx.fillStyle = theme.hot;
    ctx.fillRect(8, -30, 7, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, -29, 3, 3);
  }
  if (!p.grounded && p.vy < 0) {
    ctx.strokeStyle = theme.neon;
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-14, -22);
    ctx.moveTo(8, -14);
    ctx.lineTo(14, -20);
    ctx.stroke();
  }
  ctx.restore();
}

function optic(ctx, x, y, w, color) {
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 1, 4, 3);
  ctx.fillRect(x + w - 6, y + 1, 4, 3);
}

function drawEnemy(ctx, e, theme, time) {
  const pulse = 0.65 + Math.sin(time * 6 + e.x) * 0.35;
  if (e.kind === 'lens') {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    ctx.rotate(Math.sin(time * 2) * 0.2);
    ctx.fillStyle = '#241432';
    ctx.beginPath();
    ctx.ellipse(0, 0, e.w / 2 + 4, e.h / 2 + 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.hot;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = theme.neon;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.w / 2 + 8, e.h / 2 + 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    optic(ctx, -8, -2, 16, theme.neon);
    ctx.restore();
    return;
  }
  const bob = Math.abs(Math.sin(time * 12 + e.x * 0.04)) * 2;
  ctx.fillStyle = '#1a2233';
  ctx.fillRect(e.x - 2, e.y + 4 + bob, e.w + 4, e.h - 6);
  ctx.fillStyle = theme.neon;
  ctx.fillRect(e.x - 2, e.y + 4 + bob, e.w + 4, 3);
  optic(ctx, e.x + 4, e.y + 10 + bob, e.w - 8, theme.hot);
  ctx.strokeStyle = theme.amber;
  ctx.lineWidth = 2;
  const step = Math.sin(time * 14 + e.x);
  for (let i = 0; i < 4; i++) {
    const lx = e.x + i * 8;
    ctx.beginPath();
    ctx.moveTo(lx + 2, e.y + e.h - 6);
    ctx.lineTo(lx + 2 + step * 3, e.y + e.h + 2);
    ctx.stroke();
  }
}

function drawWarden(ctx, b, theme, time) {
  ctx.fillStyle = '#3a1828';
  ctx.fillRect(b.x + 6, b.y + 18, b.w - 12, b.h - 16);
  ctx.fillStyle = '#241018';
  ctx.fillRect(b.x, b.y + 6, b.w, 20);
  ctx.fillStyle = b.vulnerable ? '#fff4ea' : theme.neon;
  ctx.globalAlpha = b.vulnerable ? 1 : 0.55;
  ctx.fillRect(b.x + 8, b.y + 12, b.w - 16, 5);
  ctx.globalAlpha = 1;
  optic(ctx, b.x + 18, b.y + b.h * 0.48, b.w - 36, b.vulnerable ? theme.amber : theme.hot);
  ctx.fillStyle = '#12080e';
  ctx.fillRect(b.x + 8, b.y + b.h - 12, 12, 14);
  ctx.fillRect(b.x + b.w - 20, b.y + b.h - 12, 12, 14);
  if (b.vulnerable) {
    ctx.strokeStyle = theme.amber;
    ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.25;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 10);
    ctx.globalAlpha = 1;
  }
  const cells = b.maxHp || 3;
  for (let i = 0; i < cells; i++) {
    ctx.fillStyle = i < b.hp ? theme.hot : 'rgba(255,255,255,0.2)';
    ctx.fillRect(b.x + 16 + i * 16, b.y + 24, 10, 4);
  }
}

function drawGem(ctx, g, theme, time) {
  const bob = Math.sin((g.phase + time) * 4) * 4;
  const spin = time * 3 + g.phase;
  ctx.save();
  ctx.translate(g.x + 8, g.y + 8 + bob);
  ctx.rotate(spin);
  ctx.fillStyle = theme.neon;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(9, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f4ffff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.hot;
  ctx.fillRect(-1.5, -4, 3, 8);
  const spark = (time * 5 + g.x) % 1;
  ctx.globalAlpha = 1 - spark;
  ctx.fillStyle = '#fff';
  ctx.fillRect(8, -10, 2, 2);
  ctx.restore();
}

function drawCrate(ctx, c, theme, time) {
  const hop = Math.sin(Math.min(1, c.bump || 0) * Math.PI) * 12;
  const pulse = 0.55 + Math.sin(time * 5 + c.x) * 0.45;
  ctx.save();
  ctx.translate(c.x + c.w / 2, c.y + c.h / 2 - hop);
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.strokeStyle = theme.amber;
  ctx.lineWidth = 3;
  ctx.strokeRect(-c.w / 2 + 2, -c.h / 2 + 2, c.w - 4, c.h - 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = theme.neon;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(6, 1);
  ctx.lineTo(0, 8);
  ctx.lineTo(-6, 1);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.fillRect(-1, -3, 2, 6);
  ctx.restore();
}

function drawPickup(ctx, item, theme, time) {
  const bob = Math.sin(time * 5 + item.age) * 4;
  const grow = Math.min(1, item.age * 4);
  ctx.save();
  ctx.translate(item.x + 9, item.y + 9 + bob);
  ctx.scale(grow, grow);
  ctx.globalAlpha = 0.35 + Math.sin(time * 8) * 0.15;
  ctx.fillStyle = item.kind === 'bulk' ? theme.amber : theme.hot;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (item.kind === 'bulk') {
    ctx.fillStyle = '#2a2014';
    ctx.fillRect(-8, -9, 16, 18);
    ctx.strokeStyle = theme.amber;
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -9, 16, 18);
  } else {
    ctx.strokeStyle = theme.hot;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 1.7);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, -2, 6, 4);
  }
  ctx.restore();
}

function drawSpike(ctx, s, theme) {
  ctx.fillStyle = '#4a3048';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y + s.h);
  ctx.lineTo(s.x + s.w * 0.3, s.y + 4);
  ctx.lineTo(s.x + s.w * 0.5, s.y + s.h);
  ctx.lineTo(s.x + s.w * 0.7, s.y + 2);
  ctx.lineTo(s.x + s.w, s.y + s.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.hot;
  ctx.fillRect(s.x + s.w * 0.7 - 1, s.y + 4, 2, 6);
}

function drawGate(ctx, g, theme, time) {
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h * 0.42;
  ctx.strokeStyle = theme.hot;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * (Math.PI / 3) + time * 0.4;
    const px = cx + Math.cos(a) * (16 + Math.sin(time * 3) * 1.5);
    const py = cy + Math.sin(a) * (16 + Math.sin(time * 3) * 1.5);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,77,154,0.18)';
  ctx.fill();
  ctx.fillStyle = theme.neon;
  ctx.fillRect(cx - 2, g.y + g.h - 8, 4, 8);
}

function drawPylon(ctx, k, theme, time) {
  ctx.fillStyle = k.on ? theme.neon : '#4a5678';
  ctx.fillRect(k.x + 3, k.y, 6, k.h);
  ctx.strokeStyle = k.on ? '#fff' : theme.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(k.x + 6, k.y + 10, 8 + (k.on ? Math.sin(time * 4) : 0), 0, Math.PI * 2);
  ctx.stroke();
  if (k.on) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(k.x + 4, k.y + 8, 4, 4);
  }
}

function drawBeacon(ctx, b, theme, time) {
  const pulse = 0.55 + Math.sin(time * 6) * 0.45;
  ctx.fillStyle = '#22283a';
  ctx.fillRect(b.x + 5, b.y + 18, 8, b.h - 18);
  ctx.fillStyle = theme.neon;
  ctx.globalAlpha = b.ready ? pulse : 0.25;
  ctx.beginPath();
  ctx.arc(b.x + 9, b.y + 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.hot;
  ctx.beginPath();
  ctx.moveTo(b.x + 13, b.y + 28);
  ctx.lineTo(b.x + 32, b.y + 38 + Math.sin(time * 4) * 2);
  ctx.lineTo(b.x + 13, b.y + 48);
  ctx.closePath();
  ctx.fill();
}

function drawMover(ctx, m, theme, time) {
  ctx.fillStyle = '#243048';
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.fillStyle = theme.neon;
  ctx.fillRect(m.x, m.y, m.w, 3);
  ctx.fillStyle = theme.amber;
  const shift = Math.floor(time * 20) % 14;
  for (let x = m.x + 4 - shift; x < m.x + m.w - 4; x += 14) {
    if (x > m.x) ctx.fillRect(x, m.y + 5, 7, 3);
  }
}

function drawBolt(ctx, b) {
  ctx.fillStyle = '#ffd0ea';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x + b.w - 4, b.y, 4, b.h);
}
