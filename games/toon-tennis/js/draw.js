/** Cartoon court, kids, and ball. All drawing is procedural. */
import { COURT, serviceBox } from './sim.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function viewLayout(w, h) {
  const touch = h < 520 ? h * 0.28 : h * 0.02;
  const top = Math.max(72, h * 0.2);
  const bottom = h - touch - 8;
  const side = Math.max(18, w * 0.05);
  return { w, h, top, bottom: Math.max(top + 80, bottom), left: side, right: w - side };
}

export function project(layout, x, y, z) {
  const zn = clamp(z / COURT.width, -0.25, 1.25);
  const depth = 1 - zn * 0.3;
  const mid = (layout.left + layout.right) / 2;
  const half = ((layout.right - layout.left) / 2) * depth;
  const gx = mid - half + (x / COURT.length) * half * 2;
  const gy = layout.bottom - zn * (layout.bottom - layout.top);
  const ppm = ((layout.bottom - layout.top) / 7.1) * (1.08 - zn * 0.3);
  return { x: gx, y: gy - y * ppm, groundY: gy, scale: ppm };
}

export function unproject(layout, sx, sy) {
  let lo = -0.15;
  let hi = 1.15;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const p = project(layout, COURT.length / 2, 0, mid * COURT.width);
    if (p.groundY > sy) lo = mid;
    else hi = mid;
  }
  const z = ((lo + hi) / 2) * COURT.width;
  const a = project(layout, 0, 0, z);
  const b = project(layout, COURT.length, 0, z);
  const xn = (sx - a.x) / ((b.x - a.x) || 1);
  return { x: xn * COURT.length, z };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function poly(ctx, layout, pts, y) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const s = project(layout, p[0], y || 0, p[1]);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
}

function drawCourt(ctx, layout, state) {
  const apron = [
    [-1.1, -0.7],
    [COURT.length + 1.1, -0.7],
    [COURT.length + 1.1, COURT.width + 0.7],
    [-1.1, COURT.width + 0.7],
  ];
  poly(ctx, layout, apron, 0);
  ctx.fillStyle = '#2f9d56';
  ctx.fill();

  const court = [
    [0, 0],
    [COURT.length, 0],
    [COURT.length, COURT.width],
    [0, COURT.width],
  ];
  poly(ctx, layout, court, 0);
  const skin = ctx.createLinearGradient(0, layout.top, 0, layout.bottom);
  skin.addColorStop(0, '#7dffa8');
  skin.addColorStop(1, '#3dce73');
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineWidth = 2;
  const line = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const s = project(layout, p[0], 0.02, p[1]);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
  };
  const sl = COURT.netX - COURT.serviceDepth;
  const sr = COURT.netX + COURT.serviceDepth;
  const mid = COURT.width / 2;
  line([[sl, 0], [sl, COURT.width]]);
  line([[sr, 0], [sr, COURT.width]]);
  line([[sl, mid], [sr, mid]]);
  line([[0, mid], [0.7, mid]]);
  line([[COURT.length, mid], [COURT.length - 0.7, mid]]);

  if (state && (state.stage === 'serve' || state.ball?.serve)) {
    const box = serviceBox(state.match.server, state.serveCourt);
    poly(ctx, layout, [
      [box.x0, box.z0],
      [box.x1, box.z0],
      [box.x1, box.z1],
      [box.x0, box.z1],
    ], 0.03);
    ctx.fillStyle = 'rgba(255, 210, 63, 0.38)';
    ctx.fill();
  }
}

