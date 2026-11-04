extends RefCounted
class_name Desk

static func leather() -> Color:
	return Color("5a3824")

static func parchment() -> Color:
	return Color("f3e6c8")

static func ink() -> Color:
	return Color("2a2118")

static func button(text: String, width: float = 260.0) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.custom_minimum_size = Vector2(width, 36)
	var normal := _box(Color("6b4228"), Color("6b4228"))
	var hover := _box(Color("8a5a38"), Color("f0e2c4"))
	var pressed := _box(Color("4a2e1c"), Color("f0e2c4"))
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("focus", hover)
	b.add_theme_stylebox_override("disabled", _box(Color("4a4038"), Color("4a4038")))
	b.add_theme_color_override("font_color", Color("f6edd8"))
	b.add_theme_color_override("font_hover_color", Color("fff8ec"))
	b.add_theme_color_override("font_pressed_color", Color("f6edd8"))
	b.add_theme_color_override("font_disabled_color", Color("b0a090"))
	b.add_theme_font_size_override("font_size", 18)
	return b

static func _box(bg: Color, border: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(2 if border != bg else 0)
	s.set_corner_radius_all(3)
	s.content_margin_left = 12
	s.content_margin_right = 12
	s.content_margin_top = 6
	s.content_margin_bottom = 6
	return s

static func label(text: String, size: int = 18, color: Color = Color("2a2118")) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

static func panel(size: Vector2) -> PanelContainer:
	var p := PanelContainer.new()
	p.custom_minimum_size = size
	p.mouse_filter = Control.MOUSE_FILTER_STOP
	var box := StyleBoxFlat.new()
	box.bg_color = leather()
	box.set_corner_radius_all(8)
	box.content_margin_left = 18
	box.content_margin_right = 18
	box.content_margin_top = 16
	box.content_margin_bottom = 16
	p.add_theme_stylebox_override("panel", box)
	return p

static func center(node: Control) -> Control:
	node.set_anchors_preset(Control.PRESET_CENTER)
	node.anchor_left = 0.5
	node.anchor_top = 0.5
	node.anchor_right = 0.5
	node.anchor_bottom = 0.5
	node.grow_horizontal = Control.GROW_DIRECTION_BOTH
	node.grow_vertical = Control.GROW_DIRECTION_BOTH
	return node

static func slider(value: float, min_v: float, max_v: float) -> HSlider:
	var s := HSlider.new()
	s.min_value = min_v
	s.max_value = max_v
	s.step = 0.01
	s.value = value
	s.custom_minimum_size = Vector2(280, 24)
	s.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	return s

static func build_settings(host: Node, on_close: Callable) -> Control:
	var root := panel(Vector2(640, 700))
	center(root)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	root.add_child(box)
	box.add_child(label("Settings", 28, Color("f6edd8")))
	box.add_child(label("Graphics", 16, Color("f0e2c4")))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	box.add_child(row)
	for id in GraphicsRules.ORDER:
		var b := button(id.capitalize(), 110)
		if Settings.preset == id:
			b.text = id.capitalize() + " *"
		b.pressed.connect(func():
			Settings.set_preset(id)
			_refresh_settings(host, on_close)
		)
		row.add_child(b)
	var scale_row := HBoxContainer.new()
	box.add_child(scale_row)
	var scale_name := label("Resolution scale  %d%%" % int(Settings.scale * 100.0), 16, Color("f6edd8"))
	scale_row.add_child(scale_name)
	var scale := slider(Settings.scale, 0.5, 1.0)
	scale.step = 0.05
	scale.value_changed.connect(func(v):
		Settings.scale = GraphicsRules.clamp_scale(v)
		Settings.save()
		Settings.apply_runtime()
		Settings.graphics_changed.emit(Settings.current_flags())
		scale_name.text = "Resolution scale  %d%%" % int(Settings.scale * 100.0)
	)
	box.add_child(scale)
	box.add_child(_check("FidelityFX super resolution (when scaled down)", Settings.fsr, func(on):
		Settings.fsr = on
		Settings.save()
		Settings.apply_runtime()
	))
	box.add_child(_check("VSync", Settings.vsync, func(on):
		Settings.vsync = on
		Settings.save()
		Settings.apply_runtime()
	))
	box.add_child(_check("Fullscreen", Settings.fullscreen, func(on):
		Settings.fullscreen = on
		Settings.save()
		Settings.apply_runtime()
	))
	box.add_child(label("Frame cap", 16, Color("f0e2c4")))
	var caps := OptionButton.new()
	caps.custom_minimum_size = Vector2(220, 32)
	var cap_values := [0, 30, 60, 120, 144]
	for c in cap_values:
		caps.add_item("Uncapped" if c == 0 else "%d fps" % c)
	caps.selected = cap_values.find(Settings.fps_cap)
	if caps.selected < 0:
		caps.selected = 0
	caps.item_selected.connect(func(idx):
		Settings.fps_cap = int(cap_values[idx])
		Settings.save()
		Settings.apply_runtime()
	)
	box.add_child(caps)
	box.add_child(label("Mouse sensitivity", 16, Color("f0e2c4")))
	var sens := slider(Settings.sensitivity, 0.2, 3.0)
	sens.step = 0.05
	sens.value_changed.connect(func(v):
		Settings.sensitivity = v
		Settings.save()
	)
	box.add_child(sens)
	box.add_child(_check("Invert Y  (off is the natural mouse)", Settings.invert_y, func(on):
		Settings.invert_y = on
		Settings.save()
	))
	box.add_child(label("Volume", 16, Color("f0e2c4")))
	var vol := slider(Settings.volume, 0.0, 1.0)
	vol.value_changed.connect(func(v):
		Settings.volume = v
		Settings.save()
		Settings.apply_runtime()
	)
	box.add_child(vol)
	box.add_child(label("Subtitle size", 16, Color("f0e2c4")))
	var sizes := OptionButton.new()
	for s in ["small", "medium", "large"]:
		sizes.add_item(s.capitalize())
	sizes.selected = ["small", "medium", "large"].find(Settings.subtitle)
	sizes.item_selected.connect(func(idx):
		Settings.subtitle = ["small", "medium", "large"][idx]
		Settings.save()
	)
	box.add_child(sizes)
	box.add_child(label("Keys  — click a binding, then press a key", 16, Color("f0e2c4")))
	var bind_host := VBoxContainer.new()
	box.add_child(bind_host)
	_binds(bind_host)
	var back := button("Back", 160)
	back.pressed.connect(on_close)
	box.add_child(back)
	if host.get_node_or_null("SettingsRoot"):
		host.get_node("SettingsRoot").queue_free()
	root.name = "SettingsRoot"
	host.add_child(root)
	return root

static func _refresh_settings(host: Node, on_close: Callable) -> void:
	if host.get_node_or_null("SettingsRoot"):
		host.get_node("SettingsRoot").queue_free()
	build_settings(host, on_close)

static func _check(text: String, on: bool, cb: Callable) -> CheckButton:
	var c := CheckButton.new()
	c.text = text
	c.button_pressed = on
	c.focus_mode = Control.FOCUS_ALL
	c.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	c.add_theme_font_size_override("font_size", 16)
	c.add_theme_color_override("font_color", Color("f6edd8"))
	c.toggled.connect(cb)
	return c

static func _binds(host: VBoxContainer) -> void:
	for action in Settings.ACTIONS.keys():
		var row := HBoxContainer.new()
		row.add_child(label(action.replace("_", " "), 15, Color("f6edd8")))
		var b := button(Settings.key_label(action), 120)
		b.pressed.connect(func():
			Settings.rebind_action = action
			b.text = "Press a key"
		)
		row.add_child(b)
		host.add_child(row)
	host.set_process(true)
	if not host.has_meta("wired"):
		host.set_meta("wired", true)
		host.gui_input.connect(func(_e): pass)

static func credits_text() -> String:
	return "\n".join([
		"Sharsten  —  Part 1, The Dream",
		"",
		"An original story. Azad-i Asmani, Azad of the Sky, is a fictional inventor.",
		"No real person, face, company, or nation is shown as an enemy.",
		"",
		"Villagers wear the old clothes of a Kurdish mountain village:",
		"shal u shapik, sash, turban or klaw; layered dresses, kawa, headscarf, coin band.",
		"The mullah wears a white turban. Nicknames are kept kindly.",
		"",
		"Godot Engine, MIT License. Copyright (c) 2014-present Godot Engine contributors.",
		"",
		"Textures, CC0, Poly Haven:",
		"aerial_grass_rock, plastered_wall, wood_floor, rock_boulder_dry, brown_mud_dry.",
		"",
		"Footsteps and the spring tone are original sounds made for this game.",
		"The people, the valley, and the dream were modelled in the project.",
		"",
		"This game was made with AI assistance for code, text, and art direction.",
		"It is original fiction.",
	])
