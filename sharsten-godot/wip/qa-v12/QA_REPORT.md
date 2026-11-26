# Sharsten v12 QA pass

Commit played: `680f2c5a98268f088a09fa8ae929a2167bc8592f`. No game code was changed.

Played through the real boot scene and the village with OpenGL Compatibility on llvmpipe, window 1280×720, Low first. A second pass opened the diary, pause, build, save/load, coin trades, and the altar choice from the running project. Audio used a dummy driver, so nothing was heard. Frame rate here was about 2 fps once the whole village was on screen. That is not an AMD iGPU measurement.

What did work: age gate (1990 continues), title, New dream, walk, run, crouch (capsule dropped to 1.05 m), mouse-up raised the pitch, Ctrl orbit moved the camera and left the body heading alone, `[E] Open door` on a real door (leaf swung to 95°), interior lamp came on, save/load put the player back at the saved spot, minting a coin from wood and paying for bread both succeeded.

## Critical

None. No crash, no script error in the play log. The only engine warning was that this driver cannot change vsync.

## Major

1. **The camera goes inside walls.** After walking up to a house, crouch and look-up both left the view embedded in stone. The spring arm does not pull back in time, so mouse look feels broken even though the pitch number is correct.
   - Where: beside the first houses, Low.
   - Shots: `wip/qa-v12/07-crouch.png`, `wip/qa-v12/08-look-up.png`
   - Fix: shorten the arm when the ray hits, and keep a minimum clearance from the pivot. Reject a camera position that starts inside a collider.
   - Effort: M

2. **Azad does not read as a person.** The body is stacked cloth tubes, the head is a brown ball with a checkered band, and the hands and feet disappear into the sleeves and the ground. A review would call this a prototype, not a character.
   - Where: spawn and the lane, third person.
   - Shots: `wip/qa-v12/04-spawn-low.png`, `wip/qa-v12/05-after-walk.png`, `wip/qa-v12/12-interior.png`
   - Fix: show the Quaternius head, hands, and shoes, and use the cloth as a thinner layer on that mesh.
   - Effort: L

3. **Doors open, but the houses still feel unfinished.** The leaf does not fill the frame (gaps on both sides). A bright seam runs down the stone. From inside, the room is an empty box: the mat, hearth, shelf, jar, and table do not read, and the player’s body fills the doorway. Standing in the room, the prompt can still say Open door.
   - Where: first house on the lane.
   - Shots: `wip/qa-v12/10-door-approach.png`, `wip/qa-v12/11-door-open.png`, `wip/qa-v12/12-interior.png`, `wip/qa-v12/14-npc-work.png`
   - Fix: size the leaf to the hole, swing it fully outside the wall, place two or three props in the sightline from the door, and switch the prompt to Close when the player is indoors.
   - Effort: M

4. **The day does not start at home.** New villagers appear at their work spots. Jumping the clock to morning (hour 6) left them at work, so “leave the house” never happens on a new dream. At evening and night all 24 did start walking, and none were frozen far from the goal in that short window. This renderer was too slow to watch one of them finish the walk through a door.
   - Where: all 24 villagers, Low.
   - Shot: the lane they are absent from, `wip/qa-v12/04-spawn-low.png`
   - Fix: spawn each person inside their own house at night, and keep the door gap wide enough for the 3 m nav cells.
   - Effort: M

5. **The first minutes do not tell you what to do.** Spawn covers the screen with two overheard lines and a dream sentence. The only quest that starts by itself is “A mallet for the hand.” The loaf, jug, and jar quests start only if you happen to stand near the right pair. B away from a bench does not enter build mode; it sets a thought and stays off (`set_build` returned without flipping the flag). Paying for bread works once you have a coin. Lending the jug and hiring the boy then fail with reason `need`, because that coin is already spent, and that failure is not a line of speech.
   - Where: spawn HUD; trade logic.
   - Shot: `wip/qa-v12/05-after-walk.png`
   - Fix: one quiet objective on the HUD (“the stump is ahead”), start the three family quests from that overheard moment or a map mark, and say why a coin was refused.
   - Effort: M

## Minor

6. **Opening card is out of date.** It still says “Kilim paths.” The lanes are packed earth. Players who read the card will look for carpets that are not there.
   - Shot: `wip/qa-v12/02-opening.png`
   - Fix: replace that sentence with the current credits line.
   - Effort: S

7. **A green oval sits on the lane like a flat token**, not a tree. Other trees are easy to miss at this distance, so the village reads as grass, boxes, and one blob.
   - Shot: `wip/qa-v12/04-spawn-low.png`
   - Fix: drop that impostor, or replace it with the same Quaternius mesh used up close.
   - Effort: S

8. **HUD text collides.** Three subtitle lines sit on top of Azad’s legs. The control hint along the bottom is too small to read next to them.
   - Shot: `wip/qa-v12/05-after-walk.png`
   - Fix: one subtitle at a time, higher on the screen, and a larger hint.
   - Effort: S

9. **Spawn height is a little under the floor** (about 2 cm, y = −0.02) before the first step settles to 0. Not a fall, but the shoes start in the ground.
   - Shot: `wip/qa-v12/04-spawn-low.png`
   - Fix: spawn at y = 0.2 and snap to the floor once.
   - Effort: S

## Polish

10. **Houses are still rectangular masses** with one tiled stone texture and a flat roof. They are bigger than v11 and they have doors, but a still frame looks like a kitbash, not a village street. The ground is a repeating green grid with square dirt tiles.
    - Shots: `wip/qa-v12/04-spawn-low.png`, `wip/qa-v12/05-after-walk.png`
    - Fix: break the roof silhouette and blend the path edges. Not a new system.
    - Effort: M

11. **Menus are a brown card on a blank field.** Age gate, opening, and title all work (Continue is correctly grey with no save). There is no village image, no sound, and no hint of what the dream is beyond one sentence.
    - Shots: `wip/qa-v12/01-age-gate.png`, `wip/qa-v12/02-opening.png`, `wip/qa-v12/03-title.png`
    - Fix: one still of the lane behind the card.
    - Effort: S

12. **Almost no felt feedback.** The door creak exists in code but could not be heard here. Gathering, paying, and quest starts do not punch through the subtitle wall. The altar choice text (“red pomegranate seed”) is in the UI when the altar is used; this pass did not get a clean picture of that panel because the capture camera was inside a house.

## Gameplay gaps for the first 20 minutes

You can walk, open a door, and overhear people. You are not shown the stump, the trade cloth, or the altar. The three family quests are easy to miss. Build mode is locked behind a bench you have not been shown. There is no music bed and no “you did it” moment after the first mallet. The red-seed ending is a panel at the altar, not something the lane leads you toward.

## Low preset on an AMD integrated GPU

Not measured on AMD. On this software renderer the full village was about 2 fps at 1280×720. Low still builds every house as its own meshes and keeps all 24 skinned villagers in the scene. It only shortens the tree range and skips some animation ticks when you are far away. That is the risk: unique house draws and 24 skeletons, not the fog. Interior lamps are off until you are close, which is the right idea.

## Top 5 to fix next

1. Camera clearance so look and crouch never enter a wall (M).
2. A readable person: head, hands, feet, and a tool that looks like a tool (L).
3. Door leaf that fills the hole, and an interior you can see from the doorway (M).
4. Spawn people at home, and put one objective on the HUD so the mallet, the coin, and the altar are findable (M).
5. Cut Low’s cost: merge each house into one mesh, and don’t skin villagers the player cannot see (M).
