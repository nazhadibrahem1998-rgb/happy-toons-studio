class_name VillageBuilder
extends RefCounted

# Semi-open mountain village. Collision is boxes and stairs so navigation and the player
# share the same surfaces. Y of each terrace is the walkable top.

static var _seq: int = 0

static func build(parent: Node3D) -> void:
	_seq = 0
	_ground(parent)
	_path(parent)
	_terraces(parent)
	_houses(parent)
	_walls_and_cover(parent)
	_trees(parent)
	_rocks(parent)
	_dressing(parent)
	_mountains(parent)
	_bounds(parent)
	_lamps(parent)


static func _ground(parent: Node3D) -> void:
	var body := _body(parent, "Ground")
	_visual_only(body, Vector3(220, 0.2, 220), Vector3(0, -0.1, -24), Materials.ground())
	_shape_only(body, Vector3(84, 2.0, 92), Vector3(0, -1.0, -26))


static func _path(parent: Node3D) -> void:
	var points: Array[Vector3] = [
		Vector3(0.2, 0.04, 16),
		Vector3(0.6, 0.04, 4),
		Vector3(-1.2, 0.04, -8),
		Vector3(0.8, 0.04, -20),
		Vector3(-0.4, 0.04, -32),
		Vector3(1.4, 0.04, -44),
		Vector3(0.0, 0.04, -60),
	]
	var root := Node3D.new()
	root.name = "Path"
	parent.add_child(root)
	var mat := Materials.path()
	for i in points.size() - 1:
		var a: Vector3 = points[i]
		var b: Vector3 = points[i + 1]
		var mid := (a + b) * 0.5
		var length := a.distance_to(b)
		var mi := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(3.4, 0.04, length)
		mi.mesh = mesh
		mi.material_override = mat
		mi.position = mid
		mi.gi_mode = GeometryInstance3D.GI_MODE_STATIC
		root.add_child(mi)
		if absf((b - a).normalized().dot(Vector3.UP)) < 0.99:
			mi.look_at(b, Vector3.UP)


static func _terraces(parent: Node3D) -> void:
	# West terrace, top y = 2.4. Footprint x -30..-8, z -40..4
	var west := _body(parent, "TerraceWest")
	_solid(west, Vector3(22, 2.4, 44), Vector3(-19, 1.2, -18), Materials.plaster_dark())
	_stairs(parent, Vector3(-7.2, 0, -14), Vector3(-1, 0, 0), 8, 2.4, 4.2)
	# East terrace, top y = 3.1. x 9..29, z -40..-2
	var east := _body(parent, "TerraceEast")
	_solid(east, Vector3(20, 3.1, 38), Vector3(19, 1.55, -21), Materials.plaster_dark())
	_stairs(parent, Vector3(8.2, 0, -18), Vector3(1, 0, 0), 11, 3.1, 4.0)
	# North plateau, top y = 1.4
	var north := _body(parent, "PlateauNorth")
	_solid(north, Vector3(42, 1.4, 18), Vector3(0, 0.7, -52), Materials.plaster_dark())
	_stairs(parent, Vector3(0, 0, -42.2), Vector3(0, 0, -1), 5, 1.4, 5.0)


static func _houses(parent: Node3D) -> void:
	# floor_y, x, z, width, depth, face_dir, roof_access
	var houses: Array = [
		[2.4, -18.0, -8.0, 6.6, 5.6, Vector3(1, 0, 0), true, true],
		[2.4, -22.0, -28.0, 7.2, 6.0, Vector3(1, 0, 0), false, false],
		[3.1, 17.0, -12.0, 6.8, 5.8, Vector3(-1, 0, 0), true, true],
		[3.1, 22.0, -30.0, 7.4, 6.2, Vector3(-1, 0, 0), false, false],
		[0.0, -12.0, -34.0, 6.4, 5.4, Vector3(1, 0, 0), false, false],
		[0.0, 10.0, -36.0, 6.8, 5.6, Vector3(-1, 0, 0), true, false],
		[1.4, -10.0, -54.0, 7.2, 6.0, Vector3(0, 0, 1), false, false],
		[1.4, 9.0, -53.0, 9.0, 7.0, Vector3(0, 0, 1), true, false],
	]
	for i in houses.size():
		var h: Array = houses[i]
		_house(parent, h[0], h[1], h[2], h[3], h[4], h[5], h[6], "House%d" % i, h[7])


