import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, sum]);
}
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x += 1) {
      const [r, g, b, a] = pixel(x, y, w, h);
      const i = y * (w * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function icon(size, pad) {
  return png(size, size, (x, y, w, h) => {
    const nx = x / (w - 1);
    const ny = y / (h - 1);
    if (nx < pad || nx > 1 - pad || ny < pad || ny > 1 - pad) return [95, 168, 58, 255];
    if (ny < 0.42) return [142, 200, 239, 255];
    if (ny > 0.72) return [116, 184, 78, 255];
    const hill = Math.sin(nx * 6) * 0.04;
    if (ny < 0.5 + hill) return [95, 168, 58, 255];
    if (nx > 0.62 && nx < 0.78 && ny > 0.48 && ny < 0.7) return [244, 241, 234, 255];
    if (nx > 0.66 && nx < 0.7 && ny > 0.4 && ny < 0.62) return [244, 241, 234, 255];
    if (nx > 0.3 && nx < 0.48 && ny > 0.56 && ny < 0.72) return [228, 211, 176, 255];
    if (nx > 0.32 && nx < 0.46 && ny > 0.54 && ny < 0.58) return [47, 111, 191, 255];
    return [126, 200, 90, 255];
  });
}
writeFileSync(new URL('./icon-192.png', import.meta.url), icon(192, 0));
writeFileSync(new URL('./icon-512.png', import.meta.url), icon(512, 0));
writeFileSync(new URL('./icon-512-maskable.png', import.meta.url), icon(512, 0.12));
writeFileSync(new URL('./apple-touch-icon.png', import.meta.url), icon(180, 0));
console.log('icons written');
