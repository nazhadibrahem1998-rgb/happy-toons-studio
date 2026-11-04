extends Node3D
class_name VillageWorld

signal exit_to_title

var env: Environment
var sun: DirectionalLight3D
var moon2: MeshInstance3D
var tree_detail: MultiMeshInstance3D
var tree_far: MultiMeshInstance3D
var grass_mm: MultiMeshInstance3D
var lamp_lights: Array = []
var gate_block: StaticBody3D
var gate_mist: MeshInstance3D
var placed_root: Node3D
var spawned := 0
var ghost: Node3D
var ghost_ok := true
var dream := true
var player: CharacterBody3D

func _ready() -> void:
	_environment()
	_floor()
	_bounds()
	_roads()
	_houses()
	_landmarks()
	_stations_nodes()
	_people()
	_nature()
	_echoes()
	_final_area()
	placed_root = Node3D.new()
	placed_root.name = "Placed"
	add_child(placed_root)
	_sync_placed()
	player = load("res://scripts/player/player.gd").new()
	add_child(player)
	var ui = load("res://scripts/ui/interface.gd").new()
	ui.exit_to_title.connect(func(): exit_to_title.emit())
	add_child(ui)
	if not Settings.graphics_changed.is_connected(_on_graphics):
		Settings.graphics_changed.connect(_on_graphics)
	apply_graphics()
	if str(GameState.data.get("phase", "dream")) == "woke":
		apply_wake()

func _on_graphics(_flags: Dictionary) -> void:
	apply_graphics()

func _environment() -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var mat := ProceduralSkyMaterial.new()
	mat.sky_top_color = Color(0.45, 0.52, 0.78)
	mat.sky_horizon_color = Color(0.95, 0.72, 0.58)
	mat.ground_horizon_color = Color(0.55, 0.48, 0.38)
	mat.ground_bottom_color = Color(0.28, 0.24, 0.2)
	mat.sun_angle_max = 32.0
	sky.sky_material = mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.72, 0.68, 0.62)
	env.ambient_light_energy = 0.62
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color(0.82, 0.74, 0.78)
	env.fog_density = 0.012
	env.fog_aerial_perspective = 0.35
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-46, 38, 0)
	sun.light_color = Color(1.0, 0.9, 0.74)
	sun.light_energy = 1.25
	sun.shadow_bias = 0.05
	sun.shadow_normal_bias = 1.2
	sun.light_volumetric_fog_energy = 1.0
	add_child(sun)
	moon2 = MeshInstance3D.new()
	moon2.mesh = MeshLib.sphere(2.4)
	var mm := MeshLib.mat("f4efe6")
	mm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	moon2.material_override = mm
	moon2.position = Vector3(40, 48, -10)
	moon2.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(moon2)

func _floor() -> void:
	var body := StaticBody3D.new()
	body.collision_layer = 1
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	var plane := WorldBoundaryShape3D.new()
	plane.plane = Plane(Vector3.UP, 0)
	shape.shape = plane
	body.add_child(shape)
	add_child(body)
	var visual := MeshInstance3D.new()
	visual.mesh = MeshLib.box(220, 0.4, 240)
	visual.position = Vector3(70, -0.2, 80)
	visual.material_override = MeshLib.ground_mat("6a8f48", "ground", 0.08)
	visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(visual)

func _bounds() -> void:
	var b: Dictionary = ContentDB.layout.get("bounds", {})
	var min_x := float(b.get("min_x", -4))
	var max_x := float(b.get("max_x", 148))
	var min_z := float(b.get("min_z", -16))
	var max_z := float(b.get("max_z", 184))
	_wall((min_x + max_x) * 0.5, min_z, max_x - min_x + 4.0, 1.2)
	_wall((min_x + max_x) * 0.5, max_z, max_x - min_x + 4.0, 1.2)
	_wall(min_x, (min_z + max_z) * 0.5, 1.2, max_z - min_z + 4.0)
	_wall(max_x, (min_z + max_z) * 0.5, 1.2, max_z - min_z + 4.0)

