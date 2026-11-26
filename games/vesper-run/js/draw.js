import { TILE } from './levels.js';

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function sky(ctx, w, h, cam, theme, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme.top);
  g.addColorStop(0.55, theme.horizon);
  g.addColorStop(1, theme.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 48; i++) {
    const x = (hash(i + 3) * w + time * (4 + (i % 5)) + i * 40) % w;
    const y = hash(i + 19) * h * 0.42;
    ctx.globalAlpha = 0.25 + hash(i + 8) * 0.7;
    ctx.fillRect(x, y, i % 6 === 0 ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = theme.neon;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  const rx = w * 0.78 - (cam.x * 0.04) % (w + 200);
  const ry = h * 0.26;
  ctx.beginPath();
  ctx.arc(rx, ry, Math.min(w, h) * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rx, ry, Math.min(w, h) * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  bands(ctx, w, h, cam.x * 0.12, 0.62, theme.fog, theme.window || theme.neon, 0.35);
  bands(ctx, w, h, cam.x * 0.28, 0.74, theme.steel, theme.hot, 0.55);
  bands(ctx, w, h, cam.x * 0.48, 0.86, theme.steelDeep, theme.neon, 0.85);

  const haze = ctx.createLinearGradient(0, h * 0.72, 0, h);
  haze.addColorStop(0, 'rgba(0,0,0,0)');
  haze.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
}

function bands(ctx, w, h, scroll, baseline, fill, win, alpha) {
  const span = 168;
  const start = Math.floor(scroll / span) - 1;
  const count = Math.ceil(w / span) + 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const n = start + i;
    const x = n * span - scroll;
    const lift = hash(n * 2.1);
    const bw = 46 + lift * 78;
    const bh = 50 + hash(n * 4.4) * h * 0.34;
    const by = h * baseline - bh;
    ctx.fillStyle = fill;
    ctx.fillRect(x, by, bw, bh + 40);
    ctx.fillStyle = win;
    const rows = 3 + Math.floor(hash(n) * 4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        if (hash(n + r * 9 + c) < 0.45) continue;
        ctx.globalAlpha = alpha * (0.35 + hash(n + r + c) * 0.6);
        ctx.fillRect(x + 8 + c * (bw / 3.4), by + 10 + r * 16, 6, 3);
      }
    }
    ctx.globalAlpha = alpha;
    if (lift > 0.72) {
      ctx.fillRect(x + bw * 0.45, by - 18, 2, 18);
      ctx.fillStyle = win;
      ctx.fillRect(x + bw * 0.45 - 1, by - 20, 4, 3);
      ctx.fillStyle = fill;
    }
  }
  ctx.restore();
}

function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * (Math.PI / 3);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function worldOf(ctx, dpr, cssH, cam, viewH, shake) {
  const scale = (cssH / viewH) * dpr;
  const sx = Math.sin(cam.clock * 53) * shake;
  const sy = Math.cos(cam.clock * 47) * shake * 0.6;
  ctx.setTransform(scale, 0, 0, scale, (-cam.x + sx) * scale, (-cam.y + sy) * scale);
  return scale;
}

export function render(ctx, game, cssW, cssH, dpr) {
  const theme = (game.level && game.level.theme) || {
    top: '#07060f', horizon: '#221448', bottom: '#10141c', neon: '#3ef0ff', hot: '#ff2d78', amber: '#ffb13a', fog: '#140e28', steel: '#1a1826', steelDeep: '#100e18',
  };
  const cam = game.cam;
  cam.clock = game.clock;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  sky(ctx, cssW, cssH, cam, theme, game.clock);
  if (!game.level || !game.player) {
    vignette(ctx, cssW, cssH);
    return;
  }
  worldOf(ctx, dpr, cssH, cam, game.viewH, game.shake || 0);
  drawTiles(ctx, game, theme);
  for (const m of game.movers) drawMover(ctx, m, theme);
  for (const s of game.spikes) drawSpike(ctx, s, theme);
  for (const g of game.gates) drawGate(ctx, g, theme, game.clock);
  for (const k of game.checks) drawPylon(ctx, k, theme);
  if (game.beacon) drawBeacon(ctx, game.beacon, theme, game.clock);
  for (const c of game.crates) if (c.alive) drawCrate(ctx, c, theme);
  for (const g of game.gems) if (!g.got) drawGem(ctx, g, theme);
  for (const item of game.pickups) drawPickup(ctx, item, theme);
  for (const e of game.enemies) if (e.alive) drawEnemy(ctx, e, theme, game.clock);
  if (game.boss && game.boss.alive) drawWarden(ctx, game.boss, theme, game.clock);
  for (const b of game.bullets) drawBolt(ctx, b, theme);
  drawPlayer(ctx, game.player, theme, game.clock);
  for (const p of game.parts) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  vignette(ctx, cssW, cssH);
}

function vignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawTiles(ctx, game, theme) {
  const level = game.level;
  const cam = game.cam;
  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const c1 = Math.min(level.w - 1, Math.floor((cam.x + game.viewW) / TILE) + 1);
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const r1 = Math.min(level.h - 1, Math.floor((cam.y + game.viewH) / TILE) + 1);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (level.solid[r * level.w + c] !== 1) continue;
      const x = c * TILE;
      const y = r * TILE;
      const above = r === 0 || level.solid[(r - 1) * level.w + c] !== 1;
      ctx.fillStyle = above ? theme.steel : theme.steelDeep;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillRect(x + TILE - 1, y, 1, TILE);
      if (above) {
        ctx.fillStyle = theme.neon;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y, TILE, 2);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = theme.hot;
        ctx.fillRect(x, y + 3, TILE, 1);
        ctx.globalAlpha = 1;
        if (((c + r) & 3) === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.fillRect(x + 6, y + 8, 2, 2);
          ctx.fillRect(x + TILE - 8, y + 8, 2, 2);
        }
      }
    }
  }
}

function drawPlayer(ctx, p, theme, time) {
  if (p.invuln > 0 && Math.floor(time * 16) % 2 === 0) return;
  const run = Math.min(1, Math.abs(p.vx) / 220);
  const leg = Math.sin(p.anim) * 5 * run;
  const bob = p.grounded ? 0 : Math.min(2, Math.abs(p.vy) / 400);
  ctx.save();
  ctx.translate(p.x + p.w / 2, 0);
  ctx.scale(p.facing < 0 ? -1 : 1, 1);
  ctx.translate(-(p.x + p.w / 2), 0);
  const x = p.x;
  const y = p.y + bob;
  const w = p.w;
  const h = p.h;
  ctx.fillStyle = p.bulk ? '#1c140c' : '#12121a';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h * 0.28);
  ctx.lineTo(x + w - 3, y + h * 0.28);
  ctx.lineTo(x + w - 1, y + h - 4);
  ctx.lineTo(x + w * 0.62, y + h - 10);
  ctx.lineTo(x + w * 0.5, y + h - 3);
  ctx.lineTo(x + w * 0.38, y + h - 10);
  ctx.lineTo(x + 1, y + h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.bulk ? theme.amber : theme.neon;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#0c0c12';
  ctx.fillRect(x + w * 0.22, y + 1, w * 0.56, h * 0.24);
  ctx.fillStyle = p.arc ? theme.hot : theme.neon;
  ctx.fillRect(x + 3, y + h * 0.08, w - 6, 4);
  ctx.fillStyle = '#07070c';
  ctx.fillRect(x + 4, y + h - 14, 4, 12 + leg);
  ctx.fillRect(x + w - 8, y + h - 14, 4, 12 - leg);
  ctx.fillStyle = p.bulk ? theme.amber : theme.neon;
  ctx.fillRect(x + 3, y + h - 4 + leg, 6, 3);
  ctx.fillRect(x + w - 9, y + h - 4 - leg, 6, 3);
  if (p.arc) {
    ctx.fillStyle = theme.hot;
    ctx.fillRect(x + w - 5, y + h * 0.42, 7, 4);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + w - 3, y + h * 0.42 + 1, 3, 2);
    ctx.globalAlpha = 1;
  }
  if (p.bulk) {
    ctx.strokeStyle = theme.amber;
    ctx.strokeRect(x + 2, y + h * 0.32, w - 4, h * 0.28);
  }
  ctx.restore();
}

