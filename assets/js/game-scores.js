/* Shared best scores and the daily challenge for Happy Toons games.
   Keys (same scheme for every game):
     hts:best:<gameId>  decimal integer, higher is better
     hts:daily          {"lastDone":"YYYY-MM-DD","streak":n}
   Everything stays on this device. If storage is blocked, the page still runs. */
(function (global) {
  'use strict';

  var BEST = 'hts:best:';
  var DAILY = 'hts:daily';
  var GAMES = [
    { id: 'toonblade', name: 'Toonblade', path: 'game', levels: [2, 3, 4, 5] },
    { id: 'khalifakan', name: 'Khalifakan', path: 'khalifakan', levels: [1, 2, 3, 4] },
    { id: 'block-tower', name: 'Block Tower', path: 'block-tower', levels: [2, 3, 4, 5, 6] },
    { id: 'paddle-ball', name: 'Paddle Ball', path: 'games/paddle-ball', levels: [7, 11] },
    { id: 'sharsten', name: 'Sharsten Village', path: 'sharsten', levels: [1, 2, 3, 4] },
    { id: 'hi-lo-hop', name: 'Hi-Lo Hop', path: 'games/hi-lo-hop', levels: [1, 2, 3] },
  ];
  var LEGACY = { toonblade: 'toonblade_best', 'block-tower': 'bt-highest' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var memory = {};
  var bestCache = {};
  var storeMode = 0;
  var forcedToday = null;
  var styled = false;

  function storage() {
    if (storeMode < 0) return null;
    if (storeMode > 0) return global.localStorage;
    try {
      var bin = global.localStorage;
      if (!bin) throw new Error('none');
      bin.setItem('hts:probe', '1');
      bin.removeItem('hts:probe');
      storeMode = 1;
      return bin;
    } catch (err) {
      storeMode = -1;
      return null;
    }
  }

  function read(key) {
    if (Object.prototype.hasOwnProperty.call(memory, key)) return memory[key];
    var bin = storage();
    if (!bin) return null;
    try {
      var value = bin.getItem(key);
      if (value != null) memory[key] = value;
      return value;
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    memory[key] = String(value);
    var bin = storage();
    if (!bin) return false;
    try {
      bin.setItem(key, String(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function num(raw) {
    var n = Number(raw);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function today() {
    if (forcedToday) return forcedToday;
    try {
      var q = new URLSearchParams(global.location.search).get('htsdate');
      if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    } catch (err) { /* no location */ }
    return formatDate(new Date());
  }

  function setToday(value) {
    forcedToday = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
    return today();
  }

  function prevDate(dateStr) {
    var p = dateStr.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }

  function pretty(dateStr) {
    var p = dateStr.split('-');
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  function hash(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function gameById(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  function targetsFor(id, level) {
    var i;
    var out = [];
    if (id === 'toonblade') {
      if (level <= 2) return [20, 40];
      if (level === 3) return [40, 70];
      if (level === 4) return [60, 100];
      return [80, 140];
    }
    if (id === 'khalifakan') {
      var cap = [0, 3, 6, 10, 11][level] || 3;
      var kills = [2, 3, 5, 8, 11];
      for (i = 0; i < kills.length; i++) if (kills[i] <= cap) out.push(kills[i]);
      return out.length ? out : [cap];
    }
    if (id === 'paddle-ball') {
      var pts = [4, 5, 7, 9, 11];
      for (i = 0; i < pts.length; i++) if (pts[i] <= level) out.push(pts[i]);
      return out.length ? out : [level];
    }
    if (id === 'hi-lo-hop') {
      if (level <= 1) return [10, 20];
      if (level === 2) return [16, 32];
      return [24, 44];
    }
    return [level];
  }

  function levelLabel(id, level) {
    if (id === 'paddle-ball') return 'First to ' + level;
    if (id === 'hi-lo-hop') return level <= 1 ? 'Easy' : level === 2 ? 'Normal' : 'Zippy';
    if (id === 'toonblade') return 'Wave ' + level;
    if (id === 'block-tower') return 'Floor ' + level;
    return 'Stage ' + level;
  }

  function challenge(dateStr) {
    var day = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : today();
    var h = hash('hts-daily-v1|' + day);
    var game = GAMES[h % GAMES.length];
    var level = game.levels[(h >>> 8) % game.levels.length];
    var pool = targetsFor(game.id, level);
    var target = pool[(h >>> 16) % pool.length];
    return {
      date: day,
      id: game.id,
      name: game.name,
      path: game.path,
      level: level,
      levelLabel: levelLabel(game.id, level),
      target: target,
    };
  }

  function readDaily() {
    var raw = read(DAILY);
    if (!raw) return { lastDone: '', streak: 0 };
    try {
      var data = JSON.parse(raw);
      var last = typeof data.lastDone === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.lastDone) ? data.lastDone : '';
      var streak = Math.max(0, Math.floor(Number(data.streak) || 0));
      return { lastDone: last, streak: streak };
    } catch (err) {
      return { lastDone: '', streak: 0 };
    }
  }

  function markDone(dateStr) {
    var data = readDaily();
    if (data.lastDone === dateStr) return data;
    var streak = data.lastDone === prevDate(dateStr) ? data.streak + 1 : 1;
    var next = { lastDone: dateStr, streak: streak };
    write(DAILY, JSON.stringify(next));
    return next;
  }

  function dailyStatus() {
    var data = readDaily();
    var day = today();
    var alive = data.lastDone === day || data.lastDone === prevDate(day);
    return {
      date: day,
      completed: data.lastDone === day,
      streak: alive ? data.streak : 0,
      lastDone: data.lastDone,
      canSave: !!storage(),
    };
  }

  function getBest(id) {
    if (bestCache[id] != null) return bestCache[id];
    var n = num(read(BEST + id));
    if (!read(BEST + id) && LEGACY[id]) {
      var old = num(read(LEGACY[id]));
      if (old > n) {
        n = old;
        write(BEST + id, String(n));
      }
    }
    bestCache[id] = n;
    return n;
  }

  function meets(id, score, level) {
    var ch = challenge(today());
    if (ch.id !== id) return false;
    if (!(score >= ch.target)) return false;
    if (level == null) return true;
    return level >= ch.level;
  }

  function record(id, score, level) {
    var points = Math.max(0, Math.floor(Number(score) || 0));
    var prev = getBest(id);
    var isNew = points > prev;
    if (isNew) {
      bestCache[id] = points;
      write(BEST + id, String(points));
    }
    var done = meets(id, points, level);
    if (done) markDone(today());
    return {
      score: points,
      best: Math.max(prev, points),
      isNew: isNew,
      challengeDone: done,
      canSave: !!storage(),
    };
  }

  function bestLabel(id) {
    var n = getBest(id);
    return 'Best: ' + (n > 0 ? String(n) : '—');
  }

  function note(id) {
    var ch = challenge(today());
    if (!gameById(id) || ch.id !== id) return '';
    return 'Daily challenge: ' + ch.levelLabel + '. Target score: ' + ch.target + '.';
  }

  function paintNote(id, el) {
    if (!el) return;
    var text = note(id);
    el.hidden = !text;
    if (text) el.textContent = text;
  }

  function rel(from, to) {
    var a = String(from || '').split('/').filter(Boolean);
    var b = String(to || '').split('/').filter(Boolean);
    var i = 0;
    var out = [];
    var u;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    for (u = 0; u < a.length - i; u++) out.push('..');
    for (u = i; u < b.length; u++) out.push(b[u]);
    return (out.length ? out.join('/') : '.') + '/';
  }

  function others(id, dateStr) {
    var rest = [];
    var day = dateStr || today();
    var i;
    for (i = 0; i < GAMES.length; i++) if (GAMES[i].id !== id) rest.push(GAMES[i]);
    if (rest.length < 2) return rest;
    var h = hash('hts-more-v1|' + day + '|' + id);
    var i1 = h % rest.length;
    var i2 = (i1 + 1 + ((h >>> 5) % (rest.length - 1))) % rest.length;
    if (i2 === i1) i2 = (i1 + 1) % rest.length;
    return [rest[i1], rest[i2]];
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ensureStyle() {
    if (styled || !global.document) return;
    styled = true;
    var style = global.document.createElement('style');
    style.id = 'hts-score-style';
    style.textContent = [
      '.hts-scoreline{margin:4px 0;font-weight:800}',
      '.hts-new{margin:6px 0;font-weight:900;color:#3a1d00;background:#ffd45e;display:inline-block;padding:4px 12px;border-radius:999px}',
      '.hts-new[hidden]{display:none !important}',
      '.hts-try{margin-top:8px;direction:ltr;text-align:center}',
      '.hts-try p{margin:0 0 6px;font-weight:800}',
      '.hts-try a{display:flex;align-items:center;justify-content:center;width:100%;max-width:280px;min-height:44px;margin:6px auto;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:800;background:#fffaf2;color:#2b2350;border:3px solid #2b2350;touch-action:manipulation}',
    ].join('');
    global.document.head.appendChild(style);
  }

  function showEnd(opts) {
    ensureStyle();
    var score = Math.max(0, Math.floor(Number(opts.score) || 0));
    var best = Math.max(score, Math.floor(Number(opts.best) || 0));
    var isNew = !!opts.isNew && score > 0;
    if (opts.scoreEl) {
      opts.scoreEl.innerHTML = '<p class="hts-scoreline">Score: <b>' + score + '</b></p>'
        + '<p class="hts-scoreline">Best: <b>' + best + '</b></p>'
        + '<p class="hts-new"' + (isNew ? '' : ' hidden') + '>New best!</p>';
    }
    if (opts.tryEl) {
      var list = others(opts.id);
      var html = '<p>Try another game</p>';
      for (var i = 0; i < list.length; i++) {
        html += '<a href="' + rel(opts.from, list[i].path) + '">' + escapeHtml(list[i].name) + '</a>';
      }
      opts.tryEl.className = 'hts-try';
      opts.tryEl.innerHTML = html;
    }
  }

  function mountHub(from) {
    if (!global.document) return;
    var nodes = global.document.querySelectorAll('[data-best-for]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = bestLabel(nodes[i].getAttribute('data-best-for'));
    }
    var box = global.document.getElementById('daily');
    if (!box) return;
    var ch = challenge(today());
    var status = dailyStatus();
    var gameEl = global.document.getElementById('daily-game');
    var goalEl = global.document.getElementById('daily-goal');
    var whenEl = global.document.getElementById('daily-when');
    var statusEl = global.document.getElementById('daily-status');
    var streakEl = global.document.getElementById('daily-streak');
    var saveEl = global.document.getElementById('daily-save');
    var play = global.document.getElementById('daily-play');
    if (whenEl) whenEl.textContent = pretty(ch.date);
    if (gameEl) gameEl.textContent = "Today's game: " + ch.name;
    if (goalEl) goalEl.textContent = 'Level: ' + ch.levelLabel + ' · Target score: ' + ch.target;
    if (statusEl) {
      statusEl.textContent = status.completed ? 'You did it today!' : 'Not done yet. You can do it!';
      statusEl.className = status.completed ? 'hts-done' : 'hts-wait';
    }
    if (streakEl) streakEl.textContent = 'Day streak: ' + status.streak;
    if (saveEl) {
      saveEl.textContent = status.canSave
        ? 'Saved on this device. No account.'
        : "This browser can't save scores. You can still play.";
    }
    if (play) play.href = rel(from || 'games', ch.path) + '?daily=1';
    box.hidden = false;
  }

  global.HappyScores = {
    games: GAMES,
    getBest: getBest,
    record: record,
    bestLabel: bestLabel,
    today: today,
    setToday: setToday,
    challenge: challenge,
    dailyStatus: dailyStatus,
    note: note,
    paintNote: paintNote,
    rel: rel,
    others: others,
    showEnd: showEnd,
    mountHub: mountHub,
  };
})(typeof window !== 'undefined' ? window : globalThis);
