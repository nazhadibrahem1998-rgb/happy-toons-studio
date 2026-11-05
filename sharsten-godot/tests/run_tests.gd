extends Node

var passed := 0
var failed := 0
var phase := "boot"
var frames := 0
var world: Node = null
var repeat := 1
var phys_mark := 0
var worst_span := 0.0
var worst_foot := 0.0
var inside_hits := 0
var foot_samples := 0
var patrol_frames := 0
var warmup := 0
var house_boxes: Array = []
var walk_clip := ""
var travel := {}
var worst_sole := 0.0
var sit_while_walking := 0

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
		_check_walls()
		_check_props()
		_check_nav()
		_shove_inside()
		Engine.time_scale = 4.0
		Engine.physics_ticks_per_second = 10
		Engine.max_physics_steps_per_frame = 30
		process_physics_priority = -50
		var walker = _find_player()
		if walker:
			walker.bot_override = true
			walker.bot_wish = Vector2(0, 1)
			walker.bot_sprint = false
		phase = "patrol"
		return
	if phase == "patrol" and patrol_frames >= 6000:
		Engine.time_scale = 1.0
		Engine.physics_ticks_per_second = 60
		Engine.max_physics_steps_per_frame = 8
		var moved := 0.0
		for v in get_tree().get_nodes_in_group("villager"):
			if travel.has(v.name):
				moved = maxf(moved, v.global_position.distance_to(travel[v.name]))
		_check(inside_hits == 0, "no villager inside a house during 10 minutes, hits %d" % inside_hits)
		_check(moved > 2.0, "villagers walked the navmesh, farthest %s m" % moved)
		_check(foot_samples > 20, "watched the player walk")
		_check(walk_clip == "Armature|Walk", "player walks with the grounded cycle, got %s" % walk_clip)
		_check(worst_span < 1.05, "walk feet stay under the body, span %s" % worst_span)
		_check(worst_sole <= 0.05, "feet stay within 5 cm of the ground, lift %s" % worst_sole)
		_check(sit_while_walking == 0, "nobody walks in the sitting pose")
		_play_loop()
		_finish()

func _player():
	return _find_player()

func _find_player():
	return get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	if phase != "patrol":
		return
	if warmup < 12:
		warmup += 1
		if warmup == 12:
			var folks := get_tree().get_nodes_in_group("villager")
			var still := false
			if folks.size() > 0:
				still = _inside_point(folks[0].global_position)
			_check(not still, "a villager shoved into a house steps back out")
			for v in folks:
				travel[v.name] = v.global_position
		return
	patrol_frames += 1
	_watch_inside()
	if patrol_frames % 6 == 0:
		_watch_feet()

func _shove_inside() -> void:
	var houses := get_tree().get_nodes_in_group("house_block")
	var folks := get_tree().get_nodes_in_group("villager")
	if houses.is_empty() or folks.is_empty():
		return
	var mn: Vector2 = houses[0].get_meta("min_xz")
	var mx: Vector2 = houses[0].get_meta("max_xz")
	folks[0].global_position = Vector3((mn.x + mx.x) * 0.5, 0.05, (mn.y + mx.y) * 0.5)
	folks[0].velocity = Vector3.ZERO

func _cache_houses() -> void:
	if not house_boxes.is_empty():
		return
	for h in get_tree().get_nodes_in_group("house_block"):
		house_boxes.append([h.get_meta("min_xz"), h.get_meta("max_xz")])

func _inside_point(at: Vector3) -> bool:
	_cache_houses()
	for box in house_boxes:
		var mn: Vector2 = box[0]
		var mx: Vector2 = box[1]
		if at.x > mn.x + 0.15 and at.x < mx.x - 0.15 and at.z > mn.y + 0.15 and at.z < mx.y - 0.15:
			return true
	return false

func _watch_inside() -> void:
	for v in get_tree().get_nodes_in_group("villager"):
		if v.get("_speed") != null and float(v._speed) > 0.2 and v.rig and str(v.rig._clip) == "Armature|Sitting_Idle":
			sit_while_walking += 1
		if _inside_point(v.global_position):
			inside_hits += 1
			return

func _watch_feet() -> void:
	var body = _find_player()
	if body == null or not body.is_on_floor() or body.get("rig") == null:
		return
	var span: float = body.rig.feet_span()
	var sole: float = absf(body.rig.sole_lift())
	if span > worst_span:
		worst_span = span
	worst_sole = sole if foot_samples == 0 else maxf(worst_sole, sole)
	foot_samples += 1
	if body.rig.anim:
		walk_clip = str(body.rig.anim.current_animation)

func _check_walls() -> void:
	var walls := get_tree().get_nodes_in_group("house_wall")
	_check(walls.size() >= 20, "house walls exist")
	for wall in walls:
		var mesh = wall.mesh
		_check(mesh is BoxMesh, "wall is a closed box")
		if mesh:
			var faces: int = mesh.get_faces().size()
			_check(faces == 36, "wall has all six sides (%d tris)" % (faces / 3))
			var mat = wall.material_override
			_check(mat != null and mat.cull_mode == BaseMaterial3D.CULL_DISABLED, "wall draws both sides so a clip cannot open a black hole")

