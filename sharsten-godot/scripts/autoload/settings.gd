extends Node

signal graphics_changed(flags: Dictionary)
signal keys_changed

const ACTIONS := {
	"move_forward": KEY_W,
	"move_back": KEY_S,
	"move_left": KEY_A,
	"move_right": KEY_D,
	"sprint": KEY_SHIFT,
	"free_look": KEY_CTRL,
	"crouch": KEY_C,
	"jump": KEY_SPACE,
	"dodge": KEY_Q,
	"block": KEY_F,
	"weapon": KEY_X,
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
	"slot_1": KEY_1,
	"slot_2": KEY_2,
	"slot_3": KEY_3,
	"slot_4": KEY_4,
	"slot_5": KEY_5,
	"slot_6": KEY_6,
	"slot_7": KEY_7,
	"slot_8": KEY_8,
	"zoom_in": KEY_EQUAL,
	"zoom_out": KEY_MINUS,
}
const MOUSE_ACTIONS := {
	"attack": MOUSE_BUTTON_LEFT,
	"aim": MOUSE_BUTTON_RIGHT,
	"focus": MOUSE_BUTTON_MIDDLE,
	"hotbar_prev": MOUSE_BUTTON_WHEEL_UP,
	"hotbar_next": MOUSE_BUTTON_WHEEL_DOWN,
}
const ARROWS := {
	"move_forward": KEY_UP,
	"move_back": KEY_DOWN,
	"move_left": KEY_LEFT,
	"move_right": KEY_RIGHT,
}
const SETTINGS_VERSION := 6

var preset := "medium"
var detected := false
var scale := 1.0
var fsr_mode := "fsr2"
var vsync := true
var fps_cap := 0
var sensitivity := 1.0
var invert_y := false
var volume := 0.8
var music := 0.7
var subtitle := "medium"
var fullscreen := false
var resolution := "1920x1080"
var shadows_mode := "preset"
var aa_mode := "preset"
var fog_mode := "preset"
var view_mul := 1.0
var ambience := 0.8
var sfx := 0.8
var language := "en"
var show_hints := true
var rain := true
var keybinds := {}
var mouse_binds := {}
var rebind_action := ""
var path_override := ""
var age_override := ""

func _ready() -> void:
	for action in ACTIONS.keys():
		keybinds[action] = int(ACTIONS[action])
	for action in MOUSE_ACTIONS.keys():
		mouse_binds[action] = int(MOUSE_ACTIONS[action])
	var migrated := false
	if FileAccess.file_exists(_path()):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(_path()))
		if typeof(parsed) == TYPE_DICTIONARY:
			migrated = _apply_dict(parsed)
			detected = true
	if not detected:
		preset = GraphicsRules.preset_for_adapter(RenderingServer.get_video_adapter_name(), 0)
		fsr_mode = "fsr2"
		if preset == "low":
			scale = 0.67
		elif preset == "medium":
			scale = 0.85
		detected = true
		save()
	elif migrated:
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

