# Sharsten roadmap

These are design notes for later passes. The game is fictional. It borrows only the feel of mountain foothills and traditional dress. It names no political party, flag, symbol, slogan, or leader, and it does not retell any real conflict.

What exists now is a small data file, `data/world_rules.json`, read by `scripts/sim/influence.gd`. Nothing here puts words in an NPC's mouth toward the player.

## 1. Consequence field

What the player builds or does can change the mood, needs, routines, and relationships of NPCs inside a radius. `influence` rows carry an id, a radius, and the mood, need, and routine that apply inside it. Outside the radius, the NPC record stays as it was.

## 2. Life changes without direct speech

NPCs never talk to the player. The player can leave a note, leave a gift, choose during an overheard conversation, or help with a task. `life_changes` lists which of those can move an NPC's job, mood, home, or friendship. The change is overheard, seen, or written down. It is never a conversation with Azad.

## 3. Area events

`events` can mark a place and a radius. The sample is a quiet meteor: it cracks homes in the circle, displaces people, makes them afraid, and gives them a reason to rebuild together. It also leaves rare relic metal for later crafting. The record forbids gore and on-screen death. Nobody is shown dying.

## 4. Mystery and relic science

`secrets` holds journals and relic clues about a lost, fictional maker-culture. The clues are drawings and short notes. They are not a history of any real country or war.

## 5. Family comedy, original only

`side_quests` with `"tone": "family_comedy"` are original village stories for everyone. The sample is a bright child who asks too many questions about relics, a pair of practical parents, and a stern grandmother. The tone is warm misunderstanding. No names, lines, characters, or plots are taken from any show.

## 6. Gallows humour, kept apart

`side_quests` with `"tone": "gallows"` are for older players. The sample is a chalk queue for nails in the ruins: scarcity, fate, and pointless paperwork. No sexual content, no gore, and almost no swearing. These quests stay in their own list so they are not mixed into the children's stories.
