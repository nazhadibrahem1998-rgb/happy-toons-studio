extends RefCounted
class_name SkillRules

static func rank_of(defn: Dictionary, counters: Dictionary) -> int:
	var r := 0
	for rank in defn.get("ranks", []):
		var ok := true
		for key in rank.get("need", {}).keys():
			if int(counters.get(key, 0)) < int(rank["need"][key]):
				ok = false
				break
		if ok:
			r += 1
		else:
			break
	return r

static func bonus_value(defs: Array, counters: Dictionary, bonus_key: String) -> int:
	var total := 0
	for defn in defs:
		var r := rank_of(defn, counters)
		for i in r:
			var b: Dictionary = defn["ranks"][i].get("bonus", {})
			total += int(b.get(bonus_key, 0))
	return total

static func apply_cost(cost: Dictionary, defs: Array, counters: Dictionary) -> Dictionary:
	var out := {}
	for k in cost.keys():
		var n := int(cost[k])
		var save := bonus_value(defs, counters, "cost_save:" + str(k))
		if save > 0 and n > 1:
			n = maxi(1, n - save)
		out[k] = n
	return out

static func trade_give(give: Dictionary, defs: Array, counters: Dictionary) -> Dictionary:
	var save := bonus_value(defs, counters, "trade_save")
	var out := {}
	var best := ""
	var best_n := 0
	for k in give.keys():
		var n := int(give[k])
		out[k] = n
		if n > best_n:
			best_n = n
			best = str(k)
	if best != "" and save > 0 and int(out[best]) > 1:
		out[best] = maxi(1, int(out[best]) - save)
	return out

static func progress_line(defn: Dictionary, counters: Dictionary) -> String:
	var r := rank_of(defn, counters)
	if r >= defn["ranks"].size():
		return "Learned through."
	var nxt: Dictionary = defn["ranks"][r]
	var bits: Array = []
	for key in nxt["need"].keys():
		bits.append("%s %d/%d" % [str(key).replace(":", " "), int(counters.get(key, 0)), int(nxt["need"][key])])
	return "Next, %s (%s)" % [nxt["name"], ", ".join(bits)]
