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
var _sky_mat: ProceduralSkyMaterial

func _ready() -> void:
	_environment()
	_floor()
	_bounds()
	_roads()
	_houses()
	_landmarks()
	_stations_nodes()
	_bake_nav()
	_people()
	if not OS.has_feature("headless"):
		_nature()
		_horizon()
		_echoes()
		_final_area()
		_life()
		_ruins()
		_growth()
	placed_root = Node3D.new()
	placed_root.name = "Placed"
	add_child(placed_root)
	_sync_placed()
	var bed = load("res://scripts/world/ambience.gd").new()
	add_child(bed)
	player = load("res://scripts/player/player.gd").new()
	add_child(player)
	var ui = load("res://scripts/ui/interface.gd").new()
	ui.exit_to_title.connect(func(): exit_to_title.emit())
	add_child(ui)
	if not Settings.graphics_changed.is_connected(_on_graphics):
		Settings.graphics_changed.connect(_on_graphics)
	var life = load("res://scripts/world/life_world.gd").new()
	add_child(life)
	life.bind(self, sun, env, _sky_mat)
	if OS.has_feature("headless"):
		_hide_draw(self)
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
	_sky_mat = mat
	mat.sky_top_color = Color(0.45, 0.62, 0.86)
	mat.sky_horizon_color = Color(0.98, 0.72, 0.46)
	mat.ground_horizon_color = Color(0.72, 0.58, 0.4)
	mat.ground_bottom_color = Color(0.36, 0.3, 0.22)
	mat.sky_curve = 0.08
	mat.sun_angle_max = 32.0
	sky.sky_material = mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.86, 0.72, 0.56)
	env.ambient_light_energy = 0.7
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color(0.78, 0.74, 0.7)
	env.fog_density = 0.0004
	env.fog_aerial_perspective = 0.04
	env.fog_sky_affect = 0.12
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-22, 52, 0)
	sun.light_color = Color(1.0, 0.74, 0.46)
	sun.light_energy = 1.45
	sun.shadow_bias = 0.08
	sun.shadow_normal_bias = 2.0
	sun.shadow_blur = 1.1
	sun.directional_shadow_blend_splits = true
	sun.directional_shadow_fade_start = 0.65
	sun.directional_shadow_pancake_size = 40.0
	sun.light_volumetric_fog_energy = 1.0
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-18, -140, 0)
	fill.light_color = Color(0.72, 0.8, 0.92)
	fill.light_energy = 0.28
	fill.shadow_enabled = false
	add_child(fill)
	moon2 = MeshInstance3D.new()
	moon2.mesh = MeshLib.sphere(2.4)
	var mm := MeshLib.mat("f4efe6")
	mm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	moon2.material_override = mm
	moon2.position = Vector3(40, 48, -10)
	moon2.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	moon2.add_to_group("dream_only")
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
	var slab := StaticBody3D.new()
	slab.collision_layer = 1
	var slab_shape := CollisionShape3D.new()
	var slab_box := BoxShape3D.new()
	slab_box.size = Vector3(220, 1.0, 240)
	slab_shape.shape = slab_box
	slab_shape.position = Vector3(70, -0.5, 80)
	slab.add_child(slab_shape)
	add_child(slab)
	var visual := MeshInstance3D.new()
	visual.mesh = MeshLib.box(220, 0.4, 240)
	visual.position = Vector3(70, -0.2, 80)
	visual.material_override = MeshLib.ground_mat("8aaa58", "ground", 9.0)
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
	var cobble: Array = roads.get("stone", [])
	var dirt: Array = roads.get("dirt", [])
	MeshLib.paint_tiles(self, dirt, 0.008, Vector3(2.7, 0.012, 2.7), MeshLib.path_mat("6f8a4e"))
	MeshLib.paint_tiles(self, cobble, 0.008, Vector3(2.55, 0.012, 2.55), MeshLib.path_mat("7d8a52"))
	MeshLib.paint_tiles(self, dirt, 0.02, Vector3(2.15, 0.016, 2.15), MeshLib.path_mat("8d6844"))
	MeshLib.paint_tiles(self, cobble, 0.028, Vector3(2.05, 0.018, 2.05), MeshLib.path_mat("b7a48a"))

func _houses() -> void:
	for h in ContentDB.layout.get("houses", []):
		var at: Array = h.get("at", [0, 0])
		var style := int(h.get("style", 0))
		var node := make_house(style)
		node.position = Vector3(float(at[0]), 0, float(at[1]))
		add_child(node)
		node.look_at(_lane_point(float(at[0]), float(at[1])), Vector3.UP)
		var block := node.get_node_or_null("HouseBlock")
		if block:
			var hx := float(at[0])
			var hz := float(at[1])
			block.set_meta("min_xz", Vector2(hx - 2.15, hz - 2.15))
			block.set_meta("max_xz", Vector2(hx + 2.15, hz + 2.15))

