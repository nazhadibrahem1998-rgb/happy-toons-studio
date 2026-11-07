extends CharacterBody3D

const Move = preload("res://scripts/sim/move_rules.gd")

var yaw := 0.4
var pitch := -0.08
var body_yaw := 0.4
var _look_held := false
var _locked_yaw := 0.4
var _returning := false
var _focused := true
var _crouch := 0.0
var _capsule: CollisionShape3D
var _cap: CapsuleShape3D
var first_person := false
var cam_dist := 4.4
var cam_target := 4.4
var last_safe := Vector3(12, 0.2, 43)
var bot_override := false
var bot_wish := Vector2.ZERO
var bot_sprint := false
var bot_crouch := false
var _coyote := 0.12
var _jump_buffer := 0.0
var _jumped := false
var _jump_t := 0.0
var _land_t := 0.0
var _hoist := -1.0
var _hoist_from := Vector3.ZERO
var _hoist_to := Vector3.ZERO
var _hoist_drop := false
var _hoist_cool := 0.0
var rig: HumanRig
var camera: Camera3D
var _arm: SpringArm3D
var _arm_len := 4.4
var _arm_primed := false
var prompt := ""
var prompt_kind := ""
var prompt_id := ""
var build_mode := false
var camera_locked := false
var force_action := ""
var build_id := "fence"
var build_yaw := 0.0
var hot_i := 0
var aiming := false
var _stuck := 0.0
var _swing := 0.0
var _planar := 0.0
const HOTBAR := ["hands", "fence", "wall", "oven", "loom", "stool", "diary", "craft"]
const SPAWN_Y := 0.35

static func camera_stop(pivot: Vector3, wanted: Vector3, safe: float) -> Vector3:
	var t := clampf(safe, 0.0, 1.0)
	if t < 1.0:
		t = maxf(t - 0.05, 0.0)
	return pivot.lerp(wanted, t)

func _ready() -> void:
	add_to_group("player")
	collision_layer = 2
	collision_mask = 1 | 4
	floor_snap_length = Move.FLOOR_SNAP
	floor_max_angle = deg_to_rad(58)
	safe_margin = Move.SAFE_MARGIN
	_capsule = CollisionShape3D.new()
	_cap = CapsuleShape3D.new()
	_cap.radius = 0.32
	_cap.height = 1.55
	_capsule.shape = _cap
	_capsule.position = Vector3(0, 0.85, 0)
	add_child(_capsule)
	rig = HumanRig.new()
	var spec := {
		"kind": "man", "height": 1.0, "skin": "8d5e42", "cloth": "3e4a62",
		"shirt": "d7c4a2", "sash": "3d5a86", "wrap": "cbb892", "headwear": "headband",
		"prop": "satchel", "beard": true, "vest": "2c3a55",
	}
	add_child(rig)
	rig.setup(spec)
	_arm = SpringArm3D.new()
	_arm.name = "SpringArm"
	_arm.collision_mask = 1
	_arm.margin = 0.3
	add_child(_arm)
	camera = Camera3D.new()
	camera.fov = 68.0
	camera.near = 0.08
	camera.far = 220.0
	_arm.add_child(camera)
	camera.current = true
	var p: Dictionary = GameState.data.get("player", {})
	global_position = Vector3(float(p.get("x", 12)), SPAWN_Y, float(p.get("z", 43)))
	yaw = float(p.get("yaw", 0.4))
	body_yaw = yaw
	_locked_yaw = yaw
	pitch = float(p.get("pitch", -0.08))
	first_person = str(p.get("view", "third")) == "first"
	cam_target = 0.12 if first_person else 4.4
	cam_dist = cam_target
	rig.set_first_person(first_person)
	last_safe = global_position
	GameState.moved.connect(_on_moved)

func _on_moved() -> void:
	var p: Dictionary = GameState.data.get("player", {})
	global_position = Vector3(float(p.get("x", global_position.x)), SPAWN_Y, float(p.get("z", global_position.z)))
	yaw = float(p.get("yaw", yaw))
	body_yaw = yaw
	velocity = Vector3.ZERO
	_planar = 0.0

