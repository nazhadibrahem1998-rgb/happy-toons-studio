/* Desktop and mobile checks for the CrazyGames build.
   © 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.
   Usage: PLAYWRIGHT_CORE=... node scripts/prove-crazygames.mjs [out-dir] */
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = join(root, 'crazygames', 'toonblade');
const outDir = process.argv[2] || '/opt/cursor/artifacts';

function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
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
      } catch { res.writeHead(404); res.end('not found'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function watch(page, bag) {
  page.on('pageerror', (err) => bag.errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') bag.errors.push('console: ' + msg.text()); });
  page.on('request', (req) => bag.urls.push(req.url()));
}

async function ready(page) {
  await page.waitForFunction(() => window.__game && window.__toonbladePortal && window.__toonbladePortal.trace.some((t) => t.startsWith('init:')));
  await page.waitForFunction(() => window.__toonbladePortal.trace.includes('loadingStop'), null, { timeout: 15000 });
}

const server = await serve(gameDir);
const port = server.address().port;
const base = `http://127.0.0.1:${port}/index.html`;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});
const bag = { errors: [], urls: [] };
let failed = false;
function fail(msg) { console.error('FAIL', msg); failed = true; }

try {
  const desktop = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  watch(page, bag);
  await page.goto(base, { waitUntil: 'load' });
  await ready(page);
  const menuText = await page.locator('#start').innerText();
  if (!menuText.includes('Made with AI-assisted tools')) fail('AI disclosure missing on the title screen');
  if (!menuText.includes('© 2026 Nazhad Ibrahem – Happy Toons Studio')) fail('copyright missing on the title screen');
  const links = await page.locator('a[href]').count();
  if (links !== 0) fail('outbound or other anchors present: ' + links);
  await page.screenshot({ path: join(outDir, 'crazygames_desktop_menu.png') });
  await page.click('#playBtn');
  await page.waitForFunction(() => window.__toonbladePortal.trace.includes('gameplayStart'));
  await page.waitForTimeout(600);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  await page.screenshot({ path: join(outDir, 'crazygames_desktop_play.png') });
  const playing = await page.evaluate(() => window.__game.state);
  if (playing !== 'play') fail('desktop did not enter play, state=' + playing);

  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__toonbladePortal.trace.includes('gameplayStop'));
  await page.click('#resumeBtn');
  await page.waitForTimeout(200);
  if (await page.evaluate(() => window.__game.state) !== 'play') fail('resume did not return to play');

  await page.evaluate(() => {
    const g = window.__game;
    g.clearArena();
    const king = g.spawnAt('king', 0, 2.05);
    king.hp = 1;
    g.player.facing = Math.atan2(0, 2.05);
    g.input.attack = true;
    g.step(40, 1 / 60);
  });
  await page.waitForFunction(() => window.__toonbladePortal.trace.includes('happytime'), null, { timeout: 4000 });

  await page.evaluate(() => {
    const g = window.__game;
    g.player.dead = true;
    g.player.hp = 0;
    g.player.deadT = 2;
    g.step(5, 1 / 60);
  });
  await page.waitForFunction(() => window.__game.state === 'over');
  const overText = await page.locator('#over').innerText();
  if (!overText.includes('Made with AI-assisted tools')) fail('AI disclosure missing on game over');
  if (!overText.includes('© 2026 Nazhad Ibrahem – Happy Toons Studio')) fail('copyright missing on game over');
  if (await page.locator('#reviveBtn').isHidden()) fail('revive button hidden on game over');
  await page.screenshot({ path: join(outDir, 'crazygames_desktop_gameover.png') });

  await page.click('#reviveBtn');
  await page.waitForSelector('#local-overlay', { state: 'visible' });
  const revived = page.waitForFunction(() => window.__game.state === 'play' && !window.__game.player.dead && window.__game.player.hp >= 50);
  await revived;
  await page.screenshot({ path: join(outDir, 'crazygames_desktop_revived.png') });

  await page.evaluate(() => {
    const g = window.__game;
    g.player.dead = true;
    g.player.hp = 0;
    g.player.deadT = 2;
    g.step(5, 1 / 60);
  });
  await page.waitForFunction(() => window.__game.state === 'over');
  await page.click('#againBtn');
  await page.waitForSelector('#local-overlay', { state: 'visible' });
  await page.waitForFunction(() => window.__game.state === 'play' && window.__game.wave === 0 && window.__game.score === 0, null, { timeout: 15000 });

  const trace = await page.evaluate(() => window.__toonbladePortal.trace.slice());
  console.log('TRACE', trace.join(' | '));
  for (const name of ['init:local', 'loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop', 'happytime', 'ad:started:rewarded', 'ad:finished:rewarded', 'ad:started:midgame', 'ad:finished:midgame']) {
    if (!trace.includes(name)) fail('missing SDK trace ' + name);
  }
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const phone = await mobile.newPage();
  watch(phone, bag);
  await phone.goto(base, { waitUntil: 'load' });
  await ready(phone);
  await phone.screenshot({ path: join(outDir, 'crazygames_mobile_menu.png') });
  await phone.click('#playBtn');
  await phone.waitForFunction(() => document.body.classList.contains('touch') && !document.getElementById('touch').classList.contains('hidden'));
  await phone.waitForTimeout(500);
  await phone.screenshot({ path: join(outDir, 'crazygames_mobile_play.png') });
  const touchOn = await phone.evaluate(() => ({
    state: window.__game.state,
    touch: document.body.classList.contains('touch'),
    stick: !document.getElementById('touch').classList.contains('hidden'),
    ai: document.body.innerText.includes('Made with AI-assisted tools'),
  }));
  console.log('MOBILE', JSON.stringify(touchOn));
  if (touchOn.state !== 'play' || !touchOn.touch || !touchOn.stick) fail('mobile touch controls not shown');

  const wide = await browser.newContext({ viewport: { width: 800, height: 450 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const iframe = await wide.newPage();
  watch(iframe, bag);
  await iframe.goto(base, { waitUntil: 'load' });
  await ready(iframe);
  const short = await iframe.evaluate(() => {
    const copy = document.querySelector('#start .copy');
    const ai = document.querySelector('#start .ai');
    const view = window.innerHeight;
    const box = (el) => el ? el.getBoundingClientRect() : null;
    const c = box(copy), a = box(ai);
    return {
      copy: copy ? copy.textContent : '',
      ai: ai ? ai.textContent : '',
      copyBottom: c ? c.bottom : -1,
      aiBottom: a ? a.bottom : -1,
      view,
    };
  });
  console.log('SHORT', JSON.stringify(short));
  if (!short.copy.includes('© 2026 Nazhad Ibrahem – Happy Toons Studio')) fail('copyright missing on the short iframe');
  if (!short.ai.includes('Made with AI-assisted tools')) fail('AI disclosure missing on the short iframe');
  if (short.copyBottom > short.view + 2 || short.aiBottom > short.view + 2) fail('copyright or AI line clipped on 800x450');
  await iframe.screenshot({ path: join(outDir, 'crazygames_mobile_800x450_menu.png') });
  await iframe.click('#playBtn');
  await iframe.waitForTimeout(400);
  await iframe.screenshot({ path: join(outDir, 'crazygames_mobile_800x450_play.png') });
  await wide.close();
  await mobile.close();
} finally {
  await browser.close();
  server.close();
}

const banned = bag.urls.filter((u) => /abacus|buymeacoffee|fiverr|tiktok|itch\.io|github\.io/i.test(u));
if (banned.length) fail('banned requests: ' + banned.join(', '));
const sdkHits = bag.urls.filter((u) => u.includes('sdk.crazygames.com'));
if (!sdkHits.length) fail('CrazyGames SDK script was not requested');
if (bag.errors.length) {
  for (const e of bag.errors) console.error(e);
  fail('console or page errors: ' + bag.errors.length);
}
if (failed) process.exit(1);
console.log('CrazyGames build checks passed');
