extends Control

## A parchment sketch of the valley. Corner, large, or the diary page.
## Marks are places, not names floating over people.

var mode := "corner"

const PLACES := [
	{"id": "mosque", "name": "Mosque", "shape": "square", "color": "5a3824"},
	{"id": "spring", "name": "Spring", "shape": "circle", "color": "4f6e78"},
	{"id": "stump", "name": "Stump", "shape": "tri", "color": "6b4226"},
	{"id": "tandoor", "name": "Tandoor", "shape": "square", "color": "8a5a3a"},
	{"id": "spoon_bench", "name": "Spoons", "shape": "diamond", "color": "8a623c"},
	{"id": "altar", "name": "Star spring", "shape": "diamond", "color": "8a7040"},
]

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	if mode == "diary":
		custom_minimum_size = Vector2(520, 420)

func corner_side(vp: Vector2) -> float:
	return clampf(minf(vp.x, vp.y) * 0.17, 128.0, 188.0)

func _process(_delta: float) -> void:
	if mode == "diary":
		if size.x < 32.0:
			size = Vector2(520, 420)
		queue_redraw()
		return
	var vp := get_viewport().get_visible_rect().size
	if mode == "large":
		var side := clampf(minf(vp.x, vp.y) * 0.72, 420.0, 820.0)
		size = Vector2(side, side * 0.92)
		position = (vp - size) * 0.5
		mouse_filter = Control.MOUSE_FILTER_STOP
	else:
		var side := corner_side(vp)
		size = Vector2(side, side)
		position = Vector2(vp.x - side - 16.0, 16.0)
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()

func _draw() -> void:
	if not is_instance_valid(ContentDB):
		return
	var pad := 8.0 if mode == "corner" else 14.0
	draw_rect(Rect2(Vector2.ZERO, size), Color("5a3824"))
	var area := Rect2(Vector2(pad, pad), size - Vector2(pad * 2.0, pad * 2.0))
	if area.size.x < 8.0 or area.size.y < 8.0:
		return
	draw_rect(area, Color("e7d3a8"))
	var bounds: Dictionary = ContentDB.layout.get("bounds", {})
	var pent := [Vector2(0, 10), Vector2(26, 2), Vector2(55, 28), Vector2(36, 71), Vector2(10, 71)]
	var poly := PackedVector2Array()
	for p in pent:
		poly.append(_cell(p.x, p.y, bounds, area))
	if poly.size() >= 3:
		draw_colored_polygon(poly, Color("c9b48a"))
	var roads: Dictionary = ContentDB.layout.get("roads", {})
	var dot := 1.15 if mode == "corner" else 1.7
	for key in ["dirt", "stone"]:
		var col := Color("8a6a45") if key == "dirt" else Color("b7a48a")
		for a in roads.get(key, []):
			if typeof(a) != TYPE_ARRAY or a.size() < 2:
				continue
			draw_circle(_world(float(a[0]), float(a[1]), bounds, area), dot, col)
	var named := area.size.x > 280.0
	var mark := 3.2 if mode == "corner" else 5.0
	for place in PLACES:
		var spot: Dictionary = ContentDB.spot(str(place["id"]))
		if spot.is_empty():
			continue
		var pt := _world(float(spot.get("x", 0)), float(spot.get("z", 0)), bounds, area)
		_mark(pt, str(place["shape"]), Color(str(place["color"])), mark)
		if named:
			_ink(pt + Vector2(mark + 3.0, -2.0), str(place["name"]), 14)
	var focus: Dictionary = GameState.objective_focus()
	if bool(focus.get("marked", false)):
		var goal := _world(float(focus.get("x", 0)), float(focus.get("z", 0)), bounds, area)
		var pulse := 0.65 + 0.35 * sin(Time.get_ticks_msec() / 1000.0 * 3.2)
		var radius := (7.0 if mode != "corner" else 5.0) + pulse * 1.6
		draw_arc(goal, radius, 0.0, TAU, 18, Color("8a7040"), 1.6, true)
		draw_circle(goal, 2.3 if mode == "corner" else 3.2, Color("c2a06a"))
	var pose := _player_pose()
	var you := _world(float(pose["x"]), float(pose["z"]), bounds, area)
	_arrow(you, float(pose["yaw"]), 0.85 if mode == "corner" else 1.25)
	_ink(area.position + Vector2(4, 13), "N", 12)
	if named:
		var foot := "North is up"
		if mode == "large":
			foot = "North is up     M closes     H shows the deed"
		_ink(Vector2(area.position.x + 8.0, area.end.y - 6.0), foot, 14)

func _mark(pt: Vector2, shape: String, col: Color, r: float) -> void:
	if shape == "circle":
		draw_circle(pt, r, col)
	elif shape == "diamond":
		draw_colored_polygon(PackedVector2Array([
			pt + Vector2(0, -r), pt + Vector2(r, 0), pt + Vector2(0, r), pt + Vector2(-r, 0)
		]), col)
	elif shape == "tri":
		draw_colored_polygon(PackedVector2Array([
			pt + Vector2(0, -r), pt + Vector2(r * 0.9, r * 0.75), pt + Vector2(-r * 0.9, r * 0.75)
		]), col)
	else:
		draw_rect(Rect2(pt - Vector2(r, r), Vector2(r * 2.0, r * 2.0)), col)

func _arrow(at: Vector2, yaw: float, scale: float) -> void:
	var fx := -sin(yaw)
	var fz := -cos(yaw)
	var rot := atan2(fx, -fz)
	var tip := Vector2(0, -8.0 * scale)
	var left := Vector2(-4.6 * scale, 6.0 * scale)
	var right := Vector2(4.6 * scale, 6.0 * scale)
	draw_set_transform(at, rot, Vector2.ONE)
	draw_colored_polygon(PackedVector2Array([tip, left, right]), Color("8b1e2d"))
	draw_polyline(PackedVector2Array([tip, left, right, tip]), Color("2a2118"), 1.2, true)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _ink(at: Vector2, text: String, px: int) -> void:
	var font := ThemeDB.fallback_font
	if font == null:
		return
	draw_string(font, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1, px, Color("2a2118"))

func _player_pose() -> Dictionary:
	if is_inside_tree():
		var body := get_tree().get_first_node_in_group("player")
		if body:
			return {"x": body.global_position.x, "z": body.global_position.z, "yaw": float(body.yaw)}
	var pl: Dictionary = GameState.data.get("player", {})
	return {"x": float(pl.get("x", 0.0)), "z": float(pl.get("z", 0.0)), "yaw": float(pl.get("yaw", 0.0))}

func _cell(gx: float, gz: float, bounds: Dictionary, area: Rect2) -> Vector2:
	return _world(gx * 2.4, gz * 2.4, bounds, area)

func _world(x: float, z: float, bounds: Dictionary, area: Rect2) -> Vector2:
	var min_x := float(bounds.get("min_x", -4.0))
	var max_x := float(bounds.get("max_x", 148.0))
	var min_z := float(bounds.get("min_z", -16.0))
	var max_z := float(bounds.get("max_z", 184.0))
	var nx := (x - min_x) / maxf(max_x - min_x, 1.0)
	var nz := (z - min_z) / maxf(max_z - min_z, 1.0)
	return Vector2(area.position.x + nx * area.size.x, area.position.y + nz * area.size.y)