func _wall(x: float, z: float, w: float, d: float) -> void:
	var body := StaticBody3D.new()
	body.collision_layer = 1
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(w, 5.0, d)
	shape.shape = box
	shape.position = Vector3(0, 2.5, 0)
	body.add_child(shape)
	body.position = Vector3(x, 0, z)
	add_child(body)

func _roads() -> void:
	var roads: Dictionary = ContentDB.layout.get("roads", {})
	MeshLib.paint_tiles(self, roads.get("stone", []), 0.03, Vector3(2.15, 0.04, 2.15), MeshLib.ground_mat("cbb892", "mud", 0.35))
	MeshLib.paint_tiles(self, roads.get("dirt", []), 0.035, Vector3(1.9, 0.04, 1.9), MeshLib.ground_mat("8a6244", "mud", 0.4))

func _houses() -> void:
	var walls := [Color("d2c2a0"), Color("c4a574"), Color("b08968"), Color("e6d4b4"), Color("a68462")]
	for h in ContentDB.layout.get("houses", []):
		var at: Array = h.get("at", [0, 0])
		var style := int(h.get("style", 0)) % walls.size()
		var node := Node3D.new()
		node.position = Vector3(float(at[0]), 0, float(at[1]))
		var wall_m := StandardMaterial3D.new()
		wall_m.albedo_color = walls[style]
		wall_m.albedo_texture = MeshLib.tex("plaster")
		wall_m.roughness = 0.9
		wall_m.uv1_scale = Vector3(0.4, 0.4, 0.4)
		wall_m.uv1_triplanar = true
		MeshLib.part(node, MeshLib.box(2.6, 2.3, 2.3), wall_m, Vector3(0, 1.15, 0))
		MeshLib.part(node, MeshLib.box(2.9, 0.28, 2.6), MeshLib.ground_mat("7a3e28", "wood", 0.5), Vector3(0, 2.4, 0))
		MeshLib.part(node, MeshLib.box(0.55, 0.9, 0.08), MeshLib.mat("4a3428"), Vector3(0, 0.55, -1.16))
		var body := StaticBody3D.new()
		body.collision_layer = 1
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(2.6, 2.3, 2.3)
		shape.shape = box
		shape.position = Vector3(0, 1.15, 0)
		body.add_child(shape)
		node.add_child(body)
		add_child(node)

func _landmarks() -> void:
	var mosque: Dictionary = ContentDB.spot("mosque")
	var m := Node3D.new()
	m.position = Vector3(float(mosque.get("x", 43)), 0, float(mosque.get("z", 72)))
	var plaster := MeshLib.ground_mat("e6d8c4", "plaster", 0.3)
	MeshLib.part(m, MeshLib.box(8.0, 3.2, 6.5), plaster, Vector3(0, 1.6, 0))
	MeshLib.part(m, MeshLib.sphere(2.1), plaster, Vector3(0, 4.0, 0))
	MeshLib.part(m, MeshLib.box(1.1, 5.5, 1.1), plaster, Vector3(-3.2, 2.7, -2.4))
	var body := StaticBody3D.new()
	body.collision_layer = 1
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(8, 3.2, 6.5)
	shape.shape = box
	shape.position = Vector3(0, 1.6, 0)
	body.add_child(shape)
	m.add_child(body)
	add_child(m)
	var spring: Dictionary = ContentDB.spot("spring")
	var pool := MeshInstance3D.new()
	pool.mesh = MeshLib.cyl(2.4, 0.08)
	var water := MeshLib.mat("6a8f96", 0.25, 0.05)
	water.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	water.albedo_color.a = 0.78
	pool.material_override = water
	pool.position = Vector3(float(spring.get("x", 67)), 0.06, float(spring.get("z", 29)))
	add_child(pool)
	for i in 5:
		var wisp := MeshInstance3D.new()
		wisp.mesh = MeshLib.sphere(0.35)
		var wm := MeshLib.mat("e8e4f4")
		wm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		wm.albedo_color = Color(0.9, 0.88, 0.95, 0.28)
		wm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		wisp.material_override = wm
		wisp.position = pool.position + Vector3(sin(i) * 1.6, 0.8 + i * 0.15, cos(i) * 1.4)
		wisp.set_meta("base", wisp.position)
		wisp.add_to_group("wisp")
		add_child(wisp)