static func _house(parent: Node3D, floor_y: float, x: float, z: float, width: float, depth: float, face: Vector3, roof_access: bool, node_name: String, village_flag: bool = false) -> void:
	var body := _body(parent, node_name)
	body.position = Vector3(x, floor_y, z)
	if face.length() > 0.1:
		body.look_at(body.global_position + face, Vector3.UP)
	var wall_h := 2.85
	var thick := 0.42
	var plaster: Material = Materials.plaster()
	var foundation: Material = Materials.rock()
	var roof_mat: Material = Materials.path()
	var wood: Material = Materials.wood()
	_solid(body, Vector3(width + 0.5, 0.38, depth + 0.5), Vector3(0, -0.12, 0), foundation)
	_solid(body, Vector3(thick, wall_h, depth), Vector3(-width * 0.5, wall_h * 0.5, 0), plaster)
	_solid(body, Vector3(thick, wall_h, depth), Vector3(width * 0.5, wall_h * 0.5, 0), plaster)
	_solid(body, Vector3(width, wall_h, thick), Vector3(0, wall_h * 0.5, depth * 0.5), plaster)
	var gap := 1.35
	var side_w := (width - gap) * 0.5
	var front_z := -depth * 0.5
	_solid(body, Vector3(side_w, wall_h, thick), Vector3(-(gap + side_w) * 0.5, wall_h * 0.5, front_z), plaster)
	_solid(body, Vector3(side_w, wall_h, thick), Vector3((gap + side_w) * 0.5, wall_h * 0.5, front_z), plaster)
	_solid(body, Vector3(gap, wall_h - 2.15, thick), Vector3(0, 2.15 + (wall_h - 2.15) * 0.5, front_z), plaster)
	_solid(body, Vector3(gap + 0.2, 0.12, thick + 0.08), Vector3(0, 2.12, front_z), wood)
	_visual_only(body, Vector3(0.7, 0.9, 0.08), Vector3(-width * 0.22, 1.55, front_z - 0.02), Materials.flat(Color(0.05, 0.05, 0.06), 0.9, 0.0))
	_visual_only(body, Vector3(0.7, 0.9, 0.08), Vector3(width * 0.22, 1.55, -front_z * 0.15), Materials.flat(Color(0.05, 0.05, 0.06), 0.9, 0.0))
	var roof_top := wall_h + 0.04
	var roof_t := 0.24
	_solid(body, Vector3(width + 0.9, roof_t, depth + 0.9), Vector3(0, roof_top - roof_t * 0.5, 0), roof_mat)
	var parapet_h := 0.38
	_solid(body, Vector3(width + 0.9, parapet_h, 0.18), Vector3(0, roof_top + parapet_h * 0.5, depth * 0.5 + 0.3), plaster_dark_cached())
	_solid(body, Vector3(width + 0.9, parapet_h, 0.18), Vector3(0, roof_top + parapet_h * 0.5, -depth * 0.5 - 0.3), plaster_dark_cached())
	if roof_access:
		_solid(body, Vector3(0.18, parapet_h, depth * 0.45), Vector3(width * 0.5 + 0.3, roof_top + parapet_h * 0.5, depth * 0.2), plaster_dark_cached())
		_roof_stairs(body, width, depth, roof_top)
	else:
		_solid(body, Vector3(0.18, parapet_h, depth + 0.9), Vector3(-width * 0.5 - 0.3, roof_top + parapet_h * 0.5, 0), plaster_dark_cached())
		_solid(body, Vector3(0.18, parapet_h, depth + 0.9), Vector3(width * 0.5 + 0.3, roof_top + parapet_h * 0.5, 0), plaster_dark_cached())
	_cover_marker(parent, body.global_position + body.global_transform.basis * Vector3(0, 0, -depth * 0.5 - 2.2))
	_cover_marker(parent, body.global_position + body.global_transform.basis * Vector3(width * 0.5 + 1.6, 0, 0))
	if village_flag:
		_village_banner(body, width, front_z, wall_h)


static func plaster_dark_cached() -> Material:
	return Materials.plaster_dark()


static func _roof_stairs(body: StaticBody3D, width: float, depth: float, roof_top: float) -> void:
	var steps := 10
	var step_h := roof_top / float(steps)
	var step_d := 0.4
	for i in steps:
		var top := step_h * float(i + 1)
		var pos := Vector3(-width * 0.5 - 0.7, top * 0.5, -depth * 0.5 + 0.5 + float(i) * step_d)
		_solid(body, Vector3(1.2, top, step_d), pos, Materials.rock())