static func make_house(style: int) -> Node3D:
	var node := Node3D.new()
	var walls := [Color("d2c2a0"), Color("c4a574"), Color("b08968"), Color("e6d4b4"), Color("a68462")]
	var tint: Color = walls[style % walls.size()]
	var wall_m := StandardMaterial3D.new()
	wall_m.albedo_color = tint
	wall_m.albedo_texture = MeshLib.tex("rock")
	wall_m.roughness = 0.94
	wall_m.uv1_scale = Vector3(0.55, 0.55, 0.55)
	wall_m.uv1_triplanar = true
	wall_m.cull_mode = BaseMaterial3D.CULL_DISABLED
	var wall := MeshLib.part(node, MeshLib.box(2.6, 2.15, 2.4), wall_m, Vector3(0, 1.2, 0))
	wall.add_to_group("house_wall")
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var stone := Color("9a9088")
	var timber := Color("6b4226")
	var earth := Color("8a6848")
	var door := Color("4a3428")
	_add_box(st, Vector3(3.05, 0.28, 2.85), Vector3(0, 0.14, 0), stone)
	_add_box(st, Vector3(2.95, 0.1, 2.75), Vector3(0, 2.32, 0), timber)
	_add_box(st, Vector3(3.25, 0.16, 3.05), Vector3(0, 2.46, 0), earth)
	_add_box(st, Vector3(0.1, 0.16, 3.35), Vector3(-1.45, 2.46, 0), timber)
	_add_box(st, Vector3(0.1, 0.16, 3.35), Vector3(1.45, 2.46, 0), timber)
	_add_box(st, Vector3(3.35, 0.16, 0.1), Vector3(0, 2.46, -1.4), timber)
	_add_box(st, Vector3(3.35, 0.16, 0.1), Vector3(0, 2.46, 1.4), timber)
	_add_box(st, Vector3(0.72, 1.2, 0.08), Vector3(0, 0.6, -1.28), door)
	_add_box(st, Vector3(0.1, 1.28, 0.1), Vector3(-0.42, 0.64, -1.32), timber)
	_add_box(st, Vector3(0.1, 1.28, 0.1), Vector3(0.42, 0.64, -1.32), timber)
	_add_box(st, Vector3(0.94, 0.1, 0.1), Vector3(0, 1.24, -1.32), timber)
	_add_box(st, Vector3(0.5, 0.42, 0.06), Vector3(0.82, 1.35, -1.28), Color("c4a574"))
	_add_box(st, Vector3(0.62, 0.08, 0.08), Vector3(0.82, 1.12, -1.32), timber)
	_add_box(st, Vector3(0.08, 0.5, 0.08), Vector3(0.56, 1.35, -1.32), timber)
	_add_box(st, Vector3(0.08, 0.5, 0.08), Vector3(1.08, 1.35, -1.32), timber)
	_add_box(st, Vector3(1.15, 0.1, 0.5), Vector3(0, 0.05, -1.6), stone)
	_add_box(st, Vector3(0.9, 0.1, 0.38), Vector3(0, 0.14, -1.85), stone)
	if style % 2 == 0:
		_add_box(st, Vector3(0.22, 0.7, 2.2), Vector3(1.7, 0.35, 0.2), stone)
	else:
		_add_box(st, Vector3(1.6, 0.55, 0.2), Vector3(-0.3, 0.28, 1.45), stone)
	if style % 3 == 0:
		var rust := Color("7a4e3a")
		_add_box(st, Vector3(0.46, 0.46, 0.05), Vector3(0.2, 1.2, -1.3), rust)
	if style % 4 == 0:
		var rug := MeshInstance3D.new()
		rug.name = "DoorRug"
		rug.mesh = MeshLib.box(0.7, 0.015, 0.45)
		rug.material_override = MeshLib.kilim_mat()
		rug.position = Vector3(0, 0.02, -1.45)
		rug.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.add_child(rug)
	elif style % 4 == 1:
		_add_box(st, Vector3(0.04, 0.45, 0.35), Vector3(1.72, 0.85, 0.2), Color("8e2a2a"))
	var trim := MeshInstance3D.new()
	trim.mesh = st.commit()
	var flat := StandardMaterial3D.new()
	flat.vertex_color_use_as_albedo = true
	flat.roughness = 0.92
	trim.material_override = flat
	trim.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	node.add_child(trim)
	var body := StaticBody3D.new()
	body.name = "HouseBlock"
	body.collision_layer = 1
	body.add_to_group("house_block")
	body.set_meta("min_xz", Vector2(-2.15, -2.15))
	body.set_meta("max_xz", Vector2(2.15, 2.15))
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(2.9, 3.2, 2.9)
	shape.shape = box
	shape.position = Vector3(0, 1.05, 0)
	body.add_child(shape)
	node.add_child(body)
	return node

