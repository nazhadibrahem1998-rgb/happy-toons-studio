class_name PlayerBody
extends CharacterBody3D

signal health_changed(current: int, maximum: int)
signal damaged(from_pos: Vector3)
signal player_died

const GRAVITY := 13.5
const WALK_SPEED := 4.4
const SPRINT_SPEED := 7.0
const CROUCH_SPEED := 2.25
const JUMP_VELOCITY := 5.05
const STAND_HEIGHT := 1.75
const CROUCH_HEIGHT := 1.15

var health: int = GameConfig.PLAYER_MAX_HEALTH
var max_health: int = GameConfig.PLAYER_MAX_HEALTH
var alive: bool = true
var control_enabled: bool = true
var invulnerable: bool = false
var crouched: bool = false
var ads_weight: float = 0.0
var ads_forced: bool = false
var hit_marker: float = 0.0
var toast: String = ""
var toast_left: float = 0.0
var camera_distance_override: float = -1.0
var since_hurt: float = 10.0
var regen_bank: float = 0.0
var blocking: bool = false
var block_age: float = 10.0
var iframe_left: float = 0.0
var dodge_left: float = 0.0
var dodge_cd: float = 0.0
var dodge_dir: Vector3 = Vector3.ZERO
var lock_on: bool = false
var shake: float = 0.0
var attack_buffer: float = 0.0
var heavy_buffer: float = 0.0

var yaw: float = 0.0
var pitch: float = 0.0
var yaw_target: float = 0.0
var pitch_target: float = 0.0
var recoil_pitch: float = 0.0
var recoil_yaw: float = 0.0
var look_delta: Vector2 = Vector2.ZERO
var crouch_weight: float = 0.0
var foot_time: float = 0.0

@onready var shape_node: CollisionShape3D = $CollisionShape3D
@onready var visual: Node3D = $Visual
@onready var weapon_mount: Node3D = $Visual/WeaponMount
@onready var weapon: MeleeWeapon = $Visual/WeaponMount/Sword
@onready var head: Node3D = $HeadPivot
@onready var spring: SpringArm3D = $HeadPivot/SpringArm3D
@onready var camera: Camera3D = $HeadPivot/SpringArm3D/Boom/Camera3D

var _shape: CapsuleShape3D
var _hip := Vector3(0.2, 1.22, -0.08)
var _ads := Vector3(0.12, 1.4, -0.32)


func _ready() -> void:
	add_to_group("player")
	collision_layer = 2
	collision_mask = 5
	floor_snap_length = 0.25
	floor_max_angle = deg_to_rad(50.0)
	motion_mode = MOTION_MODE_GROUNDED
	_shape = shape_node.shape as CapsuleShape3D
	max_health = GameConfig.player_max_health()
	health = max_health
	HumanoidFactory.build(visual, "gurut")
	weapon.bind(self)
	if not Settings.settings_changed.is_connected(_on_settings_changed):
		Settings.settings_changed.connect(_on_settings_changed)
	camera.current = true
	camera.far = 420.0
	camera.near = 0.06
	spring.collision_mask = 5
	spring.margin = 0.18
	if TouchMode.active():
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		ensure_touch_hud()
		toast = GameConfig.STR["touch_hint"]
		toast_left = 4.5
	elif control_enabled and DisplayServer.get_name() != "headless":
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func add_look_delta(relative: Vector2) -> void:
	# Android / touch should call this. Mouse look uses the same path.
	look_delta += relative


func set_ads(on: bool) -> void:
	ads_forced = on


func is_crouching() -> bool:
	return crouched


func add_recoil(pitch_add: float, _yaw_add: float) -> void:
	shake = minf(shake + absf(pitch_add) * 6.0, 0.42)


func notify_hit() -> void:
	hit_marker = 1.0


func unlock_metal_sword() -> bool:
	if weapon.style == "metal":
		return false
	weapon.equip_metal()
	toast = GameConfig.STR["sword_metal"]
	toast_left = 2.2
	return true


