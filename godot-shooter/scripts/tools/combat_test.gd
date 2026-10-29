extends Node

# Headless check: a camera-center shot damages an enemy, a headshot kills,
# and an enemy ray at a player behind a wall is blocked.


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await _run()


func _run() -> void:
	var root := get_tree().root
	root.size = Vector2i(1280, 720)
	_floor()
	var player := (load("res://scenes/player/player.tscn") as PackedScene).instantiate() as PlayerBody
	player.position = Vector3(0, 0.2, 4.0)
	player.invulnerable = false
	add_child(player)
	var enemy := _soldier(Vector3(0, 0.2, -3.0))
	for _i in 4:
		await get_tree().physics_frame
	player.set_physics_process(false)
	enemy.set_physics_process(false)
	player.velocity = Vector3.ZERO
	var rifle: HitscanRifle = player.rifle
	rifle.spread_scale = 0.0
	var before := enemy.health
	_fire_at(player, rifle, enemy.global_position + Vector3(0, 1.0, 0))
	if enemy.health != before - GameConfig.BODY_DAMAGE:
		_fail("body shot health %s -> %s, expected -%s" % [before, enemy.health, GameConfig.BODY_DAMAGE])
		return
	if not enemy.alive:
		_fail("body shot killed; 3-4 shots should be required")
		return
	print("COMBAT_BODY ", before, " -> ", enemy.health)
	_fire_at(player, rifle, enemy.global_position + Vector3(0, 1.64, 0))
	if enemy.alive or enemy.health > 0:
		_fail("headshot left health %s alive=%s" % [enemy.health, enemy.alive])
		return
	print("COMBAT_HEAD ok")
	var enemy_b := _soldier(Vector3(0, 0.2, -3.2))
	var wall := _wall(Vector3(0, 1.3, 0.4))
	for _j in 3:
		await get_tree().physics_frame
	enemy_b.spread_deg = 0.0
	enemy_b.spread_per_m = 0.0
	enemy_b.move_spread = 0.0
	var hp_before := player.health
	enemy_b._shoot()
	if player.health != hp_before:
		_fail("cover leaked damage %s -> %s" % [hp_before, player.health])
		return
	if enemy_b._visible_point(player).y > -100.0:
		_fail("line of sight through the wall")
		return
	print("COMBAT_COVER blocked")
	wall.global_position = Vector3(12, 1.3, 0.4)
	for _k in 2:
		await get_tree().physics_frame
	enemy_b._shoot()
	if player.health >= hp_before:
		_fail("open shot did no damage, health %s" % player.health)
		return
	print("COMBAT_OPEN ", hp_before, " -> ", player.health)
	print("COMBAT_OK")
	get_tree().quit(0)


func _fire_at(player: PlayerBody, rifle: HitscanRifle, point: Vector3) -> void:
	var cam := Camera3D.new()
	cam.fov = 60.0
	add_child(cam)
	# Sit the camera on the player-to-target line so the center ray is that line,
	# including when it must pass the player's own capsule.
	var through := player.global_position + Vector3(0, point.y - player.global_position.y, 0.4)
	cam.global_position = through + (through - point).normalized() * 0.2
	cam.look_at(point, Vector3.UP)
	rifle.next_shot = 0.0
	rifle.try_fire(cam, 1.0)
	cam.queue_free()


func _soldier(at: Vector3) -> EnemySoldier:
	var enemy := (load("res://scenes/enemies/soldier.tscn") as PackedScene).instantiate() as EnemySoldier
	enemy.setup("rifleman", [at, at + Vector3(0, 0, -2)])
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
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(8, 2.6, 0.6)
	shape.shape = box
	body.add_child(shape)
	add_child(body)
	body.global_position = at
	return body


func _fail(reason: String) -> void:
	push_error("COMBAT_FAIL " + reason)
	print("COMBAT_FAIL ", reason)
	get_tree().quit(1)