static func _add_box(st: SurfaceTool, size: Vector3, center: Vector3, color: Color) -> void:
	var hx := size.x * 0.5
	var hy := size.y * 0.5
	var hz := size.z * 0.5
	var p := [
		center + Vector3(-hx, -hy, -hz), center + Vector3(hx, -hy, -hz),
		center + Vector3(hx, hy, -hz), center + Vector3(-hx, hy, -hz),
		center + Vector3(-hx, -hy, hz), center + Vector3(hx, -hy, hz),
		center + Vector3(hx, hy, hz), center + Vector3(-hx, hy, hz),
	]
	var faces := [
		[0, 2, 1, 0, 3, 2], [4, 5, 6, 4, 6, 7],
		[0, 1, 5, 0, 5, 4], [3, 6, 2, 3, 7, 6],
		[0, 7, 3, 0, 4, 7], [1, 2, 6, 1, 6, 5],
	]
	for face in faces:
		var a: Vector3 = p[face[0]]
		var b: Vector3 = p[face[1]]
		var c: Vector3 = p[face[2]]
		var n := (b - a).cross(c - a).normalized()
		for idx in face:
			st.set_color(color)
			st.set_normal(n)
			st.add_vertex(p[idx])

func _lane_point(x: float, z: float) -> Vector3:
	var best := Vector3(x, 0, z - 3.0)
	var best_d := 6.0
	var roads: Dictionary = ContentDB.layout.get("roads", {})
	for key in ["stone", "dirt"]:
		for p in roads.get(key, []):
			var px := float(p[0])
			var pz := float(p[1])
			var d := Vector2(x, z).distance_to(Vector2(px, pz))
			if d > 1.4 and d < best_d:
				best_d = d
				best = Vector3(px, 0, pz)
	if best.distance_to(Vector3(x, 0, z)) < 0.2:
		best = Vector3(x, 0, z - 3.0)
	return best

func _landmarks() -> void:
	var mosque: Dictionary = ContentDB.spot("mosque")
	var m := Node3D.new()
	m.position = Vector3(float(mosque.get("x", 43)), 0, float(mosque.get("z", 72)))
	var plaster := MeshLib.ground_mat("e6d8c4", "plaster", 0.3)
	var timber := MeshLib.ground_mat("6b4226", "wood", 0.45)
	var earth := MeshLib.ground_mat("8a6848", "mud", 0.4)
	MeshLib.part(m, MeshLib.box(7.4, 2.5, 5.6), plaster, Vector3(0, 1.35, 0))
	MeshLib.part(m, MeshLib.box(7.8, 0.16, 6.0), earth, Vector3(0, 2.68, 0))
	MeshLib.part(m, MeshLib.box(0.14, 0.18, 6.3), timber, Vector3(-3.5, 2.68, 0))
	MeshLib.part(m, MeshLib.box(0.14, 0.18, 6.3), timber, Vector3(3.5, 2.68, 0))
	MeshLib.part(m, MeshLib.box(1.15, 4.4, 1.15), plaster, Vector3(-3.0, 2.2, -2.1))
	MeshLib.part(m, MeshLib.box(1.4, 0.16, 1.4), earth, Vector3(-3.0, 4.45, -2.1))
	MeshLib.part(m, MeshLib.box(0.9, 1.4, 0.08), timber, Vector3(0, 0.75, -2.9))
	var body := StaticBody3D.new()
	body.collision_layer = 1
	body.add_to_group("house_block")
	var mx := float(mosque.get("x", 43))
	var mz := float(mosque.get("z", 72))
	body.set_meta("min_xz", Vector2(mx - 4.4, mz - 3.7))
	body.set_meta("max_xz", Vector2(mx + 4.4, mz + 3.7))
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(8.4, 3.4, 7.0)
	shape.shape = box
	shape.position = Vector3(0, 1.5, 0)
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
		wisp.add_to_group("dream_only")
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

func _bake_nav() -> void:
	if OS.has_feature("headless") or OS.get_environment("WIP_SHOT") == "1":
		return
	var map := get_world_3d().navigation_map
	NavigationServer3D.map_set_cell_size(map, 1.0)
	NavigationServer3D.map_set_cell_height(map, 1.0)
	var region := NavigationRegion3D.new()
	var mesh := NavigationMesh.new()
	mesh.cell_size = 1.0
	mesh.cell_height = 1.0
	var b: Dictionary = ContentDB.layout.get("bounds", {})
	var min_x := float(b.get("min_x", -4)) + 1.0
	var max_x := float(b.get("max_x", 148)) - 1.0
	var min_z := float(b.get("min_z", -16)) + 1.0
	var max_z := float(b.get("max_z", 184)) - 1.0
	var step := 8.0
	var verts := PackedVector3Array()
	var polys: Array = []
	var x := min_x
	while x < max_x - 0.1:
		var z := min_z
		while z < max_z - 0.1:
			if not _nav_blocked(x + step * 0.5, z + step * 0.5, step * 0.55):
				var i0 := verts.size()
				verts.append(Vector3(x, 0.02, z))
				verts.append(Vector3(minf(x + step, max_x), 0.02, z))
				verts.append(Vector3(minf(x + step, max_x), 0.02, minf(z + step, max_z)))
				verts.append(Vector3(x, 0.02, minf(z + step, max_z)))
				polys.append(PackedInt32Array([i0, i0 + 3, i0 + 2]))
				polys.append(PackedInt32Array([i0, i0 + 2, i0 + 1]))
			z += step
		x += step
	mesh.vertices = verts
	for poly in polys:
		mesh.add_polygon(poly)
	region.navigation_mesh = mesh
	if not OS.has_feature("headless"):
		add_child(region)

