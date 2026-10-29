/* Render Toonblade store covers and supporter wallpapers.
   © 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.
   Usage: node supporter-pack/render.mjs [wallpaper-output-dir] */
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const gameDir = join(root, 'game');
const wallpaperDir = process.argv[2] || '/tmp/toonblade-wallpapers';
const previewDir = join(here, 'previews');
const assetDir = join(root, 'crazygames', 'assets');

const COPY = '© 2026 Nazhad Ibrahem – Happy Toons Studio';

function layout(kind, w, h) {
  const portrait = h > w * 1.12;
  const square = !portrait && Math.abs(w - h) < 80;
  if (kind === 'hero') {
    if (portrait) return { menu: true, cam: [0.35, 1.55, 4.15], look: [0, 1.2, 0], heroYaw: 0.05 };
    return { menu: true, cam: [0.85, 1.65, 4.7], look: [0, 1.15, 0], heroYaw: 0.2 };
  }
  if (kind === 'boss') {
    if (portrait) {
      return {
        hero: { x: -0.15, z: 1.55, facing: 0.05 },
        actors: [{ type: 'king', x: 0.72, z: -1.15, facing: -0.15 }],
        cam: [0.35, 2.35, 6.6], look: [0.15, 1.7, 0.1],
      };
    }
    return {
      hero: { x: -2.05, z: 0.15, facing: 0.22 },
      actors: [{ type: 'king', x: 1.85, z: -0.05, facing: -0.28 }],
      cam: [0.15, 2.15, 7.6], look: [0, 1.55, 0.05],
    };
  }
  if (kind === 'archers') {
    if (portrait) {
      // Archers stand in front, one on each side, so both bows read on a tall frame.
      return {
        hero: { x: 0, z: -0.25, facing: 0.02 },
        actors: [
          { type: 'archer', x: -1.28, z: 1.45, facing: 0.48 },
          { type: 'archer', x: 1.32, z: 1.15, facing: -0.42 },
        ],
        cam: [0.05, 2.85, 7.5],
        look: [0.02, 1.15, 0.4],
      };
    }
    return {
      hero: { x: -0.15, z: 0.35, facing: 0.02 },
      actors: [
        { type: 'archer', x: -2.15, z: 1.55, facing: 0.5 },
        { type: 'archer', x: 2.05, z: 1.35, facing: -0.46 },
      ],
      cam: [0.15, 2.4, 8.2],
      look: [0, 1.2, 0.7],
    };
  }
  const tight = square || portrait;
  return {
    attack: true,
    hero: { x: tight ? -0.15 : -0.45, z: tight ? 1.15 : 1.35, facing: 0.15 },
    actors: [
      { type: 'goblin', x: tight ? 1.05 : 1.45, z: tight ? 0.85 : 1.15, facing: -0.4 },
      { type: 'skeleton', x: tight ? -1.25 : -1.85, z: tight ? 0.35 : 0.55, facing: 0.55 },
      { type: 'brute', x: tight ? 0.85 : 1.7, z: tight ? -1.15 : -0.85, facing: -0.15 },
    ],
    cam: square ? [0.15, 2.45, 6.5] : portrait ? [0.1, 2.55, 6.7] : [0.25, 2.3, 8.0],
    look: [0.1, 1.25, 0.35],
  };
}

