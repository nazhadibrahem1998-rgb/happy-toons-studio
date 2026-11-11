import { blocked, samplePoly, LAYOUT } from './sim.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function makeDecor() {
  const rnd = mulberry32(0x51a1);
  const items = [];
  let guard = 0;
  while (items.length < 46 && guard < 700) {
    guard += 1;
    const x = 36 + rnd() * (LAYOUT.worldW - 72);
    const y = 36 + rnd() * (LAYOUT.worldH - 72);
    if (blocked(x, y)) continue;
    if (y > 790 && x < 980) continue;
    const roll = rnd();
    items.push({
      x, y,
      s: 0.75 + rnd() * 0.55,
      kind: roll < 0.42 ? 'tree' : roll < 0.68 ? 'pine' : 'bush',
      tint: rnd(),
    });
  }
  const flowers = [];
  for (let i = 0; i < 70; i++) {
    const x = 30 + rnd() * (LAYOUT.worldW - 60);
    const y = 30 + rnd() * (LAYOUT.worldH - 60);
    if (blocked(x, y)) continue;
    flowers.push({ x, y, c: rnd() < 0.5 ? '#fff4b0' : rnd() < 0.5 ? '#ff8eb8' : '#ffffff', r: 1.4 + rnd() * 1.3 });
  }
  return { items, flowers };
}

const DECOR = makeDecor();

function drawTree(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(40, 70, 20, 0.16)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(x - 2.2 * s, y - 2 * s, 4.4 * s, 14 * s);
  ctx.fillStyle = '#1f7d3c';
  circle(ctx, x, y - 8 * s, 13 * s);
  ctx.fill();
  ctx.fillStyle = '#34a853';
  circle(ctx, x - 6 * s, y - 14 * s, 9 * s);
  ctx.fill();
  ctx.fillStyle = '#67c36a';
  circle(ctx, x + 5 * s, y - 12 * s, 7.5 * s);
  ctx.fill();
}

function drawPine(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(40, 70, 20, 0.16)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5130';
  ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 12 * s);
  ctx.fillStyle = '#1c6e38';
  ctx.beginPath();
  ctx.moveTo(x, y - 34 * s);
  ctx.lineTo(x + 14 * s, y - 8 * s);
  ctx.lineTo(x - 14 * s, y - 8 * s);
  ctx.fill();
  ctx.fillStyle = '#2c9450';
  ctx.beginPath();
  ctx.moveTo(x, y - 24 * s);
  ctx.lineTo(x + 12 * s, y - 2 * s);
  ctx.lineTo(x - 12 * s, y - 2 * s);
  ctx.fill();
  ctx.fillStyle = '#49b864';
  ctx.beginPath();
  ctx.moveTo(x, y - 14 * s);
  ctx.lineTo(x + 9 * s, y + 6 * s);
  ctx.lineTo(x - 9 * s, y + 6 * s);
  ctx.fill();
}

function drawBush(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(40, 70, 20, 0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3aaa52';
  circle(ctx, x - 4 * s, y, 6 * s);
  ctx.fill();
  ctx.fillStyle = '#5ec86a';
  circle(ctx, x + 4 * s, y - 1 * s, 5.5 * s);
  ctx.fill();
}

function drawBarn(ctx, x, y) {
  ctx.fillStyle = 'rgba(60, 30, 20, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c7a40';
  ctx.beginPath();
  ctx.moveTo(x, y - 42);
  ctx.lineTo(x + 42, y - 6);
  ctx.lineTo(x - 42, y - 6);
  ctx.fill();
  ctx.fillStyle = '#1f5c30';
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 34);
  ctx.lineTo(x + 42, y - 6);
  ctx.lineTo(x + 42, y - 1);
  ctx.lineTo(x + 8, y - 26);
  ctx.fill();
  ctx.fillStyle = '#e23b3b';
  ctx.fillRect(x - 32, y - 6, 64, 38);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 32, y - 6, 64, 4);
  ctx.fillRect(x - 11, y + 6, 22, 26);
  ctx.strokeStyle = '#e23b3b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 7, y + 10);
  ctx.lineTo(x + 7, y + 28);
  ctx.moveTo(x + 7, y + 10);
  ctx.lineTo(x - 7, y + 28);
  ctx.stroke();
  ctx.fillStyle = '#1b1b1b';
  circle(ctx, x, y - 18, 6.5);
  ctx.fill();
  ctx.fillStyle = '#ffe7a0';
  circle(ctx, x, y - 18, 4.2);
  ctx.fill();
}

