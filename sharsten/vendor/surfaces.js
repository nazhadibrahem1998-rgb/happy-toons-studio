/**
 * Procedural stone, mud plaster, wood, grass, dirt and water.
 * Drawn in the game. No external texture files.
 */
export function makeSurfaces(THREE) {
  function nse(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function canvas(size, draw, colorSpace) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    draw(c.getContext('2d'), size);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    if (colorSpace && 'colorSpace' in tex) tex.colorSpace = colorSpace;
    return tex;
  }
  function pack(size, albedo, heightAt) {
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) height[y * size + x] = heightAt(x, y, size);
    }
    const map = canvas(size, (g, s) => albedo(g, s, height), THREE.SRGBColorSpace);
    const linear = THREE.NoColorSpace || null;
    const roughnessMap = canvas(size, (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i += 1) {
        const v = Math.floor(50 + height[i] * 170);
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, linear);
    const normalMap = canvas(size, (g, s) => {
      const img = g.createImageData(s, s);
      const h = (ix, iy) => height[(((iy % s) + s) % s) * s + (((ix % s) + s) % s)];
      for (let y = 0; y < s; y += 1) {
        for (let x = 0; x < s; x += 1) {
          const dx = h(x + 1, y) - h(x - 1, y);
          const dy = h(x, y + 1) - h(x, y - 1);
          const nx = -dx * 2.2;
          const ny = -dy * 2.2;
          const nz = 1;
          const len = Math.hypot(nx, ny, nz) || 1;
          const i = (y * s + x) * 4;
          img.data[i] = (nx / len * 0.5 + 0.5) * 255;
          img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
          img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
          img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    }, linear);
    return { map, roughnessMap, normalMap };
  }
  const stone = pack(96, (g, s) => {
    g.fillStyle = '#c8b8a2';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 24) {
      const shift = (y / 24) % 2 ? 16 : 0;
      for (let x = -16; x < s; x += 32) {
        const j = nse(x + shift, y);
        g.fillStyle = j > 0.5 ? '#b7a48c' : '#d5c6b0';
        g.fillRect(x + shift + 1, y + 1, 30, 22);
        g.fillStyle = '#8d7b68';
        g.fillRect(x + shift, y, 32, 1);
        g.fillRect(x + shift, y, 1, 24);
      }
    }
  }, (x, y) => {
    const by = Math.floor(y / 24) * 24;
    const shift = (by / 24) % 2 ? 16 : 0;
    const edge = (x - shift) % 32 < 2 || y % 24 < 2;
    return edge ? 0.15 : 0.45 + nse(x, y) * 0.4;
  });
  const mud = pack(96, (g, s) => {
    g.fillStyle = '#c4a574';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 280; i += 1) {
      const x = Math.floor(nse(i, 3) * s);
      const y = Math.floor(nse(i, 9) * s);
      g.fillStyle = nse(i, 1) > 0.5 ? '#a78458' : '#d4b88a';
      g.fillRect(x, y, 2 + (i % 3), 2);
    }
    g.strokeStyle = '#8d6244';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(8, 20);
    g.lineTo(40, 28);
    g.lineTo(70, 22);
    g.stroke();
  }, (x, y) => 0.35 + nse(x * 0.5, y * 0.5) * 0.5 + (nse(x, y) > 0.92 ? 0.2 : 0));
  const wood = pack(96, (g, s) => {
    g.fillStyle = '#8a5a32';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 1) {
      const band = nse(0, y);
      g.fillStyle = band > 0.65 ? '#6b4226' : band < 0.2 ? '#a56b3c' : '#8d5a32';
      g.fillRect(0, y, s, 1);
    }
    g.fillStyle = '#5a3a22';
    for (let k = 0; k < 5; k += 1) g.fillRect(Math.floor(nse(k, 2) * s), 0, 2, s);
  }, (x, y) => 0.3 + ((y % 7) < 2 ? 0.25 : 0) + nse(x, y) * 0.2);
  const grass = pack(96, (g, s) => {
    g.fillStyle = '#4e9a3a';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 420; i += 1) {
      const x = Math.floor(nse(i, 4) * s);
      const y = Math.floor(nse(i, 8) * s);
      g.fillStyle = nse(i, 2) > 0.7 ? '#d2c06a' : nse(i, 5) > 0.45 ? '#3d7a2e' : '#6cb84c';
      g.fillRect(x, y, 2, 4);
    }
  }, (x, y) => 0.4 + nse(x, y) * 0.45);
  const dirt = pack(96, (g, s) => {
    g.fillStyle = '#8a623c';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i += 1) {
      const x = Math.floor(nse(i, 6) * s);
      const y = Math.floor(nse(i, 11) * s);
      g.fillStyle = nse(i, 1) > 0.5 ? '#6a4a2c' : '#a07848';
      g.fillRect(x, y, 3, 2);
    }
    g.fillStyle = 'rgba(78,154,58,0.35)';
    g.fillRect(0, 0, 6, s);
    g.fillRect(s - 6, 0, 6, s);
  }, (x, y, s) => {
    const edge = x < 6 || x > s - 6 ? 0.2 : 0;
    return 0.35 + nse(x, y) * 0.4 + edge;
  });
  const water = canvas(64, (g, s) => {
    g.fillStyle = '#2f8ec4';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(220,245,255,0.55)';
    g.lineWidth = 2;
    for (let y = 8; y < s; y += 14) {
      g.beginPath();
      g.moveTo(0, y);
      g.quadraticCurveTo(s * 0.5, y - 4, s, y);
      g.stroke();
    }
  }, THREE.SRGBColorSpace);
  return { stone, mud, wood, grass, dirt, water };
}
