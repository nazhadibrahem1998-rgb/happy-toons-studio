extends Node3D
class_name HumanRig

var height_mul := 1.0
var phase := 0.0
var locks: Array = [Vector3.ZERO, Vector3.ZERO]
var lock_on: Array = [false, false]
var hips: Node3D
var torso: Node3D
var head: Node3D
var thigh_l: Node3D
var thigh_r: Node3D
var shin_l: Node3D
var shin_r: Node3D
var foot_l: Node3D
var foot_r: Node3D
var shoulder_l: Node3D
var shoulder_r: Node3D
var elbow_l: Node3D
var elbow_r: Node3D
var head_hide: Array = []
var l1 := 0.40
var l2 := 0.38
var action := "idle"
var first_person := false
var _arm_l := 0.42
var _arm_r := 0.42
var _elb := -0.85

func setup(spec: Dictionary) -> void:
	height_mul = float(spec.get("height", 1.0))
	scale = Vector3.ONE * height_mul
	var kind := str(spec.get("kind", "man"))
	var skin := MeshLib.mat(str(spec.get("skin", "8c5a42")), 0.7)
	var cloth := MeshLib.mat(str(spec.get("cloth", "4a4034")), 0.86)
	var shirt := MeshLib.mat(str(spec.get("shirt", "c2a078")), 0.84)
	var sash_c := MeshLib.mat(str(spec.get("sash", "8b1e2d")), 0.75)
	var wrap := MeshLib.mat(str(spec.get("wrap", "d8c4a4")), 0.82)
	var shoe := MeshLib.mat("1a120e", 0.7)
	var dress_c := MeshLib.mat(str(spec.get("dress", spec.get("cloth", "a33b3b"))), 0.84)
	var vest_c := MeshLib.mat(str(spec.get("vest", "3a2a22")), 0.86)

	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 0.92, 0)
	add_child(hips)

	thigh_l = _leg(hips, -0.12, cloth, shoe, kind)
	thigh_r = _leg(hips, 0.12, cloth, shoe, kind)
	shin_l = thigh_l.get_node("Shin")
	shin_r = thigh_r.get_node("Shin")
	foot_l = shin_l.get_node("Foot")
	foot_r = shin_r.get_node("Foot")

	torso = Node3D.new()
	torso.name = "Torso"
	torso.position = Vector3(0, 0.02, 0)
	hips.add_child(torso)
	if kind == "woman" or (kind == "child" and str(spec.get("child_kind", "")) == "girl"):
		MeshLib.part(torso, MeshLib.box(0.42, 0.34, 0.26), shirt, Vector3(0, 0.42, 0))
		MeshLib.part(torso, MeshLib.box(0.55, 0.42, 0.36), dress_c, Vector3(0, 0.18, 0.02))
		MeshLib.part(torso, MeshLib.box(0.72, 0.38, 0.46), dress_c, Vector3(0, -0.16, 0.03))
		MeshLib.part(torso, MeshLib.box(0.34, 0.18, 0.1), vest_c, Vector3(0, 0.5, -0.12))
	elif kind == "mullah":
		MeshLib.part(torso, MeshLib.box(0.42, 0.46, 0.26), shirt, Vector3(0, 0.32, 0))
		MeshLib.part(torso, MeshLib.box(0.62, 1.05, 0.4), MeshLib.mat(str(spec.get("robe", "241c18"))), Vector3(0, 0.12, 0.02))
	else:
		MeshLib.part(torso, MeshLib.box(0.48, 0.28, 0.3), cloth, Vector3(0, 0.02, 0))
		MeshLib.part(torso, MeshLib.box(0.5, 0.46, 0.32), shirt, Vector3(0, 0.32, 0))
		MeshLib.part(torso, MeshLib.box(0.54, 0.22, 0.16), vest_c, Vector3(0, 0.22, -0.12))
	var sash := MeshLib.part(torso, MeshLib.box(0.50 if not bool(spec.get("sash_long", false)) else 0.62, 0.08, 0.30), sash_c, Vector3(0, 0.12, 0))
	sash.rotation.z = 0.18 if kind != "woman" else -0.1
	if bool(spec.get("broad", false)):
		MeshLib.part(torso, MeshLib.box(0.56, 0.16, 0.28), vest_c, Vector3(0, 0.42, 0))

	shoulder_l = _arm(torso, -0.28, shirt, skin)
	shoulder_r = _arm(torso, 0.28, shirt, skin)
	elbow_l = shoulder_l.get_node("Elbow")
	elbow_r = shoulder_r.get_node("Elbow")
	_prop(spec, elbow_r, elbow_l)

	head = Node3D.new()
	head.name = "Head"
	head.position = Vector3(0, 0.62, 0)
	torso.add_child(head)
	var neck := MeshLib.part(head, MeshLib.cyl(0.06, 0.1), skin, Vector3(0, -0.08, 0))
	var skull := MeshLib.part(head, MeshLib.sphere(0.16), skin, Vector3(0, 0.06, 0))
	head_hide = [neck, skull]
	_face(spec, skin)
	_headwear(spec, wrap, kind)
	if bool(spec.get("elder", false)):
		torso.rotation.x = 0.12

