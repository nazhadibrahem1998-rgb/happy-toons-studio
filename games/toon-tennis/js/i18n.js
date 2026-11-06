/** English and Kurdish (Sorani) UI strings. */
export const STR = {
  studio: { en: 'Happy Toons Studio', ckb: 'ستۆدیۆی هاپی توونز' },
  title: { en: 'Toon Tennis', ckb: 'تێنسی توون' },
  tagline: { en: 'A sunny rally on a cartoon court.', ckb: 'یارییەکی خۆش لە یاریگایەکی کارتۆنیدا.' },
  onePlayer: { en: '1 Player vs CPU', ckb: '١ یاریزان دژی کۆمپیوتەر' },
  twoPlayer: { en: '2 Players', ckb: '٢ یاریزان' },
  easy: { en: 'Easy', ckb: 'ئاسان' },
  normal: { en: 'Normal', ckb: 'ئاسایی' },
  hard: { en: 'Hard', ckb: 'قورس' },
  games3: { en: 'First to 3', ckb: 'یەکەم تا ٣' },
  games5: { en: 'First to 5', ckb: 'یەکەم تا ٥' },
  play: { en: 'Play', ckb: 'یاری بکە' },
  how: { en: 'How to play', ckb: 'چۆن یاری بکرێت' },
  rules: {
    en: 'Serve into the opposite service box. Then keep the ball inside the lines. The server changes every game. Points go 0, 15, 30, 40, then deuce and advantage.',
    ckb: 'سێرڤ بکە بۆ ناو چوارگۆشەی بەرامبەر. پاشان تۆپەکە لە ناو هێڵەکاندا بهێڵەرەوە. هەر یارییەک سێرڤەر دەگۆڕدرێت. خاڵەکان: ٠، ١٥، ٣٠، ٤٠، پاشان یەکسان و پێشەنگی.',
  },
  edge: {
    en: 'Where the racket meets the ball changes the shot. Off to the side sends it wide, a low hit lobs, and a high hit drives.',
    ckb: 'شوێنی بەرکەوتنی ڕاکێت ئاراستەی تۆپەکە دەگۆڕێت. لایەکان تۆپەکە دەبەنە لایەکان، لێدانی نزم بەرزی دەکاتەوە و لێدانی بەرز خێرای دەکات.',
  },
  controlsP1: { en: 'Player 1: W A S D to move, Space to hit.', ckb: 'یاریزانی ١: W A S D بۆ جوڵان، Space بۆ لێدان.' },
  controlsP2: { en: 'Player 2: arrow keys to move, Enter to hit.', ckb: 'یاریزانی ٢: تیرەکان بۆ جوڵان، Enter بۆ لێدان.' },
  controlsMouse: { en: 'Mouse: move on your half of the court and click to hit.', ckb: 'ماوس: لە نیوەی خۆتدا بجوڵێ و کلیک بکە بۆ لێدان.' },
  controlsTouch: { en: 'Touch: drag your side to move, tap or press Hit to swing.', ckb: 'دەست: لای خۆت ڕاکێشە بۆ جوڵان، دایگرە یان لێدان دابگرە بۆ شەق.' },
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
  fault: { en: 'Fault', ckb: 'هەڵە' },
  doublefault: { en: 'Double fault', ckb: 'دوو هەڵە' },
  let: { en: 'Let — serve again', ckb: 'لێت — دووبارە سێرڤ بکە' },
  out: { en: 'Out', ckb: 'دەرەوە' },
  net: { en: 'Net', ckb: 'تۆڕ' },
  deuce: { en: 'Deuce', ckb: 'یەکسان' },
  adv: { en: 'Advantage', ckb: 'پێشەنگی' },
  advShort: { en: 'Ad', ckb: 'پێش' },
  game: { en: 'Game', ckb: 'یاری' },
  match: { en: 'Match', ckb: 'کۆتایی' },
  point: { en: 'Point', ckb: 'خاڵ' },
  wins: { en: 'wins', ckb: 'بردیەوە' },
  hit: { en: 'Hit', ckb: 'لێدان' },
  drag: { en: 'Drag', ckb: 'ڕاکێشە' },
  rotate: { en: 'Turn your phone sideways', ckb: 'مۆبایلەکەت بخە بە ئاسۆیی' },
  creditKu: { en: '', ckb: 'دروستکراوە بە یارمەتی زیرەکی دەستکرد' },
  playAgain: { en: 'Play again', ckb: 'دووبارە یاری بکە' },
  paused: { en: 'Paused', ckb: 'وەستاوە' },
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

export function pointText(lang, name) {
  if (name === 'deuce') return t(lang, 'deuce');
  if (name === 'adv') return t(lang, 'advShort');
  return digits(lang, name);
}
