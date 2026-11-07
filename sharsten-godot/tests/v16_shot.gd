extends Node

var frames := 0
var player
var phase := "climb"
var saved := {}

func _ready() -> void:
	get_window().size = Vector2i(1280, 720)
	Settings.preset = "low"
	Settings.vsync = false
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-v16-shot.json"
	GameState.start_new()
	add_child(load("res://scripts/world/village_world.gd").new())

func _process(_delta: float) -> void:
	frames += 1
	if player == null:
		player = get_tree().get_first_node_in_group("player")
		return
	if phase == "climb" and frames < 10:
		return
	if phase == "climb" and frames == 10:
		_face_house()
	if phase == "climb":
		player.bot_override = true
		player.bot_wish = Vector2(0, 1)
		player.bot_sprint = false
		if not saved.has("climb") and player._hoist > 0.12 and player._hoist < 0.42 and player.global_position.y > 1.8:
			_save("v16-climb.jpg")
			saved["climb"] = true
		if not saved.has("roof") and player.global_position.y > 2.4 and player.is_on_floor() and player._hoist < 0.0:
			player.bot_wish = Vector2.ZERO
			_save("v16-roof.jpg")
			saved["roof"] = true
			phase = "blend"
			frames = 0
	elif phase == "blend":
		if frames == 2:
			_crowd()
		if not saved.has("blend") and GameState.blended and frames > 8:
			_save("v16-blend.jpg")
			saved["blend"] = true
			get_tree().quit(0)
		if frames > 80:
			if not saved.has("climb"):
				_save("v16-climb.jpg")
			if not saved.has("roof"):
				_save("v16-roof.jpg")
			if not saved.has("blend"):
				_save("v16-blend.jpg")
			get_tree().quit(0)

func _face_house() -> void:
	var block = get_tree().get_first_node_in_group("house_block")
	if block == null:
		return
	var house: Node3D = block.get_parent()
	var away: Vector3 = -house.global_transform.basis.z
	away.y = 0
	away = away.normalized()
	var toward := -away
	player.global_position = house.global_position + away * 4.6
	player.global_position.y = 0.35
	player.yaw = atan2(-toward.x, -toward.z)
	player.body_yaw = player.yaw
	player._locked_yaw = player.yaw

func _crowd() -> void:
	player.global_position = Vector3(55, 0.35, 90)
	player.yaw = 0.4
	player.body_yaw = 0.4
	player.bot_wish = Vector2(0, 1)
	player.bot_sprint = false
	var i := 0
	for v in get_tree().get_nodes_in_group("villager"):
		if not v is Node3D:
			continue
		v.global_position = player.global_position + Vector3(-1.1 + float(i) * 1.0, 0, -1.2)
		v.velocity = Vector3.ZERO
		i += 1
		if i >= 3:
			break

func _save(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://qa/v16/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_jpg(path, 0.85)
	print("V16SHOT ", file_name, " y=", player.global_position.y, " blend=", GameState.blended)
