# Sharsten — adding content

Part 1 is a dream of an old mountain village. The playable rules live in JSON under `data/`. The scripts load that data at startup and check that names still match. If a check fails, the game prints `ContentDB:` and lists the problem.

Keyboard and mouse only. There is no touch interface.

## Play

WASD or the arrow keys walk. The mouse looks. The vertical axis is not inverted unless Settings says so. Shift runs. The hint line at the bottom of the screen shows the current keys.

- `[E]` gather, read, or use what is in front of you
- `[Tab]` opens the leather diary (quests, bag, map sketch, overheard lines, skills)
- `[V]` switches between third person and first person
- `[B]` raises a fence, wall, oven, or loom while you stand at a workbench
- `[R]` turns the piece
- Left click places. Right click leaves building
- `[Esc]` pauses

People never speak to Azad. They speak to each other. Walk close and the line appears as a subtitle and in the diary. Quests also come from papers on the ground and from Azad's italic thoughts. Trading at the red cloth is a panel of piles, with no conversation.

Part 1 ends at the star spring. The red pomegranate seed cracks the dream and wakes a short, harsher scene: "Part 2 coming in an update". The white stone folds the grove back to its gate.

## Items, recipes, salvage

`data/items.json` is the catalogue. Each item needs a unique `id`, an English `name`, a `desc`, and a `cat` (`mat`, `tool`, `goods`, `place`, `found`, `food`, `invention`). Set `placeable` if it can be set down in the lane. Set `locked` for something the dream will not give yet.

`data/recipes.json` holds two kinds of row:

- `type: craft` spends `cost` and gives `output`. `station` is `stump`, `carpenter`, `clay`, `stone`, or `any`. `tier` orders the list. `woodwork: true` counts toward Woodcraft. `locked: true` shows the row but will not craft. The windmill, the water wheel, and the black-powder rocket are locked this way. Do not write a real explosive recipe. The rocket is only a sealed name.
- `type: salvage` spends one `input` (a found basket, pot, rug, or jug) and gives `yield` materials. The player must be at a workbench.

## Buildings

`data/buildings.json` lists snap pieces: fence, wall, oven, loom. `cost` is materials, not a crafted item. `snap` is the grid in metres. Raising a piece requires standing at a workbench. The ghost turns red when the cell is taken.

## Quests, notes, overheard lines

`data/quests.json` — `source` is `thought`, `overheard`, or `note`. `required: true` means the north mist stays shut until it is done. `autostart` puts it in the diary immediately.

Objective `type` is one of `gather`, `craft`, `place`, `build`, `salvage`, `flag`. `place` and `build` can name a `spot` from `data/layout.json` and a `radius`.

`data/notes.json` — papers in the world. `starts_quest` may be empty. The matching `id` must exist under `layout.notes`.

`data/dialogue.json` — each conversation has `spot`, `radius`, `speakers`, and `lines`. Speakers are villager ids. Lines are what one villager says to another. Do not address Azad, and do not put his name in a villager's mouth. `starts_quest` may be empty for ambient talk.

## Villagers

`data/npcs.json` is how someone looks. `data/layout.json` is where they stand (`work`), which house is theirs (`home`), and whether they walk the lane (`walk`).

`kind` is `man`, `woman`, `child`, or `mullah`. `height` is a scale. Khola Direzh must stay strictly the tallest. `headwear` is `turban`, `klaw`, `scarf`, `white_turban`, or `headband`. `prop` is a tool in the hand (`hoe`, `staff`, `axe`, `hammer`, `shuttle`, `jug`, `spoon`, `beads`, `slate`, `herb`, `cloth`, `none`). Colours are hex without a leading `#`. Match the nickname kindly. Do not caricature a body.

The mullah is Mullah Husen. His former nickname, Shekha Rash, stays in `former` and in the gloss.

## Skills

`data/skills.json`. Four skills: Woodcraft, Stonework, Trading, Herbal Lore. Each rank has `need` counters and a `bonus`.

Counters the game already increments:

- `gather:wood`, `gather:stone`, `gather:fibre`, `gather:herb`
- `craft:<item id>`, `craft:wood_items`
- `place:<item id>`
- `trade:count`
- `salvage:<item id>`

Bonus keys the game already reads:

- `gather_bonus:wood`, `gather_bonus:stone`, `gather_bonus:fibre`
- `cost_save:wood`, `cost_save:stone` (never reduces a cost below 1)
- `trade_save` (one less from the larger pile, never below 1)
- `trade_extra` (one extra of each thing received)

A new bonus key does nothing until `scripts/sim/skill_rules.gd` and the caller in `scripts/autoload/game_state.gd` honour it.

## Layout and puzzle hooks

`tools/make_layout.py` rebuilds roads and houses from the web demo's lane sketch. Hand-authored spots (the spring, the altar, the workbenches) live in that script. Run it, then check the quest spots still exist.

`layout.puzzle_hooks` is a list of `{id, x, z, radius}`. Walking into one calls `GameState.fire_puzzle(id)`. Future puzzles can listen by reading `flags["puzzle:<id>"]`. Part 1 does not require a puzzle beyond the red and white choice.

## Save files

The save is `user://sharsten_save.json`. `version` is `1`. `scripts/sim/save_file.gd` migrates an older file (including a version-0 `bag`) up to the current fields. Bump `SaveFile.VERSION` and extend `migrate()` when the shape changes. Do not discard unknown future fields if you can help it.

The age gate writes only `{"passed": true}` to `user://sharsten_age.json`. It does not store a birth year.

Settings (preset, scale, FSR, VSync, frame cap, mouse, keys) live in `user://sharsten_settings.json`.

## Graphics

Presets are in `scripts/sim/graphics_rules.gd`.

- Low — weak PCs. No shadows, short view, few trees.
- Medium — default for a mid-range card such as a GTX 1060 or RX 580. Shadows at 2048, view about 85 m, no SDFGI, no SSAO, no SSR, no volumetric fog. This is the 60 fps target at 1080p.
- High and Ultra — gaming PCs. SDFGI, SSAO, SSR, volumetric fog, denser foliage, longer view, larger shadow maps. Those features turn themselves off if the renderer is not Forward+. The web preview uses the Compatibility renderer, so it keeps the foliage distances and drops the GI.

The first launch picks a preset from the GPU name (and VRAM if a future caller passes it). An unknown name falls back to Medium. The player can change it, plus resolution scale, FSR 2 when the scale is below 100%, VSync, and a frame cap.

Trees and grass use distance fades. Medium keeps the near detail band short so a 1060-class machine is not asked to shade the whole valley.

## Tests

From this folder:

```
godot --headless --audio-driver Dummy --path . res://tests/test_runner.tscn -- --repeat 5
```

That covers the age gate, gather-craft-place, salvage, skills, overhearing a quest, save and migration, and the red and white endings, then a short walk in the built village.

```
godot --audio-driver Dummy --path . res://tests/bench.tscn
godot --audio-driver Dummy --path . res://tests/soak.tscn
```

`bench` prints one JSON line per preset (average fps and 1% low). `soak` walks for 15 minutes and prints memory growth. On a machine with no real GPU the numbers are software-rasterizer numbers, not a GTX 1060.

## Credits

Third-party licences are in `THIRD_PARTY_LICENSES.md` and on the Credits screen. If you add an asset, add it in both places, and only if it is CC0 or MIT.
