# Block Tower · بورجی خشت

A night-time 3D tower climb for ages 15–18, by Happy Toons Studio.
یارییەکی سێ‌دی بۆ سەرکەوتن لە بورجێکی شەوانەدا، بۆ تەمەنی ١٥–١٨.

© 2026 Nazhad Ibrahem – Happy Toons Studio
Made with AI assistance (code and graphics)
دروستکراو بە یارمەتی AI (کۆد و گرافیک)

English is the default language. Kurdish (Sorani) is the second language and the choice is remembered in this browser.
زمانی بنەڕەت ئینگلیزییە. کوردی (سۆرانی) زمانی دووەمە و هەڵبژاردنەکە لەم وێبگەڕەدا دەمێنێتەوە.

## How to play · یاریکردن

| | English | کوردی |
| --- | --- | --- |
| Move | WASD or arrow keys | WASD یان تیرەکان |
| Jump | Space | Space |
| Camera | Drag the mouse, or click to lock the pointer | ماوس ڕابکێشە، یان کلیک بۆ قفڵی نیشاندەر |
| Pause | P or Esc | P یان Esc |
| Phone | Left joystick, jump button on the right, drag to look. Play in landscape. | جۆیستیکی چەپ، دوگمەی بازدان لە ڕاست، ڕاکێشان بۆ کامێرا. یاری بە پانی. |

Floors 1–3 are the easy ones. Falling or touching a hazard sends you back to the last checkpoint immediately.
نهۆمی یەکەم تا سێیەم ئاسانن. کەوتن یان بەرکەوتنی مەترسی دەتگەڕێنێتەوە دوا خاڵی پاشەکەوت.

Best time and highest floor stay in this browser (localStorage).
باشترین کات و بەرزترین نهۆم لە هەمان وێبگەڕدا دەمێننەوە.

## Run it locally · لەسەر کۆمپیوتەرەکەت

From the repository root, start a static server, then open the game.
لە ڕەگی ئەم ڕێپۆیەوە سێرڤەرێکی ساکار بکەرەوە، پاشان یارییەکە بکەرەوە.

```bash
python3 -m http.server 8765
```

http://127.0.0.1:8765/block-tower/

You do not need to install packages to play. Three.js is vendored in `vendor/`.
پێویستت بە دامەزراندنی پاکێج نییە بۆ یاریکردن. Three.js لە `vendor/` دایە.

## Tests · تاقیکردنەوە

```bash
cd block-tower
npm install
npx playwright install chromium webkit
npm test
```

`npm test` first proves the 10 floors in a headless physics run, then runs Playwright.
`npm test` سەرەتا ڕێڕەوی ١٠ نهۆمەکە بە بێ وێبگەڕ دەپشکنێت، پاشان تاقیکردنەوەی Playwright.

## Feedback · بۆچوون

Feedback is optional and anonymous. It is not sent anywhere yet; it stays on the device.
بۆچوون ئارەزوومەندانە و بێناوە. ئێستا بۆ هیچ سێرڤەرێک نانێردرێت؛ لەسەر ئامێرەکە دەمێنێتەوە.

To switch sending on later, set `FEEDBACK_ENDPOINT` in `config.js`. The Cloudflare Worker guide is `feedback-worker/README.md`. That worker is not deployed.
بۆ چالاککردنی دواتر، `FEEDBACK_ENDPOINT` لە `config.js` دابنێ. وۆرکەرەکە بڵاو نەکراوەتەوە.

Privacy: [privacy.html](privacy.html)

## Community links · بەستەرەکان

Help-screen links live in `COMMUNITY_LINKS` inside `config.js`. The game asks “You are leaving the game” before opening one.
بەستەرەکانی یارمەتی لە `COMMUNITY_LINKS` دان. پێش کردنەوەیان، یارییەکە دەپرسێت «دەچیتە دەرەوەی یارییەکە».

## After merge · دوای بڵاوکردنەوە

- https://nazhadibrahem1998-rgb.github.io/happy-toons-studio/block-tower/
- https://happytoonsstudio.com/block-tower/
