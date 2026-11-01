# Third-party pieces in Sharsten

Only permissive licences are used here: MIT, BSD, Apache-2.0, Zlib, CC0, and CC-BY. Nothing in this list is GPL, AGPL, LGPL, or non-commercial.

The full licence texts that these files require are in `vendor/notices/`.

## three.js

- URL: https://github.com/mrdoob/three.js
- Version used: r160
- Licence: MIT. Copyright © 2010-2023 three.js authors
- Notice: `vendor/notices/THREE-MIT.txt`
- What we use:
  - The engine itself, already at `vendor/three.module.min.js`
  - The Preetham daylight sky from `examples/jsm/objects/Sky.js` (r160), kept in `vendor/Sky.js` with its original research credits
  - OrbitControls-style damping (`current + (target - current) * factor`) in `vendor/chase-camera.js`, from `examples/jsm/controls/OrbitControls.js`
  - A small instanced-grass wind bend in `vendor/grass-wind.js`, in the style of the three.js examples

## Yuka

- URL: https://github.com/Mugen87/yuka
- Licence: MIT. Copyright © 2023 Yuka authors
- Notice: `vendor/notices/YUKA-MIT.txt`
- What we use: the arrive steering speed from `ArriveBehavior` (`speed = min(maxSpeed, distance / deceleration)`, and zero inside a tolerance), in `vendor/arrive.js`. Villagers ease to a stop at their goal. The same ease slides a raider back after a sword hit.

## Adhan recording

- Name: Adhan, Aishatu98
- URL: https://commons.wikimedia.org/wiki/File:Adhan.ogg
- Licence: CC0
- What we use: `audio/adhan.mp3` (and the ogg copy). Also noted in `LICENSES.md`.
