extends Node3D
class_name HumanRig

## Quaternius Universal Animation Library (CC0) body, with Kurdish clothing
## attached to the same skeleton. The old cube IK is gone: it made the legs split.

const MODEL := preload("res://assets/characters/quaternius/UAL1_Standard.fbx")
const Move = preload("res://scripts/sim/move_rules.gd")

var anim: AnimationPlayer
var tree: AnimationTree
var skel: Skeleton3D
var model: Node3D
var height_mul := 1.0
var ankle := 0.1
var _clip := ""
var _mix := 0.0
var _stance := 0.0
var blend_speed := 0.0
var lod_on := true
var clothing: Array = []
var tool: MeshInstance3D

func _exit_tree() -> void:
	if anim:
		anim.stop()
		anim = null
	if tree:
		tree.active = false
		tree = null

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
	_make_tool(spec)
	_build_tree()
	_measure_ankle()
	if GameState.headless():
		visible = false

func show_weapon(id: String) -> void:
	if tool:
		tool.visible = id != "fists" and id != "flintlock"
	if id == "fists" or id == "flintlock" or skel == null:
		return
	if tool == null:
		_make_tool({"prop": "staff"})
	if tool == null:
		return
	tool.visible = true
	var mesh: Mesh = MeshLib.box(0.08, 0.55, 0.02)
	if id in ["shovel", "staff", "hammer"]:
		mesh = MeshLib.cyl(0.03, 0.85)
	elif id == "sickle":
		mesh = MeshLib.box(0.28, 0.06, 0.02)
	tool.mesh = mesh

func set_first_person(on: bool) -> void:
	if model:
		model.visible = not on

func set_lod(on: bool) -> void:
	lod_on = on
	if tree:
		tree.active = on

func tick(delta: float, speed: float, action: String, turn_rate: float = 0.0, air: String = "") -> void:
	if not lod_on and air == "":
		return
	var turning := speed < 0.35 and turn_rate > 1.1 and air == "" and action != "crouch"
	var clip := _clip_for(speed, action, air, turning)
	var crouched := action == "crouch" and air == ""
	var combat := action in ["jab", "cross", "kick", "blade", "tool", "roll", "guard", "hurt"]
	var acting := air != "" or combat or (speed < 0.35 and action in ["sit", "talk", "teach", "pray", "eat", "carve", "hammer", "hoe", "chop", "weave", "bake", "tend", "kneel", "open"])
	if action == "open" and speed >= 0.35:
		acting = true
	var want_mix := 1.0 if acting else 0.0
	if action == "open" and speed >= 0.35:
		want_mix = 0.72
	var want_stance := 1.0 if crouched else 0.0
	_mix = lerpf(_mix, want_mix, 1.0 - exp(-12.0 * delta))
	_stance = lerpf(_stance, want_stance, 1.0 - exp(-10.0 * delta))
	blend_speed = 0.9 if turning else clampf(speed, 0.0, 5.5)
	_clip = clip
	if tool:
		var working := action in ["carve", "hammer", "hoe", "chop", "weave", "bake", "tend", "kneel", "carry", "open"]
		tool.visible = working and (action == "carry" or speed < 0.35)
	if tree == null:
		_play(clip)
		if anim:
			anim.speed_scale = _pace(speed, crouched, turning)
		_plant_feet()
		return
	var root := tree.tree_root as AnimationNodeBlendTree
	var act := root.get_node("actclip") as AnimationNodeAnimation
	if act and act.animation != clip and acting:
		act.animation = clip
	elif act and not acting and act.animation != "Armature|Idle":
		act.animation = "Armature|Idle"
	tree.set("parameters/loco/blend_position", blend_speed)
	tree.set("parameters/crouch/blend_position", clampf(speed, 0.0, 1.2))
	tree.set("parameters/stance/blend_amount", _stance)
	tree.set("parameters/pace/scale", _pace(speed, crouched, turning))
	tree.set("parameters/act/scale", _action_pace(air, action))
	tree.set("parameters/mix/blend_amount", _mix)
	if tree.active:
		tree.advance(delta)
	if air == "":
		_plant_feet()

