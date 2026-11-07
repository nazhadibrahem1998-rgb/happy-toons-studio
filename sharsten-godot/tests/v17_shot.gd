extends Node

var frames := 0
var player
var phase := "strike"

func _ready() -> void:
	get_window().size = Vector2i(1280, 720)
	Settings.preset = "low"
	Settings.vsync = false
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-v17-shot.json"
	GameState.start_new()
	add_child(load("res://scripts/world/village_world.gd").new())

func _process(_delta: float) -> void:
	frames += 1
	if player == null:
		player = get_tree().get_first_node_in_group("player")
		return
	if frames < 12:
		return
	player.bot_override = true
	player.bot_wish = Vector2.ZERO
	if phase == "strike":
		if frames == 12:
			player.global_position = Vector3(128.0, 0.35, 34.0)
		var foe = _nearest()
		if foe:
			var to: Vector3 = foe.global_position - player.global_position
			to.y = 0
			player.global_position = foe.global_position - to.normalized() * 1.5
			player.global_position.y = 0.35
			player.yaw = atan2(-to.x, -to.z)
			player.body_yaw = player.yaw
		if frames == 14:
			player._begin_strike()
		if frames == 20:
			_save("v17-strike.jpg")
			phase = "camp"
			frames = 12
	elif phase == "camp":
		player.global_position = Vector3(128.0, 0.35, 28.0)
		player.yaw = PI
		player.body_yaw = PI
		player._locked_yaw = PI
		var i := 0
		for foe in get_tree().get_nodes_in_group("enemy"):
			if foe is Node3D:
				foe.set_physics_process(false)
				foe.global_position = Vector3(126.2 + float(i) * 1.6, 0.0, 32.2)
				foe.rotation.y = PI
				i += 1
		player._attack_t = 0.0
		player._attack_move = ""
		if frames == 18:
			_save("v17-encounter.jpg")
			phase = "guard"
			frames = 12
	elif phase == "guard":
		player.health = 62.0
		player._attack_move = "guard"
		player._attack_t = 0.4
		if frames == 16:
			_save("v17-guard.jpg")
			get_tree().quit(0)

func _nearest():
	var best = null
	var reach := 30.0
	for n in get_tree().get_nodes_in_group("enemy"):
		if n is Node3D:
			var d: float = player.global_position.distance_to(n.global_position)
			if d < reach:
				reach = d
				best = n
	return best

func _save(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://qa/v17/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_jpg(path, 0.85)
	print("V17SHOT ", file_name, " foes=", get_tree().get_nodes_in_group("enemy").size())