func _leg(parent: Node3D, x: float, cloth: Material, shoe: Material, kind: String) -> Node3D:
	var thigh := Node3D.new()
	thigh.position = Vector3(x, 0, 0)
	parent.add_child(thigh)
	var show_leg := kind != "woman"
	if show_leg:
		MeshLib.part(thigh, MeshLib.cyl(0.13, l1), cloth, Vector3(0, -l1 * 0.5, 0))
	var shin := Node3D.new()
	shin.name = "Shin"
	shin.position = Vector3(0, -l1, 0)
	thigh.add_child(shin)
	if show_leg:
		MeshLib.part(shin, MeshLib.cyl(0.065, l2), cloth, Vector3(0, -l2 * 0.5, 0))
	var foot := MeshLib.part(shin, MeshLib.box(0.12, 0.06, 0.22), shoe, Vector3(0, -l2 - 0.02, -0.02))
	foot.name = "Foot"
	return thigh

func _arm(parent: Node3D, x: float, shirt: Material, skin: Material) -> Node3D:
	var sh := Node3D.new()
	sh.position = Vector3(x, 0.42, 0)
	parent.add_child(sh)
	MeshLib.part(sh, MeshLib.cyl(0.05, 0.26), shirt, Vector3(0, -0.13, 0))
	var el := Node3D.new()
	el.name = "Elbow"
	el.position = Vector3(0, -0.26, 0)
	sh.add_child(el)
	MeshLib.part(el, MeshLib.cyl(0.04, 0.22), skin, Vector3(0, -0.11, 0))
	MeshLib.part(el, MeshLib.sphere(0.045), skin, Vector3(0, -0.24, 0))
	sh.rotation = Vector3(0.42, 0, 0.18 if x < 0.0 else -0.18)
	el.rotation.x = -0.85
	return sh

func _face(spec: Dictionary, skin: Material) -> void:
	var white := MeshLib.mat("f4f1ea", 0.45)
	var pupil := MeshLib.mat("1a120e", 0.3)
	var kohl := bool(spec.get("kohl", false))
	for x in [-0.055, 0.055]:
		MeshLib.part(head, MeshLib.sphere(0.028), white, Vector3(x, 0.07, -0.13))
		MeshLib.part(head, MeshLib.sphere(0.014), pupil, Vector3(x, 0.07, -0.15))
		if kohl:
			MeshLib.part(head, MeshLib.box(0.07, 0.012, 0.012), MeshLib.mat("1a120e"), Vector3(x, 0.095, -0.145))
		var brow := MeshLib.part(head, MeshLib.box(0.06, 0.012, 0.012), MeshLib.mat("3a2a22"), Vector3(x, 0.115, -0.14))
		head_hide.append(brow)
	MeshLib.part(head, MeshLib.box(0.04, 0.05, 0.04), MeshLib.mat("e0b090", 0.6), Vector3(0, 0.04, -0.15))
	var mouth := MeshLib.part(head, MeshLib.box(0.06, 0.012, 0.012), MeshLib.mat("8a3a3a", 0.55), Vector3(0, -0.02, -0.15))
	head_hide.append(mouth)
	if bool(spec.get("beard", false)):
		head_hide.append(MeshLib.part(head, MeshLib.box(0.12, 0.08, 0.06), MeshLib.mat("3a2a22"), Vector3(0, -0.04, -0.08)))
	if bool(spec.get("moustache", false)):
		head_hide.append(MeshLib.part(head, MeshLib.box(0.09, 0.02, 0.03), MeshLib.mat("3a2a22"), Vector3(0, -0.005, -0.16)))
	if str(spec.get("hair", "")) == "dark":
		head_hide.append(MeshLib.part(head, MeshLib.sphere(0.17), MeshLib.mat("2a1c16"), Vector3(0, 0.1, 0.02)))

