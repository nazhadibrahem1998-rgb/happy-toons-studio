/**
 * Local check for the undeployed Worker. No network, no Cloudflare account.
 * Run: node feedback-worker/worker-check.js
 */
import worker from './worker.js';

function kv() {
  const rows = new Map();
  return {
    rows,
    async get(key) {
      const row = rows.get(key);
      if (!row) return null;
      if (row.expires && row.expires < Date.now()) return null;
      return row.value;
    },
    async put(key, value, opts = {}) {
      rows.set(key, {
        value,
        expires: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0,
        ttl: opts.expirationTtl || 0,
      });
    },
  };
}

function post(body, origin, extraHeaders) {
  return new Request('https://feedback.example/feedback', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.50',
      'X-Forwarded-For': '203.0.113.50',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

const store = kv();
const env = { FEEDBACK: store };
const origin = 'https://happytoonsstudio.com';
const good = { rating: 4, text: 'fun tower a@b.co and 07555111222 shit', version: '1.0.0', timestamp: Date.now() };

const ok = await worker.fetch(post(good, origin), env);
const saved = [...store.rows.entries()].find(([key]) => key.startsWith('fb:'));
const record = JSON.parse(saved[1].value);
if (ok.status !== 201) throw new Error('expected 201');
if (record.text.includes('@') || record.text.includes('07555') || !record.text.includes('***')) {
  throw new Error(`filter failed: ${record.text}`);
}
if (record.timestamp % (60 * 60 * 1000) !== 0) throw new Error('timestamp not coarse');
if (saved[1].ttl < 60 * 60 * 24 * 360) throw new Error('ttl too short');
const dumped = JSON.stringify([...store.rows.entries()]);
if (dumped.includes('203.0.113.50')) throw new Error('IP was stored');

const denied = await worker.fetch(post(good, 'https://evil.example'), env);
if (denied.status !== 403) throw new Error('origin should be denied');
const evilHeaders = denied.headers.get('Access-Control-Allow-Origin');
if (evilHeaders) throw new Error('reflected a foreign origin');

const allowedHeaders = ok.headers.get('Access-Control-Allow-Origin');
if (allowedHeaders !== origin) throw new Error('missing allow origin');

const pre = await worker.fetch(new Request('https://feedback.example/feedback', {
  method: 'OPTIONS',
  headers: { Origin: 'https://nazhadibrahem1998-rgb.github.io' },
}), env);
if (pre.status !== 204) throw new Error('preflight');
if (pre.headers.get('Access-Control-Allow-Origin') !== 'https://nazhadibrahem1998-rgb.github.io') {
  throw new Error('github.io origin missing');
}

const bad = await worker.fetch(post({ rating: 9, text: 'no', version: '1.0.0' }, origin), env);
if (bad.status !== 400) throw new Error('bad rating should be 400');

for (let i = 0; i < 70; i++) {
  await worker.fetch(post({ rating: 1, text: 'ok', version: '1.0.0' }, origin), env);
}
const limited = await worker.fetch(post({ rating: 1, text: 'ok', version: '1.0.0' }, origin), env);
if (limited.status !== 429) throw new Error(`expected rate limit, got ${limited.status}`);

console.log('worker check ok', { text: record.text, ttlDays: Math.round(saved[1].ttl / 86400) });
