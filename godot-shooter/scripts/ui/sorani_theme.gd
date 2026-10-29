class_name SoraniTheme
extends RefCounted

const REGULAR: Font = preload("res://assets/fonts/Vazirmatn-Regular.ttf")
const BOLD: Font = preload("res://assets/fonts/Vazirmatn-Bold.ttf")


static func regular() -> Font:
	return REGULAR


static func bold() -> Font:
	return BOLD


static func make() -> Theme:
	var theme := Theme.new()
	theme.default_font = REGULAR
	theme.default_font_size = 22
	var normal := _box(Color(0.16, 0.13, 0.11, 0.94), Color(0.55, 0.42, 0.28, 0.85))
	var hover := _box(Color(0.28, 0.20, 0.15, 0.98), Color(0.72, 0.55, 0.34, 0.95))
	var pressed := _box(Color(0.10, 0.08, 0.07, 0.98), Color(0.45, 0.32, 0.22, 0.9))
	theme.set_stylebox("normal", "Button", normal)
	theme.set_stylebox("hover", "Button", hover)
	theme.set_stylebox("pressed", "Button", pressed)
	theme.set_stylebox("focus", "Button", hover)
	theme.set_color("font_color", "Button", Color(0.94, 0.89, 0.80))
	theme.set_color("font_hover_color", "Button", Color(0.98, 0.95, 0.88))
	theme.set_color("font_pressed_color", "Button", Color(0.90, 0.84, 0.74))
	theme.set_font("font", "Button", REGULAR)
	theme.set_font_size("font_size", "Button", 22)
	theme.set_font("font", "Label", REGULAR)
	theme.set_font_size("font_size", "Label", 20)
	theme.set_color("font_color", "Label", Color(0.94, 0.89, 0.80))
	var slider := StyleBoxFlat.new()
	slider.bg_color = Color(0.22, 0.17, 0.13, 1)
	slider.set_corner_radius_all(2)
	slider.content_margin_top = 6
	slider.content_margin_bottom = 6
	var grab := StyleBoxFlat.new()
	grab.bg_color = Color(0.62, 0.46, 0.30, 1)
	grab.set_corner_radius_all(2)
	grab.set_content_margin_all(8)
	theme.set_stylebox("slider", "HSlider", slider)
	theme.set_stylebox("grabber_area", "HSlider", grab)
	theme.set_stylebox("grabber_area_highlight", "HSlider", grab)
	var panel := _box(Color(0.07, 0.06, 0.05, 0.88), Color(0.42, 0.32, 0.22, 0.75))
	panel.content_margin_left = 28
	panel.content_margin_right = 28
	panel.content_margin_top = 22
	panel.content_margin_bottom = 22
	theme.set_stylebox("panel", "PanelContainer", panel)
	return theme


static func _box(bg: Color, border: Color) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = bg
	box.border_color = border
	box.set_border_width_all(1)
	box.set_corner_radius_all(2)
	box.content_margin_left = 18
	box.content_margin_right = 18
	box.content_margin_top = 10
	box.content_margin_bottom = 10
	return box


static func apply(control: Control) -> void:
	control.theme = make()
	control.layout_direction = Control.LAYOUT_DIRECTION_RTL
