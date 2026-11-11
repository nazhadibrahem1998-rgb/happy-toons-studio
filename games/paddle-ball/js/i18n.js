/** English and Kurdish (Sorani). */
export const STR = {
  studio: { en: 'Happy Toons Studio', ckb: 'ستۆدیۆی هاپی توونز' },
  title: { en: 'Paddle Ball', ckb: 'تۆپی پەدل' },
  tagline: { en: 'Two paddles. One ball. Faster every hit.', ckb: 'دوو ڕاکێت. یەک تۆپ. هەر لێدانێک خێراتر.' },
  onePlayer: { en: '1 Player vs CPU', ckb: '١ یاریزان دژی کۆمپیوتەر' },
  twoPlayer: { en: '2 Players', ckb: '٢ یاریزان' },
  easy: { en: 'Easy', ckb: 'ئاسان' },
  normal: { en: 'Normal', ckb: 'ئاسایی' },
  hard: { en: 'Hard', ckb: 'قورس' },
  to: { en: 'to', ckb: 'تا' },
  to7: { en: 'First to 7', ckb: 'یەکەم تا ٧' },
  to11: { en: 'First to 11', ckb: 'یەکەم تا ١١' },
  play: { en: 'Play', ckb: 'یاری بکە' },
  how: { en: 'How to play', ckb: 'چۆن یاری بکرێت' },
  rules: {
    en: 'The ball bounces off your paddle. Hitting the edge sends it wide, and the middle sends it straight. Every hit makes the rally faster. First to 7 or 11 points wins.',
    ckb: 'تۆپەکە لە ڕاکێتەکەت دەبێتەوە. لێدانی لای ڕاکێت ئاراستەکە دەباتە لایەکان، و ناوەڕاست ڕاستەوخۆ دەیکات. هەر لێدانێک یارییەکە خێراتر دەکات. یەکەم کە ٧ یان ١١ خاڵ بباتەوە، دەباتەوە.',
  },
  controls: {
    en: 'Drag on your half of the screen. Player 1 can also use A/D or W/S. Player 2 uses the arrow keys.',
    ckb: 'لە نیوەی خۆتی شاشەکە ڕاکێشە. یاریزانی ١ دەتوانێت A/D یان W/S بەکاربهێنێت. یاریزانی ٢ تیرەکان بەکاردەهێنێت.',
  },
  pause: { en: 'Pause', ckb: 'وەستان' },
  resume: { en: 'Resume', ckb: 'بەردەوام بە' },
  restart: { en: 'Restart', ckb: 'دووبارە' },
  sound: { en: 'Sound', ckb: 'دەنگ' },
  on: { en: 'On', ckb: 'کراوە' },
  off: { en: 'Off', ckb: 'کوژاوە' },
  menu: { en: 'Main menu', ckb: 'لیستی سەرەکی' },
  you: { en: 'You', ckb: 'تۆ' },
  cpu: { en: 'CPU', ckb: 'کۆمپیوتەر' },
  p1: { en: 'P1', ckb: 'ی١' },
  p2: { en: 'P2', ckb: 'ی٢' },
  serve: { en: 'Serve', ckb: 'سێرڤ' },
  point: { en: 'Point', ckb: 'خاڵ' },
  match: { en: 'Match', ckb: 'کۆتایی' },
  wins: { en: 'wins', ckb: 'بردیەوە' },
  drag: { en: 'Drag', ckb: 'ڕاکێشە' },
  creditKu: { en: '', ckb: 'دروستکراوە بە یارمەتی زیرەکی دەستکرد' },
  playAgain: { en: 'Play again', ckb: 'دووبارە یاری بکە' },
  paused: { en: 'Paused', ckb: 'وەستاوە' },
  gameOver: { en: 'Game over', ckb: 'یاری تەواو بوو' },
  allGames: { en: 'All games', ckb: 'هەموو یارییەکان' },
};

const DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function t(lang, key) {
  const row = STR[key];
  if (!row) return key;
  return row[lang] || row.en || key;
}

export function digits(lang, value) {
  const text = String(value);
  if (lang !== 'ckb') return text;
  return text.replace(/\d/g, (d) => DIGITS[d] || d);
}