function drawCoop(ctx, x, y) {
  ctx.fillStyle = 'rgba(60, 40, 10, 0.14)';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  roundRect(ctx, x - 24, y - 8, 48, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#d4533c';
  ctx.beginPath();
  ctx.moveTo(x - 28, y - 6);
  ctx.lineTo(x, y - 26);
  ctx.lineTo(x + 28, y - 6);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  roundRect(ctx, x - 6, y + 4, 12, 16, 2);
  ctx.fill();
  ctx.fillStyle = '#7a3b22';
  ctx.fillRect(x + 10, y + 2, 8, 7);
}

function drawWheat(ctx, x, y) {
  ctx.fillStyle = '#d9b45a';
  roundRect(ctx, x - 30, y - 16, 60, 36, 8);
  ctx.fill();
  ctx.strokeStyle = '#f6de86';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 8, y + 14);
    ctx.quadraticCurveTo(x + i * 8 + 2, y - 2, x + i * 8, y - 18);
    ctx.stroke();
    ctx.fillStyle = '#ffe38a';
    circle(ctx, x + i * 8, y - 18, 3);
    ctx.fill();
  }
}

function drawSheepPen(ctx, x, y) {
  ctx.strokeStyle = '#c9854a';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 28, y - 18, 56, 40);
  ctx.fillStyle = '#e7b27a';
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 30 + i * 18, y - 22, 5, 10);
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 30 + i * 18, y + 16, 5, 8);
}

function drawOrchard(ctx, x, y) {
  for (let i = 0; i < 3; i++) {
    const ox = x - 16 + i * 16;
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(ox - 1.5, y, 3, 12);
    ctx.fillStyle = '#2f9a45';
    circle(ctx, ox, y - 6, 8);
    ctx.fill();
    ctx.fillStyle = '#e23b3b';
    circle(ctx, ox - 3, y - 8, 2);
    ctx.fill();
    circle(ctx, ox + 3, y - 4, 2);
    ctx.fill();
  }
}

function drawApiary(ctx, x, y) {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 1 ? '#f0b429' : '#f6d365';
    roundRect(ctx, x - 22 + i * 16, y - 8, 14, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#6b3a12';
    ctx.fillRect(x - 20 + i * 16, y + 2, 10, 2);
  }
}

function drawCreamery(ctx, x, y) {
  ctx.fillStyle = 'rgba(40, 50, 70, 0.13)';
  ctx.beginPath();
  ctx.ellipse(x, y + 24, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f7fb';
  roundRect(ctx, x - 24, y - 10, 48, 34, 5);
  ctx.fill();
  ctx.fillStyle = '#3d7ee0';
  ctx.fillRect(x - 24, y - 16, 48, 10);
  ctx.fillStyle = '#d7ecff';
  ctx.fillRect(x - 8, y + 2, 16, 18);
}

function drawGreenhouse(ctx, x, y) {
  ctx.fillStyle = 'rgba(180, 220, 190, 0.9)';
  roundRect(ctx, x - 28, y - 8, 56, 30, 4);
  ctx.fill();
  ctx.strokeStyle = '#f7fffb';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 28, y - 8, 56, 30);
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 22);
  ctx.moveTo(x - 14, y - 8);
  ctx.lineTo(x - 14, y + 22);
  ctx.moveTo(x + 14, y - 8);
  ctx.lineTo(x + 14, y + 22);
  ctx.stroke();
  ctx.fillStyle = '#b7e4c7';
  ctx.beginPath();
  ctx.moveTo(x - 28, y - 8);
  ctx.lineTo(x, y - 24);
  ctx.lineTo(x + 28, y - 8);
  ctx.fill();
}