func _clip_for(speed: float, action: String, air: String, turning: bool) -> String:
	if action == "jab":
		return "Armature|Punch_Jab"
	if action == "cross":
		return "Armature|Punch_Cross"
	if action == "kick":
		return "Armature|Push"
	if action == "blade":
		return "Armature|Sword_Attack"
	if action == "tool":
		return "Armature|Interact"
	if action == "roll":
		return "Armature|Roll"
	if action == "guard":
		return "Armature|Sword_Idle"
	if action == "hurt":
		return "Armature|Hit_Chest"
	if air == "start":
		return "Armature|Jump_Start"
	if air == "fall":
		return "Armature|Jump"
	if air == "land":
		return "Armature|Jump_Land"
	if action == "sit" and speed < 0.35:
		return "Armature|Sitting_Idle"
	if action == "crouch":
		return "Armature|Crouch_Fwd" if speed > 0.2 else "Armature|Crouch_Idle"
	if speed < 0.35 and action in ["talk", "teach", "pray", "eat"]:
		return "Armature|Idle_Talking"
	if speed < 0.35 and action in ["carve", "hammer", "hoe", "chop", "open"]:
		return "Armature|Interact"
	if speed < 0.35 and action in ["weave", "bake", "tend", "kneel"]:
		return "Armature|Fixing_Kneeling"
	if turning or (speed > 0.2 and speed < 3.3):
		return "Armature|Walk"
	if speed >= 4.7:
		return "Armature|Sprint"
	if speed >= 3.3:
		return "Armature|Jog_Fwd"
	return "Armature|Idle"

func _pace(speed: float, crouched: bool, turning: bool) -> float:
	if turning and speed < 0.35:
		return 0.7
	if speed < 0.2:
		return 1.0
	if crouched:
		return clampf(speed / 1.05, 0.75, 1.45)
	var authored := 1.28
	if speed >= 4.7:
		authored = 4.6
	elif speed >= 3.3:
		authored = lerpf(1.28, 3.3, clampf((speed - 2.2) / 2.5, 0.0, 1.0))
	return clampf(speed / authored, 0.65, 2.1)

func _action_pace(air: String, action: String) -> float:
	if air == "start":
		return 1.7
	if air == "land":
		return 1.8
	if action in ["carve", "hammer", "hoe", "chop", "open"]:
		return 1.2
	return 1.0

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

