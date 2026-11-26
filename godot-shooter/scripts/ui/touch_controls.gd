extends Control

var _stick: Control
var _knob: Control
var _look: Control
var _stick_index := -1
var _origin := Vector2.ZERO
const STICK_R := 54.0


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	if not DisplayServer.is_touchscreen_available():
		hide()
		return
	_build()
	get_viewport().size_changed.connect(_place)


func _build() -> void:
	_stick = Control.new()
	_stick.custom_minimum_size = Vector2(128, 128)
	_stick.size = Vector2(128, 128)
	_stick.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_stick)
	var ring := Panel.new()
	ring.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var ring_box := StyleBoxFlat.new()
	ring_box.bg_color = Color(1, 0.9, 0.75, 0.14)
	ring_box.set_corner_radius_all(64)
	ring_box.set_border_width_all(2)
	ring_box.border_color = Color(1, 0.88, 0.7, 0.4)
	ring.add_theme_stylebox_override("panel", ring_box)
	_stick.add_child(ring)
	_knob = Panel.new()
	_knob.custom_minimum_size = Vector2(48, 48)
	_knob.size = Vector2(48, 48)
	_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var knob_box := StyleBoxFlat.new()
	knob_box.bg_color = Color(0.95, 0.82, 0.6, 0.9)
	knob_box.set_corner_radius_all(24)
	_knob.add_theme_stylebox_override("panel", knob_box)
	_stick.add_child(_knob)
	_stick.gui_input.connect(_on_stick)
	_look = Control.new()
	_look.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_look)
	_look.gui_input.connect(_on_look)
	_button(GameConfig.STR["fire"], "fire", Vector2(0, 0))
	_button(GameConfig.STR["aim_btn"], "aim", Vector2(1, 0))
	_button(GameConfig.STR["jump_btn"], "jump", Vector2(0, 1))
	_button(GameConfig.STR["reload_btn"], "reload", Vector2(1, 1))
	var pause := Button.new()
	pause.text = "❚❚"
	pause.custom_minimum_size = Vector2(48, 48)
	pause.focus_mode = Control.FOCUS_NONE
	pause.pressed.connect(func() -> void:
		var level := get_tree().current_scene
		if level and level.has_method("toggle_pause"):
			level.call("toggle_pause")
	)
	pause.name = "TouchPause"
	add_child(pause)
	_place()
	_reset_knob()


func _button(label: String, action: String, slot: Vector2) -> void:
	var button := Button.new()
	button.text = label
	button.custom_minimum_size = Vector2(64, 64)
	button.focus_mode = Control.FOCUS_NONE
	button.set_meta("slot", slot)
	button.button_down.connect(func() -> void: Input.action_press(action))
	button.button_up.connect(func() -> void: Input.action_release(action))
	add_child(button)


func _place() -> void:
	if _stick == null:
		return
	var size := get_viewport().get_visible_rect().size
	var safe := _insets()
	_stick.position = Vector2(safe.x + 18.0, size.y - safe.w - 148.0)
	_look.position = Vector2(size.x * 0.46, safe.y)
	_look.size = Vector2(size.x * 0.54 - safe.z, size.y - safe.y - safe.w)
	var pause := get_node_or_null("TouchPause")
	if pause:
		pause.position = Vector2(safe.x + 12.0, size.y * 0.40)
	var col := 0
	for child in get_children():
		if not (child is Button) or child.name == "TouchPause":
			continue
		var slot: Vector2 = child.get_meta("slot")
		var x := size.x - safe.z - 78.0 - slot.x * 76.0
		var y := size.y - safe.w - 78.0 - slot.y * 76.0
		child.position = Vector2(x, y)
		col += 1


func _insets() -> Vector4:
	var safe := DisplayServer.get_display_safe_area()
	var screen := DisplayServer.screen_get_size()
	var win := get_viewport().get_visible_rect().size
	if screen.x <= 0 or screen.y <= 0:
		return Vector4(12, 12, 12, 12)
	var sx := win.x / float(screen.x)
	var sy := win.y / float(screen.y)
	return Vector4(
		maxf(12.0, safe.position.x * sx),
		maxf(12.0, safe.position.y * sy),
		maxf(12.0, (screen.x - safe.end.x) * sx),
		maxf(12.0, (screen.y - safe.end.y) * sy)
	)


func _on_stick(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			_stick_index = touch.index
			_origin = touch.position
			_move(Vector2.ZERO)
		elif touch.index == _stick_index:
			_stick_index = -1
			_release_move()
			_reset_knob()
	elif event is InputEventScreenDrag and (event as InputEventScreenDrag).index == _stick_index:
		var drag := event as InputEventScreenDrag
		var delta := drag.position - _origin
		if delta.length() > STICK_R:
			delta = delta.normalized() * STICK_R
		_knob.position = Vector2(40, 40) + delta
		_move(delta / STICK_R)


func _on_look(event: InputEvent) -> void:
	if event is InputEventScreenDrag:
		var player := get_tree().get_first_node_in_group("player")
		if player and player.has_method("add_look_delta"):
			player.call("add_look_delta", (event as InputEventScreenDrag).relative * 2.4)


func _move(v: Vector2) -> void:
	_release_move()
	if v.y < -0.12:
		Input.action_press("move_forward", clampf(-v.y, 0.0, 1.0))
	elif v.y > 0.12:
		Input.action_press("move_back", clampf(v.y, 0.0, 1.0))
	if v.x < -0.12:
		Input.action_press("move_left", clampf(-v.x, 0.0, 1.0))
	elif v.x > 0.12:
		Input.action_press("move_right", clampf(v.x, 0.0, 1.0))


func _release_move() -> void:
	for action in ["move_forward", "move_back", "move_left", "move_right"]:
		if Input.is_action_pressed(action):
			Input.action_release(action)


func _reset_knob() -> void:
	if _knob:
		_knob.position = Vector2(40, 40)
