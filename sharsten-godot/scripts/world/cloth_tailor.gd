extends RefCounted
class_name ClothTailor

## Skinned cloth on the Quaternius rig. Vertices live in skeleton space and
## follow the bones, with flare at the hip and a narrower ankle or wrist.

static func wear(rig: HumanRig, skel: Skeleton3D, spec: Dictionary) -> void:
	var girl := str(spec.get("kind", "")) == "woman" or str(spec.get("child_kind", "")) == "girl"
	var mullah := str(spec.get("kind", "")) == "mullah"
	var festive := bool(spec.get("coins", false))
	var wool := _col(str(spec.get("cloth", "5a4636")))
	var shirt := _col(str(spec.get("shirt", "f4f1ea")))
	var dress := _col(str(spec.get("dress", spec.get("cloth", "6a3038"))))
	var sash := _col(str(spec.get("sash", "3a322c")))
	var wrap := _col(str(spec.get("wrap", "d8c4a4")))
	if not festive and not mullah:
		wool = wool.lerp(Color("3a322c"), 0.45)
		dress = dress.lerp(Color("4a342c"), 0.4)
		shirt = shirt.lerp(Color("f7f4ee"), 0.35)
	var turban := _turban_color(str(spec.get("id", spec.get("name", "azad"))))
	if mullah:
		_tube(rig, skel, [
			["neck_01", 0.12], ["spine_03", 0.2], ["spine_02", 0.24], ["spine_01", 0.23], ["pelvis", 0.22],
		], Color("241c18"), Color("241c18"), "torso", 0.02)
		_limb_cloth(rig, skel, "thigh_l", "calf_l", "foot_l", 0.16, 0.1, Color("241c18"), Color("241c18"), "legs")
		_limb_cloth(rig, skel, "thigh_r", "calf_r", "foot_r", 0.16, 0.1, Color("241c18"), Color("241c18"), "legs")
		_limb_cloth(rig, skel, "upperarm_l", "lowerarm_l", "hand_l", 0.09, 0.11, Color("241c18"), Color("241c18"), "torso")
		_limb_cloth(rig, skel, "upperarm_r", "lowerarm_r", "hand_r", 0.09, 0.11, Color("241c18"), Color("241c18"), "torso")
		_band(rig, skel, "spine_01", 0.26, 0.05, sash, sash, "sash")
		_cap(rig, skel, Color("f7f4ee"), Color("f7f4ee"), false)
	elif girl:
		var body := dress if not festive else dress.lerp(Color("f4c400"), 0.15)
		_tube(rig, skel, [
			["neck_01", 0.11], ["spine_03", 0.2], ["spine_02", 0.23], ["spine_01", 0.24], ["pelvis", 0.28],
		], body, body.lerp(Color("f7f1e4"), 0.15), "torso", 0.04)
		_limb_cloth(rig, skel, "thigh_l", "calf_l", "foot_l", 0.16, 0.1, body, body, "legs")
		_limb_cloth(rig, skel, "thigh_r", "calf_r", "foot_r", 0.16, 0.1, body, body, "legs")
		_limb_cloth(rig, skel, "upperarm_l", "lowerarm_l", "hand_l", 0.08, 0.12, body, shirt, "torso")
		_limb_cloth(rig, skel, "upperarm_r", "lowerarm_r", "hand_r", 0.08, 0.12, body, shirt, "torso")
		_band(rig, skel, "spine_02", 0.2, 0.16, _col(str(spec.get("vest", "3a2a22"))), body, "torso")
		_band(rig, skel, "spine_01", 0.27, 0.045, Color("c0c4c8") if festive else sash, sash, "sash")
		if festive:
			_band(rig, skel, "neck_01", 0.1, 0.02, Color("e0b040"), Color("f4e2a0"), "head")
		_cap(rig, skel, wrap, wrap.darkened(0.15), true)
	else:
		var suit := wool
		var stripe := suit.lerp(Color("e7d3b0"), 0.55)
		_tube(rig, skel, [
			["neck_01", 0.12], ["spine_03", 0.21], ["spine_02", 0.25], ["spine_01", 0.24], ["pelvis", 0.23],
		], shirt, shirt.lerp(stripe, 0.25), "torso", 0.015)
		_tube(rig, skel, [
			["spine_03", 0.23], ["spine_02", 0.27], ["spine_01", 0.26],
		], suit, stripe, "torso", 0.03)
		_limb_cloth(rig, skel, "thigh_l", "calf_l", "foot_l", 0.2, 0.08, suit, stripe, "legs")
		_limb_cloth(rig, skel, "thigh_r", "calf_r", "foot_r", 0.2, 0.08, suit, stripe, "legs")
		_limb_cloth(rig, skel, "upperarm_l", "lowerarm_l", "hand_l", 0.09, 0.13, shirt, shirt, "torso")
		_limb_cloth(rig, skel, "upperarm_r", "lowerarm_r", "hand_r", 0.09, 0.13, shirt, shirt, "torso")
		_band(rig, skel, "spine_01", 0.28, 0.055, sash, sash.darkened(0.2), "sash")
		_cap(rig, skel, turban, Color("f7f4ee"), false)
	_shoe(rig, skel, "foot_l")
	_shoe(rig, skel, "foot_r")

static func _turban_color(id: String) -> Color:
	var palette := [Color("1c1c1c"), Color("8a8680"), Color("f3f0ea")]
	return palette[absi(id.hash()) % palette.size()]

static func _col(hex: String) -> Color:
	if hex.is_empty():
		return Color("6b5344")
	return Color(hex)