static func _stairs(parent: Node3D, origin: Vector3, inward: Vector3, count: int, total_h: float, width: float) -> void:
	var body := _body(parent, "Stairs")
	var step_h := total_h / float(count)
	var step_d := 0.48
	var dir := inward.normalized()
	for i in count:
		var top := step_h * float(i + 1)
		var center := origin + dir * (float(i) * step_d + step_d * 0.5)
		center.y = top * 0.5
		var size := Vector3(step_d, top, width) if absf(dir.x) > 0.5 else Vector3(width, top, step_d)
		_solid(body, size, center, Materials.rock())


static func _walls_and_cover(parent: Node3D) -> void:
	var spots: Array = [
		[Vector3(-3.5, 0.55, -1.5), Vector3(0.45, 1.1, 3.4)],
		[Vector3(3.6, 0.55, -12.0), Vector3(0.42, 1.1, 3.8)],
		[Vector3(-3.2, 0.55, -22.0), Vector3(3.6, 1.1, 0.42)],
		[Vector3(2.4, 0.5, -30.5), Vector3(0.4, 1.0, 3.0)],
		[Vector3(-1.5, 0.55, -41.0), Vector3(3.2, 1.1, 0.4)],
		[Vector3(4.2, 1.95, -47.5), Vector3(0.4, 1.1, 2.8)],
		[Vector3(-14.5, 2.95, -2.0), Vector3(2.8, 1.0, 0.4)],
		[Vector3(13.5, 3.65, -6.5), Vector3(0.4, 1.0, 2.6)],
	]
	for spot in spots:
		var body := _body(parent, "LowWall")
		_solid(body, spot[1], spot[0], Materials.rock())
		var cover_pos: Vector3 = spot[0]
		cover_pos.y = spot[0].y - spot[1].y * 0.5
		_cover_marker(parent, cover_pos + Vector3(0.9, 0, 0.4))


static func _trees(parent: Node3D) -> void:
	var trees: Array = [
		[-6.5, 7.5, 1.15, "oak"],
		[7.2, 5.5, 1.0, "walnut"],
		[-28.0, -2.0, 1.25, "oak"],
		[-27.0, -20.0, 1.05, "walnut"],
		[30.0, -6.0, 1.2, "oak"],
		[31.0, -24.0, 1.0, "walnut"],
		[-4.5, -16.5, 0.95, "oak"],
		[5.5, -19.0, 1.1, "walnut"],
		[-20.0, -40.0, 1.3, "oak"],
		[24.0, -42.0, 1.15, "walnut"],
		[2.0, -60.0, 1.2, "oak"],
		[-30.0, -48.0, 1.0, "oak"],
		[16.0, 10.0, 1.35, "walnut"],
		[-8.0, -46.0, 1.05, "oak"],
	]
	for t in trees:
		_tree(parent, Vector3(t[0], 0.0, t[1]), t[2], t[3])


static func _tree(parent: Node3D, pos: Vector3, scale: float, kind: String) -> void:
	var body := _body(parent, "Tree")
	var trunk_h := 2.5 * scale
	var trunk := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.16 * scale
	cyl.bottom_radius = 0.24 * scale
	cyl.height = trunk_h
	cyl.radial_segments = 7
	trunk.mesh = cyl
	trunk.material_override = Materials.wood()
	trunk.position = pos + Vector3(0, trunk_h * 0.5, 0)
	trunk.gi_mode = GeometryInstance3D.GI_MODE_STATIC
	body.add_child(trunk)
	_shape_only(body, Vector3(0.45 * scale, trunk_h, 0.45 * scale), trunk.position)
	var leaf := Color(0.18, 0.24, 0.12) if kind == "oak" else Color(0.22, 0.28, 0.13)
	var mat := Materials.flat(leaf, 0.92, 0.0)
	var count := 4 if kind == "oak" else 5
	for i in count:
		var canopy := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		var radius := (0.85 + (i % 3) * 0.18) * scale
		sphere.radius = radius
		sphere.height = radius * 2.0
		sphere.radial_segments = 10
		sphere.rings = 6
		canopy.mesh = sphere
		canopy.material_override = mat
		var spread := 0.55 * scale
		canopy.position = pos + Vector3(cos(i * 1.7) * spread, trunk_h + 0.55 * scale + (i % 2) * 0.25, sin(i * 1.7) * spread)
		canopy.gi_mode = GeometryInstance3D.GI_MODE_STATIC
		canopy.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		body.add_child(canopy)


