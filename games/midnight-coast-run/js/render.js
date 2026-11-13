/* Midnight Coast Run — canvas drawing. All art is procedural. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Render = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const City = function () { return root.City; };

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

  function paintOf(index) {
    const paints = root.Sim.PAINTS;
    return paints[index] || paints[0];
  }

  let skyline = null;
  let skylineW = 0;

  function buildSkyline(w) {
    const buildings = [];
    let x = -20;
    let i = 0;
    while (x < w + 40) {
      const bw = 36 + ((i * 47) % 70);
      const bh = 70 + ((i * 83) % 180);
      const windows = [];
      for (let wy = 10; wy < bh - 12; wy += 12) {
        for (let wx = 6; wx < bw - 8; wx += 9) {
          windows.push({ x: wx, y: wy, on: ((i * 13 + wx * 3 + wy) % 7) > 1 });
        }
      }
      buildings.push({
        x: x,
        w: bw,
        h: bh,
        neon: City().NEON[i % City().NEON.length],
        windows: windows,
        sign: (i % 4) === 0
      });
      x += bw + 6 + (i % 3);
      i++;
    }
    skyline = buildings;
    skylineW = w;
  }

  function drawPalm(ctx, x, y, t, scale, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip || 1, 1);
    ctx.rotate(Math.sin(t * 1.3 + x * 0.01) * 0.05);
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(-4 * scale, -46 * scale, 8 * scale, 48 * scale);
    ctx.fillStyle = '#145c32';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate(-1.1 + i * 0.42);
      ctx.beginPath();
      ctx.ellipse(16 * scale, -8 * scale, 22 * scale, 6 * scale, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawTitle(ctx, w, h, t, paintIndex) {
    const paint = paintOf(paintIndex);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#140218');
    g.addColorStop(0.32, '#3a1464');
    g.addColorStop(0.52, '#c43b6e');
    g.addColorStop(0.68, '#ff8a3c');
    g.addColorStop(0.78, '#1a3d6e');
    g.addColorStop(1, '#070814');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 28; i++) {
      const sx = (i * 97) % w;
      const sy = (i * 53) % (h * 0.4);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i));
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 * tw) + ')';
      ctx.fillRect(sx, sy, 2, 2);
    }

    const sunY = h * (h > w ? 0.42 : 0.56);
    const sunX = w * (w > h ? 0.16 : 0.72);
    const rg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, Math.max(w, h) * 0.48);
    rg.addColorStop(0, 'rgba(255,236,190,0.95)');
    rg.addColorStop(0.12, 'rgba(255,170,80,0.55)');
    rg.addColorStop(0.28, 'rgba(255,60,120,0.18)');
    rg.addColorStop(1, 'rgba(255,60,120,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.max(w, h) * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe7b8';
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.min(64, w * 0.07), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#12325f';
    ctx.fillRect(0, sunY, w, h - sunY);
    ctx.strokeStyle = 'rgba(255,196,140,0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = sunY + 12 + i * (h > w ? 16 : 12);
      const sway = Math.sin(t * 1.4 + i) * 16;
      ctx.beginPath();
      ctx.moveTo(sunX - 40 - i * 28, y);
      ctx.lineTo(sunX + 40 + i * 28 + sway, y);
      ctx.stroke();
    }

    if (!skyline || Math.abs(skylineW - w) > 12) buildSkyline(w);
    const base = sunY + 2;
    for (let i = 0; i < skyline.length; i++) {
      const b = skyline[i];
      const bob = Math.sin(t * 0.4 + i) * 1.5;
      ctx.fillStyle = '#14091f';
      ctx.fillRect(b.x, base - b.h + bob, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(b.x, base - b.h + bob, b.w, 6);
      for (let k = 0; k < b.windows.length; k++) {
        const win = b.windows[k];
        const flicker = win.on && Math.sin(t * 3 + k + i) > -0.82;
        ctx.fillStyle = flicker ? (k % 2 ? b.neon : '#f2fbff') : '#1a1028';
        ctx.globalAlpha = flicker ? 0.85 : 0.9;
        ctx.fillRect(b.x + win.x, base - b.h + bob + win.y, 4, 6);
      }
      ctx.globalAlpha = 1;
      if (b.sign) {
        const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * 2 + i));
        ctx.fillStyle = b.neon;
        ctx.globalAlpha = pulse;
        ctx.fillRect(b.x + 6, base - b.h + bob + 16, b.w - 12, 8);
        ctx.globalAlpha = 1;
      }
    }

    drawPalm(ctx, 70, base + 18, t, h < 420 ? 0.95 : 1.35, 1);
    drawPalm(ctx, w - 70, base + 22, t, h < 420 ? 0.95 : 1.35, -1);
    if (w > 700) {
      drawPalm(ctx, 120, base + 18, t + 1, 0.75, 1);
      drawPalm(ctx, w - 130, base + 16, t + 2, 0.8, -1);
    }

    const roadTop = Math.min(h - 8, base + (h > w ? 120 : 78));
    ctx.fillStyle = '#1a1028';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.78, roadTop);
    ctx.lineTo(w * 0.22, roadTop);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = paint.glow;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.22, roadTop);
    ctx.lineTo(0, h);
    ctx.moveTo(w * 0.78, roadTop);
    ctx.lineTo(w, h);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 18]);
    ctx.lineDashOffset = -((t * 140) % 34);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, roadTop);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();
    ctx.setLineDash([]);

    const carX = w * 0.5 + Math.sin(t * 0.6) * Math.min(80, w * 0.08);
    const carY = roadTop + (h - roadTop) * 0.62;
    ctx.save();
    ctx.translate(carX, carY);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = paint.color;
    roundRect(ctx, -22, -12, 44, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#140814';
    roundRect(ctx, -10, -8, 18, 12, 3);
    ctx.fill();
    ctx.fillStyle = paint.glow;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-24, -4, 4, 6);
    ctx.fillRect(20, -4, 4, 6);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawCar(ctx, x, y, angle, paint, scale, steer, cargo) {
    ctx.save();
    ctx.translate(x, y);
    // Sprite nose is local -Y. Physics heading 0 faces +X, so add a quarter turn.
    ctx.rotate(angle + Math.PI / 2);
    ctx.scale(scale || 1, scale || 1);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = paint.glow;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#141018';
    ctx.save();
    ctx.translate(-10, -12);
    ctx.fillRect(-3, -4, 6, 9);
    ctx.restore();
    ctx.save();
    ctx.translate(10, -12);
    ctx.rotate(steer * 0.4);
    ctx.fillRect(-3, -4, 6, 9);
    ctx.restore();
    ctx.fillRect(-13, 8, 6, 9);
    ctx.fillRect(7, 8, 6, 9);
    ctx.fillStyle = paint.color;
    roundRect(ctx, -11, -18, 22, 36, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, -9, -16, 8, 30, 4);
    ctx.fill();
    ctx.fillStyle = '#1a1024';
    roundRect(ctx, -7, -8, 14, 12, 3);
    ctx.fill();
    if (cargo) {
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(-6, 4, 12, 8);
      ctx.strokeStyle = paint.glow;
      ctx.strokeRect(-6, 4, 12, 8);
    }
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(-8, -19, 5, 3);
    ctx.fillRect(3, -19, 5, 3);
    ctx.fillStyle = '#ff4d6a';
    ctx.fillRect(-8, 16, 5, 3);
    ctx.fillRect(3, 16, 5, 3);
    ctx.restore();
  }

  function worldVisible(cam, w, h) {
    const pad = 80;
    return {
      x0: cam.x - pad,
      y0: cam.y - pad,
      x1: cam.x + w / cam.zoom + pad,
      y1: cam.y + h / cam.zoom + pad
    };
  }

  function overlaps(b, v) {
    return b.x < v.x1 && b.x + (b.w || 0) > v.x0 && b.y < v.y1 && b.y + (b.h || 0) > v.y0;
  }

  function drawWorld(ctx, state, cam, viewW, viewH, time, quality, settings) {
    const C = City();
    const zoom = cam.zoom;
    const shakeOn = !settings || settings.shake !== false;
    const shake = shakeOn ? (state.shake || 0) : 0;
    const sx = (Math.sin(time * 40) * shake);
    const sy = (Math.cos(time * 37) * shake);
    const rotating = !!(cam && cam.rotating);
    const rot = rotating ? (-(cam.angle || 0) - Math.PI / 2) : 0;
    const cx = cam && cam.x != null ? cam.x : state.x;
    const cy = cam && cam.y != null ? cam.y : state.y;
    ctx.save();
    ctx.translate(viewW / 2 + sx, viewH / 2 + sy);
    ctx.scale(zoom, zoom);
    if (rot) ctx.rotate(rot);
    ctx.translate(-cx, -cy);

    const reach = Math.hypot(viewW, viewH) / zoom + 160;
    ctx.fillStyle = '#0e1a33';
    ctx.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);

    const v = {
      x0: cx - reach,
      y0: cy - reach,
      x1: cx + reach,
      y1: cy + reach
    };

    ctx.fillStyle = '#0a2748';
    ctx.fillRect(0, Math.max(0, v.y0), C.WATER_X, Math.min(C.WORLD_H, v.y1) - Math.max(0, v.y0));
    if (quality !== 'low') {
      ctx.strokeStyle = 'rgba(120,190,255,0.2)';
      ctx.lineWidth = 2;
      const yStart = Math.max(0, Math.floor(v.y0 / 22) * 22);
      for (let y = yStart; y < Math.min(C.WORLD_H, v.y1); y += 22) {
        const o = Math.sin(time * 1.5 + y * 0.04) * 7;
        ctx.beginPath();
        ctx.moveTo(6, y);
        ctx.lineTo(C.WATER_X - 8, y + o);
        ctx.stroke();
      }
    }
    for (let i = 0; i < C.DECOR.boats.length; i++) {
      const b = C.DECOR.boats[i];
      if (b.y < v.y0 - 40 || b.y > v.y1 + 40) continue;
      const by = b.y + Math.sin(time * 0.8 + b.phase) * 10;
      ctx.fillStyle = '#d7e4f4';
      ctx.beginPath();
      ctx.moveTo(b.x - 16, by);
      ctx.lineTo(b.x + 18, by);
      ctx.lineTo(b.x + 10, by + 8);
      ctx.lineTo(b.x - 10, by + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9fd0ff';
      ctx.beginPath();
      ctx.moveTo(b.x, by);
      ctx.lineTo(b.x, by - 16);
      ctx.stroke();
    }

    ctx.fillStyle = '#c48a62';
    ctx.fillRect(C.WATER_X, Math.max(0, v.y0), C.SAND_X - C.WATER_X, Math.min(C.WORLD_H, v.y1) - Math.max(0, v.y0));

    const half = C.ROAD_W / 2;
    ctx.fillStyle = '#241833';
    for (let i = 0; i < C.XS.length; i++) {
      const x = C.XS[i] - half;
      if (x > v.x1 || x + C.ROAD_W < v.x0) continue;
      ctx.fillRect(x, 0, C.ROAD_W, C.WORLD_H);
    }
    for (let j = 0; j < C.YS.length; j++) {
      const y = C.YS[j] - half;
      if (y > v.y1 || y + C.ROAD_W < v.y0) continue;
      ctx.fillRect(C.SAND_X, y, C.WORLD_W - C.SAND_X - 20, C.ROAD_W);
    }
    ctx.strokeStyle = 'rgba(255,61,138,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < C.XS.length; i++) {
      const x = C.XS[i] - half;
      if (x > v.x1 || x + C.ROAD_W < v.x0) continue;
      ctx.beginPath();
      ctx.moveTo(x + 3, Math.max(0, v.y0));
      ctx.lineTo(x + 3, Math.min(C.WORLD_H, v.y1));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(61,240,255,0.28)';
    for (let i = 0; i < C.XS.length; i++) {
      const x = C.XS[i] + half;
      if (x < v.x0 || x > v.x1) continue;
      ctx.beginPath();
      ctx.moveTo(x - 3, Math.max(0, v.y0));
      ctx.lineTo(x - 3, Math.min(C.WORLD_H, v.y1));
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(244,236,255,0.38)';
    for (let i = 0; i < C.DASHES.length; i++) {
      const d = C.DASHES[i];
      if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }

    if (quality !== 'low') {
      for (let i = 0; i < C.DECOR.palms.length; i++) {
        const p = C.DECOR.palms[i];
        if (p.y < v.y0 - 40 || p.y > v.y1 + 40) continue;
        drawPalm(ctx, p.x, p.y, time, p.scale, 1);
      }
      for (let i = 0; i < C.DECOR.umbrellas.length; i++) {
        const u = C.DECOR.umbrellas[i];
        if (u.y < v.y0 || u.y > v.y1) continue;
        ctx.fillStyle = u.color;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#3a2416';
        ctx.fillRect(u.x - 1, u.y, 2, 16);
      }
    }

    for (let i = 0; i < C.BUILDINGS.length; i++) {
      const b = C.BUILDINGS[i];
      if (b.x > v.x1 || b.x + b.w < v.x0 || b.y > v.y1 || b.y + b.h < v.y0) continue;
      ctx.fillStyle = b.body;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      if (quality !== 'low') {
        const limit = quality === 'medium' ? 18 : 80;
        const count = Math.min(limit, b.windows.length);
        for (let k = 0; k < count; k++) {
          const win = b.windows[k];
          const flicker = win.lit && (quality === 'high' ? Math.sin(time * 2 + k) > -0.9 : true);
          ctx.fillStyle = flicker ? win.color : '#0c0816';
          ctx.fillRect(win.x, win.y, win.w, win.h);
        }
      }
      ctx.fillStyle = '#0c0814';
      ctx.fillRect(b.door.x, b.door.y, b.door.w, b.door.h);
    }

    if (quality !== 'low') {
      ctx.fillStyle = '#d7f7ff';
      for (let i = 0; i < C.DECOR.lamps.length; i++) {
        const l = C.DECOR.lamps[i];
        if (l.x < v.x0 || l.x > v.x1 || l.y < v.y0 || l.y > v.y1) continue;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < C.BOOSTS.length; i++) {
      const b = C.BOOSTS[i];
      if (b.x < v.x0 || b.x > v.x1 || b.y < v.y0 || b.y > v.y1) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      if (!b.vert) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = 'rgba(255,193,77,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(10, 0);
      ctx.lineTo(4, 0);
      ctx.lineTo(4, 14);
      ctx.lineTo(-4, 14);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawRing(ctx, C.HUB.x, C.HUB.y, 78 + Math.sin(time * 3) * 3, 'rgba(125,246,255,0.85)');
    ctx.fillStyle = '#d7f7ff';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PARCEL', C.HUB.x, C.HUB.y - 86);

    if (state.sideOffer) {
      drawRing(ctx, state.sideOffer.x, state.sideOffer.y, 64 + Math.sin(time * 4) * 4, 'rgba(255,211,110,0.9)');
      ctx.fillStyle = '#ffe7a8';
      ctx.fillText('SIDE', state.sideOffer.x, state.sideOffer.y - 74);
    }
    for (let i = 0; i < state.cargo.length; i++) {
      const c = state.cargo[i];
      const col = c.required ? 'rgba(255,77,163,0.95)' : 'rgba(255,211,110,0.95)';
      drawRing(ctx, c.x, c.y, 70 + Math.sin(time * 3.4 + i) * 4, col);
      if (Math.hypot(c.x - state.x, c.y - state.y) < 340) {
        ctx.fillStyle = '#fff';
        ctx.fillText(c.name, c.x, c.y - 80);
      }
    }
    for (let i = 0; i < state.fuels.length; i++) {
      const f = state.fuels[i];
      ctx.fillStyle = '#ffc14d';
      roundRect(ctx, f.x - 10, f.y - 12, 20, 24, 4);
      ctx.fill();
      ctx.fillStyle = '#3a2408';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillText('F', f.x, f.y + 3);
    }
    for (let i = 0; i < state.clocks.length; i++) {
      const f = state.clocks[i];
      ctx.fillStyle = '#7cf6ff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#062028';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText('T', f.x, f.y + 4);
    }

    const paint = paintOf(state.paintIndex || 0);
    if (state.trail && state.trail.length > 1 && quality !== 'low') {
      ctx.strokeStyle = paint.glow;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(state.trail[0].x, state.trail[0].y);
      for (let i = 1; i < state.trail.length; i++) ctx.lineTo(state.trail[i].x, state.trail[i].y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (state.skids && quality !== 'low') {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < state.skids.length; i++) {
        const s = state.skids[i];
        if (s.x1 < v.x0 || s.x1 > v.x1 || s.y1 < v.y0 || s.y1 > v.y1) continue;
        ctx.strokeStyle = 'rgba(30,16,28,' + (0.15 + 0.4 * Math.max(0, s.life) / 2.8) + ')';
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
    }
    if (state.barricades) {
      for (let i = 0; i < state.barricades.length; i++) {
        const b = state.barricades[i];
        if (b.hp <= 0) continue;
        ctx.fillStyle = '#241018';
        ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
        ctx.strokeStyle = '#ff4fd8';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
        ctx.fillStyle = '#7cf6ff';
        const pips = Math.max(1, Math.ceil(b.hp / b.max * 3));
        for (let k = 0; k < pips; k++) ctx.fillRect(b.x - 6 + k * 5, b.y - 2, 3, 4);
      }
    }
    if (state.drones) {
      for (let i = 0; i < state.drones.length; i++) {
        const d = state.drones[i];
        const bob = Math.sin(time * 3 + d.phase) * 4;
        ctx.save();
        ctx.translate(d.x, d.y + bob);
        ctx.rotate(time * 2 + d.phase);
        ctx.globalAlpha = d.stun > 0 && Math.sin(time * 24) > 0 ? 0.35 : 1;
        ctx.fillStyle = '#ff4fd8';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7cf6ff';
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
    if (state.cells) {
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < state.cells.length; i++) {
        const f = state.cells[i];
        ctx.fillStyle = '#b388ff';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#14081f';
        ctx.fillText('E', f.x, f.y + 4);
      }
    }
    if (state.pulses) {
      for (let i = 0; i < state.pulses.length; i++) {
        const p = state.pulses[i];
        ctx.strokeStyle = p.emp ? 'rgba(124,246,255,0.85)' : 'rgba(255,79,216,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (state.orbs) {
      for (let i = 0; i < state.orbs.length; i++) {
        const o = state.orbs[i];
        ctx.fillStyle = '#d9b3ff';
        ctx.beginPath();
        ctx.arc(o.x, o.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7cf6ff';
        ctx.stroke();
      }
    }
    if (state.beam && state.beam.life > 0) {
      ctx.strokeStyle = 'rgba(180,255,255,0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(state.beam.x1, state.beam.y1);
      ctx.lineTo(state.beam.x2, state.beam.y2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,79,216,0.45)';
      ctx.lineWidth = 10;
      ctx.stroke();
    }

    for (let i = 0; i < state.traffic.length; i++) {
      const c = state.traffic[i];
      if (c.x < v.x0 - 40 || c.x > v.x1 + 40 || c.y < v.y0 - 40 || c.y > v.y1 + 40) continue;
      ctx.globalAlpha = c.stall > 0 && Math.sin(time * 28) > 0 ? 0.45 : 1;
      drawCar(ctx, c.x, c.y, c.angle + (c.spin || 0), { color: c.color, glow: c.color }, 0.78, 0, false);
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    drawCar(ctx, state.x, state.y, state.angle, paint, 1, state.steerV || 0, state.cargo && state.cargo.length > 0);

    if (state.nitroOn) {
      const fx = Math.cos(state.angle);
      const fy = Math.sin(state.angle);
      const bx = state.x - fx * 18;
      const by = state.y - fy * 18;
      const len = 18 + Math.sin(time * 42) * 8;
      ctx.fillStyle = '#7cf6ff';
      ctx.beginPath();
      ctx.moveTo(bx - fy * 5, by + fx * 5);
      ctx.lineTo(bx + fy * 5, by - fx * 5);
      ctx.lineTo(bx - fx * len, by - fy * len);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff7ad1';
      ctx.beginPath();
      ctx.moveTo(bx - fy * 3, by + fx * 3);
      ctx.lineTo(bx + fy * 3, by - fx * 3);
      ctx.lineTo(bx - fx * len * 0.55, by - fy * len * 0.55);
      ctx.closePath();
      ctx.fill();
    }

    if (Math.abs(state.speed) > 40 && quality !== 'low') {
      ctx.save();
      ctx.translate(state.x, state.y);
      ctx.rotate(state.angle);
      const hg = ctx.createLinearGradient(0, 0, 70, 0);
      hg.addColorStop(0, 'rgba(220,250,255,0.28)');
      hg.addColorStop(1, 'rgba(220,250,255,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(12, -6);
      ctx.lineTo(78, -28);
      ctx.lineTo(78, 28);
      ctx.lineTo(12, 6);
      ctx.fill();
      ctx.restore();
    }

    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < state.popups.length; i++) {
      const p = state.popups[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (state.flash * 0.18) + ')';
      ctx.fillRect(0, 0, viewW, viewH);
    }

    const west = ctx.createLinearGradient(0, 0, Math.min(220, viewW * 0.3), 0);
    west.addColorStop(0, state.weather === 'midnight' ? 'rgba(40,60,140,0.18)' : 'rgba(255,120,60,0.16)');
    west.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = west;
    ctx.fillRect(0, 0, viewW, viewH);

    if (quality !== 'low') {
      const vg = ctx.createRadialGradient(viewW / 2, viewH / 2, viewW * 0.25, viewW / 2, viewH / 2, viewW * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(8,0,16,0.42)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    if (state.rain && quality !== 'low') {
      ctx.strokeStyle = 'rgba(190,220,255,0.28)';
      ctx.lineWidth = 1;
      const drops = quality === 'high' ? 70 : 36;
      for (let i = 0; i < drops; i++) {
        const x = (i * 97 + time * 320) % (viewW + 40) - 20;
        const y = (i * 53 + time * 520) % (viewH + 40) - 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 14);
        ctx.stroke();
      }
    }

    if (Math.abs(state.speed) > 150 && quality !== 'low') {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      const n = quality === 'high' ? 14 : 8;
      for (let i = 0; i < n; i++) {
        const y = (i + 0.5) * (viewH / n);
        const len = 20 + (Math.abs(state.speed) - 150) * 0.4;
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(8 + len, y);
        ctx.moveTo(viewW - 8, y + 6);
        ctx.lineTo(viewW - 8 - len, y + 6);
        ctx.stroke();
      }
    }

    drawMinimap(ctx, state, viewW, viewH);
    drawArrow(ctx, state, viewW, viewH, cam);
  }

  function drawRing(ctx, x, y, r, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawMinimap(ctx, state, viewW, viewH) {
    const C = City();
    const portrait = viewH > viewW;
    const mw = portrait ? 92 : 118;
    const mh = portrait ? 112 : 142;
    const mx = viewW - mw - (portrait ? 10 : 14);
    const my = portrait ? 78 : 64;
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,22,0.72)';
    roundRect(ctx, mx, my, mw, mh, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();
    const sx = mw / C.WORLD_W;
    const sy = mh / C.WORLD_H;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, mx, my, mw, mh, 10);
    ctx.clip();
    ctx.fillStyle = '#12325a';
    ctx.fillRect(mx, my, C.WATER_X * sx, mh);
    ctx.fillStyle = '#3a2a44';
    const half = C.ROAD_W / 2;
    for (let i = 0; i < C.XS.length; i++) {
      ctx.fillRect(mx + (C.XS[i] - half) * sx, my, C.ROAD_W * sx, mh);
    }
    for (let j = 0; j < C.YS.length; j++) {
      ctx.fillRect(mx, my + (C.YS[j] - half) * sy, mw, C.ROAD_W * sy);
    }
    function dot(x, y, color, r) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx + x * sx, my + y * sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    dot(C.HUB.x, C.HUB.y, '#7cf6ff', 3);
    if (state.objective) dot(state.objective.x, state.objective.y, '#ff4fd8', 3.5);
    for (let i = 0; i < state.fuels.length; i++) dot(state.fuels[i].x, state.fuels[i].y, '#ffc14d', 2);
    dot(state.x, state.y, '#ffffff', 3);
    ctx.restore();
    ctx.restore();
  }

  function worldToScreen(wx, wy, cam, viewW, viewH) {
    const dx = wx - (cam.x != null ? cam.x : 0);
    const dy = wy - (cam.y != null ? cam.y : 0);
    const rot = cam.rotating ? (-(cam.angle || 0) - Math.PI / 2) : 0;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const z = cam.zoom || 1;
    return {
      x: viewW / 2 + (dx * c - dy * s) * z,
      y: viewH / 2 + (dx * s + dy * c) * z
    };
  }

  function headingVector(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  function drawArrow(ctx, state, viewW, viewH, cam) {
    if (!state.objective || state.phase !== 'play') return;
    const zoom = cam.zoom || 1;
    const origin = worldToScreen(state.x, state.y, cam, viewW, viewH);
    const target = worldToScreen(state.objective.x, state.objective.y, cam, viewW, viewH);
    const sx = target.x;
    const sy = target.y;
    const margin = 36;
    let ax = sx;
    let ay = sy;
    const off = sx < margin || sy < margin || sx > viewW - margin || sy > viewH - margin;
    if (off) {
      const cx = viewW / 2;
      const cy = viewH / 2;
      const dx = sx - cx;
      const dy = sy - cy;
      const scale = Math.min(
        (viewW / 2 - margin) / Math.abs(dx || 0.001),
        (viewH / 2 - margin) / Math.abs(dy || 0.001)
      );
      ax = cx + dx * scale;
      ay = cy + dy * scale;
    } else return;
    const ang = Math.atan2(ay - origin.y, ax - origin.x);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = state.objective.required === false && state.objective.kind === 'side' ? '#ffd36e' : '#ff4fd8';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return {
    drawTitle: drawTitle,
    drawWorld: drawWorld,
    drawCar: drawCar,
    worldToScreen: worldToScreen,
    headingVector: headingVector
  };
});
