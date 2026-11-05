extends Node3D
class_name HumanRig

## Quaternius Universal Animation Library (CC0) body, with Kurdish clothing
## attached to the same skeleton. The old cube IK is gone: it made the legs split.

const MODEL := preload("res://assets/characters/quaternius/UAL1_Standard.fbx")
const Move = preload("res://scripts/sim/move_rules.gd")

var anim: AnimationPlayer
var skel: Skeleton3D
var model: Node3D
var height_mul := 1.0
var ankle := 0.1
var _clip := ""
var clothing: Array = []

func setup(spec: Dictionary) -> void:
	height_mul = float(spec.get("height", 1.0))
	scale = Vector3.ONE * height_mul
	model = MODEL.instantiate()
	# The imported Armature is already rotated upright (-90, 180). A second
	# pitch laid the body flat, so the walk read as legs in the air.
	add_child(model)
	anim = model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	skel = _find_skeleton(model)
	_tint(spec)
	_clothes(spec)
	_play("Armature|Idle")
	_measure_ankle()
	if OS.has_feature("headless"):
		visible = false

func set_first_person(on: bool) -> void:
	if model:
		model.visible = not on

func tick(_delta: float, speed: float, action: String) -> void:
	var clip := "Armature|Idle"
	var pace := 1.0
	if action == "sit":
		clip = "Armature|Sitting_Idle"
	elif action == "crouch":
		clip = "Armature|Crouch_Fwd" if speed > 0.2 else "Armature|Crouch_Idle"
		if speed > 0.2:
			pace = Move.anim_pace(speed)
	elif speed > 0.2:
		clip = "Armature|Walk"
		pace = Move.anim_pace(speed)
	elif action in ["talk", "teach", "pray", "eat"]:
		clip = "Armature|Idle_Talking"
	elif action in ["carve", "hammer", "hoe", "weave", "bake", "tend"]:
		clip = "Armature|PickUp_Table"
	_play(clip)
	if anim:
		anim.speed_scale = pace
	_plant_feet()

func sole_lift() -> float:
	return lowest_foot_y() - global_position.y - ankle

func _measure_ankle() -> void:
	if skel == null or not is_inside_tree():
		return
	var lift := minf(_bone_world("foot_l").y, _bone_world("foot_r").y) - global_position.y
	ankle = clampf(lift, 0.04, 0.22)

func _plant_feet() -> void:
	if skel == null or model == null:
		return
	var err := sole_lift()
	if absf(err) < 0.004:
		return
	model.position.y -= err

func feet_span() -> float:
	var a := _bone_world("foot_l")
	var b := _bone_world("foot_r")
	return Vector2(a.x, a.z).distance_to(Vector2(b.x, b.z))

func lowest_foot_y() -> float:
	return minf(_bone_world("foot_l").y, _bone_world("foot_r").y)

func _bone_world(bone: String) -> Vector3:
	if skel == null:
		return global_position
	var idx := skel.find_bone(bone)
	if idx < 0:
		return global_position
	return skel.to_global(skel.get_bone_global_pose(idx).origin)

func _play(clip: String) -> void:
	if anim == null or clip == _clip:
		return
	if not anim.has_animation(clip):
		clip = "Armature|Idle"
		if not anim.has_animation(clip) or clip == _clip:
			return
	_clip = clip
	anim.play(clip)

func _hide_meshes(node: Node) -> void:
	if node is MeshInstance3D or node is Skeleton3D:
		if node is GeometryInstance3D:
			(node as GeometryInstance3D).visible = false
	for c in node.get_children():
		_hide_meshes(c)

func _find_skeleton(node: Node) -> Skeleton3D:
	if node is Skeleton3D:
		return node
	for c in node.get_children():
		var found := _find_skeleton(c)
		if found:
			return found
	return null

func _tint(spec: Dictionary) -> void:
	var skin := MeshLib.mat(str(spec.get("skin", "8c5a42")), 0.72)
	var stack: Array = [model]
	while stack:
		var n = stack.pop_back()
		if n is MeshInstance3D:
			n.material_override = skin
			n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		for c in n.get_children():
			stack.append(c)

func clothing_count() -> int:
	return clothing.size()

func has_clothing(role: String) -> bool:
	for piece in clothing:
		if str(piece.get_meta("role", "")) == role:
			return true
	return false

