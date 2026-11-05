extends RefCounted
class_name InfluenceRules

## Data-driven hooks for later systems. NPCs never speak to the player.
## A gift, a note, an overheard choice, or a finished task can change mood,
## work, home, or friendship inside a radius. Events stay family-friendly.

static func load_rules() -> Dictionary:
	var path := "res://data/world_rules.json"
	if not FileAccess.file_exists(path):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

static func influence_at(rules: Dictionary, id: String) -> Dictionary:
	for row in rules.get("influence", []):
		if str(row.get("id", "")) == id:
			return row
	return {}

static func apply_act(npc: Dictionary, act_id: String, distance: float, rules: Dictionary) -> Dictionary:
	var field := influence_at(rules, act_id)
	var out := npc.duplicate(true)
	if field.is_empty():
		return out
	if distance > float(field.get("radius", 0.0)):
		return out
	out["mood"] = str(field.get("mood", out.get("mood", "calm")))
	out["need"] = str(field.get("need", out.get("need", "")))
	out["routine"] = str(field.get("routine", out.get("routine", "")))
	if act_id == "task_helped":
		out["friendship"] = str(out.get("friendship", "")) + " helped"
	return out

static func event_ok(rules: Dictionary, event_id: String) -> bool:
	for row in rules.get("events", []):
		if str(row.get("id", "")) != event_id:
			continue
		return bool(row.get("family_friendly", false)) and not bool(row.get("gore", true)) and not bool(row.get("deaths", true))
	return false

static func quests_of_tone(rules: Dictionary, tone: String) -> Array:
	var out: Array = []
	for row in rules.get("side_quests", []):
		if str(row.get("tone", "")) == tone:
			out.append(row)
	return out
