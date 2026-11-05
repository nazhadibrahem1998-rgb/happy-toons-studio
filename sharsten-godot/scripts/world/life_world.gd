extends Node

const Flocks = preload("res://scripts/world/flock.gd")

## Furniture, public places, extra nature, weather, and animal flocks.
## Drawn with MultiMesh and a handful of colliders so integrated GPUs stay comfortable.

var flocks
var meshes: Array = []
var clouds: MultiMeshInstance3D
var rain: GPUParticles3D
var sun: DirectionalLight3D
var env: Environment
var sky_mat: ProceduralSkyMaterial
var blocks: Array = []

func bind(world: Node3D, sun_node: DirectionalLight3D, environment: Environment, sky: ProceduralSkyMaterial) -> void:
	sun = sun_node
	env = environment
	sky_mat = sky
	_collect_blocks(world)
	_places(world)
	_nature(world)
	_ruins(world)
	_signs(world)
	_animals(world)
	_weather(world)

func _collect_blocks(world: Node) -> void:
	for h in world.get_tree().get_nodes_in_group("house_block"):
		blocks.append([h.get_meta("min_xz"), h.get_meta("max_xz")])

func _places(world: Node3D) -> void:
	_cluster(world, Vector3(30, 0, 56), "square", false)
	_cluster(world, Vector3(62, 0, 70), "market", false)
	_cluster(world, Vector3(46, 0, 38), "tea", false)
	_garden(world, Vector3(22, 0, 78))
	_sign(world, Vector3(28, 0, 52), "Village square")
	_sign(world, Vector3(58, 0, 66), "Market")
	_sign(world, Vector3(44, 0, 42), "Tea house")
	_sign(world, Vector3(20, 0, 74), "Garden")

func _cluster(world: Node3D, at: Vector3, kind: String, ruined: bool) -> void:
	var root := Node3D.new()
	root.position = at
	root.name = kind
	if ruined:
		root.add_to_group("ruins")
		root.visible = false
	world.add_child(root)
	var wood := MeshLib.mat("6b4226", 0.86)
	var cloth := MeshLib.mat("8b1e2d" if kind != "tea" else "1f6b4a", 0.9)
	var rust := MeshLib.mat("6a3a2a", 0.7, 0.35)
	match kind:
		"square", "market", "tea":
			_prop(root, world, MeshLib.box(1.4, 0.08, 0.8), wood, Vector3(0, 0.72, 0), Vector3(1.5, 0.9, 0.9), true)
			_prop(root, world, MeshLib.box(1.6, 0.55, 0.4), wood, Vector3(0, 0.28, 1.1), Vector3(1.7, 0.7, 0.5), true)
			_prop(root, world, MeshLib.box(1.6, 0.55, 0.4), wood, Vector3(0, 0.28, -1.1), Vector3(1.7, 0.7, 0.5), true)
			_rug(root, cloth, Vector3(0, 0.02, 0))
		"plaza":
			_prop(root, world, MeshLib.box(6, 0.08, 6), rust, Vector3(0, 0.02, 0), Vector3(6.2, 0.4, 6.2), false)
			_prop(root, world, MeshLib.box(1.2, 0.4, 1.2), rust, Vector3(1.4, 0.15, 1.2), Vector3(1.4, 0.5, 1.4), false)
		"station":
			_prop(root, world, MeshLib.box(5, 1.2, 2.4), rust, Vector3(0, 0.4, 0), Vector3(5.2, 1.6, 2.6), false)
			_prop(root, world, MeshLib.box(0.3, 2.2, 0.3), rust, Vector3(-2, 1.1, -1), Vector3(0.5, 2.4, 0.5), false)
		"play":
			_prop(root, world, MeshLib.box(2.4, 0.12, 0.12), rust, Vector3(0, 1.6, 0), Vector3(2.6, 0.4, 0.4), false)
			_prop(root, world, MeshLib.box(0.12, 1.8, 0.12), rust, Vector3(-1.1, 0.9, 0), Vector3(0.3, 2.0, 0.3), false)
			_prop(root, world, MeshLib.box(0.12, 1.8, 0.12), rust, Vector3(1.1, 0.9, 0), Vector3(0.3, 2.0, 0.3), false)
	if kind == "tea":
		for seat in [Vector3(-0.7, 0, 1.1), Vector3(0.7, 0, 1.1), Vector3(-0.7, 0, -1.1), Vector3(0.7, 0, -1.1)]:
			var mark := Marker3D.new()
			mark.position = at + seat
			mark.add_to_group("seat")
			world.add_child(mark)

