extends GutTest

const Rules = preload("res://scripts/sim/quest_rules.gd")
const Saves = preload("res://scripts/sim/save_file.gd")
const Watch = preload("res://scripts/sim/deed_watch.gd")

func _wipe(path: String) -> void:
	for suffix in ["", ".bak", ".tmp"]:
		DirAccess.remove_absolute(path + suffix)

func test_backup_survives_a_torn_save() -> void:
	var path := "/tmp/sharsten-v20-guard.json"
	_wipe(path)
	var start := {"x": 1.0, "z": 2.0, "yaw": 0.0}
	var first := Saves.blank(start)
	first["inventory"] = {"stone": 5}
	assert_true(Saves.write_guarded(path, first), "the first save writes")
	var second := first.duplicate(true)
	second["inventory"] = {"stone": 9}
	assert_true(Saves.write_guarded(path, second), "the second save rotates the backup")
	assert_true(FileAccess.file_exists(path + ".bak"), "the previous save is kept")
	var torn := FileAccess.open(path, FileAccess.WRITE)
	torn.store_string("torn-save")
	torn.close()
	var back: Dictionary = Saves.read_best(path, start)
	assert_false(back.is_empty(), "a torn file falls back to the backup")
	assert_eq(int(back["inventory"]["stone"]), 5, "the backup is the earlier dream")
	_wipe(path)

func test_finished_temp_beats_an_older_save() -> void:
	var path := "/tmp/sharsten-v20-tmp.json"
	_wipe(path)
	var start := {"x": 3.0, "z": 4.0}
	var older := Saves.blank(start)
	older["inventory"] = {"wood": 1}
	assert_true(Saves.write_guarded(path, older), "an older save exists")
	var newer := older.duplicate(true)
	newer["inventory"] = {"wood": 7}
	var tmp := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	tmp.store_string(JSON.stringify(newer))
	tmp.close()
	OS.delay_msec(1100)
	var touch := FileAccess.open(path + ".tmp", FileAccess.READ_WRITE)
	touch.seek_end()
	touch.store_string("")
	touch.close()
	var back: Dictionary = Saves.read_best(path, start)
	assert_eq(int(back["inventory"]["wood"]), 7, "a finished temp file is the newest good save")
	_wipe(path)

func test_quest_step_fires_once() -> void:
	var state := {
		"quests": {"first_steps": {"status": "active", "progress": {}}},
		"counters": {"gather:wood": 4},
		"inventory": {},
		"crafted": {},
		"flags": {},
		"placed": [],
	}
	var first: Dictionary = Rules.refresh_report(ContentDB.quests, state, {})
	var steps: Array = first["steps"]
	assert_eq(steps.size(), 1, "gathering the wood finishes that step")
	assert_eq(str(steps[0]["step"]), "wood", "the wood step is the one that finished")
	var again: Dictionary = Rules.refresh_report(ContentDB.quests, state, {})
	assert_eq((again["steps"] as Array).size(), 0, "the same step does not finish twice")

func test_deed_is_short_and_marked() -> void:
	var state := {
		"phase": "dream",
		"gate_open": false,
		"quests": {"first_steps": {"status": "active", "progress": {"wood": 0, "mallet": 0}}},
		"counters": {},
		"inventory": {},
		"crafted": {},
		"flags": {},
		"placed": [],
	}
	var ctx := {
		"spots": ContentDB.layout.get("spots", {}),
		"nodes": ContentDB.layout.get("nodes", []),
		"runes": ContentDB.layout.get("runes", []),
		"recipes": ContentDB.recipes,
	}
	var line := Rules.focus(ContentDB.quests, ContentDB.quest_order, state, ctx)
	assert_eq(str(line["text"]), "Gather wood", "the deed is the step, not the whole quest title")
	assert_true(bool(line["marked"]), "the wood has a place on the map")
	assert_almost_eq(float(line["x"]), 14.4, 0.05, "the marker sits on the near wood")

func test_deed_fades_and_returns() -> void:
	var watch = Watch.new()
	watch.push("Gather wood")
	assert_almost_eq(watch.alpha, 1.0, 0.01, "a new deed is shown")
	watch.tick(8.0)
	assert_almost_eq(watch.alpha, 1.0, 0.01, "it holds before the fade")
	watch.tick(1.2)
	assert_lt(watch.alpha, 0.05, "it fades after the hold")
	watch.reveal()
	assert_almost_eq(watch.alpha, 1.0, 0.01, "the key shows it again")
	watch.tick(2.0)
	watch.push("Gather wood")
	assert_gt(watch.age, 1.0, "the same line does not start the hold over")
	watch.push("Craft a wooden mallet at the stump")
	assert_almost_eq(watch.age, 0.0, 0.01, "a new step shows at once")

func test_sleep_and_continue_round_trip() -> void:
	var path := "/tmp/sharsten-v20-sleep.json"
	_wipe(path)
	GameState.save_path_override = path
	GameState.start_new()
	var before := float(GameState.data.get("play_time", 0.0))
	GameState.sleep_here()
	assert_gt(float(GameState.data["play_time"]), before + 300.0, "sleep moves the day on")
	assert_eq(int(GameState.data["flags"]["slept"]), 1, "sleep is remembered")
	assert_gt(GameState._save_wait, 0.0, "sleep asks for a save")
	assert_true(GameState.save_now(), "the sleep save writes")
	assert_true(GameState.load_game(), "Continue can read it")
	assert_eq(int(GameState.data["flags"]["slept"]), 1, "the loaded dream still has the sleep")
	_wipe(path)

func _box(id: String, mn: Vector2, mx: Vector2) -> StaticBody3D:
	var house := StaticBody3D.new()
	house.name = id
	house.add_to_group("house_block")
	house.set_meta("min_xz", mn)
	house.set_meta("max_xz", mx)
	house.set_meta("resident", "someone_else")
	return house

func _outside(p: Vector2, mn: Vector2, mx: Vector2) -> bool:
	return p.x <= mn.x + 0.15 or p.x >= mx.x - 0.15 or p.y <= mn.y + 0.15 or p.y >= mx.y - 0.15

func test_corner_escape_leaves_the_footprint() -> void:
	GameState.data["play_time"] = 0.0
	var house := _box("corner_house", Vector2(0, 0), Vector2(6, 6))
	add_child_autofree(house)
	var neighbor := _box("next_house", Vector2(6.2, 0), Vector2(12, 6))
	add_child_autofree(neighbor)
	var villager = load("res://scripts/npc/villager.gd").new()
	villager.npc_id = "walker"
	add_child_autofree(villager)
	villager.global_position = Vector3(5.2, 0.05, 5.2)
	villager.global_position = villager._escape_house()
	var at := Vector2(villager.global_position.x, villager.global_position.z)
	assert_true(_outside(at, Vector2(0, 0), Vector2(6, 6)), "a corner step-out clears the first house, at %s" % at)
	assert_true(_outside(at, Vector2(6.2, 0), Vector2(12, 6)), "the step-out does not land in the next house, at %s" % at)
	villager.global_position = Vector3(6.7, 0.05, 3.0)
	villager.velocity = Vector3(-2.0, 0.0, 0.0)
	villager._step_around_houses(0.4)
	var stayed := Vector2(villager.global_position.x, villager.global_position.z)
	assert_true(_outside(stayed, Vector2(0, 0), Vector2(6, 6)), "a step toward a wall does not enter it")
