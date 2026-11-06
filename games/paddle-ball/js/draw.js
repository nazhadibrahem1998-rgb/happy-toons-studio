/** Bird's-eye neon court: two glowing paddles and one ball. */
import { COURT } from './sim.js';

export function viewLayout(w, h) {
  const portrait = h >= w;
  const hud = Math.max(58, h * 0.08);
  const margin = Math.max(14, Math.min(w, h) * 0.04);
  const availW = Math.max(40, w - margin * 2);
  const availH = Math.max(40, h - hud - margin);
  const aspect = portrait ? COURT.width / COURT.length : COURT.length / COURT.width;
  let cw = availW;
  let ch = cw / aspect;
  if (ch > availH) {
    ch = availH;
    cw = ch * aspect;
  }
  const left = (w - cw) / 2;
  const top = hud + (h - hud - ch) / 2;
  return {
    w, h, portrait, left, top, cw, ch,
    right: left + cw,
    bottom: top + ch,
  };
}

export function project(layout, x, y) {
  if (layout.portrait) {
    return {
      x: layout.left + (x / COURT.width) * layout.cw,
      y: layout.bottom - (y / COURT.length) * layout.ch,
    };
  }
  return {
    x: layout.left + (y / COURT.length) * layout.cw,
    y: layout.bottom - (x / COURT.width) * layout.ch,
  };
}

export function unproject(layout, sx, sy) {
  if (layout.portrait) {
    return {
      x: ((sx - layout.left) / layout.cw) * COURT.width,
      y: ((layout.bottom - sy) / layout.ch) * COURT.length,
    };
  }
  return {
    y: ((sx - layout.left) / layout.cw) * COURT.length,
    x: ((layout.bottom - sy) / layout.ch) * COURT.width,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function paddleRect(layout, paddle) {
  const halfW = paddle.w / 2;
  const halfH = paddle.h / 2;
  const a = project(layout, paddle.x - halfW, paddle.y - halfH);
  const b = project(layout, paddle.x + halfW, paddle.y + halfH);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

function drawCourt(ctx, layout) {
  const { left, top, cw, ch } = layout;
  ctx.save();
  ctx.shadowColor = 'rgba(92, 225, 255, 0.45)';
  ctx.shadowBlur = 18;
  roundRect(ctx, left, top, cw, ch, 18);
  const fill = ctx.createLinearGradient(left, top, left + cw, top + ch);
  fill.addColorStop(0, '#2a1868');
  fill.addColorStop(1, '#3a1d78');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7af0ff';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, left, top, cw, ch, 18);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 95, 162, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  if (layout.portrait) {
    const mid = project(layout, 0, COURT.length / 2);
    const mid2 = project(layout, COURT.width, COURT.length / 2);
    ctx.moveTo(mid.x, mid.y);
    ctx.lineTo(mid2.x, mid2.y);
  } else {
    const mid = project(layout, 0, COURT.length / 2);
    const mid2 = project(layout, COURT.width, COURT.length / 2);
    ctx.moveTo(mid.x, mid.y);
    ctx.lineTo(mid2.x, mid2.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.9)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function drawPaddle(ctx, layout, paddle) {
  const box = paddleRect(layout, paddle);
  const color = paddle.side === 0 ? '#ff9f43' : '#4d7cff';
  const glow = paddle.side === 0 ? 'rgba(255, 159, 67, 0.45)' : 'rgba(77, 124, 255, 0.5)';
  ctx.fillStyle = glow;
  roundRect(ctx, box.x - 8, box.y - 8, box.w + 16, box.h + 16, 16);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fffaf2';
  ctx.lineWidth = 3;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  roundRect(ctx, box.x + box.w * 0.18, box.y + 4, box.w * 0.64, Math.max(3, box.h * 0.28), 6);
  ctx.fill();
}

function drawBall(ctx, layout, ball, trail) {
  trail.forEach((p, i) => {
    const s = project(layout, p.x, p.y);
    const t = (i + 1) / trail.length;
    ctx.fillStyle = `rgba(255, 225, 74, ${0.08 + t * 0.28})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4 + t * 7, 0, Math.PI * 2);
    ctx.fill();
  });
  const p = project(layout, ball.x, ball.y);
  const radius = Math.max(8, Math.min(layout.cw, layout.ch) * 0.018);
  ctx.fillStyle = 'rgba(255, 225, 74, 0.35)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe14a';
  ctx.strokeStyle = '#2b2350';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(p.x - radius * 0.3, p.y - radius * 0.3, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 320;
  let height = 480;
  let layout = viewLayout(width, height);
  const trail = [];
  const stars = Array.from({ length: 28 }, (_, i) => ({
    x: (i * 47) % 1000,
    y: (i * 83) % 800,
    r: 1 + (i % 3),
  }));

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
  }

  function frame(state) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#140e36');
    sky.addColorStop(1, '#2a1458');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    stars.forEach((star) => {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc((star.x / 1000) * width, (star.y / 800) * height, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255, 95, 162, 0.18)';
    ctx.beginPath();
    ctx.arc(width * 0.12, height * 0.2, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(46, 196, 182, 0.16)';
    ctx.beginPath();
    ctx.arc(width * 0.86, height * 0.78, 90, 0, Math.PI * 2);
    ctx.fill();

    drawCourt(ctx, layout);
    state.paddles.forEach((paddle) => drawPaddle(ctx, layout, paddle));
    if (state.ball) {
      if (state.ball.inPlay) {
        trail.push({ x: state.ball.x, y: state.ball.y });
        if (trail.length > 14) trail.shift();
      } else {
        trail.length = 0;
      }
      drawBall(ctx, layout, state.ball, trail);
    }
  }

  return { resize, frame, layout: () => layout };
}