func _rug(root: Node3D, mat: Material, pos: Vector3) -> void:
	MeshLib.part(root, MeshLib.box(2.2, 0.02, 1.6), mat, pos)

func _prop(root: Node3D, world: Node3D, mesh: Mesh, mat: Material, local: Vector3, block: Vector3, solid: bool) -> void:
	MeshLib.part(root, mesh, mat, local)
	if not solid:
		return
	var body := StaticBody3D.new()
	body.collision_layer = 1
	body.add_to_group("furniture")
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = block
	shape.shape = box
	shape.position = Vector3(0, block.y * 0.5, 0)
	body.add_child(shape)
	body.position = root.position + local
	var mn := Vector2(body.position.x - block.x * 0.5, body.position.z - block.z * 0.5)
	var mx := Vector2(body.position.x + block.x * 0.5, body.position.z + block.z * 0.5)
	body.set_meta("min_xz", mn)
	body.set_meta("max_xz", mx)
	world.add_child(body)
	blocks.append([mn, mx])

func _garden(world: Node3D, at: Vector3) -> void:
	var n := 40
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.box(0.08, 0.28, 0.08)
	mm.instance_count = n
	var rng := RandomNumberGenerator.new()
	rng.seed = 77
	for i in n:
		var p := at + Vector3(rng.randf_range(-4, 4), 0.14, rng.randf_range(-4, 4))
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, p))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.mat("d45a78", 0.9)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_end = 48.0
	inst.visibility_range_end_margin = 6.0
	world.add_child(inst)
	_sign(world, at + Vector3(0, 0, 5), "Flower garden")

func _nature(world: Node3D) -> void:
	# River along the south lane, a pond, two wells, the existing spring stays.
	var river := MeshInstance3D.new()
	river.mesh = MeshLib.box(90, 0.08, 3.2)
	var water := MeshLib.mat("6a8f96", 0.2, 0.05)
	water.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	water.albedo_color = Color(0.35, 0.55, 0.62, 0.72)
	river.material_override = water
	river.position = Vector3(70, 0.04, 6)
	river.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(river)
	var pond := MeshInstance3D.new()
	pond.mesh = MeshLib.cyl(3.2, 0.08)
	pond.material_override = water
	pond.position = Vector3(88, 0.05, 18)
	pond.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(pond)
	_well(world, Vector3(34, 0, 48))
	_well(world, Vector3(100, 0, 84))
	_bridge(world, Vector3(40, 0, 6))
	_bridge(world, Vector3(96, 0, 6))
	_woods(world, Vector3(120, 0, 150))
	_orchard(world, Vector3(18, 0, 60))
	_terraces(world, Vector3(108, 0, 130))
	_pen(world, Vector3(40, 0, 30))
	_hills(world)
	_cave(world, Vector3(12, 0, 150))
	_sign(world, Vector3(40, 0, 9), "River bridge")
	_sign(world, Vector3(14, 0, 146), "Cave path")

func _well(world: Node3D, at: Vector3) -> void:
	MeshLib.part(world, MeshLib.cyl(0.7, 0.8), MeshLib.mat("9a9088", 0.9), at + Vector3(0, 0.4, 0))
	MeshLib.part(world, MeshLib.cyl(0.35, 0.2), MeshLib.mat("6a8f96", 0.3), at + Vector3(0, 0.7, 0))

func _bridge(world: Node3D, at: Vector3) -> void:
	MeshLib.part(world, MeshLib.box(3.2, 0.12, 1.4), MeshLib.mat("6b4226", 0.84), at + Vector3(0, 0.2, 0))
	var body := StaticBody3D.new()
	body.position = at
	body.collision_layer = 1
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(3.2, 0.3, 1.4)
	shape.shape = box
	shape.position = Vector3(0, 0.2, 0)
	body.add_child(shape)
	world.add_child(body)