func snap_facing(point: Vector3) -> void:
	aim_at(point)
	yaw_target = yaw
	pitch_target = pitch
	rotation.y = yaw
	head.rotation.x = pitch


func receive_hit(amount: int, from_pos: Vector3) -> String:
	if not alive:
		return "dead"
	if iframe_left > 0.0:
		return "dodge"
	if blocking:
		if block_age < 0.22:
			notify_hit()
			shake = minf(shake + 0.12, 0.35)
			return "parry"
		apply_damage(maxi(1, int(round(float(amount) * 0.25))), from_pos)
		return "block"
	apply_damage(amount, from_pos)
	return "hit"


func ensure_touch_hud() -> void:
	if not TouchMode.active():
		return
	if get_tree().root.get_node_or_null("TouchControls"):
		return
	var hud: Node = load("res://scripts/ui/touch_controls.gd").new()
	hud.name = "TouchControls"
	get_tree().root.add_child(hud)


func apply_damage(amount: int, from_pos: Vector3) -> void:
	if not alive or invulnerable:
		return
	since_hurt = 0.0
	regen_bank = 0.0
	health = maxi(0, health - amount)
	health_changed.emit(health, max_health)
	damaged.emit(from_pos)
	add_recoil(deg_to_rad(1.1), randf_range(-0.01, 0.01))
	AudioDirector.play_2d("hurt", -8.0)
	if health <= 0:
		_die()


func face_world(point: Vector3) -> void:
	aim_at(point)


func aim_at(point: Vector3) -> void:
	var from := global_position + Vector3(0, 1.55, 0)
	var dir := point - from
	var flat := Vector2(dir.x, dir.z)
	if flat.length() < 0.05:
		return
	yaw = atan2(-dir.x, -dir.z)
	pitch = atan2(dir.y, flat.length())
	pitch = clampf(pitch, deg_to_rad(-35.0), deg_to_rad(28.0))
	yaw_target = yaw
	pitch_target = pitch
	rotation.y = yaw
	head.rotation.x = pitch
	weapon_mount.rotation.x = 0.0
	recoil_pitch = 0.0
	recoil_yaw = 0.0


func _unhandled_input(event: InputEvent) -> void:
	if not control_enabled:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		add_look_delta((event as InputEventMouseMotion).relative)


func _physics_process(delta: float) -> void:
	if control_enabled:
		_apply_look(look_delta)
	look_delta = Vector2.ZERO
	_decay_recoil(delta)
	hit_marker = maxf(0.0, hit_marker - delta * 2.4)
	_regen(delta)
	iframe_left = maxf(0.0, iframe_left - delta)
	dodge_cd = maxf(0.0, dodge_cd - delta)
	if toast_left > 0.0:
		toast_left -= delta
		if toast_left <= 0.0:
			toast = ""
	_assist_lock(delta)
	_smooth_look(delta)
	weapon.advance(delta)
	if control_enabled and alive:
		_read_actions(delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 8.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 8.0 * delta)
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif velocity.y < 0.0:
		velocity.y = -0.4
	_update_pose(delta)
	move_and_slide()


