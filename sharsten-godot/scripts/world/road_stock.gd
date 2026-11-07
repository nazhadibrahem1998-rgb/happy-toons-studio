extends Node3D

## A horse, a donkey, and a cart on a short lane. No riding.
## The animals are Quaternius CC0. The cart is Kenney planks on wooden wheels.

const PATH := [Vector3(48, 0, 22), Vector3(66, 0, 22), Vector3(66, 0, 31), Vector3(48, 0, 31)]

var _horse: Node3D
var _donkey: Node3D
var _cart: Node3D
var _along := 0.0

func _ready() -> void:
	_horse = _animal("res://assets/animals/quaternius/Horse.fbx", 1.55)
	_donkey = _animal("res://assets/animals/quaternius/Donkey.fbx", 1.25)
	_cart = _cart_mesh()
	add_child(_horse)
	add_child(_donkey)
	add_child(_cart)

func _animal(path: String, height: float) -> Node3D:
	var model := load(path).instantiate() as Node3D
	_fit(model, height)
	var anim := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if anim and anim.has_animation("AnimalArmature|Walk"):
		anim.play("AnimalArmature|Walk")
	return model

func _cart_mesh() -> Node3D:
	var root := Node3D.new()
	var bed := load("res://assets/buildings/kenney/planks.fbx").instantiate() as Node3D
	_fit_span(bed, 1.5)
	bed.position.y += 0.55
	var wood := StandardMaterial3D.new()
	wood.albedo_texture = MeshLib.tex("woodfloor")
	wood.albedo_color = Color("8a5a32")
	wood.roughness = 0.9
	_paint(bed, wood)
	root.add_child(bed)
	for side in [-0.45, 0.45]:
		var wheel := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.28
		cyl.bottom_radius = 0.28
		cyl.height = 0.08
		cyl.radial_segments = 12
		wheel.mesh = cyl
		wheel.position = Vector3(side, 0.28, 0.35)
		wheel.rotation.z = PI * 0.5
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = MeshLib.tex("woodfloor")
		mat.albedo_color = Color("8a5a32")
		mat.roughness = 0.9
		wheel.material_override = mat
		root.add_child(wheel)
	return root

func _fit_span(model: Node3D, span: float) -> void:
	var box := _bounds(model)
	var longest := maxf(box.size.x, maxf(box.size.y, box.size.z))
	var s := 1.0 if longest < 0.001 else span / longest
	s = clampf(s, 0.02, 6.0)
	model.scale = Vector3.ONE * s

func _paint(node: Node, mat: Material) -> void:
	if node is MeshInstance3D:
		(node as MeshInstance3D).material_override = mat
	for child in node.get_children():
		_paint(child, mat)

func _fit(model: Node3D, height: float) -> void:
	var box := _bounds(model)
	var h := box.size.y
	var s := 26.0 if h < 0.2 else height / h
	if h > 0.001 and h < 5.0:
		s = height / h
	model.scale = Vector3.ONE * s
	model.position.y = -box.position.y * s

func _bounds(model: Node) -> AABB:
	return _bounds_under(model, Transform3D.IDENTITY)

func _bounds_under(node: Node, parent: Transform3D) -> AABB:
	var xf := parent
	if node is Node3D:
		xf = parent * (node as Node3D).transform
	var box := AABB()
	var first := true
	if node is MeshInstance3D and (node as MeshInstance3D).mesh:
		box = xf * (node as MeshInstance3D).mesh.get_aabb()
		first = false
	for child in node.get_children():
		var sub := _bounds_under(child, xf)
		if sub.size.length() > 0.001:
			box = sub if first else box.merge(sub)
			first = false
	return box

func _process(delta: float) -> void:
	var player := get_tree().get_first_node_in_group("player") as Node3D
	var here := _point(_along)
	var near := player == null or player.global_position.distance_squared_to(here) < 484.0
	for model in [_horse, _donkey, _cart]:
		if model == null:
			continue
		model.visible = near
		model.process_mode = Node.PROCESS_MODE_INHERIT if near else Node.PROCESS_MODE_DISABLED
	if not near:
		return
	_along += delta * 1.3
	var lead := _point(_along)
	var follow := _point(_along - 2.4)
	var ahead := _point(_along + 0.4) - lead
	_place(_horse, lead, ahead)
	_place(_donkey, follow + Vector3(0.8, 0, 0), ahead)
	_place(_cart, follow, ahead)

func _place(model: Node3D, at: Vector3, dir: Vector3) -> void:
	if model == null:
		return
	var feet := model.position.y
	model.global_position = Vector3(at.x, feet, at.z)
	if dir.length() > 0.05:
		model.rotation.y = atan2(-dir.x, -dir.z)

func _point(distance: float) -> Vector3:
	var lengths: Array = []
	var total := 0.0
	for i in PATH.size():
		var a: Vector3 = PATH[i]
		var b: Vector3 = PATH[(i + 1) % PATH.size()]
		var span := a.distance_to(b)
		lengths.append(span)
		total += span
	var d := fposmod(distance, total)
	for i in PATH.size():
		var span: float = lengths[i]
		if d <= span or i == PATH.size() - 1:
			var a: Vector3 = PATH[i]
			var b: Vector3 = PATH[(i + 1) % PATH.size()]
			return a.lerp(b, 0.0 if span <= 0.001 else d / span)
		d -= span
	return PATH[0]