func _woods(world: Node3D, at: Vector3) -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.cyl(0.16, 2.2)
	mm.instance_count = 18
	var rng := RandomNumberGenerator.new()
	rng.seed = 19
	for i in 18:
		var p := at + Vector3(rng.randf_range(-8, 8), 1.1, rng.randf_range(-8, 8))
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, p))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.mat("5a3a28", 0.9)
	inst.visibility_range_end = 70.0
	inst.visibility_range_end_margin = 8.0
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(inst)

func _orchard(world: Node3D, at: Vector3) -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.sphere(0.55)
	mm.instance_count = 10
	for i in 10:
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, at + Vector3((i % 5) * 2.2, 1.3, int(i / 5) * 2.4)))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.mat("2f6a32", 0.9)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_end = 55.0
	world.add_child(inst)

func _terraces(world: Node3D, at: Vector3) -> void:
	for i in 4:
		MeshLib.part(world, MeshLib.box(8, 0.35, 1.4), MeshLib.mat("a89880", 0.95), at + Vector3(0, 0.2 + i * 0.15, i * 1.6))

func _pen(world: Node3D, at: Vector3) -> void:
	MeshLib.part(world, MeshLib.box(6, 0.7, 0.25), MeshLib.mat("9a9088", 0.95), at + Vector3(0, 0.35, 2.5))
	MeshLib.part(world, MeshLib.box(0.25, 0.7, 5), MeshLib.mat("9a9088", 0.95), at + Vector3(-3, 0.35, 0))

func _hills(world: Node3D) -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.sphere(8.0)
	mm.instance_count = 6
	var spots := [Vector3(-6, -2, 20), Vector3(150, -3, 40), Vector3(20, -4, 180), Vector3(140, -3, 170), Vector3(80, -5, -8), Vector3(160, -2, 100)]
	for i in spots.size():
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, spots[i]))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.mat("b7a48a", 0.96)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(inst)

func _cave(world: Node3D, at: Vector3) -> void:
	# A short walkable tunnel. Walls are colliders; two lamps keep it readable.
	for side in [-1.0, 1.0]:
		var wall := StaticBody3D.new()
		wall.position = at + Vector3(side * 1.3, 1.2, 2.5)
		wall.collision_layer = 1
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(0.4, 2.4, 6.0)
		shape.shape = box
		wall.add_child(shape)
		MeshLib.part(wall, MeshLib.box(0.4, 2.4, 6.0), MeshLib.mat("6a5a48", 0.95), Vector3.ZERO)
		world.add_child(wall)
	MeshLib.part(world, MeshLib.box(2.6, 0.3, 6.0), MeshLib.mat("5a4a3c", 0.95), at + Vector3(0, 2.4, 2.5))
	for z in [1.0, 4.0]:
		var lamp := OmniLight3D.new()
		lamp.position = at + Vector3(0, 1.8, z)
		lamp.light_color = Color(1.0, 0.82, 0.55)
		lamp.light_energy = 0.7
		lamp.omni_range = 5.0
		lamp.shadow_enabled = false
		world.add_child(lamp)

func _ruins(world: Node3D) -> void:
	_cluster(world, Vector3(28, 0, 22), "plaza", true)
	_cluster(world, Vector3(96, 0, 108), "station", true)
	_cluster(world, Vector3(72, 0, 40), "play", true)

func _signs(world: Node3D) -> void:
	_sign(world, Vector3(64, 0, 20), "Spring")

