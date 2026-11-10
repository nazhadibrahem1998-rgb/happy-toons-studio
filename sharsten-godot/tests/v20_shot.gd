extends Node

var phase := "boot"
var frames := 0
var boot: Node
var failed := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Settings.preset = "low"
	Settings.vsync = false
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-v20-shot.json"
	_wipe(GameState.save_path())
	var age := "/tmp/sharsten-v20-age.json"
	Settings.age_override = age
	AgeGate.write_passed(age)
	GameState.start_new()
	GameState.save_now()
	_apply_size(Vector2i(1920, 1080))
	boot = load("res://scripts/boot.gd").new()
	add_child(boot)
	phase = "menu"
	frames = 0

func _process(_delta: float) -> void:
	frames += 1
	if phase == "menu":
		if frames == 3:
			boot._title()
		if frames == 8:
			_check_menu()
			_save("v20-menu-1920.jpg")
			_apply_size(Vector2i(1366, 768))
		if frames == 14:
			_save("v20-menu-1366.jpg")
			boot.queue_free()
			boot = null
			_apply_size(Vector2i(1920, 1080))
			add_child(load("res://scripts/world/village_world.gd").new())
			phase = "world"
			frames = 0
		return
	if phase != "world":
		return
	var player = get_tree().get_first_node_in_group("player")
	var ui = get_tree().get_first_node_in_group("ui")
	if player == null or ui == null or frames < 24:
		return
	player.bot_override = true
	player.bot_wish = Vector2.ZERO
	if frames == 24:
		player.global_position = Vector3(18, 0.35, 46)
		player.yaw = 0.9
		player.body_yaw = 0.9
		player.cam_target = 5.6
		player.cam_dist = 5.6
		if ui.get("deeds"):
			ui.deeds.reveal()
		GameState.subtitle_until = 0.0
		GameState.thought_until = 0.0
		GameState.save_now()
		GameState.save_notice = 8.0
	if frames == 30:
		_save("v20-minimap-1920.jpg")
		_check_hud(ui, false)
		ui._toggle_map()
	if frames == 36:
		_save("v20-map-1920.jpg")
		_check_hud(ui, true)
		ui._close_map()
		_apply_size(Vector2i(1366, 768))
	if frames == 44:
		if ui.get("deeds"):
			ui.deeds.reveal()
		GameState.subtitle_until = 0.0
		GameState.thought_until = 0.0
		GameState.save_notice = 8.0
		_save("v20-minimap-1366.jpg")
		_check_hud(ui, false)
		ui._toggle_map()
	if frames == 50:
		_save("v20-map-1366.jpg")
		_check_hud(ui, true)
		print("V20SHOT ", "ok" if not failed else "failed")
		get_tree().quit(1 if failed else 0)

func _check_menu() -> void:
	var buttons: Array = []
	_collect(boot, buttons)
	if buttons.is_empty() or str(buttons[0].text) != "Continue" or bool(buttons[0].disabled):
		failed = true
		print("V20 MENU FAIL ", buttons.size())
	else:
		print("V20 MENU ok")

func _collect(node: Node, into: Array) -> void:
	if node == null:
		return
	if node is Button:
		into.append(node)
	for child in node.get_children():
		_collect(child, into)

func _check_hud(ui, large: bool) -> void:
	var vp := get_viewport().get_visible_rect().size
	var map: Control = ui.get_node_or_null("ValleyMap")
	var label: Label = ui.objective_label
	var chip: Control = ui.get_node_or_null("SaveChip")
	var ok: bool = map != null and map.visible and label != null and label.visible and str(label.text) != ""
	if ok and large:
		ok = map.size.x >= 400.0 and map.position.x >= -1.0 and map.position.y >= -1.0
		ok = ok and map.position.x + map.size.x <= vp.x + 2.0 and map.position.y + map.size.y <= vp.y + 2.0
	elif ok:
		ok = map.size.x >= 120.0 and map.size.y >= 120.0
		ok = ok and map.position.x + map.size.x <= vp.x + 2.0 and map.position.y + map.size.y <= vp.y + 2.0
		var deed := Rect2(label.position, Vector2(maxf(label.size.x, 80.0), maxf(label.size.y, 18.0)))
		var map_rect := Rect2(map.position, map.size)
		if deed.intersects(map_rect):
			ok = false
			print("V20 OVERLAP ", deed, " ", map_rect)
		ok = ok and chip != null and chip.visible
	if not ok:
		failed = true
		print("V20 HUD FAIL large=", large, " vp=", vp, " map=", map.size if map else "none", " at ", map.position if map else "none", " deed=", label.text if label else "", " vis=", label.visible if label else false)
	else:
		print("V20 HUD ok large=", large, " vp=", vp, " map=", map.size, " deed=", label.text)

func _apply_size(sz: Vector2i) -> void:
	var win := get_window()
	win.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	win.content_scale_size = sz
	win.size = sz
	DisplayServer.window_set_size(sz)
	get_tree().root.size = sz

func _save(file_name: String) -> void:
	GameState.subtitle_until = 0.0
	GameState.thought_until = 0.0
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://qa/v20/" + file_name)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	img.save_jpg(path, 0.86)
	print("V20SHOT ", file_name, " ", img.get_width(), "x", img.get_height())

func _wipe(path: String) -> void:
	for suffix in ["", ".bak", ".tmp"]:
		DirAccess.remove_absolute(path + suffix)
