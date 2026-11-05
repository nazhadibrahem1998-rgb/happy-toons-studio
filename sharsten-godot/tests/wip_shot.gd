extends Node

## One 1920x1080 frame of the v3 village: rigged walk, feet on the ground, light fog.

var frames := 0
var shot := false

func _ready() -> void:
	get_window().mode = Window.MODE_WINDOWED
	get_window().size = Vector2i(1920, 1080)
	DisplayServer.window_set_size(Vector2i(1920, 1080))
	Settings.preset = "low"
	Settings.fog_mode = "light"
	Settings.vsync = false
	Settings.fullscreen = false
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-wip-shot.json"
	GameState.start_new()
	var world = load("res://scripts/world/village_world.gd").new()
	add_child(world)

func _process(_delta: float) -> void:
	if shot:
		return
	frames += 1
	var player = get_tree().get_first_node_in_group("player")
	if player == null:
		return
	if frames == 8:
		player.global_position = Vector3(18, 0.4, 50)
		player.velocity = Vector3.ZERO
		player.bot_override = true
		player.bot_wish = Vector2(0, 1)
		player.bot_sprint = false
		player.yaw = 0.15
		var folks := get_tree().get_nodes_in_group("villager")
		if folks.size() > 0:
			folks[0].global_position = Vector3(16.4, 0.05, 48.6)
			folks[0].rotation.y = 0.4
		if folks.size() > 1:
			folks[1].global_position = Vector3(19.5, 0.05, 47.8)
			folks[1].rotation.y = -0.5
	if frames >= 28:
		shot = true
		_shoot(player)

func _shoot(player: Node3D) -> void:
	var cam := Camera3D.new()
	cam.fov = 46
	add_child(cam)
	var feet := player.global_position + Vector3(0, 0.15, 0)
	cam.look_at_from_position(feet + Vector3(-2.35, 1.15, 3.05), feet + Vector3(0, 0.85, 0), Vector3.UP)
	cam.current = true
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img.get_width() != 1920 or img.get_height() != 1080:
		img.resize(1920, 1080, Image.INTERPOLATE_LANCZOS)
	var path := ProjectSettings.globalize_path("res://wip/v3-wip.png")
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_png(path)
	print("WIPSHOT %dx%d %s" % [img.get_width(), img.get_height(), path])
	get_tree().quit(0)
