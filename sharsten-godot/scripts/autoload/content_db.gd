extends Node

var items := {}
var recipes := []
var skills := []
var pieces := []
var quests := {}
var quest_order: Array = []
var npcs := {}
var npc_order: Array = []
var conversations: Array = []
var notes := {}
var relics := {}
var relic_order: Array = []
var trades: Array = []
var layout := {}
var errors: Array = []

func _ready() -> void:
	items = _index(_load("res://data/items.json"), "items")
	recipes = _load("res://data/recipes.json").get("recipes", [])
	skills = _load("res://data/skills.json").get("skills", [])
	pieces = _load("res://data/buildings.json").get("pieces", [])
	var q := _load("res://data/quests.json")
	for defn in q.get("quests", []):
		quests[str(defn.get("id", ""))] = defn
		quest_order.append(str(defn.get("id", "")))
	var n := _load("res://data/npcs.json")
	for defn in n.get("npcs", []):
		npcs[str(defn.get("id", ""))] = defn
		npc_order.append(str(defn.get("id", "")))
	conversations = _load("res://data/dialogue.json").get("conversations", [])
	notes = _index(_load("res://data/notes.json"), "notes")
	var relics_file := _load("res://data/relics.json")
	for row in relics_file.get("relics", []):
		relics[str(row.get("id", ""))] = row
		relic_order.append(str(row.get("id", "")))
	trades = _load("res://data/trades.json").get("trades", [])
	layout = _load("res://data/layout.json")
	_validate()

func _load(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		errors.append("missing " + path)
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		errors.append("bad json " + path)
		return {}
	return parsed

func _index(data: Dictionary, key: String) -> Dictionary:
	var out := {}
	for row in data.get(key, []):
		out[str(row.get("id", ""))] = row
	return out

func item(id: String) -> Dictionary:
	return items.get(id, {})

func item_name(id: String) -> String:
	return str(item(id).get("name", id))

func recipe(id: String) -> Dictionary:
	for r in recipes:
		if str(r.get("id", "")) == id:
			return r
	return {}

func piece(id: String) -> Dictionary:
	for p in pieces:
		if str(p.get("id", "")) == id:
			return p
	return {}

func npc(id: String) -> Dictionary:
	return npcs.get(id, {})

func npc_label(id: String) -> String:
	var n: Dictionary = npc(id)
	if n.is_empty():
		return id
	return "%s (%s)" % [n.get("name", id), n.get("gloss", "")]

func spot(id: String) -> Dictionary:
	var spots: Dictionary = layout.get("spots", {})
	var s = spots.get(id, {})
	if typeof(s) != TYPE_DICTIONARY:
		return {}
	return s

func _validate() -> void:
	for r in recipes:
		var out := str(r.get("output", ""))
		var inp := str(r.get("input", ""))
		if str(r.get("type", "craft")) == "salvage":
			if not items.has(inp):
				errors.append("salvage input " + inp)
			for k in r.get("yield", {}).keys():
				if not items.has(str(k)):
					errors.append("yield " + str(k))
		else:
			if out != "" and not items.has(out):
				errors.append("recipe output " + out)
			for k in r.get("cost", {}).keys():
				if not items.has(str(k)):
					errors.append("cost " + str(k))
	var locked := {}
	for r in recipes:
		if bool(r.get("locked", false)):
			locked[str(r.get("output", ""))] = true
	for need in ["windmill", "water_wheel", "rocket"]:
		if not locked.has(need):
			errors.append("missing locked " + need)
	for conv in conversations:
		for line in conv.get("lines", []):
			var sid := str(line.get("speaker", ""))
			if not npcs.has(sid):
				errors.append("speaker " + sid)
		var qid := str(conv.get("starts_quest", ""))
		if qid != "" and not quests.has(qid):
			errors.append("conv quest " + qid)
	for qid in quests.keys():
		for obj in quests[qid].get("objectives", []):
			if obj.has("spot") and str(obj["spot"]) != "" and spot(str(obj["spot"])).is_empty():
				errors.append("quest spot " + str(obj["spot"]))
	if npc_order.size() != 24:
		errors.append("npc count %d" % npc_order.size())
	var tall := 0.0
	var tall_id := ""
	for id in npc_order:
		var h := float(npcs[id].get("height", 1.0))
		if h > tall:
			tall = h
			tall_id = id
	if tall_id != "khola_direzh":
		errors.append("tallest is " + tall_id)
	if errors.size() > 0:
		push_error("ContentDB: " + ", ".join(errors))
