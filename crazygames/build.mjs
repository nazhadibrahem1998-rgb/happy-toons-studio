/* Refresh crazygames/toonblade/ from game/. © 2026 Nazhad Ibrahem – Happy Toons Studio. */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'game');
const out = join(root, 'crazygames', 'toonblade');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'vendor'), { recursive: true });

cpSync(join(src, 'game.js'), join(out, 'game.js'));
cpSync(join(src, 'LICENSE.txt'), join(out, 'LICENSE.txt'));
cpSync(join(src, 'vendor', 'three.module.min.js'), join(out, 'vendor', 'three.module.min.js'));
cpSync(join(src, 'vendor', 'three.LICENSE.txt'), join(out, 'vendor', 'three.LICENSE.txt'));
cpSync(join(root, 'crazygames', 'cg-bridge.js'), join(out, 'cg-bridge.js'));

let css = readFileSync(join(src, 'style.css'), 'utf8');
css += `

/* CrazyGames build only. Appended by crazygames/build.mjs. */
.screen{overflow-y:auto;-webkit-overflow-scrolling:touch}
.panel{margin:auto}
#reviveBtn.revive{font-size:16px;padding:10px 22px;margin-top:0;background:linear-gradient(180deg,#d7ffe4,#6dce78);color:#06300c;box-shadow:0 4px 0 #1e6a20}
.revive-note{font-size:12px;opacity:.8;margin:0 0 4px}
body.cg-ad .btn,body.cg-ad #touch{pointer-events:none}
@media (max-height:560px){
  .screen{align-items:flex-start}
  .panel{transform:scale(.78);transform-origin:center top}
  .panel h1{font-size:48px}
  .sub{margin:6px 0;font-size:14px}
  .controls{font-size:12px;line-height:1.35}
  .ai{margin-top:6px}
  .copy{margin-top:8px}
  .btn{font-size:18px;padding:8px 28px;margin:8px 0}
}
`;
writeFileSync(join(out, 'style.css'), css);

let html = readFileSync(join(src, 'index.html'), 'utf8');
html = html.replace(
  '<body>',
  `<body>
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
<script src="cg-bridge.js"></script>`
);
html = html.replace(
  '<button id="againBtn" class="btn">↻ PLAY AGAIN</button>',
  `<button id="againBtn" class="btn">↻ PLAY AGAIN</button>
    <button id="reviveBtn" class="btn revive" type="button">♥ Revive</button>
    <p id="reviveNote" class="revive-note">Watch a short ad to continue this run with half health.</p>`
);
// No outbound promo links in this build (CrazyGames cross-promotion rule).
html = html.replace(/<a\b[^>]*href\s*=\s*["'](?:https?:)?\/\/[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
writeFileSync(join(out, 'index.html'), html);

const page = readFileSync(join(out, 'index.html'), 'utf8');
for (const host of ['buymeacoffee', 'fiverr.com', 'tiktok.com', 'itch.io', 'github.io']) {
  if (page.toLowerCase().includes(host)) {
    console.error('Outbound host left in the CrazyGames page:', host);
    process.exit(1);
  }
}
if (!html.includes('Made with AI-assisted tools')) {
  console.error('AI disclosure missing from the CrazyGames build');
  process.exit(1);
}
if (!html.includes('© 2026 Nazhad Ibrahem – Happy Toons Studio')) {
  console.error('Copyright line missing from the CrazyGames build');
  process.exit(1);
}
console.log('Wrote', out);
