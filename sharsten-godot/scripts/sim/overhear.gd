extends RefCounted
class_name Overhear

static func poll(conversations: Array, spots: Dictionary, seen: Dictionary, pos: Vector3) -> Array:
	var out: Array = []
	for conv in conversations:
		var id := str(conv.get("id", ""))
		if seen.has(id):
			continue
		var spot = spots.get(str(conv.get("spot", "")), null)
		if typeof(spot) != TYPE_DICTIONARY:
			continue
		var d := Vector2(pos.x - float(spot.get("x", 0.0)), pos.z - float(spot.get("z", 0.0))).length()
		if d <= float(conv.get("radius", 7.0)):
			out.append(conv)
	return out

static func addresses_player(conversations: Array) -> bool:
	for conv in conversations:
		for line in conv.get("lines", []):
			var text := str(line.get("text", ""))
			var low := text.to_lower()
			if low.find("azad") >= 0:
				return true
			if low.find("hey you") >= 0 or low.find("hello, stranger") >= 0:
				return true
			if str(line.get("to", "npc")) == "player":
				return true
	return false
