extends CanvasLayer

var _level: Node
var health_fill: ColorRect
var health_label: Label
var ammo_label: Label
var reserve_label: Label
var enemy_label: Label
var objective_label: Label
var reload_label: Label
var reload_fill: ColorRect
var toast_label: Label
var crosshair
var pain: float = 0.0
var vignette: ColorRect
var vignette_mat: ShaderMaterial
var damage_bars: Dictionary = {}
var damage_alpha: Dictionary = {"left": 0.0, "right": 0.0, "top": 0.0, "bottom": 0.0}
var _pause: Control
var _settings: Control
var _help: Control
var _game_over: Control
var _complete: Control
var _soon: Label


func _ready() -> void:
	layer = 10
	_build_hud()
	_pause = _overlay_shell()
	_pause.name = "Pause"
	_pause.hide()
	add_child(_pause)
	_fill_pause(_pause)
	_settings = load("res://scripts/ui/settings_panel.gd").new()
	_settings.name = "Settings"
	_settings.hide()
	add_child(_settings)
	_settings.closed.connect(func() -> void:
		if _level and int(_level.get("flow")) == 1:
			_pause.show()
	)
	_help = load("res://scripts/ui/help_panel.gd").new()
	_help.hide()
	add_child(_help)
	_help.closed.connect(func() -> void: _pause.show())
	_game_over = _overlay_shell()
	_game_over.name = "GameOver"
	_game_over.hide()
	add_child(_game_over)
	_fill_end(_game_over, GameConfig.STR["game_over"], false)
	_complete = _overlay_shell()
	_complete.name = "LevelComplete"
	_complete.hide()
	add_child(_complete)
	_fill_end(_complete, GameConfig.STR["level_complete"], true)


func bind(level: Node) -> void:
	_level = level


func _unhandled_input(event: InputEvent) -> void:
	if _level == null:
		return
	if event.is_action_pressed("pause"):
		_level.call("toggle_pause")
		get_viewport().set_input_as_handled()


func set_health(current: int, maximum: int) -> void:
	var ratio := clampf(float(current) / float(maxi(maximum, 1)), 0.0, 1.0)
	health_fill.anchor_right = ratio
	health_fill.offset_right = 0
	health_label.text = "%s  %d" % [GameConfig.STR["health"], current]
	var low := clampf(1.0 - float(current) / 35.0, 0.0, 0.75)
	if vignette_mat:
		vignette_mat.set_shader_parameter("strength", maxf(low, pain * 0.85))
	health_fill.color = Color(0.55, 0.16, 0.12) if current > 30 else Color(0.7, 0.12, 0.1)


func _show_weapon(player: PlayerBody) -> void:
	ammo_label.text = player.weapon.display_name()
	ammo_label.add_theme_font_size_override("font_size", 22)
	var step := player.weapon.combo_step
	reserve_label.text = "%s %d" % [GameConfig.STR["combo"], step] if step > 0 else ""
	reload_fill.visible = false
	if player.iframe_left > 0.0:
		reload_label.visible = true
		reload_label.text = GameConfig.STR["dodging"]
	elif player.blocking:
		reload_label.visible = true
		reload_label.text = GameConfig.STR["blocking"]
	else:
		reload_label.visible = false


func set_enemies(alive: int, total_count: int) -> void:
	enemy_label.text = "%s: %d / %d" % [GameConfig.STR["enemies"], alive, total_count]


func on_damaged(from_pos: Vector3) -> void:
	var cam := get_viewport().get_camera_3d()
	if cam == null:
		return
	var dir := from_pos - cam.global_position
	dir.y = 0.0
	if dir.length() < 0.01:
		return
	var local := cam.global_transform.basis.inverse() * dir.normalized()
	var right := local.x
	var forward := -local.z
	var screen := Vector2(right, -forward)
	damage_alpha["right"] = maxf(damage_alpha["right"], clampf(screen.x, 0.0, 1.0))
	damage_alpha["left"] = maxf(damage_alpha["left"], clampf(-screen.x, 0.0, 1.0))
	damage_alpha["top"] = maxf(damage_alpha["top"], clampf(-screen.y, 0.0, 1.0))
	damage_alpha["bottom"] = maxf(damage_alpha["bottom"], clampf(screen.y, 0.0, 1.0))
	pain = 1.0


func show_pause() -> void:
	_pause.show()


func hide_menus() -> void:
	_pause.hide()
	_settings.hide()
	_help.hide()


func show_game_over() -> void:
	hide_menus()
	_game_over.show()


func show_level_complete() -> void:
	hide_menus()
	_complete.show()


func show_soon(text: String) -> void:
	if _soon:
		_soon.text = text
		_soon.show()


