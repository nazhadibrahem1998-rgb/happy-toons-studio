extends RefCounted
class_name MeshLib

static var _mats := {}
static var _boxes := {}
static var _spheres := {}
static var _cyls := {}
static var _tex := {}

static func col(hex: String) -> Color:
	return Color(hex)

static func mat(hex: String, rough: float = 0.88, metal: float = 0.0) -> StandardMaterial3D:
	var key := "%s:%.2f:%.2f" % [hex, rough, metal]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.roughness = rough
	m.metallic = metal
	_mats[key] = m
	return m

static func tex(name: String) -> Texture2D:
	if _tex.has(name):
		return _tex[name]
	var path := "res://assets/textures/polyhaven/%s.jpg" % name
	var t: Texture2D = null
	if ResourceLoader.exists(path):
		t = load(path)
	_tex[name] = t
	return t

static func ground_mat(hex: String, tex_name: String, tile: float) -> StandardMaterial3D:
	var key := "g:%s:%s:%.3f" % [hex, tex_name, tile]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.roughness = 0.94
	var t := tex(tex_name)
	if t != null:
		m.albedo_texture = t
		m.uv1_scale = Vector3(tile, tile, tile)
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
	_mats[key] = m
	return m

static func box(w: float, h: float, d: float) -> BoxMesh:
	var key := "%.3f,%.3f,%.3f" % [w, h, d]
	if _boxes.has(key):
		return _boxes[key]
	var mesh := BoxMesh.new()
	mesh.size = Vector3(w, h, d)
	_boxes[key] = mesh
	return mesh

static func sphere(r: float) -> SphereMesh:
	var key := "%.3f" % r
	if _spheres.has(key):
		return _spheres[key]
	var mesh := SphereMesh.new()
	mesh.radius = r
	mesh.height = r * 2.0
	mesh.radial_segments = 12
	mesh.rings = 8
	_spheres[key] = mesh
	return mesh

static func cyl(radius: float, height: float) -> CylinderMesh:
	var key := "%.3f,%.3f" % [radius, height]
	if _cyls.has(key):
		return _cyls[key]
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius * 0.94
	mesh.height = height
	mesh.radial_segments = 10
	_cyls[key] = mesh
	return mesh

static func part(parent: Node3D, mesh: Mesh, material: Material, pos: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	parent.add_child(mi)
	return mi

static func paint_tiles(parent: Node, points: Array, y: float, size: Vector3, material: Material) -> void:
	if points.is_empty():
		return
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = box(1, 1, 1)
	mm.instance_count = points.size()
	for i in points.size():
		var p = points[i]
		var xf := Transform3D(Basis().scaled(size), Vector3(float(p[0]), y, float(p[1])))
		mm.set_instance_transform(i, xf)
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = material
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
