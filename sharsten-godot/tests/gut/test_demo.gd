extends GutTest

const Rules = preload("res://scripts/sim/quest_rules.gd")
const Saves = preload("res://scripts/sim/save_file.gd")

func test_save_round_trip() -> void:
	var start := {"x": 4.5, "z": 9.0, "yaw": 0.2}
	var data := Saves.blank(start)
	data["flags"]["relic:glass_screen"] = true
	data["relic_notes"] = [{"id": "glass_screen", "title": "Cracked glass screen", "text": "kept"}]
	var path := "/tmp/sharsten-v18-round.json"
	assert_true(Saves.write_atomic(path, data), "the save writes")
	var back: Dictionary = Saves.read(path, start)
	assert_false(back.is_empty(), "the save reads back")
	assert_true(bool(back["flags"].get("relic:glass_screen", false)), "a relic flag survives")
	assert_eq(back["relic_notes"].size(), 1, "the diary note survives")
	assert_almost_eq(float(back["player"]["x"]), 4.5, 0.01, "the player position survives")

func test_quest_line_moves_forward() -> void:
	var defs: Dictionary = ContentDB.quests
	var order: Array = ContentDB.quest_order
	var state := {
		"phase": "dream",
		"gate_open": false,
		"quests": {"first_steps": {"status": "active", "progress": {"wood": 0, "mallet": 0}}},
		"counters": {},
		"inventory": {},
		"crafted": {},
		"flags": {},
		"placed": [],
	}
	var first := Rules.next_line(defs, order, state)
	assert_string_contains(first, "Gather wood")
	state["counters"]["gather:wood"] = 4
	state["crafted"]["mallet"] = 1
	Rules.refresh(defs, state, ContentDB.layout.get("spots", {}))
	var nxt := Rules.next_line(defs, order, state)
	assert_false(nxt.contains("Gather wood"), "the finished step leaves the line")
	assert_string_contains(nxt, "spoon")

func test_relic_pickup_once() -> void:
	GameState.save_path_override = "/tmp/sharsten-v18-relic.json"
	GameState.start_new()
	var note: Dictionary = GameState.pickup_relic("glass_screen")
	assert_false(note.is_empty(), "the fragment has a diary note")
	assert_true(bool(GameState.data["flags"].get("relic:glass_screen", false)), "pickup sets the relic flag")
	assert_eq(GameState.data["relic_notes"].size(), 1, "the note is kept")
	GameState.pickup_relic("glass_screen")
	assert_eq(GameState.data["relic_notes"].size(), 1, "the same fragment is not collected twice")
	assert_string_contains(str(note.get("text", "")), "HUMAN_REVIEW")