func _build_tree() -> void:
	if anim == null:
		_play("Armature|Idle")
		return
	for clip in ["Armature|Idle", "Armature|Walk", "Armature|Jog_Fwd", "Armature|Sprint", "Armature|Crouch_Idle", "Armature|Crouch_Fwd", "Armature|Idle_Talking", "Armature|Sitting_Idle", "Armature|Interact", "Armature|Fixing_Kneeling", "Armature|Jump"]:
		_set_loop(clip, Animation.LOOP_LINEAR)
	for clip in ["Armature|Jump_Start", "Armature|Jump_Land", "Armature|Punch_Jab", "Armature|Punch_Cross", "Armature|Push", "Armature|Sword_Attack", "Armature|Roll", "Armature|Hit_Chest"]:
		_set_loop(clip, Animation.LOOP_NONE)
	_set_loop("Armature|Sword_Idle", Animation.LOOP_LINEAR)
	tree = AnimationTree.new()
	tree.name = "Motion"
	add_child(tree)
	tree.anim_player = tree.get_path_to(anim)
	var root := AnimationNodeBlendTree.new()
	var loco := AnimationNodeBlendSpace1D.new()
	loco.min_space = 0.0
	loco.max_space = 5.5
	_blend_point(loco, "Armature|Idle", 0.0)
	_blend_point(loco, "Armature|Walk", 2.2)
	_blend_point(loco, "Armature|Jog_Fwd", 3.8)
	_blend_point(loco, "Armature|Sprint", 5.5)
	var crouch := AnimationNodeBlendSpace1D.new()
	crouch.min_space = 0.0
	crouch.max_space = 1.2
	_blend_point(crouch, "Armature|Crouch_Idle", 0.0)
	_blend_point(crouch, "Armature|Crouch_Fwd", 1.2)
	var stance := AnimationNodeBlend2.new()
	var pace := AnimationNodeTimeScale.new()
	var actclip := AnimationNodeAnimation.new()
	actclip.animation = "Armature|Idle"
	var act := AnimationNodeTimeScale.new()
	var mix := AnimationNodeBlend2.new()
	root.add_node("loco", loco)
	root.add_node("crouch", crouch)
	root.add_node("stance", stance)
	root.add_node("pace", pace)
	root.add_node("actclip", actclip)
	root.add_node("act", act)
	root.add_node("mix", mix)
	root.connect_node("stance", 0, "loco")
	root.connect_node("stance", 1, "crouch")
	root.connect_node("pace", 0, "stance")
	root.connect_node("act", 0, "actclip")
	root.connect_node("mix", 0, "pace")
	root.connect_node("mix", 1, "act")
	root.connect_node("output", 0, "mix")
	tree.tree_root = root
	tree.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	tree.active = true
	anim.active = false
	_clip = "Armature|Idle"

func _blend_point(space: AnimationNodeBlendSpace1D, clip: String, at: float) -> void:
	var node := AnimationNodeAnimation.new()
	node.animation = clip
	space.add_blend_point(node, at, -1, clip)

func _set_loop(clip: String, mode: Animation.LoopMode) -> void:
	if anim == null or not anim.has_animation(clip):
		return
	var res := anim.get_animation(clip)
	if res:
		res.loop_mode = mode

func _play(clip: String) -> void:
	if anim == null or clip == _clip:
		return
	if not anim.has_animation(clip):
		clip = "Armature|Idle"
		if not anim.has_animation(clip) or clip == _clip:
			return
	_clip = clip
	if clip == "Armature|Interact" or clip == "Armature|Fixing_Kneeling":
		var res := anim.get_animation(clip)
		if res:
			res.loop_mode = Animation.LOOP_LINEAR
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
	if not bool(spec.get("beast", false)):
		_hair(str(spec.get("name", "azad")))
	_base_layer()
	if bool(spec.get("beast", false)):
		var hide := MeshLib.mat("241c16", 0.9)
		for piece in clothing:
			for child in piece.get_children():
				if child is MeshInstance3D:
					(child as MeshInstance3D).material_override = hide
		_foot_cover("foot_l", hide)
		_foot_cover("foot_r", hide)
		return
	if not bool(spec.get("costume", true)):
		_foot_cover("foot_l", shoes)
		_foot_cover("foot_r", shoes)
		return
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

func _base_layer() -> void:
	# Modest shirt and trousers under the costume, so a body can be redesigned
	# without leaving anyone undressed. The costume meshes sit slightly larger.
	var shirt := MeshLib.cloth_mat("e4d2b4", "cotton")
	var pants := MeshLib.cloth_mat("cbb892", "cotton")
	_wrap("spine_03", 0.2, 0.34, shirt, "torso", "base")
	_wrap("spine_02", 0.21, 0.38, shirt, "torso", "base")
	_wrap("spine_01", 0.21, 0.32, shirt, "torso", "base")
	_wrap("pelvis", 0.2, 0.26, pants, "legs", "base")
	_limb("thigh_l", 0.15, 0.1, 0.46, pants, "legs", "base")
	_limb("thigh_r", 0.15, 0.1, 0.46, pants, "legs", "base")
	_limb("calf_l", 0.11, 0.09, 0.62, pants, "legs", "base")
	_limb("calf_r", 0.11, 0.09, 0.62, pants, "legs", "base")

