class_name EnemySoldier
extends CharacterBody3D

signal died

enum State { PATROL, INVESTIGATE, COMBAT }

const GRAVITY := 13.5

var variant: String = "rifleman"
var patrol_points: Array[Vector3] = []
var health: int = 100
var max_health: int = 100
var alive: bool = true
var hit_damage: int = 8
var spread_deg: float = 4.8
var vision_range: float = 32.0
var hear_range: float = 42.0
var fire_min: float = 0.42
var fire_max: float = 0.72
var walk_speed: float = 2.25
var combat_speed: float = 3.5

var state: int = State.PATROL
var alert: bool = false
var patrol_i: int = 0
var investigate_pos: Vector3 = Vector3.ZERO
var last_seen: Vector3 = Vector3.ZERO
var lost_timer: float = 0.0
var wait_timer: float = 0.0
var shoot_cd: float = 0.6
var cover_timer: float = 0.4
var strafe_sign: float = 1.0
var prefer_cover: bool = false
var has_cover: bool = false
var cached_cover: Vector3 = Vector3.ZERO
var _ai_on: bool = false
var _configured: bool = false

var body_mats: Array[StandardMaterial3D] = []
var muzzle: Marker3D
var flash: OmniLight3D

@onready var agent: NavigationAgent3D = $NavigationAgent3D
@onready var visual: Node3D = $Visual
@onready var weapon_mount: Node3D = $Visual/WeaponMount
@onready var col: CollisionShape3D = $CollisionShape3D


func setup(kind: String, points: Array) -> void:
	variant = kind
	patrol_points.clear()
	for p in points:
		patrol_points.append(p)
	_apply_stats()
	_configured = true


func _ready() -> void:
	add_to_group("enemy")
	collision_layer = 4
	collision_mask = 7
	floor_snap_length = 0.3
	floor_max_angle = deg_to_rad(50.0)
	motion_mode = MOTION_MODE_GROUNDED
	if not _configured:
		_apply_stats()
	body_mats = HumanoidFactory.build(visual, "commander" if variant == "commander" else "rifleman")
	var gun := Node3D.new()
	weapon_mount.add_child(gun)
	muzzle = WeaponFactory.attach_m16(gun)
	flash = OmniLight3D.new()
	flash.light_color = Color(1.0, 0.75, 0.42)
	flash.light_energy = 0.0
	flash.omni_range = 3.2
	flash.shadow_enabled = false
	muzzle.add_child(flash)
	agent.path_desired_distance = 0.55
	agent.target_desired_distance = 0.8
	agent.radius = 0.4
	agent.height = 1.6
	agent.avoidance_enabled = false
	set_physics_process(false)


func _apply_stats() -> void:
	if variant == "commander":
		max_health = 170
		hit_damage = 11
		spread_deg = 2.3
		vision_range = 40.0
		hear_range = 48.0
		fire_min = 0.55
		fire_max = 0.9
		walk_speed = 2.0
		combat_speed = 3.05
	else:
		max_health = 100
		hit_damage = 8
		spread_deg = 4.6
		vision_range = 32.0
		hear_range = 42.0
		fire_min = 0.4
		fire_max = 0.7
		walk_speed = 2.3
		combat_speed = 3.55
	health = max_health


func start_ai() -> void:
	_ai_on = true
	set_physics_process(true)
	if patrol_points.size() >= 2:
		var dir := patrol_points[1] - patrol_points[0]
		dir.y = 0.0
		if dir.length() > 0.2:
			rotation.y = atan2(-dir.x, -dir.z)


func force_combat() -> void:
	if not alive:
		return
	_enter_combat()
	shoot_cd = 0.25


func kill() -> void:
	if not alive:
		return
	health = 0
	_die()


func apply_damage(amount: int, _from: Vector3) -> void:
	if not alive:
		return
	health -= amount
	_hit_flash()
	if health <= 0:
		_die()
		return
	alert = true
	if state != State.COMBAT:
		var player := _player()
		if player:
			investigate_pos = player.global_position
			state = State.INVESTIGATE


func hear_noise(at: Vector3, radius: float) -> void:
	if not alive or state == State.COMBAT:
		return
	if global_position.distance_to(at) > radius:
		return
	alert = true
	investigate_pos = at
	state = State.INVESTIGATE


func _physics_process(delta: float) -> void:
	if not alive or not _ai_on:
		return
	match state:
		State.PATROL:
			_patrol(delta)
		State.INVESTIGATE:
			_investigate(delta)
		State.COMBAT:
			_combat(delta)
	_separate()
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif velocity.y < 0.0:
		velocity.y = -0.5
	move_and_slide()


