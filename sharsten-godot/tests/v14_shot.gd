extends Node

var frames := 0

func _ready() -> void:
	get_window().size = Vector2i(1280, 720)
	Settings.preset = "low"
	Settings.vsync = false
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-v14-shot.json"
	GameState.start_new()
	add_child(load("res://scripts/world/village_world.gd").new())

func _process(_delta: float) -> void:
	frames += 1
	var player = get_tree().get_first_node_in_group("player")
	if player == null or frames < 8:
		return
	if frames == 8:
		var door = get_tree().get_first_node_in_group("house_door")
		if door:
			var out: Vector3 = -door.global_transform.basis.z
			player.global_position = door.global_position + out * 0.9
			player.global_position.y = 0.35
			player.yaw = atan2(out.x, out.z)
			player.pitch = -0.05
			player.cam_target = 4.4
			player.cam_dist = 4.4
		GameState.subtitle_lines = [
			{"name": "Pira Majid", "text": "One jar at dawn. That is a job, not a debate."},
			{"name": "Kura Rasho", "text": "I stepped the path."},
		]
		GameState.subtitle_until = Time.get_ticks_msec() / 1000.0 + 30.0
		return
	if frames == 20:
		_save("v14-01-camera-wall.png")
	if frames == 21:
		player.global_position = Vector3(18, 0.35, 48)
		player.yaw = 0.4
	if frames == 30:
		_save("v14-02-lane.png")
	if frames == 31:
		var fire = get_tree().get_first_node_in_group("bonfire")
		if fire:
			player.global_position = fire.global_position + Vector3(3.2, 0.35, 3.2)
			player.yaw = atan2(-3.2, -3.2)
	if frames == 40:
		_save("v14-03-bonfire.png")
		get_tree().quit(0)

func _save(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://wip/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_png(path)
	print("V14SHOT ", path)
