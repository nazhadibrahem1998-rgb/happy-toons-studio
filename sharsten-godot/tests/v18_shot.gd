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
	GameState.save_path_override = "/tmp/sharsten-v18-shot.json"
	GameState.start_new()
	add_child(load("res://scripts/world/village_world.gd").new())

func _process(_delta: float) -> void:
	frames += 1
	if player == null:
		player = get_tree().get_first_node_in_group("player")
		return
	if frames < 14:
		return
	player.bot_override = true
	player.bot_wish = Vector2.ZERO
	if frames == 16:
		player.global_position = Vector3(18, 0.35, 48)
		player.yaw = 0.5
		player.body_yaw = 0.5
	if frames == 22:
		_save("v18-objective.jpg")
		player.global_position = Vector3(22, 0.35, 48)
		player.yaw = 0.0
	if frames == 28:
		_save("v18-relic.jpg")
		player.global_position = Vector3(40, 0.35, 30)
		player.yaw = 0.8
		player.body_yaw = 0.8
	if frames == 36:
		_save("v18-lane.jpg")
		get_tree().quit(0)

func _save(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://qa/v18/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_jpg(path, 0.85)
	print("V18SHOT ", file_name)
