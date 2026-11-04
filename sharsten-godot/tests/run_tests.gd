extends Node

var passed := 0
var failed := 0
var phase := "boot"
var frames := 0
var world: Node = null
var repeat := 1
var phys_mark := 0

func _process(_delta: float) -> void:
	if phase == "boot":
		var args := OS.get_cmdline_user_args()
		if args.has("--repeat"):
			repeat = int(args[args.find("--repeat") + 1])
		for _i in repeat:
			_units()
		if args.has("--no-world"):
			_finish()
			return
		GameState.ignore_station = true
		GameState.save_path_override = "/tmp/sharsten-world-save.json"
		DirAccess.remove_absolute(GameState.save_path_override)
		GameState.start_new()
		world = load("res://scripts/world/village_world.gd").new()
		get_tree().root.add_child(world)
		phase = "settle"
		frames = 0
		return
	frames += 1
	if phase == "settle" and frames >= 25:
		_check_settled()
		var body = _player()
		if body:
			body.global_position = Vector3(40, 6, 90)
			body.velocity = Vector3.ZERO
		phys_mark = Engine.get_physics_frames()
		phase = "fall"
		return
	if phase == "fall" and Engine.get_physics_frames() - phys_mark >= 150:
		var body = _player()
		_check(body != null and body.global_position.y > -0.5 and body.global_position.y < 2.0, "player stays on the ground after a drop, y=%s" % (body.global_position.y if body else "none"))
		_check(body.is_on_floor() if body else false, "player is on the floor")
		_check_npcs()
		_play_loop()
		_finish()

func _player():
	return _find_player()

func _find_player():
	var nodes := get_tree().root.find_children("*", "CharacterBody3D", true, false)
	return nodes[0] if nodes.size() else null

func _units() -> void:
	_check(ContentDB.errors.is_empty(), "content registry: %s" % ", ".join(ContentDB.errors))
	var now := 2026
	_check(AgeGate.accepts(1990, now), "1990 is old enough")
	_check(AgeGate.accepts(2001, now), "born 2001 is 25 in 2026")
	_check(not AgeGate.accepts(2002, now), "born 2002 is under 25")
	_check(not AgeGate.accepts(2010, now), "2010 is young")
	var age_path := "/tmp/sharsten-age.json"
	DirAccess.remove_absolute(age_path)
	_check(AgeGate.submit(1994, now, age_path) == "ok", "age submit ok")
	var raw := FileAccess.get_file_as_string(age_path)
	_check(raw.find("1994") < 0 and raw.find("passed") >= 0, "age file stores only passed, got %s" % raw)
	_check(AgeGate.read_passed(age_path), "passed flag reads back")
	_check(AgeGate.submit(2015, now, age_path + ".no") == "young", "young result")
	_check(not FileAccess.file_exists(age_path + ".no"), "young path writes nothing")
	var up := LookMath.apply_mouse(0, 0, 0, -10, 0.01, false)
	_check(up.y > 0.0, "mouse up looks up")
	var inv := LookMath.apply_mouse(0, 0, 0, -10, 0.01, true)
	_check(inv.y < 0.0, "invert Y looks down when the mouse goes up")
	var yaw := LookMath.apply_mouse(0, 0, 10, 0, 0.01, false)
	_check(yaw.x < 0.0, "mouse right turns toward the right")
	var dir := LookMath.wish_dir(0.0, 0.0, 1.0)
	_check(dir.z < -0.9 and absf(dir.x) < 0.01, "W moves forward along -Z")
	_check(GraphicsRules.preset_for_adapter("NVIDIA GeForce GTX 1060", 6144) == "medium", "1060 is medium")
	_check(GraphicsRules.preset_for_adapter("AMD Radeon RX 580", 8192) == "medium", "rx 580 is medium")
	_check(GraphicsRules.preset_for_adapter("NVIDIA GeForce RTX 4070", 12000) == "ultra", "4070 is ultra")
	_check(GraphicsRules.preset_for_adapter("NVIDIA GeForce RTX 3060", 8192) == "high", "3060 is high")
	_check(GraphicsRules.preset_for_adapter("llvmpipe (LLVM 20.1.2, 256 bits)", 0) == "low", "software gpu is low")
	_check(GraphicsRules.preset_for_adapter("", 0) == "medium", "unknown gpu falls back to medium")
	_check(GraphicsRules.preset_for_adapter("AMD Radeon(TM) Graphics", 0) == "low", "integrated Radeon APU starts on low")
	_check(GraphicsRules.preset_for_adapter("AMD Radeon(TM) Graphics", 8192) == "medium", "a stronger APU can step to medium")
	_check(GraphicsRules.scaling_mode("fsr1", 0.75) == "fsr1", "FSR 1 when scaled")
	_check(GraphicsRules.scaling_mode("fsr2", 0.75) == "fsr2", "FSR 2 when scaled")
	_check(GraphicsRules.scaling_mode("off", 0.5) == "bilinear", "scale without upscaler stays bilinear")
	var med: Dictionary = GraphicsRules.flags("medium")
	var high: Dictionary = GraphicsRules.flags("high")
	var ultra: Dictionary = GraphicsRules.flags("ultra")
	_check(not med["sdfgi"] and not med["ssao"] and not med["ssr"] and not med["volumetric_fog"], "medium skips heavy GI")
	_check(high["sdfgi"] and high["ssao"] and high["volumetric_fog"], "high has GI, SSAO, volumetric fog")
	_check(ultra["ssr"] and ultra["trees"] > high["trees"] and ultra["view"] > high["view"], "ultra is denser and sees farther")
	_check(med["view"] < high["view"] and med["shadow_size"] < high["shadow_size"], "medium is lighter than high")
	_check(GraphicsRules.for_renderer(ultra, "gl_compatibility")["sdfgi"] == false, "web renderer drops SDFGI")
	_check(GraphicsRules.scaling_mode(true, 0.75) == "fsr2", "FSR when scaled")
	_check(GraphicsRules.scaling_mode(true, 1.0) == "bilinear", "no FSR at full scale")
	var pages = load("res://scripts/ui/interface.gd").PAGES
	_check(pages == ["quests", "bag", "map", "overheard", "skills"], "diary pages")
	_check(not Overhear.addresses_player(ContentDB.conversations), "villagers do not address the player")
	var snap := BuildRules.snap(Vector3(1.2, 3, 2.2), 1.5)
	_check(absf(snap.x - 1.5) < 0.01 and absf(snap.y) < 0.01, "build snap")
	_craft_flow()
	_skills()
	_overhear()
	_save_roundtrip()
	_ending()