function drawMarket(ctx, x, y) {
  ctx.fillStyle = 'rgba(40, 50, 20, 0.14)';
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c47a3a';
  roundRect(ctx, x - 28, y - 2, 56, 28, 4);
  ctx.fill();
  const stripes = ['#f4f7f2', '#3aaa55'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = stripes[i % 2];
    ctx.beginPath();
    ctx.moveTo(x - 32 + i * 11, y - 2);
    ctx.lineTo(x - 26 + i * 11, y - 2);
    ctx.lineTo(x - 22 + i * 11, y - 18);
    ctx.lineTo(x - 28 + i * 11, y - 18);
    ctx.fill();
  }
  ctx.fillStyle = '#214018';
  ctx.font = '800 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MARKET', x, y + 12);
}

function drawTruck(ctx, x, y) {
  ctx.fillStyle = 'rgba(40, 20, 10, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d23a32';
  roundRect(ctx, x - 8, y - 10, 18, 16, 3);
  ctx.fill();
  ctx.fillStyle = '#b87333';
  roundRect(ctx, x - 22, y - 6, 16, 12, 2);
  ctx.fill();
  ctx.fillStyle = '#d7f0ff';
  ctx.fillRect(x - 2, y - 8, 8, 6);
  ctx.fillStyle = '#222';
  circle(ctx, x - 14, y + 8, 3.4);
  ctx.fill();
  circle(ctx, x + 4, y + 8, 3.4);
  ctx.fill();
}

function drawHay(ctx, x, y) {
  ctx.fillStyle = '#e2b84a';
  roundRect(ctx, x - 12, y - 8, 24, 16, 6);
  ctx.fill();
  ctx.strokeStyle = '#c48a28';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 8);
  ctx.lineTo(x - 6, y + 8);
  ctx.moveTo(x + 6, y - 8);
  ctx.lineTo(x + 6, y + 8);
  ctx.stroke();
}

