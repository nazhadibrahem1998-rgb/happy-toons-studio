extends Node3D

var kind := ""
var id := ""
var item := ""
var amount := 1
var herb := false
var locked := false
var flag := ""
var station := ""
var used := false
var refill := 0.0

func configure(defn: Dictionary) -> void:
	kind = str(defn.get("kind", ""))
	id = str(defn.get("id", ""))
	item = str(defn.get("item", ""))
	amount = int(defn.get("amount", 1))
	herb = bool(defn.get("herb", false))
	locked = bool(defn.get("locked", false))
	flag = str(defn.get("flag", ""))
	station = str(defn.get("station", defn.get("kind", "")))
	var at = defn.get("at", [0, 0])
	if typeof(at) == TYPE_DICTIONARY:
		position = Vector3(float(at.get("x", 0)), 0, float(at.get("z", 0)))
	else:
		position = Vector3(float(at[0]), 0, float(at[1]))
	name = id
	add_to_group("interact")
	add_to_group("ground_prop")
	_visual()
	_seat()
	_meta()

func _seat() -> void:
	var bottom := 99.0
	var meshes: Array = []
	for c in get_children():
		if c is MeshInstance3D and (c as MeshInstance3D).mesh:
			meshes.append(c)
			var aabb: AABB = (c as MeshInstance3D).transform * (c as MeshInstance3D).mesh.get_aabb()
			bottom = minf(bottom, aabb.position.y)
	if bottom > 0.02 and bottom < 50.0:
		var drop := bottom - 0.01
		for c in meshes:
			(c as MeshInstance3D).position.y -= drop

func _meta() -> void:
	set_meta("id", id)
	set_meta("kind", kind if kind != "found" else "resource")
	if kind == "station":
		set_meta("kind", "station")
		set_meta("station", station)
		set_meta("verb", "Use the workbench" if station != "trade" else "Trade")
		if station == "stump":
			add_to_group("seat")
	elif kind == "note":
		set_meta("kind", "note")
		set_meta("verb", "Read")
	elif kind == "rune":
		set_meta("kind", "rune")
		set_meta("verb", "Touch the rune")
	elif kind == "altar":
		set_meta("kind", "altar")
		set_meta("verb", "Approach the offering")
	elif kind == "board":
		set_meta("kind", "board")
		set_meta("verb", "Read the board")
	elif kind == "relic":
		set_meta("kind", "relic")
		set_meta("verb", "Study the relic")
	elif kind == "fragment":
		set_meta("kind", "fragment")
		set_meta("verb", "Take the fragment")
	elif kind == "ore" or locked:
		set_meta("kind", "resource")
		set_meta("verb", "Look at the ore")
	else:
		set_meta("kind", "resource")
		set_meta("verb", "Gather " + ContentDB.item_name(item))

func _visual() -> void:
	match kind:
		"wood":
			MeshLib.part(self, MeshLib.cyl(0.1, 0.7), MeshLib.mat("6b4226"), Vector3(0, 0.12, 0))
			MeshLib.part(self, MeshLib.cyl(0.08, 0.55), MeshLib.mat("5a3a28"), Vector3(0.12, 0.1, 0.05))
		"stone":
			MeshLib.part(self, MeshLib.sphere(0.28), MeshLib.ground_mat("9a9088", "rock", 0.8), Vector3(0, 0.2, 0))
		"clay":
			MeshLib.part(self, MeshLib.box(0.7, 0.18, 0.7), MeshLib.mat("a67c52"), Vector3(0, 0.1, 0))
		"fibre", "herb":
			MeshLib.part(self, MeshLib.box(0.28, 0.12, 0.28), MeshLib.mat("3f8a40" if kind == "herb" else "c2a06a"), Vector3(0, 0.06, 0))
		"hide":
			MeshLib.part(self, MeshLib.box(0.5, 0.7, 0.06), MeshLib.mat("8a623c"), Vector3(0, 0.6, 0))
		"found":
			MeshLib.part(self, MeshLib.box(0.35, 0.18, 0.35), MeshLib.mat("a08060"), Vector3(0, 0.12, 0))
		"ore":
			MeshLib.part(self, MeshLib.sphere(0.32), MeshLib.mat("2a2c30", 0.5, 0.4), Vector3(0, 0.22, 0))
		"rune":
			MeshLib.part(self, MeshLib.box(0.45, 0.7, 0.2), MeshLib.mat("d9d3c8"), Vector3(0, 0.4, 0))
			var glow := MeshLib.part(self, MeshLib.box(0.16, 0.16, 0.04), MeshLib.mat("f0e2a0"), Vector3(0, 0.5, -0.12))
			var gm := glow.material_override as StandardMaterial3D
			gm.emission_enabled = true
			gm.emission = Color("f0e2a0")
			gm.emission_energy_multiplier = 0.6
		"note":
			MeshLib.part(self, MeshLib.box(0.22, 0.02, 0.16), MeshLib.mat("f3e6c8"), Vector3(0, 0.4, 0))
			MeshLib.part(self, MeshLib.box(0.06, 0.5, 0.06), MeshLib.mat("6b4226"), Vector3(0, 0.25, 0))
		"station":
			_station_mesh()
		"altar":
			MeshLib.part(self, MeshLib.box(1.4, 0.4, 0.8), MeshLib.mat("e8e4dc"), Vector3(0, 0.3, 0))
			MeshLib.part(self, MeshLib.sphere(0.1), MeshLib.mat("8b1e2d"), Vector3(-0.3, 0.58, 0))
			MeshLib.part(self, MeshLib.sphere(0.1), MeshLib.mat("f4f1ea"), Vector3(0.3, 0.58, 0))
		"board":
			MeshLib.part(self, MeshLib.box(0.12, 1.5, 0.12), MeshLib.mat("6b4226"), Vector3(0, 0.75, 0))
			MeshLib.part(self, MeshLib.box(0.9, 0.7, 0.06), MeshLib.mat("e7d3a8"), Vector3(0, 1.15, 0))
		"relic":
			MeshLib.part(self, MeshLib.box(0.9, 2.2, 0.9), MeshLib.mat("5a4038", 0.6, 0.4), Vector3(0, 1.1, 0))
			MeshLib.part(self, MeshLib.box(2.2, 0.12, 0.12), MeshLib.mat("6a3a2a", 0.5, 0.45), Vector3(0, 2.0, 0))
		"fragment":
			MeshLib.part(self, MeshLib.box(0.22, 0.06, 0.16), MeshLib.mat("8a8e92", 0.45, 0.5), Vector3(0, 0.12, 0))
		_:
			MeshLib.part(self, MeshLib.box(0.3, 0.3, 0.3), MeshLib.mat("888888"), Vector3(0, 0.2, 0))

