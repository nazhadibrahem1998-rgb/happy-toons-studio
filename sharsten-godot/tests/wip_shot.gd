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
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
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
	cam.fov = 50
	add_child(cam)
	cam.current = true
	player.global_position = Vector3(90, 0.4, 140)
	var door = get_tree().get_first_node_in_group("house_door")
	var out := Vector3(0, 0, 1)
	if door:
		out = -door.global_transform.basis.z
		var gap: Vector3 = door.global_position + door.global_transform.basis.x * 0.85
		player.global_position = gap + out * 2.1
		player.global_position.y = 0.05
		for _i in 4:
			await RenderingServer.frame_post_draw
		cam.look_at_from_position(gap + out * 3.4 + Vector3(0, 1.55, 0), gap + Vector3(0, 1.15, 0), Vector3.UP)
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		_save_shot("v12-01-door.png")
		door.set_open(true, "shot")
		door.advance(0.45)
		for _i in 8:
			await RenderingServer.frame_post_draw
		cam.look_at_from_position(gap + out * 2.6 + Vector3(0, 1.45, 0), gap - out * 2.3 + Vector3(0, 0.75, 0), Vector3.UP)
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		_save_shot("v12-02-interior.png")
	var worker = null
	for v in get_tree().get_nodes_in_group("villager"):
		if v.rig and v.rig.tool:
			worker = v
			break
	if worker == null:
		for v in get_tree().get_nodes_in_group("villager"):
			if v.rig:
				worker = v
				break
	if worker:
		worker.set_physics_process(false)
		worker.global_position = worker.work_at + Vector3(1.2, 0, 1.2)
		worker.rotation.y = -0.8
		worker.rig.tick(0.1, 0.0, "chop")
		cam.look_at_from_position(worker.global_position + Vector3(1.7, 1.25, 1.5), worker.global_position + Vector3(0, 1.0, 0), Vector3.UP)
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		_save_shot("v12-03-npc-work.png")
		if door:
			var gap2: Vector3 = door.global_position + door.global_transform.basis.x * 0.85
			worker.global_position = gap2 + out * 1.35
			worker.global_position.y = 0.05
			worker.look_at(gap2, Vector3.UP)
			worker.rig.tick(0.1, 0.6, "walk")
			cam.look_at_from_position(gap2 + out * 3.2 + Vector3(1.1, 1.45, 0), gap2 + Vector3(0, 1.05, 0), Vector3.UP)
			await RenderingServer.frame_post_draw
			await RenderingServer.frame_post_draw
			_save_shot("v12-04-npc-entering.png")
	get_tree().quit(0)

func _save_shot(file_name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	if img.get_width() != 1920 or img.get_height() != 1080:
		img.resize(1920, 1080, Image.INTERPOLATE_LANCZOS)
	var path := ProjectSettings.globalize_path("res://wip/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_png(path)
	print("WIPSHOT %dx%d %s" % [img.get_width(), img.get_height(), path])
