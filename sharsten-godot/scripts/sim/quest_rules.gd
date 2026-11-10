extends RefCounted
class_name QuestRules

static func measure(obj: Dictionary, state: Dictionary, spots: Dictionary) -> int:
	var t := str(obj.get("type", ""))
	var counters: Dictionary = state.get("counters", {})
	var inv: Dictionary = state.get("inventory", {})
	var crafted: Dictionary = state.get("crafted", {})
	var flags: Dictionary = state.get("flags", {})
	if t == "gather":
		return int(counters.get("gather:" + str(obj.get("item", "")), 0))
	if t == "craft":
		return int(crafted.get(obj.get("item", ""), 0))
	if t == "have":
		return int(inv.get(obj.get("item", ""), 0))
	if t == "salvage":
		return int(counters.get("salvage:" + str(obj.get("item", "")), 0))
	if t == "flag":
		return 1 if flags.get(obj.get("flag", ""), false) else 0
	if t == "place" or t == "build":
		var n := 0
		var want := str(obj.get("item", ""))
		var radius := float(obj.get("radius", 3.5))
		var spot_pos = null
		if str(obj.get("spot", "")) != "":
			spot_pos = spots.get(obj["spot"], null)
		for p in state.get("placed", []):
			if str(p.get("what", "")) != want:
				continue
			if spot_pos != null:
				var d := Vector2(float(p.get("x", 0)) - float(spot_pos.get("x", 0)), float(p.get("z", 0)) - float(spot_pos.get("z", 0))).length()
				if d <= radius:
					n += 1
			else:
				n += 1
		return n
	return 0

const STATION_SPOT := {
	"stump": "stump",
	"carpenter": "carpenter",
	"clay": "clay_wheel",
	"stone": "stone_bench",
	"trade": "trade",
	"any": "stump",
}

static func refresh(qdefs: Dictionary, state: Dictionary, spots: Dictionary) -> Array:
	var done: Array = refresh_report(qdefs, state, spots)["done"]
	return done

static func refresh_report(qdefs: Dictionary, state: Dictionary, spots: Dictionary) -> Dictionary:
	var done_now: Array = []
	var steps: Array = []
	var quests: Dictionary = state.get("quests", {})
	for id in quests.keys():
		var st: Dictionary = quests[id]
		if str(st.get("status", "")) == "done":
			continue
		if not qdefs.has(id):
			continue
		var def: Dictionary = qdefs[id]
		var all_ok := true
		var progress: Dictionary = st.get("progress", {})
		for obj in def.get("objectives", []):
			var oid := str(obj.get("id", ""))
			var need := int(obj.get("count", 1))
			var prev := int(progress.get(oid, 0))
			var have := measure(obj, state, spots)
			progress[oid] = have
			if have >= need and prev < need:
				steps.append({"quest": str(id), "step": oid, "text": str(obj.get("text", ""))})
			if have < need:
				all_ok = false
		st["progress"] = progress
		if all_ok and def.get("objectives", []).size() > 0:
			st["status"] = "done"
			done_now.append(id)
		quests[id] = st
	state["quests"] = quests
	return {"done": done_now, "steps": steps}

static func gate_ready(qdefs: Dictionary, state: Dictionary) -> bool:
	var quests: Dictionary = state.get("quests", {})
	for id in qdefs.keys():
		if not bool(qdefs[id].get("required", false)):
			continue
		if str(quests.get(id, {}).get("status", "")) != "done":
			return false
	return true

static func next_line(qdefs: Dictionary, order: Array, state: Dictionary) -> String:
	return str(focus(qdefs, order, state, {}).get("text", ""))

static func focus(qdefs: Dictionary, order: Array, state: Dictionary, ctx: Dictionary) -> Dictionary:
	if str(state.get("phase", "dream")) == "woke":
		return {"text": "Part 2 is still to come.", "marked": false}
	var quests: Dictionary = state.get("quests", {})
	var spots: Dictionary = ctx.get("spots", {})
	for id in order:
		if not qdefs.has(id):
			continue
		var def: Dictionary = qdefs[id]
		if not bool(def.get("required", false)):
			continue
		var st: Dictionary = quests.get(id, {})
		if str(st.get("status", "")) == "done":
			continue
		for obj in def.get("objectives", []):
			var have := measure(obj, state, spots)
			if quests.has(id):
				have = int(st.get("progress", {}).get(str(obj.get("id", "")), have))
			if have < int(obj.get("count", 1)):
				return _pack(obj, ctx)
	if gate_ready(qdefs, state) or bool(state.get("gate_open", false)):
		var altar := _spot_xy(spots, "altar")
		if altar.is_empty():
			return {"text": "Go to the star spring.", "marked": false}
		return {"text": "Go to the star spring.", "marked": true, "x": altar["x"], "z": altar["z"]}
	return {"text": "Walk the lane.", "marked": false}

static func _pack(obj: Dictionary, ctx: Dictionary) -> Dictionary:
	var text := str(obj.get("text", "Walk the lane."))
	var at := _point(obj, ctx)
	if at.is_empty():
		return {"text": text, "marked": false}
	return {"text": text, "marked": true, "x": at["x"], "z": at["z"]}

static func _point(obj: Dictionary, ctx: Dictionary) -> Dictionary:
	var spots: Dictionary = ctx.get("spots", {})
	var spot_id := str(obj.get("spot", ""))
	if spot_id != "":
		var named := _spot_xy(spots, spot_id)
		if not named.is_empty():
			return named
	var t := str(obj.get("type", ""))
	if t == "flag":
		var flag := str(obj.get("flag", ""))
		for rune in ctx.get("runes", []):
			if str(rune.get("flag", rune.get("id", ""))) == flag:
				var at: Array = rune.get("at", [0, 0])
				if at.size() >= 2:
					return {"x": float(at[0]), "z": float(at[1])}
		if flag.begins_with("money:"):
			return _spot_xy(spots, "trade")
		return {}
	if t == "gather":
		var item := str(obj.get("item", ""))
		for node in ctx.get("nodes", []):
			if str(node.get("item", "")) != item:
				continue
			var at2 = node.get("at", [])
			if typeof(at2) == TYPE_ARRAY and at2.size() >= 2:
				return {"x": float(at2[0]), "z": float(at2[1])}
		return {}
	if t == "craft":
		var station := _station_of(str(obj.get("item", "")), ctx.get("recipes", []))
		return _spot_xy(spots, str(STATION_SPOT.get(station, "stump")))
	if t == "salvage":
		return _spot_xy(spots, "stump")
	return {}

static func _station_of(item: String, recipes: Array) -> String:
	for recipe in recipes:
		if str(recipe.get("type", "craft")) != "craft":
			continue
		if str(recipe.get("output", "")) == item:
			return str(recipe.get("station", "any"))
	return "any"

static func _spot_xy(spots: Dictionary, id: String) -> Dictionary:
	var s = spots.get(id, null)
	if typeof(s) != TYPE_DICTIONARY:
		return {}
	return {"x": float(s.get("x", 0.0)), "z": float(s.get("z", 0.0))}

static func missing_titles(qdefs: Dictionary, state: Dictionary) -> Array:
	var quests: Dictionary = state.get("quests", {})
	var names: Array = []
	for id in qdefs.keys():
		if not bool(qdefs[id].get("required", false)):
			continue
		if str(quests.get(id, {}).get("status", "")) != "done":
			names.append(str(qdefs[id].get("title", id)))
	return names
