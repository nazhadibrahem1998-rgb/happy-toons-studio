extends CanvasLayer

var _index_job: Dictionary = {}
var _stick_origin: Vector2 = Vector2.ZERO
var _stick_pull: Vector2 = Vector2.ZERO
var _stick_shown: Vector2 = Vector2.ZERO
var _buttons: Array[Dictionary] = []


func _ready() -> void:
	layer = 6
	var root := Control.new()
	root.name = "TouchRoot"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.gui_input.connect(_on_gui_input)
	add_child(root)
	root.resized.connect(_layout)
	root.draw.connect(_draw_proxy)
	_layout()


func _layout() -> void:
	var root := get_node("TouchRoot") as Control
	var size := root.size
	if size.x < 8.0:
		return
	var inset := _insets(size)
	var right := size.x - inset.z
	var bottom := size.y - inset.w
	var mid_y := size.y * 0.56
	_buttons = [
		{"id": "attack", "action": "attack", "center": Vector2(right - 78, mid_y), "radius": 40, "mark": "sword"},
		{"id": "heavy", "action": "heavy_attack", "center": Vector2(right - 78, mid_y - 92), "radius": 32, "mark": "heavy"},
		{"id": "block", "action": "block", "center": Vector2(right - 168, mid_y - 28), "radius": 32, "mark": "block"},
		{"id": "dodge", "action": "dodge", "center": Vector2(right - 158, mid_y + 64), "radius": 32, "mark": "dodge"},
		{"id": "lock", "action": "lock_on", "center": Vector2(right - 168, mid_y - 108), "radius": 26, "mark": "lock"},
		{"id": "jump", "action": "jump", "center": Vector2(right - 250, bottom - 54), "radius": 30, "mark": "jump"},
		{"id": "pause", "action": "pause", "center": Vector2(right - 36, inset.y + 28), "radius": 22, "mark": "pause"},
	]
	root.queue_redraw()


func _process(delta: float) -> void:
	var root := get_node_or_null("TouchRoot") as Control
	if root == null:
		return
	if _buttons.is_empty() and root.size.x > 8.0:
		_layout()
	_stick_shown = _stick_shown.lerp(_stick_pull, 1.0 - exp(-14.0 * delta))
	TouchMode.move_vector = _stick_shown
	TouchMode.hold_block = _button_held("block")
	root.queue_redraw()


func _draw_on(root: Control) -> void:
	var size := root.size
	var inset := _insets(size)
	var base := Vector2(inset.x + 118, size.y - inset.w - 108)
	root.draw_circle(base, 64, Color(1, 1, 1, 0.08))
	root.draw_arc(base, 64, 0, TAU, 40, Color(0.95, 0.9, 0.8, 0.45), 2.0, true)
	root.draw_circle(base + _stick_shown * 46.0, 26, Color(0.95, 0.86, 0.62, 0.55))
	for button in _buttons:
		var center: Vector2 = button["center"]
		var radius: float = button["radius"]
		var down := _button_held(str(button["id"]))
		var fill := Color(0.95, 0.82, 0.55, 0.42) if down else Color(0.08, 0.06, 0.05, 0.38)
		root.draw_circle(center, radius, fill)
		root.draw_arc(center, radius, 0, TAU, 32, Color(0.95, 0.88, 0.72, 0.8), 2.0, true)
		_mark(root, str(button["mark"]), center, radius)


func _mark(root: Control, kind: String, center: Vector2, radius: float) -> void:
	var ink := Color(0.98, 0.94, 0.86, 0.95)
	match kind:
		"sword":
			root.draw_line(center + Vector2(-10, 14), center + Vector2(12, -16), ink, 3.0, true)
		"heavy":
			root.draw_line(center + Vector2(-12, 16), center + Vector2(14, -16), ink, 4.5, true)
		"block":
			root.draw_arc(center, radius * 0.45, PI, TAU, 16, ink, 3.0, true)
		"dodge":
			root.draw_line(center + Vector2(-12, 0), center + Vector2(10, 0), ink, 3.0, true)
			root.draw_line(center + Vector2(4, -8), center + Vector2(12, 0), ink, 3.0, true)
			root.draw_line(center + Vector2(4, 8), center + Vector2(12, 0), ink, 3.0, true)
		"lock":
			root.draw_rect(Rect2(center - Vector2(7, 8), Vector2(14, 16)), ink, false, 2.0)
		"jump":
			root.draw_line(center + Vector2(0, 10), center + Vector2(0, -8), ink, 3.0, true)
			root.draw_line(center + Vector2(-7, -2), center + Vector2(0, -10), ink, 3.0, true)
			root.draw_line(center + Vector2(7, -2), center + Vector2(0, -10), ink, 3.0, true)
		"pause":
			root.draw_line(center + Vector2(-4, -7), center + Vector2(-4, 7), ink, 2.5, true)
			root.draw_line(center + Vector2(4, -7), center + Vector2(4, 7), ink, 2.5, true)