func _process(delta: float) -> void:
	var player := get_tree().get_first_node_in_group("player") as PlayerBody
	if player and player.weapon:
		_show_weapon(player)
		set_health(player.health, player.max_health)
		pain = maxf(0.0, pain - delta * 1.6)
		crosshair.ads = player.ads_weight
		crosshair.hit = player.hit_marker
		if player.toast_left > 0.0:
			toast_label.text = player.toast
			toast_label.visible = true
		else:
			toast_label.visible = false
		_update_crosshair_hot(player)
	for key in damage_alpha.keys():
		damage_alpha[key] = maxf(0.0, float(damage_alpha[key]) - delta * 1.4)
		var bar: ColorRect = damage_bars[key]
		bar.color.a = float(damage_alpha[key]) * 0.55


func _update_crosshair_hot(player: PlayerBody) -> void:
	crosshair.hot = false
	var cam := player.camera
	if cam == null:
		return
	var center := get_viewport().get_visible_rect().size * 0.5
	var origin := cam.project_ray_origin(center)
	var dest := origin + cam.project_ray_normal(center) * 80.0
	var query := PhysicsRayQueryParameters3D.create(origin, dest, 1 | 4)
	query.exclude = [player.get_rid()]
	var hit := cam.get_world_3d().direct_space_state.intersect_ray(query)
	if not hit.is_empty() and hit.collider is Node and (hit.collider as Node).is_in_group("enemy"):
		crosshair.hot = true


func _build_hud() -> void:
	var root := Control.new()
	root.name = "HUD"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	vignette = ColorRect.new()
	vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vignette.color = Color(0, 0, 0, 0)
	var shader := Shader.new()
	shader.code = "shader_type canvas_item; uniform float strength = 0.0; void fragment() { vec2 p = UV - vec2(0.5); float v = smoothstep(0.25, 0.82, length(p)); COLOR = vec4(0.32, 0.02, 0.015, v * strength); }"
	vignette_mat = ShaderMaterial.new()
	vignette_mat.shader = shader
	vignette_mat.set_shader_parameter("strength", 0.0)
	vignette.material = vignette_mat
	root.add_child(vignette)
	_add_damage_bar(root, "left", Control.PRESET_LEFT_WIDE, Vector2(0, 0), Vector2(70, 0))
	_add_damage_bar(root, "right", Control.PRESET_RIGHT_WIDE, Vector2(-70, 0), Vector2(0, 0))
	_add_damage_bar(root, "top", Control.PRESET_TOP_WIDE, Vector2(0, 0), Vector2(0, 64))
	_add_damage_bar(root, "bottom", Control.PRESET_BOTTOM_WIDE, Vector2(0, -64), Vector2(0, 0))
	crosshair = load("res://scripts/ui/crosshair.gd").new()
	crosshair.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(crosshair)
	var objective := _anchored_label(root, Control.PRESET_TOP_RIGHT, Vector2(-420, 18), Vector2(-20, 52))
	objective.text = GameConfig.STR["objective"]
	objective.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	objective_label = objective
	enemy_label = _anchored_label(root, Control.PRESET_TOP_RIGHT, Vector2(-420, 52), Vector2(-20, 84))
	enemy_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	var level_name := _anchored_label(root, Control.PRESET_TOP_LEFT, Vector2(20, 18), Vector2(420, 52))
	level_name.text = GameConfig.STR["level_name"]
	level_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	health_label = _anchored_label(root, Control.PRESET_BOTTOM_RIGHT, Vector2(-280, -78), Vector2(-24, -50))
	health_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	var bar_back := ColorRect.new()
	bar_back.color = Color(0.08, 0.06, 0.05, 0.7)
	bar_back.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	bar_back.offset_left = -250
	bar_back.offset_top = -46
	bar_back.offset_right = -24
	bar_back.offset_bottom = -28
	bar_back.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bar_back)
	health_fill = ColorRect.new()
	health_fill.color = Color(0.55, 0.16, 0.12, 0.95)
	health_fill.anchor_right = 1.0
	health_fill.anchor_bottom = 1.0
	health_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_back.add_child(health_fill)
	ammo_label = _anchored_label(root, Control.PRESET_BOTTOM_LEFT, Vector2(24, -78), Vector2(140, -36))
	ammo_label.add_theme_font_size_override("font_size", 36)
	ammo_label.text_direction = Control.TEXT_DIRECTION_LTR
	ammo_label.text = "30"
	reserve_label = _anchored_label(root, Control.PRESET_BOTTOM_LEFT, Vector2(110, -64), Vector2(240, -36))
	reserve_label.text_direction = Control.TEXT_DIRECTION_LTR
	reserve_label.text = "/ 90"
	var ammo_name := _anchored_label(root, Control.PRESET_BOTTOM_LEFT, Vector2(24, -100), Vector2(240, -76))
	ammo_name.text = ""
	reload_label = _anchored_label(root, Control.PRESET_CENTER_BOTTOM, Vector2(-220, -150), Vector2(220, -116))
	reload_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	reload_label.hide()
	var reload_back := ColorRect.new()
	reload_back.color = Color(0.1, 0.08, 0.07, 0.7)
	reload_back.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	reload_back.offset_left = -120
	reload_back.offset_top = -112
	reload_back.offset_right = 120
	reload_back.offset_bottom = -104
	reload_back.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(reload_back)
	reload_fill = ColorRect.new()
	reload_fill.color = Color(0.75, 0.62, 0.4, 0.9)
	reload_fill.anchor_bottom = 1.0
	reload_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reload_back.add_child(reload_fill)
	reload_fill.hide()
	toast_label = _anchored_label(root, Control.PRESET_CENTER, Vector2(-200, 40), Vector2(200, 80))
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.hide()
	for node in root.get_children():
		_ignore(node)


