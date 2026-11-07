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

static func refresh(qdefs: Dictionary, state: Dictionary, spots: Dictionary) -> Array:
	var done_now: Array = []
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
			var have := measure(obj, state, spots)
			progress[str(obj.get("id", ""))] = have
			if have < int(obj.get("count", 1)):
				all_ok = false
		st["progress"] = progress
		if all_ok and def.get("objectives", []).size() > 0:
			st["status"] = "done"
			done_now.append(id)
		quests[id] = st
	state["quests"] = quests
	return done_now

static func gate_ready(qdefs: Dictionary, state: Dictionary) -> bool:
	var quests: Dictionary = state.get("quests", {})
	for id in qdefs.keys():
		if not bool(qdefs[id].get("required", false)):
			continue
		if str(quests.get(id, {}).get("status", "")) != "done":
			return false
	return true

static func next_line(qdefs: Dictionary, order: Array, state: Dictionary) -> String:
	if str(state.get("phase", "dream")) == "woke":
		return "The red seed woke you. Part 2 is still to come."
	var quests: Dictionary = state.get("quests", {})
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
			var have := measure(obj, state, {})
			if quests.has(id):
				have = int(st.get("progress", {}).get(str(obj.get("id", "")), have))
			if have < int(obj.get("count", 1)):
				return "%s — %s" % [def.get("title", id), obj.get("text", "")]
	if gate_ready(qdefs, state) or bool(state.get("gate_open", false)):
		return "Go to the star spring. The red seed or the white stone is the choice."
	return "Walk the lane. The next deed will show itself."

static func missing_titles(qdefs: Dictionary, state: Dictionary) -> Array:
	var quests: Dictionary = state.get("quests", {})
	var names: Array = []
	for id in qdefs.keys():
		if not bool(qdefs[id].get("required", false)):
			continue
		if str(quests.get(id, {}).get("status", "")) != "done":
			names.append(str(qdefs[id].get("title", id)))
	return names
