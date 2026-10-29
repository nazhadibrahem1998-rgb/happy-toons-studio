extends Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	TranslationServer.set_locale("ckb")
	if DisplayServer.get_name() != "headless":
		DisplayServer.window_set_title(GameConfig.GAME_TITLE)
	if _flag("--screenshots") or OS.get_environment("SHOOTER_SCREENSHOTS") == "1":
		var driver: Node = load("res://scripts/tools/screenshot_driver.gd").new()
		driver.name = "ScreenshotDriver"
		driver.process_mode = Node.PROCESS_MODE_ALWAYS
		add_child(driver)
	if _flag("--smoke") or OS.get_environment("SHOOTER_SMOKE") == "1":
		_run_smoke()
	if _flag("--combat-test") or OS.get_environment("SHOOTER_COMBAT_TEST") == "1":
		var combat: Node = load("res://scripts/tools/combat_test.gd").new()
		combat.name = "CombatTest"
		combat.process_mode = Node.PROCESS_MODE_ALWAYS
		add_child(combat)


func _flag(arg: String) -> bool:
	return OS.get_cmdline_user_args().has(arg)


func _run_smoke() -> void:
	await get_tree().create_timer(0.4).timeout
	print("SMOKE_START")
	LevelManager.start_game()
	var frames := 0
	while get_tree().get_first_node_in_group("player") == null and frames < 900:
		await get_tree().process_frame
		frames += 1
	while get_tree().get_nodes_in_group("enemy").size() < 10 and frames < 1800:
		await get_tree().process_frame
		frames += 1
	var player := get_tree().get_first_node_in_group("player") as PlayerBody
	var enemies := get_tree().get_nodes_in_group("enemy")
	if player == null or enemies.size() < 10:
		push_error("SMOKE_FAIL player/enemies %s %s" % [player, enemies.size()])
		get_tree().quit(1)
		return
	var hud := get_tree().current_scene.find_child("HUD", true, false)
	if hud == null:
		push_error("SMOKE_FAIL no HUD")
		get_tree().quit(1)
		return
	var soldier := enemies[0] as EnemySoldier
	var before: int = soldier.health
	soldier.apply_damage(10, player.global_position)
	if soldier.health != before - 10:
		push_error("SMOKE_FAIL damage")
		get_tree().quit(1)
		return
	for _i in 40:
		await get_tree().physics_frame
	if player.global_position.y < -0.5:
		push_error("SMOKE_FAIL player fell %s" % player.global_position)
		get_tree().quit(1)
		return
	print("SMOKE_OK enemies=", enemies.size(), " y=", player.global_position.y)
	get_tree().quit(0)
