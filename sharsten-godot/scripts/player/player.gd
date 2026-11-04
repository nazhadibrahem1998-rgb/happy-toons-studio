extends CharacterBody3D

const WALK := 1.28
const RUN := 3.15

var yaw := 0.4
var pitch := -0.08
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
var build_id := "fence"
var build_yaw := 0.0
var _stuck := 0.0

func _ready() -> void:
	add_to_group("player")
	collision_layer = 2
	collision_mask = 1
	floor_snap_length = 0.25
	floor_max_angle = deg_to_rad(50)
	safe_margin = 0.08
	var shape := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.32
	cap.height = 1.55
	shape.shape = cap
	shape.position = Vector3(0, 0.85, 0)
	add_child(shape)
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
	global_position = Vector3(float(p.get("x", 12)), 0.2, float(p.get("z", 43)))
	yaw = float(p.get("yaw", 0.4))
	pitch = float(p.get("pitch", -0.08))
	first_person = str(p.get("view", "third")) == "first"
	cam_target = 0.12 if first_person else 4.4
	cam_dist = cam_target
	rig.set_first_person(first_person)
	last_safe = global_position
	GameState.moved.connect(_on_moved)

func _on_moved() -> void:
	var p: Dictionary = GameState.data.get("player", {})
	global_position = Vector3(float(p.get("x", global_position.x)), 0.2, float(p.get("z", global_position.z)))
	yaw = float(p.get("yaw", yaw))
	velocity = Vector3.ZERO

func _unhandled_input(event: InputEvent) -> void:
	if get_tree().paused:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and not build_mode:
		var rel: Vector2 = (event as InputEventMouseMotion).relative
		var r := LookMath.apply_mouse(yaw, pitch, rel.x, rel.y, Settings.look_sens(), Settings.invert_y)
		yaw = r.x
		pitch = r.y
	if event is InputEventMouseButton and event.pressed:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			if build_mode:
				_try_place()
			elif Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
				_interact()
		elif mb.button_index == MOUSE_BUTTON_RIGHT and build_mode:
			set_build(false)

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
	var sprint := bot_sprint or Input.is_action_pressed("sprint")
	var speed := RUN if sprint and wish.length() > 0.1 else WALK
	if wish.length() < 0.1:
		speed = 0.0
	var dir := LookMath.wish_dir(yaw, wish.x, wish.y)
	velocity.x = dir.x * (RUN if sprint and wish.length() > 0.1 else WALK if wish.length() > 0.1 else 0.0)
	velocity.z = dir.z * (RUN if sprint and wish.length() > 0.1 else WALK if wish.length() > 0.1 else 0.0)
	if not is_on_floor():
		velocity.y -= 22.0 * delta
	else:
		velocity.y = -2.0
	move_and_slide()
	if global_position.y < -1.2:
		global_position = last_safe
		velocity = Vector3.ZERO
	if is_on_floor():
		last_safe = global_position
	if wish.length() > 0.2 and get_real_velocity().length() < 0.05 and is_on_floor():
		_stuck += delta
		if _stuck > 1.4:
			global_position += Vector3(0, 0.2, 0) - dir * 0.6
			_stuck = 0.0
	else:
		_stuck = 0.0
	if dir.length() > 0.1:
		rig.rotation.y = lerp_angle(rig.rotation.y, LookMath.face_yaw(dir), 1.0 - exp(-10.0 * delta))
	elif not first_person:
		rig.rotation.y = lerp_angle(rig.rotation.y, yaw, 1.0 - exp(-4.0 * delta))
	var flat := Vector2(velocity.x, velocity.z).length()
	rig.tick(delta, flat, "walk" if flat > 0.2 else "idle")
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

func _camera(delta: float) -> void:
	if camera_locked:
		return
	cam_dist = lerpf(cam_dist, cam_target, 1.0 - exp(-8.0 * delta))
	var flags: Dictionary = Settings.current_flags()
	camera.far = float(flags.get("view", 85.0)) + 30.0
	var basis := Basis.from_euler(Vector3(pitch, yaw, 0.0))
	var look := basis * Vector3(0, 0, -1)
	var pivot := global_position + Vector3(0, 1.48, 0)
	var wanted := pivot - look * cam_dist + basis * Vector3(0.28, 0.05, 0)
	var space := get_world_3d().direct_space_state
	var query := PhysicsRayQueryParameters3D.create(pivot, wanted, 1)
	query.collide_with_areas = false
	var hit := space.intersect_ray(query)
	if not hit.is_empty() and cam_dist > 0.4:
		camera.global_position = hit.position + hit.normal * 0.12
	else:
		camera.global_position = wanted
	camera.global_transform = Transform3D(basis, camera.global_position)
	rig.set_first_person(first_person or cam_dist < 0.35)

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
