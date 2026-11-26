class_name MeleeWeapon
extends Node3D

var style: String = "wood"
var busy: bool = false
var combo_step: int = 0
var combo_window: float = 0.0
var attack_kind: String = ""
var attack_t: float = 0.0
var attack_len: float = 0.34
var hit_done: bool = false
var queued: String = ""

var _player: PlayerBody


func _ready() -> void:
	_rebuild()


func bind(body: PlayerBody) -> void:
	_player = body


func display_name() -> String:
	if style == "metal":
		return GameConfig.STR["sword_metal"]
	return GameConfig.STR["sword_wood"]


func equip_metal() -> void:
	style = "metal"
	_rebuild()


func try_light() -> bool:
	return _request("light")


func try_heavy() -> bool:
	return _request("heavy")


func advance(delta: float) -> void:
	if combo_window > 0.0:
		combo_window = maxf(0.0, combo_window - delta)
		if combo_window <= 0.0 and not busy:
			combo_step = 0
	if not busy:
		rotation.x = lerpf(rotation.x, 0.55, 1.0 - exp(-8.0 * delta))
		rotation.y = lerpf(rotation.y, 0.85, 1.0 - exp(-8.0 * delta))
		return
	attack_t += delta
	var u := clampf(attack_t / attack_len, 0.0, 1.0)
	var swing := sin(u * PI)
	rotation.x = lerpf(0.9, -1.25, swing) if attack_kind == "light" else lerpf(1.15, -1.45, swing)
	if not hit_done and u >= 0.42:
		hit_done = true
		_connect_hit(attack_kind, combo_step)
	if attack_t < attack_len:
		return
	busy = false
	combo_window = 0.72
	if attack_kind == "light":
		combo_step = mini(combo_step + 1, 3)
	else:
		combo_step = 0
	if queued != "":
		var next := queued
		queued = ""
		_begin(next)


func debug_hit(step: int, heavy: bool) -> int:
	return _connect_hit("heavy" if heavy else "light", step)


func _request(kind: String) -> bool:
	if not busy:
		if kind == "light" and combo_window <= 0.0:
			combo_step = 0
		_begin(kind)
		return true
	if kind == "light" and attack_kind == "light" and combo_step < 2:
		queued = "light"
		return true
	return false


func _begin(kind: String) -> void:
	busy = true
	hit_done = false
	attack_kind = kind
	attack_t = 0.0
	attack_len = 0.5 if kind == "heavy" else 0.32
	if kind == "light" and combo_step >= 3:
		combo_step = 0
	AudioDirector.play_3d("swing", global_position, -6.0)


func _connect_hit(kind: String, step: int) -> int:
	if _player == null:
		return 0
	var damage := GameConfig.melee_damage(step, kind == "heavy", style == "metal")
	var reach := 2.15 if kind == "heavy" else 1.9
	var arc := deg_to_rad(110.0)
	var origin := _player.global_position
	var forward := -_player.global_transform.basis.z
	forward.y = 0.0
	if forward.length() < 0.01:
		return 0
	forward = forward.normalized()
	var space := _player.get_world_3d().direct_space_state
	var hits := 0
	for node in _player.get_tree().get_nodes_in_group("enemy"):
		var enemy := node as Node3D
		if enemy == null or not bool(enemy.get("alive")):
			continue
		var flat := enemy.global_position - origin
		flat.y = 0.0
		var dist := flat.length()
		if dist > reach or dist < 0.05:
			continue
		if forward.dot(flat / dist) < cos(arc * 0.5):
			continue
		if _blocked(space, origin, enemy.global_position):
			continue
		if enemy.has_method("apply_damage"):
			enemy.call("apply_damage", damage, origin, false)
		if enemy is CharacterBody3D:
			var shove := flat.normalized() * (4.2 if kind == "heavy" else 2.6)
			(enemy as CharacterBody3D).velocity += shove
		hits += 1
		ImpactEffect.spawn(enemy.global_position + Vector3(0, 1.2, 0), forward, "flesh")
	if hits > 0:
		_player.notify_hit()
		_player.shake = minf(_player.shake + (0.16 if kind == "light" else 0.28), 0.5)
		AudioDirector.play_3d("impact", origin, -5.0)
	return hits


func _blocked(space: PhysicsDirectSpaceState3D, from_pos: Vector3, to_pos: Vector3) -> bool:
	var from := from_pos + Vector3(0, 1.15, 0)
	var to := to_pos + Vector3(0, 1.15, 0)
	var exclude: Array[RID] = []
	if _player:
		exclude.append(_player.get_rid())
	var query := PhysicsRayQueryParameters3D.create(from, to, 1, exclude)
	query.collide_with_areas = false
	query.hit_from_inside = false
	return not space.intersect_ray(query).is_empty()


func _rebuild() -> void:
	for child in get_children():
		child.queue_free()
	WeaponFactory.attach_sword(self, style == "metal")
