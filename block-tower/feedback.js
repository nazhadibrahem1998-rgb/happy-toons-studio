/**
 * Optional anonymous feedback.
 * Collects a rating, short text, the game version, and an hour-rounded time.
 * Never asks for a name, email, phone, location, or device id.
 * While FEEDBACK_ENDPOINT is empty, items stay in localStorage and are not sent.
 */
import { FEEDBACK_ENDPOINT, GAME_VERSION } from './config.js';

const QUEUE_KEY = 'bt-feedback-queue';
const MAX_TEXT = 500;
const MAX_QUEUE = 20;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const PHONE = /(?:\+?\d[\d\s().-]{5,}\d)/g;
const LONG_DIGITS = /\d{6,}/g;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;
const BAD_LATIN = /\b(?:fuck|shit|bitch|asshole|bastard|dick|cunt|slut|whore|piss)\b/gi;
const BAD_LOCAL = ['قحب', 'گەواد', 'گایید'];

export function filterText(raw) {
  let text = String(raw == null ? '' : raw).replace(INVISIBLE, '');
  const original = text;
  text = text.replace(EMAIL, '').replace(URL, '').replace(PHONE, '').replace(LONG_DIGITS, '');
  const stripped = text !== original;
  text = text.replace(BAD_LATIN, '***');
  for (const word of BAD_LOCAL) {
    if (text.includes(word)) text = text.split(word).join('***');
  }
  text = text.replace(/[ \t]{2,}/g, ' ').replace(/\s+\n/g, '\n').trim();
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
  return { text, stripped };
}

export function coarseTimestamp(now = Date.now()) {
  const hour = 60 * 60 * 1000;
  return Math.floor(now / hour) * hour;
}

function readQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueue(item) {
  const queue = readQueue();
  queue.push({
    rating: item.rating,
    text: item.text,
    version: item.version,
    timestamp: item.timestamp,
  });
  while (queue.length > MAX_QUEUE) queue.shift();
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue;
}

export function buildPayload(rating, rawText) {
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) return null;
  const filtered = filterText(rawText);
  return {
    payload: {
      rating: score,
      text: filtered.text,
      version: GAME_VERSION,
      timestamp: coarseTimestamp(),
    },
    stripped: filtered.stripped,
  };
}

/**
 * Store or send one note. Returns { ok, queued, sent, stripped, reason }.
 * Does not grant cosmetics, points, or any other reward.
 */
export async function submitFeedback(rating, rawText) {
  const built = buildPayload(rating, rawText);
  if (!built) return { ok: false, reason: 'rating' };
  const { payload, stripped } = built;
  if (!FEEDBACK_ENDPOINT) {
    enqueue(payload);
    return { ok: true, queued: true, sent: false, stripped };
  }
  try {
    const res = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('status');
    return { ok: true, queued: false, sent: true, stripped };
  } catch {
    enqueue(payload);
    return { ok: true, queued: true, sent: false, stripped };
  }
}
