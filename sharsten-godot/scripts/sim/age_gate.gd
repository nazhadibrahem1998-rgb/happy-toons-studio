extends RefCounted
class_name AgeGate

const MIN_AGE := 25

static func years_old(birth_year: int, now_year: int) -> int:
	return now_year - birth_year

static func accepts(birth_year: int, now_year: int) -> bool:
	if birth_year < 1900 or birth_year > now_year:
		return false
	return years_old(birth_year, now_year) >= MIN_AGE

static func write_passed(path: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	f.store_string("{\"passed\":true}\n")
	f.close()

static func read_passed(path: String) -> bool:
	if not FileAccess.file_exists(path):
		return false
	var data = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(data) != TYPE_DICTIONARY:
		return false
	return bool(data.get("passed", false))

static func submit(birth_year: int, now_year: int, path: String) -> String:
	if birth_year < 1900 or birth_year > now_year:
		return "bad"
	if years_old(birth_year, now_year) < MIN_AGE:
		return "young"
	write_passed(path)
	return "ok"