func _unhandled_input(event: InputEvent) -> void:
	if get_tree().paused:
		return
	if event.is_action_pressed("zoom_in"):
		_zoom(-1)
	elif event.is_action_pressed("zoom_out"):
		_zoom(1)
	for slot in range(1, 9):
		if event.is_action_pressed("slot_%d" % slot):
			_hot(slot - 1)
	if event.is_action_pressed("hotbar_prev") or event.is_action_pressed("hotbar_next"):
		if _pointer_over_scroll():
			return
		var wheel := event is InputEventMouseButton
		var modified := wheel and ((event as InputEventMouseButton).ctrl_pressed or (event as InputEventMouseButton).shift_pressed)
		if modified:
			_zoom(-1 if event.is_action_pressed("hotbar_prev") else 1)
		elif event.is_action_pressed("hotbar_prev"):
			_hot(hot_i - 1)
		else:
			_hot(hot_i + 1)
		return
	if event.is_action_pressed("attack"):
		_attack()
	elif event.is_action_pressed("aim"):
		_aim_or_use()
	elif event.is_action_pressed("focus"):
		_recenter()

func _physics_process(delta: float) -> void:
	if get_tree().paused:
		return
	var wish := Vector2.ZERO
	if bot_override:
		wish = bot_wish
	else:
		if Input.is_action_pressed("move_forward"):
			wish.y += 1.0
		if Input.is_action_pressed("move_back"):
			wish.y -= 1.0
		if Input.is_action_pressed("move_right"):
			wish.x += 1.0
		if Input.is_action_pressed("move_left"):
			wish.x -= 1.0
	var crouching := _crouch_wants()
	_crouch = move_toward(_crouch, 1.0 if crouching else 0.0, delta * 6.0)
	_fit_capsule()
	var running := (bot_sprint if bot_override else Input.is_action_pressed("sprint")) and not crouching
	var target := Move.target_speed(wish.length(), running, crouching)
	_planar = Move.step_speed(_planar, target, delta)
	var basis_yaw := LookMath.move_yaw(_look_held, _locked_yaw, body_yaw if _returning else yaw)
	var dir := LookMath.wish_dir(basis_yaw, wish.x, wish.y)
	if wish.length() < 0.1:
		dir = Vector3.ZERO
	elif dir.length() > 0.001:
		dir = dir.normalized()
	if _hoist_cool > 0.0:
		_hoist_cool = maxf(_hoist_cool - delta, 0.0)
	var focus := get_viewport().gui_get_focus_owner()
	if not bot_override and Input.is_action_just_pressed("jump") and focus == null:
		_jump_buffer = Move.JUMP_BUFFER
	elif _hoist < 0.0:
		_jump_buffer = maxf(_jump_buffer - delta, 0.0)
	var sliding := true
	if _hoist >= 0.0:
		_advance_hoist(delta)
		sliding = false
	elif _try_hoist(dir, wish.y > 0.55, _jump_buffer > 0.0, crouching):
		sliding = false
	if sliding:
		velocity.x = dir.x * _planar
		velocity.z = dir.z * _planar
		var grounded := is_on_floor()
		if grounded:
			_coyote = Move.COYOTE
			if _jumped:
				_jumped = false
				_land_t = 0.22
		else:
			_coyote = maxf(_coyote - delta, 0.0)
		var hopped := Move.can_jump(_coyote > 0.0, _jump_buffer > 0.0, _jumped, crouching) and _jump_headroom()
		if hopped:
			velocity.y = Move.jump_velocity()
			_jumped = true
			_coyote = 0.0
			_jump_buffer = 0.0
			_land_t = 0.0
			_jump_t = 0.16
		else:
			velocity.y = Move.stick_y(grounded, velocity.y, delta)
		floor_snap_length = 0.0 if velocity.y > 0.05 else Move.FLOOR_SNAP
		move_and_slide()
	else:
		velocity = Vector3.ZERO
		_planar = 0.0
	if global_position.y < -1.2:
		global_position = last_safe
		velocity = Vector3.ZERO
		_planar = 0.0
	if is_on_floor():
		if global_position.y < 0.0:
			global_position.y = 0.0
		last_safe = global_position
	if _hoist >= 0.0:
		_stuck = 0.0
	elif wish.length() > 0.2 and get_real_velocity().length() < 0.05 and is_on_floor():
		_stuck += delta
		if _stuck > 0.45:
			global_position += Vector3(0, 0.2, 0) - dir * 0.6
			_stuck = 0.0
	else:
		_stuck = 0.0
	var prev_body := body_yaw
	if dir.length() > 0.1:
		body_yaw = lerp_angle(body_yaw, LookMath.face_yaw(dir), Move.turn_blend(delta, true))
	elif not _look_held and not _returning:
		body_yaw = lerp_angle(body_yaw, yaw, Move.turn_blend(delta, false))
	rig.rotation.y = body_yaw
	_look(delta)
	var flat := _planar
	if _swing > 0.0:
		_swing -= delta
	var seated := _near_seat() and flat < 0.25 and not crouching and _hoist < 0.0
	var act := "crouch" if crouching else (force_action if force_action != "" else ("walk" if flat > 0.2 else "idle"))
	if seated:
		act = "sit"
	elif _swing > 0.0 and flat < 0.2:
		act = "open" if prompt_kind == "door" else "carve"
	var turn_rate := absf(angle_difference(body_yaw, prev_body)) / maxf(delta, 0.001)
	var air := ""
	if _hoist >= 0.0:
		air = "start" if _hoist < 0.32 else "land"
	elif _jump_t > 0.0:
		air = "start"
		_jump_t = maxf(_jump_t - delta, 0.0)
	elif not is_on_floor() and _jumped:
		air = "fall"
	elif _land_t > 0.0:
		air = "land"
		_land_t = maxf(_land_t - delta, 0.0)
	rig.tick(delta, flat if force_action == "" else 0.0, act, turn_rate, air)
	_update_blend(running, seated)
	_camera(delta)
	_prompt()
	GameState.poll_overhear(global_position)
	_store_player()
	if Input.is_action_just_pressed("interact") and not get_tree().paused:
		_interact()
	if Input.is_action_just_pressed("view"):
		_toggle_view()
	if Input.is_action_just_pressed("build_mode"):
		_toggle_build()
	if build_mode and Input.is_action_just_pressed("rotate_piece"):
		build_yaw += PI * 0.5

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_WINDOW_FOCUS_OUT or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_focused = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif what == NOTIFICATION_WM_WINDOW_FOCUS_IN or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		_focused = true
		_maintain_cursor()

