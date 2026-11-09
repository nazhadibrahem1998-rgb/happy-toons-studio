extends Control

func _ready() -> void:
	custom_minimum_size = Vector2(520, 420)

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("e7d3a8"))
	var bounds: Dictionary = ContentDB.layout.get("bounds", {})
	var min_x := float(bounds.get("min_x", -4))
	var max_x := float(bounds.get("max_x", 148))
	var min_z := float(bounds.get("min_z", -16))
	var max_z := float(bounds.get("max_z", 184))
	var pent := [Vector2(0, 10), Vector2(26, 2), Vector2(55, 28), Vector2(36, 71), Vector2(10, 71)]
	var poly := PackedVector2Array()
	for p in pent:
		poly.append(_cell(p.x, p.y, min_x, max_x, min_z, max_z))
	draw_colored_polygon(poly, Color("c9b48a"))
	var roads: Dictionary = ContentDB.layout.get("roads", {})
	for key in ["dirt", "stone"]:
		var col := Color("8a6a45") if key == "dirt" else Color("b7a48a")
		var pts: Array = roads.get(key, [])
		var step := 2
		for i in range(0, pts.size(), step):
			var a: Array = pts[i]
			draw_circle(_world(float(a[0]), float(a[1]), min_x, max_x, min_z, max_z), 1.6, col)
	var marks := {
		"mosque": "Mosque",
		"spring": "Spring",
		"stump": "Stump",
		"altar": "Star spring",
		"spoon_bench": "Spoons",
		"tandoor": "Tandoor",
	}
	for id in marks.keys():
		var s: Dictionary = ContentDB.spot(id)
		if s.is_empty():
			continue
		var pt := _world(float(s.get("x", 0)), float(s.get("z", 0)), min_x, max_x, min_z, max_z)
		draw_circle(pt, 3.0, Color("5a3824"))
		draw_string(ThemeDB.fallback_font, pt + Vector2(5, -4), str(marks[id]), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("2a2118"))
	for rune in ContentDB.layout.get("runes", []):
		var at: Array = rune.get("at", [0, 0])
		draw_circle(_world(float(at[0]), float(at[1]), min_x, max_x, min_z, max_z), 2.4, Color("8a7040"))
	var pl: Dictionary = GameState.data.get("player", {})
	var you := _world(float(pl.get("x", 0)), float(pl.get("z", 0)), min_x, max_x, min_z, max_z)
	draw_circle(you, 5.0, Color("8b1e2d"))
	draw_string(ThemeDB.fallback_font, Vector2(8, 18), "A sketch from memory. North is up.", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("3a2a22"))

func _cell(gx: float, gz: float, min_x: float, max_x: float, min_z: float, max_z: float) -> Vector2:
	return _world(gx * 2.4, gz * 2.4, min_x, max_x, min_z, max_z)

func _world(x: float, z: float, min_x: float, max_x: float, min_z: float, max_z: float) -> Vector2:
	var pad := 24.0
	var nx := (x - min_x) / maxf(max_x - min_x, 1.0)
	var nz := (z - min_z) / maxf(max_z - min_z, 1.0)
	return Vector2(pad + nx * (size.x - pad * 2.0), pad + nz * (size.y - pad * 2.0))
