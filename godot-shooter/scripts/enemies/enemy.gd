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
var hit_damage: int = 10
var telegraph: float = 1.05
var recover: float = 1.3
var reach: float = 1.72
var react: float = 1.05
var phase: int = 0
var phase_left: float = 0.0
var shove: Vector3 = Vector3.ZERO
static var turn_id: int = 0
var vision_range: float = 28.0
var hear_range: float = 18.0
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
var _flinch_tween: Tween

@onready var agent: NavigationAgent3D = $NavigationAgent3D
@onready var visual: Node3D = $Visual
@onready var weapon_mount: Node3D = $Visual/WeaponMount
@onready var col: CollisionShape3D = $CollisionShape3D


func setup(kind: String, points: Array) -> void:
	if kind == "rifleman":
		kind = "soldier"
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
	var style := "commander" if variant == "commander" else "soldier"
	body_mats = HumanoidFactory.build(visual, style)
	var club := Node3D.new()
	club.name = "Club"
	weapon_mount.add_child(club)
	WeaponFactory.attach_club(club)
	if variant == "shield" or variant == "commander":
		WeaponFactory.attach_shield(visual)
	agent.path_desired_distance = 0.55
	agent.target_desired_distance = 0.8
	agent.radius = 0.4
	agent.height = 1.6
	agent.avoidance_enabled = false
	set_physics_process(false)


func _apply_stats() -> void:
	var profile := GameConfig.enemy_profile(variant)
	max_health = int(profile["health"])
	hit_damage = int(profile["damage"])
	telegraph = float(profile["telegraph"])
	recover = float(profile["recover"])
	reach = float(profile["reach"])
	react = float(profile["react"])
	vision_range = float(profile["vision"])
	hear_range = 18.0
	walk_speed = 1.85
	combat_speed = 2.35 if variant != "commander" else 2.05
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


func apply_damage(amount: int, from: Vector3, _headshot: bool = false) -> void:
	if not alive:
		return
	health -= amount
	_hit_flash()
	var away := global_position - from
	away.y = 0.0
	if away.length() > 0.05:
		shove += away.normalized() * 2.8
	if phase == 1:
		phase = 3
		phase_left = 0.9
		_release_turn()
	if health <= 0:
		_die()
		return
	_flinch()
	alert = true
	if state != State.COMBAT:
		var player := _player()
		if player:
			investigate_pos = player.global_position
			state = State.INVESTIGATE
		else:
			investigate_pos = from
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
	if shove.length() > 0.05:
		velocity.x += shove.x
		velocity.z += shove.z
		shove = Vector3.ZERO
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
		_release_turn()
		phase = 0
		state = State.PATROL
		return
	var see := _can_see_player()
	if see:
		lost_timer = 0.0
		last_seen = player.global_position
	else:
		lost_timer += delta
		if lost_timer > 4.5:
			_release_turn()
			phase = 0
			state = State.INVESTIGATE
			investigate_pos = last_seen
			return
	var flat := last_seen - global_position
	flat.y = 0.0
	var dist := flat.length()
	_face_towards(last_seen, 1.0 - exp(-6.0 * delta))
	if not _ensure_turn():
		phase = 0
		_hold_back(last_seen, dist, delta)
		_pose_weapon(0.1)
		return
	if phase == 0:
		shoot_cd = maxf(0.0, shoot_cd - delta)
		if dist > reach + 0.15:
			_move_to(last_seen, combat_speed, delta, false)
		else:
			velocity.x = move_toward(velocity.x, 0.0, 7.0 * delta)
			velocity.z = move_toward(velocity.z, 0.0, 7.0 * delta)
		_pose_weapon(0.15)
		if see and dist <= reach + 0.45 and shoot_cd <= 0.0 and _line_clear(player):
			phase = 1
			phase_left = telegraph
	elif phase == 1:
		velocity.x = move_toward(velocity.x, 0.0, 9.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 9.0 * delta)
		var wind := 1.0 - clampf(phase_left / maxf(telegraph, 0.01), 0.0, 1.0)
		_pose_weapon(lerpf(0.2, -1.2, wind))
		phase_left -= delta
		if dist > reach + 1.1 or not _line_clear(player):
			phase = 0
			shoot_cd = 0.45
			return
		if phase_left <= 0.0:
			_melee_strike(player)
			phase = 3
			phase_left = recover
	else:
		var back := 1.0 - clampf(phase_left / maxf(recover, 0.01), 0.0, 1.0)
		_pose_weapon(lerpf(0.55, 0.12, back))
		phase_left -= delta
		if phase_left <= 0.0:
			phase = 0
			shoot_cd = 0.4
			_release_turn()