func _input(event: InputEvent) -> void:
	if build_mode or get_tree().paused or not _focused:
		return
	if event is InputEventMouseButton and event.pressed:
		_maintain_cursor()
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var rel: Vector2 = (event as InputEventMouseMotion).relative
		if rel.length() > 0.0 and not _look_held:
			_returning = false
		var turned := LookMath.apply_mouse(yaw, pitch, rel.x, rel.y, Settings.look_sens(), Settings.invert_y)
		yaw = turned.x
		pitch = turned.y
		get_viewport().set_input_as_handled()

## Without Ctrl the mouse steers the third-person view, and W follows that view.
## With Ctrl the mouse orbits the camera only. Walk stays on the heading from
## the moment Ctrl was pressed, and Azad does not turn with the mouse.
func _look(delta: float) -> void:
	var want := false
	if not bot_override and not build_mode and not get_tree().paused:
		want = Input.is_action_pressed("free_look")
	if want and not _look_held:
		_look_held = true
		_locked_yaw = yaw
		_returning = false
	elif _look_held and not want:
		_look_held = false
		_returning = true
	if _returning and not _look_held:
		var orbit := LookMath.follow_orbit(yaw, pitch, body_yaw, delta, false)
		yaw = orbit.x
		pitch = orbit.y
		if absf(angle_difference(yaw, body_yaw)) < 0.03 and absf(pitch - LookMath.REST_PITCH) < 0.03:
			_returning = false
	_maintain_cursor()