func _nav_blocked(x: float, z: float, pad: float) -> bool:
	for h in get_tree().get_nodes_in_group("house_block"):
		var mn: Vector2 = h.get_meta("min_xz")
		var mx: Vector2 = h.get_meta("max_xz")
		if x > mn.x - pad and x < mx.x + pad and z > mn.y - pad and z < mx.y + pad:
			return true
	return false

func _people() -> void:
	var loop: Array = ContentDB.layout.get("walk_loop", [])
	var by_id := {}
	for entry in ContentDB.layout.get("npcs", []):
		by_id[str(entry.get("id", ""))] = entry
	var cap := 3 if OS.get_environment("WIP_SHOT") == "1" else ContentDB.npc_order.size()
	var spawned_people := 0
	for id in ContentDB.npc_order:
		if spawned_people >= cap:
			break
		spawned_people += 1
		var v = load("res://scripts/npc/villager.gd").new()
		add_child(v)
		v.setup(ContentDB.npc(id), by_id.get(id, {}), loop)
	for i in 4:
		var sheep := MeshInstance3D.new()
		sheep.mesh = MeshLib.box(0.55, 0.4, 0.85)
		sheep.material_override = MeshLib.mat("f4f1ea")
		sheep.position = Vector3(52 + i * 1.1, 0.2, 30 + (i % 2))
		sheep.add_to_group("ground_prop")
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
	var oaks: Array = []
	var almonds: Array = []
	var walnuts: Array = []
	for i in positions.size():
		var kind := i % 4
		if kind == 0:
			almonds.append(positions[i])
		elif kind == 1:
			walnuts.append(positions[i])
		else:
			oaks.append(positions[i])
	tree_detail = _foliage(oaks, "oak", true)
	tree_far = _foliage(oaks, "oak", false)
	add_child(tree_detail)
	add_child(tree_far)
	add_child(_foliage(almonds, "almond", true))
	add_child(_foliage(walnuts, "walnut", true))
	add_child(_foliage([Vector3(15, 0, 44)], "oak", true))
	add_child(_foliage([Vector3(22.5, 0, 46)], "almond", true))
	add_child(_foliage([Vector3(19, 0, 41.5)], "walnut", true))
	var grass_pos: Array = []
	var rock_pos: Array = []
	for i in 640:
		grass_pos.append(Vector3(rng.randf_range(4, 136), 0.12, rng.randf_range(18, 168)))
		if i % 8 == 0:
			rock_pos.append(Vector3(rng.randf_range(4, 136), 0.08, rng.randf_range(18, 168)))
	grass_mm = _grass(grass_pos)
	add_child(grass_mm)
	add_child(_rocks(rock_pos))
	for i in 8:
		var lamp := OmniLight3D.new()
		lamp.position = positions[i * 12] + Vector3(0, 2.2, 0)
		lamp.light_color = Color(1.0, 0.82, 0.55)
		lamp.light_energy = 0.0
		lamp.omni_range = 7.0
		lamp.shadow_enabled = false
		add_child(lamp)
		lamp_lights.append(lamp)

func _foliage(positions: Array, kind: String, detailed: bool) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = _impostor_mesh() if not detailed else _tree_shape(kind, true)
	mm.instance_count = positions.size()
	for i in positions.size():
		var p: Vector3 = positions[i]
		var yaw := sin(p.x * 0.2 + p.z * 0.13) * 0.6
		mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw), Vector3(p.x, 0.0, p.z)))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	if detailed:
		var leaf := StandardMaterial3D.new()
		leaf.vertex_color_use_as_albedo = true
		leaf.roughness = 0.92
		inst.material_override = leaf
	else:
		inst.material_override = MeshLib.impostor_mat()
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	if not detailed:
		inst.visibility_range_begin = 18.0
	else:
		inst.visibility_range_end = 42.0
		inst.visibility_range_end_margin = 6.0
	return inst

func _impostor_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for turn in 2:
		var basis := Basis(Vector3.UP, float(turn) * PI * 0.5)
		var corners := [Vector3(-1.5, 0.0, 0), Vector3(1.5, 0.0, 0), Vector3(1.5, 2.8, 0), Vector3(-1.5, 2.8, 0)]
		var uvs := [Vector2(0, 1), Vector2(1, 1), Vector2(1, 0), Vector2(0, 0)]
		var normal := basis * Vector3(0, 0, 1)
		for corner in [0, 1, 2, 0, 2, 3]:
			st.set_uv(uvs[corner])
			st.set_normal(normal)
			st.add_vertex(basis * corners[corner])
	return st.commit()

