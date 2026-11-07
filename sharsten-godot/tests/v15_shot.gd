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
	GameState.save_path_override = "/tmp/sharsten-v15-shot.json"
	GameState.start_new()
	add_child(load("res://scripts/world/village_world.gd").new())

func _process(_delta: float) -> void:
	frames += 1
	if player == null:
		player = get_tree().get_first_node_in_group("player")
		return
	if frames < 8:
		return
	player.bot_override = true
	player.global_position.y = maxf(player.global_position.y, 0.0)
	if frames == 8:
		player.global_position = Vector3(55, 0.35, 90)
		player.yaw = 0.6
		player.body_yaw = 0.6
		player.bot_wish = Vector2(0, 1)
		player.bot_sprint = false
		player.bot_crouch = false
	if frames == 28:
		_save("v15-walk.jpg")
		player.bot_sprint = true
	if frames == 48:
		_save("v15-run.jpg")
		player.bot_sprint = false
		player.bot_crouch = true
		player.bot_wish = Vector2(0, 1)
	if frames >= 49 and frames <= 62:
		_pose_worker()
	if frames == 62:
		_save("v15-crouch-work.jpg")
		get_tree().quit(0)

func _pose_worker() -> void:
	var folks := get_tree().get_nodes_in_group("villager")
	if folks.is_empty():
		return
	var worker = folks[0]
	worker.global_position = player.global_position + player.global_transform.basis * Vector3(1.5, 0, 1.2)
	worker.global_position.y = 0.0
	worker.velocity = Vector3.ZERO
	if worker.rig:
		worker.rig.set_lod(true)
		worker.rig.tick(0.45, 0.0, "chop")

func _save(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://qa/v15/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_jpg(path, 0.85)
	print("V15SHOT ", path)