func _stations_nodes() -> void:
	for s in ContentDB.layout.get("stations", []):
		var n = load("res://scripts/world/interactable.gd").new()
		n.configure({"kind": "station", "id": s["id"], "station": s["kind"], "at": s["at"]})
		add_child(n)
	for defn in ContentDB.layout.get("nodes", []):
		var n = load("res://scripts/world/interactable.gd").new()
		n.configure(defn)
		add_child(n)
	for defn in ContentDB.layout.get("runes", []):
		var n = load("res://scripts/world/interactable.gd").new()
		var d: Dictionary = defn.duplicate()
		d["kind"] = "rune"
		n.configure(d)
		add_child(n)
	for defn in ContentDB.layout.get("notes", []):
		var n = load("res://scripts/world/interactable.gd").new()
		var d := {"kind": "note", "id": defn["id"], "at": defn["at"]}
		n.configure(d)
		add_child(n)

func _people() -> void:
	var loop: Array = ContentDB.layout.get("walk_loop", [])
	var by_id := {}
	for entry in ContentDB.layout.get("npcs", []):
		by_id[str(entry.get("id", ""))] = entry
	for id in ContentDB.npc_order:
		var v = load("res://scripts/npc/villager.gd").new()
		v.setup(ContentDB.npc(id), by_id.get(id, {}), loop)
		add_child(v)
	for i in 4:
		var sheep := MeshInstance3D.new()
		sheep.mesh = MeshLib.box(0.55, 0.4, 0.85)
		sheep.material_override = MeshLib.mat("f4f1ea")
		sheep.position = Vector3(52 + i * 1.1, 0.3, 30 + (i % 2))
		add_child(sheep)

func _nature() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 1407
	var positions: Array = []
	var houses: Array = ContentDB.layout.get("houses", [])
	var guard := 0
	while positions.size() < 240 and guard < 4000:
		guard += 1
		var x := rng.randf_range(2.0, 140.0)
		var z := rng.randf_range(16.0, 170.0)
		var ok := true
		for h in houses:
			var at: Array = h.get("at", [0, 0])
			if Vector2(x, z).distance_to(Vector2(float(at[0]), float(at[1]))) < 3.2:
				ok = false
				break
		if ok:
			positions.append(Vector3(x, 0, z))
	tree_detail = _tree_mesh(positions, true)
	tree_far = _tree_mesh(positions, false)
	add_child(tree_detail)
	add_child(tree_far)
	var grass_pos: Array = []
	for i in 640:
		grass_pos.append(Vector3(rng.randf_range(4, 136), 0.15, rng.randf_range(18, 168)))
	grass_mm = _grass(grass_pos)
	add_child(grass_mm)
	for i in 8:
		var lamp := OmniLight3D.new()
		lamp.position = positions[i * 12] + Vector3(0, 2.2, 0)
		lamp.light_color = Color(1.0, 0.82, 0.55)
		lamp.light_energy = 0.0
		lamp.omni_range = 7.0
		lamp.shadow_enabled = false
		add_child(lamp)
		lamp_lights.append(lamp)

