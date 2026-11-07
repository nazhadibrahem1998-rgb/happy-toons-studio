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
	f.close()
	DirAccess.remove_absolute(path)
	var err := DirAccess.rename_absolute(tmp, path)
	return err == OK

static func read(path: String, start: Dictionary) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	return migrate(parsed, start)
