extends CanvasLayer

signal exit_to_title

const PAGES := ["quests", "bag", "map", "overheard", "skills"]
const PAGE_TITLES := {
	"quests": "Quests",
	"bag": "Bag",
	"map": "Map",
	"overheard": "Overheard",
	"skills": "Skills",
}

var page := "quests"
var screen := "play"
var thought_label: RichTextLabel
var sub_box: VBoxContainer
var hint_label: Label
var banner: Label
var crack: ColorRect
var crack_t := -1.0
var note_panel: Control
var diary: Control
var craft: Control
var choice: Control
var pause_panel: Control
var build_card: VBoxContainer
var selected_recipe := ""
var _sub_sig := ""

func _ready() -> void:
	screen = "play"
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_to_group("ui")
	_hud()
	GameState.thought_changed.connect(func(): pass)
	GameState.refreshed.connect(_on_refresh)

func _hud() -> void:
	thought_label = RichTextLabel.new()
	thought_label.bbcode_enabled = true
	thought_label.fit_content = true
	thought_label.scroll_active = false
	thought_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	thought_label.offset_left = 360
	thought_label.offset_top = 820
	thought_label.offset_right = 1560
	thought_label.offset_bottom = 900
	thought_label.add_theme_color_override("default_color", Color("efe6ff"))
	thought_label.add_theme_font_size_override("normal_font_size", 20)
	add_child(thought_label)
	sub_box = VBoxContainer.new()
	sub_box.position = Vector2(360, 900)
	sub_box.custom_minimum_size = Vector2(1200, 80)
	sub_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(sub_box)
	hint_label = Desk.label("", 16, Color("f6edd8"))
	hint_label.position = Vector2(280, 1020)
	hint_label.custom_minimum_size = Vector2(1360, 28)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(hint_label)
	banner = Desk.label("", 32, Color("f6edd8"))
	banner.position = Vector2(360, 80)
	banner.custom_minimum_size = Vector2(1200, 80)
	banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner.visible = false
	add_child(banner)
	crack = ColorRect.new()
	crack.color = Color(1, 1, 1, 0)
	crack.set_anchors_preset(Control.PRESET_FULL_RECT)
	crack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(crack)
	build_card = VBoxContainer.new()
	build_card.position = Vector2(24, 24)
	build_card.visible = false
	add_child(build_card)

