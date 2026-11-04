extends Node

var age_edit: LineEdit
var root_ui: Control

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	root_ui = Control.new()
	root_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root_ui)
	var bg := ColorRect.new()
	bg.color = Color("1c1612")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_ui.add_child(bg)
	if AgeGate.read_passed(Settings.age_path()):
		_title()
	else:
		_age()

func _unhandled_input(event: InputEvent) -> void:
	if Settings.rebind_action != "" and event is InputEventKey and event.pressed and not event.echo:
		Settings.try_rebind(Settings.rebind_action, (event as InputEventKey).physical_keycode)
		Settings.rebind_action = ""
		if root_ui.get_node_or_null("SettingsRoot"):
			Desk.build_settings(root_ui, _close_settings)
		get_viewport().set_input_as_handled()

func _clear_menu() -> void:
	for c in root_ui.get_children():
		if c is ColorRect:
			continue
		c.queue_free()

func _age() -> void:
	_clear_menu()
	var panel := Desk.panel(Vector2(520, 360))
	Desk.center(panel)
	root_ui.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)
	box.add_child(Desk.label("Sharsten", 36, Color("f6edd8")))
	box.add_child(Desk.label("Sharsten is for players aged 25 and over.", 16, Color("f0e2c4")))
	box.add_child(Desk.label("Enter the year you were born. It is not stored.", 16, Color("f0e2c4")))
	age_edit = LineEdit.new()
	age_edit.placeholder_text = "Birth year"
	age_edit.custom_minimum_size = Vector2(240, 36)
	age_edit.max_length = 4
	age_edit.alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(age_edit)
	age_edit.text_submitted.connect(func(_t): _submit_age())
	var go := Desk.button("Continue")
	go.pressed.connect(_submit_age)
	box.add_child(go)

func _submit_age() -> void:
	var year := int(age_edit.text.strip_edges()) if age_edit.text.strip_edges().is_valid_int() else 0
	var now := int(Time.get_datetime_dict_from_system().year)
	var result := AgeGate.submit(year, now, Settings.age_path())
	age_edit.text = ""
	if result == "ok":
		_title()
	elif result == "young":
		_young()
	else:
		GameState.say_thought("")
		_age()
		# rewrite with a hint
		_clear_menu()
		var panel := Desk.panel(Vector2(520, 280))
		Desk.center(panel)
		root_ui.add_child(panel)
		var box := VBoxContainer.new()
		panel.add_child(box)
		box.add_child(Desk.label("Enter the year you were born.", 18, Color("f6edd8")))
		var back := Desk.button("Back")
		back.pressed.connect(_age)
		box.add_child(back)

func _young() -> void:
	_clear_menu()
	var panel := Desk.panel(Vector2(560, 300))
	Desk.center(panel)
	root_ui.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)
	box.add_child(Desk.label("This game is for players 25+", 28, Color("f6edd8")))
	box.add_child(Desk.label("Thank you for understanding. Sharsten is made for adults in their mid-twenties and older.", 16, Color("f0e2c4")))
	var back := Desk.button("Back")
	back.pressed.connect(_age)
	box.add_child(back)
	var quit := Desk.button("Quit")
	quit.pressed.connect(func(): get_tree().quit())
	box.add_child(quit)

func _title() -> void:
	_clear_menu()
	var panel := Desk.panel(Vector2(520, 520))
	Desk.center(panel)
	root_ui.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(Desk.label("Sharsten", 40, Color("f6edd8")))
	box.add_child(Desk.label("Part 1 — The Dream", 20, Color("f0e2c4")))
	box.add_child(Desk.label("A handmade valley. People talk to each other. You overhear them.", 15, Color("f0e2c4")))
	var new_b := Desk.button("New dream")
	new_b.pressed.connect(_confirm_new)
	box.add_child(new_b)
	var cont := Desk.button("Continue")
	cont.disabled = not GameState.has_save()
	cont.pressed.connect(_continue)
	box.add_child(cont)
	var settings := Desk.button("Settings")
	settings.pressed.connect(func(): Desk.build_settings(root_ui, _close_settings))
	box.add_child(settings)
	var credits := Desk.button("Credits")
	credits.pressed.connect(_credits)
	box.add_child(credits)
	var quit := Desk.button("Quit")
	quit.pressed.connect(func(): get_tree().quit())
	box.add_child(quit)

func _close_settings() -> void:
	if root_ui.get_node_or_null("SettingsRoot"):
		root_ui.get_node("SettingsRoot").queue_free()

func _credits() -> void:
	_clear_menu()
	var panel := Desk.panel(Vector2(720, 560))
	Desk.center(panel)
	root_ui.add_child(panel)
	var box := VBoxContainer.new()
	panel.add_child(box)
	box.add_child(Desk.label("Credits", 28, Color("f6edd8")))
	var rt := RichTextLabel.new()
	rt.text = Desk.credits_text()
	rt.custom_minimum_size = Vector2(660, 380)
	rt.scroll_active = true
	rt.add_theme_color_override("default_color", Color("f3e6c8"))
	rt.add_theme_font_size_override("normal_font_size", 16)
	box.add_child(rt)
	var back := Desk.button("Back", 140)
	back.pressed.connect(_title)
	box.add_child(back)

func _confirm_new() -> void:
	if not GameState.has_save():
		_begin()
		return
	_clear_menu()
	var panel := Desk.panel(Vector2(520, 260))
	Desk.center(panel)
	root_ui.add_child(panel)
	var box := VBoxContainer.new()
	panel.add_child(box)
	box.add_child(Desk.label("Begin a new dream? The written one will be put aside.", 18, Color("f6edd8")))
	var go := Desk.button("Begin")
	go.pressed.connect(_begin)
	box.add_child(go)
	var back := Desk.button("Cancel")
	back.pressed.connect(_title)
	box.add_child(back)

func _begin() -> void:
	GameState.start_new()
	_enter()

func _continue() -> void:
	if GameState.load_game():
		_enter()

func _enter() -> void:
	for c in get_children():
		c.queue_free()
	var world := VillageWorld.new()
	world.exit_to_title.connect(_back_to_title)
	add_child(world)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _back_to_title() -> void:
	for c in get_children():
		c.queue_free()
	_ready()
