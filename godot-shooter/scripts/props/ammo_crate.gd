extends StaticBody3D

@export var amount: int = 30
var taken: bool = false


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.7, 0.42, 0.48)
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.material_override = Materials.wood()
	visual.position = Vector3(0, 0.28, 0)
	visual.gi_mode = GeometryInstance3D.GI_MODE_STATIC
	add_child(visual)
	var lid := MeshInstance3D.new()
	var lid_mesh := BoxMesh.new()
	lid_mesh.size = Vector3(0.74, 0.08, 0.5)
	lid.mesh = lid_mesh
	lid.material_override = Materials.wood_furniture()
	lid.position = Vector3(0, 0.52, -0.06)
	lid.rotation_degrees = Vector3(-18, 0, 0)
	add_child(lid)
	var stripe := MeshInstance3D.new()
	var stripe_mesh := BoxMesh.new()
	stripe_mesh.size = Vector3(0.72, 0.08, 0.08)
	stripe.mesh = stripe_mesh
	stripe.material_override = Materials.flat(Color(0.32, 0.06, 0.07), 0.7, 0.0)
	stripe.position = Vector3(0, 0.32, -0.22)
	add_child(stripe)
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.7, 0.55, 0.48)
	shape.shape = box
	shape.position = Vector3(0, 0.28, 0)
	shape.name = "CollisionShape3D"
	add_child(shape)
	var area := Area3D.new()
	area.name = "PickupArea"
	area.collision_layer = 0
	area.collision_mask = 2
	area.monitoring = true
	var area_shape := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = 1.15
	area_shape.shape = sphere
	area_shape.position = Vector3(0, 0.6, 0)
	area.add_child(area_shape)
	add_child(area)
	area.body_entered.connect(_on_body_entered)
	var lamp := OmniLight3D.new()
	lamp.light_color = Color(1.0, 0.7, 0.4)
	lamp.light_energy = 0.45
	lamp.omni_range = 3.2
	lamp.position = Vector3(0, 0.8, 0)
	lamp.shadow_enabled = false
	lamp.add_to_group("lamp")
	add_child(lamp)


func _on_body_entered(body: Node3D) -> void:
	if taken or not body.is_in_group("player"):
		return
	if not body.has_method("add_ammo"):
		return
	if not bool(body.call("add_ammo", amount)):
		return
	taken = true
	visible = false
	var shape := get_node_or_null("CollisionShape3D") as CollisionShape3D
	if shape:
		shape.disabled = true
	var area := get_node_or_null("PickupArea") as Area3D
	if area:
		area.monitoring = false
	AudioDirector.play_3d("ui", global_position, -4.0)