function drawNet(ctx, layout) {
  const far = project(layout, COURT.netX, 0, COURT.width);
  const near = project(layout, COURT.netX, 0, 0);
  const farTop = project(layout, COURT.netX, COURT.netHeight, COURT.width);
  const nearTop = project(layout, COURT.netX, COURT.netHeight, 0);
  const half = Math.max(16, (near.groundY - far.groundY) * 0.03);
  const quad = (inset) => {
    ctx.beginPath();
    ctx.moveTo(far.x - half + inset, far.y);
    ctx.lineTo(farTop.x - half + inset, farTop.y);
    ctx.lineTo(nearTop.x + half - inset, nearTop.y);
    ctx.lineTo(near.x + half - inset, near.y);
    ctx.closePath();
  };
  quad(0);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(43,35,80,0.28)';
  ctx.lineWidth = 1.5;
  const rows = 5;
  for (let i = 1; i < rows; i++) {
    const y = COURT.netHeight * (i / rows);
    const a = project(layout, COURT.netX, y, COURT.width);
    const b = project(layout, COURT.netX, y, 0);
    ctx.beginPath();
    ctx.moveTo(a.x - half, a.y);
    ctx.lineTo(b.x + half, b.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(farTop.x - half, farTop.y);
  ctx.lineTo(nearTop.x + half, nearTop.y);
  ctx.stroke();
  ctx.strokeStyle = '#2b2350';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(far.x - half, far.y);
  ctx.lineTo(farTop.x - half, farTop.y);
  ctx.moveTo(near.x + half, near.y);
  ctx.lineTo(nearTop.x + half, nearTop.y);
  ctx.stroke();
}

function drawKid(ctx, layout, player, time) {
  const feet = project(layout, player.x, 0, player.z);
  const s = Math.max(22, feet.scale * 1.15);
  const face = player.side === 0 ? 1 : -1;
  const shirt = player.side === 0 ? '#ff5fa2' : '#2ec4b6';
  const shorts = player.side === 0 ? '#4d7cff' : '#ff9f43';
  const speed = Math.hypot(player.vx, player.vz);
  const bob = Math.sin(time * 9 + player.side * 2) * Math.min(5, speed * 1.2);
  const step = Math.sin(time * 12 + player.side) * Math.min(1, speed / 4);

  ctx.save();
  ctx.translate(feet.x, feet.y + bob);
  ctx.fillStyle = 'rgba(43, 35, 80, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2, s * 0.42, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2b2350';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, -s * 0.12);
  ctx.lineTo(-s * 0.2 - step * s * 0.1, 0);
  ctx.moveTo(s * 0.12, -s * 0.12);
  ctx.lineTo(s * 0.2 + step * s * 0.1, 0);
  ctx.stroke();
  ctx.fillStyle = '#2b2350';
  ctx.beginPath();
  ctx.ellipse(-s * 0.2 - step * s * 0.1, s * 0.02, s * 0.09, s * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.2 + step * s * 0.1, s * 0.02, s * 0.09, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shirt;
  ctx.lineWidth = Math.max(2, s * 0.055);
  roundRect(ctx, -s * 0.28, -s * 0.7, s * 0.56, s * 0.58, s * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shorts;
  roundRect(ctx, -s * 0.26, -s * 0.28, s * 0.52, s * 0.18, s * 0.06);
  ctx.fill();

  ctx.fillStyle = '#ffd7be';
  ctx.beginPath();
  ctx.arc(0, -s * 1.0, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = player.side === 0 ? '#ff4f98' : '#6d4dff';
  ctx.beginPath();
  if (player.side === 0) {
    ctx.arc(-s * 0.2, -s * 1.1, s * 0.14, 0, Math.PI * 2);
    ctx.arc(0, -s * 1.26, s * 0.16, 0, Math.PI * 2);
    ctx.arc(s * 0.2, -s * 1.1, s * 0.14, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, -s * 1.18, s * 0.34, s * 0.14, 0, Math.PI, Math.PI * 2);
  }
  ctx.fill();

  const blink = Math.sin(time * 1.7 + player.side) > 0.96;
  ctx.fillStyle = '#2b2350';
  if (!blink) {
    ctx.beginPath();
    ctx.arc(-s * 0.11, -s * 1.02, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.11, -s * 1.02, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.095, -s * 1.035, s * 0.018, 0, Math.PI * 2);
    ctx.arc(s * 0.125, -s * 1.035, s * 0.018, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-s * 0.17, -s * 1.02);
    ctx.lineTo(-s * 0.05, -s * 1.02);
    ctx.moveTo(s * 0.05, -s * 1.02);
    ctx.lineTo(s * 0.17, -s * 1.02);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2b2350';
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath();
  ctx.arc(0, -s * 0.94, s * 0.09, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 95, 162, 0.38)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.2, -s * 0.94, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.2, -s * 0.94, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  const swing = player.swinging ? clamp(1 - player.swingT / 0.18, 0, 1) : 0;
  const angle = face * (-1.05 + swing * 2.25);
  ctx.save();
  ctx.translate(face * s * 0.46, -s * 0.42);
  ctx.rotate(angle);
  ctx.strokeStyle = '#d08a3c';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -s * 0.34);
  ctx.stroke();
  ctx.translate(0, -s * 0.48);
  ctx.strokeStyle = player.side === 0 ? '#ffd23f' : '#ff5fa2';
  ctx.lineWidth = Math.max(2, s * 0.055);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.15, s * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, 0);
  ctx.lineTo(s * 0.1, 0);
  ctx.moveTo(0, -s * 0.16);
  ctx.lineTo(0, s * 0.16);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawBall(ctx, layout, ball) {
  const p = project(layout, ball.x, ball.y, ball.z);
  const sh = project(layout, ball.x, 0, ball.z);
  const r = Math.max(7, p.scale * COURT.ballR * 2.3);
  const squash = ball.sinceBounce < 0.12 ? 1 - 0.28 * (1 - ball.sinceBounce / 0.12) : 1;
  ctx.fillStyle = 'rgba(43, 35, 80, 0.2)';
  ctx.beginPath();
  ctx.ellipse(sh.x, sh.y, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1, squash);
  ctx.fillStyle = '#ffe14a';
  ctx.strokeStyle = '#2b2350';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0.6, 2.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.32, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSky(ctx, w, h, time, clouds) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#79d2ff');
  sky.addColorStop(0.55, '#c8f1ff');
  sky.addColorStop(1, '#fff6d4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.86;
  const sunY = h * 0.16;
  ctx.fillStyle = 'rgba(255, 225, 102, 0.35)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe566';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2350';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#b7e38a';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.42);
  ctx.quadraticCurveTo(w * 0.2, h * 0.3, w * 0.4, h * 0.4);
  ctx.quadraticCurveTo(w * 0.62, h * 0.28, w, h * 0.38);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  clouds.forEach((cloud) => {
    const x = ((cloud.x + time * cloud.speed) % (w + 180)) - 90;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(x, cloud.y, cloud.w, cloud.h, 0, 0, Math.PI * 2);
    ctx.ellipse(x + cloud.w * 0.7, cloud.y + 4, cloud.w * 0.7, cloud.h * 0.8, 0, 0, Math.PI * 2);
    ctx.ellipse(x - cloud.w * 0.6, cloud.y + 6, cloud.w * 0.55, cloud.h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  const flags = ['#ff5fa2', '#ffd23f', '#2ec4b6', '#4d7cff'];
  for (let i = 0; i < 8; i++) {
    const x = w * (0.08 + i * 0.12);
    const y = h * 0.34;
    ctx.strokeStyle = '#2b2350';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 28);
    ctx.stroke();
    ctx.fillStyle = flags[i % flags.length];
    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x + 16, y - 22);
    ctx.lineTo(x, y - 16);
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 300;
  let height = 200;
  let layout = viewLayout(width, height);
  const clouds = [
    { x: 40, y: 70, w: 46, h: 18, speed: 12 },
    { x: 280, y: 46, w: 58, h: 20, speed: 8 },
    { x: 520, y: 88, w: 40, h: 16, speed: 16 },
  ];
  const bits = [];
  let celebrated = false;

  function resize(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(2, w);
    height = Math.max(2, h);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = viewLayout(width, height);
    clouds[0].y = height * 0.12;
    clouds[1].y = height * 0.08;
    clouds[2].y = height * 0.16;
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i++) {
      bits.push({
        x, y,
        vx: (Math.random() - 0.5) * 180,
        vy: -40 - Math.random() * 120,
        life: 0.6 + Math.random() * 0.4,
        age: 0,
        color,
      });
    }
  }

  function frame(state, time) {
    drawSky(ctx, width, height, time, clouds);
    drawCourt(ctx, layout, state);

    const sprites = [];
    const netY = project(layout, COURT.netX, 0, COURT.width / 2).groundY;
    sprites.push({ y: netY, draw: () => drawNet(ctx, layout) });
    state.players.forEach((player) => {
      const feet = project(layout, player.x, 0, player.z);
      sprites.push({ y: feet.groundY, draw: () => drawKid(ctx, layout, player, time) });
    });
    if (state.ball) {
      const b = project(layout, state.ball.x, 0, state.ball.z);
      sprites.push({ y: b.groundY + 1, draw: () => drawBall(ctx, layout, state.ball) });
    }
    sprites.sort((a, b) => a.y - b.y);
    sprites.forEach((sprite) => sprite.draw());

    if (state.stage === 'match' && !celebrated) {
      celebrated = true;
      burst(width * 0.35, height * 0.4, '#ff5fa2');
      burst(width * 0.65, height * 0.36, '#ffd23f');
      burst(width * 0.5, height * 0.3, '#2ec4b6');
    }
    if (state.stage !== 'match') celebrated = false;
    for (let i = bits.length - 1; i >= 0; i--) {
      const bit = bits[i];
      bit.age += 1 / 60;
      bit.vy += 280 / 60;
      bit.x += bit.vx / 60;
      bit.y += bit.vy / 60;
      ctx.globalAlpha = Math.max(0, 1 - bit.age / bit.life);
      ctx.fillStyle = bit.color;
      ctx.fillRect(bit.x, bit.y, 7, 7);
      ctx.globalAlpha = 1;
      if (bit.age > bit.life) bits.splice(i, 1);
    }
  }

  return {
    resize,
    frame,
    layout: () => layout,
  };
}
