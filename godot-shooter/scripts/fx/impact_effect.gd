class_name ImpactEffect
extends RefCounted

static func spawn(at: Vector3, normal: Vector3, kind: String) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null or tree.current_scene == null:
		return
	var host := tree.get_first_node_in_group("sfx_host")
	if host == null:
		host = tree.current_scene
	var root := Node3D.new()
	host.add_child(root)
	root.global_position = at + normal * 0.03
	if kind == "flesh":
		_burst(root, normal, Color(0.35, 0.32, 0.28), 10, 1.2, 3.0, false)
	else:
		var dust := Color(0.45, 0.38, 0.30) if normal.y > 0.6 else Color(0.55, 0.5, 0.46)
		_burst(root, normal, dust, 14, 1.4, 3.5, false)
		_burst(root, normal, Color(1.0, 0.75, 0.4), 6, 3.0, 6.0, true)
	AudioDirector.play_3d("impact", at, -8.0)
	var timer := tree.create_timer(1.1)
	timer.timeout.connect(root.queue_free)


static func tracer(from: Vector3, to: Vector3, color: Color) -> void:
	var dist := from.distance_to(to)
	if dist < 0.2:
		return
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null or tree.current_scene == null:
		return
	var host := tree.get_first_node_in_group("sfx_host")
	if host == null:
		host = tree.current_scene
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.018, 0.018, dist)
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 2.4
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(mi)
	mi.global_position = (from + to) * 0.5
	var dir := (to - from).normalized()
	if absf(dir.dot(Vector3.UP)) < 0.98:
		mi.look_at(to, Vector3.UP)
	var timer := tree.create_timer(0.045)
	timer.timeout.connect(mi.queue_free)


static func _burst(parent: Node3D, normal: Vector3, color: Color, amount: int, speed_a: float, speed_b: float, spark: bool) -> void:
	var p := CPUParticles3D.new()
	p.amount = amount
	p.lifetime = 0.28 if spark else 0.45
	p.one_shot = true
	p.explosiveness = 0.92
	p.direction = normal
	p.spread = 28.0 if spark else 42.0
	p.initial_velocity_min = speed_a
	p.initial_velocity_max = speed_b
	p.gravity = Vector3(0, -2.0, 0) if spark else Vector3(0, -4.5, 0)
	p.scale_amount_min = 0.04 if spark else 0.08
	p.scale_amount_max = 0.09 if spark else 0.2
	var mesh := SphereMesh.new()
	mesh.radius = 0.035
	mesh.height = 0.07
	p.mesh = mesh
	var mat := StandardMaterial3D.new()
	if spark:
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = 3.0
	mat.albedo_color = color
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	p.material_override = mat
	p.visibility_aabb = AABB(Vector3(-2, -2, -2), Vector3(4, 4, 4))
	parent.add_child(p)
	p.emitting = true
