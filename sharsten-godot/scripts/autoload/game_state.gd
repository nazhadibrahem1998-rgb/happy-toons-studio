extends Node

signal refreshed
signal thought_changed
signal subtitle_changed
signal moved

const SkillRulesS = preload("res://scripts/sim/skill_rules.gd")
const CraftRulesS = preload("res://scripts/sim/craft_rules.gd")
const QuestRulesS = preload("res://scripts/sim/quest_rules.gd")
const SaveFileS = preload("res://scripts/sim/save_file.gd")
const EndingS = preload("res://scripts/sim/ending.gd")
const OverhearS = preload("res://scripts/sim/overhear.gd")

var data := {}
var near_station := ""
var thought := ""
var thought_until := 0.0
var subtitle_lines: Array = []
var subtitle_until := 0.0
var active_spot := ""
var move_token := 0
var save_path_override := ""
var ignore_station := false
var _save_wait := 0.0

func _ready() -> void:
	data = SaveFileS.blank(_start())

func _process(delta: float) -> void:
	if _save_wait > 0.0:
		_save_wait -= delta
		if _save_wait <= 0.0:
			save_now()

func _start() -> Dictionary:
	if is_instance_valid(ContentDB):
		var s = ContentDB.layout.get("start", {})
		if typeof(s) == TYPE_DICTIONARY:
			return s
	return {"x": 12.0, "y": 0.0, "z": 43.2, "yaw": 0.4}

func _final() -> Dictionary:
	if is_instance_valid(ContentDB):
		var s = ContentDB.layout.get("final_start", {})
		if typeof(s) == TYPE_DICTIONARY:
			return s
	return {"x": 67.2, "y": 0.0, "z": 8.4, "yaw": 0.0}

func _spots() -> Dictionary:
	if is_instance_valid(ContentDB):
		return ContentDB.layout.get("spots", {})
	return {}

func save_path() -> String:
	if save_path_override != "":
		return save_path_override
	return "user://sharsten_save.json"

func start_new() -> void:
	data = SaveFileS.blank(_start())
	near_station = ""
	active_spot = ""
	subtitle_lines = []
	for qid in ContentDB.quest_order:
		if bool(ContentDB.quests[qid].get("autostart", false)):
			activate(qid)
	say_thought("I dreamed I woke already inside the dream. The lane smells of rain and bread.")
	refreshed.emit()

func has_save() -> bool:
	return FileAccess.file_exists(save_path())

func save_now() -> bool:
	return SaveFileS.write_atomic(save_path(), data.duplicate(true))

func autosave() -> void:
	_save_wait = 0.4

func load_game() -> bool:
	var loaded := SaveFileS.read(save_path(), _start())
	if loaded.is_empty():
		return false
	data = loaded
	move_token += 1
	moved.emit()
	refreshed.emit()
	return true

func activate(qid: String) -> void:
	if not ContentDB.quests.has(qid):
		return
	var quests: Dictionary = data["quests"]
	if quests.has(qid):
		return
	quests[qid] = {"status": "active", "progress": {}}
	data["quests"] = quests
	_after_rules()

func say_thought(text: String) -> void:
	thought = text
	thought_until = Time.get_ticks_msec() / 1000.0 + 8.0
	var thoughts: Array = data.get("thoughts", [])
	thoughts.append(text)
	while thoughts.size() > 40:
		thoughts.pop_front()
	data["thoughts"] = thoughts
	thought_changed.emit()

func show_lines(lines: Array, spot: String) -> void:
	subtitle_lines = lines
	subtitle_until = Time.get_ticks_msec() / 1000.0 + 10.0
	active_spot = spot
	subtitle_changed.emit()

func gather(item: String, base_amount: int, herb: bool = false) -> int:
	var bonus := SkillRulesS.bonus_value(ContentDB.skills, data["counters"], "gather_bonus:" + item)
	if not herb and item == "fibre":
		bonus = 0
	var n := base_amount + bonus
	CraftRulesS.give(data["inventory"], item, n)
	var key := "gather:" + item
	data["counters"][key] = int(data["counters"].get(key, 0)) + base_amount
	if herb:
		data["counters"]["gather:herb"] = int(data["counters"].get("gather:herb", 0)) + base_amount
	_after_rules()
	return n