func _on_gui_input(event: InputEvent) -> void:
	var root := get_node("TouchRoot") as Control
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			_pointer_down(touch.index, touch.position)
		else:
			_pointer_up(touch.index)
		root.accept_event()
	elif event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		_pointer_drag(drag.index, drag.position, drag.relative)
		root.accept_event()
	elif event is InputEventMouseButton:
		var mouse := event as InputEventMouseButton
		if mouse.button_index != MOUSE_BUTTON_LEFT:
			return
		if mouse.pressed:
			_pointer_down(0, mouse.position)
		else:
			_pointer_up(0)
		root.accept_event()
	elif event is InputEventMouseMotion and _index_job.has(0):
		var motion := event as InputEventMouseMotion
		_pointer_drag(0, motion.position, motion.relative)
		root.accept_event()


func _pointer_down(index: int, pos: Vector2) -> void:
	var root := get_node("TouchRoot") as Control
	for button in _buttons:
		var center: Vector2 = button["center"]
		var radius: float = float(button["radius"])
		if pos.distance_to(center) <= radius + 8.0:
			_index_job[index] = str(button["id"])
			_press_action(str(button["action"]), str(button["id"]))
			return
	if pos.x < root.size.x * 0.46:
		_index_job[index] = "stick"
		_stick_origin = pos
		_stick_pull = Vector2.ZERO
		return
	_index_job[index] = "look"


func _pointer_drag(index: int, pos: Vector2, relative: Vector2) -> void:
	var job := str(_index_job.get(index, ""))
	if job == "stick":
		var pull := pos - _stick_origin
		if pull.length() > 58.0:
			pull = pull.normalized() * 58.0
		_stick_pull = pull / 58.0
		if _stick_pull.length() < 0.12:
			_stick_pull = Vector2.ZERO
	elif job == "look":
		var player := get_tree().get_first_node_in_group("player")
		if player and player.has_method("add_look_delta"):
			var scale := Settings.sensitivity / 0.00235
			player.call("add_look_delta", relative * scale * 1.15)


func _pointer_up(index: int) -> void:
	var job := str(_index_job.get(index, ""))
	_index_job.erase(index)
	if job == "stick":
		_stick_pull = Vector2.ZERO


func _press_action(action: String, id: String) -> void:
	match id:
		"attack":
			print("TOUCH_ATTACK")
			TouchMode.pulse_attack = true
		"heavy":
			TouchMode.pulse_heavy = true
		"dodge":
			TouchMode.pulse_dodge = true
		"jump":
			TouchMode.pulse_jump = true
		"lock":
			TouchMode.pulse_lock = true
		"pause":
			TouchMode.pulse_pause = true
		"block":
			TouchMode.hold_block = true
	if action == "pause":
		Input.action_press("pause")
		Input.action_release("pause")


func _button_held(id: String) -> bool:
	for key in _index_job.keys():
		if str(_index_job[key]) == id:
			return true
	return false


func _insets(size: Vector2) -> Vector4:
	var safe := DisplayServer.get_display_safe_area()
	var win := Vector2(DisplayServer.window_get_size())
	if win.x < 2.0 or safe.size.x < 2.0:
		return Vector4(28, 16, 28, 18)
	return Vector4(
		maxf(safe.position.x, 18),
		maxf(safe.position.y, 10),
		maxf(win.x - safe.end.x, 18),
		maxf(win.y - safe.end.y, 14)
	)


func _draw_proxy() -> void:
	var root := get_node_or_null("TouchRoot") as Control
	if root:
		_draw_on(root)
