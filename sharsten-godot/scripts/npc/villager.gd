extends CharacterBody3D

var npc_id := ""
var route: Array = []
var route_i := 0
var walking := false
var work := "idle"
var home := Vector3.ZERO
var work_at := Vector3.ZERO
var inside := Vector3.ZERO
var rig: HumanRig
var agent: NavigationAgent3D
var _speed := 0.0

func setup(spec: Dictionary, entry: Dictionary, loop: Array) -> void:
	npc_id = str(spec.get("id", ""))
	name = npc_id
	add_to_group("villager")
	collision_layer = 0 if OS.has_feature("headless") else 4
	collision_mask = 0 if OS.has_feature("headless") else 1
	floor_snap_length = 0.2
	var shape := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.32
	cap.height = 1.15
	shape.shape = cap
	shape.position = Vector3(0, 0.75, 0)
	add_child(shape)
	var at: Array = entry.get("work", [0, 0])
	work_at = Vector3(float(at[0]), 0.05, float(at[1]))
	position = work_at
	var hm: Array = entry.get("home", at)
	home = Vector3(float(hm[0]), 0.0, float(hm[1]))
	var inn: Array = entry.get("inside", [home.x, home.z])
	inside = Vector3(float(inn[0]), 0.05, float(inn[1]))
	rotation.y = float(entry.get("yaw", 0.0))
	walking = bool(entry.get("walk", false))
	work = str(spec.get("work", "idle"))
	if walking:
		route = loop
		route_i = npc_id.length() % maxi(route.size(), 1)
	agent = NavigationAgent3D.new()
	agent.path_desired_distance = 0.45
	agent.target_desired_distance = 0.5
	agent.radius = 0.4
	agent.height = 1.6
	agent.avoidance_enabled = not OS.has_feature("headless")
	agent.max_speed = 1.1
	add_child(agent)
	if not OS.has_feature("headless"):
		rig = HumanRig.new()
		add_child(rig)
		rig.setup(spec)
	call_deferred("_set_target")

func _set_target() -> void:
	if agent == null:
		return
	agent.target_position = _goal()

static var _day: Array = []

static func phase_for(hour: int) -> String:
	if _day.is_empty():
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/world_rules.json"))
		if typeof(parsed) == TYPE_DICTIONARY:
			_day = parsed.get("day", [])
		if _day.is_empty():
			_day = [
				{"from": 0, "to": 5, "phase": "home"},
				{"from": 5, "to": 8, "phase": "leave"},
				{"from": 8, "to": 18, "phase": "work"},
				{"from": 18, "to": 21, "phase": "return"},
				{"from": 21, "to": 24, "phase": "home"},
			]
	var h := posmod(hour, 24)
	for row in _day:
		if h >= int(row.get("from", 0)) and h < int(row.get("to", 24)):
			return str(row.get("phase", "work"))
	return "work"

func _goal() -> Vector3:
	var phase := phase_for(GameState.hour())
	if phase == "home":
		if global_position.distance_to(home) < 1.6 or global_position.distance_to(inside) < 2.2:
			return inside
		return home
	if phase == "leave":
		if global_position.distance_to(inside) < 1.4:
			return home
		return work_at
	if phase == "return":
		return home
	if walking and route.size() > 0 and phase == "work":
		var pt: Array = route[route_i]
		return Vector3(float(pt[0]), 0.0, float(pt[1]))
	if phase == "work":
		return work_at
	return work_at

func _physics_process(delta: float) -> void:
	var hour := GameState.hour()
	var phase := phase_for(hour)
	var night := phase == "home"
	var meal := hour == 8 or hour == 18
	_touch_door(phase)
	var next := global_position
	if OS.has_feature("headless"):
		next = _goal()
		if walking and not night and route.size() > 1 and global_position.distance_to(next) < 0.6:
			route_i = (route_i + 1) % route.size()
			next = _goal()
	else:
		if agent.is_navigation_finished() or global_position.distance_to(_goal()) < 0.6:
			if walking and not night and route.size() > 1:
				route_i = (route_i + 1) % route.size()
			agent.target_position = _goal()
		if Engine.get_physics_frames() % 6 == 0 or not has_meta("nav_next"):
			next = agent.get_next_path_position()
			set_meta("nav_next", next)
		else:
			next = get_meta("nav_next")
	var dir := next - global_position
	dir.y = 0.0
	_speed = 0.0
	var arrived_home := night and global_position.distance_to(inside) < 0.8
	if dir.length() > 0.35 and not arrived_home and not meal:
		dir = dir.normalized()
		_speed = 0.85 * _purse_pace()
		velocity.x = dir.x * _speed
		velocity.z = dir.z * _speed
		rotation.y = lerp_angle(rotation.y, LookMath.face_yaw(dir), 1.0 - exp(-6.0 * delta))
	else:
		velocity.x = 0.0
		velocity.z = 0.0
	if OS.has_feature("headless"):
		global_position += Vector3(velocity.x, 0, velocity.z) * delta
		if _inside_house():
			global_position = _escape_house()
		return
	if not is_on_floor():
		velocity.y -= 20.0 * delta
	else:
		velocity.y = -2.0
	move_and_slide()
	# Never remain inside a house. Step back out along the last slide.
	if _inside_house():
		global_position = _escape_house()
		velocity = Vector3.ZERO
	var act := work
	var social := choose_social(_nearest_villager_distance(), true, str(name).begins_with("kura") or str(name).begins_with("nabata") or str(name).begins_with("kcha") or str(name).begins_with("gyana"), meal)
	if _speed > 0.2:
		act = "walk"
	elif social == "tea":
		act = "sit"
	elif social == "greet" or social == "help":
		act = "talk"
	elif social == "play":
		act = "walk"
	elif GameState.active_spot != "" and _talks_here():
		act = "talk"
	elif meal:
		act = "eat"
	elif _near_seat():
		act = "sit"
	elif night:
		act = "idle"
	elif phase == "work" and _speed < 0.2:
		act = _work_act()
	elif hour == 12 and (npc_id == "mullah_husen" or work == "teach"):
		act = "pray"
	if rig and _should_animate():
		rig.tick(delta, _speed, act)