const JOBS = [
  { scene: 'boss', w: 1920, h: 1080, title: 'TOONBLADE', kicker: '', copy: false, out: join(assetDir, 'crazygames-landscape-1920x1080.png'), titleAt: 'top' },
  { scene: 'archers', w: 800, h: 1200, title: 'TOONBLADE', kicker: '', copy: false, out: join(assetDir, 'crazygames-portrait-800x1200.png'), titleAt: 'top' },
  { scene: 'melee', w: 800, h: 800, title: 'TOONBLADE', kicker: '', copy: false, out: join(assetDir, 'crazygames-square-800x800.png'), titleAt: 'bottom' },
  { scene: 'boss', w: 630, h: 500, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(assetDir, 'itch-cover-630x500.png'), titleAt: 'bottom' },
  { scene: 'boss', w: 1920, h: 1080, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '01-skeleton-king-1920x1080.png'), titleAt: 'top', preview: '01-skeleton-king-desktop.png' },
  { scene: 'boss', w: 1080, h: 1920, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '01-skeleton-king-1080x1920.png'), titleAt: 'top', preview: '01-skeleton-king-phone.png' },
  { scene: 'archers', w: 1920, h: 1080, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '02-goblin-archers-1920x1080.png'), titleAt: 'top', preview: '02-goblin-archers-desktop.png' },
  { scene: 'archers', w: 1080, h: 1920, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '02-goblin-archers-1080x1920.png'), titleAt: 'top', preview: '02-goblin-archers-phone.png' },
  { scene: 'melee', w: 1920, h: 1080, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '03-arena-fight-1920x1080.png'), titleAt: 'bottom', preview: '03-arena-fight-desktop.png' },
  { scene: 'melee', w: 1080, h: 1920, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '03-arena-fight-1080x1920.png'), titleAt: 'top', preview: '03-arena-fight-phone.png' },
  { scene: 'hero', w: 1920, h: 1080, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '04-lang-1920x1080.png'), titleAt: 'bottom', preview: '04-lang-desktop.png' },
  { scene: 'hero', w: 1080, h: 1920, title: 'TOONBLADE', kicker: 'HAPPY TOONS', copy: true, out: join(wallpaperDir, '04-lang-1080x1920.png'), titleAt: 'top', preview: '04-lang-phone.png' },
];

function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' };
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      let path = normalize(join(dir, decodeURIComponent(url.pathname)));
      if (!path.startsWith(dir)) { res.writeHead(403); res.end(); return; }
      if (url.pathname.endsWith('/')) path = join(path, 'index.html');
      try {
        const body = readFileSync(path);
        res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(body);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function pose(page, scene) {
  await page.evaluate((scene) => {
    const g = window.__game;
    const hide = () => {
      for (const id of ['hud', 'touch', 'start', 'over', 'pause', 'loading', 'banner']) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      }
      const boss = document.getElementById('bossBar');
      if (boss) boss.classList.add('hidden');
    };
    const aim = () => {
      g.camera.position.set(scene.cam[0], scene.cam[1], scene.cam[2]);
      g.camera.lookAt(scene.look[0], scene.look[1], scene.look[2]);
      g.camera.updateProjectionMatrix();
    };
    const fit = (e) => {
      const s = e.type === 'king' ? 2.2 : e.type === 'brute' ? 1.7 : 1;
      e.g.root.scale.setScalar(s);
    };
    if (scene.menu) {
      hide();
      g.freeze(true);
      const hero = g.scene.children.find((o) => o.position === g.player.pos);
      if (hero) {
        hero.rotation.y = scene.heroYaw || 0;
        hero.traverse((o) => { if (o.isSprite) o.visible = false; });
      }
      aim();
      g.renderer.render(g.scene, g.camera);
      return;
    }
    if (g.state !== 'play') g.startGame();
    g.clearArena();
    g.step(4, 1 / 60);
    const spawned = scene.actors.map((a) => g.spawnAt(a.type, a.x, a.z));
    g.step(8, 1 / 60);
    const heroPos = scene.hero;
    g.player.pos.set(heroPos.x, 0, heroPos.z);
    g.player.facing = heroPos.facing;
    const hero = g.scene.children.find((o) => o.position === g.player.pos);
    if (hero) hero.rotation.y = heroPos.facing;
    const place = () => {
      g.player.pos.set(heroPos.x, 0, heroPos.z);
      if (hero) hero.rotation.y = heroPos.facing;
      spawned.forEach((e, i) => {
        const a = scene.actors[i];
        e.dead = false;
        e.hp = e.maxHp;
        e.state = 'idle';
        e.kb.set(0, 0, 0);
        e.g.root.visible = true;
        e.g.root.position.set(a.x, 0, a.z);
        e.g.body.rotation.set(0, 0, 0);
        e.g.body.position.set(0, 0, 0);
        e.facing = a.facing;
        e.g.root.rotation.y = a.facing;
        fit(e);
      });
    };
    place();
    if (scene.attack) {
      spawned.forEach((e) => e.g.root.position.set(40, 0, 40));
      g.player.attackT = 0.22;
      g.player.st = 100;
      g.step(8, 1 / 60);
      place();
    }
    g.freeze(true);
    place();
    if (hero) hero.traverse((o) => { if (o.isSprite) o.visible = false; });
    aim();
    g.renderer.render(g.scene, g.camera);
    hide();
  }, scene);
}