func _check_props() -> void:
	var floating := []
	for prop in get_tree().get_nodes_in_group("ground_prop"):
		var bottom := 99.0
		var meshes: Array = []
		if prop is MeshInstance3D and prop.mesh:
			meshes.append(prop)
		for mi in prop.find_children("*", "MeshInstance3D", true, false):
			if mi.mesh:
				meshes.append(mi)
		for mi in meshes:
			var aabb: AABB = mi.global_transform * mi.mesh.get_aabb()
			bottom = minf(bottom, aabb.position.y)
		if bottom > 0.05 and bottom < 90.0:
			floating.append("%s@%.2f" % [prop.name, bottom])
	_check(floating.is_empty(), "no prop floats more than 5 cm: %s" % str(floating))

func _check_nav() -> void:
	var open := 0
	var total := 0
	for h in get_tree().get_nodes_in_group("house_block"):
		total += 1
		var mn: Vector2 = h.get_meta("min_xz")
		var mx: Vector2 = h.get_meta("max_xz")
		var cx := (mn.x + mx.x) * 0.5
		var cz := (mn.y + mx.y) * 0.5
		if not world._nav_blocked(cx, cz, 0.0):
			open += 1
	_check(total > 20 and open == 0, "navmesh cells skip every house interior, open %d of %d" % [open, total])

func _check_clothing() -> void:
	var specs: Array = [
		{"kind": "man", "headwear": "turban", "cloth": "3a322c", "shirt": "c2a078", "sash": "8b1e2d", "wrap": "d8c4a4"},
		{"kind": "woman", "dress": "9a3048", "vest": "6b3038", "sash": "f0d080", "wrap": "f4efe6"},
		{"kind": "child", "child_kind": "girl", "dress": "c44868", "vest": "6b3038", "sash": "f4c400", "wrap": "fff6ea"},
		{"kind": "child", "child_kind": "boy", "headwear": "klaw", "cloth": "3a322c", "shirt": "c4a574", "sash": "2f4f8a", "wrap": "4a3428"},
		{"kind": "mullah", "robe": "241c18", "sash": "6b2a2a"},
		{"kind": "man", "headwear": "headband", "cloth": "3e4a62", "shirt": "d7c4a2", "sash": "3d5a86", "wrap": "cbb892"},
	]
	for spec in specs:
		var rig := HumanRig.new()
		add_child(rig)
		rig.setup(spec)
		var who := str(spec.get("kind", "")) + "/" + str(spec.get("headwear", spec.get("child_kind", "")))
		_check(rig.clothing_count() >= 8, "%s has a full set of cloth meshes (%d)" % [who, rig.clothing_count()])
		_check(rig.has_clothing("torso") and rig.has_clothing("legs") and rig.has_clothing("head") and rig.has_clothing("sash"), "%s covers torso, legs, head, and sash" % who)
		rig.free()

func _check_flocks() -> void:
	var flock = load("res://scripts/world/flock.gd").new()
	flock.setup(24, 9)
	var blocks: Array = [[Vector2(140, 8), Vector2(148, 16)]]
	var t0 := Time.get_ticks_msec()
	for _i in 300:
		flock.tick(0.05, blocks)
	var ms := Time.get_ticks_msec() - t0
	_check(flock.blocked_count(blocks) == 0, "animals stay outside blocked ground")
	_check(flock.max_lift() <= 0.05, "animals stay on the ground")
	_check(ms < 150, "flock update stays in budget, %d ms" % ms)
	_check(int(GraphicsRules.flags("low")["animals"]) < int(GraphicsRules.flags("medium")["animals"]), "low draws fewer animals than medium")
	_check(int(GraphicsRules.flags("medium")["animals"]) < int(GraphicsRules.flags("high")["animals"]), "medium draws fewer animals than high")

func _check_influence() -> void:
	var rules = load("res://scripts/sim/influence.gd").load_rules()
	var npc := {"id": "pura_shrin", "mood": "calm", "routine": "tend"}
	var near = load("res://scripts/sim/influence.gd").apply_act(npc, "gift_left", 2.0, rules)
	var far = load("res://scripts/sim/influence.gd").apply_act(npc, "gift_left", 40.0, rules)
	_check(str(near.get("mood", "")) == "pleased", "a nearby gift changes mood")
	_check(str(far.get("mood", "")) == "calm", "a far gift does not change mood")
	_check(load("res://scripts/sim/influence.gd").event_ok(rules, "meteor_quiet"), "the meteor event stays family-friendly")
	var comedy = load("res://scripts/sim/influence.gd").quests_of_tone(rules, "family_comedy")
	var dark = load("res://scripts/sim/influence.gd").quests_of_tone(rules, "gallows")
	_check(comedy.size() == 1 and dark.size() == 1, "comedy and gallows quests stay in separate lists")
	_check(str(comedy[0].get("tone", "")) != str(dark[0].get("tone", "")), "the two tones do not share a list")

