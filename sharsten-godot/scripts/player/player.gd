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
var rig: HumanRig
var camera: Camera3D
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
	camera = Camera3D.new()
	camera.fov = 68.0
	camera.near = 0.08
	camera.far = 220.0
	add_child(camera)
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
	velocity.x = dir.x * _planar
	velocity.z = dir.z * _planar
	velocity.y = Move.stick_y(is_on_floor(), velocity.y, delta)
	move_and_slide()
	if global_position.y < -1.2:
		global_position = last_safe
		velocity = Vector3.ZERO
		_planar = 0.0
	if is_on_floor():
		if global_position.y < 0.0:
			global_position.y = 0.0
		last_safe = global_position
	if wish.length() > 0.2 and get_real_velocity().length() < 0.05 and is_on_floor():
		_stuck += delta
		if _stuck > 0.45:
			global_position += Vector3(0, 0.2, 0) - dir * 0.6
			_stuck = 0.0
	else:
		_stuck = 0.0
	if dir.length() > 0.1:
		body_yaw = lerp_angle(body_yaw, LookMath.face_yaw(dir), Move.turn_blend(delta, true))
	elif not _look_held and not _returning:
		body_yaw = lerp_angle(body_yaw, yaw, Move.turn_blend(delta, false))
	rig.rotation.y = body_yaw
	_look(delta)
	var flat := _planar
	if _swing > 0.0:
		_swing -= delta
	var act := "crouch" if crouching else (force_action if force_action != "" else ("walk" if flat > 0.2 else "idle"))
	if _swing > 0.0 and flat < 0.2:
		act = "carve"
	rig.tick(delta, flat if force_action == "" else 0.0, act)
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

func _crouch_wants() -> bool:
	if bot_override:
		return false
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
	var look := basis * Vector3(0, 0, -1)
	var eye := lerpf(1.48, 0.95, _crouch)
	var pivot := global_position + Vector3(0, eye, 0)
	var wanted := pivot - look * cam_dist + basis * Vector3(0.28, 0.05, 0)
	var space := get_world_3d().direct_space_state
	var safe := 1.0
	if space != null:
		var sphere := SphereShape3D.new()
		sphere.radius = 0.22
		var cast := PhysicsShapeQueryParameters3D.new()
		cast.shape = sphere
		cast.transform = Transform3D(Basis.IDENTITY, pivot)
		cast.motion = wanted - pivot
		cast.collision_mask = 1
		cast.exclude = [self]
		var frac := space.cast_motion(cast)
		if frac.size() > 0:
			safe = float(frac[0])
	camera.global_position = camera_stop(pivot, wanted, safe)
	camera.global_transform = Transform3D(basis, camera.global_position)
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