func _enter_combat() -> void:
	if state != State.COMBAT:
		shoot_cd = react
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
	# Same sample points as the shot, so they never fire at a hidden body.
	return _visible_point(player).y > -100.0


func _shot_origin() -> Vector3:
	# Eyes, not the muzzle, so a rifle clipping a corner cannot start the ray
	# on the player's side of a wall.
	var forward := -global_transform.basis.z
	return global_position + Vector3(0, 1.48, 0) + forward * 0.28


func _visible_point(player: Node3D) -> Vector3:
	var origin := _shot_origin()
	var heights: Array[float] = [1.15, 0.82, 1.62]
	if bool(player.call("is_crouching")):
		heights = [0.72, 0.42, 1.02]
	for h in heights:
		var target := player.global_position + Vector3(0, h, 0)
		if _ray_hits_player(origin, target, player):
			return target
	return Vector3(0, -9999, 0)


func _ray_hits_player(origin: Vector3, target: Vector3, player: Node3D) -> bool:
	var query := PhysicsRayQueryParameters3D.create(origin, target, 1 | 2, [get_rid()])
	query.collide_with_areas = false
	query.collide_with_bodies = true
	query.hit_from_inside = false
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return false
	return hit.collider == player


func _ensure_turn() -> bool:
	_refresh_turn()
	if turn_id == get_instance_id():
		return true
	if turn_id != 0:
		return false
	var player := _player()
	if player == null:
		return false
	var best: EnemySoldier = null
	var best_d := 1.0e9
	for node in get_tree().get_nodes_in_group("enemy"):
		var other := node as EnemySoldier
		if other == null or not other.alive or not other._can_see_player():
			continue
		var dist := other.global_position.distance_to(player.global_position)
		if dist < best_d:
			best_d = dist
			best = other
	if best == self:
		turn_id = get_instance_id()
		return true
	return false


func _refresh_turn() -> void:
	if turn_id == 0:
		return
	for node in get_tree().get_nodes_in_group("enemy"):
		if node.get_instance_id() == turn_id and bool(node.get("alive")):
			return
	turn_id = 0


func _release_turn() -> void:
	if turn_id == get_instance_id():
		turn_id = 0


func _hold_back(target: Vector3, dist: float, delta: float) -> void:
	if dist < 3.4:
		var away := global_position - target
		away.y = 0.0
		if away.length() < 0.1:
			away = Vector3(1, 0, 0)
		_move_to(global_position + away.normalized() * 2.4, walk_speed, delta, false)
	elif dist > 7.5:
		_move_to(target, walk_speed, delta, false)
	else:
		var side := Vector3(-(target - global_position).z, 0, (target - global_position).x).normalized()
		_move_to(global_position + side * strafe_sign * 2.0, walk_speed * 0.65, delta, false)


func _line_clear(player: Node3D) -> bool:
	var from := global_position + Vector3(0, 1.15, 0)
	var to := player.global_position + Vector3(0, 1.15, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to, 1, [get_rid()])
	query.collide_with_areas = false
	query.hit_from_inside = false
	return get_world_3d().direct_space_state.intersect_ray(query).is_empty()


func _melee_strike(player: Node3D) -> void:
	if not _line_clear(player):
		return
	var flat := player.global_position - global_position
	flat.y = 0.0
	if flat.length() > reach + 0.4:
		return
	var forward := -global_transform.basis.z
	forward.y = 0.0
	if flat.length() > 0.05 and forward.normalized().dot(flat.normalized()) < 0.15:
		return
	AudioDirector.play_3d("swing", global_position, -8.0)
	if player.has_method("receive_hit"):
		var result := str(player.call("receive_hit", hit_damage, global_position))
		if result == "parry":
			phase_left = 1.4
			_pose_weapon(0.2)


func _pose_weapon(pitch: float) -> void:
	if weapon_mount:
		weapon_mount.rotation.x = pitch


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


func _flinch() -> void:
	if visual == null:
		return
	if _flinch_tween and _flinch_tween.is_valid():
		_flinch_tween.kill()
	visual.rotation.x = -0.22
	_flinch_tween = create_tween()
	_flinch_tween.tween_property(visual, "rotation:x", 0.0, 0.16)


func _hit_flash() -> void:
	for mat in body_mats:
		mat.emission_enabled = true
		mat.emission = Color(1.0, 0.86, 0.55)
		mat.emission_energy_multiplier = 2.2
	var tw := create_tween()
	tw.tween_interval(0.09)
	tw.tween_callback(_clear_flash)


func _clear_flash() -> void:
	for mat in body_mats:
		mat.emission_enabled = false


func _die() -> void:
	if not alive:
		return
	_release_turn()
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