function overlayCss(titleAt, portrait) {
  const atTop = titleAt === 'top';
  const titleSize = portrait ? '11.5vmin' : '9.2vmin';
  return `
    #promo{position:fixed;inset:0;z-index:40;pointer-events:none;display:flex;flex-direction:column;
      justify-content:${atTop ? 'flex-start' : 'flex-end'};
      padding:${atTop ? '6% 7% 0' : '0 6% 6%'};
      background:${atTop
        ? 'linear-gradient(to bottom, rgba(6,3,16,.78) 0%, rgba(6,3,16,.2) 24%, rgba(6,3,16,0) 42%)'
        : 'linear-gradient(to top, rgba(6,3,16,.8) 0%, rgba(6,3,16,.18) 26%, rgba(6,3,16,0) 46%)'};}
    #promo h1{margin:0;font-family:Inter,"Liberation Sans",sans-serif;font-weight:700;font-size:${titleSize};line-height:.88;
      letter-spacing:.06em;color:#ffd45e;text-shadow:0 .07em 0 #8a5200, 0 .12em .25em rgba(0,0,0,.9)}
    #promo .kicker{margin:0 0 .25em;font-family:Inter,"Liberation Sans",sans-serif;font-weight:700;font-size:2.4vmin;
      letter-spacing:.28em;color:#ffb7e0;text-shadow:0 2px 6px #000}
    #promo .copy{margin-top:.45em;font-family:Inter,"Liberation Sans",sans-serif;font-weight:600;font-size:1.7vmin;
      color:rgba(255,255,255,.88);text-shadow:0 1px 3px #000}
  `;
}

async function paintOverlay(page, job) {
  const portrait = job.h > job.w;
  await page.evaluate(({ job, css, copy }) => {
    document.getElementById('promo')?.remove();
    document.getElementById('promoCss')?.remove();
    const style = document.createElement('style');
    style.id = 'promoCss';
    style.textContent = css;
    document.head.appendChild(style);
    const el = document.createElement('div');
    el.id = 'promo';
    const kicker = job.kicker ? `<div class="kicker">${job.kicker}</div>` : '';
    const line = job.copy ? `<div class="copy">${copy}</div>` : '';
    el.innerHTML = `${kicker}<h1>${job.title}</h1>${line}`;
    document.body.appendChild(el);
  }, { job, css: overlayCss(job.titleAt, portrait), copy: COPY });
}

async function main() {
  mkdirSync(assetDir, { recursive: true });
  mkdirSync(wallpaperDir, { recursive: true });
  mkdirSync(previewDir, { recursive: true });
  const server = await serve(gameDir);
  const port = server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  let current = '';
  for (const job of JOBS) {
    const key = `${job.w}x${job.h}:${job.scene}`;
    if (key !== current) {
      await page.setViewportSize({ width: job.w, height: job.h });
      await page.goto(`http://127.0.0.1:${port}/index.html?shot=1`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__game && window.__game.renderer);
      await page.waitForTimeout(250);
      current = key;
    } else {
      await page.evaluate(() => window.__game.freeze(false));
    }
    await pose(page, layout(job.scene, job.w, job.h));
    await paintOverlay(page, job);
    await page.waitForTimeout(50);
    mkdirSync(dirname(job.out), { recursive: true });
    await page.screenshot({ path: job.out, type: 'png' });
    console.log(job.out, statSync(job.out).size);
  }
  await browser.close();
  server.close();
  if (errors.length) {
    console.error('PAGE ERRORS');
    for (const e of errors) console.error(e);
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
