extends Node

func _ready() -> void:
	await _run()


func _run() -> void:
	var dir := OS.get_environment("SHOOTER_SHOT_DIR")
	if dir == "":
		dir = "/tmp/shooter-shots"
	DirAccess.make_dir_recursive_absolute(dir)
	await get_tree().create_timer(0.8, true).timeout
	var flag_img := KurdistanFlag.texture().get_image()
	flag_img.save_png(dir.path_join("flag_texture.png"))
	await _shot(dir, "01_main_menu")
	LevelManager.start_game()
	var frames := 0
	while get_tree().get_nodes_in_group("enemy").size() < 10 and frames < 1800:
		await get_tree().process_frame
		frames += 1
	var player := get_tree().get_first_node_in_group("player") as PlayerBody
	if player == null:
		push_error("SHOT_NO_PLAYER")
		get_tree().quit(1)
		return
	player.invulnerable = true
	_full_res()
	await get_tree().create_timer(0.7, true).timeout
	var flag := _entrance_flag()
	if flag:
		_frame_flag(player, flag)
		await get_tree().physics_frame
		await get_tree().physics_frame
		_frame_flag(player, flag)
		await get_tree().create_timer(0.45, true).timeout
		await _shot(dir, "02_village_flag")
	player.camera_distance_override = -1.0
	player.global_position = Vector3(0.0, 0.2, 12.0)
	player.velocity = Vector3.ZERO
	player.aim_at(Vector3(0.2, 1.5, -4.0))
	await get_tree().create_timer(0.7, true).timeout
	await _shot(dir, "03_gameplay")
	player.set_ads(true)
	await get_tree().create_timer(0.55, true).timeout
	await _shot(dir, "04_aiming")
	player.set_ads(false)
	var enemy := _path_enemy()
	if enemy:
		player.global_position = enemy.global_position + Vector3(0.35, 0.12, 3.6)
		player.velocity = Vector3.ZERO
		player.aim_at(enemy.global_position + Vector3(0, 1.35, 0))
		enemy.force_combat()
	await get_tree().create_timer(0.7, true).timeout
	await _shot(dir, "05_enemy")
	var living := get_tree().get_nodes_in_group("enemy")
	for node in living:
		if node.has_method("kill"):
			node.call("kill")
	await get_tree().create_timer(1.6, true).timeout
	await _shot(dir, "06_level_complete")
	print("SHOTS_DONE")
	get_tree().quit(0)


func _entrance_flag() -> Node3D:
	var best: Node3D = null
	var best_z := -1.0e9
	for node in get_tree().get_nodes_in_group("kurdistan_flag"):
		var marker := node as Node3D
		if marker == null or marker.name != "KurdistanFlag":
			continue
		if marker.global_position.z > best_z:
			best_z = marker.global_position.z
			best = marker
	return best


func _frame_flag(player: PlayerBody, flag: Node3D) -> void:
	var basis := flag.global_transform.basis
	player.global_position = flag.global_position + basis * Vector3(0.35, 0.12, 2.15)
	player.global_position.y = 0.15
	player.velocity = Vector3.ZERO
	player.camera_distance_override = 2.35
	player.aim_at(flag.global_position + basis * Vector3(0.78, 1.35, 0.0))


func _full_res() -> void:
	var env_node := get_tree().get_first_node_in_group("world_env") as WorldEnvironment
	if env_node and env_node.environment:
		env_node.environment.sdfgi_enabled = false
		env_node.environment.volumetric_fog_enabled = false
		env_node.environment.ssao_enabled = false
		env_node.environment.glow_enabled = true
	var vp := get_viewport()
	vp.scaling_3d_scale = 1.0
	vp.msaa_3d = Viewport.MSAA_2X


func _path_enemy() -> EnemySoldier:
	var best: EnemySoldier = null
	var best_z := -1.0e9
	for node in get_tree().get_nodes_in_group("enemy"):
		var soldier := node as EnemySoldier
		if soldier == null or soldier.variant != "rifleman":
			continue
		if soldier.global_position.y < 1.0 and soldier.global_position.z > best_z:
			best_z = soldier.global_position.z
			best = soldier
	return best


func _shot(dir: String, shot_name: String) -> void:
	for _i in 3:
		await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	if image == null or image.get_width() == 0:
		push_error("SHOT_EMPTY " + shot_name)
		return
	var path := dir.path_join(shot_name + ".png")
	var err := image.save_png(path)
	print("SHOT ", path, " ", image.get_width(), "x", image.get_height(), " err=", err)