function drawEnemy(ctx, e, theme, time) {
  if (e.kind === 'lens') {
    ctx.strokeStyle = theme.hot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.fillStyle = theme.neon;
    ctx.fillRect(e.x + 6, e.y + e.h / 2 - 1, e.w - 12, 2);
    ctx.strokeStyle = theme.neon;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2 + 4, e.h / 2 + 3, time, 0, Math.PI * 1.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  const bob = Math.sin(time * 10 + e.x) * 1;
  ctx.fillStyle = '#141820';
  ctx.fillRect(e.x, e.y + 6 + bob, e.w, e.h - 8);
  ctx.fillStyle = theme.neon;
  ctx.fillRect(e.x, e.y + 6 + bob, e.w, 2);
  ctx.fillStyle = theme.hot;
  ctx.fillRect(e.x + 4, e.y + 11 + bob, e.w - 8, 2);
  ctx.strokeStyle = theme.neon;
  ctx.lineWidth = 1.5;
  const phase = Math.sin(time * 14 + e.x * 0.05);
  for (let i = 0; i < 3; i++) {
    const lx = e.x + 4 + i * 9;
    ctx.beginPath();
    ctx.moveTo(lx, e.y + e.h - 8);
    ctx.lineTo(lx + phase * 3, e.y + e.h);
    ctx.stroke();
  }
}

function drawWarden(ctx, b, theme, time) {
  ctx.fillStyle = '#1a0c12';
  ctx.fillRect(b.x + 8, b.y + 16, b.w - 16, b.h - 16);
  ctx.fillStyle = '#12080c';
  ctx.fillRect(b.x, b.y + 8, b.w, 16);
  ctx.fillStyle = b.vulnerable ? '#fff4ea' : theme.neon;
  ctx.globalAlpha = b.vulnerable ? 0.95 : 0.45;
  ctx.fillRect(b.x + 10, b.y + 12, b.w - 20, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.hot;
  ctx.fillRect(b.x + 18, b.y + b.h * 0.48, b.w - 36, 4);
  ctx.fillStyle = '#2a1218';
  ctx.fillRect(b.x + 6, b.y + b.h - 10, 10, 12);
  ctx.fillRect(b.x + b.w - 16, b.y + b.h - 10, 10, 12);
  if (b.vulnerable) {
    ctx.strokeStyle = theme.amber;
    ctx.globalAlpha = 0.4 + Math.sin(time * 8) * 0.2;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = theme.hot;
  const cells = b.maxHp || 3;
  for (let i = 0; i < cells; i++) {
    ctx.globalAlpha = i < b.hp ? 1 : 0.2;
    ctx.fillRect(b.x + 14 + i * 14, b.y + 22, 8, 3);
  }
  ctx.globalAlpha = 1;
}

function drawGem(ctx, g, theme) {
  const bob = Math.sin(g.phase * 4) * 3;
  ctx.save();
  ctx.translate(g.x + 8, g.y + 8 + bob);
  ctx.rotate(Math.sin(g.phase) * 0.3);
  ctx.fillStyle = theme.neon;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#eaffff';
  ctx.fillRect(-1, -4, 2, 6);
  ctx.restore();
}

function drawCrate(ctx, c, theme) {
  ctx.fillStyle = '#1a140e';
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.strokeStyle = theme.amber;
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  ctx.beginPath();
  ctx.moveTo(c.x + 6, c.y + 8);
  ctx.lineTo(c.x + c.w / 2, c.y + c.h - 7);
  ctx.lineTo(c.x + c.w - 6, c.y + 8);
  ctx.stroke();
}

function drawPickup(ctx, item, theme) {
  const bob = Math.sin(item.age * 5) * 3;
  ctx.save();
  ctx.translate(item.x + 9, item.y + 9 + bob);
  if (item.kind === 'bulk') {
    ctx.strokeStyle = theme.amber;
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.fillStyle = theme.amber;
    ctx.fillRect(-3, -6, 6, 12);
  } else {
    ctx.strokeStyle = theme.hot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = theme.hot;
    ctx.fillRect(4, -2, 6, 3);
  }
  ctx.restore();
}

function drawSpike(ctx, s, theme) {
  ctx.fillStyle = theme.steel;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y + s.h);
  ctx.lineTo(s.x + s.w / 2, s.y);
  ctx.lineTo(s.x + s.w, s.y + s.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.hot;
  ctx.fillRect(s.x + s.w / 2 - 1, s.y + 3, 2, 6);
}

function drawGate(ctx, g, theme, time) {
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h * 0.42;
  ctx.strokeStyle = theme.hot;
  ctx.lineWidth = 2;
  hexPath(ctx, cx, cy, 16 + Math.sin(time * 3 + g.x) * 1.2);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  hexPath(ctx, cx, cy, 8);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.neon;
  ctx.fillRect(cx - 1, g.y + g.h - 6, 2, 6);
}

function drawPylon(ctx, k, theme) {
  ctx.fillStyle = k.on ? theme.neon : '#2a3144';
  ctx.fillRect(k.x + 4, k.y, 4, k.h);
  ctx.strokeStyle = k.on ? theme.neon : '#667';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(k.x + 6, k.y + 8, 7, 0, Math.PI * 2);
  ctx.stroke();
  if (k.on) {
    ctx.fillStyle = '#eaffff';
    ctx.fillRect(k.x + 5, k.y + 6, 2, 4);
  }
}

function drawBeacon(ctx, b, theme, time) {
  const pulse = 0.55 + Math.sin(time * 5) * 0.35;
  ctx.fillStyle = '#12141c';
  ctx.fillRect(b.x + 6, b.y + 16, 6, b.h - 16);
  ctx.fillStyle = theme.neon;
  ctx.globalAlpha = pulse;
  ctx.fillRect(b.x + 4, b.y, 10, 10);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.hot;
  ctx.beginPath();
  ctx.moveTo(b.x + 12, b.y + 28);
  ctx.lineTo(b.x + 28, b.y + 36);
  ctx.lineTo(b.x + 12, b.y + 44);
  ctx.closePath();
  ctx.fill();
  if (!b.ready) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.fillRect(b.x + 4, b.y, 10, 10);
    ctx.globalAlpha = 1;
  }
}

function drawMover(ctx, m, theme) {
  ctx.fillStyle = '#161820';
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.fillStyle = theme.neon;
  ctx.fillRect(m.x, m.y, m.w, 2);
  ctx.fillStyle = theme.amber;
  for (let x = m.x + 4; x < m.x + m.w - 4; x += 14) ctx.fillRect(x, m.y + 5, 7, 3);
}

function drawBolt(ctx, b, theme) {
  ctx.fillStyle = theme.hot;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x + b.w - 4, b.y, 3, b.h);
}