func _tree_mesh(positions: Array, detailed: bool) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.cyl(0.12, 1.4) if not detailed else MeshLib.sphere(0.7)
	mm.instance_count = positions.size()
	for i in positions.size():
		var p: Vector3 = positions[i]
		var y := 1.5 if detailed else 0.7
		var s := 1.0 if detailed else Vector3(1, 1.4, 1)
		var xf := Transform3D(Basis.IDENTITY, Vector3(p.x, y, p.z))
		if not detailed:
			xf = Transform3D(Basis().scaled(Vector3(0.18, 1.5, 0.18)), Vector3(p.x, 0.75, p.z))
		mm.set_instance_transform(i, xf)
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.mat("2f7a32") if detailed else MeshLib.mat("6b4226")
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	return inst

func _grass(positions: Array) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.box(0.18, 0.35, 0.18)
	mm.instance_count = positions.size()
	for i in positions.size():
		var p: Vector3 = positions[i]
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, p))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.mat("4e9a3a")
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	return inst

func _echoes() -> void:
	for spot in ContentDB.layout.get("echoes", []):
		var root := Node3D.new()
		root.position = Vector3(float(spot.get("x", 0)), 0, float(spot.get("z", 0)))
		var trunk := MeshLib.part(root, MeshLib.cyl(0.1, 1.6), MeshLib.mat("5a3a28"), Vector3(0.2, 0.8, 0))
		trunk.rotation.z = 0.25
		MeshLib.part(root, MeshLib.sphere(0.45), MeshLib.mat("2f7a32"), Vector3(0.45, 1.5, 0))
		MeshLib.part(root, MeshLib.cyl(0.08, 0.16), MeshLib.mat("3d5a86"), Vector3(-0.4, 0.12, 0.2))
		MeshLib.part(root, MeshLib.box(0.7, 0.22, 0.28), MeshLib.mat("c4a574"), Vector3(-0.2, 0.12, -0.45))
		add_child(root)

func _final_area() -> void:
	var altar: Dictionary = ContentDB.spot("altar")
	var n = load("res://scripts/world/interactable.gd").new()
	n.configure({"kind": "altar", "id": "altar", "at": [altar.get("x", 67), altar.get("z", -4)]})
	add_child(n)
	var crystal := MeshInstance3D.new()
	crystal.mesh = MeshLib.sphere(0.22)
	var cm := MeshLib.mat("d8ecff")
	cm.emission_enabled = true
	cm.emission = Color("c8e4ff")
	cm.emission_energy_multiplier = 1.4
	crystal.material_override = cm
	crystal.position = Vector3(float(altar.get("x", 67)) + 1.2, 0.7, float(altar.get("z", -4)))
	add_child(crystal)
	for i in 6:
		var ang := float(i) / 6.0 * TAU
		var tree := MeshInstance3D.new()
		tree.mesh = MeshLib.cyl(0.1, 1.8)
		tree.material_override = MeshLib.mat("6b4226")
		tree.position = Vector3(float(altar.get("x", 67)) + cos(ang) * 4.5, 0.9, float(altar.get("z", -4)) + sin(ang) * 4.5)
		add_child(tree)
	var gate: Dictionary = ContentDB.spot("gate")
	gate_block = StaticBody3D.new()
	gate_block.collision_layer = 1
	gate_block.position = Vector3(float(gate.get("x", 67)), 0, float(gate.get("z", 12)))
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(28, 3.2, 0.6)
	shape.shape = box
	shape.position = Vector3(0, 1.6, 0)
	gate_block.add_child(shape)
	add_child(gate_block)
	gate_mist = MeshInstance3D.new()
	gate_mist.mesh = MeshLib.box(28, 3.0, 0.2)
	var mist := MeshLib.mat("e4e0f0")
	mist.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mist.albedo_color = Color(0.9, 0.88, 0.95, 0.35)
	gate_mist.material_override = mist
	gate_mist.position = gate_block.position + Vector3(0, 1.5, 0)
	add_child(gate_mist)
	var area := Area3D.new()
	area.position = gate_block.position + Vector3(0, 1, 2.2)
	var ason := CollisionShape3D.new()
	var abox := BoxShape3D.new()
	abox.size = Vector3(8, 2, 3)
	ason.shape = abox
	area.add_child(ason)
	area.body_entered.connect(_on_gate_touch)
	area.collision_mask = 2
	area.monitoring = true
	add_child(area)
	for hook in ContentDB.layout.get("puzzle_hooks", []):
		var zone := Area3D.new()
		zone.position = Vector3(float(hook.get("x", 0)), 1, float(hook.get("z", 0)))
		var zs := CollisionShape3D.new()
		var sph := SphereShape3D.new()
		sph.radius = float(hook.get("radius", 2))
		zs.shape = sph
		zone.add_child(zs)
		zone.collision_mask = 2
		var hid := str(hook.get("id", "hook"))
		zone.body_entered.connect(func(_b): GameState.fire_puzzle(hid, {}))
		add_child(zone)