func _tree_shape(kind: String, _detailed: bool) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var bark := Color("5a3a28")
	if kind == "almond":
		_add_cylinder(st, Vector3(0, 1.05, 0), 0.06, 2.1, Color("6a4a32"))
		_add_branch(st, Vector3(0, 1.3, 0), Vector3(0.7, 2.15, 0.15), 0.03, bark)
		_add_branch(st, Vector3(0, 1.45, 0), Vector3(-0.65, 2.3, -0.2), 0.028, bark)
		_add_branch(st, Vector3(0, 1.15, 0), Vector3(0.15, 1.9, 0.6), 0.025, bark)
		_add_ellipsoid(st, Vector3(0.78, 2.3, 0.16), Vector3(0.22, 0.42, 0.16), Color("6a8f48"))
		_add_ellipsoid(st, Vector3(-0.7, 2.45, -0.18), Vector3(0.18, 0.38, 0.14), Color("7ea25a"))
		_add_ellipsoid(st, Vector3(0.12, 2.05, 0.62), Vector3(0.16, 0.28, 0.14), Color("f0c8d4"))
		_add_ellipsoid(st, Vector3(0.35, 2.55, -0.05), Vector3(0.14, 0.18, 0.12), Color("f4d0dc"))
		_add_ellipsoid(st, Vector3(-0.2, 1.85, 0.15), Vector3(0.12, 0.16, 0.1), Color("f7d6e0"))
	elif kind == "walnut":
		_add_cylinder(st, Vector3(0, 0.55, 0), 0.18, 1.1, Color("4a3020"))
		_add_branch(st, Vector3(0, 1.0, 0), Vector3(0.4, 1.45, 0.1), 0.07, bark)
		_add_branch(st, Vector3(0, 0.95, 0), Vector3(-0.38, 1.4, -0.08), 0.06, bark)
		_add_ellipsoid(st, Vector3(0.02, 1.7, 0.0), Vector3(0.95, 0.72, 0.9), Color("1a3e22"))
		_add_ellipsoid(st, Vector3(0.5, 1.45, 0.25), Vector3(0.55, 0.42, 0.5), Color("14361c"))
		_add_ellipsoid(st, Vector3(-0.48, 1.48, -0.2), Vector3(0.52, 0.4, 0.48), Color("214c2a"))
	else:
		_add_cylinder(st, Vector3(0, 0.7, 0), 0.2, 1.4, bark)
		_add_branch(st, Vector3(0, 1.25, 0), Vector3(1.8, 1.65, 0.25), 0.08, bark)
		_add_branch(st, Vector3(0, 1.2, 0), Vector3(-1.75, 1.6, -0.2), 0.075, bark)
		_add_branch(st, Vector3(0, 1.3, 0), Vector3(0.15, 1.7, -1.5), 0.06, bark)
		_add_ellipsoid(st, Vector3(1.9, 1.75, 0.3), Vector3(1.45, 0.28, 0.95), Color("2a5c2c"))
		_add_ellipsoid(st, Vector3(-1.85, 1.7, -0.2), Vector3(1.35, 0.26, 0.9), Color("34683a"))
		_add_ellipsoid(st, Vector3(0.1, 1.85, -1.6), Vector3(1.2, 0.24, 1.0), Color("245428"))
	return st.commit()

func _add_cylinder(st: SurfaceTool, center: Vector3, radius: float, height: float, color: Color) -> void:
	var sides := 8
	var y0 := center.y - height * 0.5
	var y1 := center.y + height * 0.5
	for s in sides:
		var a0 := float(s) / float(sides) * TAU
		var a1 := float(s + 1) / float(sides) * TAU
		var p0 := Vector3(cos(a0) * radius, 0, sin(a0) * radius)
		var p1 := Vector3(cos(a1) * radius, 0, sin(a1) * radius)
		var n := (p0 + p1).normalized()
		st.set_color(color)
		st.set_normal(n)
		st.add_vertex(center + Vector3(p0.x, y0 - center.y, p0.z))
		st.set_color(color)
		st.set_normal(n)
		st.add_vertex(center + Vector3(p0.x, y1 - center.y, p0.z))
		st.set_color(color)
		st.set_normal(n)
		st.add_vertex(center + Vector3(p1.x, y1 - center.y, p1.z))
		st.set_color(color)
		st.set_normal(n)
		st.add_vertex(center + Vector3(p0.x, y0 - center.y, p0.z))
		st.set_color(color)
		st.set_normal(n)
		st.add_vertex(center + Vector3(p1.x, y1 - center.y, p1.z))
		st.set_color(color)
		st.set_normal(n)
		st.add_vertex(center + Vector3(p1.x, y0 - center.y, p1.z))

func _add_branch(st: SurfaceTool, a: Vector3, b: Vector3, radius: float, color: Color) -> void:
	var axis := b - a
	var height := axis.length()
	if height < 0.001:
		return
	axis = axis / height
	var helper := Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.92 else Vector3.RIGHT
	var side := axis.cross(helper).normalized()
	var side2 := axis.cross(side).normalized()
	var sides := 6
	for s in sides:
		var a0 := float(s) / float(sides) * TAU
		var a1 := float(s + 1) / float(sides) * TAU
		var r0 := side * cos(a0) * radius + side2 * sin(a0) * radius
		var r1 := side * cos(a1) * radius + side2 * sin(a1) * radius
		var n := (r0 + r1).normalized()
		for p in [a + r0, b + r0, b + r1, a + r0, b + r1, a + r1]:
			st.set_color(color)
			st.set_normal(n)
			st.add_vertex(p)

