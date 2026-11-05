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

static func grain_tex() -> Texture2D:
	if _tex.has("_grain"):
		return _tex["_grain"]
	var img := Image.create(64, 64, false, Image.FORMAT_RGB8)
	for y in 64:
		for x in 64:
			var n := sin(x * 0.83 + y * 0.37) * 0.5 + cos(x * 0.21 - y * 0.67) * 0.5
			var wobble := 0.55 + n * 0.18 + sin(x * y * 0.017) * 0.08
			img.set_pixel(x, y, Color(wobble, wobble * 0.86, wobble * 0.62))
	var tex := ImageTexture.create_from_image(img)
	_tex["_grain"] = tex
	return tex

static func terrain_tex() -> Texture2D:
	if _tex.has("_terrain"):
		return _tex["_terrain"]
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	for y in 128:
		for x in 128:
			var n := _noise(x, y)
			var c := Color(0.33, 0.45, 0.22).lerp(Color(0.5, 0.46, 0.28), clampf(n, 0.0, 1.0))
			if n > 0.72:
				c = Color(0.55, 0.46, 0.3)
			elif n < 0.28:
				c = Color(0.24, 0.36, 0.16)
			img.set_pixel(x, y, c)
	var tex := ImageTexture.create_from_image(img)
	_tex["_terrain"] = tex
	return tex

static func _noise(x: int, y: int) -> float:
	var a := _cell(x / 16, y / 16)
	var b := _cell(x / 16 + 1, y / 16)
	var c := _cell(x / 16, y / 16 + 1)
	var d := _cell(x / 16 + 1, y / 16 + 1)
	var tx := float(x % 16) / 16.0
	var ty := float(y % 16) / 16.0
	return lerpf(lerpf(a, b, tx), lerpf(c, d, tx), ty)

static func _cell(x: int, y: int) -> float:
	var n := sin(float(x) * 127.1 + float(y) * 311.7) * 43758.5453
	return n - floor(n)

static func path_mat(hex: String) -> StandardMaterial3D:
	var key := "path:" + hex
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.albedo_texture = grain_tex()
	m.roughness = 0.96
	m.uv1_scale = Vector3(0.18, 0.18, 0.18)
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	_mats[key] = m
	return m

static func paint_tiles(parent: Node, points: Array, y: float, size: Vector3, material: Material) -> void:
	if points.is_empty():
		return
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = box(1, 1, 1)
	mm.instance_count = points.size()
	for i in points.size():
		var p = points[i]
		var px := float(p[0])
		var pz := float(p[1])
		var yaw := sin(px * 0.37 + pz * 0.21) * 0.22
		var swell := 1.0 + absf(sin(px * 0.17 + pz * 0.13)) * 0.04
		var basis := Basis(Vector3.UP, yaw).scaled(Vector3(size.x * swell, size.y, size.z * swell))
		mm.set_instance_transform(i, Transform3D(basis, Vector3(px, y, pz)))
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = material
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(inst)
