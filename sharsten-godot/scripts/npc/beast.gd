extends CharacterBody3D

## An imaginary thornbeast. Not a villager, and not a stand-in for any people.
## It only ever aims at the player hurtbox.

const Combat = preload("res://scripts/sim/combat_rules.gd")

var health := 36.0
var health_max := 36.0
var stagger := 0.0
var cool := 0.6
var _hit_t := 0.0
var _flash := 0.0
var rig: HumanRig
var hurt: Area3D
var strike: Area3D
var _light: OmniLight3D
var _down := false

func _ready() -> void:
	add_to_group("enemy")
	collision_layer = 8
	collision_mask = 1 | 2
	floor_snap_length = 0.25
	var shape := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.34
	cap.height = 1.2
	shape.shape = cap
	shape.position = Vector3(0, 0.75, 0)
	add_child(shape)
	rig = HumanRig.new()
	add_child(rig)
	rig.setup({
		"kind": "man", "height": 1.05, "costume": false, "beast": true,
		"skin": "241c16", "name": "thornbeast",
	})
	hurt = _area(8, 0)
	var hurt_shape := CollisionShape3D.new()
	var hurt_cap := CapsuleShape3D.new()
	hurt_cap.radius = 0.4
	hurt_cap.height = 1.3
	hurt_shape.shape = hurt_cap
	hurt_shape.position = Vector3(0, 0.8, 0)
	hurt.add_child(hurt_shape)
	hurt.add_to_group("hurtbox")
	strike = _area(0, 16)
	strike.monitoring = false
	var blade := CollisionShape3D.new()
	var ball := SphereShape3D.new()
	ball.radius = 0.42
	blade.shape = ball
	blade.position = Vector3(0, 0.9, -0.7)
	strike.add_child(blade)
	strike.area_entered.connect(_on_strike)
	_light = OmniLight3D.new()
	_light.light_color = Color(1, 0.95, 0.85)
	_light.light_energy = 0.0
	_light.omni_range = 2.2
	add_child(_light)

func _area(layer: int, mask: int) -> Area3D:
	var area := Area3D.new()
	area.collision_layer = layer
	area.collision_mask = mask
	area.monitorable = true
	area.monitoring = mask != 0
	add_child(area)
	return area

func receive_hit(amount: float, from: Vector3, counter: bool) -> void:
	if _down or not Combat.can_damage(self):
		return
	health = maxf(health - amount, 0.0)
	stagger = 0.7 if counter else 0.4
	_flash = 0.1
	var away := global_position - from
	away.y = 0.0
	if away.length() > 0.05:
		velocity = away.normalized() * (8.0 if counter else 5.5)
	if health <= 0.0:
		_down = true
		stagger = 1.2

func _on_strike(area: Area3D) -> void:
	if _hit_t <= 0.0:
		return
	var body := area.get_parent()
	if body and body.is_in_group("player") and body.has_method("receive_hit"):
		body.receive_hit(9.0, global_position)

func _physics_process(delta: float) -> void:
	if _flash > 0.0:
		_flash -= delta
		_light.light_energy = 6.0 if _flash > 0.0 else 0.0
	else:
		_light.light_energy = 0.0
	var player := get_tree().get_first_node_in_group("player")
	if player == null or not player is Node3D or _down:
		velocity.x = 0.0
		velocity.z = 0.0
		_slide(delta)
		_anim(delta, 0.0, "hurt" if _down else "idle")
		return
	var target := (player as Node3D).global_position
	var offset := target - global_position
	offset.y = 0.0
	var dist := offset.length()
	if dist > 22.0:
		if rig:
			rig.set_lod(false)
		return
	if rig:
		rig.set_lod(true)
	var dir := offset / dist if dist > 0.05 else Vector3.ZERO
	var act := "idle"
	var speed := 0.0
	if stagger > 0.0:
		stagger -= delta
		act = "hurt"
		velocity.x = move_toward(velocity.x, 0.0, delta * 12.0)
		velocity.z = move_toward(velocity.z, 0.0, delta * 12.0)
	elif health <= health_max * 0.3:
		dir = -dir
		speed = 3.2
		act = "walk"
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
	elif dist > 1.55:
		speed = 2.4
		act = "walk"
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
	else:
		velocity.x = 0.0
		velocity.z = 0.0
		cool -= delta
		if cool <= 0.0:
			cool = 1.35
			_hit_t = 0.22
		act = "jab" if _hit_t > 0.0 else "guard"
	if dir.length() > 0.05:
		rotation.y = atan2(-dir.x, -dir.z)
	if _hit_t > 0.0:
		_hit_t -= delta
		strike.monitoring = true
	else:
		strike.monitoring = false
	_slide(delta)
	_anim(delta, speed, act)

func _slide(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= 20.0 * delta
	else:
		velocity.y = -2.0
	move_and_slide()

func _anim(delta: float, speed: float, act: String) -> void:
	if rig:
		rig.tick(delta, speed, act)