func _clothes(spec: Dictionary) -> void:
	if skel == null:
		return
	var kind := str(spec.get("kind", "man"))
	var girl := kind == "woman" or str(spec.get("child_kind", "")) == "girl"
	var sash_m := MeshLib.cloth_mat(str(spec.get("sash", "8b1e2d")), "wool")
	var cloth := MeshLib.cloth_mat(str(spec.get("cloth", "4a4034")), "wool")
	var shirt := MeshLib.cloth_mat(str(spec.get("shirt", "c2a078")), "cotton")
	var dress := MeshLib.cloth_mat(str(spec.get("dress", spec.get("cloth", "a33b3b"))), "embroidery")
	var wrap := MeshLib.cloth_mat(str(spec.get("wrap", "d8c4a4")), "cotton")
	var vest := MeshLib.cloth_mat(str(spec.get("vest", "3a2a22")), "embroidery")
	var shoes := MeshLib.cloth_mat("f7f4ee", "cotton")
	var turban := _turban_mat(str(spec.get("name", "azad")))
	_hair(str(spec.get("name", "azad")))
	if kind == "mullah":
		var robe := MeshLib.cloth_mat(str(spec.get("robe", "241c18")), "wool")
		_wrap("neck_01", 0.16, 0.22, robe, "torso")
		_wrap("spine_03", 0.26, 0.42, robe, "torso")
		_wrap("spine_02", 0.28, 0.46, robe, "torso")
		_wrap("spine_01", 0.27, 0.4, robe, "torso")
		_wrap("pelvis", 0.26, 0.32, robe, "legs")
		_limb("thigh_l", 0.24, 0.14, 0.52, robe, "legs")
		_limb("thigh_r", 0.24, 0.14, 0.52, robe, "legs")
		_limb("thigh_l", 0.2, 0.17, 0.2, robe, "legs")
		_limb("thigh_r", 0.2, 0.17, 0.2, robe, "legs")
		_limb("calf_l", 0.16, 0.12, 0.72, robe, "legs")
		_limb("calf_r", 0.16, 0.12, 0.72, robe, "legs")
		_limb("upperarm_l", 0.1, 0.09, 0.34, robe, "torso")
		_limb("upperarm_r", 0.1, 0.09, 0.34, robe, "torso")
		_limb("lowerarm_l", 0.09, 0.12, 0.32, robe, "torso")
		_limb("lowerarm_r", 0.09, 0.12, 0.32, robe, "torso")
		_wrap("spine_01", 0.3, 0.07, sash_m, "sash")
		_attach("Head", MeshLib.sphere(0.15), MeshLib.mat("f7f4ee"), Vector3(0, 0.07, 0), "head")
		_attach("Head", MeshLib.box(0.06, 0.22, 0.05), MeshLib.mat("f7f4ee"), Vector3(0.1, -0.02, 0), "head")
	elif girl:
		_wrap("neck_01", 0.15, 0.2, dress, "torso")
		_wrap("spine_03", 0.24, 0.4, dress, "torso")
		_wrap("spine_02", 0.26, 0.44, dress, "torso")
		_wrap("spine_02", 0.2, 0.28, vest, "torso")
		_wrap("spine_01", 0.25, 0.38, dress, "torso")
		_wrap("pelvis", 0.3, 0.36, dress, "legs")
		_limb("thigh_l", 0.22, 0.13, 0.52, dress, "legs")
		_limb("thigh_r", 0.22, 0.13, 0.52, dress, "legs")
		_limb("thigh_l", 0.19, 0.16, 0.18, dress, "legs")
		_limb("thigh_r", 0.19, 0.16, 0.18, dress, "legs")
		_limb("calf_l", 0.16, 0.12, 0.72, dress, "legs")
		_limb("calf_r", 0.16, 0.12, 0.72, dress, "legs")
		_limb("upperarm_l", 0.09, 0.08, 0.34, dress, "torso")
		_limb("upperarm_r", 0.09, 0.08, 0.34, dress, "torso")
		_limb("lowerarm_l", 0.08, 0.12, 0.32, dress, "torso")
		_limb("lowerarm_r", 0.08, 0.12, 0.32, dress, "torso")
		_wrap("spine_01", 0.3, 0.06, sash_m, "sash")
		_attach("Head", MeshLib.box(0.24, 0.1, 0.22), wrap, Vector3(0, 0.08, 0), "head")
		_attach("Head", MeshLib.box(0.2, 0.34, 0.06), wrap, Vector3(0, -0.08, -0.08), "head")
		if bool(spec.get("coins", false)):
			_attach("Head", MeshLib.box(0.16, 0.02, 0.02), MeshLib.mat("e0b040", 0.45, 0.5), Vector3(0, 0.02, 0.1), "head")
	else:
		# Shal u shapik: jacket, wide trousers, sash, turban or klaw.
		_wrap("neck_01", 0.16, 0.24, shirt, "torso")
		_wrap("spine_03", 0.26, 0.42, shirt, "torso")
		_wrap("spine_02", 0.28, 0.48, cloth, "torso")
		_wrap("spine_01", 0.27, 0.4, cloth, "torso")
		_wrap("pelvis", 0.28, 0.34, cloth, "legs")
		_limb("thigh_l", 0.24, 0.14, 0.52, cloth, "legs")
		_limb("thigh_r", 0.24, 0.14, 0.52, cloth, "legs")
		_limb("thigh_l", 0.2, 0.17, 0.2, cloth, "legs")
		_limb("thigh_r", 0.2, 0.17, 0.2, cloth, "legs")
		_limb("calf_l", 0.17, 0.13, 0.72, cloth, "legs")
		_limb("calf_r", 0.17, 0.13, 0.72, cloth, "legs")
		_limb("upperarm_l", 0.1, 0.09, 0.34, shirt, "torso")
		_limb("upperarm_r", 0.1, 0.09, 0.34, shirt, "torso")
		_limb("lowerarm_l", 0.09, 0.13, 0.32, shirt, "torso")
		_limb("lowerarm_r", 0.09, 0.13, 0.32, shirt, "torso")
		_wrap("spine_01", 0.3, 0.07, sash_m, "sash")
		_attach("Head", MeshLib.cyl(0.13, 0.07), turban, Vector3(0, 0.1, 0), "head")
		_attach("Head", MeshLib.cyl(0.15, 0.04), wrap, Vector3(0, 0.06, 0), "head")
	_foot_cover("foot_l", shoes)
	_foot_cover("foot_r", shoes)

