# بورجی خشت · Block Tower

یارییەکی سێ‌دی بۆ سەرکەوتن لە بورجێکی شەوانەدا، بۆ تەمەنی ١٥–١٨. Happy Toons Studio.
A night-time 3D tower climb for ages 15–18.

© 2026 Nazhad Ibrahem – Happy Toons Studio
دروستکراو بە یارمەتی AI (کۆد و گرافیک)
Made with AI assistance (code and graphics)

## یاریکردن · How to play

| | کوردی | English |
| --- | --- | --- |
| ڕۆیشتن | WASD یان تیرەکان | WASD or arrow keys |
| بازدان | Space | Space |
| کامێرا | ماوس ڕابکێشە، یان کلیک بۆ قفڵی نیشاندەر | Drag the mouse, or click to lock the pointer |
| وەستان | P یان Esc | P or Esc |
| مۆبایل | جۆیستیکی چەپ، دوگمەی بازدان لە ڕاست، ڕاکێشان بۆ کامێرا. یاری بە پانی. | Left joystick, jump button on the right, drag to look. Play in landscape. |

نهۆمی یەکەم تا سێیەم ئاسانن. کەوتن یان بەرکەوتنی مەترسی دەتگەڕێنێتەوە دوا خاڵی پاشەکەوت.
Floors 1–3 are the easy ones. Falling or touching a hazard sends you back to the last checkpoint immediately.

باشترین کات و بەرزترین نهۆم لە هەمان وێبگەڕدا دەمێننەوە (localStorage).
Best time and highest floor stay in this browser (localStorage).

## لەسەر کۆمپیوتەرەکەت · Run it locally

لە ڕەگی ئەم ڕێپۆیەوە سێرڤەرێکی ساکار بکەرەوە، پاشان یارییەکە بکەرەوە.
From the repository root, start a static server, then open the game:

```bash
python3 -m http.server 8765
```

http://127.0.0.1:8765/block-tower/

پێویستت بە دامەزراندنی پاکێج نییە بۆ یاریکردن. Three.js لە `vendor/` دایە.
You do not need to install packages to play. Three.js is vendored in `vendor/`.

## تاقیکردنەوە · Tests

```bash
cd block-tower
npm install
npx playwright install chromium webkit
npm test
```

`npm test` سەرەتا ڕێڕەوی ١٠ نهۆمەکە بە بێ وێبگەڕ دەپشکنێت، پاشان تاقیکردنەوەی Playwright.
`npm test` first proves the 10 floors in a headless physics run, then runs Playwright.

## بۆچوون · Feedback

بۆچوون ئارەزوومەندانە و بێناوە. ئێستا بۆ هیچ سێرڤەرێک نانێردرێت؛ لەسەر ئامێرەکە دەمێنێتەوە.
Feedback is optional and anonymous. It is not sent anywhere yet; it stays on the device.

بۆ چالاککردنی دواتر، `FEEDBACK_ENDPOINT` لە `config.js` دابنێ. ڕێنماییی وۆرکەری Cloudflare لە `feedback-worker/README.md` ـە. وۆرکەرەکە بڵاو نەکراوەتەوە.
To switch sending on later, set `FEEDBACK_ENDPOINT` in `config.js`. The Cloudflare Worker guide is `feedback-worker/README.md`. That worker is not deployed.

پاراستنی نهێنی: [privacy.html](privacy.html)

## کۆنتڕۆڵی بەستەرەکان · Community links

بەستەرەکانی یارمەتی لە `config.js` ـی `COMMUNITY_LINKS` دان. پێش کردنەوەیان، یارییەکە دەپرسێت «دەچیتە دەرەوەی یارییەکە».
Help-screen links live in `COMMUNITY_LINKS` inside `config.js`. The game asks “You are leaving the game” before opening one.

## دوای بڵاوکردنەوە · After merge

- https://nazhadibrahem1998-rgb.github.io/happy-toons-studio/block-tower/
- https://happytoonsstudio.com/block-tower/