func _on_gate_touch(body: Node) -> void:
	if body == null or not body.is_in_group("player"):
		return
	if bool(GameState.data.get("gate_open", false)):
		return
	var names: Array = GameState.missing_deeds()
	GameState.say_thought("The mist is still shut. Still unfinished: " + ", ".join(names))

func apply_graphics() -> void:
	var f: Dictionary = Settings.current_flags()
	if env == null:
		return
	var haze := 1.0 if dream else 0.45
	env.fog_enabled = true
	env.fog_density = float(f.get("fog_density", 0.012)) * haze
	env.fog_light_color = Color(0.82, 0.74, 0.78) if dream else Color(0.7, 0.7, 0.68)
	var forward := RenderingServer.get_current_rendering_method() == "forward_plus"
	env.sdfgi_enabled = bool(f.get("sdfgi", false)) and forward and dream
	env.sdfgi_cascades = int(f.get("sdfgi_cascades", 4))
	env.sdfgi_min_cell_size = float(f.get("sdfgi_cell", 1.0))
	env.sdfgi_use_occlusion = true
	env.sdfgi_energy = 0.7
	env.ssao_enabled = bool(f.get("ssao", false)) and forward
	env.ssao_radius = 1.1
	env.ssao_intensity = 1.15
	env.ssr_enabled = bool(f.get("ssr", false)) and forward
	env.ssr_max_steps = int(f.get("ssr_steps", 32))
	env.volumetric_fog_enabled = bool(f.get("volumetric_fog", false)) and forward and dream
	env.volumetric_fog_density = float(f.get("vol_density", 0.0))
	env.volumetric_fog_albedo = Color(0.75, 0.7, 0.8)
	env.volumetric_fog_length = minf(float(f.get("view", 80.0)), 80.0)
	env.glow_enabled = bool(f.get("glow", false)) and forward
	env.glow_intensity = 0.25
	env.glow_bloom = 0.12
	if sun:
		sun.shadow_enabled = bool(f.get("shadows", false))
		sun.directional_shadow_max_distance = float(f.get("shadow_distance", 36))
		var splits := int(f.get("shadow_splits", 1))
		if splits >= 4:
			sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
		elif splits >= 2:
			sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
		else:
			sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
		RenderingServer.directional_shadow_atlas_set_size(int(f.get("shadow_size", 2048)), true)
	var trees := int(f.get("trees", 90))
	var view := float(f.get("view", 85))
	if tree_detail and tree_detail.multimesh:
		tree_detail.multimesh.visible_instance_count = mini(trees, tree_detail.multimesh.instance_count)
		tree_detail.visibility_range_begin = 0.0
		tree_detail.visibility_range_end = float(f.get("lod_full", 24))
		tree_detail.visibility_range_end_margin = 4.0
		tree_detail.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if bool(f.get("foliage_shadows", false)) else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if tree_far and tree_far.multimesh:
		tree_far.multimesh.visible_instance_count = mini(trees, tree_far.multimesh.instance_count)
		tree_far.visibility_range_begin = maxf(float(f.get("lod_full", 24)) - 4.0, 0.0)
		tree_far.visibility_range_begin_margin = 4.0
		tree_far.visibility_range_end = view
		tree_far.visibility_range_end_margin = 6.0
	if grass_mm and grass_mm.multimesh:
		grass_mm.multimesh.visible_instance_count = mini(int(f.get("grass", 0)), grass_mm.multimesh.instance_count)
		grass_mm.visibility_range_end = float(f.get("grass_range", 28))
		grass_mm.visibility_range_end_margin = 4.0
	var lamps := int(f.get("lamps", 0))
	for i in lamp_lights.size():
		(lamp_lights[i] as OmniLight3D).light_energy = 0.8 if i < lamps else 0.0

