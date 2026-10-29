class_name WeaponFactory
extends RefCounted

static func attach_ak(parent: Node3D) -> Marker3D:
	var metal: Material = Materials.metal_dark()
	var wood: Material = Materials.wood_furniture()
	_box(parent, Vector3(0.048, 0.075, 0.30), Vector3(0, 0.02, -0.02), metal)
	_box(parent, Vector3(0.04, 0.09, 0.24), Vector3(0, 0.015, 0.2), wood)
	_box(parent, Vector3(0.03, 0.11, 0.045), Vector3(0, -0.06, 0.04), wood, Vector3(12, 0, 0))
	_box(parent, Vector3(0.028, 0.16, 0.07), Vector3(0, -0.09, -0.02), metal, Vector3(-18, 0, 0))
	_box(parent, Vector3(0.046, 0.05, 0.22), Vector3(0, 0.015, -0.26), wood)
	_cyl(parent, 0.012, 0.36, Vector3(0, 0.03, -0.52), metal)
	_cyl(parent, 0.008, 0.2, Vector3(0, 0.055, -0.28), metal)
	_box(parent, Vector3(0.012, 0.045, 0.012), Vector3(0, 0.07, -0.68), metal)
	_box(parent, Vector3(0.02, 0.03, 0.02), Vector3(0, 0.07, 0.02), metal)
	var muzzle := Marker3D.new()
	muzzle.name = "Muzzle"
	muzzle.position = Vector3(0, 0.03, -0.72)
	parent.add_child(muzzle)
	return muzzle


static func attach_m16(parent: Node3D) -> Marker3D:
	var metal: Material = Materials.flat(Color(0.12, 0.12, 0.125), 0.46, 0.62)
	_box(parent, Vector3(0.045, 0.07, 0.34), Vector3(0, 0.02, 0.02), metal)
	_box(parent, Vector3(0.04, 0.055, 0.16), Vector3(0, 0.02, 0.26), metal)
	_box(parent, Vector3(0.03, 0.045, 0.16), Vector3(0, 0.075, -0.02), metal)
	_box(parent, Vector3(0.026, 0.18, 0.05), Vector3(0, -0.08, 0.02), metal)
	_box(parent, Vector3(0.042, 0.045, 0.28), Vector3(0, 0.015, -0.28), metal)
	_cyl(parent, 0.01, 0.42, Vector3(0, 0.03, -0.58), metal)
	_box(parent, Vector3(0.01, 0.07, 0.05), Vector3(0, 0.07, -0.72), metal)
	_box(parent, Vector3(0.012, 0.03, 0.03), Vector3(0, 0.02, -0.78), metal)
	var muzzle := Marker3D.new()
	muzzle.name = "Muzzle"
	muzzle.position = Vector3(0, 0.03, -0.82)
	parent.add_child(muzzle)
	return muzzle


static func _box(parent: Node3D, size: Vector3, pos: Vector3, mat: Material, rot: Vector3 = Vector3.ZERO) -> void:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	mi.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(mi)


static func _cyl(parent: Node3D, radius: float, length: float, pos: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = length
	mesh.radial_segments = 8
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = Vector3(-90, 0, 0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(mi)