func _apply_dict(d: Dictionary) -> bool:
	preset = str(d.get("preset", preset))
	if preset not in GraphicsRules.ORDER:
		preset = "medium"
	scale = GraphicsRules.clamp_scale(float(d.get("scale", scale)))
	if typeof(d.get("fsr", fsr_mode)) == TYPE_BOOL:
		fsr_mode = "fsr2" if bool(d.get("fsr", false)) else "off"
	else:
		fsr_mode = str(d.get("fsr_mode", d.get("fsr", fsr_mode)))
	if fsr_mode != "off" and fsr_mode != "fsr1" and fsr_mode != "fsr2":
		fsr_mode = "off"
	vsync = bool(d.get("vsync", vsync))
	fps_cap = int(d.get("fps_cap", fps_cap))
	sensitivity = clampf(float(d.get("sensitivity", sensitivity)), 0.2, 3.0)
	invert_y = bool(d.get("invert_y", invert_y))
	# Version 5 and older are forced back to mouse-up = look-up once.
	# A later toggle of Invert Y is kept.
	volume = clampf(float(d.get("volume", volume)), 0.0, 1.0)
	music = clampf(float(d.get("music", music)), 0.0, 1.0)
	subtitle = str(d.get("subtitle", subtitle))
	fullscreen = bool(d.get("fullscreen", fullscreen))
	resolution = str(d.get("resolution", resolution))
	shadows_mode = _choice(str(d.get("shadows_mode", shadows_mode)), ["preset", "on", "off"])
	aa_mode = _choice(str(d.get("aa_mode", aa_mode)), ["preset", "off", "2x", "4x"])
	fog_mode = _choice(str(d.get("fog_mode", fog_mode)), ["preset", "off", "light", "dream"])
	view_mul = clampf(float(d.get("view_mul", view_mul)), 0.55, 1.4)
	ambience = clampf(float(d.get("ambience", ambience)), 0.0, 1.0)
	sfx = clampf(float(d.get("sfx", sfx)), 0.0, 1.0)
	language = "en" if str(d.get("language", "en")) != "ku" else "ku"
	show_hints = bool(d.get("show_hints", show_hints))
	rain = bool(d.get("rain", rain))
	var keys = d.get("keys", {})
	var file_version := int(d.get("version", 0))
	var migrated := file_version < SETTINGS_VERSION
	if file_version < 6:
		invert_y = false
		migrated = true
	if typeof(keys) == TYPE_DICTIONARY:
		for action in ACTIONS.keys():
			if keys.has(action):
				keybinds[action] = int(keys[action])
			elif action == "sprint" or action == "free_look" or action == "crouch":
				migrated = true
	if not _key_ok(int(keybinds.get("sprint", 0))):
		keybinds["sprint"] = int(KEY_SHIFT)
		migrated = true
	if not _key_ok(int(keybinds.get("free_look", 0))):
		keybinds["free_look"] = int(KEY_CTRL)
		migrated = true
	if not _key_ok(int(keybinds.get("crouch", 0))):
		keybinds["crouch"] = int(KEY_C)
		migrated = true
	var mice = d.get("mouse", {})
	if typeof(mice) == TYPE_DICTIONARY:
		for action in MOUSE_ACTIONS.keys():
			if mice.has(action):
				mouse_binds[action] = int(mice[action])
	return migrated

func _key_ok(code: int) -> bool:
	# 4194305 is KEY_ESCAPE. A rebind used to store Escape when the owner
	# closed the controls screen, so run never saw Shift (4194325).
	if code == 0 or code == KEY_NONE or code == KEY_ESCAPE:
		return false
	return OS.get_keycode_string(code) != ""

func event_key(event: InputEventKey) -> int:
	var physical := int(event.physical_keycode)
	var logical := int(event.keycode)
	if physical == KEY_SHIFT or logical == KEY_SHIFT:
		return int(KEY_SHIFT)
	if physical == KEY_CTRL or logical == KEY_CTRL:
		return int(KEY_CTRL)
	if physical != 0:
		return physical
	return logical

func to_dict() -> Dictionary:
	return {
		"version": SETTINGS_VERSION,
		"preset": preset,
		"scale": scale,
		"fsr_mode": fsr_mode,
		"vsync": vsync,
		"fps_cap": fps_cap,
		"sensitivity": sensitivity,
		"invert_y": invert_y,
		"volume": volume,
		"music": music,
		"subtitle": subtitle,
		"fullscreen": fullscreen,
		"resolution": resolution,
		"shadows_mode": shadows_mode,
		"aa_mode": aa_mode,
		"fog_mode": fog_mode,
		"view_mul": view_mul,
		"ambience": ambience,
		"sfx": sfx,
		"language": language,
		"show_hints": show_hints,
		"rain": rain,
		"keys": keybinds.duplicate(),
		"mouse": mouse_binds.duplicate(),
	}

func _choice(value: String, allowed: Array) -> String:
	return value if allowed.has(value) else str(allowed[0])

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
	_bus_level("Master", volume)
	_bus_level("Ambience", ambience)
	_bus_level("Music", music)
	_bus_level("SFX", sfx)

