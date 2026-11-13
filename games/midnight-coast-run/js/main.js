/* Midnight Coast Run — screens, input, save, loop. */
(function () {
  'use strict';

  const Sim = window.Sim;
  const City = window.City;
  const Render = window.Render;
  const audio = window.MCRAudio.create();
  const SAVE_KEY = 'mcr-midnight-coast-v1';
  const SCREENS = [
    'screen-title', 'screen-help', 'screen-settings', 'screen-garage',
    'screen-brief', 'screen-pause', 'screen-summary'
  ];

  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hud = document.getElementById('hud');
  const toast = document.getElementById('toast');

  let save = loadSave();
  let mode = 'title';
  let state = null;
  let returnTo = 'title';
  let briefNight = 1;
  let briefEndless = false;
  let dpr = 1;
  let dprCap = 2;
  let resolvedQuality = 'high';
  let viewW = 1;
  let viewH = 1;
  let last = performance.now();
  let frames = 0;
  let slow = 0;
  let fps = 60;
  let fpsAcc = 0;
  let fpsN = 0;
  const keys = Object.create(null);
  const holds = { left: 0, right: 0, gas: 0, brake: 0, nitro: 0, drift: 0, fire: 0, steer: 0 };
  let padPauseWas = false;
  let toastTimer = 0;
  const hudCache = {};
  const cam = { x: 0, y: 0, angle: -Math.PI / 2, zoom: 1, ready: false, rotating: true };
  const gpWas = { lb: false, rb: false };

  applyAudio();
  bindUi();
  resize();
  setMode('title', 'screen-title');
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && mode === 'play') setMode('pause', 'screen-pause');
  });
  requestAnimationFrame(frame);

  function defaultSave() {
    return Sim.defaultSave();
  }

  function loadSave() {
    const base = defaultSave();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return base;
      base.cash = clampNum(s.cash, 0, 9999999);
      base.unlocked = clampNum(s.unlocked, 1, 12);
      base.endless = !!s.endless;
      base.bestEndless = clampNum(s.bestEndless, 0, 9999999);
      base.bestEndlessDrops = clampNum(s.bestEndlessDrops, 0, 99999);
      base.paint = clampNum(s.paint, 0, Sim.PAINTS.length - 1);
      base.bestStars = {};
      if (s.bestStars) {
        for (let i = 1; i <= Sim.NIGHTS.length; i++) {
          base.bestStars[i] = clampNum(s.bestStars[i] || s.bestStars[String(i)] || 0, 0, 3);
        }
      }
      base.paintsOwned = Array.isArray(s.paintsOwned) ? s.paintsOwned.filter(function (n) { return n >= 0 && n < Sim.PAINTS.length; }) : [0];
      if (base.paintsOwned.indexOf(0) < 0) base.paintsOwned.push(0);
      if (base.paintsOwned.indexOf(base.paint) < 0) base.paint = 0;
      ['engine', 'handling', 'nitro', 'trunk'].forEach(function (k) {
        const max = Sim.UPGRADES[k].max;
        base.upg[k] = clampNum(s.upg && s.upg[k], 0, max);
      });
      if (s.settings) {
        base.settings.music = clampNum(s.settings.music, 0, 100);
        base.settings.sfx = clampNum(s.settings.sfx, 0, 100);
        base.settings.quality = ['auto', 'high', 'medium', 'low'].indexOf(s.settings.quality) >= 0 ? s.settings.quality : 'auto';
        base.settings.shake = s.settings.shake !== false;
        base.settings.touch = ['auto', 'on', 'off'].indexOf(s.settings.touch) >= 0 ? s.settings.touch : 'auto';
        base.settings.camera = s.settings.camera === 'north' ? 'north' : 'rotate';
        base.settings.autoAccel = s.settings.autoAccel !== false;
      }
      base.weaponsOwned = Array.isArray(s.weaponsOwned) ? s.weaponsOwned.filter(function (id) {
        return Sim.WEAPONS.some(function (w) { return w.id === id; });
      }) : [];
      base.wup = {
        dmg: clampNum(s.wup && s.wup.dmg, 0, 3),
        cool: clampNum(s.wup && s.wup.cool, 0, 3),
        energy: clampNum(s.wup && s.wup.energy, 0, 3)
      };
      if (s.stats) {
        base.stats.deliveries = clampNum(s.stats.deliveries, 0, 999999);
        base.stats.nights = clampNum(s.stats.nights, 0, 99999);
        base.stats.near = clampNum(s.stats.near, 0, 999999);
      }
      if (base.unlocked > Sim.NIGHTS.length) base.endless = true;
      return base;
    } catch (err) {
      return base;
    }
  }

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) {}
  }

  function clampNum(v, a, b) {
    const n = Number(v);
    if (!isFinite(n)) return a;
    return Math.max(a, Math.min(b, Math.round(n)));
  }

  function money(n) {
    return '$' + Math.max(0, Math.round(n));
  }

  function starText(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function applyAudio() {
    audio.setMusic((save.settings.music || 0) / 100);
    audio.setSfx((save.settings.sfx || 0) / 100);
  }

  function touchWanted() {
    const t = save.settings.touch;
    if (t === 'on') return true;
    if (t === 'off') return false;
    return (navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(pointer: coarse)').matches;
  }

  function setMode(next, screenId) {
    mode = next;
    for (let i = 0; i < SCREENS.length; i++) {
      document.getElementById(SCREENS[i]).hidden = SCREENS[i] !== screenId;
    }
    hud.hidden = mode !== 'play';
    document.body.classList.toggle('show-touch', mode === 'play' && touchWanted());
    document.body.classList.toggle('auto-go', save.settings.autoAccel !== false);
    if (mode !== 'play') {
      toast.classList.remove('on');
      toast.textContent = '';
      toastTimer = 0;
    }
    if (mode !== 'play') clearTouch();
    if (screenId === 'screen-title') refreshTitle();
    if (screenId === 'screen-settings') renderSettings();
    if (screenId === 'screen-garage') renderGarage();
    if (screenId === 'screen-brief') renderBrief();
    if (screenId === 'screen-summary') renderSummary();
    const active = document.activeElement;
    if (active && active.blur && mode === 'play') active.blur();
  }

  function refreshTitle() {
    const btn = document.getElementById('btn-play');
    const best = document.getElementById('title-best');
    if (save.unlocked <= Sim.NIGHTS.length) {
      const n = Sim.NIGHTS[save.unlocked - 1];
      btn.textContent = save.unlocked === 1 ? 'Play Night 1' : ('Continue · Night ' + save.unlocked);
      const stars = save.bestStars[Math.max(1, save.unlocked - 1)] || 0;
      best.textContent = save.unlocked === 1 ? 'Night 1 is open.' : ('Next up: ' + n.name + (stars ? ' · last stars ' + starText(stars) : ''));
    } else {
      btn.textContent = 'Endless Coast';
      best.textContent = 'Midnight is clear. Best endless ' + money(save.bestEndless);
    }
    if (save.bestEndless > 0 && save.unlocked <= Sim.NIGHTS.length) {
      best.textContent += ' · Endless ' + money(save.bestEndless);
    }
  }

  function openBrief(night, endless) {
    briefEndless = !!endless;
    briefNight = briefEndless ? Sim.NIGHTS.length : Math.max(1, Math.min(night, Math.min(save.unlocked, Sim.NIGHTS.length)));
    returnTo = 'title';
    setMode('brief', 'screen-brief');
  }

  function renderBrief() {
    const kicker = document.getElementById('brief-kicker');
    const name = document.getElementById('brief-name');
    const blurb = document.getElementById('brief-blurb');
    const meta = document.getElementById('brief-meta');
    const stars = document.getElementById('brief-stars');
    const prev = document.getElementById('btn-prev-night');
    const next = document.getElementById('btn-next-night');
    const pips = document.getElementById('night-pips');
    pips.textContent = '';
    if (briefEndless) {
      kicker.textContent = 'After Midnight';
      name.textContent = 'Endless Coast';
      blurb.textContent = 'Every drop adds a little time. The clock still wins. How far can you drive?';
      meta.textContent = 'Starts 10:00 PM · one parcel at a time · best ' + money(save.bestEndless);
      stars.textContent = 'Best ' + (save.bestEndlessDrops || 0);
      prev.hidden = true;
      next.hidden = true;
      return;
    }
    const def = Sim.NIGHTS[briefNight - 1];
    const stats = Sim.carStats(save.upg);
    kicker.textContent = briefNight === Sim.NIGHTS.length ? 'Final night' : ('Night ' + briefNight);
    name.textContent = def.name;
    blurb.textContent = def.blurb;
    const startLabel = Sim.formatClock(def.start * 3600);
    meta.textContent = def.req + ' drops · ' + def.sides + ' side contract' + (def.sides === 1 ? '' : 's') + ' · trunk ' + stats.slots + ' · clock ' + startLabel;
    const got = save.bestStars[briefNight] || 0;
    stars.textContent = got ? starText(got) : 'No stars yet';
    prev.hidden = briefNight <= 1;
    next.hidden = briefNight >= Math.min(save.unlocked, Sim.NIGHTS.length);
    for (let i = 1; i <= Sim.NIGHTS.length; i++) {
      const dot = document.createElement('i');
      if (i < save.unlocked || save.endless) dot.className = 'on';
      if (i === briefNight) dot.className = (dot.className + ' now').trim();
      pips.appendChild(dot);
    }
  }

  function startCurrentBrief() {
    audio.resume();
    if (briefEndless) state = Sim.createEndless(save.upg);
    else state = Sim.createNight(briefNight, save.upg);
    applyLoadout(state);
    clearKeys();
    cam.ready = false;
    setMode('play', null);
  }

  function applyLoadout(st) {
    if (!save.weaponsOwned) save.weaponsOwned = [];
    if (st.nightIndex >= 2 && save.weaponsOwned.indexOf('laser') < 0) save.weaponsOwned.push('laser');
    st.owned = save.weaponsOwned.slice();
    st.wup = {
      dmg: save.wup.dmg || 0,
      cool: save.wup.cool || 0,
      energy: save.wup.energy || 0
    };
    st.energyMax = 100 + st.wup.energy * 30;
    st.energy = st.energyMax;
    if (st.owned.indexOf(st.weapon) < 0) st.weapon = st.owned[0] || 'none';
    st.paintIndex = save.paint;
  }

  function starTotal() {
    let n = 0;
    const b = save.bestStars || {};
    for (const k in b) n += Number(b[k]) || 0;
    return n;
  }

  function renderSettings() {
    document.getElementById('music').value = String(save.settings.music);
    document.getElementById('sfx').value = String(save.settings.sfx);
    document.getElementById('btn-shake').textContent = save.settings.shake ? 'On' : 'Off';
    document.getElementById('btn-shake').classList.toggle('sel', save.settings.shake);
    const camBtn = document.getElementById('btn-camera');
    camBtn.textContent = save.settings.camera === 'north' ? 'North-up' : 'Rotating';
    camBtn.classList.toggle('sel', save.settings.camera !== 'north');
    const gasBtn = document.getElementById('btn-autogas');
    gasBtn.textContent = save.settings.autoAccel ? 'On' : 'Off';
    gasBtn.classList.toggle('sel', !!save.settings.autoAccel);
    fillChips('quality-chips', ['auto', 'high', 'medium', 'low'], save.settings.quality, function (v) {
      save.settings.quality = v;
      if (v === 'high' || v === 'medium' || v === 'low') resolvedQuality = v;
      if (v === 'auto') resolvedQuality = 'high';
      persist();
      resize();
    });
    fillChips('touch-chips', ['auto', 'on', 'off'], save.settings.touch, function (v) {
      save.settings.touch = v;
      persist();
      document.body.classList.toggle('show-touch', mode === 'play' && touchWanted());
      document.body.classList.toggle('auto-go', save.settings.autoAccel !== false);
    });
  }

  function fillChips(id, values, current, onPick) {
    const box = document.getElementById(id);
    box.textContent = '';
    values.forEach(function (v) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (v === current ? ' sel' : '');
      b.textContent = v.charAt(0).toUpperCase() + v.slice(1);
      tap(b, function () { onPick(v); renderSettings(); });
      box.appendChild(b);
    });
  }

  function renderGarage() {
    document.getElementById('garage-cash').textContent = 'Wallet ' + money(save.cash);
    const list = document.getElementById('garage-list');
    list.textContent = '';
    Object.keys(Sim.UPGRADES).forEach(function (key) {
      const spec = Sim.UPGRADES[key];
      const lvl = save.upg[key];
      const row = document.createElement('div');
      row.className = 'up-row';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const title = document.createElement('b');
      title.textContent = spec.name;
      const desc = document.createElement('small');
      desc.textContent = spec.desc + ' · ' + lvl + '/' + spec.max;
      const pips = document.createElement('div');
      pips.className = 'pips';
      for (let i = 0; i < spec.max; i++) {
        const dot = document.createElement('i');
        if (i < lvl) dot.className = 'on';
        pips.appendChild(dot);
      }
      meta.appendChild(title);
      meta.appendChild(desc);
      meta.appendChild(pips);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buy';
      if (lvl >= spec.max) {
        btn.textContent = 'Max';
        btn.classList.add('maxed');
      } else {
        const cost = spec.costs[lvl];
        btn.textContent = money(cost);
        if (save.cash < cost) btn.classList.add('poor');
        tap(btn, function () { buyUpgrade(key); });
      }
      row.appendChild(meta);
      row.appendChild(btn);
      list.appendChild(row);
    });
    const paints = document.getElementById('paint-list');
    paints.textContent = '';
    Sim.PAINTS.forEach(function (p, i) {
      const owned = save.paintsOwned.indexOf(i) >= 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (save.paint === i ? ' sel' : '');
      const dot = document.createElement('i');
      dot.style.background = p.color;
      const label = document.createElement('div');
      label.textContent = owned ? p.name : (p.name + ' ' + money(p.price));
      b.appendChild(dot);
      b.appendChild(label);
      tap(b, function () { buyPaint(i); });
      paints.appendChild(b);
    });
    const wbox = document.getElementById('weapon-list');
    if (!wbox) return;
    wbox.textContent = '';
    const stars = starTotal();
    Sim.WEAPONS.forEach(function (w) {
      const owned = save.weaponsOwned.indexOf(w.id) >= 0;
      const row = document.createElement('div');
      row.className = 'up-row';
      const meta = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = w.name;
      const desc = document.createElement('small');
      desc.textContent = owned ? 'Ready' : (w.cost ? ('$' + w.cost + ' · ' + w.stars + ' stars') : 'Included');
      meta.appendChild(title);
      meta.appendChild(desc);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buy';
      if (owned) {
        btn.textContent = 'Owned';
        btn.classList.add('maxed');
      } else if (stars < w.stars) {
        btn.textContent = w.stars + ' stars';
        btn.classList.add('poor');
      } else if (save.cash < w.cost) {
        btn.textContent = money(w.cost);
        btn.classList.add('poor');
      } else {
        btn.textContent = w.cost ? money(w.cost) : 'Take';
        tap(btn, function () { buyWeapon(w.id); });
      }
      row.appendChild(meta);
      row.appendChild(btn);
      wbox.appendChild(row);
    });
    Object.keys(Sim.WUP).forEach(function (key) {
      const spec = Sim.WUP[key];
      const lvl = save.wup[key] || 0;
      const row = document.createElement('div');
      row.className = 'up-row';
      const meta = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = spec.name;
      const desc = document.createElement('small');
      desc.textContent = spec.desc + ' · ' + lvl + '/' + spec.max;
      meta.appendChild(title);
      meta.appendChild(desc);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buy';
      if (lvl >= spec.max) {
        btn.textContent = 'Max';
        btn.classList.add('maxed');
      } else {
        const cost = spec.costs[lvl];
        btn.textContent = money(cost);
        if (save.cash < cost) btn.classList.add('poor');
        tap(btn, function () { buyWup(key); });
      }
      row.appendChild(meta);
      row.appendChild(btn);
      wbox.appendChild(row);
    });
  }

  function buyWeapon(id) {
    const w = Sim.WEAPONS.filter(function (item) { return item.id === id; })[0];
    if (!w || save.weaponsOwned.indexOf(id) >= 0) return;
    if (starTotal() < w.stars || save.cash < w.cost) {
      showToast('Not yet');
      return;
    }
    save.cash -= w.cost;
    save.weaponsOwned.push(id);
    persist();
    renderGarage();
  }

  function buyWup(key) {
    const spec = Sim.WUP[key];
    const lvl = save.wup[key] || 0;
    if (lvl >= spec.max) return;
    const cost = spec.costs[lvl];
    if (save.cash < cost) return;
    save.cash -= cost;
    save.wup[key] = lvl + 1;
    if (state) applyLoadout(state);
    persist();
    renderGarage();
  }

  function buyUpgrade(key) {
    const spec = Sim.UPGRADES[key];
    const lvl = save.upg[key];
    if (lvl >= spec.max) return;
    const cost = spec.costs[lvl];
    if (save.cash < cost) {
      showToast('Need ' + money(cost));
      return;
    }
    save.cash -= cost;
    save.upg[key] += 1;
    persist();
    renderGarage();
  }

  function buyPaint(i) {
    const p = Sim.PAINTS[i];
    const owned = save.paintsOwned.indexOf(i) >= 0;
    if (!owned) {
      if (save.cash < p.price) {
        showToast('Need ' + money(p.price));
        return;
      }
      save.cash -= p.price;
      save.paintsOwned.push(i);
    }
    save.paint = i;
    if (state) state.paintIndex = i;
    persist();
    renderGarage();
  }

  function renderSummary() {
    if (state && state.result) Sim.applyResult(save, state);
    persist();
    const r = state && state.result ? state.result : {
      cleared: false, endless: false, stars: 0, nightName: 'Run', nightIndex: 1,
      delivered: 0, required: 0, sides: 0, minutesLeft: 0, near: 0, bumps: 0,
      bestCombo: 0, earned: 0, timeBonus: 0, clearBonus: 0, banked: 0, drops: 0
    };
    const kicker = document.getElementById('sum-kicker');
    const title = document.getElementById('sum-title');
    const stars = document.getElementById('sum-stars');
    title.textContent = r.nightName || 'Run';
    if (r.endless) {
      kicker.textContent = 'Clock is up';
      stars.textContent = (r.drops || 0) + ' drops';
    } else if (r.cleared) {
      kicker.textContent = r.nightIndex === Sim.NIGHTS.length ? 'Midnight clear' : 'Night clear';
      stars.textContent = starText(r.stars);
    } else {
      kicker.textContent = 'Midnight';
      title.textContent = 'The clock ran out';
      stars.textContent = starText(0);
    }
    const stats = document.getElementById('sum-stats');
    stats.textContent = '';
    const rows = r.endless ? [
      ['Drops', String(r.drops || 0)],
      ['Score', money(r.banked)],
      ['Near misses', String(r.near || 0)],
      ['Bumps', String(r.bumps || 0)],
      ['Best chain', 'x' + (r.bestCombo || 0)],
      ['Best ever', money(save.bestEndless)]
    ] : [
      ['Delivered', (r.delivered || 0) + '/' + (r.required || 0)],
      ['Side jobs', String(r.sides || 0)],
      ['Time left', Math.floor(r.minutesLeft || 0) + 'm'],
      ['Near misses', String(r.near || 0)],
      ['Bumps', String(r.bumps || 0)],
      ['Best chain', 'x' + (r.bestCombo || 0)]
    ];
    rows.forEach(function (pair) {
      const cell = document.createElement('div');
      cell.className = 'stat';
      const b = document.createElement('b');
      b.textContent = pair[1];
      const s = document.createElement('span');
      s.textContent = pair[0];
      cell.appendChild(b);
      cell.appendChild(s);
      stats.appendChild(cell);
    });
    const pay = document.getElementById('sum-pay');
    pay.textContent = '';
    const lines = r.endless ? [
      ['Run pay', money(r.earned || 0)],
      ['Wallet', money(save.cash)]
    ] : r.cleared ? [
      ['Run pay', money(r.earned || 0)],
      ['Time bonus', money(r.timeBonus || 0)],
      ['Clear bonus', money(r.clearBonus || 0)],
      ['Banked', money(r.banked || 0)],
      ['Wallet', money(save.cash)]
    ] : [
      ['Run pay', money(r.earned || 0)],
      ['Banked partial', money(r.banked || 0)],
      ['Wallet', money(save.cash)]
    ];
    lines.forEach(function (pair, idx) {
      const row = document.createElement('div');
      if (idx === lines.length - 2 || pair[0] === 'Wallet') row.className = 'total';
      const a = document.createElement('span');
      a.textContent = pair[0];
      const b = document.createElement('span');
      b.textContent = pair[1];
      row.appendChild(a);
      row.appendChild(b);
      pay.appendChild(row);
    });
    const next = document.getElementById('btn-sum-next');
    const endlessBtn = document.getElementById('btn-sum-endless');
    const retry = document.getElementById('btn-sum-retry');
    const clearedNight = !r.endless && r.cleared;
    const more = clearedNight && r.nightIndex < Sim.NIGHTS.length;
    next.hidden = !more;
    endlessBtn.hidden = !(clearedNight && r.nightIndex === Sim.NIGHTS.length);
    retry.hidden = !!r.endless;
    if (more) next.textContent = 'Next Night';
    if (!r.cleared && !r.endless) retry.textContent = 'Retry Night';
    else retry.textContent = 'Replay';
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('on');
    toastTimer = 1.6;
  }

  function tap(el, fn) {
    if (!el) return;
    el.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      audio.resume();
      audio.play({ t: 'ui' });
      fn(e);
    });
  }

  function bindStick() {
    const zone = document.getElementById('steer-zone');
    const stick = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    if (!zone) return;
    let pid = null;
    function down(e) {
      if (pid != null || (e.button != null && e.button !== 0)) return;
      pid = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}
      audio.resume();
      move(e);
    }
    function move(e) {
      if (e.pointerId !== pid) return;
      const idle = document.getElementById('steer-idle');
      const ir = idle ? idle.getBoundingClientRect() : zone.getBoundingClientRect();
      const cx = ir.left + ir.width * 0.5;
      const cy = ir.top + ir.height * 0.5;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const mag = Math.hypot(dx, dy) || 1;
      const lim = 54;
      const clamped = Math.min(lim, mag);
      holds.steer = Math.max(-1, Math.min(1, dx / lim));
      stick.hidden = false;
      zone.classList.add('hot');
      stick.style.left = cx + 'px';
      stick.style.top = cy + 'px';
      knob.style.transform = 'translate(' + (dx / mag * clamped) + 'px,' + (dy / mag * clamped) + 'px)';
    }
    function up(e) {
      if (e.pointerId !== pid) return;
      pid = null;
      holds.steer = 0;
      stick.hidden = true;
      zone.classList.remove('hot');
    }
    zone.addEventListener('pointerdown', down);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }

  function bindHold(el, prop) {
    if (!el) return;
    function down(e) {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      holds[prop] += 1;
      el.classList.add('held');
      audio.resume();
    }
    function up(e) {
      holds[prop] = Math.max(0, holds[prop] - 1);
      if (holds[prop] === 0) el.classList.remove('held');
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function clearTouch() {
    holds.left = holds.right = holds.gas = holds.brake = holds.nitro = holds.drift = holds.fire = 0;
    holds.steer = 0;
    ['t-left', 't-right', 't-gas', 't-brake', 't-nitro', 't-drift', 't-fire'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('held');
    });
    const stick = document.getElementById('stick');
    if (stick) stick.hidden = true;
  }

  function clearKeys() {
    for (const k in keys) delete keys[k];
    clearTouch();
  }

  function bindUi() {
    tap(document.getElementById('btn-play'), function () {
      if (save.unlocked > Sim.NIGHTS.length) openBrief(Sim.NIGHTS.length, true);
      else openBrief(save.unlocked, false);
    });
    tap(document.getElementById('btn-nights'), function () {
      const n = Math.min(save.unlocked, Sim.NIGHTS.length);
      openBrief(n, false);
    });
    tap(document.getElementById('btn-garage'), function () {
      returnTo = 'title';
      setMode('garage', 'screen-garage');
    });
    tap(document.getElementById('btn-help'), function () { setMode('help', 'screen-help'); });
    tap(document.getElementById('btn-settings'), function () { setMode('settings', 'screen-settings'); });
    tap(document.getElementById('btn-help-back'), function () { setMode('title', 'screen-title'); });
    tap(document.getElementById('btn-settings-back'), function () { setMode('title', 'screen-title'); });
    tap(document.getElementById('btn-garage-back'), function () {
      if (returnTo === 'summary' && state && state.result) setMode('summary', 'screen-summary');
      else setMode('title', 'screen-title');
    });
    tap(document.getElementById('btn-brief-back'), function () { setMode('title', 'screen-title'); });
    tap(document.getElementById('btn-prev-night'), function () {
      if (!briefEndless && briefNight > 1) { briefNight -= 1; renderBrief(); }
    });
    tap(document.getElementById('btn-next-night'), function () {
      const cap = Math.min(save.unlocked, Sim.NIGHTS.length);
      if (!briefEndless && briefNight < cap) { briefNight += 1; renderBrief(); }
    });
    tap(document.getElementById('btn-start-run'), startCurrentBrief);
    tap(document.getElementById('btn-pause'), function () {
      if (mode === 'play') setMode('pause', 'screen-pause');
    });
    tap(document.getElementById('btn-resume'), function () {
      if (state && state.phase === 'play') setMode('play', null);
    });
    tap(document.getElementById('btn-restart'), function () { retryNight(); });
    tap(document.getElementById('btn-quit'), function () {
      state = null;
      clearKeys();
      setMode('title', 'screen-title');
    });
    tap(document.getElementById('btn-next'), function () {
      if (state && state.phase === 'play') Sim.cycleTarget(state);
    });
    tap(document.getElementById('btn-sum-next'), function () {
      const n = state && state.result ? state.result.nightIndex + 1 : save.unlocked;
      openBrief(n, false);
    });
    tap(document.getElementById('btn-sum-endless'), function () { openBrief(Sim.NIGHTS.length, true); });
    tap(document.getElementById('btn-sum-retry'), retryNight);
    tap(document.getElementById('btn-sum-garage'), function () {
      returnTo = 'summary';
      setMode('garage', 'screen-garage');
    });
    tap(document.getElementById('btn-sum-title'), function () { setMode('title', 'screen-title'); });
    tap(document.getElementById('btn-shake'), function () {
      save.settings.shake = !save.settings.shake;
      persist();
      renderSettings();
    });
    tap(document.getElementById('btn-reset'), function () {
      document.getElementById('reset-confirm').hidden = false;
    });
    tap(document.getElementById('btn-reset-no'), function () {
      document.getElementById('reset-confirm').hidden = true;
    });
    tap(document.getElementById('btn-reset-yes'), function () {
      save = defaultSave();
      persist();
      state = null;
      document.getElementById('reset-confirm').hidden = true;
      applyAudio();
      setMode('title', 'screen-title');
    });
    document.getElementById('music').addEventListener('input', function (e) {
      save.settings.music = Number(e.target.value);
      applyAudio();
      persist();
    });
    document.getElementById('sfx').addEventListener('input', function (e) {
      save.settings.sfx = Number(e.target.value);
      applyAudio();
      persist();
    });
    bindHold(document.getElementById('t-gas'), 'gas');
    bindHold(document.getElementById('t-brake'), 'brake');
    bindHold(document.getElementById('t-nitro'), 'nitro');
    bindHold(document.getElementById('t-drift'), 'drift');
    bindHold(document.getElementById('t-fire'), 'fire');
    tap(document.getElementById('t-swap'), function () { if (state) cycleWeapon(1); });
    tap(document.getElementById('btn-camera'), function () {
      save.settings.camera = save.settings.camera === 'north' ? 'rotate' : 'north';
      cam.ready = false;
      persist();
      renderSettings();
    });
    tap(document.getElementById('btn-autogas'), function () {
      save.settings.autoAccel = !save.settings.autoAccel;
      persist();
      renderSettings();
    });
    bindStick();

    window.addEventListener('pointerdown', function () { audio.resume(); }, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', clearKeys);
  }

  function retryNight() {
    if (!state) { setMode('title', 'screen-title'); return; }
    if (state.endless) state = Sim.createEndless(save.upg);
    else state = Sim.createNight(state.nightIndex || briefNight, save.upg);
    applyLoadout(state);
    clearKeys();
    cam.ready = false;
    setMode('play', null);
  }

  function onKeyDown(e) {
    const block = {
      ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1,
      KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1
    };
    if (block[e.code]) e.preventDefault();
    keys[e.code] = true;
    audio.resume();
    if (e.code === 'Escape') {
      if (mode === 'play') setMode('pause', 'screen-pause');
      else if (mode === 'pause' && state && state.phase === 'play') setMode('play', null);
    }
    if (e.repeat) return;
    if (e.code === 'Tab' && mode === 'play' && state) {
      e.preventDefault();
      Sim.cycleTarget(state);
    }
    if (mode === 'play' && state && e.code === 'KeyQ') cycleWeapon(-1);
    if (mode === 'play' && state && e.code === 'KeyE') cycleWeapon(1);
    if (mode === 'play' && state && /^Digit[1-4]$/.test(e.code)) {
      const slot = Number(e.code.slice(5));
      if (state.owned && state.owned[slot - 1]) state.weapon = state.owned[slot - 1];
    }
    if (e.code === 'Enter' && mode === 'brief') startCurrentBrief();
  }

  function cycleWeapon(dir) {
    if (!state || !state.owned || !state.owned.length) return;
    const i = Math.max(0, state.owned.indexOf(state.weapon));
    state.weapon = state.owned[(i + dir + state.owned.length) % state.owned.length];
  }

  function readInput() {
    let steer = 0;
    if (keys.KeyA || keys.ArrowLeft || holds.left) steer -= 1;
    if (keys.KeyD || keys.ArrowRight || holds.right) steer += 1;
    if (Math.abs(holds.steer || 0) > Math.abs(steer)) steer = holds.steer;
    let gas = (keys.KeyW || keys.ArrowUp || holds.gas) ? 1 : 0;
    let brake = (keys.KeyS || keys.ArrowDown || holds.brake) ? 1 : 0;
    let nitro = !!(keys.Space || holds.nitro);
    let handbrake = !!(keys.ShiftLeft || keys.ShiftRight || keys.ControlLeft || keys.ControlRight || holds.drift);
    let fire = !!(keys.KeyF || holds.fire);
    let cycle = 0;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : null;
      if (pads) {
        for (let i = 0; i < pads.length; i++) {
          const gp = pads[i];
          if (!gp) continue;
          const ax = gp.axes && gp.axes.length ? gp.axes[0] : 0;
          if (Math.abs(ax) > 0.18) steer = Math.max(-1, Math.min(1, ax));
          const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
          const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
          if (gp.buttons[0] && gp.buttons[0].pressed) gas = 1;
          if (lt > 0.05) brake = Math.max(brake, lt);
          if ((gp.buttons[7] && gp.buttons[7].pressed) || (gp.buttons[2] && gp.buttons[2].pressed)) fire = true;
          if (gp.buttons[1] && gp.buttons[1].pressed) handbrake = true;
          if (gp.buttons[3] && gp.buttons[3].pressed) nitro = true;
          const lb = gp.buttons[4] && gp.buttons[4].pressed;
          const rb = gp.buttons[5] && gp.buttons[5].pressed;
          if (lb && !gpWas.lb) cycle -= 1;
          if (rb && !gpWas.rb) cycle += 1;
          gpWas.lb = !!lb;
          gpWas.rb = !!rb;
          const pauseNow = gp.buttons[9] && gp.buttons[9].pressed;
          if (pauseNow && !padPauseWas && mode === 'play') setMode('pause', 'screen-pause');
          padPauseWas = !!pauseNow;
        }
      }
    } catch (err) {}
    const touchDrive = touchWanted() && save.settings.autoAccel && mode === 'play';
    if (touchDrive && brake <= 0 && !keys.KeyS && !keys.ArrowDown) gas = Math.max(gas, 1);
    if (brake > 0) gas = 0;
    return { steer: steer, gas: gas, brake: brake, nitro: nitro, handbrake: handbrake, fire: fire, cycle: cycle };
  }

  function qualityNow() {
    const q = save.settings.quality;
    if (q === 'high' || q === 'medium' || q === 'low') return q;
    return resolvedQuality;
  }

  function resize() {
    viewW = Math.max(1, canvas.clientWidth || window.innerWidth);
    viewH = Math.max(1, canvas.clientHeight || window.innerHeight);
    const q = qualityNow();
    const cap = q === 'low' ? 1 : q === 'medium' ? 1.35 : Math.min(2, dprCap);
    const ratio = Math.min(window.devicePixelRatio || 1, cap);
    dpr = Math.max(1, ratio);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
  }

  function consumeEvents() {
    if (!state || !state.events) return;
    for (let i = 0; i < state.events.length; i++) {
      const ev = state.events[i];
      audio.play(ev);
      if (ev.t === 'bump') showToast('Fender bump. Clock jumped.');
      else if (ev.t === 'trunk') showToast('Trunk is full. Deliver one first.');
      else if (ev.t === 'lowfuel') showToast('Tank is low.');
    }
    state.events.length = 0;
  }

  function syncHud(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toast.classList.remove('on');
    }
    if (mode !== 'play' || !state) return;
    const clock = Sim.formatClock(state.clock);
    const left = Sim.formatLeft(state.clock);
    const danger = (Sim.MIDNIGHT - state.clock) < 1500;
    if (hudCache.clock !== clock) {
      hudCache.clock = clock;
      document.getElementById('clock').textContent = clock;
    }
    document.getElementById('clock').classList.toggle('danger', danger);
    if (hudCache.left !== left) {
      hudCache.left = left;
      document.getElementById('time-left').textContent = left;
    }
    const pay = 'Pay ' + money(state.earned);
    if (hudCache.pay !== pay) {
      hudCache.pay = pay;
      document.getElementById('cash').textContent = pay;
    }
    document.getElementById('fuel-fill').style.width = Math.max(0, Math.min(100, state.fuel)) + '%';
    document.getElementById('nitro-fill').style.width = Math.max(0, Math.min(100, state.nitro)) + '%';
    const energyEl = document.getElementById('energy-fill');
    if (energyEl) {
      const maxE = state.energyMax || 100;
      energyEl.style.width = Math.max(0, Math.min(100, (state.energy || 0) / maxE * 100)) + '%';
    }
    const wname = state.weapon && state.weapon !== 'none' ? (state.overheated ? 'Venting' : state.weapon) : '';
    const wEl = document.getElementById('weapon-name');
    if (wEl && hudCache.wname !== wname) {
      hudCache.wname = wname;
      wEl.textContent = wname ? wname.toUpperCase() : '';
    }
    const driftTxt = state.drifting && state.driftPts > 8 ? ('Drift ' + Math.round(state.driftPts)) : '';
    const dEl = document.getElementById('drift');
    if (dEl && hudCache.drift !== driftTxt) {
      hudCache.drift = driftTxt;
      dEl.textContent = driftTxt;
    }
    let obj = 'Head out';
    if (state.objective) {
      if (state.objective.kind === 'hub') obj = 'Depot · load parcels';
      else if (state.objective.kind === 'side') obj = 'Side · ' + state.objective.name;
      else obj = (state.objective.required ? 'Drop · ' : 'Bonus · ') + state.objective.name;
    }
    if (state.endless) obj = 'Drop ' + (state.endlessDrops + 1) + (state.objective ? ' · ' + state.objective.name : '');
    if (hudCache.obj !== obj) {
      hudCache.obj = obj;
      document.getElementById('objective').textContent = obj;
    }
    let dist = '';
    if (state.objective) {
      const m = Math.max(0, Math.round(Math.hypot(state.objective.x - state.x, state.objective.y - state.y) * 0.28));
      dist = m + ' m';
    }
    if (hudCache.dist !== dist) {
      hudCache.dist = dist;
      document.getElementById('obj-dist').textContent = dist;
    }
    let reqLeft = 0;
    for (let i = 0; i < state.cargo.length; i++) if (state.cargo[i].required) reqLeft++;
    for (let i = 0; i < state.waiting.length; i++) if (state.waiting[i].required) reqLeft++;
    const reqDone = Math.max(0, state.requiredTotal - reqLeft);
    const cargo = state.endless
      ? ('Trunk ' + state.cargo.length + '/' + state.slots)
      : ('Trunk ' + state.cargo.length + '/' + state.slots + ' · ' + reqDone + '/' + state.requiredTotal);
    if (hudCache.cargo !== cargo) {
      hudCache.cargo = cargo;
      document.getElementById('cargo').textContent = cargo;
    }
    const combo = state.combo > 1 ? ('Near miss x' + state.combo) : '';
    if (hudCache.combo !== combo) {
      hudCache.combo = combo;
      document.getElementById('combo').textContent = combo;
    }
  }

  function updateCam(dt) {
    if (!state) { cam.ready = false; return; }
    const rotating = save.settings.camera !== 'north';
    cam.rotating = rotating;
    const look = rotating ? (58 + Math.min(110, Math.max(0, state.speed) * 0.26)) : 0;
    const tx = state.x + Math.cos(state.angle) * look;
    const ty = state.y + Math.sin(state.angle) * look;
    const ta = rotating ? state.angle : 0;
    if (!cam.ready) {
      cam.x = tx;
      cam.y = ty;
      cam.angle = ta;
      cam.zoom = 1;
      cam.ready = true;
    }
    const k = 1 - Math.exp(-dt * 8);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    let da = ta - cam.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    cam.angle += da * k;
    let tz = 1 - Math.min(0.05, Math.abs(state.speed) / 6000);
    if (state.nitroOn) tz -= 0.11;
    cam.zoom += (tz - cam.zoom) * (1 - Math.exp(-dt * 5));
  }

  function frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
    last = now;
    frames++;
    fpsAcc += dt;
    fpsN++;
    if (fpsAcc >= 0.5) {
      fps = fpsN / fpsAcc;
      fpsAcc = 0;
      fpsN = 0;
      if (save.settings.quality === 'auto' && mode === 'play' && frames > 90) {
        if (fps < 48) slow++;
        else slow = Math.max(0, slow - 1);
        if (slow >= 4) {
          if (resolvedQuality === 'high') resolvedQuality = 'medium';
          else if (resolvedQuality === 'medium') resolvedQuality = 'low';
          else dprCap = 1;
          slow = 0;
          resize();
        }
      }
    }
    if (mode === 'play' && state) {
      if (state.phase === 'play' || state.phase === 'celebrate') Sim.step(state, readInput(), dt);
      updateCam(dt);
      consumeEvents();
      if (state.phase === 'summary' && mode === 'play') setMode('summary', 'screen-summary');
    } else if (state && mode !== 'play') {
      updateCam(dt);
    }
    audio.tick();
    const driving = mode === 'play' && state && state.phase === 'play';
    audio.setEngine(driving ? state.speed : 0, driving && state.nitroOn, driving);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const q = qualityNow();
    if (!state || mode === 'title' || mode === 'help' || mode === 'settings') {
      Render.drawTitle(ctx, viewW, viewH, now / 1000, save.paint);
    } else {
      Render.drawWorld(ctx, state, cam, viewW, viewH, now / 1000, q, save.settings);
    }
    syncHud(dt);
    requestAnimationFrame(frame);
  }

  window.MCR = {
    snapshot: function () {
      const s = state;
      return {
        mode: mode,
        phase: s ? s.phase : null,
        celebrating: !!(s && s.phase === 'celebrate'),
        x: s ? s.x : 0,
        y: s ? s.y : 0,
        angle: s ? s.angle : 0,
        speed: s ? s.speed : 0,
        fuel: s ? s.fuel : 0,
        nitro: s ? s.nitro : 0,
        clock: s ? s.clock : 0,
        nightIndex: s ? s.nightIndex : 0,
        nightName: s ? s.nightName : '',
        endless: !!(s && s.endless),
        objective: s && s.objective ? {
          x: s.objective.x, y: s.objective.y, kind: s.objective.kind, name: s.objective.name, required: s.objective.required
        } : null,
        cargo: s ? s.cargo.length : 0,
        delivered: s ? s.delivered : 0,
        cleared: !!(s && s.result && s.result.cleared),
        stars: s && s.result ? s.result.stars : 0,
        wallet: save.cash,
        unlocked: save.unlocked,
        endlessUnlocked: !!save.endless,
        fps: fps,
        quality: qualityNow(),
        audio: audio.state(),
        drone: s && s.drones && s.drones[0] ? { x: s.drones[0].x, y: s.drones[0].y, hp: s.drones[0].hp } : null
      };
    },
    audioState: function () { return audio.state(); },
    place: function (x, y, angle, speed) {
      if (!state) return;
      state.x = x;
      state.y = y;
      state.angle = angle;
      state.speed = speed || 0;
      state.lat = 0;
      cam.ready = false;
      updateCam(1);
    },
    setCamera: function (modeName) {
      save.settings.camera = modeName === 'north' ? 'north' : 'rotate';
      cam.ready = false;
    },
    giveKit: function () {
      save.cash = Math.max(save.cash, 2000);
      save.weaponsOwned = ['laser', 'pulse', 'emp', 'plasma'];
      save.wup = { dmg: 1, cool: 1, energy: 1 };
      if (state) applyLoadout(state);
    },
    debugNight: function (n) {
      state = n ? Sim.createNight(n, save.upg) : Sim.createEndless(save.upg);
      applyLoadout(state);
      cam.ready = false;
      setMode('play', null);
    }
  };
})();
