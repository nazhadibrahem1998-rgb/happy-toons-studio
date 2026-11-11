extends GutTest

func before_each() -> void:
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-v20-play.json"
	for suffix in ["", ".bak", ".tmp"]:
		DirAccess.remove_absolute(GameState.save_path_override + suffix)
	GameState.start_new()
	GameState.data["play_time"] = 0.0

func after_each() -> void:
	if get_tree().paused:
		get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	GameState.release_runtime_caches()

func _inside(at: Vector3) -> bool:
	for h in get_tree().get_nodes_in_group("house_block"):
		if not h.has_meta("min_xz"):
			continue
		var mn: Vector2 = h.get_meta("min_xz")
		var mx: Vector2 = h.get_meta("max_xz")
		if at.x > mn.x + 0.15 and at.x < mx.x - 0.15 and at.z > mn.y + 0.15 and at.z < mx.y - 0.15:
			return true
	return false

func test_map_deed_and_sleep_in_the_village() -> void:
	var world = load("res://scripts/world/village_world.gd").new()
	add_child_autofree(world)
	var ui = get_tree().get_first_node_in_group("ui")
	assert_not_null(ui, "the village opens a hud")
	var valley: Control = ui.get_node("ValleyMap")
	valley._process(0.016)
	assert_eq(str(valley.mode), "corner", "the small map is showing")
	assert_gt(valley.size.x, 120.0, "the corner map has a size")
	ui._toggle_map()
	valley._process(0.016)
	assert_eq(str(valley.mode), "large", "M opens the valley map")
	assert_gt(valley.size.x, 400.0, "the open map is the large one")
	ui._close_map()
	assert_eq(str(valley.mode), "corner", "the large map closes")
	assert_false(get_tree().paused, "closing the map returns to play")
	ui.deeds.push("Gather wood")
	ui.deeds.tick(9.3)
	assert_lt(ui.deeds.alpha, 0.2, "the deed fades")
	var show := InputEventAction.new()
	show.action = "show_deed"
	show.pressed = true
	ui._unhandled_input(show)
	assert_gt(ui.deeds.alpha, 0.9, "H shows the deed again")
	var bed: Node = null
	for n in get_tree().get_nodes_in_group("interact"):
		if str(n.get_meta("kind", "")) == "bed":
			bed = n
			break
	assert_not_null(bed, "a house has a bed")
	var before := float(GameState.data.get("play_time", 0.0))
	bed.use(null)
	assert_gt(float(GameState.data["play_time"]), before + 300.0, "sleeping moves the day")
	assert_eq(int(GameState.data["flags"]["slept"]), 1, "the bed records the sleep")
	assert_true(GameState.save_now(), "sleep writes the save")
	GameState.data["play_time"] = float(GameState.data["play_time"]) + 1.0
	assert_true(GameState.save_now(), "a second save rotates the backup")
	var torn := FileAccess.open(GameState.save_path(), FileAccess.WRITE)
	torn.store_string("torn-save")
	torn.close()
	assert_true(GameState.has_save(), "Continue still sees the backup")
	assert_true(GameState.load_game(), "Continue falls back to the backup")
	assert_eq(int(GameState.data["flags"]["slept"]), 1, "the backup kept the sleep")
	var hits := 0
	Engine.time_scale = 4.0
	Engine.physics_ticks_per_second = 10
	for shift in [1, 9, 13, 18, 20, 22]:
		GameState.data["play_time"] = 50.0 * float(shift)
		for _step in 40:
			await get_tree().physics_frame
			for v in get_tree().get_nodes_in_group("villager"):
				if _inside(v.global_position) and not v.is_home():
					hits += 1
					break
	Engine.time_scale = 1.0
	Engine.physics_ticks_per_second = 60
	assert_eq(hits, 0, "villagers stay outside house meshes across the day")
