class_name TouchMode
extends RefCounted

# -1 auto, 0 keyboard/mouse, 1 touch HUD.
static var forced: int = -1
static var move_vector: Vector2 = Vector2.ZERO
static var pulse_attack: bool = false
static var pulse_heavy: bool = false
static var pulse_dodge: bool = false
static var pulse_jump: bool = false
static var pulse_lock: bool = false
static var pulse_pause: bool = false
static var hold_block: bool = false


static func active() -> bool:
	if forced == 1:
		return true
	if forced == 0:
		return false
	if OS.has_feature("mobile"):
		return true
	if DisplayServer.is_touchscreen_available():
		return true
	if OS.has_feature("web"):
		return _web_touch()
	return false


static func wants_bout() -> bool:
	return _query().find("bout=1") >= 0


static func _web_touch() -> bool:
	var query := _query()
	if query.find("touch=1") >= 0 or query.find("bout=1") >= 0:
		return true
	var points = JavaScriptBridge.eval("(navigator.maxTouchPoints||0)", true)
	return int(points) > 0


static func _query() -> String:
	if not OS.has_feature("web"):
		return OS.get_environment("SHOOTER_QUERY")
	var value = JavaScriptBridge.eval("window.location.search", true)
	if value == null:
		return ""
	return str(value)