func _headwear(spec: Dictionary, wrap: Material, kind: String) -> void:
	var hw := str(spec.get("headwear", "turban"))
	if kind == "mullah" or hw == "white_turban":
		var turban := MeshLib.part(head, MeshLib.sphere(0.18), MeshLib.mat("f7f4ee"), Vector3(0, 0.12, 0))
		var tail := MeshLib.part(head, MeshLib.box(0.08, 0.28, 0.05), MeshLib.mat("f7f4ee"), Vector3(0.12, -0.02, 0.06))
		head_hide.append(turban)
		head_hide.append(tail)
		return
	if hw == "scarf" or kind == "woman":
		var scarf := MeshLib.part(head, MeshLib.sphere(0.185), wrap, Vector3(0, 0.08, 0))
		var drape := MeshLib.part(head, MeshLib.box(0.16, 0.42, 0.04), wrap, Vector3(0, -0.12, 0.08))
		head_hide.append(scarf)
		head_hide.append(drape)
		if bool(spec.get("coins", false)):
			var gold := MeshLib.mat("e0b040", 0.4, 0.55)
			for i in 5:
				var coin := MeshLib.part(head, MeshLib.sphere(0.018), gold, Vector3(-0.08 + i * 0.04, 0.1, -0.15))
				head_hide.append(coin)
		return
	if hw == "klaw":
		var cap := MeshLib.part(head, MeshLib.cyl(0.15, 0.1), wrap, Vector3(0, 0.16, 0))
		head_hide.append(cap)
		return
	if hw == "headband":
		var band := MeshLib.part(head, MeshLib.box(0.2, 0.035, 0.2), MeshLib.mat(str(spec.get("sash", "3d5a86"))), Vector3(0, 0.1, 0))
		head_hide.append(band)
		var hair := MeshLib.part(head, MeshLib.sphere(0.155), MeshLib.mat("3a2a22"), Vector3(0, 0.12, 0.02))
		head_hide.append(hair)
		return
	var turban2 := MeshLib.part(head, MeshLib.sphere(0.175), wrap, Vector3(0, 0.12, 0))
	var tail2 := MeshLib.part(head, MeshLib.box(0.07, 0.32, 0.04), wrap, Vector3(0.12, -0.05, 0.06))
	head_hide.append(turban2)
	head_hide.append(tail2)

