import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
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
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixel(x, y, w, h);
      const i = y * (w * 4 + 1) + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
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
    const bg = ny < 0.55 ? [8, 10, 20, 255] : [12, 16, 28, 255];
    const blocks = [
      { x: 0.32, y: 0.62, w: 0.36, h: 0.12, c: [62, 240, 255] },
      { x: 0.38, y: 0.48, w: 0.24, h: 0.1, c: [255, 62, 200] },
      { x: 0.3, y: 0.34, w: 0.4, h: 0.1, c: [198, 255, 74] },
      { x: 0.42, y: 0.2, w: 0.16, h: 0.1, c: [255, 210, 90] },
    ];
    if (nx < pad || nx > 1 - pad || ny < pad || ny > 1 - pad) return bg;
    for (const block of blocks) {
      if (nx >= block.x && nx <= block.x + block.w && ny >= block.y && ny <= block.y + block.h) {
        return [...block.c, 255];
      }
    }
    const mast = nx > 0.47 && nx < 0.53 && ny > 0.16 && ny < 0.78;
    if (mast) return [28, 36, 52, 255];
    return bg;
  });
}

writeFileSync(new URL('./icon-192.png', import.meta.url), icon(192, 0.04));
writeFileSync(new URL('./icon-512.png', import.meta.url), icon(512, 0.04));
writeFileSync(new URL('./icon-512-maskable.png', import.meta.url), icon(512, 0.12));
writeFileSync(new URL('./apple-touch-icon.png', import.meta.url), icon(180, 0.06));
console.log('icons written');
