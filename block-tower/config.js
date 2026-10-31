/** Block Tower configuration. One place for links, unlocks, and the feedback endpoint. */

export const GAME_VERSION = '1.0.0';

/**
 * Feedback POST target. Leave empty until the Cloudflare Worker in
 * feedback-worker/ is deployed. While this is empty the game keeps feedback
 * on the device and does not send it anywhere.
 */
export const FEEDBACK_ENDPOINT = '';

/** Confirmed community links. No X/Twitter account. */
export const COMMUNITY_LINKS = [
  { id: 'website', href: 'https://happytoonsstudio.com', ckb: 'ماڵپەڕی ستۆدیۆ', en: 'Studio website' },
  { id: 'tiktok', href: 'https://www.tiktok.com/@happytoonsstudiok', ckb: 'TikTok', en: 'TikTok' },
  { id: 'email', href: 'mailto:hello@happytoonsstudio.com', ckb: 'ئیمەیڵی پشتیوانی', en: 'Support email' },
  { id: 'youtube', href: 'https://www.youtube.com/@StepWiseSimple', ckb: 'YouTube · StepWise Simple', en: 'YouTube · StepWise Simple' },
];

/** Cosmetic colours and trails. Unlocked by reaching the floor, never by feedback. */
export const COSMETICS = [
  { id: 'cyan', floor: 1, body: '#d5e4f2', accent: '#3ef0ff', trail: null },
  { id: 'magenta', floor: 3, body: '#2c1a2a', accent: '#ff3ec8', trail: null },
  { id: 'lime', floor: 5, body: '#1c2614', accent: '#c6ff4a', trail: '#c6ff4a' },
  { id: 'night', floor: 7, body: '#161822', accent: '#ff3ec8', trail: '#ff3ec8' },
  { id: 'gold', floor: 10, body: '#2a2416', accent: '#ffd25a', trail: '#3ef0ff' },
];