static func _rocks(parent: Node3D) -> void:
	var rocks: Array = [
		[Vector3(2.2, 0, 8.5), 0.7],
		[Vector3(-5.0, 0, -14.5), 0.9],
		[Vector3(6.2, 0, -20.5), 0.75],
		[Vector3(-1.2, 0, -27.0), 0.55],
		[Vector3(8.0, 0, -44.0), 1.0],
		[Vector3(-16.0, 2.4, -16.0), 0.65],
		[Vector3(15.5, 3.1, -20.0), 0.7],
		[Vector3(0.5, 1.4, -58.5), 0.85],
		[Vector3(-32.0, 0, 2.0), 1.3],
		[Vector3(33.0, 0, -14.0), 1.4],
		[Vector3(-34.0, 0, -36.0), 1.5],
		[Vector3(34.0, 0, -48.0), 1.35],
		[Vector3(0, 0, 16.5), 1.2],
		[Vector3(-8, 0, -62), 1.4],
		[Vector3(12, 0, -63), 1.25],
	]
	for r in rocks:
		_rock(parent, r[0], r[1])
		if r[1] < 1.15:
			_cover_marker(parent, r[0] + Vector3(0.8, 0, 0.3))


static func _rock(parent: Node3D, pos: Vector3, scale: float) -> void:
	var body := _body(parent, "Rock")
	for i in 3:
		var size := Vector3(0.8, 0.45, 0.7) * scale * (1.0 - float(i) * 0.18)
		var offset := Vector3(0.18 * i * scale, size.y * 0.35, -0.12 * i * scale)
		var mi := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = size.x * 0.5
		mesh.height = size.y
		mesh.radial_segments = 7
		mesh.rings = 5
		mi.mesh = mesh
		mi.material_override = Materials.rock()
		mi.position = pos + offset
		mi.rotation_degrees = Vector3(8 * i, 40 * i, 12)
		mi.scale = Vector3(1.3, 0.7, 1.1)
		mi.gi_mode = GeometryInstance3D.GI_MODE_STATIC
		body.add_child(mi)
		_shape_only(body, size, pos + offset)


static func _dressing(parent: Node3D) -> void:
	var well := _body(parent, "Well")
	var ring := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.95
	cyl.bottom_radius = 1.0
	cyl.height = 0.75
	cyl.radial_segments = 12
	ring.mesh = cyl
	ring.material_override = Materials.rock()
	ring.position = Vector3(0, 0.38, -24)
	ring.gi_mode = GeometryInstance3D.GI_MODE_STATIC
	well.add_child(ring)
	_shape_only(well, Vector3(2.0, 0.75, 2.0), ring.position)
	var inner := MeshInstance3D.new()
	var hole := CylinderMesh.new()
	hole.top_radius = 0.55
	hole.bottom_radius = 0.55
	hole.height = 0.2
	inner.mesh = hole
	inner.material_override = Materials.flat(Color(0.05, 0.05, 0.06), 1.0, 0.0)
	inner.position = Vector3(0, 0.7, -24)
	well.add_child(inner)
	_banner_pole(parent, Vector3(0, 0, -46), 1.0)
	_banner_pole(parent, Vector3(-12.5, 2.4, -1.5), 0.85)
	_banner_pole(parent, Vector3(14.0, 3.1, -34.0), 0.85)
	# Player's side only: the southern approach, before the occupied north.
	_kurdistan_pole(parent, Vector3(-3.6, 0.0, 10.2), -12.0, 1.05)
	_kurdistan_pole(parent, Vector3(4.8, 0.0, 8.4), 11.0, 1.0)
	_kurdistan_pole(parent, Vector3(-1.1, 0.0, 4.6), -4.0, 0.92)


static func _village_banner(body: Node3D, width: float, front_z: float, wall_h: float) -> void:
	var banner := Node3D.new()
	banner.name = "VillageBanner"
	banner.position = Vector3(-width * 0.28, wall_h - 0.46, front_z - 0.34)
	banner.add_to_group("kurdistan_flag")
	body.add_child(banner)
	KurdistanFlag.make_hanging(banner, 1.24, 0.83)