func _add_ellipsoid(st: SurfaceTool, center: Vector3, radii: Vector3, color: Color) -> void:
	var rings := 5
	var sides := 7
	for r in rings:
		var v0 := float(r) / float(rings) * PI
		var v1 := float(r + 1) / float(rings) * PI
		for s in sides:
			var u0 := float(s) / float(sides) * TAU
			var u1 := float(s + 1) / float(sides) * TAU
			var pts: Array[Vector3] = []
			for v in [v0, v1]:
				for u in [u0, u1]:
					pts.append(center + Vector3(sin(v) * cos(u) * radii.x, cos(v) * radii.y, sin(v) * sin(u) * radii.z))
			var p00: Vector3 = pts[0]
			var p01: Vector3 = pts[1]
			var p10: Vector3 = pts[2]
			var p11: Vector3 = pts[3]
			for p in [p00, p10, p11, p00, p11, p01]:
				st.set_color(color)
				st.set_normal((Vector3(p.x - center.x, p.y - center.y, p.z - center.z)).normalized())
				st.add_vertex(p)

func _add_sphere(st: SurfaceTool, center: Vector3, radius: float, color: Color) -> void:
	var rings := 5
	var sides := 7
	for r in rings:
		var v0 := float(r) / float(rings) * PI
		var v1 := float(r + 1) / float(rings) * PI
		for s in sides:
			var u0 := float(s) / float(sides) * TAU
			var u1 := float(s + 1) / float(sides) * TAU
			var p00 := center + Vector3(sin(v0) * cos(u0), cos(v0), sin(v0) * sin(u0)) * radius
			var p10 := center + Vector3(sin(v1) * cos(u0), cos(v1), sin(v1) * sin(u0)) * radius
			var p11 := center + Vector3(sin(v1) * cos(u1), cos(v1), sin(v1) * sin(u1)) * radius
			var p01 := center + Vector3(sin(v0) * cos(u1), cos(v0), sin(v0) * sin(u1)) * radius
			for p in [p00, p10, p11, p00, p11, p01]:
				st.set_color(color)
				st.set_normal((p - center).normalized())
				st.add_vertex(p)

func _rocks(positions: Array) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = MeshLib.sphere(0.22)
	mm.instance_count = positions.size()
	for i in positions.size():
		var p: Vector3 = positions[i]
		mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3(1.2, 0.6, 1.0)), p))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = MeshLib.ground_mat("9a9088", "rock", 0.9)
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_end = 36.0
	return inst

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

func _clump_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var green := Color("4e9a3a")
	for i in 6:
		var ang := float(i) / 6.0 * TAU
		var base := Vector3(cos(ang) * 0.1, 0.0, sin(ang) * 0.1)
		var tip := base + Vector3(cos(ang) * 0.05, 0.26 + float(i % 2) * 0.08, sin(ang) * 0.05)
		var side := Vector3(-sin(ang), 0, cos(ang)) * 0.018
		var n := (tip - base).normalized()
		for p in [base - side, tip, base + side, base + side, tip, base - side]:
			st.set_color(green)
			st.set_normal(n)
			st.add_vertex(p)
	return st.commit()

func _horizon() -> void:
	var rock := MeshLib.ground_mat("9a8878", "rock", 0.08)
	var ridge := [Vector3(-20, 0, -70), Vector3(40, 0, -78), Vector3(110, 0, -64), Vector3(180, 0, -82)]
	for i in ridge.size():
		var at: Vector3 = ridge[i]
		for k in 3:
			var cone := CylinderMesh.new()
			var height := 70.0 - float(k) * 14.0 - float(i % 2) * 8.0
			cone.top_radius = 0.6
			cone.bottom_radius = 28.0 + float(k) * 6.0
			cone.height = height
			cone.radial_segments = 6
			var hill := MeshInstance3D.new()
			hill.mesh = cone
			hill.position = at + Vector3(float(k - 1) * 18.0, height * 0.15 - 24.0, float(k) * 6.0)
			hill.material_override = rock
			hill.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(hill)

func _grass(positions: Array) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = _clump_mesh()
	mm.instance_count = positions.size()
	for i in positions.size():
		var p: Vector3 = positions[i]
		var yaw := sin(p.x * 0.4 + p.z * 0.2) * 0.8
		mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw), Vector3(p.x, 0.0, p.z)))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	var blades := StandardMaterial3D.new()
	blades.vertex_color_use_as_albedo = true
	blades.roughness = 0.95
	inst.material_override = blades
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	return inst

