extends RefCounted
class_name SaveFile

const VERSION := 2

static func empty_player(start: Dictionary) -> Dictionary:
	return {
		"x": float(start.get("x", 12.0)),
		"y": float(start.get("y", 0.0)),
		"z": float(start.get("z", 43.2)),
		"yaw": float(start.get("yaw", 0.0)),
		"pitch": -0.08,
		"view": "third",
	}

static func blank(start: Dictionary) -> Dictionary:
	return {
		"version": VERSION,
		"inventory": {},
		"counters": {},
		"crafted": {},
		"quests": {},
		"heard": [],
		"seen_conv": [],
		"notes_read": [],
		"flags": {},
		"placed": [],
		"thoughts": [],
		"player": empty_player(start),
		"phase": "dream",
		"dream_loops": 0,
		"gate_open": false,
		"play_time": 0.0,
		"xp": 0,
		"level": 1,
		"relic_notes": [],
		"scene": "title",
	}

static func migrate(data: Dictionary, start: Dictionary) -> Dictionary:
	var d := data.duplicate(true)
	var v := int(d.get("version", 0))
	if v < 1:
		d["version"] = 1
		if d.has("bag") and typeof(d["bag"]) == TYPE_DICTIONARY:
			if not d.has("inventory") or (d["inventory"] as Dictionary).is_empty():
				d["inventory"] = d["bag"]
		d.erase("bag")
	if v < 2:
		if not d.has("relic_notes") or typeof(d.get("relic_notes")) != TYPE_ARRAY:
			d["relic_notes"] = []
		d["version"] = 2
	var base := blank(start)
	for k in base.keys():
		if not d.has(k):
			d[k] = base[k]
	d["version"] = VERSION
	if typeof(d["player"]) != TYPE_DICTIONARY:
		d["player"] = empty_player(start)
	else:
		for pk in base["player"].keys():
			if not d["player"].has(pk):
				d["player"][pk] = base["player"][pk]
	return d

static func write_atomic(path: String, data: Dictionary) -> bool:
	var tmp := path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	f.flush()
	f.close()
	DirAccess.remove_absolute(path)
	var err := DirAccess.rename_absolute(tmp, path)
	return err == OK

## Writes a complete file, then rotates the previous save into `path.bak`.
## A crash during the write leaves the last good file in place.
static func write_guarded(path: String, data: Dictionary) -> bool:
	var dest := _abs(path)
	var tmp := dest + ".tmp"
	var bak := dest + ".bak"
	var payload := JSON.stringify(data)
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(payload)
	f.flush()
	f.close()
	if _parse_file(tmp) == null:
		DirAccess.remove_absolute(tmp)
		return false
	if FileAccess.file_exists(dest):
		if FileAccess.file_exists(bak):
			DirAccess.remove_absolute(bak)
		var spun := DirAccess.rename_absolute(dest, bak)
		if spun != OK:
			return false
	var placed := DirAccess.rename_absolute(tmp, dest)
	if placed != OK:
		if not FileAccess.file_exists(dest) and FileAccess.file_exists(bak):
			DirAccess.rename_absolute(bak, dest)
		return false
	return true

static func read(path: String, start: Dictionary) -> Dictionary:
	var parsed = _parse_file(path)
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	return migrate(parsed, start)

## Newest valid file among the live save, the backup slot, and a finished temp write.
static func read_best(path: String, start: Dictionary) -> Dictionary:
	var best := {}
	var best_time := -1
	var dest := _abs(path)
	for suffix in [".bak", "", ".tmp"]:
		var candidate := dest + str(suffix)
		var parsed = _parse_file(candidate)
		if typeof(parsed) != TYPE_DICTIONARY:
			continue
		var t := int(FileAccess.get_modified_time(candidate))
		if t >= best_time:
			best_time = t
			best = parsed
	if best.is_empty():
		return {}
	return migrate(best, start)

static func recoverable(path: String) -> bool:
	var dest := _abs(path)
	for suffix in ["", ".bak", ".tmp"]:
		if typeof(_parse_file(dest + str(suffix))) == TYPE_DICTIONARY:
			return true
	return false

static func _parse_file(path: String):
	if not FileAccess.file_exists(path):
		return null
	var text := FileAccess.get_file_as_string(path).strip_edges()
	if text.length() < 2 or not text.begins_with("{") or not text.ends_with("}"):
		return null
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY or (parsed as Dictionary).is_empty():
		return null
	return parsed

static func _abs(path: String) -> String:
	if path.begins_with("user://") or path.begins_with("res://"):
		return ProjectSettings.globalize_path(path)
	return path
