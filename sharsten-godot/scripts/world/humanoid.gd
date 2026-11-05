extends Node3D
class_name HumanRig

## Quaternius Universal Animation Library (CC0) body, with Kurdish clothing
## attached to the same skeleton. The old cube IK is gone: it made the legs split.

const MODEL := preload("res://assets/characters/quaternius/UAL1_Standard.fbx")

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
	elif speed > 2.15:
		clip = "Armature|Walk"
		pace = 1.65
	elif speed > 0.2:
		clip = "Armature|Walk"
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
	var sash_m := MeshLib.mat(str(spec.get("sash", "8b1e2d")), 0.72)
	var cloth := MeshLib.mat(str(spec.get("cloth", "4a4034")), 0.86)
	var shirt := MeshLib.mat(str(spec.get("shirt", "c2a078")), 0.82)
	var dress := MeshLib.mat(str(spec.get("dress", spec.get("cloth", "a33b3b"))), 0.84)
	var wrap := MeshLib.mat(str(spec.get("wrap", "d8c4a4")), 0.8)
	var vest := MeshLib.mat(str(spec.get("vest", "3a2a22")), 0.84)
	var shoes := MeshLib.mat("2a2118", 0.7)
	if kind == "mullah":
		var robe := MeshLib.mat(str(spec.get("robe", "241c18")), 0.9)
		_attach("neck_01", MeshLib.box(0.28, 0.16, 0.26), robe, Vector3.ZERO, "torso")
		_attach("spine_03", MeshLib.box(0.52, 0.4, 0.48), robe, Vector3(0, 0.06, 0), "torso")
		_attach("spine_02", MeshLib.box(0.5, 0.5, 0.46), robe, Vector3.ZERO, "torso")
		_attach("spine_02", MeshLib.box(0.48, 0.72, 0.12), robe, Vector3(0, 0.08, -0.18), "torso")
		_attach("spine_01", MeshLib.box(0.52, 0.4, 0.48), robe, Vector3(0, -0.06, 0), "torso")
		_attach("pelvis", MeshLib.box(0.5, 0.28, 0.36), robe, Vector3(0, -0.08, 0), "legs")
		_limb("thigh_l", 0.16, 0.5, robe, "legs")
		_limb("thigh_r", 0.16, 0.5, robe, "legs")
		_limb("calf_l", 0.13, 0.46, robe, "legs")
		_limb("calf_r", 0.13, 0.46, robe, "legs")
		_limb("upperarm_l", 0.1, 0.36, robe, "torso")
		_limb("upperarm_r", 0.1, 0.36, robe, "torso")
		_limb("lowerarm_l", 0.08, 0.32, robe, "torso")
		_limb("lowerarm_r", 0.08, 0.32, robe, "torso")
		_attach("spine_01", MeshLib.box(0.52, 0.07, 0.38), sash_m, Vector3.ZERO, "sash")
		_attach("Head", MeshLib.sphere(0.15), MeshLib.mat("f7f4ee"), Vector3(0, 0.07, 0), "head")
		_attach("Head", MeshLib.box(0.06, 0.22, 0.05), MeshLib.mat("f7f4ee"), Vector3(0.1, -0.02, 0), "head")
	elif girl:
		_attach("neck_01", MeshLib.box(0.26, 0.14, 0.24), dress, Vector3.ZERO, "torso")
		_attach("spine_03", MeshLib.box(0.52, 0.4, 0.48), dress, Vector3(0, 0.06, 0), "torso")
		_attach("spine_02", MeshLib.box(0.5, 0.5, 0.46), dress, Vector3.ZERO, "torso")
		_attach("spine_02", MeshLib.box(0.48, 0.72, 0.12), dress, Vector3(0, 0.08, -0.18), "torso")
		_attach("spine_02", MeshLib.box(0.36, 0.28, 0.1), vest, Vector3(0, 0.02, 0.16), "torso")
		_attach("spine_01", MeshLib.box(0.52, 0.4, 0.48), dress, Vector3(0, -0.06, 0), "torso")
		_attach("pelvis", MeshLib.box(0.58, 0.34, 0.42), dress, Vector3(0, -0.1, 0), "legs")
		_limb("thigh_l", 0.15, 0.5, dress, "legs")
		_limb("thigh_r", 0.15, 0.5, dress, "legs")
		_limb("calf_l", 0.12, 0.46, dress, "legs")
		_limb("calf_r", 0.12, 0.46, dress, "legs")
		_limb("upperarm_l", 0.09, 0.36, dress, "torso")
		_limb("upperarm_r", 0.09, 0.36, dress, "torso")
		_limb("lowerarm_l", 0.075, 0.32, dress, "torso")
		_limb("lowerarm_r", 0.075, 0.32, dress, "torso")
		_attach("spine_01", MeshLib.box(0.5, 0.06, 0.36), sash_m, Vector3.ZERO, "sash")
		_attach("Head", MeshLib.box(0.24, 0.1, 0.22), wrap, Vector3(0, 0.08, 0), "head")
		_attach("Head", MeshLib.box(0.2, 0.34, 0.06), wrap, Vector3(0, -0.08, -0.08), "head")
		if bool(spec.get("coins", false)):
			_attach("Head", MeshLib.box(0.16, 0.02, 0.02), MeshLib.mat("e0b040", 0.45, 0.5), Vector3(0, 0.02, 0.1), "head")
	else:
		# Shal u shapik: jacket, wide trousers, sash, turban or klaw.
		_attach("neck_01", MeshLib.box(0.28, 0.16, 0.26), shirt, Vector3.ZERO, "torso")
		_attach("spine_03", MeshLib.box(0.54, 0.42, 0.5), shirt, Vector3(0, 0.08, 0), "torso")
		_attach("spine_02", MeshLib.box(0.52, 0.52, 0.48), shirt, Vector3.ZERO, "torso")
		_attach("spine_02", MeshLib.box(0.5, 0.74, 0.12), shirt, Vector3(0, 0.1, -0.2), "torso")
		_attach("spine_01", MeshLib.box(0.54, 0.42, 0.5), cloth, Vector3(0, -0.08, 0), "torso")
		_attach("pelvis", MeshLib.box(0.52, 0.26, 0.38), cloth, Vector3(0, -0.06, 0), "legs")
		_limb("thigh_l", 0.17, 0.5, cloth, "legs")
		_limb("thigh_r", 0.17, 0.5, cloth, "legs")
		_limb("calf_l", 0.14, 0.46, cloth, "legs")
		_limb("calf_r", 0.14, 0.46, cloth, "legs")
		_limb("upperarm_l", 0.1, 0.36, shirt, "torso")
		_limb("upperarm_r", 0.1, 0.36, shirt, "torso")
		_limb("lowerarm_l", 0.08, 0.32, shirt, "torso")
		_limb("lowerarm_r", 0.08, 0.32, shirt, "torso")
		_attach("spine_01", MeshLib.box(0.54, 0.07, 0.4), sash_m, Vector3.ZERO, "sash")
		var hw := str(spec.get("headwear", "turban"))
		if hw == "klaw" or hw == "headband":
			_attach("Head", MeshLib.cyl(0.14, 0.08), wrap, Vector3(0, 0.1, 0), "head")
			_attach("Head", MeshLib.box(0.22, 0.04, 0.2), wrap, Vector3(0, 0.06, 0), "head")
		else:
			_attach("Head", MeshLib.sphere(0.15), wrap, Vector3(0, 0.08, 0), "head")
			_attach("Head", MeshLib.box(0.07, 0.24, 0.06), wrap, Vector3(0.11, -0.02, 0), "head")
	_attach("foot_l", MeshLib.box(0.1, 0.06, 0.16), shoes, Vector3(0, -0.02, 0.02), "legs")
	_attach("foot_r", MeshLib.box(0.1, 0.06, 0.16), shoes, Vector3(0, -0.02, 0.02), "legs")

func _limb(bone: String, radius: float, length: float, mat: Material, role: String) -> void:
	# Move the cloth from the joint toward the next bone, so trousers and sleeves
	# follow the limb instead of riding up into the torso.
	var along := _toward_child(bone)
	_attach(bone, MeshLib.cyl(radius, length), mat, along * length * 0.42, role)

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
