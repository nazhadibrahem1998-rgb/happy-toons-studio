extends Node

signal graphics_changed(flags: Dictionary)
signal keys_changed

const ACTIONS := {
	"move_forward": KEY_W,
	"move_back": KEY_S,
	"move_left": KEY_A,
	"move_right": KEY_D,
	"sprint": KEY_SHIFT,
	"interact": KEY_E,
	"diary": KEY_TAB,
	"view": KEY_V,
	"build_mode": KEY_B,
	"rotate_piece": KEY_R,
	"page_bag": KEY_I,
	"page_quests": KEY_J,
	"page_overheard": KEY_O,
	"page_map": KEY_M,
	"page_skills": KEY_K,
}
const ARROWS := {
	"move_forward": KEY_UP,
	"move_back": KEY_DOWN,
	"move_left": KEY_LEFT,
	"move_right": KEY_RIGHT,
}

var preset := "medium"
var detected := false
var scale := 1.0
var fsr := false
var vsync := true
var fps_cap := 0
var sensitivity := 1.0
var invert_y := false
var volume := 0.8
var subtitle := "medium"
var fullscreen := false
var keybinds := {}
var rebind_action := ""
var path_override := ""
var age_override := ""

func _ready() -> void:
	for action in ACTIONS.keys():
		keybinds[action] = int(ACTIONS[action])
	if FileAccess.file_exists(_path()):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(_path()))
		if typeof(parsed) == TYPE_DICTIONARY:
			_apply_dict(parsed)
			detected = true
	if not detected:
		preset = GraphicsRules.preset_for_adapter(RenderingServer.get_video_adapter_name(), 0)
		detected = true
		save()
	_install_actions()
	call_deferred("apply_runtime")

func _path() -> String:
	if path_override != "":
		return path_override
	return "user://sharsten_settings.json"

func age_path() -> String:
	if age_override != "":
		return age_override
	return "user://sharsten_age.json"

func _apply_dict(d: Dictionary) -> void:
	preset = str(d.get("preset", preset))
	if preset not in GraphicsRules.ORDER:
		preset = "medium"
	scale = GraphicsRules.clamp_scale(float(d.get("scale", scale)))
	fsr = bool(d.get("fsr", fsr))
	vsync = bool(d.get("vsync", vsync))
	fps_cap = int(d.get("fps_cap", fps_cap))
	sensitivity = clampf(float(d.get("sensitivity", sensitivity)), 0.2, 3.0)
	invert_y = bool(d.get("invert_y", invert_y))
	volume = clampf(float(d.get("volume", volume)), 0.0, 1.0)
	subtitle = str(d.get("subtitle", subtitle))
	fullscreen = bool(d.get("fullscreen", fullscreen))
	var keys = d.get("keys", {})
	if typeof(keys) == TYPE_DICTIONARY:
		for action in ACTIONS.keys():
			if keys.has(action):
				keybinds[action] = int(keys[action])

func to_dict() -> Dictionary:
	return {
		"version": 1,
		"preset": preset,
		"scale": scale,
		"fsr": fsr,
		"vsync": vsync,
		"fps_cap": fps_cap,
		"sensitivity": sensitivity,
		"invert_y": invert_y,
		"volume": volume,
		"subtitle": subtitle,
		"fullscreen": fullscreen,
		"keys": keybinds.duplicate(),
	}

func save() -> void:
	SaveFile.write_atomic(_path(), to_dict())

func set_preset(id: String) -> void:
	if id not in GraphicsRules.ORDER:
		return
	preset = id
	save()
	apply_runtime()
	graphics_changed.emit(current_flags())

func current_flags() -> Dictionary:
	var method := RenderingServer.get_current_rendering_method()
	return GraphicsRules.for_renderer(GraphicsRules.flags(preset), method)

func apply_runtime() -> void:
	_install_actions()
	_apply_audio()
	_apply_window()

func _apply_audio() -> void:
	var bus := AudioServer.get_bus_index("Master")
	if bus < 0:
		return
	var v := maxf(volume, 0.0001)
	AudioServer.set_bus_volume_db(bus, linear_to_db(v))
	AudioServer.set_bus_mute(bus, volume <= 0.001)

func _apply_window() -> void:
	Engine.max_fps = fps_cap
	var adapter := RenderingServer.get_video_adapter_name().to_lower()
	var software := adapter.find("llvmpipe") >= 0 or adapter.find("softpipe") >= 0 or adapter.find("lavapipe") >= 0
	if not software:
		var mode := DisplayServer.VSYNC_ENABLED if vsync else DisplayServer.VSYNC_DISABLED
		DisplayServer.window_set_vsync_mode(mode)
	var win := get_tree().root if is_inside_tree() else null
	if win == null:
		return
	win.scaling_3d_scale = scale
	if GraphicsRules.scaling_mode(fsr, scale) == "fsr2":
		win.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR2
	else:
		win.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	match int(current_flags().get("msaa", 0)):
		4:
			win.msaa_3d = Viewport.MSAA_4X
		2:
			win.msaa_3d = Viewport.MSAA_2X
		_:
			win.msaa_3d = Viewport.MSAA_DISABLED
	if fullscreen:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)

func _install_actions() -> void:
	for action in ACTIONS.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		InputMap.action_erase_events(action)
		var ev := InputEventKey.new()
		ev.physical_keycode = int(keybinds.get(action, ACTIONS[action])) as Key
		InputMap.action_add_event(action, ev)
		if ARROWS.has(action):
			var arrow := InputEventKey.new()
			arrow.physical_keycode = int(ARROWS[action]) as Key
			InputMap.action_add_event(action, arrow)

func try_rebind(action: String, code: Key) -> String:
	if not ACTIONS.has(action):
		return "unknown"
	for other in keybinds.keys():
		if other != action and int(keybinds[other]) == int(code):
			return "used"
	keybinds[action] = int(code)
	_install_actions()
	save()
	keys_changed.emit()
	return "ok"

func key_label(action: String) -> String:
	return OS.get_keycode_string(int(keybinds.get(action, 0)))

func subtitle_px() -> int:
	match subtitle:
		"small":
			return 18
		"large":
			return 28
		_:
			return 22

func look_sens() -> float:
	return 0.00215 * sensitivity