func try_craft(recipe_id: String) -> Dictionary:
	var recipe := ContentDB.recipe(recipe_id)
	if recipe.is_empty():
		return {"ok": false, "reason": "missing"}
	if bool(recipe.get("locked", false)):
		return {"ok": false, "reason": "locked"}
	var station := str(recipe.get("station", "any"))
	if station != "any" and station != near_station and not ignore_station:
		return {"ok": false, "reason": "bench"}
	if str(recipe.get("type", "craft")) == "salvage":
		return _salvage(recipe)
	var cost := SkillRulesS.apply_cost(recipe.get("cost", {}), ContentDB.skills, data["counters"])
	if not CraftRulesS.can_pay(data["inventory"], cost):
		return {"ok": false, "reason": "need", "cost": cost}
	CraftRulesS.pay(data["inventory"], cost)
	var out := str(recipe.get("output", ""))
	var count := int(recipe.get("count", 1))
	CraftRulesS.give(data["inventory"], out, count)
	data["crafted"][out] = int(data["crafted"].get(out, 0)) + count
	data["counters"]["craft:" + out] = int(data["counters"].get("craft:" + out, 0)) + count
	if bool(recipe.get("woodwork", false)):
		data["counters"]["craft:wood_items"] = int(data["counters"].get("craft:wood_items", 0)) + count
	_after_rules()
	return {"ok": true, "cost": cost}

func _salvage(recipe: Dictionary) -> Dictionary:
	var inp := str(recipe.get("input", ""))
	if int(data["inventory"].get(inp, 0)) < 1:
		return {"ok": false, "reason": "need"}
	if near_station == "" and not ignore_station:
		return {"ok": false, "reason": "bench"}
	CraftRulesS.give(data["inventory"], inp, -1)
	for k in recipe.get("yield", {}).keys():
		CraftRulesS.give(data["inventory"], str(k), int(recipe["yield"][k]))
	data["counters"]["salvage:" + inp] = int(data["counters"].get("salvage:" + inp, 0)) + 1
	_after_rules()
	return {"ok": true}

func try_trade(trade_id: String) -> Dictionary:
	var trade := {}
	for t in ContentDB.trades:
		if str(t.get("id", "")) == trade_id:
			trade = t
			break
	if trade.is_empty():
		return {"ok": false, "reason": "missing"}
	if near_station != "trade" and not ignore_station:
		return {"ok": false, "reason": "bench"}
	var give := SkillRulesS.trade_give(trade.get("give", {}), ContentDB.skills, data["counters"])
	if not CraftRulesS.can_pay(data["inventory"], give):
		return {"ok": false, "reason": "need", "cost": give}
	CraftRulesS.pay(data["inventory"], give)
	var extra := SkillRulesS.bonus_value(ContentDB.skills, data["counters"], "trade_extra")
	for k in trade.get("get", {}).keys():
		CraftRulesS.give(data["inventory"], str(k), int(trade["get"][k]) + extra)
	data["counters"]["trade:count"] = int(data["counters"].get("trade:count", 0)) + 1
	_after_rules()
	return {"ok": true, "cost": give}

func place_item(item_id: String, pos: Vector3, yaw: float) -> Dictionary:
	if int(data["inventory"].get(item_id, 0)) < 1:
		return {"ok": false, "reason": "need"}
	if not bool(ContentDB.item(item_id).get("placeable", false)):
		return {"ok": false, "reason": "noplace"}
	CraftRulesS.give(data["inventory"], item_id, -1)
	_add_placed(item_id, pos, yaw, "item")
	data["counters"]["place:" + item_id] = int(data["counters"].get("place:" + item_id, 0)) + 1
	_after_rules()
	return {"ok": true}

