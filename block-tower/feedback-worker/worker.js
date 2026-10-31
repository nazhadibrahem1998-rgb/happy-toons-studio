/**
 * Optional feedback inbox for بورجی خشت / Block Tower.
 * NOT DEPLOYED. See README.md. Nazhad can deploy this later on his own Cloudflare account.
 *
 * Stores a rating, short text, game version, and an hour-rounded timestamp.
 * Does not read or store IP addresses, user agents, cookies, or device ids.
 * Keys expire after about 12 months.
 */

const ALLOWED_ORIGINS = new Set([
  'https://happytoonsstudio.com',
  'https://www.happytoonsstudio.com',
  'https://nazhadibrahem1998-rgb.github.io',
]);

const YEAR_SECONDS = 60 * 60 * 24 * 365;
const MAX_BODY = 2000;
const GLOBAL_PER_MINUTE = 60;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const PHONE = /(?:\+?\d[\d\s().-]{5,}\d)/g;
const LONG_DIGITS = /\d{6,}/g;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;
const BAD_LATIN = /\b(?:fuck|shit|bitch|asshole|bastard|dick|cunt|slut|whore|piss)\b/gi;
const BAD_LOCAL = ['قحب', 'گەواد', 'گایید'];

function filterText(raw) {
  let text = String(raw == null ? '' : raw).replace(INVISIBLE, '');
  text = text.replace(EMAIL, '').replace(URL, '').replace(PHONE, '').replace(LONG_DIGITS, '');
  text = text.replace(BAD_LATIN, '***');
  for (const word of BAD_LOCAL) {
    if (text.includes(word)) text = text.split(word).join('***');
  }
  text = text.replace(/[ \t]{2,}/g, ' ').trim();
  if (text.length > 500) text = text.slice(0, 500);
  return text;
}

function corsHeaders(request) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

function hourStamp(now) {
  const hour = 60 * 60 * 1000;
  return Math.floor(now / hour) * hour;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== 'POST') return json(request, 405, { ok: false, error: 'method' });

    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.has(origin)) return json(request, 403, { ok: false, error: 'origin' });

    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY) return json(request, 413, { ok: false, error: 'size' });

    let raw;
    try {
      raw = await request.text();
    } catch {
      return json(request, 400, { ok: false, error: 'body' });
    }
    if (raw.length > MAX_BODY) return json(request, 413, { ok: false, error: 'size' });

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json(request, 400, { ok: false, error: 'json' });
    }
    if (!data || typeof data !== 'object') return json(request, 400, { ok: false, error: 'json' });

    const rating = data.rating;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json(request, 400, { ok: false, error: 'rating' });
    }
    if (data.text != null && typeof data.text !== 'string') {
      return json(request, 400, { ok: false, error: 'text' });
    }
    if (typeof data.version !== 'string' || !/^[0-9A-Za-z._-]{1,16}$/.test(data.version)) {
      return json(request, 400, { ok: false, error: 'version' });
    }

    const minute = new Date().toISOString().slice(0, 16);
    const rateKey = `rl:${minute}`;
    const current = Number.parseInt(await env.FEEDBACK.get(rateKey) || '0', 10) || 0;
    if (current >= GLOBAL_PER_MINUTE) return json(request, 429, { ok: false, error: 'rate' });
    await env.FEEDBACK.put(rateKey, String(current + 1), { expirationTtl: 120 });

    const stored = {
      rating,
      text: filterText(data.text || ''),
      version: data.version,
      timestamp: hourStamp(Date.now()),
    };
    const id = crypto.randomUUID();
    await env.FEEDBACK.put(`fb:${stored.timestamp}:${id}`, JSON.stringify(stored), {
      expirationTtl: YEAR_SECONDS,
    });
    return json(request, 201, { ok: true });
  },
};