func _process(delta: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if thought_label:
		var show := GameState.thought != "" and now < GameState.thought_until
		thought_label.visible = show and screen == "play"
		if show:
			thought_label.text = "[i]%s[/i]" % GameState.thought
			thought_label.add_theme_font_size_override("normal_font_size", Settings.subtitle_px())
	_subs(now)
	_hints()
	if crack_t >= 0.0:
		crack_t += delta
		crack.color.a = clampf(crack_t / 1.4, 0.0, 1.0)
		if crack_t > 2.2:
			crack_t = -1.0
			crack.color.a = 0.0
			_show_banner()

func _subs(now: float) -> void:
	if sub_box == null:
		return
	var sig := ""
	var show := now <= GameState.subtitle_until and screen == "play"
	if show:
		for line in GameState.subtitle_lines:
			sig += str(line.get("text", ""))
	if sig == _sub_sig:
		return
	_sub_sig = sig
	for c in sub_box.get_children():
		c.queue_free()
	if not show:
		return
	for line in GameState.subtitle_lines:
		var l := RichTextLabel.new()
		l.bbcode_enabled = true
		l.fit_content = true
		l.scroll_active = false
		l.custom_minimum_size = Vector2(1100, 0)
		l.add_theme_font_size_override("normal_font_size", Settings.subtitle_px())
		l.add_theme_color_override("default_color", Color("f6edd8"))
		l.text = "[b]%s[/b]  %s" % [line.get("name", ""), line.get("text", "")]
		sub_box.add_child(l)

func _hints() -> void:
	if hint_label == null:
		return
	var player := get_tree().get_first_node_in_group("player")
	var verb := "Look"
	if player and str(player.prompt) != "":
		verb = str(player.prompt)
	var e := Settings.key_label("interact")
	var tab := Settings.key_label("diary")
	var v := Settings.key_label("view")
	var b := Settings.key_label("build_mode")
	if screen != "play":
		hint_label.text = "[Esc] Close"
	elif player and player.build_mode:
		hint_label.text = "Left click places  ·  Right click cancels  ·  [%s] Turn  ·  [%s] Leave building" % [Settings.key_label("rotate_piece"), b]
		_build_card(true)
	else:
		hint_label.text = "[%s] %s    [%s] Diary    [%s] View    [%s] Build    [Esc] Pause" % [e, verb, tab, v, b]
		_build_card(false)

func _build_card(show: bool) -> void:
	build_card.visible = show and screen == "play"
	if not show:
		return
	if build_card.get_child_count() > 0:
		return
	build_card.add_child(Desk.label("Raise from the workbench", 18, Color("f6edd8")))
	for piece in ContentDB.pieces:
		var b := Desk.button(str(piece.get("name", "")), 220)
		var id := str(piece.get("id", ""))
		b.pressed.connect(func():
			var p := get_tree().get_first_node_in_group("player")
			if p:
				p.build_id = id
		)
		build_card.add_child(b)
	build_card.add_child(Desk.label("Goods in the bag", 16, Color("f0e2c4")))
	for id in GameState.data.get("inventory", {}).keys():
		if bool(ContentDB.item(str(id)).get("placeable", false)):
			var b2 := Desk.button(ContentDB.item_name(str(id)), 220)
			var iid := str(id)
			b2.pressed.connect(func():
				var p := get_tree().get_first_node_in_group("player")
				if p:
					p.build_id = iid
			)
			build_card.add_child(b2)

func _unhandled_input(event: InputEvent) -> void:
	if Settings.rebind_action != "" and event is InputEventKey and event.pressed and not event.echo:
		var code := (event as InputEventKey).physical_keycode
		Settings.try_rebind(Settings.rebind_action, code)
		Settings.rebind_action = ""
		if get_node_or_null("SettingsRoot"):
			Desk.build_settings(self, _close_settings)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("ui_cancel") or (event is InputEventKey and event.pressed and (event as InputEventKey).physical_keycode == KEY_ESCAPE):
		_esc()
		get_viewport().set_input_as_handled()
		return
	if screen != "play":
		return
	if event.is_action_pressed("diary"):
		open_diary(page)
	elif event.is_action_pressed("page_bag"):
		open_diary("bag")
	elif event.is_action_pressed("page_quests"):
		open_diary("quests")
	elif event.is_action_pressed("page_overheard"):
		open_diary("overheard")
	elif event.is_action_pressed("page_map"):
		open_diary("map")
	elif event.is_action_pressed("page_skills"):
		open_diary("skills")

func _esc() -> void:
	if get_node_or_null("SettingsRoot"):
		_close_settings()
		return
	if screen == "note":
		_close_note()
		return
	if screen == "diary":
		_close_diary()
		return
	if screen == "craft" or screen == "trade":
		_close_craft()
		return
	if screen == "choice":
		return
	if screen == "pause":
		_resume()
		return
	if screen == "banner":
		_to_title()
		return
	var player := get_tree().get_first_node_in_group("player")
	if player and player.build_mode:
		player.set_build(false)
		return
	_open_pause()

func _pause_game(p: bool) -> void:
	get_tree().paused = p
	if p:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	else:
		var player := get_tree().get_first_node_in_group("player")
		if player and player.build_mode:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func open_diary(which: String) -> void:
	if which in PAGES:
		page = which
	_clear_panels()
	screen = "diary"
	_pause_game(true)
	diary = Desk.panel(Vector2(1040, 640))
	Desk.center(diary)
	add_child(diary)
	var h := HBoxContainer.new()
	h.set_anchors_preset(Control.PRESET_FULL_RECT)
	diary.add_child(h)
	var side := VBoxContainer.new()
	side.custom_minimum_size = Vector2(180, 0)
	side.add_theme_constant_override("separation", 8)
	side.add_child(Desk.label("Diary", 26, Color("f6edd8")))
	side.add_child(Desk.label("Leather and paper.\nNot a machine.", 14, Color("f0e2c4")))
	for id in PAGES:
		var b := Desk.button(PAGE_TITLES[id], 160)
		if id == page:
			b.text = "· " + PAGE_TITLES[id]
		var pid := str(id)
		b.pressed.connect(func(): open_diary.call_deferred(pid))
		side.add_child(b)
	var close := Desk.button("Close", 160)
	close.pressed.connect(_close_diary)
	side.add_child(close)
	h.add_child(side)
	var page_host := PanelContainer.new()
	page_host.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var paper := StyleBoxFlat.new()
	paper.bg_color = Desk.parchment()
	paper.set_corner_radius_all(4)
	paper.content_margin_left = 16
	paper.content_margin_right = 16
	paper.content_margin_top = 12
	paper.content_margin_bottom = 12
	page_host.add_theme_stylebox_override("panel", paper)
	h.add_child(page_host)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size = Vector2(760, 560)
	page_host.add_child(scroll)
	var body := VBoxContainer.new()
	body.custom_minimum_size = Vector2(740, 0)
	body.add_theme_constant_override("separation", 8)
	scroll.add_child(body)
	_fill_page(body)

func _fill_page(body: VBoxContainer) -> void:
	body.add_child(Desk.label(PAGE_TITLES.get(page, ""), 26))
	match page:
		"quests":
			var thoughts: Array = GameState.data.get("thoughts", [])
			var start := maxi(0, thoughts.size() - 3)
			for i in range(start, thoughts.size()):
				body.add_child(Desk.label(str(thoughts[i]), 15, Color("5a4060")))
			for qid in ContentDB.quest_order:
				var st: Dictionary = GameState.data["quests"].get(qid, {})
				if st.is_empty():
					continue
				var defn: Dictionary = ContentDB.quests[qid]
				var mark := "done" if str(st.get("status", "")) == "done" else "open"
				body.add_child(Desk.label("%s  —  %s" % [defn.get("title", ""), mark], 20))
				body.add_child(Desk.label(str(defn.get("summary", "")), 15))
				for obj in defn.get("objectives", []):
					var have := int(st.get("progress", {}).get(obj.get("id", ""), 0))
					body.add_child(Desk.label("    %s  (%d/%d)" % [obj.get("text", ""), have, int(obj.get("count", 1))], 15))
		"bag":
			_bag(body)
		"map":
			var sketch = load("res://scripts/ui/map_sketch.gd").new()
			body.add_child(sketch)
		"overheard":
			body.add_child(Desk.label("They were not speaking to me.", 15))
			if (GameState.data.get("heard", []) as Array).is_empty():
				body.add_child(Desk.label("Nothing overheard yet. Walk near a conversation.", 16))
			for row in GameState.data.get("heard", []):
				body.add_child(Desk.label("%s" % row.get("name", ""), 16))
				body.add_child(Desk.label(str(row.get("text", "")), 15))
		"skills":
			body.add_child(Desk.label("Level %d    experience %d" % [int(GameState.data.get("level", 1)), int(GameState.data.get("xp", 0))], 18))
			body.add_child(Desk.label("Ranks come from doing the work. They are not a list of special names.", 15))
			for defn in ContentDB.skills:
				var r := SkillRules.rank_of(defn, GameState.data["counters"])
				body.add_child(Desk.label("%s    rank %d" % [defn.get("name", ""), r], 22))
				body.add_child(Desk.label(str(defn.get("blurb", "")), 15))
				var i := 0
				for rank in defn.get("ranks", []):
					var state := "learned" if i < r else "not yet"
					body.add_child(Desk.label("    %s — %s. %s" % [rank.get("name", ""), state, rank.get("text", "")], 15))
					i += 1
				body.add_child(Desk.label(SkillRules.progress_line(defn, GameState.data["counters"]), 14, Color("5a4030")))

func _bag(body: VBoxContainer) -> void:
	var inv: Dictionary = GameState.data.get("inventory", {})
	if inv.is_empty():
		body.add_child(Desk.label("The bag is empty.", 16))
	for id in inv.keys():
		body.add_child(Desk.label("%s  × %d    %s" % [ContentDB.item_name(str(id)), int(inv[id]), ContentDB.item(str(id)).get("desc", "")], 16))
	body.add_child(Desk.label("Take apart at a workbench. Found things become materials.", 15))
	var near := GameState.near_station != "" or GameState.ignore_station
	for recipe in ContentDB.recipes:
		if str(recipe.get("type", "")) != "salvage":
			continue
		var inp := str(recipe.get("input", ""))
		if int(inv.get(inp, 0)) < 1:
			continue
		var b := Desk.button("Take apart " + ContentDB.item_name(inp), 320)
		b.disabled = not near
		var rid := str(recipe.get("id", ""))
		b.pressed.connect(func():
			var res := GameState.try_craft(rid)
			if bool(res.get("ok", false)):
				GameState.say_thought("It comes apart into useful stuff.")
			open_diary("bag")
		)
		body.add_child(b)
	if not near:
		body.add_child(Desk.label("Stand at a workbench to take things apart.", 14))

func _close_diary() -> void:
	_clear_panels()
	screen = "play"
	_pause_game(false)
	build_card.queue_free()
	build_card = VBoxContainer.new()
	build_card.position = Vector2(24, 24)
	build_card.visible = false
	add_child(build_card)

func open_station(station: String) -> void:
	if station == "trade":
		open_trade()
	else:
		open_craft(station)

func open_craft(station: String) -> void:
	_clear_panels()
	screen = "craft"
	_pause_game(true)
	craft = Desk.panel(Vector2(720, 560))
	Desk.center(craft)
	add_child(craft)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	craft.add_child(box)
	box.add_child(Desk.label("Workbench", 26, Color("f6edd8")))
	box.add_child(Desk.label("Click a recipe. Locked work waits for a later part.", 15, Color("f0e2c4")))
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(660, 360)
	box.add_child(scroll)
	var list := VBoxContainer.new()
	list.custom_minimum_size = Vector2(640, 0)
	scroll.add_child(list)
	for recipe in ContentDB.recipes:
		var st := str(recipe.get("station", "any"))
		if str(recipe.get("type", "")) == "salvage":
			continue
		if st != "any" and st != station:
			continue
		var locked := bool(recipe.get("locked", false))
		var name := ContentDB.item_name(str(recipe.get("output", "")))
		var cost := _cost_text(recipe.get("cost", {}))
		var b := Desk.button(("%s  —  later" % name) if locked else "%s    %s" % [name, cost], 560)
		b.disabled = locked
		var rid := str(recipe.get("id", ""))
		b.pressed.connect(func():
			var res := GameState.try_craft(rid)
			if bool(res.get("ok", false)):
				GameState.say_thought("Made: %s." % ContentDB.item_name(str(ContentDB.recipe(rid).get("output", ""))))
			elif str(res.get("reason", "")) == "need":
				GameState.say_thought("I am short of materials.")
			elif str(res.get("reason", "")) == "locked":
				GameState.say_thought("That invention stays shut in this dream.")
			open_craft(station)
		)
		list.add_child(b)
	var close := Desk.button("Close  [Esc]", 180)
	close.pressed.connect(_close_craft)
	box.add_child(close)

func _cost_text(cost: Dictionary) -> String:
	var bits: Array = []
	for k in cost.keys():
		bits.append("%d %s" % [int(cost[k]), ContentDB.item_name(str(k))])
	return ", ".join(bits)

func open_trade() -> void:
	_clear_panels()
	screen = "trade"
	_pause_game(true)
	craft = Desk.panel(Vector2(640, 420))
	Desk.center(craft)
	add_child(craft)
	var box := VBoxContainer.new()
	craft.add_child(box)
	box.add_child(Desk.label("The cloth", 26, Color("f6edd8")))
	box.add_child(Desk.label("No words. Set one pile down, take the other.", 15, Color("f0e2c4")))
	for t in ContentDB.trades:
		var give := _cost_text(t.get("give", {}))
		var get := _cost_text(t.get("get", {}))
		var b := Desk.button("%s   →   %s" % [give, get], 520)
		var tid := str(t.get("id", ""))
		b.pressed.connect(func():
			var res := GameState.try_trade(tid)
			if bool(res.get("ok", false)):
				GameState.say_thought("He nods. The goods were already on the cloth.")
			else:
				GameState.say_thought("The pile is short.")
			open_trade()
		)
		box.add_child(b)
	var close := Desk.button("Close  [Esc]", 180)
	close.pressed.connect(_close_craft)
	box.add_child(close)

func _close_craft() -> void:
	_clear_panels()
	screen = "play"
	_pause_game(false)

func show_note(note: Dictionary) -> void:
	_clear_panels()
	screen = "note"
	_pause_game(true)
	note_panel = Desk.panel(Vector2(640, 360))
	Desk.center(note_panel)
	add_child(note_panel)
	var box := VBoxContainer.new()
	note_panel.add_child(box)
	box.add_child(Desk.label(str(note.get("title", "Note")), 24, Color("f6edd8")))
	box.add_child(Desk.label(str(note.get("text", "")), 18, Color("f3e6c8")))
	var close := Desk.button("Close  [Esc]", 160)
	close.pressed.connect(_close_note)
	box.add_child(close)

func _close_note() -> void:
	_clear_panels()
	screen = "play"
	_pause_game(false)

func open_choice() -> void:
	if str(GameState.data.get("phase", "")) == "woke":
		return
	_clear_panels()
	screen = "choice"
	_pause_game(true)
	choice = Desk.panel(Vector2(680, 380))
	Desk.center(choice)
	add_child(choice)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	choice.add_child(box)
	box.add_child(Desk.label("The spring offers two things", 26, Color("f6edd8")))
	box.add_child(Desk.label("A red pomegranate seed, and a white stone. They are not words. They are a choice.", 16, Color("f0e2c4")))
	var red := Desk.button("Take the red pomegranate seed   [1]", 460)
	red.pressed.connect(func(): _pick("red"))
	box.add_child(red)
	var white := Desk.button("Take the white stone   [2]", 460)
	white.pressed.connect(func(): _pick("white"))
	box.add_child(white)

func _input(event: InputEvent) -> void:
	if screen != "choice":
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var code := (event as InputEventKey).physical_keycode
		if code == KEY_1:
			_pick("red")
		elif code == KEY_2:
			_pick("white")

func _pick(color: String) -> void:
	var res := GameState.choose(color)
	_clear_panels()
	if color == "white":
		screen = "play"
		_pause_game(false)
		return
	screen = "crack"
	_pause_game(true)
	var world := get_parent()
	if world and world.has_method("apply_wake"):
		world.apply_wake()
	crack_t = 0.0
	banner.text = str(res.get("banner", Ending.BANNER))

func _show_banner() -> void:
	screen = "banner"
	banner.visible = true
	banner.text = Ending.BANNER
	_pause_game(false)
	var back := Desk.button("Return to the title  [Esc]", 320)
	back.position = Vector2(800, 180)
	back.name = "TitleReturn"
	back.pressed.connect(_to_title)
	add_child(back)

func _open_pause() -> void:
	_clear_panels()
	screen = "pause"
	_pause_game(true)
	pause_panel = Desk.panel(Vector2(420, 420))
	Desk.center(pause_panel)
	add_child(pause_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	pause_panel.add_child(box)
	box.add_child(Desk.label("Paused", 28, Color("f6edd8")))
	var resume := Desk.button("Resume  [Esc]")
	resume.pressed.connect(_resume)
	box.add_child(resume)
	var save := Desk.button("Save")
	save.pressed.connect(func():
		GameState.save_now()
		GameState.say_thought("Written down.")
	)
	box.add_child(save)
	var settings := Desk.button("Settings")
	settings.pressed.connect(func(): Desk.build_settings(self, _close_settings))
	box.add_child(settings)
	var credits := Desk.button("Credits")
	credits.pressed.connect(_show_credits)
	box.add_child(credits)
	var title := Desk.button("Title")
	title.pressed.connect(func():
		GameState.save_now()
		_to_title()
	)
	box.add_child(title)

func _resume() -> void:
	_clear_panels()
	screen = "play"
	_pause_game(false)

func _close_settings() -> void:
	if get_node_or_null("SettingsRoot"):
		get_node("SettingsRoot").queue_free()

func _show_credits() -> void:
	_clear_panels()
	screen = "pause"
	var p := Desk.panel(Vector2(760, 640))
	Desk.center(p)
	p.name = "CreditsCard"
	add_child(p)
	var box := VBoxContainer.new()
	p.add_child(box)
	box.add_child(Desk.label("Credits", 28, Color("f6edd8")))
	var rt := RichTextLabel.new()
	rt.bbcode_enabled = false
	rt.text = Desk.credits_text()
	rt.custom_minimum_size = Vector2(680, 420)
	rt.size_flags_vertical = Control.SIZE_EXPAND_FILL
	rt.clip_contents = true
	rt.scroll_active = true
	rt.add_theme_color_override("default_color", Color("f3e6c8"))
	rt.add_theme_font_size_override("normal_font_size", 16)
	box.add_child(rt)
	var back := Desk.button("Back", 140)
	back.pressed.connect(_open_pause)
	box.add_child(back)

func _to_title() -> void:
	_pause_game(false)
	exit_to_title.emit()

func _clear_panels() -> void:
	for n in [diary, craft, choice, pause_panel, note_panel]:
		if is_instance_valid(n):
			n.queue_free()
	diary = null
	craft = null
	choice = null
	pause_panel = null
	note_panel = null
	if get_node_or_null("CreditsCard"):
		get_node("CreditsCard").queue_free()
	if get_node_or_null("TitleReturn"):
		get_node("TitleReturn").queue_free()

func _on_refresh() -> void:
	pass
