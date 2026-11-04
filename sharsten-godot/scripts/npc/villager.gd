extends Node3D

var npc_id := ""
var route: Array = []
var route_i := 0
var walking := false
var work := "idle"
var home := Vector3.ZERO
var rig: HumanRig
var label: Label3D

func setup(spec: Dictionary, entry: Dictionary, loop: Array) -> void:
	npc_id = str(spec.get("id", ""))
	name = npc_id
	add_to_group("villager")
	var at: Array = entry.get("work", [0, 0])
	position = Vector3(float(at[0]), 0.0, float(at[1]))
	var hm: Array = entry.get("home", at)
	home = Vector3(float(hm[0]), 0.0, float(hm[1]))
	rotation.y = float(entry.get("yaw", 0.0))
	walking = bool(entry.get("walk", false))
	work = str(spec.get("work", "idle"))
	if walking:
		route = loop
		route_i = npc_id.length() % maxi(route.size(), 1)
	rig = HumanRig.new()
	add_child(rig)
	rig.setup(spec)
	label = Label3D.new()
	label.text = "%s\n%s" % [spec.get("name", ""), spec.get("gloss", "")]
	label.position = Vector3(0, 2.05 * float(spec.get("height", 1.0)), 0)
	label.font = ThemeDB.fallback_font
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 48
	label.pixel_size = 0.0035
	label.modulate = Color(0.98, 0.95, 0.88)
	label.outline_modulate = Color(0.15, 0.1, 0.08)
	label.outline_size = 8
	label.no_depth_test = false
	add_child(label)

func _process(delta: float) -> void:
	var speed := 0.0
	var hour := GameState.hour()
	var night := hour >= 21 or hour < 5
	var meal := hour == 8 or hour == 18
	if night:
		var to_home := home - global_position
		to_home.y = 0.0
		if to_home.length() > 1.2:
			var dir := to_home.normalized()
			global_position += dir * 0.7 * delta
			rotation.y = lerp_angle(rotation.y, LookMath.face_yaw(dir), 1.0 - exp(-6.0 * delta))
			speed = 0.7
		else:
			rig.tick(delta, 0.0, "sleep")
			_bounds()
			return
	elif walking and route.size() > 1 and not meal:
		var pt: Array = route[route_i]
		var target := Vector3(float(pt[0]), 0.0, float(pt[1]))
		var to := target - global_position
		to.y = 0.0
		if to.length() < 0.5:
			route_i = (route_i + 1) % route.size()
		else:
			var dir := to.normalized()
			global_position += dir * 0.8 * delta
			rotation.y = lerp_angle(rotation.y, LookMath.face_yaw(dir), 1.0 - exp(-6.0 * delta))
			speed = 0.8
	global_position.y = 0.0
	var act := work
	if speed > 0.2:
		act = "walk"
	elif GameState.active_spot != "" and _talks_here():
		act = "talk"
	elif meal:
		act = "eat"
	elif hour == 12 and (npc_id == "mullah_husen" or work == "teach"):
		act = "pray"
	rig.tick(delta, speed, act)
	var player := get_tree().get_first_node_in_group("player")
	if player is Node3D:
		label.visible = global_position.distance_to((player as Node3D).global_position) < 8.0
	_bounds()

func _bounds() -> void:
	var b: Dictionary = ContentDB.layout.get("bounds", {})
	global_position.x = clampf(global_position.x, float(b.get("min_x", -20)) + 2.0, float(b.get("max_x", 140)) - 2.0)
	global_position.z = clampf(global_position.z, float(b.get("min_z", -20)) + 2.0, float(b.get("max_z", 180)) - 2.0)

func _talks_here() -> bool:
	for conv in ContentDB.conversations:
		if str(conv.get("spot", "")) != GameState.active_spot:
			continue
		if (conv.get("speakers", []) as Array).has(npc_id):
			return global_position.distance_to(_spot_pos(str(conv.get("spot", "")))) < 12.0
	return false

func _spot_pos(id: String) -> Vector3:
	var s: Dictionary = ContentDB.spot(id)
	return Vector3(float(s.get("x", 0)), 0, float(s.get("z", 0)))