func _echoes() -> void:
	for spot in ContentDB.layout.get("echoes", []):
		var root := Node3D.new()
		root.position = Vector3(float(spot.get("x", 0)), 0, float(spot.get("z", 0)))
		var trunk := MeshLib.part(root, MeshLib.cyl(0.1, 1.4), MeshLib.mat("5a3a28"), Vector3(0, 0.7, 0))
		trunk.rotation.z = 0.08
		var crown := MeshLib.part(root, MeshLib.sphere(0.55), MeshLib.mat("2f7a32"), Vector3(0.1, 1.55, 0))
		crown.scale = Vector3(1.5, 0.35, 1.2)
		root.add_to_group("dream_only")
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
	var haze := 0.22 if dream else 0.12
	env.fog_enabled = true
	var density := float(f.get("fog_density", 0.0016)) * haze
	if Settings.fog_mode == "off":
		density = 0.0
	elif Settings.fog_mode == "light":
		density *= 0.35
	density *= 0.65
	env.fog_density = density
	env.fog_sky_affect = 0.18
	env.fog_aerial_perspective = 0.08
	env.fog_light_color = Color(0.98, 0.72, 0.46) if dream else Color(0.7, 0.62, 0.52)
	env.fog_sun_scatter = 0.22
	env.ambient_light_color = Color(0.9, 0.74, 0.55)
	env.ambient_light_energy = 0.55 if bool(f.get("sdfgi", false)) else 0.95
	var forward := RenderingServer.get_current_rendering_method() == "forward_plus"
	env.sdfgi_enabled = bool(f.get("sdfgi", false)) and forward and dream
	env.sdfgi_cascades = int(f.get("sdfgi_cascades", 4))
	env.sdfgi_min_cell_size = float(f.get("sdfgi_cell", 1.0))
	env.sdfgi_use_occlusion = true
	env.sdfgi_energy = 0.7
	env.ssao_enabled = bool(f.get("ssao", false)) and forward
	env.ssao_radius = 1.1
	env.ssao_intensity = 1.15
	env.ssil_enabled = bool(f.get("ssil", false)) and forward
	env.ssil_radius = 3.5
	env.ssil_intensity = 0.8
	env.ssr_enabled = bool(f.get("ssr", false)) and forward
	env.ssr_max_steps = int(f.get("ssr_steps", 32))
	env.volumetric_fog_enabled = bool(f.get("volumetric_fog", false)) and forward and dream
	env.volumetric_fog_density = float(f.get("vol_density", 0.0))
	env.volumetric_fog_albedo = Color(0.95, 0.72, 0.48)
	env.volumetric_fog_length = minf(float(f.get("view", 80.0)), 80.0)
	env.glow_enabled = bool(f.get("glow", false)) and forward
	env.glow_intensity = 0.25
	env.glow_bloom = 0.12
	if sun:
		sun.shadow_enabled = bool(f.get("shadows", false))
		if Settings.shadows_mode == "off":
			sun.shadow_enabled = false
		elif Settings.shadows_mode == "on":
			sun.shadow_enabled = true
		sun.shadow_bias = 0.08
		sun.shadow_normal_bias = 2.0
		sun.shadow_blur = 1.1
		sun.directional_shadow_blend_splits = true
		sun.directional_shadow_fade_start = 0.65
		sun.directional_shadow_pancake_size = 40.0
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
	var view := float(f.get("view", 85)) * Settings.view_mul
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

func _life() -> void:
	for i in 6:
		var bird := MeshInstance3D.new()
		bird.mesh = MeshLib.sphere(0.06)
		bird.scale = Vector3(1.8, 0.28, 0.55)
		bird.material_override = MeshLib.mat("2a2420")
		bird.position = Vector3(30.0 + i * 8.0, 2.2, 40.0)
		bird.set_meta("i", i)
		bird.add_to_group("bird")
		add_child(bird)
	var tandoor: Dictionary = ContentDB.spot("tandoor")
	for i in 3:
		var puff := MeshInstance3D.new()
		puff.mesh = MeshLib.sphere(0.18)
		var sm := MeshLib.mat("d9d3cc")
		sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		sm.albedo_color = Color(0.85, 0.82, 0.78, 0.35)
		puff.material_override = sm
		puff.position = Vector3(float(tandoor.get("x", 58)), 1.2, float(tandoor.get("z", 77)))
		puff.set_meta("base", puff.position)
		puff.add_to_group("smoke")
		add_child(puff)
	var board = load("res://scripts/world/interactable.gd").new()
	var mosque: Dictionary = ContentDB.spot("mosque")
	board.configure({"kind": "board", "id": "quest_board", "at": [float(mosque.get("x", 43)) + 5.0, float(mosque.get("z", 72)) + 1.5]})
	add_child(board)
	var relic = load("res://scripts/world/interactable.gd").new()
	relic.configure({"kind": "relic", "id": "wind_relic", "at": [96.0, 48.0]})
	add_child(relic)

