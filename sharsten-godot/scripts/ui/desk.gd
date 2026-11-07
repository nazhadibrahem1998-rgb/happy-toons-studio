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

static func plain(text: String, size: int = 16, color: Color = Color("f6edd8")) -> Label:
	var l := label(text, size, color)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	l.clip_text = false
	l.custom_minimum_size = Vector2(180, 32)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l

static func build_settings(host: Node, on_close: Callable) -> Control:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0.05, 0.03, 0.02, 0.28)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(dim)
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		margin.add_theme_constant_override(side, 24)
	root.add_child(margin)
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	var sheet := panel(Vector2(560, 0))
	sheet.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(sheet)
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", 8)
	sheet.add_child(box)
	box.add_child(plain("Settings", 28))
	box.add_child(plain("Graphics", 18, Color("f0e2c4")))
	var presets := HFlowContainer.new()
	presets.add_theme_constant_override("h_separation", 8)
	presets.add_theme_constant_override("v_separation", 8)
	presets.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(presets)
	for id in GraphicsRules.ORDER:
		var b := button(id.capitalize() + (" *" if Settings.preset == id else ""), 140)
		b.pressed.connect(func():
			Settings.set_preset(id)
			_refresh_settings(host, on_close)
		)
		presets.add_child(b)
	box.add_child(_option("Resolution", ["1280x720", "1366x768", "1600x900", "1920x1080", "2560x1440"], Settings.resolution, func(v):
		Settings.resolution = v
		Settings.fullscreen = false
		Settings.save()
		Settings.apply_runtime()
	))
	box.add_child(_option("Shadows", ["preset", "on", "off"], Settings.shadows_mode, func(v):
		Settings.shadows_mode = v
		Settings.save()
		Settings.graphics_changed.emit(Settings.current_flags())
	))
	box.add_child(_option("Antialiasing", ["preset", "off", "2x", "4x"], Settings.aa_mode, func(v):
		Settings.aa_mode = v
		Settings.save()
		Settings.apply_runtime()
	))
	box.add_child(_option("Fog", ["preset", "off", "light", "dream"], Settings.fog_mode, func(v):
		Settings.fog_mode = v
		Settings.save()
		Settings.graphics_changed.emit(Settings.current_flags())
	))
	box.add_child(plain("View distance", 16, Color("f0e2c4")))
	var view := slider(Settings.view_mul, 0.55, 1.4)
	view.step = 0.05
	view.value_changed.connect(func(v):
		Settings.view_mul = v
		Settings.save()
		Settings.graphics_changed.emit(Settings.current_flags())
	)
	box.add_child(view)
	var scale_name := plain("Render scale  %d%%" % int(Settings.scale * 100.0), 16)
	box.add_child(scale_name)
	var scale := slider(Settings.scale, 0.5, 1.0)
	scale.step = 0.05
	scale.value_changed.connect(func(v):
		Settings.scale = GraphicsRules.clamp_scale(v)
		Settings.save()
		Settings.apply_runtime()
		Settings.graphics_changed.emit(Settings.current_flags())
		scale_name.text = "Render scale  %d%%" % int(Settings.scale * 100.0)
	)
	box.add_child(scale)
	box.add_child(_option("Upscale under 100%", ["off", "fsr1", "fsr2"], Settings.fsr_mode, func(v):
		Settings.fsr_mode = v
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
	box.add_child(_option("Frame cap", ["0", "30", "60", "120", "144"], str(Settings.fps_cap), func(v):
		Settings.fps_cap = int(v)
		Settings.save()
		Settings.apply_runtime()
	))
	box.add_child(plain("Mouse sensitivity", 16, Color("f0e2c4")))
	var sens := slider(Settings.sensitivity, 0.2, 3.0)
	sens.step = 0.05
	sens.value_changed.connect(func(v):
		Settings.sensitivity = v
		Settings.save()
	)
	box.add_child(sens)
	box.add_child(_check("Invert Y", Settings.invert_y, func(on):
		Settings.invert_y = on
		Settings.save()
	))
	box.add_child(plain("Master volume", 16, Color("f0e2c4")))
	var vol := slider(Settings.volume, 0.0, 1.0)
	vol.value_changed.connect(func(v):
		Settings.volume = v
		Settings.save()
		Settings.apply_runtime()
	)
	box.add_child(vol)
	box.add_child(plain("Ambience", 16, Color("f0e2c4")))
	var amb := slider(Settings.ambience, 0.0, 1.0)
	amb.value_changed.connect(func(v):
		Settings.ambience = v
		Settings.save()
		Settings.apply_runtime()
	)
	box.add_child(amb)
	box.add_child(plain("Effects", 16, Color("f0e2c4")))
	var sfx := slider(Settings.sfx, 0.0, 1.0)
	sfx.value_changed.connect(func(v):
		Settings.sfx = v
		Settings.save()
		Settings.apply_runtime()
	)
	box.add_child(sfx)
	box.add_child(_option("Subtitle size", ["small", "medium", "large"], Settings.subtitle, func(v):
		Settings.subtitle = v
		Settings.save()
	))
	box.add_child(_option("Language", ["en", "ku"], Settings.language, func(v):
		Settings.language = v
		Settings.save()
		_refresh_settings(host, on_close)
	))
	if Settings.language == "ku":
		box.add_child(plain("Kurdish script is planned for a later update. This build stays in English.", 15, Color("f0e2c4")))
	box.add_child(_check("Show key hints", Settings.show_hints, func(on):
		Settings.show_hints = on
		Settings.save()
	))
	box.add_child(_check("Light rain", Settings.rain, func(on):
		Settings.rain = on
		Settings.save()
	))
	box.add_child(plain("Hold %s: look around. Release it and the camera returns behind you. Hold %s: crouch. %s: jump." % [Settings.key_label("free_look"), Settings.key_label("crouch"), Settings.key_label("jump")], 16, Color("f0e2c4")))
	box.add_child(plain("Left click strikes. %s rolls. Hold %s to block; a block as the blow lands answers it. %s changes the weapon. The flintlock is not in this dream." % [Settings.key_label("dodge"), Settings.key_label("block"), Settings.key_label("weapon")], 16, Color("f0e2c4")))
	box.add_child(plain("Keys and mouse  — click a binding, then press a key or mouse button", 16, Color("f0e2c4")))
	var grid := GridContainer.new()
	grid.name = "BindGrid"
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 18)
	grid.add_theme_constant_override("v_separation", 6)
	box.add_child(grid)
	_bind_rows(grid, Settings.ACTIONS.keys())
	_bind_rows(grid, Settings.MOUSE_ACTIONS.keys())
	var back := button("Back", 180)
	back.pressed.connect(on_close)
	box.add_child(back)
	if host.get_node_or_null("SettingsRoot"):
		host.get_node("SettingsRoot").queue_free()
	root.name = "SettingsRoot"
	host.add_child(root)
	return root

static func _option(title: String, values: Array, current: String, cb: Callable) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 12)
	var name := plain(title, 16)
	name.custom_minimum_size = Vector2(200, 34)
	row.add_child(name)
	var box := OptionButton.new()
	box.custom_minimum_size = Vector2(220, 34)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_font_size_override("font_size", 16)
	var pick := 0
	for i in values.size():
		var shown := str(values[i])
		if shown == "0":
			shown = "Uncapped"
		elif shown in ["30", "60", "120", "144"]:
			shown = shown + " fps"
		elif shown == "en":
			shown = "English"
		elif shown == "ku":
			shown = "Kurdish (later)"
		box.add_item(shown)
		if str(values[i]) == current:
			pick = i
	box.selected = pick
	box.item_selected.connect(func(idx):
		cb.call(str(values[idx]))
	)
	row.add_child(box)
	return row

