extends Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await _run()


func _run() -> void:
	_floor()
	var player := (load("res://scenes/player/player.tscn") as PackedScene).instantiate() as PlayerBody
	player.position = Vector3(0, 0.2, 2.0)
	add_child(player)
	var enemy := _soldier(Vector3(0, 0.2, 0.4))
	for _i in 4:
		await get_tree().physics_frame
	player.set_physics_process(false)
	enemy.set_physics_process(false)
	player.snap_facing(enemy.global_position)
	var before := enemy.health
	var hits := player.weapon.debug_hit(0, false)
	if hits < 1 or enemy.health != before - GameConfig.melee_damage(0, false, false):
		_fail("hit health %s -> %s hits=%s" % [before, enemy.health, hits])
		return
	print("MELEE_HIT ", before, " -> ", enemy.health)
	var combo := _soldier(Vector3(3, 0.2, 0.4))
	await get_tree().physics_frame
	combo.set_physics_process(false)
	player.global_position = Vector3(3, 0.2, 2.0)
	player.snap_facing(combo.global_position)
	player.weapon.debug_hit(0, false)
	player.weapon.debug_hit(1, false)
	player.weapon.debug_hit(2, false)
	if combo.alive:
		_fail("combo left soldier alive health=%s" % combo.health)
		return
	print("MELEE_COMBO ok")
	var hp := player.health
	player.blocking = true
	player.block_age = 1.0
	player.iframe_left = 0.0
	var blocked := player.receive_hit(20, Vector3.ZERO)
	var blocked_loss := hp - player.health
	if blocked != "block" or blocked_loss >= 20 or blocked_loss <= 0:
		_fail("block result=%s loss=%s" % [blocked, blocked_loss])
		return
	print("MELEE_BLOCK ", blocked_loss)
	hp = player.health
	player.blocking = false
	player.iframe_left = 0.4
	var dodged := player.receive_hit(20, Vector3.ZERO)
	if dodged != "dodge" or player.health != hp:
		_fail("dodge result=%s health=%s" % [dodged, player.health])
		return
	print("MELEE_DODGE ok")
	var wall := _wall(Vector3(0, 1.2, 1.2))
	player.global_position = Vector3(0, 0.2, 2.2)
	player.iframe_left = 0.0
	for _w in 3:
		await get_tree().physics_frame
	var covered := enemy
	if not covered.alive:
		covered = _soldier(Vector3(0, 0.2, 0.3))
		await get_tree().physics_frame
		covered.set_physics_process(false)
	var cover_before := covered.health
	player.snap_facing(covered.global_position)
	player.weapon.debug_hit(0, false)
	if covered.health != cover_before:
		_fail("cover did not block sword %s -> %s" % [cover_before, covered.health])
		return
	print("MELEE_COVER blocked")
	for child in get_children():
		child.queue_free()
	await get_tree().process_frame
	LevelManager.start_game()
	var frames := 0
	while get_tree().get_nodes_in_group("enemy").size() < 10 and frames < 2400:
		await get_tree().process_frame
		frames += 1
	var hero := get_tree().get_first_node_in_group("player") as PlayerBody
	var foes := get_tree().get_nodes_in_group("enemy").duplicate()
	if hero == null or foes.size() < 10:
		_fail("level enemies %s" % foes.size())
		return
	hero.invulnerable = true
	for node in foes:
		var foe := node as Node3D
		if foe == null:
			continue
		var guard := 0
		while bool(foe.get("alive")) and guard < 8:
			hero.global_position = foe.global_position + Vector3(0, 0.1, 1.35)
			hero.velocity = Vector3.ZERO
			hero.snap_facing(foe.global_position)
			hero.weapon.debug_hit(guard % 3, false)
			guard += 1
		if bool(foe.get("alive")):
			_fail("could not defeat %s health=%s" % [foe.name, foe.get("health")])
			return
	await get_tree().create_timer(0.2, true).timeout
	var level := get_tree().current_scene
	if int(level.get("alive")) != 0:
		_fail("level still has %s enemies" % level.get("alive"))
		return
	print("MELEE_LEVEL_CLEAR")
	print("COMBAT_OK")
	get_tree().quit(0)


func _soldier(at: Vector3) -> EnemySoldier:
	var enemy := (load("res://scenes/enemies/soldier.tscn") as PackedScene).instantiate() as EnemySoldier
	enemy.setup("soldier", [at, at + Vector3(0, 0, -2)])
	add_child(enemy)
	enemy.global_position = at
	enemy.set_physics_process(false)
	return enemy


func _floor() -> void:
	var body := StaticBody3D.new()
	body.collision_layer = 1
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(40, 1, 40)
	shape.shape = box
	shape.position = Vector3(0, -0.5, 0)
	body.add_child(shape)
	add_child(body)


func _wall(at: Vector3) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.collision_layer = 1
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(6, 2.4, 0.45)
	shape.shape = box
	body.add_child(shape)
	add_child(body)
	body.global_position = at
	return body


func _fail(reason: String) -> void:
	push_error("COMBAT_FAIL " + reason)
	print("COMBAT_FAIL ", reason)
	get_tree().quit(1)