func _make_tool(spec: Dictionary) -> void:
	var prop := str(spec.get("prop", "none"))
	if prop == "none" or skel == null or skel.find_bone("hand_r") < 0:
		return
	var mesh: Mesh = MeshLib.box(0.06, 0.42, 0.06)
	if prop in ["jug", "herb"]:
		mesh = MeshLib.cyl(0.07, 0.22)
	elif prop in ["staff", "hoe", "shuttle"]:
		mesh = MeshLib.cyl(0.025, 0.7)
	var mat := MeshLib.mat("6b4226", 0.8)
	if prop == "jug":
		mat = MeshLib.mat("a89880", 0.75)
	var att := BoneAttachment3D.new()
	att.bone_name = "hand_r"
	att.set_meta("role", "tool")
	att.set_meta("prop", prop)
	skel.add_child(att)
	tool = MeshInstance3D.new()
	tool.mesh = mesh
	tool.material_override = mat
	tool.position = Vector3(0.02, 0.12, 0.04)
	tool.visible = false
	tool.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	att.add_child(tool)

func tool_attached() -> bool:
	return tool != null and tool.get_parent() is BoneAttachment3D and str((tool.get_parent() as BoneAttachment3D).bone_name) == "hand_r"

func _hair(id: String) -> void:
	var tones := ["2a1c14", "3b2418", "1a1a1a", "4a3022", "5a3a28"]
	var mat := MeshLib.mat(tones[absi(id.hash()) % tones.size()], 0.72)
	# The jamane is a band. Hair has to sit on the crown above it, and at the nape.
	_attach("Head", MeshLib.sphere(0.15), mat, Vector3(0, 0.17, -0.02), "head", "body")
	_attach("Head", MeshLib.sphere(0.1), mat, Vector3(0, 0.13, -0.11), "head", "body")
	_attach("Head", MeshLib.sphere(0.055), mat, Vector3(0.09, 0.15, 0.0), "head", "body")

func _turban_mat(id: String) -> Material:
	# Checkered jamane in black, grey, and cream. No red-and-white check.
	var which := absi(id.hash()) % 3
	return MeshLib.cloth_mat("ffffff", "jamane%d" % which)

func _wrap(bone: String, radius: float, height: float, mat: Material, role: String, layer: String = "costume") -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius * 1.06
	mesh.height = height
	mesh.radial_segments = 12
	_attach(bone, mesh, mat, Vector3.ZERO, role, layer)

func _limb(bone: String, r_near: float, r_far: float, length: float, mat: Material, role: String, layer: String = "costume") -> void:
	var along := _toward_child(bone)
	var mesh := CylinderMesh.new()
	# Local +Y points toward the child, which is the cuff or the ankle.
	mesh.top_radius = r_far
	mesh.bottom_radius = r_near
	mesh.height = length
	mesh.radial_segments = 12
	_attach(bone, mesh, mat, along * length * 0.38, role, layer)

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
	_attach(bone, shoe, mat, Vector3.ZERO, "legs", "base")
	var shoe_mi := clothing[clothing.size() - 1].get_child(0) as MeshInstance3D
	shoe_mi.transform = Transform3D(basis, down * 0.08 + fwd * 0.04)
	var cuff := CylinderMesh.new()
	cuff.top_radius = 0.09
	cuff.bottom_radius = 0.11
	cuff.height = 0.28
	cuff.radial_segments = 10
	_attach(bone, cuff, mat, Vector3.ZERO, "legs", "base")
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

func _attach(bone: String, mesh: Mesh, mat: Material, pos: Vector3, role: String, layer: String = "costume") -> void:
	if skel == null or skel.find_bone(bone) < 0:
		return
	var att := BoneAttachment3D.new()
	att.bone_name = bone
	att.add_to_group("clothing")
	att.set_meta("role", role)
	att.set_meta("layer", layer)
	skel.add_child(att)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	att.add_child(mi)
	clothing.append(att)
