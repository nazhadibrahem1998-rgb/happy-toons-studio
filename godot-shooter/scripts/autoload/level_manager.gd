extends Node

# Append a dictionary to add Level 2+ without changing the menu flow:
# {"id": "level_02", "scene": "res://scenes/levels/level_02.tscn", "name_ckb": "..."}
const LEVELS := [
	{
		"id": "level_01",
		"scene": "res://scenes/levels/level_01.tscn",
		"name_ckb": "ئاستی ١ — گوندی چیا",
	},
]

var current_level: int = 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func start_game() -> void:
	current_level = 0
	load_current()


func restart_level() -> void:
	load_current()


func has_next_level() -> bool:
	return current_level + 1 < LEVELS.size()


func advance_level() -> void:
	if not has_next_level():
		return
	current_level += 1
	load_current()


func load_current() -> void:
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var path: String = LEVELS[current_level]["scene"]
	get_tree().change_scene_to_file(path)


func load_main_menu() -> void:
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")


func current_name() -> String:
	return str(LEVELS[current_level]["name_ckb"])