function drawPond(ctx, x, y) {
  ctx.fillStyle = 'rgba(40, 80, 40, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 36, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7ec8e8';
  ctx.beginPath();
  ctx.ellipse(x, y, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b5e4f6';
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 3, 10, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFence(ctx, fence) {
  const { x, y, w, h } = fence;
  ctx.strokeStyle = '#d7a15a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x, y + 16);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w * 0.32, y + h);
  ctx.moveTo(x + w * 0.62, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  ctx.fillStyle = '#c9843e';
  const posts = [
    [x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h],
    [x, y + h], [x, y + h / 2],
  ];
  for (let i = 0; i < posts.length; i++) ctx.fillRect(posts[i][0] - 2, posts[i][1] - 3, 5, 8);
}

function drawRails(ctx, poly) {
  ctx.strokeStyle = '#e0c07a';
  ctx.lineWidth = 18;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  strokeLoop(ctx, poly.pts);
  ctx.fillStyle = '#9a5c32';
  const step = 18;
  for (let d = 0; d < poly.length; d += step) {
    const p = samplePoly(poly, d);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    ctx.fillRect(-3.2, -8, 6.4, 16);
    ctx.restore();
  }
  strokeOffset(ctx, poly, 5.2, '#f7f9fc', 2.6);
  strokeOffset(ctx, poly, -5.2, '#f7f9fc', 2.6);
  strokeOffset(ctx, poly, 5.2, '#c5ced6', 1);
  strokeOffset(ctx, poly, -5.2, '#c5ced6', 1);
}

function strokeLoop(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();
}

function strokeOffset(ctx, poly, offset, color, width) {
  ctx.beginPath();
  for (let i = 0; i <= poly.pts.length; i++) {
    const a = poly.pts[i % poly.pts.length];
    const b = poly.pts[(i + 1) % poly.pts.length];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ox = Math.cos(ang + Math.PI / 2) * offset;
    const oy = Math.sin(ang + Math.PI / 2) * offset;
    if (i === 0) ctx.moveTo(a.x + ox, a.y + oy);
    else ctx.lineTo(a.x + ox, a.y + oy);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawGoods(ctx, pile, time) {
  const n = Math.min(12, pile.n);
  if (!n) return;
  for (let i = 0; i < n; i++) {
    const ang = i * 2.35 + pile.x * 0.01;
    const rad = 4 + (i % 4) * 4.2;
    const bob = Math.sin(time * 3 + i) * 0.6;
    drawGood(ctx, pile.good, pile.x + Math.cos(ang) * rad, pile.y + Math.sin(ang) * rad * 0.62 + bob, pile.good === 'milk' ? 1.35 : 1.1);
  }
}

function drawGood(ctx, good, x, y, s) {
  if (good === 'milk') {
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * s, 3.1 * s, 4.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4aa3e8';
    ctx.fillRect(x - 1.6 * s, y - 4.2 * s, 3.2 * s, 3 * s);
  } else if (good === 'eggs') {
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.ellipse(x, y, 3.4 * s, 4.4 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (good === 'wheat') {
    ctx.fillStyle = '#f0c14a';
    roundRect(ctx, x - 4 * s, y - 3 * s, 8 * s, 7 * s, 2);
    ctx.fill();
  } else if (good === 'wool') {
    ctx.fillStyle = '#fff';
    circle(ctx, x, y, 4 * s);
    ctx.fill();
    circle(ctx, x + 3 * s, y + 1 * s, 2.6 * s);
    ctx.fill();
  } else if (good === 'apples') {
    ctx.fillStyle = '#e23b3b';
    circle(ctx, x, y, 3.6 * s);
    ctx.fill();
    ctx.strokeStyle = '#2f7a32';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 3 * s);
    ctx.lineTo(x + 2 * s, y - 5 * s);
    ctx.stroke();
  } else if (good === 'honey') {
    ctx.fillStyle = '#f0b429';
    roundRect(ctx, x - 3 * s, y - 3 * s, 6 * s, 7 * s, 2);
    ctx.fill();
  } else if (good === 'cream') {
    ctx.fillStyle = '#fff';
    roundRect(ctx, x - 3 * s, y - 4 * s, 6 * s, 8 * s, 1.5);
    ctx.fill();
    ctx.fillStyle = '#3d7ee0';
    ctx.fillRect(x - 3 * s, y - 1 * s, 6 * s, 2 * s);
  } else {
    ctx.fillStyle = '#ff8eb8';
    circle(ctx, x, y, 3.2 * s);
    ctx.fill();
    ctx.fillStyle = '#ffe36b';
    circle(ctx, x, y, 1.3 * s);
    ctx.fill();
  }
}

const BUILDING_DRAW = {
  barn: drawBarn,
  coop: drawCoop,
  wheat: drawWheat,
  sheep: drawSheepPen,
  orchard: drawOrchard,
  apiary: drawApiary,
  creamery: drawCreamery,
  greenhouse: drawGreenhouse,
  market: drawMarket,
};

function drawSign(ctx, sign, time, shaking) {
  ctx.save();
  ctx.translate(sign.x, sign.y);
  if (shaking) ctx.rotate(Math.sin(time * 42) * 0.12);
  const pulse = sign.hot ? 1 + Math.sin(time * 4.2) * 0.035 : 1;
  ctx.scale(pulse, pulse);
  if (sign.kind === 'plot') {
    ctx.fillStyle = '#c9a15d';
    roundRect(ctx, -36, -8, 72, 34, 10);
    ctx.fill();
    ctx.fillStyle = sign.hot ? '#1f8a3c' : '#4e6d54';
    roundRect(ctx, -32, -22, 64, 36, 9);
    ctx.fill();
  }
  if (sign.kind === 'track') {
    ctx.fillStyle = '#a56b3a';
    ctx.fillRect(-16, -4, 8, 28);
    ctx.fillRect(8, -4, 8, 28);
    ctx.fillRect(-16, -2, 32, 6);
  }
  ctx.font = '800 16px system-ui, sans-serif';
  const pad = 16;
  const tw = Math.max(52, ctx.measureText(sign.label).width + pad);
  const boardY = sign.kind === 'plot' ? -16 : -8;
  if (sign.hot) {
    ctx.strokeStyle = 'rgba(255, 214, 70, ' + (0.35 + 0.3 * (0.5 + 0.5 * Math.sin(time * 4.2))) + ')';
    ctx.lineWidth = 5;
    roundRect(ctx, -tw / 2 - 3, boardY - 3, tw + 6, 30, 9);
    ctx.stroke();
  }
  ctx.fillStyle = sign.hot ? '#187a34' : '#4d6752';
  roundRect(ctx, -tw / 2, boardY, tw, 24, 7);
  ctx.fill();
  ctx.fillStyle = '#0f4a22';
  roundRect(ctx, -tw / 2, boardY + 18, tw, 5, 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign.label, 0, boardY + 12);
  if (sign.kind !== 'plot') {
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#24381c';
    ctx.fillText(sign.title, 0, boardY - 12);
  }
  ctx.restore();
}

function drawHand(ctx, x, y, time) {
  const bob = Math.sin(time * 5) * 8;
  ctx.save();
  ctx.translate(x + 52, y + 46 + bob);
  ctx.rotate(-0.55);
  ctx.fillStyle = 'rgba(30, 40, 20, 0.18)';
  ctx.beginPath();
  ctx.ellipse(8, 26, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c3c9d4';
  ctx.lineWidth = 2.5;
  roundRect(ctx, -7, -32, 14, 34, 7);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(3, 10, 16, 13, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-14, 8, 7, 9, -0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  circle(ctx, 8, 4, 3);
  ctx.fill();
  ctx.restore();

  const bx = x + 8;
  const by = y + 92 + bob;
  ctx.font = '800 13px system-ui, sans-serif';
  const text = 'Tap to buy';
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#d5dbe6';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, w, 22, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#243018';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 8, by + 11);
}

function drawAnimal(ctx, kind, x, y, time, i) {
  const bob = Math.sin(time * 3 + i) * 1.5;
  if (kind === 'cow') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x, y + bob, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2d0c2';
    circle(ctx, x + 12, y - 2 + bob, 5);
    ctx.fill();
    ctx.fillStyle = '#222';
    circle(ctx, x - 4, y + bob, 2);
    ctx.fill();
    circle(ctx, x + 3, y + 1 + bob, 1.6);
    ctx.fill();
  } else if (kind === 'hen') {
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.ellipse(x, y + bob, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e23b3b';
    ctx.beginPath();
    ctx.moveTo(x + 5, y + bob);
    ctx.lineTo(x + 10, y - 1 + bob);
    ctx.lineTo(x + 5, y + 2 + bob);
    ctx.fill();
    ctx.fillStyle = '#f0c14a';
    ctx.fillRect(x - 2, y - 7 + bob, 5, 4);
  } else if (kind === 'sheep') {
    ctx.fillStyle = '#fff';
    circle(ctx, x, y + bob, 7);
    ctx.fill();
    circle(ctx, x + 5, y + 2 + bob, 5);
    ctx.fill();
    ctx.fillStyle = '#f3d2c0';
    circle(ctx, x + 9, y + 1 + bob, 3);
    ctx.fill();
  } else if (kind === 'bee') {
    const wx = x + Math.sin(time * 6 + i) * 8;
    const wy = y + Math.cos(time * 5 + i) * 4;
    ctx.fillStyle = '#f0c014';
    ctx.beginPath();
    ctx.ellipse(wx, wy, 4, 2.4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(wx - 1, wy - 2, 1.2, 4);
  }
}

function drawTrain(ctx, pose, goods, time) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.ang);
  ctx.fillStyle = 'rgba(20, 30, 20, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 10, pose.engine ? 18 : 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pose.engine) {
    ctx.fillStyle = '#2c6fe0';
    roundRect(ctx, -18, -9, 36, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#f2d23a';
    ctx.fillRect(-10, -2, 22, 4);
    ctx.fillStyle = '#1d4eaa';
    roundRect(ctx, -8, -12, 16, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#d7f1ff';
    ctx.fillRect(-4, -9, 8, 6);
    ctx.fillStyle = '#e8eef5';
    ctx.fillRect(12, -3, 6, 6);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-4, -18, 6, 8);
  } else {
    ctx.fillStyle = '#fff7ea';
    roundRect(ctx, -14, -8, 28, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#2c6fe0';
    ctx.fillRect(-14, -2, 28, 4);
    if (goods.length) {
      const g = goods[pose.index % goods.length];
      drawGood(ctx, g, 0, -1, 0.9);
    }
  }
  const spin = time * 10;
  ctx.fillStyle = '#242424';
  for (const wx of pose.engine ? [-10, 8] : [-7, 7]) {
    ctx.save();
    ctx.translate(wx, 8);
    ctx.rotate(spin);
    circle(ctx, 0, 0, 3.3);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function paintStatic(bg, snapshot) {
  const ctx = bg.getContext('2d');
  const w = snapshot.w;
  const h = snapshot.h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#7dce54';
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(99);
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(50, 110, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 90, 24 + rnd() * 40, rnd(), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < DECOR.flowers.length; i++) {
    const f = DECOR.flowers[i];
    ctx.fillStyle = f.c;
    circle(ctx, f.x, f.y, f.r);
    ctx.fill();
  }
  drawPond(ctx, 190, 910);
  const road = LAYOUT.road;
  ctx.fillStyle = '#e6c48a';
  roundRect(ctx, road.x, road.y, road.w, road.h, 18);
  ctx.fill();
  ctx.fillStyle = '#d3ae6e';
  roundRect(ctx, road.x, road.y + road.h - 8, road.w, 8, 6);
  ctx.fill();

  for (let i = 0; i < snapshot.stops.length; i++) {
    const s = snapshot.stops[i];
    if (s.kind === 'market') continue;
    const dist = Math.hypot(s.bx - s.x, s.by - s.y);
    if (dist < 36) continue;
    ctx.strokeStyle = 'rgba(214, 176, 112, 0.9)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.bx, s.by);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }

  for (let i = 0; i < DECOR.items.length; i++) {
    const item = DECOR.items[i];
    if (item.kind === 'tree') drawTree(ctx, item.x, item.y, item.s);
    else if (item.kind === 'pine') drawPine(ctx, item.x, item.y, item.s);
    else drawBush(ctx, item.x, item.y, item.s);
  }

  drawHay(ctx, 470, 470);
  drawHay(ctx, 650, 455);
  drawFence(ctx, LAYOUT.fence);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  const pts = snapshot.poly.pts;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();

  drawRails(ctx, snapshot.poly);

  for (let i = 0; i < snapshot.stops.length; i++) {
    const s = snapshot.stops[i];
    ctx.fillStyle = '#c9854a';
    roundRect(ctx, s.x - 8, s.y - 8, 16, 16, 3);
    ctx.fill();
  }

  for (let i = 0; i < snapshot.buildings.length; i++) {
    const b = snapshot.buildings[i];
    const fn = BUILDING_DRAW[b.id];
    if (fn) fn(ctx, b.x, b.y);
  }

  const unlock = snapshot.unlock;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.rect(unlock.x, unlock.y, unlock.w, unlock.h);
  ctx.fillStyle = 'rgba(28, 58, 24, 0.38)';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.strokeStyle = 'rgba(90, 58, 24, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.strokeRect(unlock.x, unlock.y, unlock.w, unlock.h);
  ctx.setLineDash([]);

  ctx.font = '800 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < snapshot.labels.length; i++) {
    const label = snapshot.labels[i];
    ctx.fillStyle = 'rgba(32, 64, 24, 0.72)';
    ctx.fillText(label.text, label.x, label.y);
  }
}

export function createRenderer() {
  const bg = document.createElement('canvas');
  bg.width = LAYOUT.worldW;
  bg.height = LAYOUT.worldH;
  let bgRev = -1;
  const smoke = [];
  let last = 0;
  let puff = 0;

  function draw(ctx, env) {
    const dt = last ? Math.min(0.05, env.time - last) : 0.016;
    last = env.time;
    const view = env.view;
    if (view.rev !== bgRev) {
      paintStatic(bg, view);
      bgRev = view.rev;
    }
    const cam = env.cam;
    const dpr = env.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#6fbf45';
    ctx.fillRect(0, 0, env.w, env.h);
    ctx.setTransform(
      dpr * cam.z, 0, 0, dpr * cam.z,
      dpr * (env.w / 2 - cam.x * cam.z),
      dpr * (env.h / 2 - cam.y * cam.z),
    );
    ctx.drawImage(bg, 0, 0);

    for (let i = 0; i < view.piles.length; i++) drawGoods(ctx, view.piles[i], env.time);
    if (view.buildings.some((b) => b.id === 'barn')) drawAnimal(ctx, 'cow', 512, 438, env.time, 1);
    if (view.buildings.some((b) => b.id === 'coop')) {
      drawAnimal(ctx, 'hen', 400, 730, env.time, 1);
      drawAnimal(ctx, 'hen', 458, 736, env.time, 2);
    }
    if (view.buildings.some((b) => b.id === 'sheep')) {
      drawAnimal(ctx, 'sheep', 1070, 470, env.time, 1);
      drawAnimal(ctx, 'sheep', 1104, 458, env.time, 2);
    }
    if (view.buildings.some((b) => b.id === 'apiary')) {
      drawAnimal(ctx, 'bee', 1165, 130, env.time, 1);
      drawAnimal(ctx, 'bee', 1180, 142, env.time, 2);
    }

    for (let i = 0; i < 4; i++) {
      if (i < view.trucks) drawTruck(ctx, LAYOUT.park[i].x, LAYOUT.park[i].y);
      else if (i === view.trucks) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        drawTruck(ctx, LAYOUT.park[i].x, LAYOUT.park[i].y);
        ctx.restore();
      }
    }

    const shakeId = env.shake && env.shake.life > 0 ? env.shake.id : '';
    for (let i = 0; i < view.signs.length; i++) {
      drawSign(ctx, view.signs[i], env.time, view.signs[i].buyId === shakeId);
    }

    puff -= dt;
    const head = view.poses[view.poses.length - 1];
    if (head && puff <= 0) {
      puff = 0.22;
      const c = Math.cos(head.ang);
      const s = Math.sin(head.ang);
      smoke.push({
        x: head.x + c * -4 - s * -16,
        y: head.y + s * -4 + c * -16,
        life: 0.8,
        r: 3,
      });
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.life -= dt;
      p.y -= 10 * dt;
      p.r += 6 * dt;
      if (p.life <= 0) smoke.splice(i, 1);
      else {
        ctx.fillStyle = 'rgba(255,255,255,' + (p.life * 0.45) + ')';
        circle(ctx, p.x, p.y, p.r);
        ctx.fill();
      }
    }
    if (smoke.length > 18) smoke.splice(0, smoke.length - 18);

    if (env.selected) {
      const picked = view.buildings.find((b) => b.id === env.selected);
      if (picked) {
        ctx.strokeStyle = 'rgba(255, 214, 70, 0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(picked.x, picked.y + 18, 40, 16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (let i = 0; i < view.poses.length; i++) {
      drawTrain(ctx, view.poses[i], view.goods, env.time);
    }

    for (let i = 0; i < env.floats.length; i++) {
      const f = env.floats[i];
      const k = f.age / f.life;
      if (k >= 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(f.x, f.y - k * 36);
      ctx.font = '800 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#14662a';
      ctx.fillStyle = '#fff6c2';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }

    if (view.hand) drawHand(ctx, view.hand.x, view.hand.y, env.time);
  }

  return { draw };
}
