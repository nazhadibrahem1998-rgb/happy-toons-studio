extends RefCounted
class_name Pieces

static func make(id: String) -> Node3D:
	var root := Node3D.new()
	root.name = id
	var wood := MeshLib.mat("6b4226", 0.84)
	var clay := MeshLib.mat("c47a3a", 0.9)
	var mud := MeshLib.ground_mat("c4a574", "plaster", 0.4)
	var fibre := MeshLib.mat("c2a06a", 0.9)
	match id:
		"fence":
			MeshLib.part(root, MeshLib.box(1.5, 0.08, 0.08), wood, Vector3(0, 0.95, 0))
			MeshLib.part(root, MeshLib.box(1.5, 0.08, 0.08), wood, Vector3(0, 0.45, 0))
			MeshLib.part(root, MeshLib.box(0.08, 1.05, 0.08), wood, Vector3(-0.7, 0.55, 0))
			MeshLib.part(root, MeshLib.box(0.08, 1.05, 0.08), wood, Vector3(0.7, 0.55, 0))
			MeshLib.part(root, MeshLib.box(1.35, 0.7, 0.04), fibre, Vector3(0, 0.55, 0))
		"wall":
			MeshLib.part(root, MeshLib.box(1.5, 2.1, 0.32), mud, Vector3(0, 1.05, 0))
			MeshLib.part(root, MeshLib.box(1.55, 0.12, 0.4), wood, Vector3(0, 2.1, 0))
		"oven":
			MeshLib.part(root, MeshLib.box(1.1, 0.7, 1.0), clay, Vector3(0, 0.4, 0))
			MeshLib.part(root, MeshLib.sphere(0.42), clay, Vector3(0, 0.85, 0))
			MeshLib.part(root, MeshLib.box(0.4, 0.28, 0.08), MeshLib.mat("2a2118"), Vector3(0, 0.4, -0.48))
		"loom":
			MeshLib.part(root, MeshLib.box(0.08, 1.5, 0.08), wood, Vector3(-0.55, 0.75, 0))
			MeshLib.part(root, MeshLib.box(0.08, 1.5, 0.08), wood, Vector3(0.55, 0.75, 0))
			MeshLib.part(root, MeshLib.box(1.2, 0.08, 0.08), wood, Vector3(0, 1.45, 0))
			MeshLib.part(root, MeshLib.box(1.05, 0.9, 0.02), fibre, Vector3(0, 0.8, 0))
		"stool":
			MeshLib.part(root, MeshLib.cyl(0.22, 0.06), wood, Vector3(0, 0.48, 0))
			MeshLib.part(root, MeshLib.box(0.06, 0.46, 0.06), wood, Vector3(0, 0.23, 0))
		"spoon_mould":
			MeshLib.part(root, MeshLib.box(0.28, 0.06, 0.12), wood, Vector3(0, 0.08, 0))
		"spoon":
			MeshLib.part(root, MeshLib.box(0.06, 0.22, 0.1), wood, Vector3(0, 0.12, 0))
		"clay_cup", "clay_bowl", "water_jar":
			MeshLib.part(root, MeshLib.cyl(0.08 if id == "clay_cup" else 0.12, 0.1 if id != "water_jar" else 0.18), clay, Vector3(0, 0.08, 0))
		"braid":
			MeshLib.part(root, MeshLib.box(0.08, 0.28, 0.08), fibre, Vector3(0, 0.2, 0))
		"lamp":
			MeshLib.part(root, MeshLib.box(0.22, 0.16, 0.22), MeshLib.mat("8a8078"), Vector3(0, 0.12, 0))
		"millstone":
			MeshLib.part(root, MeshLib.cyl(0.28, 0.08), MeshLib.mat("9a9088"), Vector3(0, 0.08, 0))
		_:
			MeshLib.part(root, MeshLib.box(0.3, 0.3, 0.3), wood, Vector3(0, 0.2, 0))
	return root

static func ghost(id: String, ok: bool) -> Node3D:
	var node := make(id)
	var tint := Color(0.85, 0.95, 0.75, 0.45) if ok else Color(0.7, 0.3, 0.25, 0.45)
	_tint(node, tint)
	return node

static func _tint(node: Node, tint: Color) -> void:
	if node is MeshInstance3D:
		var m := StandardMaterial3D.new()
		m.albedo_color = tint
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.roughness = 0.9
		(node as MeshInstance3D).material_override = m
	for c in node.get_children():
		_tint(c, tint)