func _patrol(delta: float) -> void:
	if _can_see_player():
		_enter_combat()
		return
	if patrol_points.is_empty():
		velocity.x = 0.0
		velocity.z = 0.0
		return
	var target := patrol_points[patrol_i]
	if Vector2(global_position.x, global_position.z).distance_to(Vector2(target.x, target.z)) < 1.15:
		patrol_i = (patrol_i + 1) % patrol_points.size()
		target = patrol_points[patrol_i]
	_move_to(target, walk_speed, delta, true)


func _investigate(delta: float) -> void:
	if _can_see_player():
		_enter_combat()
		return
	var flat := investigate_pos - global_position
	flat.y = 0.0
	if flat.length() > 1.35:
		wait_timer = 0.0
		_move_to(investigate_pos, walk_speed * 1.25, delta, true)
		return
	velocity.x = move_toward(velocity.x, 0.0, 10.0 * delta)
	velocity.z = move_toward(velocity.z, 0.0, 10.0 * delta)
	rotation.y += delta * 0.8
	wait_timer += delta
	if wait_timer > 3.6:
		alert = false
		state = State.PATROL


func _combat(delta: float) -> void:
	var player := _player()
	if player == null or not bool(player.get("alive")):
		state = State.PATROL
		return
	var see := _can_see_player()
	if see:
		lost_timer = 0.0
		last_seen = player.global_position
	else:
		lost_timer += delta
		if lost_timer > 6.0:
			state = State.INVESTIGATE
			investigate_pos = last_seen
			return
	var flat := last_seen - global_position
	flat.y = 0.0
	var dist := flat.length()
	_face_towards(last_seen, 1.0 - exp(-8.0 * delta))
	cover_timer -= delta
	if cover_timer <= 0.0:
		cover_timer = randf_range(1.1, 2.1)
		strafe_sign = -strafe_sign if randf() > 0.35 else strafe_sign
		prefer_cover = randf() < 0.45
		_pick_cover(player.global_position)
	var dest := last_seen
	var speed := combat_speed
	if prefer_cover and has_cover and dist > 7.0:
		dest = cached_cover
	elif dist < 6.2:
		var away := -flat.normalized() if dist > 0.2 else Vector3(0, 0, 1)
		dest = global_position + away * 4.0
	elif dist <= 18.0:
		var side := Vector3(-flat.z, 0, flat.x).normalized() * strafe_sign
		dest = global_position + side * 3.6
	_move_to(dest, speed, delta, false)
	if see and dist < 42.0:
		shoot_cd -= delta
		if shoot_cd <= 0.0:
			_shoot()
			shoot_cd = randf_range(fire_min, fire_max)


func _enter_combat() -> void:
	if state != State.COMBAT:
		shoot_cd = randf_range(0.35, 0.75)
	state = State.COMBAT
	alert = true
	lost_timer = 0.0
	var player := _player()
	if player:
		last_seen = player.global_position


func _can_see_player() -> bool:
	var player := _player()
	if player == null or not bool(player.get("alive")):
		return false
	var forward := -global_transform.basis.z
	var eye := global_position + Vector3(0, 1.45, 0) + forward * 0.42
	var target: Vector3 = player.global_position + Vector3(0, 1.2, 0)
	var to := target - eye
	var dist := to.length()
	var crouching := bool(player.call("is_crouching"))
	var range := vision_range * (0.7 if crouching else 1.0)
	if dist > range or dist < 0.05:
		return false
	if state == State.PATROL and not alert:
		if forward.dot(to / dist) < cos(deg_to_rad(55.0)):
			return false
	var query := PhysicsRayQueryParameters3D.create(eye, target, 1 | 2)
	query.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return true
	return hit.collider == player


func _shoot() -> void:
	var player := _player()
	if player == null or muzzle == null:
		return
	var origin := muzzle.global_position
	var aim := (player.global_position + Vector3(0, 1.25, 0) - origin).normalized()
	var spread := deg_to_rad(spread_deg)
	aim = aim.rotated(Vector3.UP, randf_range(-spread, spread))
	var side := aim.cross(Vector3.UP)
	if side.length() > 0.001:
		aim = aim.rotated(side.normalized(), randf_range(-spread * 0.6, spread * 0.6))
	aim = aim.normalized()
	var end := origin + aim * 70.0
	var query := PhysicsRayQueryParameters3D.create(origin, end, 1 | 2)
	query.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	AudioDirector.play_3d("m16", origin, -3.0)
	if flash:
		flash.light_energy = 5.0
		var tw := create_tween()
		tw.tween_property(flash, "light_energy", 0.0, 0.04)
	if not hit.is_empty():
		end = hit.position
		var collider: Object = hit.collider
		if collider is Node and (collider as Node).is_in_group("player") and (collider as Node).has_method("apply_damage"):
			(collider as Node).call("apply_damage", hit_damage, global_position)
		else:
			ImpactEffect.spawn(hit.position, hit.normal, "world")
	ImpactEffect.tracer(origin, end, Color(1.0, 0.86, 0.62))
	get_tree().call_group("enemy", "hear_noise", origin, 26.0)


