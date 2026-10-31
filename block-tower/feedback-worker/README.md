# وۆرکەری بۆچوونی بورجی خشت · Block Tower feedback worker

ئەم وۆرکەرە **بڵاو نەکراوەتەوە**. هیچ هەژمارێکی Cloudflare لێرەدا دروست نەکراوە.
This worker is **not deployed**. No Cloudflare account was created from this repo.

کاتێک نازهاد ویستی، لەسەر هەژماری Cloudflare ـی خۆی دایبەزێنێت. تا ئەو کاتە `FEEDBACK_ENDPOINT` لە `../config.js` بەتاڵ بێت، یارییەکە بۆچوون تەنها لە localStorage هەڵدەگرێت و هیچ نانێرێت.
When Nazhad wants it, he can deploy it on his own existing Cloudflare account. Until then, leave `FEEDBACK_ENDPOINT` in `../config.js` empty. The game keeps feedback in localStorage and sends nothing.

## چی هەڵدەگرێت · What it stores

تەنها چوار خانە: نمرە (١–٥)، دەق (تا ٥٠٠ پیت)، وەشانی یاری، کاتی گشتی (کاژێر).
Only four fields: rating (1–5), text (up to 500 characters), game version, coarse timestamp (the hour).

- دوای نزیکەی ١٢ مانگ خۆی دەسڕێتەوە (`expirationTtl` ≈ ٣٦٥ ڕۆژ).
  Keys expire after about 12 months (`expirationTtl` ≈ 365 days).
- ئیمەیڵ، تەلەفۆن، بەستەر و ژمارەی درێژ لادەبرێن، وەک یارییەکە.
  Emails, phones, links, and long digit strings are stripped, same as the game.
- IP، user-agent، کووکی، یان ناسنامەی ئامێر نانووسرێت. سنووری خێرایی گشتییە (٦٠ ناردن لە خولەکێکدا) و بە IP کلیل نابێت.
  IP addresses, user agents, cookies, and device ids are not written. The rate limit is global (60 posts a minute) and is not keyed by IP.
- CORS تەنها بۆ `happytoonsstudio.com`، `www.happytoonsstudio.com` و `nazhadibrahem1998-rgb.github.io`.
  CORS allows only `happytoonsstudio.com`, `www.happytoonsstudio.com`, and `nazhadibrahem1998-rgb.github.io`.

## پشکنینی ناوخۆیی · Local check

```bash
node feedback-worker/worker-check.js
```

لە ڕەگی `block-tower/` ـەوە. پێویستی بە Cloudflare نییە.
Run that from `block-tower/`. It does not need Cloudflare.

## دامەزراندن دواتر · Deploy later

1. لە هەژمارەکەتدا بچۆرە ناو Cloudflare Workers. پێویستت بە پلانێکی پارەدار نییە؛ پلانی خۆڕایی بەسە.
   Open Cloudflare Workers on your account. The free plan is enough. Do not buy a new plan for this.
2. Wrangler یەک جار دابمەزرێنە و بچۆ ژوورەوە:
   Install Wrangler once and log in:

   ```bash
   npx wrangler login
   npx wrangler kv namespace create BLOCK_TOWER_FEEDBACK
   ```

3. لە `wrangler.toml` دا `REPLACE_WITH_KV_NAMESPACE_ID` بگۆڕە بەو id ـەی Wrangler دەیدات.
   Replace `REPLACE_WITH_KV_NAMESPACE_ID` in `wrangler.toml` with the id Wrangler prints.
4. بڵاوی بکەرەوە:
   Deploy:

   ```bash
   npx wrangler deploy
   ```

5. ناونیشانی وۆرکەرەکە (شێوەی `https://block-tower-feedback.<account>.workers.dev`) دابنێ لە `FEEDBACK_ENDPOINT` لە `../config.js`.
   Put the worker URL (`https://block-tower-feedback.<account>.workers.dev`) into `FEEDBACK_ENDPOINT` in `../config.js`.
6. یارییەکە دووبارە بڵاو بکەرەوە. تا ئەو گۆڕانە، یارییەکە هەر بۆچوونەکان لەسەر ئامێر هەڵدەگرێت.
   Publish the game again. Until that change, the game still only stores feedback on the device.

لۆگی Cloudflare ـی خۆت (Logpush) مەچالاکە، بۆ ئەوەی IP لەلایەن ئێمەوە کۆنەبێتەوە.
Do not turn on Cloudflare Logpush for this worker if you want to avoid keeping IP addresses on our side.

بۆ سڕینەوە، کلیلەکانی `fb:` لە KV بسڕە، یان چاوەڕێی بەسەرچوونی ١٢ مانگەکە بە.
To delete feedback, remove `fb:` keys in KV, or wait for the 12-month expiry.