static func _bind_rows(grid: GridContainer, actions: Array) -> void:
	for action in actions:
		var title := str(action).replace("_", " ")
		var name := plain(title.capitalize(), 16)
		name.custom_minimum_size = Vector2(240, 36)
		grid.add_child(name)
		var b := button(Settings.key_label(str(action)), 180)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		var id := str(action)
		b.pressed.connect(func():
			Settings.rebind_action = id
			b.text = "Press a key"
		)
		grid.add_child(b)

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

static func opening_notice() -> String:
	return "Made with Godot Engine\n\nGodot Engine is available under the MIT License.\nCopyright (c) 2014-present Godot Engine contributors.\nCopyright (c) 2007-2014 Juan Linietsky, Ariel Manzur.\n\nGround, plaster, wood, and rock textures: Poly Haven, CC0.\nCloth weaves, doorway rugs, and mountain meshes: original to this game.\nBodies and clips: Quaternius Universal Animation Library, CC0.\nThe bonfire tune is an original daf-and-melody loop, not a recorded song."

static func credits_text() -> String:
	return "\n".join([
		"SHARSTEN",
		"Part 1 — The Dream, and the waking",
		"",
		"GODOT ENGINE",
		"Used for: the game itself — window, rendering, physics, and this export.",
		"Licence: MIT.",
		"Copyright (c) 2014-present Godot Engine contributors.",
		"Copyright (c) 2007-2014 Juan Linietsky, Ariel Manzur.",
		"https://godotengine.org/license",
		"",
		"POLY HAVEN",
		"Used for: grassland, plaster, timber, rock walls, rubble, and the distant peaks.",
		"aerial_grass_rock, plastered_wall, wood_floor, rock_boulder_dry, brown_mud_dry.",
		"Licence: CC0 1.0.",
		"https://polyhaven.com",
		"",
		"THIS PROJECT",
		"QUATERNIUS",
		"Used for: the humanoid body and the idle, walk, talk, and sit clips.",
		"Universal Animation Library, CC0 1.0.",
		"https://quaternius.com",
		"",
		"THIS PROJECT",
		"Used for: the story, Azad-i Asmani, and the Kurdish clothing meshes on that rig.",
		"Wool, cotton, and embroidery weaves, the black-grey-cream jamane check,",
		"doorway rugs and wall hangings, relic gears, and the mountain meshes are original.",
		"Wind is the only village-wide bed. The crackle and the tune come from the fire.",
		"The bonfire tune is not a recording of any published song.",
		"No Mixamo clips. No assets taken from other games.",
		"",
		"INSPIRED BY",
		"Ideas only. No names, pictures, music, or interface were copied.",
		"Fallout and Fallout 4 are trademarks of ZeniMax Media / Bethesda Softworks.",
		"Rust is a trademark of Facepunch Studios.",
		"Valheim is a trademark of Iron Gate Studio.",
		"Red Dead Redemption 2 and Grand Theft Auto V are trademarks of Rockstar Games / Take-Two Interactive.",
		"Sharsten is not affiliated with, endorsed by, or sponsored by any of them.",
		"",
		"The dream is an old mountain village, handmade and a little magical.",
		"The waking world is an original ruin after a long fictional collapse. No real nation is named or blamed.",
		"Sharsten names no political party, flag, symbol, slogan, or leader, and it does not retell any real conflict.",
		"Azad-i Asmani is a fictional inventor. No real person is depicted.",
		"",
		"This game was made with AI assistance for code, text, and art direction.",
		"It is original fiction.",
	])