func _prop(spec: Dictionary, hand_r: Node3D, hand_l: Node3D) -> void:
	var wood := MeshLib.mat("6b4226", 0.8)
	var metal := MeshLib.mat("8a8e86", 0.45, 0.35)
	match str(spec.get("prop", "none")):
		"hoe", "axe":
			MeshLib.part(hand_r, MeshLib.box(0.04, 0.5, 0.04), wood, Vector3(0, -0.2, 0.04))
		"staff":
			MeshLib.part(hand_r, MeshLib.box(0.035, 0.9, 0.035), wood, Vector3(0.04, -0.15, 0.04))
		"hammer":
			MeshLib.part(hand_r, MeshLib.box(0.04, 0.32, 0.04), wood, Vector3(0, -0.12, 0))
			MeshLib.part(hand_r, MeshLib.box(0.16, 0.06, 0.06), metal, Vector3(0, -0.26, 0))
		"shuttle":
			MeshLib.part(hand_r, MeshLib.box(0.18, 0.035, 0.045), MeshLib.mat("d2b48a"), Vector3(0, -0.2, 0.04))
		"jug":
			MeshLib.part(hand_l, MeshLib.cyl(0.07, 0.16), MeshLib.mat("c47a3a"), Vector3(0, -0.2, 0.04))
		"spoon":
			MeshLib.part(hand_r, MeshLib.box(0.03, 0.22, 0.05), wood, Vector3(0, -0.16, 0.04))
			MeshLib.part(hand_l, MeshLib.box(0.03, 0.18, 0.045), wood, Vector3(0, -0.18, 0.02))
		"beads":
			var bead := MeshLib.mat("1f6b4a", 0.45)
			for i in 6:
				MeshLib.part(hand_l, MeshLib.sphere(0.018), bead, Vector3(0.02, -0.12 - i * 0.03, 0.02))
		"slate":
			MeshLib.part(hand_l, MeshLib.box(0.16, 0.22, 0.02), MeshLib.mat("d8d0c4"), Vector3(0, -0.1, 0.06))
		"herb":
			MeshLib.part(hand_r, MeshLib.box(0.08, 0.16, 0.04), MeshLib.mat("2f7a38"), Vector3(0, -0.16, 0.04))
		"cloth":
			MeshLib.part(hand_r, MeshLib.box(0.16, 0.08, 0.12), MeshLib.mat("f4efe4"), Vector3(0, -0.16, 0.06))
		"satchel":
			MeshLib.part(torso, MeshLib.box(0.16, 0.18, 0.08), MeshLib.mat("6b4226"), Vector3(-0.18, 0.28, 0.08))
			MeshLib.part(hand_r, MeshLib.cyl(0.045, 0.02), MeshLib.mat("c4a050", 0.4, 0.4), Vector3(0, -0.22, 0.05))
		_:
			pass

func set_first_person(on: bool) -> void:
	first_person = on
	if head:
		head.visible = not on

func tick(delta: float, speed: float, want_action: String) -> void:
	action = want_action
	var moving := speed > 0.18 and (action == "idle" or action == "walk" or action == "talk")
	var running := speed > 2.15
	var freq := 2.15 if running else 1.22
	var stride := 0.62 if running else 0.46
	var lift := 0.12 if running else 0.07
	if moving:
		phase = fposmod(phase + delta * freq, 1.0)
	else:
		phase = fposmod(phase + delta * 0.45, 1.0)
		lock_on = [false, false]
	var bob := sin(phase * TAU) * (0.03 if moving else 0.012)
	hips.position.y = 0.92 + absf(bob) * (0.4 if moving else 1.0)
	var lean := 0.1 if running else 0.05
	if not moving:
		lean = sin(phase * TAU) * 0.03
	torso.rotation.x = lean
	_arms(delta, moving, running)
	if moving:
		_feet(stride, lift, running)
	else:
		_idle_legs()
		_work_arms()

func _arms(delta: float, moving: bool, running: bool) -> void:
	var swing := 0.0
	var target_l := 0.42
	var target_r := 0.42
	var target_e := -0.85
	if moving:
		swing = sin(phase * TAU) * (0.62 if running else 0.4)
		target_l = 0.28 - swing
		target_r = 0.28 + swing
		target_e = -0.55 - absf(swing) * 0.45
	var k := 1.0 - exp(-9.0 * delta)
	_arm_l = lerpf(_arm_l, target_l, k)
	_arm_r = lerpf(_arm_r, target_r, k)
	_elb = lerpf(_elb, target_e, k)
	shoulder_l.rotation.x = _arm_l
	shoulder_r.rotation.x = _arm_r
	elbow_l.rotation.x = _elb
	elbow_r.rotation.x = _elb

