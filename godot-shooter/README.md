# Untitled Kurdish Shooter

Godot **4.7.2** third-person demo. The on-screen title is the Sorani placeholder **ناوی یاری**. The hero is **گڕوت** (Gurut). Change both the Latin and Sorani titles in one place:

`scripts/config/game_config.gd`

Also keep `application/config/name` in `project.godot` and the Windows export product name in sync if you rename the build.

UI is Sorani Kurdish, right to left, using Vazirmatn (OFL). The main menu shows `© 2026 Nazhad Ibrahem`. Studio name is intentionally blank.

## Play (Level 1)

Open the folder in Godot 4.7 and press Play, or from a shell:

```bash
godot --path godot-shooter
```

Clear the mountain village of the fictional **Iron Empire** (`ئیمپراتۆریەتی ئاسن`). There are no civilians. Soldiers fall and fade; there is no gore. The player's side flies an original drawing of the Kurdistan flag (menu, southern houses and poles, and a patch on Gurut's vest). The occupiers keep the invented Iron Empire banner. No real nation is depicted as the enemy.

| Action | Default |
| --- | --- |
| Move | WASD |
| Look | Mouse |
| Fire | Left mouse |
| Aim | Right mouse |
| Reload | R |
| Sprint | Shift |
| Jump | Space |
| Crouch | C |
| Pause | Esc |

Input actions are named (`move_forward`, `fire`, `aim`, `reload`, …) so Android touch controls can emit the same actions later. Look input goes through `PlayerBody.add_look_delta()`.

Quality settings (low / medium / high) toggle SSAO, glow, volumetric fog, MSAA, and SDFGI. High enables SDFGI. The first launch picks high on a normal GPU and low on software Vulkan.

## Level structure

`LevelManager` (`scripts/autoload/level_manager.gd`) holds the ordered level list. Level 1 is `scenes/levels/level_01.tscn`. Add Level 2 by appending a scene path to `LEVELS`; the level-complete screen already calls `advance_level()`.

## Windows export

Export templates for 4.7.2 must be installed. The preset `Windows Desktop` writes `builds/` (gitignored).

```bash
mkdir -p godot-shooter/builds
godot --headless --path godot-shooter --export-release "Windows Desktop" godot-shooter/builds/UntitledKurdishShooter.exe
```

Do not commit `builds/`, `.godot/`, `.exe`, or `.pck`.

## Credits

See `CREDITS.md`. Textures and the dusk HDRI are Poly Haven CC0. Gun and ambience sounds are original procedural placeholders (CC0). Characters and weapons are primitive meshes, not third-party models.