func raise_piece(piece_id: String, pos: Vector3, yaw: float) -> Dictionary:
	var piece := ContentDB.piece(piece_id)
	if piece.is_empty():
		return {"ok": false, "reason": "missing"}
	if near_station == "" and not ignore_station:
		return {"ok": false, "reason": "bench"}
	var grid := float(piece.get("snap", 1.5))
	var snapped := BuildRules.snap(pos, grid)
	snapped.y = 0.0
	yaw = BuildRules.yaw_step(yaw, int(piece.get("yaw_steps", 4)))
	if BuildRules.blocked(data["placed"], snapped, grid * 0.72):
		return {"ok": false, "reason": "blocked", "pos": snapped}
	var cost := SkillRulesS.apply_cost(piece.get("cost", {}), ContentDB.skills, data["counters"])
	if not CraftRulesS.can_pay(data["inventory"], cost):
		return {"ok": false, "reason": "need", "cost": cost}
	CraftRulesS.pay(data["inventory"], cost)
	_add_placed(piece_id, snapped, yaw, "build")
	_after_rules()
	return {"ok": true, "pos": snapped, "yaw": yaw, "cost": cost}

func _add_placed(what: String, pos: Vector3, yaw: float, source: String) -> void:
	var placed: Array = data["placed"]
	placed.append({
		"what": what,
		"x": pos.x,
		"y": pos.y,
		"z": pos.z,
		"yaw": yaw,
		"source": source,
	})
	data["placed"] = placed

func hear(conv: Dictionary) -> void:
	var id := str(conv.get("id", ""))
	if data["seen_conv"].has(id):
		return
	(data["seen_conv"] as Array).append(id)
	var lines: Array = []
	for line in conv.get("lines", []):
		var sid := str(line.get("speaker", ""))
		var row := {
			"id": id,
			"speaker": sid,
			"name": ContentDB.npc_label(sid),
			"text": str(line.get("text", "")),
		}
		var heard: Array = data["heard"]
		heard.append(row)
		while heard.size() > 200:
			heard.pop_front()
		data["heard"] = heard
		lines.append(row)
	var qid := str(conv.get("starts_quest", ""))
	if qid != "":
		activate(qid)
	show_lines(lines, str(conv.get("spot", "")))
	_after_rules()

func read_note(note_id: String) -> Dictionary:
	var note: Dictionary = ContentDB.notes.get(note_id, {})
	if note.is_empty():
		return {}
	if not (data["notes_read"] as Array).has(note_id):
		(data["notes_read"] as Array).append(note_id)
	var qid := str(note.get("starts_quest", ""))
	if qid != "":
		activate(qid)
	_after_rules()
	return note

func touch_rune(flag: String) -> void:
	data["flags"][flag] = true
	fire_puzzle(flag, {})
	_after_rules()

func fire_puzzle(id: String, payload: Dictionary) -> void:
	data["flags"]["puzzle:" + id] = true
	data["counters"]["puzzle:" + id] = int(data["counters"].get("puzzle:" + id, 0)) + 1

func poll_overhear(pos: Vector3) -> void:
	var seen := {}
	for id in data["seen_conv"]:
		seen[str(id)] = true
	var due := OverhearS.poll(ContentDB.conversations, _spots(), seen, pos)
	for conv in due:
		hear(conv)

func choose(color: String) -> Dictionary:
	data = EndingS.apply(data, color, _final())
	if str(data.get("thought", "")) != "":
		say_thought(str(data["thought"]))
	move_token += 1
	moved.emit()
	_check_gate()
	save_now()
	refreshed.emit()
	return {"result": data.get("result", ""), "banner": data.get("banner", "")}

func _after_rules() -> void:
	var done: Array = QuestRulesS.refresh(ContentDB.quests, data, _spots())
	if done.has("first_steps"):
		say_thought("The mallet sits right in the hand. Voices carry from the spoon stall. Papers wait on the mosque step, by the pasture, and on a basket in the lane.")
	_check_gate()
	autosave()
	refreshed.emit()

func _check_gate() -> void:
	var open := QuestRulesS.gate_ready(ContentDB.quests, data)
	if open and not bool(data.get("gate_open", false)):
		data["gate_open"] = true
		say_thought("The north mist thins. The star spring is listening.")
	elif open:
		data["gate_open"] = true

func missing_deeds() -> Array:
	return QuestRulesS.missing_titles(ContentDB.quests, data)

func skill_rank(id: String) -> int:
	for defn in ContentDB.skills:
		if str(defn.get("id", "")) == id:
			return SkillRulesS.rank_of(defn, data["counters"])
	return 0
