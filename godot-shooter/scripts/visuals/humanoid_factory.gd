class_name HumanoidFactory
extends RefCounted

static func build(parent: Node3D, style: String) -> Array[StandardMaterial3D]:
	var mats: Array[StandardMaterial3D] = []
	var root := Node3D.new()
	root.name = "Body"
	parent.add_child(root)
	if style == "gurut":
		_gurut(root, mats)
	else:
		_soldier(root, mats, style == "commander")
		if style == "commander":
			root.scale = Vector3(1.04, 1.06, 1.04)
			var banner_root := Node3D.new()
			banner_root.position = Vector3(0.0, 1.25, 0.28)
			root.add_child(banner_root)
			Banner.make_flag(banner_root, 0.38, 0.55)
	return mats


static func _gurut(root: Node3D, mats: Array[StandardMaterial3D]) -> void:
	var skin := Color(0.55, 0.40, 0.31)
	var shirt := Color(0.76, 0.68, 0.54)
	var vest := Color(0.29, 0.20, 0.14)
	var sash := Color(0.42, 0.10, 0.12)
	var cloth := Color(0.40, 0.35, 0.28)
	var wrap := Color(0.82, 0.74, 0.58)
	var shoe := Color(0.12, 0.09, 0.07)
	_box(root, mats, "pelvis", Vector3(0.36, 0.2, 0.22), Vector3(0, 0.98, 0), cloth)
	_box(root, mats, "torso", Vector3(0.38, 0.42, 0.22), Vector3(0, 1.32, 0), shirt)
	_box(root, mats, "vest", Vector3(0.42, 0.34, 0.16), Vector3(0, 1.36, -0.06), vest)
	_box(root, mats, "vest_back", Vector3(0.4, 0.3, 0.08), Vector3(0, 1.34, 0.1), vest)
	_box(root, mats, "sash", Vector3(0.46, 0.07, 0.26), Vector3(0, 1.08, 0), sash, 0.7, 0.0, Vector3(0, 0, 14))
	_box(root, mats, "thigh_l", Vector3(0.26, 0.42, 0.30), Vector3(-0.15, 0.72, 0), cloth)
	_box(root, mats, "thigh_r", Vector3(0.26, 0.42, 0.30), Vector3(0.15, 0.72, 0), cloth)
	_box(root, mats, "shin_l", Vector3(0.16, 0.38, 0.18), Vector3(-0.15, 0.32, 0.02), cloth, 0.82, 0.0, Vector3.ZERO, true)
	_box(root, mats, "shin_r", Vector3(0.16, 0.38, 0.18), Vector3(0.15, 0.32, 0.02), cloth)
	_box(root, mats, "shoe_l", Vector3(0.14, 0.08, 0.26), Vector3(-0.15, 0.06, 0.04), shoe, 0.7, 0.1)
	_box(root, mats, "shoe_r", Vector3(0.14, 0.08, 0.26), Vector3(0.15, 0.06, 0.04), shoe, 0.7, 0.1)
	_box(root, mats, "arm_l", Vector3(0.11, 0.28, 0.12), Vector3(-0.28, 1.38, 0), shirt)
	_box(root, mats, "arm_r", Vector3(0.11, 0.28, 0.12), Vector3(0.28, 1.38, -0.02), shirt)
	_box(root, mats, "fore_l", Vector3(0.1, 0.26, 0.1), Vector3(-0.30, 1.12, -0.04), skin, 0.7)
	_box(root, mats, "fore_r", Vector3(0.1, 0.26, 0.1), Vector3(0.32, 1.14, -0.1), skin, 0.7)
	_sphere(root, mats, "head", 0.115, Vector3(0, 1.66, 0), skin, 0.62)
	_sphere(root, mats, "jamana", 0.132, Vector3(0, 1.72, 0.01), wrap, 0.8)
	_box(root, mats, "jamana_tail", Vector3(0.07, 0.36, 0.05), Vector3(0.02, 1.46, 0.12), wrap)
	_box(root, mats, "neck", Vector3(0.08, 0.08, 0.08), Vector3(0, 1.52, 0), skin, 0.65, 0.0, Vector3.ZERO, false)