func _pick_cover(player_pos: Vector3) -> void:
	has_cover = false
	var best := Vector3.ZERO
	var best_score := 1.0e9
	for node in get_tree().get_nodes_in_group("cover_point"):
		var point: Vector3 = (node as Node3D).global_position
		var dist := global_position.distance_to(point)
		if dist < 1.3 or dist > 16.0:
			continue
		if not _blocks(point + Vector3(0, 1.2, 0), player_pos + Vector3(0, 1.2, 0)):
			continue
		var score := dist + point.distance_to(player_pos) * 0.12
		if score < best_score:
			best_score = score
			best = point
			has_cover = true
	if has_cover:
		cached_cover = best


func _blocks(from: Vector3, to: Vector3) -> bool:
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	return not get_world_3d().direct_space_state.intersect_ray(query).is_empty()


func _move_to(target: Vector3, speed: float, delta: float, face_move: bool) -> void:
	var dest := target
	if agent:
		agent.target_position = target
		var path := agent.get_current_navigation_path()
		if path.size() > 0:
			dest = agent.get_next_path_position()
	_steer(dest, speed, delta, face_move)


func _steer(target: Vector3, speed: float, delta: float, face_move: bool) -> void:
	var dir := target - global_position
	dir.y = 0.0
	if dir.length() < 0.45:
		velocity.x = move_toward(velocity.x, 0.0, 12.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 12.0 * delta)
		return
	dir = dir.normalized()
	var space := get_world_3d().direct_space_state
	var eye := global_position + Vector3(0, 0.75, 0) + dir * 0.4
	var query := PhysicsRayQueryParameters3D.create(eye, eye + dir * 0.85, 1)
	query.exclude = [get_rid()]
	if not space.intersect_ray(query).is_empty():
		var side := Vector3(-dir.z, 0.0, dir.x)
		var left := PhysicsRayQueryParameters3D.create(eye, eye + (dir + side).normalized(), 1)
		left.exclude = [get_rid()]
		var right := PhysicsRayQueryParameters3D.create(eye, eye + (dir - side).normalized(), 1)
		right.exclude = [get_rid()]
		if space.intersect_ray(left).is_empty():
			dir = (dir + side * 0.85).normalized()
		elif space.intersect_ray(right).is_empty():
			dir = (dir - side * 0.85).normalized()
	if face_move:
		_face_towards(global_position + dir, 1.0 - exp(-6.0 * delta))
	velocity.x = dir.x * speed
	velocity.z = dir.z * speed


func _face_towards(point: Vector3, weight: float) -> void:
	var dir := point - global_position
	dir.y = 0.0
	if dir.length() < 0.05:
		return
	var target_yaw := atan2(-dir.x, -dir.z)
	rotation.y = lerp_angle(rotation.y, target_yaw, weight)


func _separate() -> void:
	for other in get_tree().get_nodes_in_group("enemy"):
		if other == self or not (other as Node).get("alive"):
			continue
		var away := global_position - (other as Node3D).global_position
		away.y = 0.0
		if away.length() < 1.15 and away.length() > 0.01:
			var push := away.normalized() * 1.6
			velocity.x += push.x
			velocity.z += push.z


func _player() -> Node3D:
	return get_tree().get_first_node_in_group("player")


func _hit_flash() -> void:
	for mat in body_mats:
		mat.emission_enabled = true
		mat.emission = Color(0.45, 0.36, 0.26)
		mat.emission_energy_multiplier = 0.55
	var tw := create_tween()
	tw.tween_interval(0.07)
	tw.tween_callback(_clear_flash)


func _clear_flash() -> void:
	for mat in body_mats:
		mat.emission_enabled = false


func _die() -> void:
	if not alive:
		return
	alive = false
	_ai_on = false
	set_physics_process(false)
	collision_layer = 0
	collision_mask = 0
	col.disabled = true
	remove_from_group("enemy")
	died.emit()
	var tw := create_tween()
	tw.tween_property(visual, "rotation_degrees:x", 84.0, 0.5)
	tw.parallel().tween_property(visual, "position:y", visual.position.y - 0.2, 0.5)
	tw.chain().tween_interval(1.5)
	for mat in body_mats:
		tw.parallel().tween_property(mat, "albedo_color:a", 0.0, 1.0)
	tw.chain().tween_callback(queue_free)