func _craft_flow() -> void:
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-unit-save.json"
	GameState.start_new()
	GameState.gather("wood", 2)
	GameState.gather("wood", 2)
	var made: Dictionary = GameState.try_craft("mallet")
	_check(bool(made.get("ok", false)), "craft mallet")
	_check(int(GameState.data["inventory"].get("mallet", 0)) == 1, "mallet in bag")
	GameState.gather("wood", 2)
	GameState.gather("wood", 2)
	var stool: Dictionary = GameState.try_craft("stool")
	_check(bool(stool.get("ok", false)), "craft stool")
	var placed: Dictionary = GameState.place_item("stool", Vector3(20, 0, 20), 0)
	_check(bool(placed.get("ok", false)), "place stool")
	_check(GameState.data["placed"].size() == 1, "placed list")
	GameState.gather("worn_rug", 1)
	var rug: Dictionary = GameState.try_craft("unmake_rug")
	_check(bool(rug.get("ok", false)), "take a rug apart")
	_check(int(GameState.data["inventory"].get("fibre", 0)) >= 3, "rug yields fibre")
	var locked: Dictionary = GameState.try_craft("rocket")
	_check(not bool(locked.get("ok", false)) and str(locked.get("reason", "")) == "locked", "rocket stays locked")
	var fence: Dictionary = GameState.raise_piece("fence", Vector3(57.4, 0, 34.2), 0.2)
	_check(bool(fence.get("ok", false)), "raise a fence, %s" % fence)
	_check(str(GameState.data["quests"]["first_steps"].get("status", "")) == "done", "tutorial quest completes")
	_check(int(GameState.data.get("xp", 0)) > 0, "crafting grants experience")
	GameState.study_relic()
	_check(bool(GameState.data["flags"].get("studied_relic", false)), "a relic leaves a blueprint")
	_check(GameState.skill_rank("engineering") >= 1, "engineering ranks from study")

func _skills() -> void:
	GameState.data["counters"]["gather:wood"] = 6
	_check(GameState.skill_rank("woodcraft") >= 1, "woodcraft rank from gathering")
	var cost: Dictionary = SkillRules.apply_cost({"wood": 3}, ContentDB.skills, GameState.data["counters"])
	GameState.data["counters"]["craft:wood_items"] = 3
	cost = SkillRules.apply_cost({"wood": 3}, ContentDB.skills, GameState.data["counters"])
	_check(int(cost["wood"]) == 2, "joiner saves a branch")
	GameState.data["counters"]["trade:count"] = 1
	var give: Dictionary = SkillRules.trade_give({"wood": 2}, ContentDB.skills, GameState.data["counters"])
	_check(int(give["wood"]) == 1, "trading softens the pile")