static func _tube(rig: HumanRig, skel: Skeleton3D, stations: Array, a: Color, b: Color, role: String, fold: float) -> void:
	var pts: Array = []
	for i in stations.size():
		var bone := str(stations[i][0])
		var radius := float(stations[i][1])
		var idx := skel.find_bone(bone)
		if idx < 0:
			continue
		var origin: Vector3 = skel.get_bone_global_rest(idx).origin
		pts.append({"p": origin, "r": radius, "b": idx})
	if pts.size() < 2:
		return
	_loft(rig, skel, pts, a, b, role, fold)

static func _limb_cloth(rig: HumanRig, skel: Skeleton3D, a: String, b: String, c: String, r0: float, r1: float, col_a: Color, col_b: Color, role: String) -> void:
	var names := [a, b, c]
	var radii := [r0, lerpf(r0, r1, 0.45), r1]
	var stations: Array = []
	for i in names.size():
		stations.append([names[i], radii[i]])
	_tube(rig, skel, stations, col_a, col_b, role, 0.035)

static func _band(rig: HumanRig, skel: Skeleton3D, bone: String, radius: float, height: float, a: Color, b: Color, role: String) -> void:
	var idx := skel.find_bone(bone)
	if idx < 0:
		return
	var origin: Vector3 = skel.get_bone_global_rest(idx).origin
	var up := Vector3.UP
	_loft(rig, skel, [
		{"p": origin + up * height, "r": radius, "b": idx},
		{"p": origin - up * height, "r": radius * 1.04, "b": idx},
	], a, b, role, 0.0)

static func _cap(rig: HumanRig, skel: Skeleton3D, cloth: Color, cap: Color, scarf: bool) -> void:
	var idx := skel.find_bone("Head")
	if idx < 0:
		return
	var origin: Vector3 = skel.get_bone_global_rest(idx).origin
	_loft(rig, skel, [
		{"p": origin + Vector3(0, 0.16, 0), "r": 0.05, "b": idx},
		{"p": origin + Vector3(0, 0.1, 0), "r": 0.13, "b": idx},
		{"p": origin + Vector3(0, 0.05, 0), "r": 0.15, "b": idx},
	], cap, cloth, "head", 0.0)
	var dark := cloth.darkened(0.55)
	_loft(rig, skel, [
		{"p": origin + Vector3(0, 0.08, 0), "r": 0.16, "b": idx},
		{"p": origin + Vector3(0, 0.02, 0), "r": 0.17, "b": idx},
	], dark, cloth, "head", 0.0)
	if scarf:
		_loft(rig, skel, [
			{"p": origin + Vector3(0, 0.04, -0.02), "r": 0.12, "b": idx},
			{"p": origin + Vector3(0, -0.16, -0.08), "r": 0.08, "b": idx},
		], cloth, cloth.darkened(0.1), "head", 0.02)

static func _shoe(rig: HumanRig, skel: Skeleton3D, bone: String) -> void:
	var idx := skel.find_bone(bone)
	if idx < 0:
		return
	var origin: Vector3 = skel.get_bone_global_rest(idx).origin
	_loft(rig, skel, [
		{"p": origin + Vector3(0, 0.04, 0), "r": 0.07, "b": idx},
		{"p": origin + Vector3(0, -0.02, 0.04), "r": 0.08, "b": idx},
	], Color("f7f4ee"), Color("f4efe6"), "legs", 0.0)

static func _loft(rig: HumanRig, skel: Skeleton3D, pts: Array, a: Color, b: Color, role: String, fold: float) -> void:
	var sides := 10
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in pts.size():
		var center: Vector3 = pts[i]["p"]
		var radius: float = pts[i]["r"]
		var bone: int = pts[i]["b"]
		var prev: Vector3 = pts[i - 1]["p"] if i > 0 else center
		var nxt: Vector3 = pts[i + 1]["p"] if i + 1 < pts.size() else center
		var dir := nxt - prev
		if dir.length() < 0.001:
			dir = Vector3.UP
		dir = dir.normalized()
		var side := dir.cross(Vector3.UP)
		if side.length() < 0.001:
			side = dir.cross(Vector3.FORWARD)
		side = side.normalized()
		var up := side.cross(dir).normalized()
		var col := a.lerp(b, float(i) / maxf(pts.size() - 1, 1))
		if fold > 0.0 and i % 2 == 0:
			radius *= 1.0 + fold
			col = col.lerp(b, 0.35)
		for s in sides:
			var ang := float(s) / float(sides) * TAU
			var n := side * cos(ang) + up * sin(ang)
			st.set_color(col)
			st.set_normal(n)
			st.set_bones(PackedInt32Array([bone, 0, 0, 0]))
			st.set_weights(PackedFloat32Array([1.0, 0.0, 0.0, 0.0]))
			st.add_vertex(center + n * radius)
	for i in pts.size() - 1:
		for s in sides:
			var a0 := i * sides + s
			var a1 := i * sides + (s + 1) % sides
			var b0 := (i + 1) * sides + s
			var b1 := (i + 1) * sides + (s + 1) % sides
			st.add_index(a0)
			st.add_index(b0)
			st.add_index(a1)
			st.add_index(a1)
			st.add_index(b0)
			st.add_index(b1)
	var mesh := st.commit()
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.9
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.set_meta("role", role)
	skel.add_child(mi)
	mi.skin = skel.create_skin_from_rest_transforms()
	mi.skeleton = NodePath("..")
	rig.clothing.append(mi)
