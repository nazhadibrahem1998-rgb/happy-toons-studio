extends Control

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(112, 18)
	size = Vector2(112, 18)
	visible = false

func _process(_delta: float) -> void:
	if visible:
		queue_redraw()

func _draw() -> void:
	var ink := Color(0.97, 0.94, 0.88, 0.92)
	draw_circle(Vector2(7, 9), 3.0, ink)
	draw_arc(Vector2(7, 9), 5.4, -0.4, 2.2, 12, Color(0.97, 0.94, 0.88, 0.55), 1.2, true)
	var font := ThemeDB.fallback_font
	if font == null:
		return
	draw_string(font, Vector2(16, 14), "Saving...", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, ink)
