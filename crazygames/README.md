# CrazyGames build — Happy Toons: Toonblade

© 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.

This folder is the CrazyGames submission package for **Happy Toons: Toonblade**. The playable build is `toonblade/` (zip the *contents* of that folder so `index.html` is at the root of the zip). Store covers are in `assets/`. The GitHub Pages game in `game/` is unchanged unless `window.__TOONBLADE_BUILD === 'crazygames'`, which only this build sets.

Made with AI-assisted tools. That line stays on the title screen and the game-over screen. Do not remove it.

## Refresh the build

From the repo root:

```bash
node crazygames/build.mjs
```

The script copies `game/game.js`, `game/style.css`, and `game/vendor/` into `toonblade/`, injects the SDK v3 script plus `cg-bridge.js`, and adds the optional revive button. It strips any `http(s)` anchors from the page. Run it again after gameplay changes.

## What the SDK integration does

Official HTML5 SDK v3 (`https://sdk.crazygames.com/crazygames-sdk-v3.js`), initialized with `CrazyGames.SDK.init()` before the game module runs. Docs used: [introduction](https://docs.crazygames.com/sdk/intro/), [game module](https://docs.crazygames.com/sdk/game/), [video ads](https://docs.crazygames.com/sdk/video-ads/), [technical](https://docs.crazygames.com/requirements/technical/), [gameplay](https://docs.crazygames.com/requirements/gameplay/), [ads](https://docs.crazygames.com/requirements/ads/), [covers](https://docs.crazygames.com/requirements/game-covers/).

| Event | When |
| --- | --- |
| `game.loadingStart` | After SDK init, while the scene is still loading |
| `game.loadingStop` | When the loading overlay is removed and the menu is up |
| `game.gameplayStart` | Play, resume, or a successful revive. Not on the menu |
| `game.gameplayStop` | Pause (P, Esc, pause button) and game over. Not on tab-hide — CrazyGames tracks focus itself |
| `game.happytime` | Skeleton King defeat only |
| `ad.requestAd('midgame')` | Play Again, after the score is on screen. One ad, then the next run |
| `ad.requestAd('rewarded')` | Optional Revive. Reward (half health, same run) only on `adFinished` |

If an ad errors or the SDK is disabled (Basic Launch turns ads off), the game continues. Revive hides itself when no reward is available, so the button does not sit there doing nothing. Gameplay is paused for the whole request. Sound is muted only after `adStarted`, then restored. The player's mute setting is not overwritten.

The play counter (`abacus.jasoncameron.dev`) does not run in this build. There is no Buy Me a Coffee link, no Fiverr link, no TikTok link, and no other portal link. A DOM sweep also removes any `https://` anchor that might be added later.

Mobile: on-screen joystick, attack, block, dodge, pause, and mute. `user-select: none` is set. The menu scrolls on short screens. AudioContext is resumed from a `touchend` gesture. No custom fullscreen button.

Local check: serve `toonblade/` on `127.0.0.1` (not `file://`). The SDK uses the `local` environment there and shows a 5-second fake ad. On any other domain it is `disabled` and throws if called; this build checks `SDK.environment` and skips those calls.

## Submission checklist

Do this in the [CrazyGames Developer Portal](https://developer.crazygames.com/). The account, upload, and tax profile have to be the owner's.

1. Create a developer account and start a new game submission.
2. Zip the **contents** of `toonblade/` (`index.html` at the root, plus `cg-bridge.js`, `game.js`, `style.css`, `vendor/`, `LICENSE.txt`). Do not put the store covers inside the zip.
3. Upload the zip. Total size is far under the 50 MB initial-download limit and the 250 MB / 1,500-file caps. Initial download is measured until the first `gameplayStart` (the Play button).
4. Preview on `localhost` first, then in the portal Preview tool (`crazygames.com` QA). Confirm Chrome and Edge, and a phone-sized iframe.
5. Upload the three covers in `assets/` (see sizes below). They are title-only, no border, no store logos.
6. Record two silent preview videos yourself (this repo does not include them). 15–20 seconds, under 50 MB, no cursor, no "Play now", no black bars. Landscape 1920×1080 and portrait 1080p at 2:3. Open on the landscape cover frame.
7. Paste the description and controls from `monetization/DRAFTS.md`. Do not add Buy Me a Coffee, itch.io, Fiverr, TikTok, or GitHub Pages links in the CrazyGames fields.
8. Set devices to desktop and mobile. Orientations: landscape and portrait (the game already plays both).
9. Pick categories from the portal dropdown. Suggested primary: **Action**. Secondary if the list allows: Adventure or Fighting. The exact list is only in the form.
10. English is the only language. Leave account login and in-game purchases off. Progress is local (best score only) and does not need the Data module.
11. Choose Basic Launch first. Ads stay disabled there even though they are integrated. Full Launch is a later invite and is when revenue share starts.
12. Keep the in-game line "Made with AI-assisted tools" and the copyright line. Both are already in the build.

## Fields the portal asks for

| Field | What to enter |
| --- | --- |
| Title | Toonblade |
| Studio / developer | Happy Toons Studio — Nazhad Ibrahem |
| Short description | See `monetization/DRAFTS.md` |
| Full description | See `monetization/DRAFTS.md` (English). No outbound links |
| Controls / instructions | See `monetization/DRAFTS.md` |
| Categories / tags | Action. Optional: adventure, fantasy, sword, arena, boss |
| Landscape cover | `assets/crazygames-landscape-1920x1080.png` — 1920×1080 |
| Portrait cover | `assets/crazygames-portrait-800x1200.png` — 800×1200 |
| Square cover | `assets/crazygames-square-800x800.png` — 800×800 |
| Landscape video | 1920×1080, 15–20 s, silent, ≤ 50 MB. Owner records this |
| Portrait video | 2:3 1080p, 15–20 s, silent, ≤ 50 MB. Owner records this |
| Orientation | Landscape and portrait |
| Devices | Desktop, tablet, mobile |
| Language | English |
| Monetization | SDK video ads (midgame + rewarded). No banners. No external ads |
| Build | Zip of `toonblade/` |

Cover rules from the docs: no borders, no text except the game title, no icons or store logos, no blurry art. The copyright line is in the game UI, not burned into these three covers, because CrazyGames forbids any cover text besides the title.

## itch.io cover

`assets/itch-cover-630x500.png` is 630×500 (the 315:250 cover ratio itch.io recommends at 2×). It includes the copyright line. It is not part of the CrazyGames zip.

## Owner-only steps

- CrazyGames developer account, game submission, preview QA, and payout details
- Category dropdown (only the portal lists the legal values)
- The two preview videos
- Whether to start on Basic Launch (recommended) or ask for Full Launch
- itch.io page price, pay-what-you-want setting, and the Supporter Pack reward (drafts are in `monetization/DRAFTS.md`)
- Buy Me a Coffee page: https://buymeacoffee.com/happytoonsstudio — use it on itch.io and the devlog, not inside this build