func _overhear() -> void:
	GameState.start_new()
	var spot: Dictionary = ContentDB.spot("spoon_bench")
	GameState.poll_overhear(Vector3(float(spot.get("x", 0)), 0, float(spot.get("z", 0))))
	_check(GameState.data["quests"].has("spoon_mould"), "overhearing starts the spoon quest")
	_check(GameState.data["heard"].size() >= 2, "overheard log")
	var note: Dictionary = GameState.read_note("unmake_note")
	_check(GameState.data["quests"].has("take_apart"), "note starts a quest")
	_check(str(note.get("text", "")).find("workbench") >= 0, "note text")

func _save_roundtrip() -> void:
	var start: Dictionary = ContentDB.layout.get("start", {})
	var migrated: Dictionary = SaveFile.migrate({"bag": {"wood": 3}, "player": {"x": 4, "y": 0, "z": 8, "yaw": 1}}, start)
	_check(int(migrated.get("version", 0)) == 1, "migrates to version 1")
	_check(int(migrated["inventory"].get("wood", 0)) == 3, "old bag becomes inventory")
	_check(migrated.has("counters") and migrated.has("placed"), "migration fills new fields")
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-roundtrip.json"
	DirAccess.remove_absolute(GameState.save_path_override)
	GameState.start_new()
	GameState.gather("stone", 2)
	GameState.data["player"]["x"] = 33.0
	_check(GameState.save_now(), "save writes")
	var stone := int(GameState.data["inventory"].get("stone", 0))
	GameState.data = SaveFile.blank(start)
	_check(GameState.load_game(), "load reads")
	_check(int(GameState.data["inventory"].get("stone", 0)) == stone, "inventory restored")
	_check(absf(float(GameState.data["player"].get("x", 0)) - 33.0) < 0.01, "position restored")

func _ending() -> void:
	var start: Dictionary = ContentDB.layout.get("start", {})
	var final: Dictionary = ContentDB.layout.get("final_start", {})
	var state := SaveFile.blank(start)
	state = Ending.apply(state, "white", final)
	_check(str(state.get("result", "")) == "loop", "white loops")
	_check(str(state.get("phase", "")) == "dream", "white stays in the dream")
	_check(int(state.get("dream_loops", 0)) == 1, "loop counted")
	_check(absf(float(state["player"].get("z", 0)) - float(final.get("z", 0))) < 0.01, "white returns to the final gate")
	state = Ending.apply(state, "red", final)
	_check(str(state.get("phase", "")) == "woke", "red wakes")
	_check(str(state.get("banner", "")) == "Part 2 coming in an update", "part 2 line")
	_check(str(state.get("thought", "")).find("Matrix") < 0, "ending is not a borrowed film")

func _check_settled() -> void:
	var body = _find_player()
	_check(body != null, "player exists")
	if body == null:
		return
	_check(body.global_position.y > -0.5 and body.global_position.y < 2.0, "spawn height %s" % body.global_position.y)

func _check_npcs() -> void:
	var folks := get_tree().root.find_children("*", "", true, false)
	var n := 0
	var bounds: Dictionary = ContentDB.layout.get("bounds", {})
	for node in folks:
		if not node.is_in_group("villager"):
			continue
		n += 1
		var p: Vector3 = node.global_position
		_check(p.y > -0.2 and p.y < 1.0, "npc height %s" % node.name)
		_check(p.x > float(bounds.get("min_x", -10)) and p.x < float(bounds.get("max_x", 200)), "npc x %s" % node.name)
	_check(n == 24, "24 villagers, saw %d" % n)

func _play_loop() -> void:
	GameState.ignore_station = true
	var wood = _find_id("wood_start_a")
	_check(wood != null and wood.has_method("use"), "wood node")
	if wood:
		wood.use(null)
		_check(int(GameState.data["inventory"].get("wood", 0)) >= 2, "gather from the world")
	var spot: Dictionary = ContentDB.spot("spring")
	GameState.poll_overhear(Vector3(float(spot.get("x", 0)), 0, float(spot.get("z", 0))))
	_check(GameState.data["quests"].has("spirit_braid"), "world overhear")
	GameState.save_now()
	var loops := int(GameState.data.get("dream_loops", 0))
	GameState.choose("white")
	_check(int(GameState.data.get("dream_loops", 0)) == loops + 1, "white choice in the world")
	var body = _find_player()
	if body:
		_check(body.global_position.distance_to(Vector3(67.2, body.global_position.y, 8.4)) < 2.0, "player moved to the final gate")
	GameState.choose("red")
	_check(str(GameState.data.get("phase", "")) == "woke", "red choice wakes")

func _find_id(id: String):
	for n in get_tree().root.find_children("*", "", true, false):
		if n.is_in_group("interact") and str(n.get_meta("id", "")) == id:
			return n
	return null

func _check(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		print("FAIL: ", msg)

func _finish() -> void:
	print("PASSED %d  FAILED %d" % [passed, failed])
	get_tree().quit(0 if failed == 0 else 1)