func _bus_level(bus_name: String, linear: float) -> void:
	var bus := AudioServer.get_bus_index(bus_name)
	if bus < 0:
		return
	AudioServer.set_bus_volume_db(bus, linear_to_db(maxf(linear, 0.0001)))
	AudioServer.set_bus_mute(bus, linear <= 0.001)

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
	match GraphicsRules.scaling_mode(fsr_mode, scale):
		"fsr1":
			win.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR
		"fsr2":
			win.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR2
		_:
			win.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	var msaa := int(current_flags().get("msaa", 0))
	if aa_mode == "off":
		msaa = 0
	elif aa_mode == "2x":
		msaa = 2
	elif aa_mode == "4x":
		msaa = 4
	var use_taa := aa_mode == "preset" and preset != "low"
	if use_taa:
		msaa = 0
	match msaa:
		4:
			win.msaa_3d = Viewport.MSAA_4X
		2:
			win.msaa_3d = Viewport.MSAA_2X
		_:
			win.msaa_3d = Viewport.MSAA_DISABLED
	win.use_taa = use_taa
	if DisplayServer.get_name() == "headless":
		return
	if fullscreen:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		var parts := resolution.split("x")
		if parts.size() == 2:
			var sz := Vector2i(int(parts[0]), int(parts[1]))
			if sz.x >= 1280 and sz.y >= 720:
				DisplayServer.window_set_size(sz)

func _install_actions() -> void:
	for action in ACTIONS.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		InputMap.action_erase_events(action)
		_bind_key(action, int(keybinds.get(action, ACTIONS[action])))
		if ARROWS.has(action):
			var arrow := InputEventKey.new()
			arrow.physical_keycode = int(ARROWS[action]) as Key
			InputMap.action_add_event(action, arrow)
	for action in MOUSE_ACTIONS.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		InputMap.action_erase_events(action)
		var mb := InputEventMouseButton.new()
		mb.button_index = int(mouse_binds.get(action, MOUSE_ACTIONS[action]))
		InputMap.action_add_event(action, mb)

func _bind_key(action: String, code: int) -> void:
	if code == KEY_SHIFT or code == KEY_CTRL:
		for loc in [0, 1, 2]:
			var ev := InputEventKey.new()
			ev.physical_keycode = code as Key
			ev.keycode = code as Key
			ev.location = loc
			InputMap.action_add_event(action, ev)
		return
	var ev := InputEventKey.new()
	ev.physical_keycode = code as Key
	ev.keycode = code as Key
	InputMap.action_add_event(action, ev)

func try_rebind(action: String, code: Key) -> String:
	if not ACTIONS.has(action):
		return "unknown"
	if int(code) == 0 or int(code) == KEY_NONE or int(code) == KEY_ESCAPE:
		return "cancel"
	for other in keybinds.keys():
		if other != action and int(keybinds[other]) == int(code):
			return "used"
	keybinds[action] = int(code)
	_install_actions()
	save()
	keys_changed.emit()
	return "ok"

func try_rebind_mouse(action: String, button: int) -> String:
	if not MOUSE_ACTIONS.has(action):
		return "unknown"
	for other in mouse_binds.keys():
		if other != action and int(mouse_binds[other]) == button:
			return "used"
	mouse_binds[action] = button
	_install_actions()
	save()
	keys_changed.emit()
	return "ok"

func key_label(action: String) -> String:
	if MOUSE_ACTIONS.has(action):
		return mouse_label(int(mouse_binds.get(action, 0)))
	return OS.get_keycode_string(int(keybinds.get(action, 0)))

func mouse_label(button: int) -> String:
	match button:
		MOUSE_BUTTON_LEFT:
			return "Left click"
		MOUSE_BUTTON_RIGHT:
			return "Right click"
		MOUSE_BUTTON_MIDDLE:
			return "Middle click"
		MOUSE_BUTTON_WHEEL_UP:
			return "Wheel up"
		MOUSE_BUTTON_WHEEL_DOWN:
			return "Wheel down"
		_:
			return "Mouse %d" % button

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