func _read_actions(delta: float) -> void:
	if Input.is_action_just_pressed("crouch"):
		if crouched:
			if _can_stand():
				crouched = false
		else:
			crouched = true
	_poll_touch()
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	input_dir += TouchMode.move_vector
	var wish := Vector3(input_dir.x, 0.0, input_dir.y)
	if wish.length() > 1.0:
		wish = wish.normalized()
	wish = Basis(Vector3.UP, rotation.y) * wish
	var sprinting := false
	if Input.is_action_pressed("sprint") and wish.length() > 0.2 and is_on_floor() and not blocking and not weapon.busy and dodge_left <= 0.0:
		if crouched and _can_stand():
			crouched = false
		if not crouched:
			sprinting = true
	var speed := WALK_SPEED
	if crouched:
		speed = CROUCH_SPEED
	elif sprinting:
		speed = SPRINT_SPEED
	if weapon.busy:
		speed *= 0.42
	elif blocking:
		speed *= 0.62
	var rate := 6.5 if is_on_floor() else 3.0
	var horiz := Vector3(velocity.x, 0.0, velocity.z)
	var target := wish * speed
	horiz = horiz.lerp(target, 1.0 - exp(-rate * delta))
	velocity.x = horiz.x
	velocity.z = horiz.z
	if dodge_left > 0.0:
		dodge_left -= delta
		velocity.x = dodge_dir.x * 8.0
		velocity.z = dodge_dir.z * 8.0
	if (Input.is_action_just_pressed("jump") or TouchMode.pulse_jump) and is_on_floor() and dodge_left <= 0.0:
		TouchMode.pulse_jump = false
		if crouched:
			if _can_stand():
				crouched = false
		else:
			velocity.y = JUMP_VELOCITY
	else:
		TouchMode.pulse_jump = false
	_poll_combat(delta, wish)
	if is_on_floor() and horiz.length() > 1.2:
		foot_time -= delta
		if foot_time <= 0.0:
			foot_time = 0.42 if not sprinting else 0.32
			AudioDirector.play_3d("foot", global_position, -16.0)
	else:
		foot_time = 0.1


func _is_aiming() -> bool:
	return blocking


func _poll_touch() -> void:
	if TouchMode.pulse_attack:
		TouchMode.pulse_attack = false
		attack_buffer = 0.24
	if TouchMode.pulse_heavy:
		TouchMode.pulse_heavy = false
		heavy_buffer = 0.24
	if TouchMode.pulse_lock:
		TouchMode.pulse_lock = false
		lock_on = not lock_on
	if TouchMode.pulse_pause:
		TouchMode.pulse_pause = false
		Input.action_press("pause")
		Input.action_release("pause")


func _poll_combat(delta: float, wish: Vector3) -> void:
	var want_block := TouchMode.hold_block or Input.is_action_pressed("block") or Input.is_action_pressed("aim")
	if want_block and dodge_left <= 0.0 and not weapon.busy:
		if not blocking:
			block_age = 0.0
		blocking = true
		block_age += delta
	else:
		blocking = false
		block_age = 10.0
	if Input.is_action_just_pressed("heavy_attack"):
		heavy_buffer = 0.24
	if Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("fire"):
		attack_buffer = 0.24
	if Input.is_action_just_pressed("dodge") or TouchMode.pulse_dodge:
		TouchMode.pulse_dodge = false
		_start_dodge(wish)
	if Input.is_action_just_pressed("lock_on"):
		lock_on = not lock_on
	if heavy_buffer > 0.0:
		heavy_buffer = maxf(0.0, heavy_buffer - delta)
		if weapon.try_heavy():
			heavy_buffer = 0.0
			attack_buffer = 0.0
	elif attack_buffer > 0.0:
		attack_buffer = maxf(0.0, attack_buffer - delta)
		if weapon.try_light():
			attack_buffer = 0.0


func _start_dodge(wish: Vector3) -> void:
	if dodge_cd > 0.0 or dodge_left > 0.0 or not is_on_floor():
		return
	var dir := wish
	if dir.length() < 0.15:
		dir = -global_transform.basis.z
	dir.y = 0.0
	if dir.length() < 0.01:
		return
	dodge_dir = dir.normalized()
	dodge_left = 0.42
	iframe_left = 0.34
	dodge_cd = 0.58
	blocking = false
	AudioDirector.play_3d("swing", global_position, -14.0)


func _assist_lock(delta: float) -> void:
	if not lock_on or not alive:
		return
	var nearest: Node3D = null
	var best := 16.0
	for node in get_tree().get_nodes_in_group("enemy"):
		var enemy := node as Node3D
		if enemy == null or not bool(enemy.get("alive")):
			continue
		var dist := global_position.distance_to(enemy.global_position)
		if dist < best:
			best = dist
			nearest = enemy
	if nearest == null:
		return
	var dir := nearest.global_position - global_position
	dir.y = 0.0
	if dir.length() < 0.05:
		return
	var target := atan2(-dir.x, -dir.z)
	yaw_target = lerp_angle(yaw_target, target, 1.0 - exp(-5.2 * delta))