func _add_damage_bar(root: Control, id: String, preset: int, offset_min: Vector2, offset_max: Vector2) -> void:
	var bar := ColorRect.new()
	bar.color = Color(0.55, 0.05, 0.04, 0.0)
	bar.set_anchors_preset(preset)
	bar.offset_left = offset_min.x
	bar.offset_top = offset_min.y
	bar.offset_right = offset_max.x
	bar.offset_bottom = offset_max.y
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bar)
	damage_bars[id] = bar


func _anchored_label(parent: Control, preset: int, offset_min: Vector2, offset_max: Vector2) -> Label:
	var label := Label.new()
	label.set_anchors_preset(preset)
	label.offset_left = offset_min.x
	label.offset_top = offset_min.y
	label.offset_right = offset_max.x
	label.offset_bottom = offset_max.y
	label.text_direction = Control.TEXT_DIRECTION_RTL
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_font_override("font", SoraniTheme.regular())
	label.add_theme_font_size_override("font_size", 20)
	label.add_theme_color_override("font_color", Color(0.94, 0.9, 0.82))
	parent.add_child(label)
	return label


func _overlay_shell() -> Control:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0.03, 0.025, 0.02, 0.62)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(dim)
	return root


func _fill_pause(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -240
	panel.offset_top = -200
	panel.offset_right = 240
	panel.offset_bottom = 210
	root.add_child(panel)
	SoraniTheme.apply(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	var title := Label.new()
	title.text = GameConfig.STR["paused"]
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", SoraniTheme.bold())
	title.add_theme_font_size_override("font_size", 36)
	box.add_child(title)
	box.add_child(_action_button(GameConfig.STR["resume"], "resume_game"))
	box.add_child(_action_button(GameConfig.STR["restart"], "restart_game"))
	var settings := Button.new()
	settings.text = GameConfig.STR["settings"]
	settings.custom_minimum_size = Vector2(0, 46)
	settings.pressed.connect(func() -> void:
		_pause.hide()
		_settings.show()
	)
	box.add_child(settings)
	var help := Button.new()
	help.text = GameConfig.STR["controls"]
	help.custom_minimum_size = Vector2(0, 46)
	help.pressed.connect(func() -> void:
		_pause.hide()
		_help.show()
	)
	box.add_child(help)
	box.add_child(_action_button(GameConfig.STR["main_menu"], "go_menu"))


func _fill_end(root: Control, title_text: String, victory: bool) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -280
	panel.offset_top = -180
	panel.offset_right = 280
	panel.offset_bottom = 190
	root.add_child(panel)
	SoraniTheme.apply(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	var title := Label.new()
	title.text = title_text
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", SoraniTheme.bold())
	title.add_theme_font_size_override("font_size", 40)
	box.add_child(title)
	if victory:
		var sub := Label.new()
		sub.text = GameConfig.STR["cleared"]
		sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		box.add_child(sub)
		_soon = Label.new()
		_soon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_soon.hide()
		box.add_child(_soon)
		var next := Button.new()
		next.text = GameConfig.STR["next_level"]
		next.custom_minimum_size = Vector2(0, 46)
		next.pressed.connect(func() -> void:
			if _level:
				_level.call("try_next")
		)
		box.add_child(next)
	box.add_child(_action_button(GameConfig.STR["restart"], "restart_game"))
	box.add_child(_action_button(GameConfig.STR["main_menu"], "go_menu"))


func _action_button(text: String, method: String) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 46)
	button.pressed.connect(func() -> void:
		if _level:
			_level.call(method)
	)
	return button


func _ignore(node: Node) -> void:
	if node is Control:
		if node != crosshair:
			(node as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		_ignore(child)