func apply_wake() -> void:
	dream = false
	if moon2:
		moon2.visible = false
	for w in get_tree().get_nodes_in_group("wisp"):
		w.visible = false
	if env:
		env.adjustment_enabled = true
		env.adjustment_saturation = 0.55
		env.adjustment_contrast = 1.18
		env.ambient_light_color = Color(0.62, 0.64, 0.66)
		env.volumetric_fog_enabled = false
		env.sdfgi_enabled = false
	if sun:
		sun.light_color = Color(0.82, 0.84, 0.86)
		sun.light_energy = 1.45
	for v in get_tree().get_nodes_in_group("villager"):
		v.visible = false
	apply_graphics()

func _process(delta: float) -> void:
	_sync_placed()
	if bool(GameState.data.get("gate_open", false)) and is_instance_valid(gate_block):
		gate_block.queue_free()
		gate_block = null
		if is_instance_valid(gate_mist):
			gate_mist.queue_free()
			gate_mist = null
	var t := Time.get_ticks_msec() / 1000.0
	for w in get_tree().get_nodes_in_group("wisp"):
		if w is Node3D and w.has_meta("base"):
			var base: Vector3 = w.get_meta("base")
			(w as Node3D).position = base + Vector3(sin(t + base.x) * 0.3, sin(t * 0.7) * 0.15, 0)
	_ghost()
	if player and str(GameState.data.get("phase", "")) == "dream":
		GameState.data["play_time"] = float(GameState.data.get("play_time", 0.0)) + delta
		if int(GameState.data["play_time"]) % 45 == 0 and delta > 0.0:
			pass
	if player and fmod(float(GameState.data.get("play_time", 0.0)), 45.0) < delta:
		GameState.autosave()

func _sync_placed() -> void:
	var placed: Array = GameState.data.get("placed", [])
	while spawned < placed.size():
		var p: Dictionary = placed[spawned]
		var node := Pieces.make(str(p.get("what", "stool")))
		node.position = Vector3(float(p.get("x", 0)), 0, float(p.get("z", 0)))
		node.rotation.y = float(p.get("yaw", 0))
		if str(p.get("source", "")) == "build":
			var body := StaticBody3D.new()
			body.collision_layer = 1
			var shape := CollisionShape3D.new()
			var box := BoxShape3D.new()
			box.size = Vector3(1.4, 1.2, 0.4)
			shape.shape = box
			shape.position = Vector3(0, 0.6, 0)
			body.add_child(shape)
			node.add_child(body)
		placed_root.add_child(node)
		spawned += 1

func _ghost() -> void:
	if player == null or not player.get("build_mode"):
		if is_instance_valid(ghost):
			ghost.queue_free()
			ghost = null
		return
	var info: Dictionary = player.ghost_transform()
	var id := str(player.build_id)
	var ok := bool(info.get("ok", false))
	if ghost == null or ghost.name != "ghost_" + id or ok != ghost_ok:
		if is_instance_valid(ghost):
			ghost.queue_free()
		ghost = Pieces.ghost(id, ok)
		ghost.name = "ghost_" + id
		add_child(ghost)
		ghost_ok = ok
	ghost.position = info["pos"]
	ghost.rotation.y = float(info["yaw"])