func _apply_look(relative: Vector2) -> void:
	var sens := Settings.sensitivity
	if TouchMode.active():
		sens *= 1.05
	yaw_target -= relative.x * sens
	pitch_target -= relative.y * sens
	pitch_target = clampf(pitch_target, deg_to_rad(-50.0), deg_to_rad(38.0))
	if relative.length() > 18.0:
		lock_on = false


func _smooth_look(delta: float) -> void:
	var k := 1.0 - exp(-14.0 * delta)
	yaw = lerp_angle(yaw, yaw_target, k)
	pitch = lerpf(pitch, pitch_target, k)
	shake = maxf(0.0, shake - delta * 1.6)
	var wobble := shake * shake
	var t := float(Time.get_ticks_msec()) * 0.02
	rotation.y = yaw
	head.rotation.x = pitch + sin(t) * wobble * 0.045
	head.rotation.z = cos(t * 0.8) * wobble * 0.03


func _decay_recoil(delta: float) -> void:
	var k := 1.0 - exp(-7.5 * delta)
	recoil_pitch = lerpf(recoil_pitch, 0.0, k)
	recoil_yaw = lerpf(recoil_yaw, 0.0, k)


func _update_pose(delta: float) -> void:
	ads_weight = lerpf(ads_weight, 1.0 if lock_on else 0.0, 1.0 - exp(-6.0 * delta))
	var crouch_target := 1.0 if crouched else 0.0
	crouch_weight = move_toward(crouch_weight, crouch_target, delta * 4.0)
	var drop := 0.46 * crouch_weight
	var height := lerpf(STAND_HEIGHT, CROUCH_HEIGHT, crouch_weight)
	if _shape:
		_shape.height = height
		shape_node.position.y = height * 0.5
	head.position.y = 1.62 - drop
	var mount := _hip
	mount.y -= drop
	if blocking:
		mount.z -= 0.12
	weapon_mount.position = weapon_mount.position.lerp(mount, 1.0 - exp(-10.0 * delta))
	if camera_distance_override > 0.0:
		spring.spring_length = camera_distance_override
	else:
		spring.spring_length = lerpf(spring.spring_length, 3.45, 1.0 - exp(-4.0 * delta))
	camera.fov = 66.0
	camera.position = camera.position.lerp(Vector3(0.42, 0.26, 0), 1.0 - exp(-4.0 * delta))


func _can_stand() -> bool:
	var space := get_world_3d().direct_space_state
	var from := global_position + Vector3(0, 0.5, 0)
	var to := global_position + Vector3(0, STAND_HEIGHT + 0.05, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	query.exclude = [get_rid()]
	return space.intersect_ray(query).is_empty()


func _on_settings_changed() -> void:
	var ratio := 1.0
	if max_health > 0:
		ratio = float(health) / float(max_health)
	max_health = GameConfig.player_max_health()
	health = clampi(int(round(ratio * float(max_health))), 0, max_health)
	if alive and health <= 0:
		health = max_health
	health_changed.emit(health, max_health)


func _regen(delta: float) -> void:
	if not alive or invulnerable:
		return
	since_hurt += delta
	if health >= max_health or since_hurt < GameConfig.regen_delay():
		return
	regen_bank += GameConfig.regen_per_second() * delta
	if regen_bank < 1.0:
		return
	var gained := int(regen_bank)
	regen_bank -= float(gained)
	health = mini(max_health, health + gained)
	health_changed.emit(health, max_health)


func _die() -> void:
	if not alive:
		return
	alive = false
	control_enabled = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var tw := create_tween()
	tw.tween_property(visual, "rotation_degrees:x", 78.0, 0.55)
	player_died.emit()
