extends Control

signal closed

var _volume: HSlider
var _sens: HSlider
var _volume_value: Label
var _sens_value: Label
var _quality_buttons: Dictionary = {}
var _difficulty_buttons: Dictionary = {}


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0.04, 0.03, 0.025, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(dim)
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -280
	panel.offset_top = -290
	panel.offset_right = 280
	panel.offset_bottom = 290
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(panel)
	SoraniTheme.apply(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	panel.add_child(box)
	box.add_child(_title(GameConfig.STR["settings"]))
	box.add_child(_label(GameConfig.STR["volume"]))
	_volume = HSlider.new()
	_volume.min_value = 0
	_volume.max_value = 100
	_volume.step = 1
	_volume.value = Settings.volume * 100.0
	_volume.custom_minimum_size = Vector2(0, 28)
	_volume.value_changed.connect(func(v: float) -> void:
		Settings.set_volume(v / 100.0)
		_volume_value.text = "%d" % int(v)
	)
	box.add_child(_volume)
	_volume_value = _label("%d" % int(_volume.value))
	box.add_child(_volume_value)
	box.add_child(_label(GameConfig.STR["sensitivity"]))
	_sens = HSlider.new()
	_sens.min_value = 0.4
	_sens.max_value = 2.2
	_sens.step = 0.05
	_sens.value = Settings.sensitivity_multiplier()
	_sens.custom_minimum_size = Vector2(0, 28)
	_sens.value_changed.connect(func(v: float) -> void:
		Settings.set_sensitivity_multiplier(v)
		_sens_value.text = "%.2f" % v
	)
	box.add_child(_sens)
	_sens_value = _label("%.2f" % _sens.value)
	box.add_child(_sens_value)
	box.add_child(_label(GameConfig.STR["difficulty"]))
	var diff_row := HBoxContainer.new()
	diff_row.alignment = BoxContainer.ALIGNMENT_CENTER
	diff_row.add_theme_constant_override("separation", 8)
	box.add_child(diff_row)
	for diff_id in ["easy", "normal"]:
		var diff_button := Button.new()
		diff_button.text = GameConfig.STR[diff_id]
		diff_button.custom_minimum_size = Vector2(140, 44)
		diff_button.pressed.connect(_on_difficulty.bind(diff_id))
		diff_row.add_child(diff_button)
		_difficulty_buttons[diff_id] = diff_button
	box.add_child(_label(GameConfig.STR["quality"]))
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 8)
	box.add_child(row)
	for id in ["low", "medium", "high"]:
		var button := Button.new()
		button.text = GameConfig.STR[id]
		button.custom_minimum_size = Vector2(120, 44)
		button.pressed.connect(_on_quality.bind(id))
		row.add_child(button)
		_quality_buttons[id] = button
	var back := Button.new()
	back.text = GameConfig.STR["back"]
	back.custom_minimum_size = Vector2(0, 48)
	back.pressed.connect(func() -> void:
		hide()
		closed.emit()
	)
	box.add_child(back)
	Settings.settings_changed.connect(_refresh)
	_refresh()


func _on_difficulty(id: String) -> void:
	Settings.set_difficulty(id)
	AudioDirector.play_2d("ui", -8.0)


func _on_quality(id: String) -> void:
	Settings.set_quality(id)
	AudioDirector.play_2d("ui", -8.0)


func _refresh() -> void:
	for id in _quality_buttons.keys():
		var button: Button = _quality_buttons[id]
		button.modulate = Color(1, 1, 1) if id == Settings.quality else Color(0.65, 0.62, 0.58)
	for id in _difficulty_buttons.keys():
		var diff_button: Button = _difficulty_buttons[id]
		diff_button.modulate = Color(1, 1, 1) if id == Settings.difficulty else Color(0.65, 0.62, 0.58)


func _title(text: String) -> Label:
	var label := _label(text)
	label.add_theme_font_override("font", SoraniTheme.bold())
	label.add_theme_font_size_override("font_size", 32)
	return label


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.text_direction = Control.TEXT_DIRECTION_RTL
	return label