func _check_social() -> void:
	var villager = load("res://scripts/npc/villager.gd").new()
	_check(villager.choose_social(1.0, false, false, true) == "", "villagers do not gesture at the player")
	_check(villager.choose_social(1.0, true, false, true) == "tea", "villagers sit together at meal time")
	_check(villager.choose_social(1.5, true, false, false) == "greet", "villagers greet each other")
	_check(villager.choose_social(3.0, true, true, false) == "play", "children play when apart")
	villager.free()

func _check_settings_roundtrip() -> void:
	var path := "/tmp/sharsten-settings-roundtrip.json"
	DirAccess.remove_absolute(path)
	var previous := Settings.path_override
	Settings.path_override = path
	Settings.resolution = "1366x768"
	Settings.fog_mode = "light"
	Settings.show_hints = false
	Settings.language = "en"
	Settings.save()
	var raw := FileAccess.get_file_as_string(path)
	_check(raw.find("1366x768") >= 0 and raw.find("show_hints") >= 0 and raw.find("light") >= 0, "settings write the chosen values")
	Settings.show_hints = true
	Settings.fog_mode = "preset"
	Settings.resolution = "1920x1080"
	Settings.path_override = previous

func _check_settings_ui() -> void:
	var cases := [
		[Vector2(1280, 720), 1.0],
		[Vector2(1366, 768), 1.0],
		[Vector2(1920, 1080), 1.0],
		[Vector2(2560, 1440), 1.0],
		[Vector2(1366, 768), 1.25],
		[Vector2(1366, 768), 1.5],
		[Vector2(1920, 1080), 1.25],
		[Vector2(1920, 1080), 1.5],
	]
	for item in cases:
		var size: Vector2 = item[0]
		var scale: float = item[1]
		var logical := size / scale
		var host := Control.new()
		host.custom_minimum_size = logical
		host.size = logical
		get_tree().root.add_child(host)
		Desk.build_settings(host, func(): pass)
		var panel := host.get_node("SettingsRoot") as Control
		panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
		panel.position = Vector2.ZERO
		panel.size = logical
		_layout(panel)
		var grid := panel.find_child("BindGrid", true, false) as GridContainer
		var narrow := 0
		var widest := 0.0
		var tall := 0.0
		if grid == null:
			narrow = 99
		else:
			for child in grid.get_children():
				if child is Label and str(child.text).length() > 2:
					widest = maxf(widest, child.size.x)
					tall = maxf(tall, child.size.y)
					if child.size.x < 100.0 or child.size.y > 44.0:
						narrow += 1
		_check(narrow == 0 and widest > 140.0, "settings grid at %dx%d @%d%% stays side by side (bad %d, width %.0f, height %.0f)" % [int(size.x), int(size.y), int(scale * 100.0), narrow, widest, tall])
		host.free()

func _layout(n: Control) -> void:
	if n is Container:
		n.notification(Container.NOTIFICATION_SORT_CHILDREN)
	for c in n.get_children():
		if c is Control:
			_layout(c)

func _units() -> void:
	_check(ContentDB.errors.is_empty(), "content registry: %s" % ", ".join(ContentDB.errors))
	_check_clothing()
	_check_flocks()
	_check_social()
	_check_influence()
	_check_settings_ui()
	_check_settings_roundtrip()
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
	_check(med["ssao"] and not med["sdfgi"] and not med["ssil"] and not med["ssr"] and not med["volumetric_fog"], "medium uses SSAO without realtime GI")
	_check(high["sdfgi"] and high["ssao"] and high["ssil"] and high["volumetric_fog"], "high has GI, SSAO, SSIL, and light volumetric fog")
	_check(load("res://scripts/world/mesh_lib.gd").kilim_mat() != null, "kilim paths have a woven material")
	_check(load("res://scripts/world/mesh_lib.gd").cloth_mat("8a8680", "jamane0") != null, "jamane cloth has a weave")
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
	_check(int(migrated.get("version", 0)) == 2, "migrates to version 2")
	_check(int(migrated["inventory"].get("wood", 0)) == 3, "old bag becomes inventory")
	_check(typeof(migrated.get("relic_notes")) == TYPE_ARRAY, "version 2 adds relic notes")
	var v1 := {"version": 1, "inventory": {"stone": 4}, "player": {"x": 9, "y": 0, "z": 2, "yaw": 0}, "relic_notes": ["wheel"]}
	var kept := SaveFile.migrate(v1, start)
	_check(int(kept.get("version", 0)) == 2, "version 1 save migrates")
	_check(int(kept["inventory"].get("stone", 0)) == 4, "version 1 inventory survives")
	_check(str(kept["relic_notes"][0]) == "wheel", "existing relic notes are kept")
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