static func _soldier(root: Node3D, mats: Array[StandardMaterial3D], commander: bool) -> void:
	var skin := Color(0.48, 0.36, 0.28)
	var tunic := Color(0.16, 0.17, 0.18)
	var pants := Color(0.12, 0.13, 0.14)
	var boot := Color(0.05, 0.05, 0.05)
	var helm := Color(0.08, 0.085, 0.09)
	var band := Color(0.32, 0.05, 0.06) if commander else Color(0.22, 0.04, 0.05)
	_box(root, mats, "pelvis", Vector3(0.34, 0.18, 0.2), Vector3(0, 0.98, 0), pants)
	_box(root, mats, "torso", Vector3(0.4, 0.44, 0.22), Vector3(0, 1.32, 0), tunic)
	_box(root, mats, "belt", Vector3(0.42, 0.06, 0.24), Vector3(0, 1.08, 0), boot, 0.55, 0.2)
	if commander:
		_box(root, mats, "collar", Vector3(0.28, 0.06, 0.18), Vector3(0, 1.5, -0.02), band)
	_box(root, mats, "band", Vector3(0.06, 0.08, 0.14), Vector3(-0.22, 1.38, 0), band, 0.7, 0.0, Vector3.ZERO, false)
	_box(root, mats, "thigh_l", Vector3(0.15, 0.42, 0.16), Vector3(-0.1, 0.72, 0), pants)
	_box(root, mats, "thigh_r", Vector3(0.15, 0.42, 0.16), Vector3(0.1, 0.72, 0), pants)
	_box(root, mats, "shin_l", Vector3(0.13, 0.38, 0.14), Vector3(-0.1, 0.32, 0.01), pants)
	_box(root, mats, "shin_r", Vector3(0.13, 0.38, 0.14), Vector3(0.1, 0.32, 0.01), pants)
	_box(root, mats, "boot_l", Vector3(0.14, 0.1, 0.26), Vector3(-0.1, 0.07, 0.04), boot, 0.55, 0.15)
	_box(root, mats, "boot_r", Vector3(0.14, 0.1, 0.26), Vector3(0.1, 0.07, 0.04), boot, 0.55, 0.15)
	_box(root, mats, "arm_l", Vector3(0.11, 0.28, 0.12), Vector3(-0.28, 1.38, 0), tunic)
	_box(root, mats, "arm_r", Vector3(0.11, 0.28, 0.12), Vector3(0.28, 1.36, -0.04), tunic)
	_box(root, mats, "fore_l", Vector3(0.1, 0.24, 0.1), Vector3(-0.3, 1.12, -0.02), tunic)
	_box(root, mats, "fore_r", Vector3(0.1, 0.24, 0.1), Vector3(0.32, 1.12, -0.12), tunic)
	_sphere(root, mats, "head", 0.11, Vector3(0, 1.66, 0), skin, 0.6)
	var helm_mesh := _sphere(root, mats, "helmet", 0.128, Vector3(0, 1.7, 0.01), helm, 0.42, 0.72)
	helm_mesh.scale = Vector3(1.05, 0.82, 1.12)
	_box(root, mats, "visor", Vector3(0.16, 0.045, 0.04), Vector3(0, 1.64, -0.11), Color(0.02, 0.02, 0.02), 0.3, 0.4, Vector3.ZERO, false)
	_box(root, mats, "webbing", Vector3(0.08, 0.32, 0.04), Vector3(0, 1.32, -0.12), Color(0.1, 0.1, 0.1), 0.7, 0.1, Vector3.ZERO, false)


static func _box(parent: Node3D, mats: Array[StandardMaterial3D], node_name: String, size: Vector3, pos: Vector3, color: Color, rough: float = 0.8, metal: float = 0.0, rot: Vector3 = Vector3.ZERO, shadow: bool = true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = node_name
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	var mat := _mat(color, rough, metal)
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(mi)
	mats.append(mat)
	return mi


static func _sphere(parent: Node3D, mats: Array[StandardMaterial3D], node_name: String, radius: float, pos: Vector3, color: Color, rough: float = 0.7, metal: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = node_name
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 16
	mesh.rings = 8
	mi.mesh = mesh
	var mat := _mat(color, rough, metal)
	mi.material_override = mat
	mi.position = pos
	mi.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(mi)
	mats.append(mat)
	return mi


static func _mat(color: Color, rough: float, metal: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(color.r, color.g, color.b, 1.0)
	mat.roughness = rough
	mat.metallic = metal
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return mat