func _maintain_cursor() -> void:
	if LookMath.capture_cursor(get_tree().paused, build_mode, _focused):
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func request_jump() -> void:
	_jump_buffer = Move.JUMP_BUFFER

func _try_hoist(dir: Vector3, holding_forward: bool, jumping: bool, crouched: bool) -> bool:
	if crouched or _hoist_cool > 0.0 or dir.length() < 0.2:
		return false
	if not holding_forward and not jumping:
		return false
	var lip := _find_lip(dir)
	if lip != Vector3.INF and Move.mantle_ok(lip.y - global_position.y):
		_begin_hoist(lip, false)
		_jump_buffer = 0.0
		return true
	if holding_forward:
		var down := _find_drop(dir)
		if down != Vector3.INF:
			_begin_hoist(down, down.y < global_position.y - 0.3)
			return true
	return false

func _begin_hoist(land: Vector3, drop: bool) -> void:
	_hoist = 0.0
	_hoist_from = global_position
	_hoist_to = land
	_hoist_drop = drop
	_jumped = false
	_jump_t = 0.0
	velocity = Vector3.ZERO

func _advance_hoist(delta: float) -> void:
	_hoist += delta
	var u := clampf(_hoist / 0.5, 0.0, 1.0)
	global_position = _hoist_arc(u)
	velocity = Vector3.ZERO
	if u >= 1.0:
		global_position = _hoist_to
		_hoist = -1.0
		_hoist_cool = 0.35
		_land_t = 0.2
		last_safe = global_position

func _hoist_arc(u: float) -> Vector3:
	var a := _hoist_from
	var b := _hoist_to
	if _hoist_drop:
		var p := a.lerp(b, smoothstep(0.0, 1.0, u))
		p.y = lerpf(a.y, b.y, smoothstep(0.15, 1.0, u))
		return p
	var lift := maxf(a.y, b.y) + 0.28
	var y := lift
	if u < 0.45:
		y = lerpf(a.y, lift, u / 0.45)
	else:
		y = lerpf(lift, b.y, (u - 0.45) / 0.55)
	var flat := a.lerp(b, smoothstep(0.28, 1.0, u))
	return Vector3(flat.x, y, flat.z)

func _find_lip(dir: Vector3) -> Vector3:
	var space := get_world_3d().direct_space_state
	if space == null:
		return Vector3.INF
	var heights: Array = [0.4, 1.05, 1.8]
	for height in heights:
		var from: Vector3 = global_position + Vector3(0, float(height), 0)
		var hit := _ray(space, from, from + dir * 0.95)
		if hit.is_empty():
			continue
		var face: Vector3 = hit.position
		var above := face + dir * 0.38 + Vector3(0, 3.5, 0)
		var deck := _ray(space, above, above + Vector3(0, -4.3, 0))
		if deck.is_empty() or not _is_climbable(deck.collider):
			continue
		var land: Vector3 = deck.position + Vector3(0, 0.04, 0)
		if not Move.mantle_ok(land.y - global_position.y):
			continue
		if not _clear_above(space, land):
			continue
		return land
	return Vector3.INF

func _find_drop(dir: Vector3) -> Vector3:
	var space := get_world_3d().direct_space_state
	if space == null:
		return Vector3.INF
	var under := _ray(space, global_position + Vector3(0, 0.25, 0), global_position + Vector3(0, -0.45, 0))
	if under.is_empty() or not _is_climbable(under.collider):
		return Vector3.INF
	var reaches: Array = [0.8, 1.25, 1.6]
	for dist in reaches:
		var from: Vector3 = global_position + dir * float(dist) + Vector3(0, 0.55, 0)
		var hit := _ray(space, from, from + Vector3(0, -4.6, 0))
		if hit.is_empty() or hit.collider == under.collider:
			continue
		var land: Vector3 = hit.position + Vector3(0, 0.04, 0)
		if not _clear_above(space, land):
			continue
		var rise := land.y - global_position.y
		if _is_climbable(hit.collider) and Move.cross_ok(rise, dist):
			return land
		if Move.drop_ok(-rise, dist):
			return land
	return Vector3.INF