func _hair(id: String) -> void:
	var tones := ["2a1c14", "3b2418", "1a1a1a", "4a3022", "5a3a28"]
	var mat := MeshLib.mat(tones[absi(id.hash()) % tones.size()], 0.72)
	# The jamane is a band. Hair has to sit on the crown above it, and at the nape.
	_attach("Head", MeshLib.sphere(0.15), mat, Vector3(0, 0.17, -0.02), "head")
	_attach("Head", MeshLib.sphere(0.1), mat, Vector3(0, 0.13, -0.11), "head")
	_attach("Head", MeshLib.sphere(0.055), mat, Vector3(0.09, 0.15, 0.0), "head")

func _turban_mat(id: String) -> Material:
	# Checkered jamane in black, grey, and cream. No red-and-white check.
	var which := absi(id.hash()) % 3
	return MeshLib.cloth_mat("ffffff", "jamane%d" % which)

func _wrap(bone: String, radius: float, height: float, mat: Material, role: String) -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius * 1.06
	mesh.height = height
	mesh.radial_segments = 12
	_attach(bone, mesh, mat, Vector3.ZERO, role)

func _limb(bone: String, r_near: float, r_far: float, length: float, mat: Material, role: String) -> void:
	var along := _toward_child(bone)
	var mesh := CylinderMesh.new()
	# Local +Y points toward the child, which is the cuff or the ankle.
	mesh.top_radius = r_far
	mesh.bottom_radius = r_near
	mesh.height = length
	mesh.radial_segments = 12
	_attach(bone, mesh, mat, along * length * 0.38, role)

func _foot_cover(bone: String, mat: Material) -> void:
	if skel == null or skel.find_bone(bone) < 0:
		return
	var idx := skel.find_bone(bone)
	var pose := skel.get_bone_global_pose(idx)
	var host: Node3D = skel if skel.is_inside_tree() else model
	var down_skel := Vector3.DOWN
	if host != null and host.is_inside_tree():
		down_skel = host.global_transform.basis.inverse() * Vector3.DOWN
	var down: Vector3 = (pose.basis.inverse() * down_skel).normalized()
	var fwd := _toward_child(bone)
	if absf(fwd.dot(down)) > 0.75:
		fwd = down.cross(Vector3.RIGHT)
		if fwd.length() < 0.001:
			fwd = down.cross(Vector3.FORWARD)
	fwd = fwd.normalized()
	var side := down.cross(fwd).normalized()
	fwd = side.cross(down).normalized()
	var up := -down
	var basis := Basis(side, up, fwd).orthonormalized()
	var shoe := BoxMesh.new()
	shoe.size = Vector3(0.12, 0.06, 0.22)
	_attach(bone, shoe, mat, Vector3.ZERO, "legs")
	var shoe_mi := clothing[clothing.size() - 1].get_child(0) as MeshInstance3D
	shoe_mi.transform = Transform3D(basis, down * 0.08 + fwd * 0.04)
	var cuff := CylinderMesh.new()
	cuff.top_radius = 0.09
	cuff.bottom_radius = 0.11
	cuff.height = 0.28
	cuff.radial_segments = 10
	_attach(bone, cuff, mat, Vector3.ZERO, "legs")
	var cuff_mi := clothing[clothing.size() - 1].get_child(0) as MeshInstance3D
	cuff_mi.transform = Transform3D(basis, down * 0.02)

func _toward_child(bone: String) -> Vector3:
	if skel == null:
		return Vector3(0, -1, 0)
	var idx := skel.find_bone(bone)
	if idx < 0:
		return Vector3(0, -1, 0)
	var child := -1
	for b in skel.get_bone_count():
		if skel.get_bone_parent(b) == idx:
			child = b
			break
	if child < 0:
		return Vector3(0, -1, 0)
	var pose := skel.get_bone_global_pose(idx)
	var dest: Vector3 = skel.get_bone_global_pose(child).origin
	var dir: Vector3 = pose.basis.inverse() * (dest - pose.origin)
	if dir.length() < 0.001:
		return Vector3(0, -1, 0)
	return dir.normalized()

func _attach(bone: String, mesh: Mesh, mat: Material, pos: Vector3, role: String) -> void:
	if skel == null or skel.find_bone(bone) < 0:
		return
	var att := BoneAttachment3D.new()
	att.bone_name = bone
	att.add_to_group("clothing")
	att.set_meta("role", role)
	skel.add_child(att)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	att.add_child(mi)
	clothing.append(att)
