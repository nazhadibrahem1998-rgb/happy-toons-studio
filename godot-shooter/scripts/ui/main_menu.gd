extends Control

var _menu: Control
var _settings: Control
var _help: Control


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build_backdrop()
	_menu = Control.new()
	_menu.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_menu)
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -260
	panel.offset_top = -250
	panel.offset_right = 260
	panel.offset_bottom = 250
	_menu.add_child(panel)
	SoraniTheme.apply(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)
	var rating := Label.new()
	rating.text = GameConfig.STR["rating"]
	rating.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(rating)
	var title := Label.new()
	title.text = GameConfig.GAME_TITLE_CKB
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.text_direction = Control.TEXT_DIRECTION_RTL
	title.add_theme_font_override("font", SoraniTheme.bold())
	title.add_theme_font_size_override("font_size", 58)
	box.add_child(title)
	var hero := Label.new()
	hero.text = GameConfig.HERO_NAME
	hero.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero.add_theme_font_size_override("font_size", 28)
	box.add_child(hero)
	var against := Label.new()
	against.text = GameConfig.STR["against"]
	against.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	against.add_theme_color_override("font_color", Color(0.78, 0.62, 0.48))
	box.add_child(against)
	box.add_child(_button(GameConfig.STR["play"], _on_play))
	box.add_child(_button(GameConfig.STR["controls"], _on_help))
	box.add_child(_button(GameConfig.STR["settings"], _on_settings))
	box.add_child(_button(GameConfig.STR["quit"], _on_quit))
	var copy := Label.new()
	copy.text = GameConfig.COPYRIGHT
	copy.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	copy.text_direction = Control.TEXT_DIRECTION_LTR
	copy.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	copy.offset_top = -42
	copy.offset_bottom = -12
	copy.add_theme_font_size_override("font_size", 16)
	copy.add_theme_color_override("font_color", Color(0.78, 0.72, 0.62))
	_menu.add_child(copy)
	_settings = load("res://scripts/ui/settings_panel.gd").new()
	_settings.hide()
	add_child(_settings)
	_settings.closed.connect(func() -> void: _menu.show())
	_help = load("res://scripts/ui/help_panel.gd").new()
	_help.hide()
	add_child(_help)
	_help.closed.connect(func() -> void: _menu.show())


func _build_backdrop() -> void:
	var tex := _backdrop_texture()
	var rect := TextureRect.new()
	rect.texture = tex
	rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(rect)
	var shade := ColorRect.new()
	shade.color = Color(0.05, 0.04, 0.03, 0.35)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)


func _backdrop_texture() -> Texture2D:
	var w := 480
	var h := 270
	var img := Image.create(w, h, false, Image.FORMAT_RGB8)
	for y in h:
		for x in w:
			var t := float(y) / float(h)
			var horizon := 0.62
			var sky := Color(0.10, 0.08, 0.12).lerp(Color(0.62, 0.34, 0.20), clampf(1.0 - absf(t - horizon) * 1.6, 0.0, 1.0))
			var ridge := 0.48 + 0.08 * sin(float(x) * 0.05) + 0.05 * sin(float(x) * 0.013)
			if t > ridge:
				var k := (t - ridge) / (1.0 - ridge)
				sky = Color(0.16, 0.13, 0.12).lerp(Color(0.28, 0.20, 0.16), 1.0 - k)
			if t > 0.86:
				sky = sky.lerp(Color(0.08, 0.06, 0.05), (t - 0.86) / 0.14)
			img.set_pixel(x, y, sky)
	return ImageTexture.create_from_image(img)


func _button(text: String, handler: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 48)
	button.pressed.connect(handler)
	return button


func _on_play() -> void:
	AudioDirector.play_2d("ui", -8.0)
	LevelManager.start_game()


func _on_settings() -> void:
	AudioDirector.play_2d("ui", -8.0)
	_menu.hide()
	_settings.show()


func _on_help() -> void:
	AudioDirector.play_2d("ui", -8.0)
	_menu.hide()
	_help.show()


func _on_quit() -> void:
	get_tree().quit()