func _clear_above(space: PhysicsDirectSpaceState3D, land: Vector3) -> bool:
	var hit := _ray(space, land + Vector3(0, 0.35, 0), land + Vector3(0, 1.85, 0))
	return hit.is_empty()

func _ray(space: PhysicsDirectSpaceState3D, from: Vector3, to: Vector3) -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	query.exclude = [self]
	return space.intersect_ray(query)

func _is_climbable(node: Object) -> bool:
	var current: Object = node
	while current is Node:
		if (current as Node).is_in_group("climbable"):
			return true
		current = (current as Node).get_parent()
	return false

func _near_seat() -> bool:
	var best := 1.2
	for n in get_tree().get_nodes_in_group("seat"):
		if n is Node3D and global_position.distance_to((n as Node3D).global_position) < best:
			return true
	return false

func _update_blend(running: bool, seated: bool) -> void:
	var crowd := 0
	if not running and _planar > 0.35 and _planar <= Move.WALK + 0.15:
		for v in get_tree().get_nodes_in_group("villager"):
			if v is Node3D and global_position.distance_squared_to((v as Node3D).global_position) < 16.0:
				crowd += 1
				if crowd >= 2:
					break
	GameState.set_blended(seated or crowd >= 2)

func _jump_headroom() -> bool:
	var space := get_world_3d().direct_space_state
	if space == null:
		return true
	var from := global_position + Vector3(0, 1.05, 0)
	var to := from + Vector3(0, 0.7, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	query.exclude = [self]
	return space.intersect_ray(query).is_empty()

func _crouch_wants() -> bool:
	if bot_override:
		return bot_crouch
	var held := Input.is_action_pressed("crouch")
	var ceiling := _crouch > 0.2 and not held and not _can_stand()
	return Move.stay_crouched(held, ceiling)

func _can_stand() -> bool:
	var space := get_world_3d().direct_space_state
	if space == null:
		return true
	var from := global_position + Vector3(0, 0.7, 0)
	var to := global_position + Vector3(0, 1.75, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	query.exclude = [self]
	return space.intersect_ray(query).is_empty()

func _fit_capsule() -> void:
	if _cap == null or _capsule == null:
		return
	_cap.height = lerpf(1.55, 1.05, _crouch)
	_capsule.position.y = lerpf(0.85, 0.58, _crouch)

func _camera(delta: float) -> void:
	if camera_locked:
		return
	cam_dist = lerpf(cam_dist, cam_target, 1.0 - exp(-8.0 * delta))
	var flags: Dictionary = Settings.current_flags()
	camera.far = float(flags.get("view", 85.0)) + 30.0
	var basis := Basis.from_euler(Vector3(pitch, yaw, 0.0))
	var eye := lerpf(1.48, 0.95, _crouch)
	var pivot := global_position + Vector3(0, eye, 0)
	# +Z of this basis is behind the look, which is the direction SpringArm3D extends.
	_arm.global_position = pivot
	_arm.global_basis = basis
	var blocked: float = camera.position.z
	if _arm_primed and blocked + 0.08 < _arm.spring_length:
		_arm_len = blocked
	else:
		_arm_len = lerpf(_arm_len, cam_dist, 1.0 - exp(-7.0 * delta))
	_arm.spring_length = maxf(_arm_len, 0.2)
	_arm_primed = true
	camera.rotation = Vector3.ZERO
	rig.set_first_person(first_person or cam_dist < 0.35)

func _pointer_over_scroll() -> bool:
	var hovered := get_viewport().gui_get_hovered_control()
	while hovered:
		if hovered is ScrollContainer:
			return true
		hovered = hovered.get_parent()
	return false

func _zoom(step: int) -> void:
	aiming = false
	cam_target = clampf(cam_target + float(step) * 0.45, 1.5, 8.5)

func _hot(index: int) -> void:
	hot_i = posmod(index, HOTBAR.size())
	var id := str(HOTBAR[hot_i])
	if id == "hands":
		if build_mode:
			set_build(false)
	elif id != "diary" and id != "craft":
		build_id = id

func _attack() -> void:
	if build_mode:
		_try_place()
		return
	var id := str(HOTBAR[hot_i])
	if id == "diary":
		get_tree().call_group("ui", "open_diary", "quests")
		return
	if id == "craft":
		get_tree().call_group("ui", "open_craft")
		return
	if id != "hands" and GameState.near_station != "":
		set_build(true)
		return
	if prompt_kind in ["resource", "found"]:
		_interact()
		return
	_swing = 0.35
	GameState.say_thought("The swing meets only air.")

func _aim_or_use() -> void:
	if build_mode:
		set_build(false)
		return
	if prompt_kind in ["station", "note", "altar", "board", "relic", "rune"]:
		_interact()
		return
	aiming = not aiming
	cam_target = 2.15 if aiming else (0.12 if first_person else 4.4)

func _recenter() -> void:
	pitch = -0.12
	aiming = false
	cam_target = 0.12 if first_person else 4.4
	cam_dist = cam_target

func _toggle_view() -> void:
	first_person = not first_person
	cam_target = 0.12 if first_person else 4.4
	GameState.data["player"]["view"] = "first" if first_person else "third"
	GameState.say_thought("I look through my own eyes." if first_person else "I step back and see the lane.")

func set_build(on: bool) -> void:
	if on and GameState.near_station == "" and not GameState.ignore_station:
		GameState.say_thought("I should stand at a workbench before I raise a wall.")
		return
	build_mode = on
	if on:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	var ghost := get_node_or_null("Ghost")
	if ghost:
		ghost.queue_free()

func _toggle_build() -> void:
	set_build(not build_mode)

func ghost_transform() -> Dictionary:
	var hit := _ground_aim()
	var grid := 1.5
	var pos: Vector3 = BuildRules.snap(hit, grid)
	var blocked := BuildRules.blocked(GameState.data["placed"], pos, grid * 0.72)
	return {"pos": pos, "yaw": build_yaw, "ok": not blocked}

func _ground_aim() -> Vector3:
	var from := camera.global_position
	var dir := -camera.global_transform.basis.z
	if build_mode and Input.mouse_mode == Input.MOUSE_MODE_VISIBLE:
		dir = camera.project_ray_normal(get_viewport().get_mouse_position())
		from = camera.project_ray_origin(get_viewport().get_mouse_position())
	var to := from + dir * 40.0
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return global_position + (-camera.global_transform.basis.z) * 3.0
	return hit.position

func _try_place() -> void:
	var g := ghost_transform()
	if not g["ok"]:
		return
	var pos: Vector3 = g["pos"]
	if pos.distance_to(global_position) < 0.85:
		return
	var res := {}
	if ContentDB.piece(build_id).is_empty():
		res = GameState.place_item(build_id, pos, float(g["yaw"]))
	else:
		res = GameState.raise_piece(build_id, pos, float(g["yaw"]))
	if bool(res.get("ok", false)):
		GameState.say_thought("Set down. The lane keeps it.")

func _prompt() -> void:
	prompt = ""
	prompt_kind = ""
	prompt_id = ""
	GameState.near_station = ""
	var best := 2.5
	for n in get_tree().get_nodes_in_group("interact"):
		if not n is Node3D:
			continue
		var d := global_position.distance_to((n as Node3D).global_position)
		if d < best:
			best = d
			prompt_kind = str(n.get_meta("kind", ""))
			prompt_id = str(n.get_meta("id", ""))
			prompt = str(n.get_meta("verb", "Look"))
			if prompt_kind == "station":
				GameState.near_station = str(n.get_meta("station", ""))

func _interact() -> void:
	if prompt_kind == "":
		return
	if prompt_kind == "door":
		_swing = 0.45
	for n in get_tree().get_nodes_in_group("interact"):
		if str(n.get_meta("id", "")) == prompt_id and n.has_method("use"):
			n.use(self)
			return

func _store_player() -> void:
	var p: Dictionary = GameState.data["player"]
	p["x"] = global_position.x
	p["y"] = 0.0
	p["z"] = global_position.z
	p["yaw"] = yaw
	p["pitch"] = pitch
	p["view"] = "first" if first_person else "third"
	GameState.data["player"] = p