static func _kurdistan_pole(parent: Node3D, pos: Vector3, yaw_deg: float, scale: float) -> void:
	var root := Node3D.new()
	root.name = "KurdistanFlag"
	root.position = pos
	root.rotation_degrees = Vector3(0, yaw_deg, 0)
	root.scale = Vector3.ONE * scale
	root.add_to_group("kurdistan_flag")
	parent.add_child(root)
	KurdistanFlag.make_pole(root, 1.62, 1.08)


static func _banner_pole(parent: Node3D, pos: Vector3, scale: float) -> void:
	var root := Node3D.new()
	root.name = "FactionBanner"
	root.position = pos
	root.scale = Vector3.ONE * scale
	parent.add_child(root)
	Banner.make_flag(root, 1.15, 1.65)


static func _mountains(parent: Node3D) -> void:
	var peaks: Array = [
		[Vector3(0, 0, -130), 46.0, 78.0],
		[Vector3(-48, 0, -115), 34.0, 62.0],
		[Vector3(52, 0, -118), 38.0, 70.0],
		[Vector3(-95, 0, -40), 32.0, 54.0],
		[Vector3(98, 0, -30), 36.0, 60.0],
		[Vector3(-90, 0, 30), 28.0, 42.0],
		[Vector3(92, 0, 36), 30.0, 46.0],
		[Vector3(10, 0, 70), 34.0, 40.0],
		[Vector3(-55, 0, -70), 22.0, 36.0],
		[Vector3(60, 0, -78), 24.0, 40.0],
	]
	for peak in peaks:
		var pos: Vector3 = peak[0]
		var radius: float = peak[1]
		var height: float = peak[2]
		var mi := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = radius * 0.12
		mesh.bottom_radius = radius
		mesh.height = height
		mesh.radial_segments = 7
		mi.mesh = mesh
		mi.material_override = Materials.rock_far()
		mi.position = pos + Vector3(0, height * 0.5 - 4.0, 0)
		mi.gi_mode = GeometryInstance3D.GI_MODE_STATIC
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		parent.add_child(mi)


static func _bounds(parent: Node3D) -> void:
	var body := _body(parent, "Bounds")
	_shape_only(body, Vector3(1.2, 8.0, 90), Vector3(-40, 4.0, -26))
	_shape_only(body, Vector3(1.2, 8.0, 90), Vector3(40, 4.0, -26))
	_shape_only(body, Vector3(84, 8.0, 1.2), Vector3(0, 4.0, 18))
	_shape_only(body, Vector3(84, 8.0, 1.2), Vector3(0, 4.0, -66))


static func _lamps(parent: Node3D) -> void:
	var spots: Array[Vector3] = [
		Vector3(-14.2, 4.2, -8.0),
		Vector3(13.6, 4.8, -12.0),
		Vector3(-8.5, 1.8, -34.0),
		Vector3(0.0, 1.6, -24.0),
		Vector3(6.0, 3.2, -53.0),
	]
	for pos in spots:
		var lamp := OmniLight3D.new()
		lamp.position = pos
		lamp.light_color = Color(1.0, 0.62, 0.32)
		lamp.light_energy = 1.35
		lamp.omni_range = 7.5
		lamp.shadow_enabled = false
		lamp.add_to_group("lamp")
		parent.add_child(lamp)


static func _cover_marker(parent: Node3D, pos: Vector3) -> void:
	var marker := Marker3D.new()
	marker.position = pos
	marker.add_to_group("cover_point")
	parent.add_child(marker)


static func _body(parent: Node3D, node_name: String) -> StaticBody3D:
	var body := StaticBody3D.new()
	_seq += 1
	body.name = "%s_%d" % [node_name, _seq]
	body.collision_layer = 1
	body.collision_mask = 0
	parent.add_child(body)
	return body


static func _solid(body: StaticBody3D, size: Vector3, pos: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.gi_mode = GeometryInstance3D.GI_MODE_STATIC
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	body.add_child(mi)
	_shape_only(body, size, pos)


static func _visual_only(body: Node3D, size: Vector3, pos: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.gi_mode = GeometryInstance3D.GI_MODE_STATIC
	body.add_child(mi)


static func _shape_only(body: StaticBody3D, size: Vector3, pos: Vector3) -> void:
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	col.position = pos
	body.add_child(col)