func _work_act() -> String:
	if work in ["hoe", "hammer", "carve"]:
		return "chop"
	if work in ["weave", "bake", "tend"]:
		return "kneel"
	if work == "talk":
		return "chop" if str(name).find("direzh") >= 0 else "talk"
	return work

func _should_animate() -> bool:
	var player := get_tree().get_first_node_in_group("player")
	if player == null or not player is Node3D:
		return true
	if global_position.distance_squared_to((player as Node3D).global_position) < 900.0:
		return true
	return Engine.get_physics_frames() % 10 == 0

func _touch_door(phase: String) -> void:
	var door := _my_door()
	if door == null or not door.has_method("set_open"):
		return
	var dist := global_position.distance_to(door.global_position)
	var crossing := phase == "home" or phase == "leave" or phase == "return"
	if crossing and dist < 2.2:
		door.set_open(true, npc_id)
	elif dist > 3.4 and str(door.opened_by) == npc_id:
		door.set_open(false, npc_id)

func _my_door() -> Node:
	for door in get_tree().get_nodes_in_group("house_door"):
		if str(door.get_meta("resident", "")) == npc_id:
			return door
	return null

func is_home() -> bool:
	return phase_for(GameState.hour()) == "home" and _in_own_house()

func _purse_pace() -> float:
	var folk: Dictionary = GameState.data.get("folk", {})
	var row: Dictionary = folk.get(npc_id, {})
	var routine := str(row.get("routine", ""))
	if routine.find("shorter") >= 0 or routine.find("aside") >= 0:
		return 0.8
	if str(row.get("mood", "")) == "busy" or routine.find("dawn") >= 0:
		return 1.15
	return 1.0

func choose_social(dist: float, other_is_villager: bool, child: bool, meal: bool) -> String:
	# Gestures are only between villagers. The player is never a partner.
	if not other_is_villager or dist > 2.4:
		return "play" if child and dist > 2.4 else ""
	if meal:
		return "tea"
	if child:
		return "play"
	return "greet" if dist > 1.2 else "help"

func _nearest_villager_distance() -> float:
	var best := 99.0
	for v in get_tree().get_nodes_in_group("villager"):
		if v == self:
			continue
		best = minf(best, global_position.distance_to(v.global_position))
	return best

func _solid_nodes() -> Array:
	var nodes: Array = []
	nodes.append_array(get_tree().get_nodes_in_group("house_block"))
	nodes.append_array(get_tree().get_nodes_in_group("furniture"))
	return nodes

func _inside_house() -> bool:
	if _in_own_house() and phase_for(GameState.hour()) == "home":
		return false
	return _inside_group("house_block") or _inside_group("furniture")

func _in_own_house() -> bool:
	var p := Vector2(global_position.x, global_position.z)
	for h in get_tree().get_nodes_in_group("house_block"):
		if str(h.get_meta("resident", "")) != npc_id or not h.has_meta("min_xz"):
			continue
		var mn: Vector2 = h.get_meta("min_xz")
		var mx: Vector2 = h.get_meta("max_xz")
		if p.x > mn.x and p.x < mx.x and p.y > mn.y and p.y < mx.y:
			return true
	return false

func _inside_group(group: String) -> bool:
	var p := Vector2(global_position.x, global_position.z)
	for h in get_tree().get_nodes_in_group(group):
		if not h.has_meta("min_xz"):
			continue
		var mn: Vector2 = h.get_meta("min_xz")
		var mx: Vector2 = h.get_meta("max_xz")
		if p.x > mn.x and p.x < mx.x and p.y > mn.y and p.y < mx.y:
			return true
	return false

func _escape_house() -> Vector3:
	var p := Vector2(global_position.x, global_position.z)
	var best := global_position
	var best_d := 9999.0
	for h in _solid_nodes():
		var mn: Vector2 = h.get_meta("min_xz")
		var mx: Vector2 = h.get_meta("max_xz")
		if p.x > mn.x and p.x < mx.x and p.y > mn.y and p.y < mx.y:
			var cx := (mn.x + mx.x) * 0.5
			var cz := (mn.y + mx.y) * 0.5
			var out := Vector2(p.x - cx, p.y - cz)
			if out.length() < 0.01:
				out = Vector2(1, 0)
			out = out.normalized()
			var edge := Vector2(mx.x - mn.x, mx.y - mn.y) * 0.5
			var dist := maxf(edge.x, edge.y) + 0.8
			var cand := Vector3(cx + out.x * dist, 0.05, cz + out.y * dist)
			var d := cand.distance_to(global_position)
			if d < best_d:
				best_d = d
				best = cand
	return best

func _near_seat() -> bool:
	if _speed > 0.2:
		return false
	for n in get_tree().get_nodes_in_group("seat"):
		if n is Node3D and global_position.distance_to((n as Node3D).global_position) < 1.25:
			return true
	return false

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