func _station_mesh() -> void:
	var wood := MeshLib.mat("6b4226")
	match station:
		"stump":
			MeshLib.part(self, MeshLib.cyl(0.35, 0.5), wood, Vector3(0, 0.28, 0))
		"carpenter":
			MeshLib.part(self, MeshLib.box(1.2, 0.7, 0.6), wood, Vector3(0, 0.4, 0))
		"clay":
			MeshLib.part(self, MeshLib.cyl(0.4, 0.35), MeshLib.mat("a67c52"), Vector3(0, 0.3, 0))
		"stone":
			MeshLib.part(self, MeshLib.box(1.1, 0.5, 0.7), MeshLib.mat("9a9088"), Vector3(0, 0.3, 0))
		"trade":
			MeshLib.part(self, MeshLib.box(1.3, 0.08, 0.7), MeshLib.mat("6b4226"), Vector3(0, 0.55, 0))
			MeshLib.part(self, MeshLib.box(0.08, 0.5, 0.08), MeshLib.mat("5a3a28"), Vector3(-0.5, 0.25, 0.25))
			MeshLib.part(self, MeshLib.box(0.08, 0.5, 0.08), MeshLib.mat("5a3a28"), Vector3(0.5, 0.25, -0.25))
		_:
			MeshLib.part(self, MeshLib.box(0.6, 0.6, 0.6), wood, Vector3(0, 0.3, 0))

func _process(delta: float) -> void:
	if not used:
		return
	refill -= delta
	if refill <= 0.0:
		used = false
		visible = true

func _puff() -> void:
	var puff := MeshInstance3D.new()
	puff.mesh = MeshLib.sphere(0.16)
	var pm := StandardMaterial3D.new()
	pm.albedo_color = Color("e7d3a1")
	pm.roughness = 0.6
	pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pm.albedo_color = Color(0.95, 0.88, 0.62, 0.85)
	pm.emission_enabled = true
	pm.emission = Color("f0d090")
	pm.emission_energy_multiplier = 0.4
	puff.material_override = pm
	puff.position = global_position + Vector3(0, 0.45, 0)
	var host := get_parent()
	if host == null:
		return
	host.add_child(puff)
	var tw := puff.create_tween()
	tw.tween_property(puff, "scale", Vector3(2.4, 2.4, 2.4), 0.32)
	tw.parallel().tween_property(puff, "position:y", puff.position.y + 0.55, 0.32)
	tw.finished.connect(puff.queue_free)

func use(_player: Node) -> void:
	if kind == "station":
		get_tree().call_group("ui", "open_station", station)
		return
	if kind == "altar":
		get_tree().call_group("ui", "open_choice")
		return
	if kind == "board":
		get_tree().call_group("ui", "open_diary", "quests")
		GameState.say_thought("The board keeps the lane's unfinished work. Nobody is waiting to explain it.")
		return
	if kind == "relic":
		GameState.study_relic()
		return
	if kind == "fragment":
		var note := GameState.pickup_relic(id)
		if not note.is_empty():
			get_tree().call_group("ui", "show_note", note)
			_puff()
			used = true
			visible = false
		return
	if kind == "note":
		var note := GameState.read_note(id)
		if not note.is_empty():
			get_tree().call_group("ui", "show_note", note)
		return
	if kind == "rune":
		if bool(GameState.data["flags"].get(flag, false)):
			GameState.say_thought("This rune is already awake.")
			return
		GameState.touch_rune(flag)
		GameState.say_thought("The rune is warm, like a stone that remembers a hand.")
		return
	if locked or kind == "ore":
		GameState.say_thought("The ore is only a shadow. It will not come loose in a dream.")
		return
	if used:
		return
	var got := GameState.gather(item, amount, herb)
	var gain := "+%d %s" % [got, ContentDB.item_name(item)]
	GameState.say_thought("I take %s." % gain)
	get_tree().call_group("ui", "show_gain", gain)
	get_tree().call_group("ambience", "play_click")
	_puff()
	used = true
	visible = false
	refill = 75.0