func _sign(world: Node3D, at: Vector3, text: String) -> void:
	var post := MeshInstance3D.new()
	post.mesh = MeshLib.box(0.08, 1.3, 0.08)
	post.material_override = MeshLib.mat("6b4226")
	post.position = at + Vector3(0, 0.65, 0)
	post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(post)
	var label := Label3D.new()
	label.text = text
	label.font_size = 22
	label.pixel_size = 0.002
	label.position = at + Vector3(0, 1.35, 0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.modulate = Color(0.98, 0.94, 0.86)
	label.outline_size = 4
	world.add_child(label)

func _animals(world: Node3D) -> void:
	var count := 24
	var flags: Dictionary = Settings.current_flags()
	count = int(flags.get("animals", 24))
	flocks = Flocks.new()
	flocks.setup(count, 1407)
	for sp in Flocks.SPECIES.size():
		var spec: Dictionary = Flocks.SPECIES[sp]
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = MeshLib.box(1, 1, 1)
		mm.instance_count = count
		var inst := MultiMeshInstance3D.new()
		inst.multimesh = mm
		inst.material_override = MeshLib.mat(str(spec["color"]), 0.9)
		inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		inst.visibility_range_end = float(flags.get("view", 70.0))
		inst.visibility_range_end_margin = 8.0
		inst.name = str(spec["id"])
		world.add_child(inst)
		meshes.append(inst)
	_apply_meshes()

func _apply_meshes() -> void:
	if flocks == null:
		return
	for sp in meshes.size():
		var inst: MultiMeshInstance3D = meshes[sp]
		var shown := 0
		var scale: Vector3 = Flocks.SPECIES[sp]["scale"]
		for i in flocks.pos.size():
			if int(flocks.species[i]) != sp:
				continue
			var p: Vector2 = flocks.pos[i]
			var y := 0.55 + sin(flocks.phase[i]) * 0.35 if str(Flocks.SPECIES[sp]["id"]) == "bird" else scale.y * 0.5
			var basis := Basis(Vector3.UP, flocks.heading[i]).scaled(scale)
			inst.multimesh.set_instance_transform(shown, Transform3D(basis, Vector3(p.x, y, p.y)))
			shown += 1
		inst.multimesh.visible_instance_count = shown

func _weather(world: Node3D) -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.box(6, 0.3, 2.4)
	mm.instance_count = 8
	for i in 8:
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, Vector3(i * 18.0, 28.0, 20.0 + (i % 3) * 12.0)))
	clouds = MultiMeshInstance3D.new()
	clouds.multimesh = mm
	var cloud_mat := MeshLib.mat("f7f4ee", 1.0)
	cloud_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	cloud_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cloud_mat.albedo_color = Color(1, 1, 1, 0.45)
	clouds.material_override = cloud_mat
	clouds.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(clouds)
	rain = GPUParticles3D.new()
	var pmesh := ParticleProcessMaterial.new()
	pmesh.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pmesh.emission_box_extents = Vector3(18, 0.2, 18)
	pmesh.direction = Vector3(0.1, -1, 0)
	pmesh.spread = 8
	pmesh.initial_velocity_min = 6
	pmesh.initial_velocity_max = 9
	pmesh.gravity = Vector3(0, -4, 0)
	rain.process_material = pmesh
	rain.amount = 180
	rain.lifetime = 1.4
	var drop := QuadMesh.new()
	drop.size = Vector2(0.03, 0.16)
	rain.draw_pass_1 = drop
	rain.position = Vector3(40, 12, 50)
	rain.emitting = false
	world.add_child(rain)

func _process(delta: float) -> void:
	if flocks:
		flocks.tick(delta, blocks)
		_apply_meshes()
	var hour := GameState.hour()
	var night := hour < 6 or hour >= 19
	if sun:
		var elev := -20.0 if night else -50.0
		sun.rotation_degrees = Vector3(elev, 38, 0)
		sun.light_energy = 0.35 if night else 1.15
		sun.light_color = Color(0.65, 0.72, 0.95) if night else Color(1.0, 0.9, 0.74)
	if sky_mat:
		sky_mat.sky_top_color = Color(0.08, 0.1, 0.2) if night else Color(0.45, 0.52, 0.78)
		sky_mat.sky_horizon_color = Color(0.25, 0.28, 0.4) if night else Color(0.95, 0.72, 0.58)
	if clouds and clouds.multimesh:
		for i in clouds.multimesh.instance_count:
			var xf := clouds.multimesh.get_instance_transform(i)
			xf.origin.x = fmod(xf.origin.x + delta * 0.8, 160.0)
			clouds.multimesh.set_instance_transform(i, xf)
	var raining := Settings.rain and (hour == 15 or hour == 16)
	if rain:
		rain.emitting = raining
		var player := get_tree().get_first_node_in_group("player")
		if player is Node3D:
			rain.global_position = player.global_position + Vector3(0, 10, 0)
