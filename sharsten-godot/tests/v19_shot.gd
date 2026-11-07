extends Node

var frames := 0
var player

func _ready() -> void:
	get_window().size = Vector2i(1280, 720)
	Settings.preset = "low"
	Settings.vsync = false
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-v19-shot.json"
	GameState.start_new()
	add_child(load("res://scripts/world/village_world.gd").new())

func _process(_delta: float) -> void:
	frames += 1
	if player == null:
		player = get_tree().get_first_node_in_group("player")
		return
	if frames < 16:
		return
	player.bot_override = true
	player.bot_wish = Vector2.ZERO
	if frames == 16:
		player.global_position = Vector3(18, 0.35, 46)
		player.yaw = 0.6
		player.body_yaw = 0.6
		player.cam_target = 4.2
		player.cam_dist = 4.2
	if frames == 24:
		_save("v19-lane.jpg")
		player.global_position = Vector3(20, 0.35, 44)
		player.yaw = 2.4
		player.body_yaw = 2.4
		player.cam_target = 2.1
		player.cam_dist = 2.1
	if frames == 32:
		_save("v19-azad.jpg")
		player.global_position = Vector3(56, 0.35, 26)
		player.yaw = 1.57
		player.body_yaw = 1.57
		player.cam_target = 6.0
		player.cam_dist = 6.0
	if frames == 42:
		_save("v19-animals.jpg")
		var door = get_tree().get_first_node_in_group("house_door")
		if door:
			var into: Vector3 = door.global_transform.basis.z
			player.global_position = door.global_position + into * 1.4
			player.global_position.y = 0.35
			player.yaw = atan2(-into.x, -into.z)
			player.body_yaw = player.yaw
			player.cam_target = 3.2
			player.cam_dist = 3.2
			if door.has_method("set_open"):
				door.set_open(true, "shot")
	if frames == 52:
		_save("v19-interior.jpg")
		get_tree().quit(0)

func _save(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://qa/v19/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_jpg(path, 0.85)
	print("V19SHOT ", file_name)