func _work_arms() -> void:
	var s := sin(phase * TAU * 1.4)
	match action:
		"carve", "hammer", "hoe":
			shoulder_r.rotation.x = -1.05 + s * 0.4
			elbow_r.rotation.x = -0.55
			torso.rotation.x = 0.18 + s * 0.06
		"weave", "bake", "tend", "eat":
			shoulder_l.rotation.x = -0.75
			shoulder_r.rotation.x = -0.65 + s * 0.28
			elbow_l.rotation.x = -1.0
			elbow_r.rotation.x = -0.9
		"teach", "talk":
			shoulder_r.rotation.x = -0.85 + s * 0.22
			elbow_r.rotation.x = -0.7
			head.rotation.y = s * 0.18
		"pray":
			shoulder_l.rotation.x = -0.35
			shoulder_r.rotation.x = -0.35
			elbow_l.rotation.x = -1.35
			elbow_r.rotation.x = -1.35
			head.rotation.x = 0.25
		"sleep":
			shoulder_l.rotation.x = 0.1
			shoulder_r.rotation.x = 0.1
			elbow_l.rotation.x = -0.4
			elbow_r.rotation.x = -0.4
			torso.rotation.x = 0.7
			head.rotation.x = 0.4
		_:
			head.rotation.y = sin(phase * TAU) * 0.05

func _idle_legs() -> void:
	thigh_l.rotation = Vector3(0.04, 0, 0)
	thigh_r.rotation = Vector3(0.04, 0, 0)
	shin_l.rotation = Vector3(0.08, 0, 0)
	shin_r.rotation = Vector3(0.08, 0, 0)

func _feet(stride: float, lift: float, _running: bool) -> void:
	var forward := -global_transform.basis.z
	forward.y = 0.0
	if forward.length() < 0.001:
		forward = Vector3(0, 0, -1)
	forward = forward.normalized()
	var side := global_transform.basis.x
	side.y = 0.0
	side = side.normalized()
	for i in 2:
		var sx := -0.12 if i == 0 else 0.12
		var lp := fposmod(phase + float(i) * 0.5, 1.0)
		var hip := (thigh_l if i == 0 else thigh_r).global_position
		var ahead := hip + side * sx + forward * stride * 0.45
		var behind := hip + side * sx - forward * stride * 0.45
		var foot := Vector3.ZERO
		if lp < 0.42:
			lock_on[i] = false
			var t := lp / 0.42
			var sm := t * t * (3.0 - 2.0 * t)
			foot = behind.lerp(ahead, sm)
			foot.y = sin(t * PI) * lift
		else:
			if not lock_on[i]:
				locks[i] = hip + side * sx + forward * stride * 0.05
				locks[i].y = 0.02
				lock_on[i] = true
			foot = locks[i]
			foot.y = 0.02
		_solve(i, foot)

func _solve(i: int, foot_world: Vector3) -> void:
	var thigh: Node3D = thigh_l if i == 0 else thigh_r
	var shin: Node3D = shin_l if i == 0 else shin_r
	var parent := thigh.get_parent() as Node3D
	var local: Vector3 = parent.to_local(foot_world) - thigh.position
	var dist := clampf(local.length(), 0.16, l1 + l2 - 0.02)
	var horiz := Vector2(local.x, local.z).length()
	var dir_pitch := atan2(-local.y, maxf(horiz, 0.001))
	var yaw := atan2(local.x, local.z)
	var cos_knee := clampf((l1 * l1 + l2 * l2 - dist * dist) / (2.0 * l1 * l2), -1.0, 1.0)
	var bend := PI - acos(cos_knee)
	var cos_hip := clampf((l1 * l1 + dist * dist - l2 * l2) / (2.0 * l1 * dist), -1.0, 1.0)
	var hip_off := acos(cos_hip)
	thigh.rotation = Vector3(dir_pitch - hip_off, yaw, 0.0)
	shin.rotation = Vector3(bend, 0.0, 0.0)

func foot_world(i: int) -> Vector3:
	var foot: Node3D = foot_l if i == 0 else foot_r
	return foot.global_position
