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

var yaw: float = 0.0
var pitch: float = 0.0
var recoil_pitch: float = 0.0
var recoil_yaw: float = 0.0
var look_delta: Vector2 = Vector2.ZERO
var crouch_weight: float = 0.0
var foot_time: float = 0.0

@onready var shape_node: CollisionShape3D = $CollisionShape3D
@onready var visual: Node3D = $Visual
@onready var weapon_mount: Node3D = $Visual/WeaponMount
@onready var rifle: HitscanRifle = $Visual/WeaponMount/Rifle
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
	HumanoidFactory.build(visual, "gurut")
	rifle.bind(self)
	camera.current = true
	camera.far = 800.0
	camera.near = 0.06
	spring.collision_mask = 5
	spring.margin = 0.18
	if control_enabled and DisplayServer.get_name() != "headless":
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func add_look_delta(relative: Vector2) -> void:
	# Android / touch should call this. Mouse look uses the same path.
	look_delta += relative


func set_ads(on: bool) -> void:
	ads_forced = on


func is_crouching() -> bool:
	return crouched


func add_recoil(pitch_add: float, yaw_add: float) -> void:
	recoil_pitch = minf(recoil_pitch + pitch_add, deg_to_rad(7.5))
	recoil_yaw += yaw_add


func notify_hit() -> void:
	hit_marker = 1.0


func add_ammo(amount: int) -> bool:
	if not rifle.add_reserve(amount):
		return false
	toast = GameConfig.STR["ammo_gain"] % amount
	toast_left = 1.6
	return true


func apply_damage(amount: int, from_pos: Vector3) -> void:
	if not alive or invulnerable:
		return
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
	rotation.y = yaw
	head.rotation.x = pitch
	weapon_mount.rotation.x = pitch
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
	hit_marker = maxf(0.0, hit_marker - delta * 4.0)
	if toast_left > 0.0:
		toast_left -= delta
		if toast_left <= 0.0:
			toast = ""
	rifle.advance(delta)
	if control_enabled and alive:
		_read_actions(delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 18.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 18.0 * delta)
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
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var wish := Vector3(input_dir.x, 0.0, input_dir.y)
	if wish.length() > 1.0:
		wish = wish.normalized()
	wish = Basis(Vector3.UP, yaw) * wish
	var aiming := _is_aiming()
	var sprinting := false
	if Input.is_action_pressed("sprint") and wish.length() > 0.2 and is_on_floor() and not aiming:
		if crouched and _can_stand():
			crouched = false
		if not crouched:
			sprinting = true
	var speed := WALK_SPEED
	if crouched:
		speed = CROUCH_SPEED
	elif sprinting:
		speed = SPRINT_SPEED
	var accel := 16.0 if is_on_floor() else 4.0
	var horiz := Vector3(velocity.x, 0.0, velocity.z)
	var target := wish * speed
	var change := target - horiz
	var max_change := accel * delta
	if change.length() > max_change:
		change = change.normalized() * max_change
	horiz += change
	velocity.x = horiz.x
	velocity.z = horiz.z
	if Input.is_action_just_pressed("jump") and is_on_floor():
		if crouched:
			if _can_stand():
				crouched = false
		else:
			velocity.y = JUMP_VELOCITY
	if Input.is_action_just_pressed("reload"):
		rifle.try_reload()
	if Input.is_action_pressed("fire") and not sprinting:
		rifle.try_fire(camera, ads_weight)
	if is_on_floor() and horiz.length() > 1.2:
		foot_time -= delta
		if foot_time <= 0.0:
			foot_time = 0.42 if not sprinting else 0.32
			AudioDirector.play_3d("foot", global_position, -16.0)
	else:
		foot_time = 0.1


func _is_aiming() -> bool:
	if ads_forced:
		return true
	if not control_enabled:
		return false
	return Input.is_action_pressed("aim") and not Input.is_action_pressed("sprint")


func _apply_look(relative: Vector2) -> void:
	var sens := Settings.sensitivity
	yaw -= relative.x * sens
	pitch -= relative.y * sens
	pitch = clampf(pitch, deg_to_rad(-55.0), deg_to_rad(42.0))
	yaw += recoil_yaw
	rotation.y = yaw
	var view_pitch := pitch + recoil_pitch
	head.rotation.x = view_pitch
	weapon_mount.rotation.x = view_pitch


func _decay_recoil(delta: float) -> void:
	var k := 1.0 - exp(-7.5 * delta)
	recoil_pitch = lerpf(recoil_pitch, 0.0, k)
	recoil_yaw = lerpf(recoil_yaw, 0.0, k)


func _update_pose(delta: float) -> void:
	var aim_target := 1.0 if _is_aiming() else 0.0
	ads_weight = lerpf(ads_weight, aim_target, 1.0 - exp(-12.0 * delta))
	var crouch_target := 1.0 if crouched else 0.0
	crouch_weight = move_toward(crouch_weight, crouch_target, delta * 5.5)
	var drop := 0.46 * crouch_weight
	var height := lerpf(STAND_HEIGHT, CROUCH_HEIGHT, crouch_weight)
	if _shape:
		_shape.height = height
		shape_node.position.y = height * 0.5
	head.position.y = 1.62 - drop
	var mount := _hip.lerp(_ads, ads_weight)
	mount.y -= drop
	weapon_mount.position = mount
	if rifle.reloading:
		weapon_mount.rotation.x += 0.4
		weapon_mount.position.y -= 0.06
	spring.spring_length = lerpf(3.05, 1.95, ads_weight)
	camera.fov = lerpf(72.0, 50.0, ads_weight)
	camera.position.x = lerpf(0.68, 0.62, ads_weight)
	camera.position.y = lerpf(0.22, 0.38, ads_weight)


func _can_stand() -> bool:
	var space := get_world_3d().direct_space_state
	var from := global_position + Vector3(0, 0.5, 0)
	var to := global_position + Vector3(0, STAND_HEIGHT + 0.05, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to, 1)
	query.exclude = [get_rid()]
	return space.intersect_ray(query).is_empty()


func _die() -> void:
	if not alive:
		return
	alive = false
	control_enabled = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var tw := create_tween()
	tw.tween_property(visual, "rotation_degrees:x", 78.0, 0.55)
	player_died.emit()
