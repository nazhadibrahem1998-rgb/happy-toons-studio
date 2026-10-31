# Supporter Pack

© 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.

Thank you for playing Happy Toons: Toonblade and for supporting Happy Toons Studio.

This pack is a set of wallpapers rendered from the game. Each scene is a 1920×1080 desktop image and a 1080×1920 phone image. Lang, the goblin archers, and the Skeleton King are the subjects. Every wallpaper has the title and this line:

© 2026 Nazhad Ibrahem – Happy Toons Studio

The pictures are for personal use: a desktop background or a phone lock screen. They are not a separate game, and they are not for resale.

Made with AI-assisted tools. The game those pictures come from carries the same disclosure on its title screen. Do not crop that disclosure off the game, and do not remove the copyright line from the wallpapers.

## Make the images again

From the repo root, after `npm install playwright-core`, with Chrome available:

```bash
node supporter-pack/render.mjs
```

If Playwright is installed somewhere else, set `PLAYWRIGHT_CORE` to its `index.mjs` and `CHROME_PATH` to the Chrome binary.

Full-size PNGs are written to the path you pass, or to `/tmp/toonblade-wallpapers` if you pass none. Small previews land in `supporter-pack/previews/` and are the copies kept in git. The zip of the full pack is an artifact, not a git file.

Suggested itch.io reward price: $3. Paste text is in `monetization/DRAFTS.md`.
