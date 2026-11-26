extends Node

var _done: bool = false
var _target: Node3D


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().create_timer(0.35, true).timeout
	LevelManager.start_game()
	var frames := 0
	while get_tree().get_first_node_in_group("player") == null and frames < 900:
		await get_tree().process_frame
		frames += 1
	while get_tree().get_nodes_in_group("enemy").is_empty() and frames < 1800:
		await get_tree().process_frame
		frames += 1
	var player := get_tree().get_first_node_in_group("player") as PlayerBody
	if player:
		player.lock_on = true
		player.invulnerable = true
		player.ensure_touch_hud()
		var packed := load("res://scenes/enemies/soldier.tscn") as PackedScene
		var foe := packed.instantiate() as EnemySoldier
		foe.setup("soldier", [Vector3(0, 0.2, 8), Vector3(0, 0.2, 6)])
		get_tree().current_scene.add_child(foe)
		foe.global_position = Vector3(0, 0.2, 8.2)
		_target = foe
		_place(player)
	print("BOUT_READY")


func _process(_delta: float) -> void:
	if _done:
		return
	var player := get_tree().get_first_node_in_group("player") as PlayerBody
	if player == null:
		return
	var enemy := _target
	if enemy == null or not bool(enemy.get("alive")):
		_done = true
		print("BOUT_KO")
		return
	if player.global_position.distance_to(enemy.global_position) > 1.7:
		_place(player)
	player.snap_facing(enemy.global_position)


func _place(player: PlayerBody) -> void:
	var enemy := _target if _target != null else _nearest(player)
	if enemy == null:
		return
	player.global_position = enemy.global_position + Vector3(0, 0.05, 1.25)
	player.velocity = Vector3.ZERO
	player.snap_facing(enemy.global_position)


func _nearest(player: PlayerBody) -> Node3D:
	var best: Node3D = null
	var best_d := 1.0e9
	for node in get_tree().get_nodes_in_group("enemy"):
		var enemy := node as Node3D
		if enemy == null or not bool(enemy.get("alive")):
			continue
		var dist := player.global_position.distance_to(enemy.global_position)
		if dist < best_d:
			best_d = dist
			best = enemy
	return best