func _ruins() -> void:
	var root := Node3D.new()
	root.name = "Ruins"
	root.visible = false
	root.add_to_group("ruins")
	var rust := MeshLib.mat("6a3a2a", 0.72, 0.35)
	var iron := MeshLib.mat("4a4e52", 0.55, 0.45)
	var ash := MeshLib.mat("5c584e", 0.9)
	MeshLib.part(root, MeshLib.box(1.2, 6.5, 1.2), rust, Vector3(96, 2.2, 48))
	MeshLib.part(root, MeshLib.box(3.2, 0.35, 0.35), rust, Vector3(96, 4.6, 48))
	MeshLib.part(root, MeshLib.box(0.35, 0.35, 2.4), iron, Vector3(97.2, 3.2, 49))
	MeshLib.part(root, MeshLib.box(2.8, 0.9, 1.4), ash, Vector3(70, 0.4, 60))
	MeshLib.part(root, MeshLib.box(1.6, 0.4, 0.8), rust, Vector3(88, 0.3, 74))
	MeshLib.part(root, MeshLib.box(0.8, 2.4, 0.8), iron, Vector3(110, 1.2, 70))
	MeshLib.part(root, MeshLib.box(4.0, 0.25, 1.2), rust, Vector3(40, 0.2, 100))
	# Broken tower: stacked, slipped stones.
	for i in 5:
		var slip := Vector3(sin(i * 1.7) * 0.35, 0.55 + i * 0.7, cos(i) * 0.25)
		MeshLib.part(root, MeshLib.box(1.5 - i * 0.12, 0.62, 1.5 - i * 0.12), ash, Vector3(28, 0, 18) + slip)
	# Half-buried original hull. Not any real vehicle.
	MeshLib.part(root, MeshLib.box(3.6, 0.7, 1.5), iron, Vector3(52, 0.15, 108))
	MeshLib.part(root, MeshLib.cyl(0.38, 0.22), rust, Vector3(50.6, 0.12, 108.5))
	MeshLib.part(root, MeshLib.cyl(0.38, 0.22), rust, Vector3(53.4, 0.1, 107.6))
	MeshLib.part(root, MeshLib.box(1.2, 0.35, 1.1), rust, Vector3(52.4, 0.55, 108))
	# Fallen machine frame.
	MeshLib.part(root, MeshLib.box(0.18, 2.8, 0.18), iron, Vector3(78, 0.6, 36))
	MeshLib.part(root, MeshLib.box(2.4, 0.16, 0.16), iron, Vector3(79, 1.7, 36))
	MeshLib.part(root, MeshLib.box(0.16, 1.4, 0.16), rust, Vector3(80.1, 1.0, 36.4))
	add_child(root)

func _growth() -> void:
	var root := Node3D.new()
	root.name = "Growth"
	root.visible = false
	root.add_to_group("growth")
	var wood := MeshLib.mat("6b4226")
	var spot: Dictionary = ContentDB.spot("fence_spot")
	MeshLib.part(root, MeshLib.box(1.5, 1.0, 0.12), wood, Vector3(float(spot.get("x", 57)), 0.5, float(spot.get("z", 33))))
	var spring: Dictionary = ContentDB.spot("spring")
	MeshLib.part(root, MeshLib.box(0.1, 0.4, 0.1), MeshLib.mat("c2a06a"), Vector3(float(spring.get("x", 67)) + 1.2, 0.2, float(spring.get("z", 29))))
	add_child(root)

func apply_wake() -> void:
	dream = false
	for node in get_tree().get_nodes_in_group("dream_only"):
		if node is Node3D:
			node.visible = false
	for node in get_tree().get_nodes_in_group("ruins"):
		if node is Node3D:
			node.visible = true
	if env:
		env.adjustment_enabled = true
		env.adjustment_saturation = 0.42
		env.adjustment_contrast = 1.12
		env.ambient_light_color = Color(0.55, 0.52, 0.48)
		env.volumetric_fog_enabled = false
		env.sdfgi_enabled = false
		env.fog_light_color = Color(0.62, 0.58, 0.52)
	if sun:
		sun.light_color = Color(0.78, 0.74, 0.66)
		sun.light_energy = 1.15
	apply_graphics()

func _hide_draw(node: Node) -> void:
	if node is GeometryInstance3D:
		(node as GeometryInstance3D).visible = false
	for child in node.get_children():
		_hide_draw(child)

func _process(delta: float) -> void:
	_sync_placed()
	for node in get_tree().get_nodes_in_group("growth"):
		if node is Node3D:
			node.visible = bool(GameState.data.get("gate_open", false)) and dream
	var clock := Time.get_ticks_msec() / 1000.0
	for bird in get_tree().get_nodes_in_group("bird"):
		if bird is Node3D:
			var i := float(bird.get_meta("i", 0))
			bird.position = Vector3(40.0 + sin(clock * 0.25 + i) * 18.0, 2.15 + sin(clock + i) * 0.15, 70.0 + cos(clock * 0.2 + i) * 14.0)
	for puff in get_tree().get_nodes_in_group("smoke"):
		if puff is Node3D and puff.has_meta("base"):
			var base: Vector3 = puff.get_meta("base")
			var n := fmod(clock * 0.35 + base.x, 1.0)
			puff.position = base + Vector3(sin(clock) * 0.15, n * 2.2, 0)
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
		if str(p.get("what", "")) == "stool":
			node.add_to_group("seat")
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
