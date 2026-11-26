extends Node

var world: Node
var step := 0
var frames := 0
var cam: Camera3D
var busy := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Settings.set_preset("low")
	Settings.vsync = false
	Settings.fps_cap = 0
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-shots.json"
	GameState.start_new()
	world = load("res://scripts/world/village_world.gd").new()
	add_child(world)
	var from := OS.get_environment("SHOT_FROM")
	if from != "":
		step = int(from)
	call_deferred("_freeze")

func _freeze() -> void:
	get_tree().paused = true

func _process(_delta: float) -> void:
	if busy:
		return
	frames += 1
	if frames < 8:
		return
	var player = get_tree().get_first_node_in_group("player")
	if player == null:
		return
	if cam == null:
		cam = player.camera
		player.camera_locked = true
		player.rig.visible = false
		var detail = world.get("tree_detail") if world else null
		if detail and detail.multimesh:
			detail.visibility_range_end = 120.0
			detail.multimesh.visible_instance_count = mini(90, detail.multimesh.instance_count)
		var far = world.get("tree_far") if world else null
		if far:
			far.visibility_range_begin = 18.0
			far.visibility_range_end = 160.0
	busy = true
	_capture()

func _capture() -> void:
	print("STEP ", step)
	match step:
		0:
			_look(Vector3(62, 14, 102), Vector3(43, 1.5, 68))
			await _save("village.png")
		1:
			var tall = get_tree().root.find_child("khola_direzh", true, false)
			var hama = get_tree().root.find_child("hama_kawchkan", true, false)
			var fata = get_tree().root.find_child("fata_chawpes", true, false)
			if tall:
				tall.rotation.y = 2.2
			if hama:
				hama.rotation.y = 1.4
			if fata:
				fata.rotation.y = 0.6
			var focus := Vector3(54, 1.4, 84)
			if tall:
				focus = tall.global_position + Vector3(0, 1.45, 0)
			_look(focus + Vector3(2.6, 0.25, 2.2), focus)
			await _save("villagers.png")
		2:
			get_tree().call_group("ui", "open_craft", "carpenter")
			await _save("crafting.png")
		3:
			get_tree().call_group("ui", "_close_craft")
			GameState.show_lines([
				{"name": "Khola Direzh (Tall Khola)", "text": "The mould split again, Hama. I carried the timber down a lane that turned twice into itself."},
				{"name": "Hama-y Kawchkan (Hama of the Spoons)", "text": "Then leave a new mould on the bench. The children still need spoons, however tall the day is."},
			], "spoon_bench")
			var hama2 = get_tree().root.find_child("hama_kawchkan", true, false)
			var focus2 := Vector3(54, 1.2, 84)
			if hama2:
				focus2 = hama2.global_position + Vector3(0.3, 1.2, 0)
			_look(focus2 + Vector3(3.4, 0.5, 1.4), focus2)
			await _save("overheard.png")
		4:
			get_tree().call_group("ui", "open_choice")
			_look(Vector3(70.5, 1.7, 2.0), Vector3(67.2, 0.7, -4.8))
			await _save("choice.png")
		5:
			get_tree().call_group("ui", "_close_craft")
			if world and world.has_method("apply_wake"):
				world.apply_wake()
			GameState.subtitle_until = 0.0
			GameState.thought = "The dream cracks. I wake in the real Sharsten. The machines are only relics."
			GameState.thought_until = Time.get_ticks_msec() / 1000.0 + 30.0
			_look(Vector3(82, 8, 58), Vector3(96, 2.4, 48))
			await _save("ruins.png")
		6:
			get_tree().call_group("ui", "open_diary", "skills")
			await _save("diary.png")
		7:
			get_tree().call_group("ui", "_show_credits")
			await _save("credits.png")
		_:
			get_tree().quit(0)
			return
	step += 1
	busy = false
	if step > 7:
		get_tree().quit(0)

func _look(from: Vector3, at: Vector3) -> void:
	cam.current = true
	cam.look_at_from_position(from, at, Vector3.UP)

func _save(file_name: String) -> void:
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://screenshots/" + file_name)
	img.save_png(path)
	print("SHOT ", file_name, " ", img.get_width(), "x", img.get_height())
